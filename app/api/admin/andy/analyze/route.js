import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 8192;

/** ~4 chars/token en castellano; dejamos margen para system + overhead (~50k input total). */
const MAX_USER_CONTEXT_CHARS = 165_000;

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, status: 401 };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { ok: false, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { ok: false, status: 403 };
  return { ok: true, user };
}

/** Texto conversacional sin bloques HTML embebidos (misma idea que extractAssistantParts). */
function stripHtmlFromMessageText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw;
  s = s.replace(/```html\s*[\s\S]*?```/gi, '\n[HTML del juego omitido]\n');
  const startDoctype = s.indexOf('<!DOCTYPE html>');
  const startHtml = s.indexOf('<html');
  let start = -1;
  if (startDoctype !== -1) start = startDoctype;
  if (startHtml !== -1 && (start === -1 || startHtml < start)) start = startHtml;
  if (start !== -1) {
    const endTag = '</html>';
    const lastClose = s.lastIndexOf(endTag);
    if (lastClose !== -1) {
      s = `${s.slice(0, start)}\n[HTML del juego omitido]\n${s.slice(lastClose + endTag.length)}`;
    }
  }
  s = s.replace(/<[^>]{1,200}>/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function buildSessionBlock(session, messages) {
  const fw = session.framework_used || '—';
  const err = session.had_errors ? 'sí' : 'no';
  const abandoned = session.ended_in_submission === false ? 'sí (no envió a moderación)' : 'no';
  const started = session.started_at || '—';
  const lines = [`### Sesión ${session.id}`, `Framework: ${fw} · Errores: ${err} · Abandonada: ${abandoned} · Inicio: ${started}`, ''];
  for (const m of messages) {
    const role = m.role === 'user' ? 'Alumno' : 'Andy';
    const body = stripHtmlFromMessageText(m.content || '');
    if (!body) continue;
    lines.push(`**${role}:** ${body}`);
    lines.push('');
  }
  return lines.join('\n');
}

function trimBlocksToBudget(blocks, maxChars) {
  const out = [];
  let total = 0;
  let truncated = false;
  for (const b of blocks) {
    if (total + b.length <= maxChars) {
      out.push(b);
      total += b.length;
      continue;
    }
    const room = maxChars - total;
    if (room > 500) {
      out.push(`${b.slice(0, room)}\n\n[…recorte por límite de contexto…]`);
      truncated = true;
    } else {
      truncated = true;
    }
    break;
  }
  if (!truncated && out.length < blocks.length) truncated = true;
  return { text: out.join('\n\n---\n\n'), truncated };
}

const SYSTEM_PROMPT = `Sos un analista pedagógico y de producto para Vibecoding / SASS. Vas a recibir conversaciones reales del Game Lab entre alumnos y Andy (asistente IA que genera juegos HTML5).

Instrucciones:
- Respondé en español argentino, tono profesional y claro.
- Usá markdown con títulos ## y listas donde ayude.
- Citá ejemplos concretos entre comillas o fragmentos breves tomados de las conversaciones cuando sea posible.

Tareas:
1. Los 5 problemas más comunes que encontraron los alumnos.
2. Patrones de pedidos que Andy no maneja bien.
3. Sugerencias concretas de reglas o párrafos para agregar a quality-rules.md o pedagogy.md (formulá el texto suelto, no archivos completos).
4. Tipos de juegos o frameworks que parecen generar más errores o frustración según el contexto.

Si el contexto viene recortado, mencioná que el análisis puede estar incompleto.`;

export async function POST() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  if (!anthropicApiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessions, error: sErr } = await admin
    .from('andy_sessions')
    .select('id, framework_used, had_errors, ended_in_submission, started_at')
    .or('had_errors.eq.true,ended_in_submission.eq.false')
    .order('started_at', { ascending: false })
    .limit(50);

  if (sErr) {
    console.error('andy analyze sessions:', sErr);
    return NextResponse.json({ error: sErr.message || 'Error al cargar sesiones' }, { status: 500 });
  }

  if (!sessions?.length) {
    return NextResponse.json({
      error: 'No hay sesiones problemáticas (errores o abandonadas) para analizar.',
    }, { status: 404 });
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: allMessages, error: mErr } = await admin
    .from('andy_messages')
    .select('session_id, role, content, created_at, id')
    .in('session_id', sessionIds);

  if (mErr) {
    console.error('andy analyze messages:', mErr);
    return NextResponse.json({ error: mErr.message || 'Error al cargar mensajes' }, { status: 500 });
  }

  const bySession = new Map();
  for (const id of sessionIds) bySession.set(id, []);
  for (const row of allMessages || []) {
    const list = bySession.get(row.session_id);
    if (list) list.push(row);
  }
  for (const list of bySession.values()) {
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const blocks = [];
  for (const id of sessionIds) {
    const session = sessionById.get(id);
    const msgs = bySession.get(id) || [];
    blocks.push(buildSessionBlock(session, msgs));
  }

  const { text: conversationsBlob, truncated } = trimBlocksToBudget(blocks, MAX_USER_CONTEXT_CHARS);
  const userMessage =
    `${truncated ? '_Nota: el contexto se recortó para respetar el límite de tamaño._\n\n' : ''}` +
    `Conversaciones (solo texto, HTML omitido):\n\n${conversationsBlob}`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text();
    console.error('Anthropic analyze error:', anthropicRes.status, errBody);
    return NextResponse.json({ error: 'Error al analizar con el modelo' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta' &&
                parsed.delta?.text
              ) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: parsed.delta.text })}\n\n`)
                );
              }
            } catch {
              // ignorar líneas malformadas
            }
          }
        }
      } catch (e) {
        console.error('analyze stream:', e);
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
