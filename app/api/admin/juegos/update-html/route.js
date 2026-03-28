import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGamesBucketPathFromPublicUrl } from '@/lib/games-bucket-path.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_HTML_BYTES = 500 * 1024;

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

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const contentType = request.headers.get('content-type') || '';
  let gameId;
  let buffer;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    gameId = form.get('gameId');
    const file = form.get('file');
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
    }
    const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    if (!name.endsWith('.html')) {
      return NextResponse.json({ error: 'Solo archivos .html' }, { status: 400 });
    }
    const arr = await file.arrayBuffer();
    if (arr.byteLength > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'El archivo supera 500KB' }, { status: 400 });
    }
    buffer = Buffer.from(arr);
  } else {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }
    gameId = body?.gameId;
    const html = typeof body?.html === 'string' ? body.html : '';
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
    }
    buffer = Buffer.from(html, 'utf-8');
    if (buffer.length > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'El HTML supera 500KB' }, { status: 400 });
    }
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: game, error: gameErr } = await admin.from('games').select('id, file_url').eq('id', gameId).single();
  if (gameErr || !game?.file_url) {
    return NextResponse.json({ error: 'Juego sin file_url' }, { status: 400 });
  }

  const path = getGamesBucketPathFromPublicUrl(game.file_url);
  if (!path) {
    return NextResponse.json({ error: 'No se pudo resolver la ruta en Storage' }, { status: 400 });
  }

  const { error: upErr } = await admin.storage.from('games').upload(path, buffer, {
    contentType: 'text/html',
    upsert: true,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message || 'Error al subir' }, { status: 500 });
  }

  // Cache busting: actualizar file_url con timestamp para forzar recarga
  const baseUrl = game.file_url.split('?')[0]; // quitar query params viejos si hay
  const newUrl = baseUrl + '?v=' + Date.now();
  await admin.from('games').update({ file_url: newUrl }).eq('id', gameId);

  return NextResponse.json({ ok: true });
}
