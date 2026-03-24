import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/games/unlock-with-credits
 * Body: { gameId }
 */
export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const gameId = typeof body?.gameId === 'string' ? body.gameId.trim() : '';
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await supabaseAdmin.from('profiles').select('unlock_credits, has_all_access').eq('id', user.id).single();
  if (profile?.has_all_access) {
    return NextResponse.json({ success: true, remaining_credits: profile.unlock_credits ?? 0, alreadyHasAccess: true });
  }
  const credits = Number(profile?.unlock_credits) || 0;
  if (credits < 1) {
    return NextResponse.json({ error: 'No tenés créditos de desbloqueo disponibles' }, { status: 400 });
  }

  const { data: game } = await supabaseAdmin.from('games').select('id, status').eq('id', gameId).single();
  if (!game || game.status !== 'approved') {
    return NextResponse.json({ error: 'Juego no encontrado o no disponible' }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from('game_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .maybeSingle();
  if (existing) {
    const { data: p2 } = await supabaseAdmin.from('profiles').select('unlock_credits').eq('id', user.id).single();
    return NextResponse.json({
      success: true,
      remaining_credits: Number(p2?.unlock_credits) || 0,
      alreadyUnlocked: true,
    });
  }

  const { data: row } = await supabaseAdmin.from('profiles').select('unlock_credits').eq('id', user.id).single();
  const current = Number(row?.unlock_credits) || 0;
  if (current < 1) {
    return NextResponse.json({ error: 'No tenés créditos de desbloqueo disponibles' }, { status: 400 });
  }

  const { error: upErr } = await supabaseAdmin
    .from('profiles')
    .update({ unlock_credits: current - 1 })
    .eq('id', user.id)
    .eq('unlock_credits', current);

  if (upErr) {
    return NextResponse.json({ error: upErr.message || 'No se pudo usar el crédito' }, { status: 500 });
  }

  const { error: insErr } = await supabaseAdmin.from('game_unlocks').insert({
    user_id: user.id,
    game_id: gameId,
    amount_paid: 0,
    payment_id: 'credit_redemption',
  });

  if (insErr) {
    await supabaseAdmin.from('profiles').update({ unlock_credits: current }).eq('id', user.id);
    return NextResponse.json({ error: insErr.message || 'No se pudo registrar el desbloqueo' }, { status: 500 });
  }

  const remaining = current - 1;
  return NextResponse.json({ success: true, remaining_credits: remaining });
}
