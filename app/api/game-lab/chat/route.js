import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

/** Obtiene el usuario autenticado desde el header Authorization Bearer. */
function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { token: null, supabase: null };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { token, supabase };
}

/** Lee el system prompt de Andy desde docs/andy-system-prompt.md */
function loadAndySystemPrompt() {
  try {
    const path = join(process.cwd(), 'docs', 'andy-system-prompt.md');
    return readFileSync(path, 'utf-8');
  } catch (err) {
    console.error('Error leyendo system prompt de Andy:', err);
    return null;
  }
}

/**
 * Detecta si el texto contiene un documento HTML completo y lo extrae.
 * Busca <!DOCTYPE html> o <html y captura hasta el cierre </html>.
 * @returns { { html: string | null, reply: string } } html extraído (o null) y texto para el chat (sin el bloque HTML)
 */
function extractHtmlFromResponse(text) {
  if (!text || typeof text !== 'string') return { html: null, reply: text || '' };

  // 1) Caso principal: bloque de código markdown ```html ... ```
  const htmlMatch = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    const html = htmlMatch[1].trim();
    const reply = text.replace(htmlMatch[0], '').trim();
    return { html: html || null, reply: reply || 'Listo. Mirá la vista previa.' };
  }

  // 2) Fallback: buscar <!DOCTYPE html> o <html> directamente en el texto completo
  const startDoctype = text.indexOf('<!DOCTYPE html>');
  const startHtml = text.indexOf('<html');
  let start = -1;
  if (startDoctype !== -1) start = startDoctype;
  if (startHtml !== -1 && (start === -1 || startHtml < start)) start = startHtml;
  if (start === -1) return { html: null, reply: text };

  const endTag = '</html>';
  const lastClose = text.lastIndexOf(endTag);
  if (lastClose === -1) return { html: null, reply: text };

  const html = text.slice(start, lastClose + endTag.length).trim();
  const reply = (text.slice(0, start) + text.slice(lastClose + endTag.length)).trim();
  return { html: html || null, reply: reply || 'Listo. Mirá la vista previa.' };
}

export async function POST(request) {
  // Debug: verificar que la API key esté cargada (no loguear el valor completo)
  console.log('ANTHROPIC_API_KEY presente:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Primeros 20 chars:', process.env.ANTHROPIC_API_KEY?.slice(0, 20));

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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  // El frontend envía el historial ya incluyendo el nuevo mensaje del usuario
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
  }

  const systemPrompt = loadAndySystemPrompt();
  if (!systemPrompt) {
    return NextResponse.json({ error: 'No se pudo cargar el system prompt de Andy' }, { status: 500 });
  }

  // Formato esperado por Anthropic: messages con role 'user' | 'assistant' y content string
  const anthropicMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
  }));

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Anthropic API error — status:', res.status, 'body:', errBody);
      return NextResponse.json(
        { error: 'Error al hablar con Andy. Intentá de nuevo.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    const fullText = textBlock?.text ?? '';

    const rawText = fullText;
    console.log('=== INICIO RESPUESTA ===');
    console.log(rawText.substring(0, 200));
    console.log('=== FIN RESPUESTA ===');
    console.log('=== FINAL RESPUESTA ===');
    console.log(rawText.substring(Math.max(0, rawText.length - 200)));
    console.log('=== FIN FINAL ===');
    console.log('TOTAL CHARS:', rawText.length);

    const { html, reply } = extractHtmlFromResponse(fullText);

    const result = { html, reply };
    console.log('=== RESULTADO EXTRACT ===');
    console.log('html encontrado:', !!result.html);
    console.log('html length:', result.html?.length);
    console.log('reply:', result.reply?.substring(0, 100));
    console.log('=== FIN EXTRACT ===');

    return NextResponse.json({
      reply: reply || 'No pude generar una respuesta.',
      html: html || undefined,
    });
  } catch (err) {
    console.error('Error en Game Lab chat:', err);
    return NextResponse.json(
      { error: 'Error inesperado. Intentá de nuevo.' },
      { status: 500 }
    );
  }
}
