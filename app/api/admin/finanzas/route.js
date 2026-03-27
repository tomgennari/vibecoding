import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PRICING } from '@/lib/pricing.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function parseRpcTotal(data) {
  if (data == null) return 0;
  if (typeof data === 'number') return Number.isFinite(data) ? data : 0;
  if (typeof data === 'string') return Number(data) || 0;
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0];
    if (row && typeof row === 'object') {
      const v = Object.values(row)[0];
      return Number(v) || 0;
    }
  }
  if (typeof data === 'object') {
    const v = Object.values(data)[0];
    return Number(v) || 0;
  }
  return Number(data) || 0;
}

function rowDate(row, keys) {
  for (const k of keys) {
    if (row[k]) return row[k];
  }
  return null;
}

/** Agrega pack_purchases, game_unlocks (exclusivos) y donations; usa service role para bypasear RLS (p. ej. pack_purchases). */
export async function GET(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [
    raisedRes,
    packsRes,
    unlocksRes,
    donationsRes,
    countRes,
  ] = await Promise.all([
    admin.rpc('get_total_raised'),
    admin.from('pack_purchases').select('*'),
    admin.from('game_unlocks').select('user_id, game_id, amount_paid, payment_id, unlocked_at'),
    admin.from('donations').select('user_id, amount, payment_id, donated_at'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  const batchErrors = [
    raisedRes.error && `get_total_raised: ${raisedRes.error.message}`,
    packsRes.error && `pack_purchases: ${packsRes.error.message}`,
    unlocksRes.error && `game_unlocks: ${unlocksRes.error.message}`,
    donationsRes.error && `donations: ${donationsRes.error.message}`,
    countRes.error && `profiles count: ${countRes.error.message}`,
  ].filter(Boolean);
  if (batchErrors.length) {
    return NextResponse.json({ error: batchErrors.join(' · ') }, { status: 500 });
  }

  const totalRaised = parseRpcTotal(raisedRes.data);
  const packs = packsRes.data || [];
  const unlocks = unlocksRes.data || [];
  const donations = donationsRes.data || [];
  const profileCount = countRes.count ?? 0;

  const packPaymentIds = new Set(
    packs
      .map((p) => p.payment_id)
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id)),
  );

  let kpiIndividual = 0;
  let kpiPacks1030 = 0;
  let kpiAllAccess = 0;
  for (const p of packs) {
    const amt = Number(p.amount_paid) || 0;
    const t = p.pack_type;
    if (t === 'individual') kpiIndividual += amt;
    else if (t === 'pack_10' || t === 'pack_30') kpiPacks1030 += amt;
    else if (t === 'all_access') kpiAllAccess += amt;
  }

  let kpiUnlockAll = 0;
  const exclusiveUnlocks = [];
  for (const u of unlocks) {
    const amt = Number(u.amount_paid) || 0;
    if (amt <= 0) continue;
    const pidRaw = u.payment_id;
    const pid = pidRaw != null && String(pidRaw).trim() !== '' ? String(pidRaw) : null;
    if (pid && packPaymentIds.has(pid)) continue;
    exclusiveUnlocks.push(u);
  }

  const exclusiveGameIds = [...new Set(exclusiveUnlocks.map((u) => u.game_id).filter(Boolean))];
  let exclusiveGamesById = {};
  if (exclusiveGameIds.length > 0) {
    const exGamesRes = await admin
      .from('games')
      .select('id, unlocked_for_all')
      .in('id', exclusiveGameIds);
    if (exGamesRes.error) {
      return NextResponse.json(
        { error: `games (game_unlocks): ${exGamesRes.error.message}` },
        { status: 500 },
      );
    }
    exclusiveGamesById = (exGamesRes.data || []).reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }

  const kpiDonations = donations.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const transactions = [];

  packs.forEach((p, idx) => {
    const at = rowDate(p, ['purchased_at', 'created_at']) || new Date(0).toISOString();
    transactions.push({
      id: `pack-${idx}-${p.payment_id ?? idx}`,
      at,
      userId: p.user_id,
      kind: p.pack_type,
      amount: Number(p.amount_paid) || 0,
      paymentId: p.payment_id ?? null,
      gameId: null,
    });
  });

  exclusiveUnlocks.forEach((u, idx) => {
    const amount = Number(u.amount_paid) || 0;
    const gameRow = u.game_id ? exclusiveGamesById[u.game_id] : null;
    const isUnlockAll =
      Math.round(amount) === PRICING.UNLOCK_FOR_ALL &&
      gameRow?.unlocked_for_all === true;
    const kind = isUnlockAll ? 'unlock_all' : 'individual_legacy';
    if (isUnlockAll) kpiUnlockAll += amount;
    else kpiIndividual += amount;

    const at = rowDate(u, ['unlocked_at']) || new Date(0).toISOString();
    transactions.push({
      id: `unlock-${idx}-${u.payment_id ?? u.game_id ?? idx}`,
      at,
      userId: u.user_id,
      kind,
      amount,
      paymentId: u.payment_id ?? null,
      gameId: u.game_id ?? null,
    });
  });

  donations.forEach((d, idx) => {
    const at = rowDate(d, ['donated_at']) || new Date(0).toISOString();
    transactions.push({
      id: `don-${idx}-${d.payment_id ?? idx}`,
      at,
      userId: d.user_id,
      kind: 'donation',
      amount: Number(d.amount) || 0,
      paymentId: d.payment_id ?? null,
      gameId: null,
    });
  });

  transactions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const userIdSet = new Set(transactions.map((t) => t.userId).filter(Boolean));
  const gameIdSet = new Set(transactions.map((t) => t.gameId).filter(Boolean));

  const [profilesResult, gamesResult] = await Promise.all([
    userIdSet.size
      ? admin.from('profiles').select('id, first_name, last_name, house').in('id', [...userIdSet])
      : Promise.resolve({ data: [] }),
    gameIdSet.size
      ? admin.from('games').select('id, title').in('id', [...gameIdSet])
      : Promise.resolve({ data: [] }),
  ]);

  const profilesById = (profilesResult.data || []).reduce((acc, p) => {
    acc[p.id] = {
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id,
      house: p.house ?? null,
    };
    return acc;
  }, {});

  const gamesById = (gamesResult.data || []).reduce((acc, g) => {
    acc[g.id] = g.title || g.id;
    return acc;
  }, {});

  const metaErrors = [
    profilesResult.error && `profiles: ${profilesResult.error.message}`,
    gamesResult.error && `games: ${gamesResult.error.message}`,
  ].filter(Boolean);
  if (metaErrors.length) {
    return NextResponse.json({ error: metaErrors.join(' · ') }, { status: 500 });
  }

  return NextResponse.json({
    totalRaised,
    kpi: {
      individual: kpiIndividual,
      packs1030: kpiPacks1030,
      allAccess: kpiAllAccess,
      unlockAll: kpiUnlockAll,
      donations: kpiDonations,
    },
    profileCount,
    transactions,
    profilesById,
    gamesById,
  });
}
