import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request, context) {
  const params = await context.params;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID de juego no válido' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    // Traemos también submitted_by para poder saber quién creó el juego
    .select('id, file_url, status, submitted_by')
    .eq('id', id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
  }
  if (game.status !== 'approved') {
    return NextResponse.json({ error: 'Juego no disponible' }, { status: 403 });
  }
  if (!game.file_url) {
    return NextResponse.json({ error: 'Juego sin archivo' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  // Si es admin o es el creador del juego, tiene acceso directo sin verificar desbloqueos
  const isAdmin = !!profile?.is_admin;
  const isCreator = game.submitted_by === user.id;

  if (!isAdmin && !isCreator) {
    const today = new Date().toISOString().split('T')[0];
    const { data: unlock } = await supabase
      .from('game_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('game_id', id)
      .maybeSingle();

    const { data: dailyFree } = await supabase
      .from('daily_free_games')
      .select('id')
      .eq('game_id', id)
      .eq('active_date', today)
      .maybeSingle();

    if (!unlock && !dailyFree) {
      return NextResponse.json({ error: 'No tenés acceso a este juego' }, { status: 403 });
    }
  }

  let html;
  try {
    const res = await fetch(game.file_url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo cargar el juego' }, { status: 502 });
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener el archivo del juego' }, { status: 502 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store',
    },
  });
}
