import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;

function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { token: null, supabase: null };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { token, supabase };
}

function loadAndyDocs() {
  const basePath = join(process.cwd(), 'docs', 'andy');
  const templatesPath = join(basePath, 'templates');

  try {
    return {
      personality: readFileSync(join(basePath, 'personality.md'), 'utf-8'),
      pedagogy: readFileSync(join(basePath, 'pedagogy.md'), 'utf-8'),
      frameworkDecision: readFileSync(join(basePath, 'framework-decision.md'), 'utf-8'),
      qualityRules: readFileSync(join(basePath, 'quality-rules.md'), 'utf-8'),
      templates: {
        canvas2d: readFileSync(join(templatesPath, 'canvas2d.md'), 'utf-8'),
        p5js: readFileSync(join(templatesPath, 'p5js.md'), 'utf-8'),
        kaplay: readFileSync(join(templatesPath, 'kaplay.md'), 'utf-8'),
      },
    };
  } catch (err) {
    console.error('Error cargando docs de Andy:', err);
    return null;
  }
}

function buildSystemPrompt(docs, context = {}) {
  const { hasGame, framework } = context;

  if (hasGame) {
    const parts = [
      docs.personality,
      docs.qualityRules,
    ];

    if (framework === 'kaplay') {
      parts.push(docs.templates.kaplay);
    } else if (framework === 'p5js') {
      parts.push(docs.templates.p5js);
    } else {
      parts.push(docs.templates.canvas2d);
    }

    return parts.join('\n\n');
  }

  return [
    docs.personality,
    docs.pedagogy,
    docs.frameworkDecision,
    docs.qualityRules,
    '---',
    '# TEMPLATES DE FRAMEWORKS',
    'Usá el template que corresponda según el framework que elegiste:',
    docs.templates.canvas2d,
    docs.templates.p5js,
    docs.templates.kaplay,
  ].join('\n\n');
}

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  if (!anthropicApiKey) {
    return NextResponse.json({ error: 'Game Lab no configurado (ANTHROPIC_API_KEY)' }, { status: 503 });
  }

  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_used, tokens_limit, is_admin')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  const isAdmin = !!userProfile.is_admin;
  if (!isAdmin) {
    const saldoDisponible = (userProfile.tokens_limit || 1.0) - (userProfile.tokens_used || 0);
    if (saldoDisponible < 0.01) {
      return NextResponse.json({
        error: 'Se te acabaron los Créditos de Andy. Para recargar, desbloqueá un juego del catálogo.',
        code: 'NO_CREDITS',
      }, { status: 402 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const context = body?.context || {};
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
  }

  const docs = loadAndyDocs();
  if (!docs) {
    return NextResponse.json({ error: 'No se pudo cargar el system prompt de Andy' }, { status: 500 });
  }
  const systemPrompt = buildSystemPrompt(docs, context);

  const anthropicMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
  }));

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text();
    console.error('Anthropic API error:', anthropicRes.status, errBody);
    return NextResponse.json({ error: 'Error al hablar con Andy. Intentá de nuevo.' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

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

              if (parsed.type === 'message_start' && parsed.message?.usage) {
                totalInputTokens = parsed.message.usage.input_tokens || 0;
              }
              if (parsed.type === 'message_delta' && parsed.usage) {
                totalOutputTokens = parsed.usage.output_tokens || 0;
              }

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
      } finally {
        if (!isAdmin) {
          const costUsd = (totalInputTokens * 3 / 1000000) + (totalOutputTokens * 15 / 1000000);
          if (costUsd > 0) {
            const newTokensUsed = (userProfile.tokens_used || 0) + costUsd;
            await supabaseAdmin
              .from('profiles')
              .update({ tokens_used: newTokensUsed })
              .eq('id', user.id);

            const remaining = Math.max(0, (userProfile.tokens_limit || 1.0) - newTokensUsed);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                credits: { used: newTokensUsed, limit: userProfile.tokens_limit || 1.0, remaining },
              })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
