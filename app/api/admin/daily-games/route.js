import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayArgentina, getTomorrowArgentina } from '@/lib/dates';

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

function distinctAssignedCount(rows, targetDate) {
  const ids = new Set();
  for (const r of rows || []) {
    if (!r.game_id) continue;
    if (r.scheduled_for === targetDate || r.active_date === targetDate) ids.add(r.game_id);
  }
  return ids.size;
}

/** POST: asignar juego gratis para hoy o mañana */
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
  let when = body?.when ?? 'tomorrow';
  if (when !== 'today' && when !== 'tomorrow') {
    return NextResponse.json({ error: 'when debe ser today o tomorrow' }, { status: 400 });
  }
  const force = body?.force === true;

  const today = getTodayArgentina();
  const tomorrow = getTomorrowArgentina();
  const targetDate = when === 'today' ? today : tomorrow;

  const { data: dupRows } = await auth.supabase
    .from('daily_free_games')
    .select('id')
    .eq('game_id', gameId)
    .or(`scheduled_for.eq.${targetDate},active_date.eq.${targetDate}`)
    .limit(1);
  if (dupRows?.length) {
    return NextResponse.json(
      { error: 'Ese juego ya está asignado como gratis para esa fecha' },
      { status: 409 },
    );
  }

  const { data: slotRows } = await auth.supabase
    .from('daily_free_games')
    .select('game_id, scheduled_for, active_date')
    .or(`scheduled_for.eq.${targetDate},active_date.eq.${targetDate}`);
  const count = distinctAssignedCount(slotRows, targetDate);

  if (count >= 3 && !force) {
    return NextResponse.json(
      {
        error: 'limit_exceeded',
        count,
        message: `Ya hay ${count} juegos asignados para ${targetDate}`,
      },
      { status: 422 },
    );
  }

  const insertPayload =
    when === 'today'
      ? { game_id: gameId, scheduled_for: today, active_date: today, auto_selected: false }
      : { game_id: gameId, scheduled_for: tomorrow, active_date: null, auto_selected: false };

  const { error } = await auth.supabase.from('daily_free_games').insert(insertPayload);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE: quitar asignación. Query: gameId= [& date=YYYY-MM-DD]. Sin date: solo mañana (comportamiento previo). */
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
  const dateParam = searchParams.get('date');
  const tomorrow = getTomorrowArgentina();

  let q = auth.supabase.from('daily_free_games').delete().eq('game_id', gameId);
  if (dateParam) {
    q = q.or(`scheduled_for.eq.${dateParam},active_date.eq.${dateParam}`);
  } else {
    q = q.eq('scheduled_for', tomorrow);
  }
  const { error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
