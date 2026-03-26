import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTomorrowArgentina } from '@/lib/dates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  return { supabase, user };
}

/** POST: programar un juego para mañana — insertar con scheduled_for = tomorrow, auto_selected = false */
export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  const auth = await requireAdmin(request);
  if (!auth.supabase) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const gameId = body?.gameId ?? body?.game_id;
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }
  const tomorrow = getTomorrowArgentina();
  const { data: existing } = await auth.supabase
    .from('daily_free_games')
    .select('id')
    .eq('game_id', gameId)
    .eq('scheduled_for', tomorrow)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Ya está programado para mañana' }, { status: 400 });
  }
  const { count } = await auth.supabase
    .from('daily_free_games')
    .select('id', { count: 'exact', head: true })
    .eq('scheduled_for', tomorrow);
  if (count >= 3) {
    return NextResponse.json({ error: 'Ya hay 3 juegos programados para mañana' }, { status: 400 });
  }
  const { error } = await auth.supabase
    .from('daily_free_games')
    .insert({ game_id: gameId, scheduled_for: tomorrow, active_date: null, auto_selected: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE: quitar un juego programado para mañana. Query: gameId= */
export async function DELETE(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  const auth = await requireAdmin(request);
  if (!auth.supabase) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId') ?? searchParams.get('game_id');
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }
  const tomorrow = getTomorrowArgentina();
  const { error } = await auth.supabase
    .from('daily_free_games')
    .delete()
    .eq('game_id', gameId)
    .eq('scheduled_for', tomorrow);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
