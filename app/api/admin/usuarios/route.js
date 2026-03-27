import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function fetchAllLastSignIns(adminAuth) {
  const byId = {};
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await adminAuth.listUsers({ page, perPage });
    if (error) return { error, byId: null };
    const batch = data?.users ?? [];
    for (const u of batch) {
      if (u.last_sign_in_at) byId[u.id] = u.last_sign_in_at;
    }
    if (batch.length < perPage) break;
    page += 1;
  }
  return { error: null, byId };
}

/** Lista enriquecida de usuarios (service role). */
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
    profilesRes,
    gamesRes,
    unlocksRes,
    packsRes,
    donationsRes,
    sessionsRes,
    housePointsRes,
    lastSignInResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, first_name, last_name, email, user_type, house, created_at, is_admin, is_blocked, has_all_access, all_access_at, unlock_credits, tokens_used, tokens_limit',
      )
      .order('created_at', { ascending: false }),
    admin.from('games').select('submitted_by'),
    admin.from('game_unlocks').select('user_id, amount_paid, payment_id, unlocked_at'),
    admin.from('pack_purchases').select('user_id, pack_type, amount_paid, payment_id, purchased_at'),
    admin.from('donations').select('user_id, amount, payment_id, donated_at'),
    admin.from('game_sessions').select('user_id, duration_seconds, started_at'),
    admin.from('house_points').select('house, total_points'),
    fetchAllLastSignIns(admin.auth.admin),
  ]);

  const batchErrors = [
    profilesRes.error && `profiles: ${profilesRes.error.message}`,
    gamesRes.error && `games: ${gamesRes.error.message}`,
    unlocksRes.error && `game_unlocks: ${unlocksRes.error.message}`,
    packsRes.error && `pack_purchases: ${packsRes.error.message}`,
    donationsRes.error && `donations: ${donationsRes.error.message}`,
    sessionsRes.error && `game_sessions: ${sessionsRes.error.message}`,
    housePointsRes.error && `house_points: ${housePointsRes.error.message}`,
    lastSignInResult.error && `auth listUsers: ${lastSignInResult.error.message}`,
  ].filter(Boolean);
  if (batchErrors.length) {
    return NextResponse.json({ error: batchErrors.join(' · ') }, { status: 500 });
  }

  const profiles = profilesRes.data || [];
  const games = gamesRes.data || [];
  const unlocks = unlocksRes.data || [];
  const packs = packsRes.data || [];
  const donations = donationsRes.data || [];
  const sessions = sessionsRes.data || [];
  const housePoints = housePointsRes.data || [];
  const lastSignInByUser = lastSignInResult.byId || {};

  const packPaymentIds = new Set(
    packs
      .map((p) => p.payment_id)
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id)),
  );

  const pointsByHouse = housePoints.reduce((acc, hp) => {
    acc[hp.house] = Number(hp.total_points) || 0;
    return acc;
  }, {});

  const gamesCreatedByUser = {};
  for (const g of games) {
    const uid = g.submitted_by;
    if (!uid) continue;
    gamesCreatedByUser[uid] = (gamesCreatedByUser[uid] || 0) + 1;
  }

  const gamesPurchasedCount = {};
  const unlockMaxAt = {};
  const unlockSpentExclusive = {};
  for (const u of unlocks) {
    const uid = u.user_id;
    if (!uid) continue;
    const amt = Number(u.amount_paid) || 0;
    if (amt > 0) gamesPurchasedCount[uid] = (gamesPurchasedCount[uid] || 0) + 1;

    const ua = u.unlocked_at;
    if (ua && (!unlockMaxAt[uid] || new Date(ua) > new Date(unlockMaxAt[uid]))) unlockMaxAt[uid] = ua;

    const pidRaw = u.payment_id;
    const pid = pidRaw != null && String(pidRaw).trim() !== '' ? String(pidRaw) : null;
    if (amt > 0 && (!pid || !packPaymentIds.has(pid))) {
      unlockSpentExclusive[uid] = (unlockSpentExclusive[uid] || 0) + amt;
    }
  }

  const packSpentByUser = {};
  const packsByUser = {};
  for (const p of packs) {
    const uid = p.user_id;
    if (!uid) continue;
    const amt = Number(p.amount_paid) || 0;
    packSpentByUser[uid] = (packSpentByUser[uid] || 0) + amt;
    if (!packsByUser[uid]) packsByUser[uid] = [];
    packsByUser[uid].push({
      pack_type: p.pack_type,
      amount_paid: amt,
      purchased_at: p.purchased_at || null,
    });
  }

  const donationSumByUser = {};
  const donationsByUser = {};
  for (const d of donations) {
    const uid = d.user_id;
    if (!uid) continue;
    const amt = Number(d.amount) || 0;
    donationSumByUser[uid] = (donationSumByUser[uid] || 0) + amt;
    if (!donationsByUser[uid]) donationsByUser[uid] = [];
    donationsByUser[uid].push({
      amount: amt,
      donated_at: d.donated_at || null,
      payment_id: d.payment_id ?? null,
    });
  }

  const sessionSecondsByUser = {};
  const sessionMaxStartedByUser = {};
  for (const s of sessions) {
    const uid = s.user_id;
    if (!uid) continue;
    sessionSecondsByUser[uid] = (sessionSecondsByUser[uid] || 0) + (Number(s.duration_seconds) || 0);
    const st = s.started_at;
    if (st && (!sessionMaxStartedByUser[uid] || new Date(st) > new Date(sessionMaxStartedByUser[uid]))) {
      sessionMaxStartedByUser[uid] = st;
    }
  }

  const sortByDateDesc = (arr, key) =>
    [...arr].sort((a, b) => {
      const ta = a[key] ? new Date(a[key]).getTime() : 0;
      const tb = b[key] ? new Date(b[key]).getTime() : 0;
      return tb - ta;
    });

  const users = profiles.map((p) => {
    const uid = p.id;
    const house = p.house && p.house !== 'random' ? p.house : null;
    const totalPoints = house ? (pointsByHouse[house] ?? 0) : 0;

    const packSum = packSpentByUser[uid] || 0;
    const unlockExcl = unlockSpentExclusive[uid] || 0;
    const donSum = donationSumByUser[uid] || 0;
    const totalSpent = packSum + unlockExcl + donSum;

    const candidates = [
      sessionMaxStartedByUser[uid],
      unlockMaxAt[uid],
      lastSignInByUser[uid],
    ].filter(Boolean);
    let lastActivity = null;
    if (candidates.length) {
      const maxMs = Math.max(...candidates.map((iso) => new Date(iso).getTime()));
      lastActivity = new Date(maxMs).toISOString();
    }

    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      user_type: p.user_type,
      house: p.house,
      created_at: p.created_at,
      is_admin: !!p.is_admin,
      is_blocked: !!p.is_blocked,
      has_all_access: !!p.has_all_access,
      all_access_at: p.all_access_at,
      unlock_credits: Number(p.unlock_credits) || 0,
      tokens_used: p.tokens_used != null ? Number(p.tokens_used) : 0,
      tokens_limit: p.tokens_limit != null ? Number(p.tokens_limit) : 1,
      games_created: gamesCreatedByUser[uid] || 0,
      games_purchased: gamesPurchasedCount[uid] || 0,
      total_spent: totalSpent,
      total_donated: donSum,
      packs_purchased: sortByDateDesc(packsByUser[uid] || [], 'purchased_at'),
      donations_detail: sortByDateDesc(donationsByUser[uid] || [], 'donated_at'),
      time_played_seconds: sessionSecondsByUser[uid] || 0,
      total_points: totalPoints,
      last_activity: lastActivity,
    };
  });

  return NextResponse.json({ users });
}
