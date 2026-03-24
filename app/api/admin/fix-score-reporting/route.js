import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

export async function POST(request) {
  if (!supabaseUrl || !supabaseServiceKey || !anthropicKey) {
    return NextResponse.json({ error: 'Config incompleta' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const gameId = body?.gameId;
  if (!gameId) return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });

  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, file_url')
    .eq('id', gameId)
    .single();
  if (!game?.file_url) return NextResponse.json({ error: 'Juego sin archivo' }, { status: 404 });

  let html;
  try {
    const res = await fetch(game.file_url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'No se pudo cargar el HTML' }, { status: 502 });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: 'Error cargando HTML' }, { status: 502 });
  }

  const prompt = `Este es el HTML de un juego. Necesito que agregues score reporting para la plataforma Campus San Andrés.

Agregá esta línea en el lugar correcto (cuando termina la partida / game over):
window.parent.postMessage({ type: 'GAME_SCORE', score: VARIABLE_DE_SCORE }, '*');

Reemplazá VARIABLE_DE_SCORE por la variable real que contiene el puntaje del jugador en este juego.

REGLAS:
- Solo agregá la línea del postMessage, NO cambies NADA más del juego
- Encontrá la variable de score correcta analizando el código
- Si hay múltiples puntos de game over, agregalo en todos
- Devolvé el HTML COMPLETO del juego con la línea agregada
- No agregues comentarios ni explicaciones, solo el HTML`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [
          { role: 'user', content: prompt + '\n\n' + html.substring(0, 100000) },
        ],
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ error: 'Error de IA' }, { status: 502 });
    }

    const aiData = await aiRes.json();
    let fixedHtml = aiData.content?.[0]?.text || '';

    const htmlMatch = fixedHtml.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) fixedHtml = htmlMatch[1].trim();

    if (!fixedHtml.includes('GAME_SCORE')) {
      return NextResponse.json({ error: 'La IA no pudo agregar el score' }, { status: 500 });
    }

    const filename = `game-fix-${gameId}-${Date.now()}.html`;
    const htmlBuffer = Buffer.from(fixedHtml, 'utf-8');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('games')
      .upload(filename, htmlBuffer, { contentType: 'text/html', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'Error subiendo HTML fijado' }, { status: 502 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('games').getPublicUrl(filename);

    await supabaseAdmin
      .from('games')
      .update({ file_url: urlData.publicUrl })
      .eq('id', gameId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error: ' + err.message }, { status: 500 });
  }
}
