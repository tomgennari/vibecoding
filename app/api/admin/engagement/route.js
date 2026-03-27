import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayArgentina } from '@/lib/dates.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HOUSES = ['william_brown', 'james_dodds', 'james_fleming', 'john_monteith'];

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

function argentinaYmd(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d instanceof Date ? d : new Date(d));
}

/** Suma dÃ­as calendario en zona AR usando mediodÃ­a BA como ancla. */
function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const base = new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00-03:00`,
  );
  base.setUTCDate(base.getUTCDate() + delta);
  return argentinaYmd(base);
}

function isAndyFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return false;
  return fileUrl.toLowerCase().includes('game-lab');
}

/** Ãšltimos N dÃ­as (incl. hoy) como YYYY-MM-DD ascendente. */
function lastDaysYmd(todayYmd, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(addDaysYmd(todayYmd, -i));
  }
  return out;
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
    return NextResponse.json({ error: 'ConfiguraciÃ³n incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const todayYmd = getTodayArgentina();
  const day30StartYmd = addDaysYmd(todayYmd, -29);
  const day7StartYmd = addDaysYmd(todayYmd, -6);

  const [profilesRes, sessionsRes, unlocksRes, gamesRes] = await Promise.all([
    paginateSelect(admin, 'profiles', 'id, created_at, house, tokens_used, first_name, last_name, email'),
    paginateSelect(admin, 'game_sessions', 'user_id, game_id, started_at, duration_seconds'),
    paginateSelect(admin, 'game_unlocks', 'user_id'),
    paginateSelect(admin, 'games', 'id, title, file_url, status, created_at, approved_at, total_likes'),
  ]);

  const batchErrors = [
    profilesRes.error && `profiles: ${profilesRes.error.message}`,
    sessionsRes.error && `game_sessions: ${sessionsRes.error.message}`,
    unlocksRes.error && `game_unlocks: ${unlocksRes.error.message}`,
    gamesRes.error && `games: ${gamesRes.error.message}`,
  ].filter(Boolean);
  if (batchErrors.length) {
    return NextResponse.json({ error: batchErrors.join(' Â· ') }, { status: 500 });
  }

  const profiles = profilesRes.rows || [];
  const sessionsAll = sessionsRes.rows || [];
  const unlocks = unlocksRes.rows || [];
  const games = gamesRes.rows || [];

  const activeToday = new Set();
  const active7 = new Set();
  const active30 = new Set();
  const timeByDay = {};
  lastDaysYmd(todayYmd, 30).forEach((d) => {
    timeByDay[d] = 0;
  });

  let totalTimePlayed = 0;
  const durationByGame = {};
  const playersByGame = {};
  const durationByUser = {};
  const userActiveDays = {};

  for (const s of sessionsAll) {
    const uid = s.user_id;
    const gid = s.game_id;
    const sec = Number(s.duration_seconds) || 0;
    totalTimePlayed += sec;
    if (s.started_at) {
      const ymd = argentinaYmd(s.started_at);
      if (uid) {
        if (ymd === todayYmd) activeToday.add(uid);
        if (ymd >= day7StartYmd && ymd <= todayYmd) active7.add(uid);
        if (ymd >= day30StartYmd && ymd <= todayYmd) active30.add(uid);
      }
      if (timeByDay[ymd] !== undefined) timeByDay[ymd] += sec;
    }
    if (gid) {
      durationByGame[gid] = (durationByGame[gid] || 0) + sec;
      if (!playersByGame[gid]) playersByGame[gid] = new Set();
      if (uid) playersByGame[gid].add(uid);
    }
    if (uid) {
      durationByUser[uid] = (durationByUser[uid] || 0) + sec;
      if (s.started_at) {
        const ymd = argentinaYmd(s.started_at);
        if (!userActiveDays[uid]) userActiveDays[uid] = new Set();
        userActiveDays[uid].add(ymd);
      }
    }
  }

  let usersDay1 = 0;
  let usersReturned = 0;
  for (const uid of Object.keys(userActiveDays)) {
    const days = userActiveDays[uid];
    usersDay1 += 1;
    if (days.size >= 2) usersReturned += 1;
  }
  const retentionRate = usersDay1 > 0 ? (usersReturned / usersDay1) * 100 : 0;

  const regByDay = {};
  lastDaysYmd(todayYmd, 30).forEach((d) => {
    regByDay[d] = 0;
  });
  const regByHouse = {};
  HOUSES.forEach((h) => {
    regByHouse[h] = 0;
  });

  let totalTokensConsumed = 0;
  for (const p of profiles) {
    totalTokensConsumed += Number(p.tokens_used) || 0;
    const h = p.house;
    if (h && regByHouse[h] !== undefined) regByHouse[h] += 1;
    if (p.created_at) {
      const ymd = argentinaYmd(p.created_at);
      if (regByDay[ymd] !== undefined) regByDay[ymd] += 1;
    }
  }

  const averageTokensPerUser = profiles.length > 0 ? totalTokensConsumed / profiles.length : 0;

  const gamesByDay = {};
  lastDaysYmd(todayYmd, 30).forEach((d) => {
    gamesByDay[d] = 0;
  });

  let andyCount = 0;
  let manualCount = 0;
  let gamesGeneratedAndy = 0;
  let gamesPublishedAndy = 0;
  let gamesRejectedAndy = 0;

  for (const g of games) {
    const isAndy = isAndyFileUrl(g.file_url);
    if (isAndy) {
      andyCount += 1;
      gamesGeneratedAndy += 1;
      if (g.status === 'approved') gamesPublishedAndy += 1;
      if (g.status === 'rejected') gamesRejectedAndy += 1;
    } else {
      manualCount += 1;
    }

    const rawDate = g.created_at || g.approved_at;
    if (rawDate) {
      const ymd = argentinaYmd(rawDate);
      if (gamesByDay[ymd] !== undefined) gamesByDay[ymd] += 1;
    }
  }

  const gameTitleById = games.reduce((acc, g) => {
    acc[g.id] = g.title || g.id;
    return acc;
  }, {});

  const registrationsByDay = lastDaysYmd(todayYmd, 30).map((date) => ({
    date,
    count: regByDay[date] || 0,
  }));

  const timePlayedByDay = lastDaysYmd(todayYmd, 30).map((date) => ({
    date,
    minutes: Math.round(((timeByDay[date] || 0) / 60) * 10) / 10,
  }));

  const gamesCreatedByDay = lastDaysYmd(todayYmd, 30).map((date) => ({
    date,
    count: gamesByDay[date] || 0,
  }));

  const topGamesByTimePlayed = Object.entries(durationByGame)
    .map(([game_id, seconds]) => ({
      game_id,
      title: gameTitleById[game_id] || game_id,
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  const topGamesByPlayers = Object.entries(playersByGame)
    .map(([game_id, set]) => ({
      game_id,
      title: gameTitleById[game_id] || game_id,
      unique_players: set.size,
    }))
    .sort((a, b) => b.unique_players - a.unique_players)
    .slice(0, 10);

  const topGamesByLikes = [...games]
    .sort((a, b) => (Number(b.total_likes) || 0) - (Number(a.total_likes) || 0))
    .slice(0, 10)
    .map((g) => ({
      game_id: g.id,
      title: g.title || g.id,
      total_likes: Number(g.total_likes) || 0,
    }));

  const unlockCountByUser = {};
  for (const u of unlocks) {
    const id = u.user_id;
    if (!id) continue;
    unlockCountByUser[id] = (unlockCountByUser[id] || 0) + 1;
  }

  const profileById = profiles.reduce((acc, p) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
    acc[p.id] = name;
    return acc;
  }, {});

  const topPlayersByGamesUnlocked = Object.entries(unlockCountByUser)
    .map(([user_id, count]) => ({
      user_id,
      name: profileById[user_id] || user_id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topPlayersByTimePlayed = Object.entries(durationByUser)
    .map(([user_id, seconds]) => ({
      user_id,
      name: profileById[user_id] || user_id,
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  return NextResponse.json({
    activeUsers: {
      today: activeToday.size,
      last7days: active7.size,
      last30days: active30.size,
    },
    registrationsByDay,
    registrationsByHouse: regByHouse,
    totalTimePlayed,
    timePlayedByDay,
    topGamesByTimePlayed,
    topGamesByPlayers,
    topGamesByLikes,
    topPlayersByTimePlayed,
    topPlayersByGamesUnlocked,
    gamesCreatedByDay,
    gamesAndyVsManual: { andy: andyCount, manual: manualCount },
    retention: {
      usersDay1: usersDay1,
      usersReturned: usersReturned,
      rate: Math.round(retentionRate * 10) / 10,
    },
    andyCredits: {
      totalConsumed: totalTokensConsumed,
      averagePerUser: Math.round(averageTokensPerUser * 10000) / 10000,
      gamesGenerated: gamesGeneratedAndy,
      gamesPublished: gamesPublishedAndy,
      gamesRejected: gamesRejectedAndy,
    },
  });
}
