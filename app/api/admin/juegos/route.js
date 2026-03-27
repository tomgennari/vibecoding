import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayArgentina } from '@/lib/dates.js';

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

function ymdFromDailyDate(d) {
  if (d == null) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(d));
  } catch {
    return null;
  }
}

async function paginateSelect(admin, table, columns, applyFilters = (q) => q) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    let q = admin.from(table).select(columns);
    q = applyFilters(q);
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) return { error, rows: null };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { error: null, rows };
}

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

  const todayYmd = getTodayArgentina();

  const [gamesRes, profilesRes, sessionsRes, unlocksRes, scoresRes, dailyRes] = await Promise.all([
    paginateSelect(
      admin,
      'games',
      'id, title, description, house, status, submitted_by, created_at, approved_at, file_url, unlocked_for_all, total_likes, total_revenue, total_plays',
    ),
    paginateSelect(admin, 'profiles', 'id, first_name, last_name, email'),
    paginateSelect(admin, 'game_sessions', 'game_id, user_id, started_at, duration_seconds'),
    paginateSelect(admin, 'game_unlocks', 'game_id, amount_paid'),
    paginateSelect(admin, 'game_scores', 'game_id, score'),
    paginateSelect(admin, 'daily_free_games', 'game_id, active_date'),
  ]);

  const err = [
    gamesRes.error && `games: ${gamesRes.error.message}`,
    profilesRes.error && `profiles: ${profilesRes.error.message}`,
    sessionsRes.error && `game_sessions: ${sessionsRes.error.message}`,
    unlocksRes.error && `game_unlocks: ${unlocksRes.error.message}`,
    scoresRes.error && `game_scores: ${scoresRes.error.message}`,
    dailyRes.error && `daily_free_games: ${dailyRes.error.message}`,
  ].filter(Boolean);
  if (err.length) {
    return NextResponse.json({ error: err.join(' · ') }, { status: 500 });
  }

  const games = gamesRes.rows || [];
  const profiles = profilesRes.rows || [];
  const sessions = sessionsRes.rows || [];
  const unlocks = unlocksRes.rows || [];
  const scores = scoresRes.rows || [];
  const dailyRows = dailyRes.rows || [];

  const profileById = profiles.reduce((acc, p) => {
    acc[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
    return acc;
  }, {});

  const playersByGame = {};
  const timeByGame = {};
  const lastPlayedByGame = {};

  for (const s of sessions) {
    const gid = s.game_id;
    if (!gid) continue;
    const uid = s.user_id;
    if (uid) {
      if (!playersByGame[gid]) playersByGame[gid] = new Set();
      playersByGame[gid].add(uid);
    }
    timeByGame[gid] = (timeByGame[gid] || 0) + (Number(s.duration_seconds) || 0);
    if (s.started_at) {
      const t = new Date(s.started_at).getTime();
      if (!lastPlayedByGame[gid] || t > lastPlayedByGame[gid]) lastPlayedByGame[gid] = t;
    }
  }

  const revenueByGame = {};
  for (const u of unlocks) {
    const gid = u.game_id;
    if (!gid) continue;
    revenueByGame[gid] = (revenueByGame[gid] || 0) + (Number(u.amount_paid) || 0);
  }

  const maxScoreByGame = {};
  for (const sc of scores) {
    const gid = sc.game_id;
    if (!gid) continue;
    const val = Number(sc.score);
    if (!Number.isFinite(val)) continue;
    maxScoreByGame[gid] = maxScoreByGame[gid] == null ? val : Math.max(maxScoreByGame[gid], val);
  }

  const freeTodayIds = new Set();
  const everFreeIds = new Set();
  for (const d of dailyRows) {
    if (d.game_id) everFreeIds.add(d.game_id);
    const ad = ymdFromDailyDate(d.active_date);
    if (ad && ad === todayYmd && d.game_id) freeTodayIds.add(d.game_id);
  }

  const enriched = games.map((g) => {
    const gid = g.id;
    return {
      ...g,
      author_name: g.submitted_by ? profileById[g.submitted_by] || '—' : '—',
      unique_players: playersByGame[gid]?.size ?? 0,
      time_played_seconds: timeByGame[gid] ?? 0,
      revenue: revenueByGame[gid] ?? 0,
      max_score: maxScoreByGame[gid] ?? null,
      last_played: lastPlayedByGame[gid] ? new Date(lastPlayedByGame[gid]).toISOString() : null,
      is_andy: typeof g.file_url === 'string' && g.file_url.toLowerCase().includes('game-lab'),
      is_free_today: freeTodayIds.has(gid),
      was_ever_free: everFreeIds.has(gid),
    };
  });

  return NextResponse.json({ games: enriched });
}
