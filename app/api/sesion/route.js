import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { token: null, supabase: null };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { token, supabase };
}

async function getUserId(supabase, token) {
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

/** POST — iniciar sesión: insertar en game_sessions, devolver id */
export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = await getUserId(supabase, token);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const gameId = body?.gameId ?? body?.game_id;
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }

  const startedAt = new Date().toISOString();
  const { data: row, error } = await supabase
    .from('game_sessions')
    .insert({ user_id: userId, game_id: gameId, started_at: startedAt })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sessionId: row.id });
}

/** PATCH — finalizar sesión: ended_at, duration_seconds y games.total_plays + 1 */
export async function PATCH(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = await getUserId(supabase, token);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const sessionId = body?.sessionId ?? body?.session_id;
  const durationSeconds = body?.duration_seconds;
  if (!sessionId || durationSeconds == null) {
    return NextResponse.json({ error: 'Faltan sessionId o duration_seconds' }, { status: 400 });
  }

  const endedAt = new Date().toISOString();
  const { data: session, error: updateError } = await supabase
    .from('game_sessions')
    .update({ ended_at: endedAt, duration_seconds: Math.max(0, Number(durationSeconds) || 0) })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('game_id')
    .single();

  if (updateError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada o no se pudo actualizar' }, { status: 400 });
  }

  const gameId = session.game_id;
  if (gameId) {
    const { data: game } = await supabase.from('games').select('total_plays').eq('id', gameId).single();
    const current = Number(game?.total_plays) || 0;
    try {
      await supabase.from('games').update({ total_plays: current + 1 }).eq('id', gameId);
    } catch (_) {}
  }

  return NextResponse.json({ ok: true });
}
