import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

/** Igual idea que en game-lab/page: texto fuera del HTML embebido. */
function extractAssistantParts(fullText) {
  if (!fullText || typeof fullText !== 'string') {
    return { reply: '', html: null, generatedHtml: false };
  }
  const htmlMatch = fullText.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    const html = htmlMatch[1].trim();
    const reply = fullText.replace(htmlMatch[0], '').trim();
    return { reply: reply || '', html: html || null, generatedHtml: true };
  }
  const startDoctype = fullText.indexOf('<!DOCTYPE html>');
  const startHtml = fullText.indexOf('<html');
  let start = -1;
  if (startDoctype !== -1) start = startDoctype;
  if (startHtml !== -1 && (start === -1 || startHtml < start)) start = startHtml;
  if (start === -1) {
    return { reply: fullText, html: null, generatedHtml: false };
  }
  const endTag = '</html>';
  const lastClose = fullText.lastIndexOf(endTag);
  if (lastClose === -1) {
    return { reply: fullText, html: null, generatedHtml: false };
  }
  const html = fullText.slice(start, lastClose + endTag.length).trim();
  const reply = (fullText.slice(0, start) + fullText.slice(lastClose + endTag.length)).trim();
  return { reply: reply || '', html: html || null, generatedHtml: true };
}

function detectFrameworkFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  if (/kaplay/i.test(html)) return 'kaplay';
  if (/p5\.|createCanvas|p5\.min\.js/i.test(html)) return 'p5js';
  if (/THREE\.|three\.js|threejs/i.test(html)) return 'threejs';
  if (/<canvas/i.test(html)) return 'canvas2d';
  return null;
}

function lastUserContent(messages, fallbackNewMessage) {
  if (typeof fallbackNewMessage === 'string' && fallbackNewMessage.trim()) {
    return fallbackNewMessage.trim();
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user' && typeof messages[i].content === 'string') {
      return messages[i].content;
    }
  }
  return '';
}

async function ensureAndySession(admin, userId, sessionKey) {
  const { data: existing, error: selErr } = await admin
    .from('andy_sessions')
    .select('id, messages_count, credits_consumed, had_errors, had_auto_retry, framework_used, started_at')
    .eq('user_id', userId)
    .eq('session_key', sessionKey)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await admin
    .from('andy_sessions')
    .insert({
      user_id: userId,
      session_key: sessionKey,
      messages_count: 0,
      credits_consumed: 0,
      had_errors: false,
      had_auto_retry: false,
      ended_in_submission: false,
      started_at: new Date().toISOString(),
    })
    .select('id, messages_count, credits_consumed, had_errors, had_auto_retry, framework_used, started_at')
    .single();

  if (insErr) {
    const { data: again } = await admin
      .from('andy_sessions')
      .select('id, messages_count, credits_consumed, had_errors, had_auto_retry, framework_used, started_at')
      .eq('user_id', userId)
      .eq('session_key', sessionKey)
      .maybeSingle();
    if (again) return again;
    throw insErr;
  }
  return inserted;
}

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Game Lab no configurado (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 503 });
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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  const sessionKey = typeof body?.sessionKey === 'string' ? body.sessionKey.trim() : '';
  if (!sessionKey) {
    return NextResponse.json({ error: 'Falta sessionKey' }, { status: 400 });
  }

  const isErrorFix = body?.isErrorFix === true;
  const newMessage = typeof body?.newMessage === 'string' ? body.newMessage : '';

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const context = body?.context || {};
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
  }

  let andySession;
  try {
    andySession = await ensureAndySession(supabaseAdmin, user.id, sessionKey);
  } catch (e) {
    console.error('andy_sessions ensure:', e);
    return NextResponse.json({ error: 'No se pudo iniciar la sesión de Andy' }, { status: 500 });
  }

  const userLogContent = lastUserContent(messages, newMessage);
  if (userLogContent) {
    const { error: umErr } = await supabaseAdmin.from('andy_messages').insert({
      session_id: andySession.id,
      role: 'user',
      content: userLogContent,
      generated_html: false,
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      is_error_fix: isErrorFix,
    });
    if (umErr) console.error('andy_messages user log:', umErr);
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
    await supabaseAdmin
      .from('andy_sessions')
      .update({
        had_errors: true,
        messages_count: (andySession.messages_count || 0) + (userLogContent ? 1 : 0),
      })
      .eq('id', andySession.id);
    return NextResponse.json({ error: 'Error al hablar con Andy. Intentá de nuevo.' }, { status: 502 });
  }

  const sessionRow = andySession;
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let fullAssistant = '';
      let streamHadError = false;

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
                fullAssistant += parsed.delta.text;
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
        streamHadError = true;
        console.error('Stream Andy:', e);
      } finally {
        const costUsd = (totalInputTokens * 3 / 1000000) + (totalOutputTokens * 15 / 1000000);
        const { reply, html: htmlExtracted, generatedHtml } = extractAssistantParts(fullAssistant);

        try {
          await supabaseAdmin.from('andy_messages').insert({
            session_id: sessionRow.id,
            role: 'assistant',
            content: reply,
            generated_html: generatedHtml,
            tokens_input: totalInputTokens,
            tokens_output: totalOutputTokens,
            cost_usd: costUsd,
            is_error_fix: isErrorFix,
          });
        } catch (e) {
          console.error('andy_messages assistant log:', e);
        }

        const frameworkDetected = detectFrameworkFromHtml(htmlExtracted || fullAssistant);
        const sessionUpdate = {
          messages_count: (sessionRow.messages_count || 0) + (userLogContent ? 2 : 1),
          credits_consumed: Number(sessionRow.credits_consumed || 0) + costUsd,
          had_errors: !!(sessionRow.had_errors || streamHadError),
          had_auto_retry: !!(sessionRow.had_auto_retry || isErrorFix),
        };
        if (!sessionRow.framework_used && frameworkDetected) {
          sessionUpdate.framework_used = frameworkDetected;
        }

        try {
          await supabaseAdmin.from('andy_sessions').update(sessionUpdate).eq('id', sessionRow.id);
        } catch (e) {
          console.error('andy_sessions update:', e);
        }

        if (!isAdmin) {
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
