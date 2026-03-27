'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { useUser } from '@/lib/user-context.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';
import { UnlockGameModal } from '@/components/unlock-game-modal.js';
import { effectiveIndividualGamePrice } from '@/lib/pricing.js';
import { getTodayArgentina } from '@/lib/dates';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

const BUILDING_GOALS = [
  { amount: 200000, name: 'Kinder', image: '/images/Buildings No Backgrounds/Kinder_Normal.png' },
  { amount: 500000, name: 'Primary School', image: '/images/Buildings No Backgrounds/Primary_School_Normal.png' },
  { amount: 1500000, name: 'Sports Pavilion', image: '/images/Buildings No Backgrounds/Sports_Pavilion_Normal.png' },
  { amount: 5000000, name: 'Natatorio', image: '/images/Buildings No Backgrounds/Natatorio_normal.png' },
  { amount: 15000000, name: 'Dinning Hall', image: '/images/Buildings No Backgrounds/Dinning_Hall_normal.png' },
  { amount: 40000000, name: 'Performing Arts Center', image: '/images/Buildings No Backgrounds/Performing_Arts_Center_Normal.png' },
  { amount: 80000000, name: 'Secondary School', image: '/images/Buildings No Backgrounds/Secondary_Normal.png', rankingScale: 0.9 },
  { amount: 150000000, name: 'Symmetry Boat', image: '/images/Buildings No Backgrounds/Symmetry_Normal.png', rankingScale: 1.1 },
];

const HOUSE_IMAGE_NAMES = {
  'William Brown': 'William_Brown',
  'James Dodds': 'James_Dodds',
  'James Fleming': 'James_Fleming',
  'John Monteith': 'John_Monteith',
};

/** Archivos en /public que no siguen el patrón estricto `{stem}_{HOUSE}.png`. */
const BUILDING_HOUSE_FILE_QUIRKS = {
  Natatorio_William_Brown: 'Natatorio_William Brown.png',
  Secondary_John_Monteith: 'Secondary_John Monteith.png',
};

function buildingStemFromNormalImagePath(normalPath) {
  const segment = normalPath.split('/').pop() || '';
  const file = decodeURIComponent(segment);
  return file.replace(/_Normal\.png$/i, '').replace(/_normal\.png$/i, '');
}

function houseColoredBuildingSrc(normalPath, leaderHouseDisplayName) {
  const suffix = HOUSE_IMAGE_NAMES[leaderHouseDisplayName];
  if (!suffix) return null;
  const stem = buildingStemFromNormalImagePath(normalPath);
  const key = `${stem}_${suffix}`;
  const file = BUILDING_HOUSE_FILE_QUIRKS[key] ?? `${key}.png`;
  return `/images/Buildings No Backgrounds/${file}`;
}

const RANKING_PAGE_COUNT = 2;
const DONATION_AMOUNTS = [
  { amount: 20000, label: '$20.000 ARS' },
  { amount: 100000, label: '$100.000 ARS' },
  { amount: 200000, label: '$200.000 ARS' },
  { amount: 500000, label: '$500.000 ARS', gold: true },
];

const STATS_KEYS = [
  { key: 'juegos', label: 'Juegos desbloqueados' },
  { key: 'tiempo', label: 'Tiempo jugado' },
  { key: 'puntos', label: 'Puntos' },
];

function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return '0 h';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} h${minutes > 0 ? ` ${minutes} min` : ''}`;
  return `${minutes} min`;
}

function IconChevronDown({ open }) {
  return (
    <svg className={`w-5 h-5 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function normalizeGameProfiles(game) {
  if (!game) return game;
  const p = game.profiles;
  return { ...game, profiles: Array.isArray(p) ? p[0] : p };
}

function GameMetricsFull({ game, uniquePlayers, showLikeButton, liked, onLike }) {
  return (
    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: '#94a3b8' }}>
      <span className="flex items-center gap-1">
        <span style={{ color: '#7c3aed' }} className="font-bold">{uniquePlayers ?? game.total_plays ?? 0}</span> jugadores
      </span>
      <span className="flex items-center gap-1">
        {showLikeButton ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onLike(); }} className="cursor-pointer hover:opacity-80">
            {liked ? '❤️' : '🤍'}
          </button>
        ) : (
          <span>❤️</span>
        )}
        <span style={{ color: '#ef4444' }} className="font-bold">{game.total_likes ?? 0}</span>
      </span>
      <span className="flex items-center gap-1">
        <span style={{ color: '#22c55e' }} className="font-bold">${(game.total_revenue ?? 0).toLocaleString('es-AR')}</span>
      </span>
      <span className="flex items-center gap-1">
        <span style={{ color: '#06b6d4' }} className="font-bold">{Math.round((game.total_time_played ?? 0) / 60)}</span> min
      </span>
    </div>
  );
}

function GameMetricsCompact({ game, uniquePlayers, showLikeButton, liked, onLike }) {
  return (
    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#94a3b8' }}>
      <span className="flex items-center gap-1">
        <span style={{ color: '#7c3aed' }} className="font-bold">{uniquePlayers ?? game.total_plays ?? 0}</span> jugadores
      </span>
      <span className="flex items-center gap-1">
        {showLikeButton ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onLike(); }} className="cursor-pointer hover:opacity-80">
            {liked ? '❤️' : '🤍'}
          </button>
        ) : (
          <span>❤️</span>
        )}
        <span style={{ color: '#ef4444' }} className="font-bold">{game.total_likes ?? 0}</span>
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, stats, userHouseMeta, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [dailyGames, setDailyGames] = useState([]);
  const [gamesToUnlock, setGamesToUnlock] = useState([]);
  const [unlockedGames, setUnlockedGames] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [campusOpen, setCampusOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('juegos');
  const [unlockModalGame, setUnlockModalGame] = useState(null);
  const [userLikedIds, setUserLikedIds] = useState(new Set());
  const [likingGameId, setLikingGameId] = useState(null);
  const [uniquePlayersByGame, setUniquePlayersByGame] = useState({});
  const [allProfiles, setAllProfiles] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [allDonations, setAllDonations] = useState([]);
  const [allUnlocks, setAllUnlocks] = useState([]);
  const [approvedGamesAll, setApprovedGamesAll] = useState([]);
  const [rankingPage, setRankingPage] = useState(0);
  const [rankingAutoSeed, setRankingAutoSeed] = useState(0);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [donatingAmount, setDonatingAmount] = useState(null);
  const [hoveredDonationAmount, setHoveredDonationAmount] = useState(null);
  const [gameAuthors, setGameAuthors] = useState({});
  const [hoveredGameId, setHoveredGameId] = useState(null);
  const [tappedGameId, setTappedGameId] = useState(null);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const uid = session.user.id;
      const today = getTodayArgentina();

      const [
        sessionsRes,
        sessionsAllRes,
        dailyIdsRes,
        unlocksListRes,
        approvedGamesRes,
        userLikesRes,
        buildingsRes,
        unlocksAmountRes,
        donationsRes,
        allProfilesRes,
        allSessionsRes,
        allDonationsRes,
        profileAccessRes,
      ] = await Promise.all([
        supabase.from('game_sessions').select('duration_seconds').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_sessions').select('game_id, user_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('daily_free_games').select('game_id').eq('active_date', today).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('buildings').select('*').order('display_order', { ascending: true }).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => supabase.from('buildings').select('*').order('name', { ascending: true }).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true }))),
        supabase.from('game_unlocks').select('game_id, amount_paid').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('donations').select('amount').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('profiles').select('house, user_type').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_sessions').select('game_id, duration_seconds').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('donations').select('house, amount').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('profiles').select('has_all_access').eq('id', uid).maybeSingle().then((r) => ({ data: r.data, error: r.error })).catch(() => ({ data: null, error: true })),
      ]);

      const uniquePlayersByGame = {};
      (sessionsAllRes.data || []).forEach((s) => {
        if (s.game_id) {
          if (!uniquePlayersByGame[s.game_id]) uniquePlayersByGame[s.game_id] = new Set();
          uniquePlayersByGame[s.game_id].add(s.user_id);
        }
      });
      const uniquePlayersCounts = {};
      Object.keys(uniquePlayersByGame).forEach((gameId) => {
        uniquePlayersCounts[gameId] = uniquePlayersByGame[gameId].size;
      });
      setUniquePlayersByGame(uniquePlayersCounts);
      setAllProfiles(allProfilesRes.data || []);
      setAllSessions(allSessionsRes.data || []);
      setAllDonations(allDonationsRes.data || []);
      setAllUnlocks(unlocksAmountRes.data || []);
      setApprovedGamesAll(approvedGamesRes.data || []);

      const dailyIds = (dailyIdsRes.data || []).map((row) => row.game_id).filter(Boolean);
      const unlockedIds = (unlocksListRes.data || []).map((row) => row.game_id).filter(Boolean);
      const approvedGames = (approvedGamesRes.data || []).map((g) => normalizeGameProfiles(g));

      const authorIds = approvedGames
        .map((g) => g.submitted_by)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      let authorsMap = {};
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .rpc('get_authors', { user_ids: authorIds });
        if (authors) {
          authors.forEach((a) => { authorsMap[a.id] = a; });
        }
      }
      setGameAuthors(authorsMap);

      const hasAllAccessInit = !!profileAccessRes.data?.has_all_access;
      const isUnlocked = (g) => hasAllAccessInit || unlockedIds.includes(g.id) || g.unlocked_for_all === true;
      setDailyGames(approvedGames.filter((g) => g.id && dailyIds.includes(g.id)));
      setGamesToUnlock(
        hasAllAccessInit ? [] : approvedGames.filter((g) => g.id && !isUnlocked(g) && !dailyIds.includes(g.id)),
      );
      setUnlockedGames(
        hasAllAccessInit ? approvedGames.filter((g) => g.id) : approvedGames.filter((g) => g.id && isUnlocked(g)),
      );
      setUserLikedIds(new Set((userLikesRes.data || []).map((r) => r.game_id).filter(Boolean)));

      setBuildings(buildingsRes.data || []);

      const sumUnlocks = (unlocksAmountRes.data || []).reduce((acc, row) => acc + (Number(row.amount_paid) || 0), 0);
      const sumDonations = (donationsRes.data || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      setTotalRaised(sumUnlocks + sumDonations);
      setLoading(false);
    }
    init();
  }, [router]);

  /** Si el usuario obtiene ALL ACCESS en la misma sesión (p. ej. tras pago), alinear listas con el catálogo completo. */
  useEffect(() => {
    if (!profile?.has_all_access || !approvedGamesAll.length) return;
    const approvedGames = approvedGamesAll.map((g) => normalizeGameProfiles(g));
    setGamesToUnlock([]);
    setUnlockedGames((prev) => {
      const base = approvedGames.filter((g) => g.id);
      const likeMap = new Map(prev.map((g) => [g.id, g.total_likes]));
      return base.map((g) => ({ ...g, total_likes: likeMap.has(g.id) ? likeMap.get(g.id) : g.total_likes }));
    });
  }, [profile?.has_all_access, approvedGamesAll]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function handleToggleLike(gameId) {
    if (likingGameId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const liked = userLikedIds.has(gameId);
    const delta = liked ? -1 : 1;
    setLikingGameId(gameId);
    setUserLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
    const upd = (g) => (g.id === gameId ? { ...g, total_likes: Math.max(0, (g.total_likes ?? 0) + delta) } : g);
    setDailyGames((prev) => prev.map(upd));
    setUnlockedGames((prev) => prev.map(upd));
    try {
      const res = liked
        ? await fetch(`/api/likes?gameId=${encodeURIComponent(gameId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
        : await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ gameId }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.total_likes === 'number') {
        const setTotal = (g) => (g.id === gameId ? { ...g, total_likes: data.total_likes } : g);
        setDailyGames((prev) => prev.map(setTotal));
        setUnlockedGames((prev) => prev.map(setTotal));
      }
    } catch (_) {
      setUserLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(gameId);
        else next.delete(gameId);
        return next;
      });
      const revert = (g) => (g.id === gameId ? { ...g, total_likes: Math.max(0, (g.total_likes ?? 0) - delta) } : g);
      setDailyGames((prev) => prev.map(revert));
      setUnlockedGames((prev) => prev.map(revert));
    } finally {
      setLikingGameId(null);
    }
  }

  function openUnlockModal(game) {
    setUnlockModalGame(game);
  }

  async function handleDonationAmount(amount) {
    if (donatingAmount != null) return;
    setDonatingAmount(amount);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/mp/crear-donacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: session.user.id, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
        return;
      }
    } finally {
      setDonatingAmount(null);
    }
  }

  const userHouse = profile?.house || 'william_brown';
  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';
  const hasAllAccess = !!profile?.has_all_access;
  const hasUnlockedGames = unlockedGames.length > 0;
  const unlockedCarouselTitle = hasAllAccess ? '🌟 Todos los juegos' : '🔓 Mis juegos desbloqueados';
  const dailyGameIdSet = useMemo(() => new Set(dailyGames.map((g) => g.id)), [dailyGames]);

  const progressBarBg = isDark ? 'var(--vibe-border)' : '#e2e8f0';
  const progressBarFill = isDark ? 'var(--vibe-gradient-primary)' : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };
  const skeletonBg = isDark ? '#2a2a3a' : '#e2e8f0';

  useEffect(() => {
    const timer = setTimeout(() => {
      setRankingPage((prev) => (prev + 1) % RANKING_PAGE_COUNT);
    }, 10000);
    return () => clearTimeout(timer);
  }, [rankingPage, rankingAutoSeed]);

  const rankingPages = useMemo(() => {
    const emptyByHouse = () => HOUSES.reduce((acc, h) => ({ ...acc, [h.id]: 0 }), {});
    const toRows = (values, formatValue) => {
      const max = Math.max(...HOUSES.map((h) => Number(values[h.id]) || 0), 1);
      const rows = HOUSES
        .map((h) => ({ ...h, value: Number(values[h.id]) || 0 }))
        .sort((a, b) => b.value - a.value);
      return { rows, max, formatValue };
    };
    const formatInt = (v) => Number(v || 0).toLocaleString('es-AR');
    const formatMoney = (v) => `$${Number(v || 0).toLocaleString('es-AR')} ARS`;
    const formatTime = (v) => formatDuration(Number(v || 0));
    const formatScore = (v) => `${Number(v || 0).toFixed(1)} pts`;
    const gameById = (approvedGamesAll || []).reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});

    const studentsByHouse = emptyByHouse();
    (allProfiles || []).forEach((p) => {
      if (p?.house && p.user_type === 'alumno') studentsByHouse[p.house] = (studentsByHouse[p.house] || 0) + 1;
    });

    const parentsByHouse = emptyByHouse();
    (allProfiles || []).forEach((p) => {
      if (p?.house && p.user_type === 'padre') parentsByHouse[p.house] = (parentsByHouse[p.house] || 0) + 1;
    });

    const gamesByHouse = emptyByHouse();
    (approvedGamesAll || []).forEach((g) => {
      if (g?.house) gamesByHouse[g.house] = (gamesByHouse[g.house] || 0) + 1;
    });

    const likesByHouse = emptyByHouse();
    (approvedGamesAll || []).forEach((g) => {
      if (g?.house) likesByHouse[g.house] = (likesByHouse[g.house] || 0) + (Number(g.total_likes) || 0);
    });

    const unlocksByHouse = emptyByHouse();
    (allUnlocks || []).forEach((u) => {
      const game = gameById[u.game_id];
      if (game?.house) unlocksByHouse[game.house] = (unlocksByHouse[game.house] || 0) + (Number(u.amount_paid) || 0);
    });

    const donationsByHouse = emptyByHouse();
    (allDonations || []).forEach((d) => {
      if (d?.house) donationsByHouse[d.house] = (donationsByHouse[d.house] || 0) + (Number(d.amount) || 0);
    });

    const timeByHouse = emptyByHouse();
    (allSessions || []).forEach((s) => {
      const game = gameById[s.game_id];
      if (game?.house) timeByHouse[game.house] = (timeByHouse[game.house] || 0) + (Number(s.duration_seconds) || 0);
    });

    const baseOrdered = [
      { key: 'students', title: 'Más alumnos registrados', values: studentsByHouse, formatValue: formatInt },
      { key: 'parents', title: 'Más padres registrados', values: parentsByHouse, formatValue: formatInt },
      { key: 'games', title: 'Más juegos creados', values: gamesByHouse, formatValue: formatInt },
      { key: 'unlocks', title: 'Juegos Desbloqueados', values: unlocksByHouse, formatValue: formatMoney },
      { key: 'likes', title: 'Ranking de Likes', values: likesByHouse, formatValue: formatInt },
      { key: 'time', title: 'Tiempo Jugado', values: timeByHouse, formatValue: formatTime },
      { key: 'donations', title: 'Donaciones', values: donationsByHouse, formatValue: formatMoney },
    ];

    const totalByHouse = emptyByHouse();
    baseOrdered.forEach((r) => {
      const sum = HOUSES.reduce((acc, h) => acc + (Number(r.values[h.id]) || 0), 0);
      if (sum <= 0) return;
      HOUSES.forEach((h) => {
        totalByHouse[h.id] = (totalByHouse[h.id] || 0) + ((Number(r.values[h.id]) || 0) / sum) * 100;
      });
    });

    const cards = [
      ...baseOrdered.map((r, i) => ({ key: r.key, title: r.title, buildingIndex: i, ...toRows(r.values, r.formatValue) })),
      { key: 'total', title: 'Ranking Total', buildingIndex: 7, ...toRows(totalByHouse, formatScore) },
    ];

    return [cards.slice(0, 4), cards.slice(4, 8)];
  }, [allProfiles, allSessions, allDonations, allUnlocks, approvedGamesAll]);

  function renderRankingCard(ranking) {
    if (!ranking) return null;
    const buildingGoal = BUILDING_GOALS[ranking.buildingIndex];
    const buildingUnlocked = buildingGoal && totalRaised >= buildingGoal.amount;
    const leaderRow = ranking.rows[0];
    const houseLeaderSrc = buildingGoal && leaderRow
      ? houseColoredBuildingSrc(buildingGoal.image, leaderRow.name)
      : null;
    const thumbTitle = buildingGoal && leaderRow
      ? `${buildingGoal.name} · Líder: ${leaderRow.name}`
      : buildingGoal?.name;
    const rankingScale = buildingGoal?.rankingScale ?? 1;
    return (
      <div
        key={ranking.key}
        className="relative z-0 min-w-0 overflow-visible rounded-xl border p-3 hover:z-[35]"
        style={cardStyle}
      >
        {buildingGoal ? (
          <div
            className="pointer-events-none absolute right-2 -top-6 z-20 flex h-[60px] w-[60px] items-center justify-center lg:-right-4 lg:h-[80px] lg:w-[80px]"
            style={{ transform: `scale(${rankingScale})` }}
            title={thumbTitle}
          >
            {buildingUnlocked && houseLeaderSrc ? (
              <div className="ranking-building-thumb-anim relative h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]">
                <Image
                  src={encodeURI(buildingGoal.image)}
                  alt={buildingGoal.name}
                  width={80}
                  height={80}
                  className="ranking-building-thumb-normal pointer-events-none absolute left-1/2 top-1/2 max-h-[60px] max-w-[60px] -translate-x-1/2 -translate-y-1/2 object-contain lg:max-h-[80px] lg:max-w-[80px]"
                />
                <Image
                  src={encodeURI(houseLeaderSrc)}
                  alt=""
                  width={80}
                  height={80}
                  className="ranking-building-thumb-house pointer-events-none absolute left-1/2 top-1/2 max-h-[60px] max-w-[60px] -translate-x-1/2 -translate-y-1/2 object-contain lg:max-h-[80px] lg:max-w-[80px]"
                />
              </div>
            ) : (
              <div className="relative h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]">
                <Image
                  src={encodeURI(buildingGoal.image)}
                  alt={buildingGoal.name}
                  width={80}
                  height={80}
                  className="h-[60px] w-[60px] object-contain lg:h-[80px] lg:w-[80px]"
                  style={
                    buildingUnlocked
                      ? undefined
                      : { filter: 'grayscale(100%)', opacity: 0.7 }
                  }
                />
                {!buildingUnlocked ? (
                  <span className="absolute inset-0 flex items-center justify-center text-xl leading-none select-none lg:text-2xl" aria-hidden>🔒</span>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
        <h3 className="mb-2 truncate pr-20 text-sm font-bold lg:pr-[92px]" style={{ color: text }}>{ranking.title}</h3>
        <div className="space-y-1.5">
          {ranking.rows.map((row) => {
            const pct = ranking.max > 0 ? (row.value / ranking.max) * 100 : 0;
            const isUserHouse = row.id === userHouse;
            return (
              <div
                key={row.id}
                className="rounded-lg border p-2 flex items-center gap-2 min-w-0"
                style={{ borderColor: isUserHouse ? row.color : border, borderWidth: isUserHouse ? 2 : 1, background: cardBg }}
              >
                <Image src={row.image} alt={row.name} width={18} height={18} className="flex-shrink-0 object-contain" />
                <span className="text-[11px] font-bold truncate min-w-0 flex-1" style={{ color: row.color }}>{row.name}</span>
                <span className="text-[11px] font-black tabular-nums flex-shrink-0" style={{ color: text }}>{ranking.formatValue(row.value)}</span>
                <div className="w-10 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.22rem', background: progressBarBg }}>
                  <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: progressBarFill }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function resetRankingAutoTimer() {
    setRankingAutoSeed((s) => s + 1);
  }

  function goRankingNext() {
    setRankingPage((p) => (p + 1) % RANKING_PAGE_COUNT);
  }

  function goRankingPrev() {
    setRankingPage((p) => (p - 1 + RANKING_PAGE_COUNT) % RANKING_PAGE_COUNT);
  }

  function handleRankingWheel(e) {
    if (Math.abs(e.deltaX) < 10 && Math.abs(e.deltaY) < 10) return;
    if (e.deltaX > 0 || e.deltaY > 0) goRankingNext();
    else goRankingPrev();
    resetRankingAutoTimer();
  }

  function Skeleton({ className = '', style = {} }) {
    return (
      <div
        className={`animate-pulse rounded ${className}`}
        style={{ background: skeletonBg, ...style }}
      />
    );
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <header className="hidden lg:flex flex-shrink-0 items-center gap-4 px-4 h-14 border-b" style={{ borderColor: skeletonBg, background: cardBg }}>
          <Skeleton className="h-8 w-32" />
          <div className="flex-1 flex justify-center gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-16" />
            ))}
          </div>
        </header>
        <header className="lg:hidden flex-shrink-0 flex items-center justify-between px-3 h-12 border-b" style={{ borderColor: skeletonBg, background: cardBg }}>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-7 w-10" />
        </header>
        <div className="hidden lg:flex flex-1 min-h-0">
          <div className="flex-[2] flex flex-col gap-4 p-4 min-w-0">
            <Skeleton className="h-6 w-48 mb-2" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
            <Skeleton className="h-6 w-40 mb-2" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 w-[220px] flex-shrink-0" />
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-4 p-4 border-l min-w-0" style={{ borderColor: skeletonBg }}>
            <Skeleton className="h-24" />
            <Skeleton className="h-6 w-32 mb-2" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
        <div className="lg:hidden flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      {/* ========== DESKTOP: dos columnas 2/3 + 1/3, sin scroll ========== */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        {/* Columna izquierda (2/3) */}
        <div className="flex-[2] flex flex-col min-w-0 overflow-auto px-4 py-4">
          <section className="flex-shrink-0 mb-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: text }}>🎮 Juegos del día — Gratis</h2>
            {dailyGames.length === 0 ? (
              <p className="text-sm py-6 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>Hoy no hay juegos gratuitos disponibles</p>
            ) : (
              <div className="grid grid-cols-4 gap-4 min-w-0">
                {dailyGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      onMouseEnter={() => setHoveredGameId(game.id)}
                      onMouseLeave={() => setHoveredGameId(null)}
                      onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                      className={`${cardBase} p-4 flex flex-col cursor-pointer transition-all duration-200`}
                      style={cardStyle}
                    >
                      <div className="flex items-center gap-1.5 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                        <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                        <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#22c55e', color: '#fff' }}>
                          GRATIS HOY
                        </span>
                      </div>
                      <h3 className={`font-bold text-lg ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                      {game.show_author !== false && gameAuthors[game.submitted_by] && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                          por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                      <GameMetricsFull
                        game={game}
                        uniquePlayers={uniquePlayersByGame[game.id]}
                        showLikeButton
                        liked={userLikedIds.has(game.id)}
                        onLike={() => handleToggleLike(game.id)}
                      />
                      <Link href={`/jugar/${game.id}`} onClick={(e) => e.stopPropagation()} className="vibe-btn-gradient mt-4 w-full rounded-xl py-3.5 font-bold text-white text-center block">
                        Jugar
                      </Link>
                    </div>
                  );
                })}
                <div className={`${cardBase} p-4 flex flex-col justify-between`} style={cardStyle}>
                  <div>
                    <p className="text-2xl mb-2">🎮</p>
                    <h3 className="font-bold text-lg" style={{ color: text }}>¡Creá tu juego!</h3>
                    <p className="text-xs mt-2" style={{ color: textMuted }}>
                      Hacé tu propio juego y compartilo con todo el colegio. Podés crearlo con IA o subir uno que ya tengas.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/game-lab')}
                      className="vibe-btn-gradient w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
                    >
                      🤖 Crear con Andy
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/juegos/subir')}
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold border cursor-pointer transition-colors hover:opacity-80"
                      style={{ borderColor: border, color: textMuted, background: 'transparent' }}
                    >
                      🕹️ Subir mi juego
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Carrusel 2 — Juegos para desbloquear (segundo en orden) */}
          <section className="flex-shrink-0 mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold min-w-0" style={{ color: text }}>🎮 Juegos para desbloquear</h2>
              {!hasAllAccess && (
                <Link
                  href="/juegos"
                  className="h-8 px-3 rounded-lg border text-sm font-bold inline-flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: border, color: text }}
                >
                  Ver todos →
                </Link>
              )}
            </div>
            {hasAllAccess ? (
              <p className="text-sm py-4 px-3 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>
                Tenés ALL ACCESS — todos los juegos del catálogo están desbloqueados.
              </p>
            ) : (
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {gamesToUnlock.map((game) => {
                const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                return (
                  <div
                    key={game.id}
                    onMouseEnter={() => setHoveredGameId(game.id)}
                    onMouseLeave={() => setHoveredGameId(null)}
                    onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                    className={`${cardBase} flex-shrink-0 w-[220px] p-4 flex flex-col cursor-pointer transition-all duration-200`}
                    style={cardStyle}
                  >
                    <div className="flex items-center gap-1.5 mb-2 min-w-0">
                      <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                      <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                    </div>
                    <h3 className={`font-bold text-sm ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                    {game.show_author !== false && gameAuthors[game.submitted_by] && (
                      <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                        por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                    <GameMetricsFull
                      game={game}
                      uniquePlayers={uniquePlayersByGame[game.id]}
                      showLikeButton={false}
                      liked={userLikedIds.has(game.id)}
                      onLike={() => handleToggleLike(game.id)}
                    />
                    <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>
                      ${effectiveIndividualGamePrice(game.price).toLocaleString('es-AR')} ARS
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openUnlockModal(game); }}
                      className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block"
                    >
                      Desbloquear
                    </button>
                  </div>
                );
              })}
            </div>
            )}
          </section>

          {/* Banner separador full width (tercero) */}
          {stats.juegos < 3 && (
            <div
              className="flex-shrink-0 rounded-xl py-6 px-4 mb-4 text-center -mx-0 flex flex-col items-center justify-center gap-4"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', border: `2px solid ${border}` }}
            >
              <p
                className="text-lg md:text-xl font-black uppercase tracking-wide text-white max-w-2xl mx-auto"
                style={{ fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
              >
                ¡Desbloqueá juegos y construyamos el Campus!
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
<Link href="/juegos" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                    Ver juegos
                  </Link>
                <button type="button" onClick={() => setDonationModalOpen(true)} className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                  Donar
                </button>
              </div>
            </div>
          )}

          {/* Carrusel 1 — Mis juegos desbloqueados (cuarto) */}
          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
              <h2 className="text-lg font-bold min-w-0" style={{ color: text }}>{unlockedCarouselTitle}</h2>
              <Link
                href="/juegos"
                className="h-8 px-3 rounded-lg border text-sm font-bold inline-flex items-center justify-center flex-shrink-0"
                style={{ borderColor: border, color: text }}
              >
                Ver todos →
              </Link>
            </div>
            {hasUnlockedGames ? (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {unlockedGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      onMouseEnter={() => setHoveredGameId(game.id)}
                      onMouseLeave={() => setHoveredGameId(null)}
                      onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                      className={`${cardBase} flex-shrink-0 w-[220px] p-4 flex flex-col cursor-pointer transition-all duration-200`}
                      style={cardStyle}
                    >
                      <div className="flex items-center gap-1.5 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                        <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                        {dailyGameIdSet.has(game.id) ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#22c55e', color: '#fff' }}>
                            GRATIS HOY
                          </span>
                        ) : hasAllAccess ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#eab308', color: '#0f172a' }}>
                            ALL ACCESS
                          </span>
                        ) : (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: accent, color: '#fff' }}>
                            DESBLOQUEADO
                          </span>
                        )}
                      </div>
                      <h3 className={`font-bold text-sm ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                      {game.show_author !== false && gameAuthors[game.submitted_by] && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                          por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                      <GameMetricsCompact
                        game={game}
                        uniquePlayers={uniquePlayersByGame[game.id]}
                        showLikeButton
                        liked={userLikedIds.has(game.id)}
                        onLike={() => handleToggleLike(game.id)}
                      />
                      <Link href={`/jugar/${game.id}`} onClick={(e) => e.stopPropagation()} className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block">Jugar</Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0 flex-shrink-0" style={{ color: textMuted, ...cardStyle }}>Todavía no desbloqueaste ningún juego</p>
            )}
          </section>
        </div>

        {/* Columna derecha (1/3) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto px-4 py-4 border-l" style={{ borderColor: border }}>
          {/* Próximo edificio — barra de progreso por recaudación */}
          {(() => {
            const formatArs = (n) => Number(n).toLocaleString('es-AR');
            const currentIndex = BUILDING_GOALS.findIndex((g) => totalRaised < g.amount);
            const currentBuilding = currentIndex === -1 ? BUILDING_GOALS[BUILDING_GOALS.length - 1] : BUILDING_GOALS[currentIndex];
            const currentGoal = currentBuilding.amount;
            const completedBuildings = currentIndex <= 0 ? [] : BUILDING_GOALS.slice(0, currentIndex);
            const progress = currentGoal ? Math.min(100, (totalRaised / currentGoal) * 100) : 0;
            return (
              <section className="flex-shrink-0 mb-6">
                <h2 className="text-lg font-bold mb-2" style={{ color: text }}>🏗️ Próximo Edificio a Desbloquear</h2>
                {completedBuildings.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-2 text-[11px]" style={{ color: textMuted }}>
                    {completedBuildings.map((b) => (
                      <span key={`${b.amount}-${b.name}`}>✅ {b.name}</span>
                    ))}
                  </div>
                )}
                <div
                  className="rounded-xl p-[2px] min-w-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
                >
                  <div className="rounded-[10px] p-4 min-w-0 h-full" style={{ background: cardBg }}>
                    <div className="flex justify-center mb-2 h-20 w-full">
                      <Image
                        src={encodeURI(currentBuilding.image)}
                        alt={currentBuilding.name}
                        width={200}
                        height={80}
                        className="object-contain h-[80px] w-auto max-w-full"
                      />
                    </div>
                    <p className="text-sm font-bold text-center mb-2" style={{ color: text }}>{currentBuilding.name}</p>
                    <p
                      className="text-xl font-black tabular-nums mb-2 text-center"
                      style={{ color: accent, fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
                    >
                      ${formatArs(currentGoal)} ARS
                    </p>
                    <p className="mb-2 leading-snug" style={{ color: textMuted }}>
                      <span className="text-lg font-black tabular-nums" style={{ color: text }}>
                        Recaudado: ${formatArs(totalRaised)} ARS
                      </span>
                      {' '}
                      <span className="text-base font-bold tabular-nums">
                        de ${formatArs(currentGoal)} ARS
                      </span>
                    </p>
                    <div className="rounded-full overflow-hidden h-3" style={{ background: progressBarBg }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)' }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          <button
            type="button"
            onClick={() => setDonationModalOpen(true)}
            className="vibe-btn-gradient w-full rounded-xl py-2.5 mb-6 font-bold text-white text-sm"
          >
            Donar
          </button>

          {/* Ranking de Houses — carrusel 8 rankings (desktop 2x2) */}
          <section className="flex-shrink-0 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: text }}>Ranking de Houses</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    goRankingPrev();
                    resetRankingAutoTimer();
                  }}
                  className="w-8 h-8 rounded-lg border text-sm font-bold"
                  style={{ borderColor: border, color: text }}
                  aria-label="Ranking anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goRankingNext();
                    resetRankingAutoTimer();
                  }}
                  className="w-8 h-8 rounded-lg border text-sm font-bold"
                  style={{ borderColor: border, color: text }}
                  aria-label="Ranking siguiente"
                >
                  →
                </button>
              </div>
            </div>
            <div
              className="min-w-0 w-full overflow-x-hidden overflow-y-visible pt-7"
              onWheel={handleRankingWheel}
            >
              <div
                className="flex"
                style={{
                  width: `${rankingPages.length * 100}%`,
                  transform: `translateX(-${(rankingPage * 100) / rankingPages.length}%)`,
                  transition: 'transform 350ms ease-in-out',
                }}
              >
                {rankingPages.map((pageRankings, pageIdx) => (
                  <div
                    key={`desktop-page-${pageIdx}`}
                    className="box-border min-w-0 shrink-0"
                    style={{
                      width: `${100 / rankingPages.length}%`,
                      paddingRight: pageIdx < rankingPages.length - 1 ? 24 : 0,
                      transition: 'opacity 350ms ease-in-out',
                      opacity: rankingPage === pageIdx ? 1 : 0.9,
                    }}
                  >
                    <div className="grid min-w-0 grid-cols-2 gap-3">
                      {pageRankings.map((ranking) => renderRankingCard(ranking))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              {[0, 1].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRankingPage(i);
                    resetRankingAutoTimer();
                  }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: rankingPage === i ? accent : border }}
                  aria-label={`Ir a página ${i + 1} de rankings`}
                />
              ))}
            </div>
            <button
              type="button"
              className="vibe-btn-gradient w-full rounded-xl py-2.5 mt-4 font-bold text-white text-sm"
            >
              🏆 Ver Rankings — ¡Visita el Campus!
            </button>
          </section>

          {/* Progreso del Campus (desktop) oculto temporalmente
          <section className="flex-shrink-0">
            <h2 className="text-lg font-bold mb-3" style={{ color: text }}>Progreso del Campus</h2>
            <div className="space-y-2 min-w-0">
              {(buildings.length > 0 ? buildings : []).map((b) => {
                const target = Number(b.target_amount) || 0;
                const current = Number(b.current_amount) || 0;
                const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                return (
                  <div key={b.id} className={`${cardBase} p-2 flex items-center gap-2`} style={cardStyle}>
                    <span className="text-xs font-semibold truncate min-w-0 flex-1" style={{ color: text }}>{b.name || 'Edificio'}</span>
                    <div className="w-16 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: progressBarFill }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums flex-shrink-0 w-6 text-right" style={{ color: textMuted }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </section>
          */}
        </div>
      </div>

      {/* ========== MOBILE: scroll vertical + barra inferior fija ========== */}
      <div className="lg:hidden flex-1 overflow-auto min-h-0" style={{ paddingBottom: '60px' }}>
        {/* Stats — 3 chips */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 min-w-0" style={{ background: cardBg, borderBottom: `1px solid ${border}` }}>
          <div className="rounded-xl border py-2.5 px-2 text-center min-w-0 overflow-hidden" style={cardStyle}>
            <p className="text-lg font-black tabular-nums truncate" style={{ color: accent }}>{stats.juegos}</p>
            <p className="text-[10px] font-medium break-words hyphens-auto mt-0.5 leading-tight" style={{ color: textMuted }}>{STATS_KEYS[0].label}</p>
          </div>
          <div className="rounded-xl border py-2.5 px-2 text-center min-w-0 overflow-hidden" style={cardStyle}>
            <p className="text-lg font-black tabular-nums truncate" style={{ color: accent }}>{formatDuration(stats.tiempoSeconds)}</p>
            <p className="text-[10px] font-medium break-words hyphens-auto mt-0.5 leading-tight" style={{ color: textMuted }}>{STATS_KEYS[1].label}</p>
          </div>
          <div className="rounded-xl border py-2.5 px-2 text-center min-w-0 overflow-hidden" style={cardStyle}>
            <p className="text-lg font-black tabular-nums truncate" style={{ color: accent }}>{stats.puntos}</p>
            <p className="text-[10px] font-medium break-words hyphens-auto mt-0.5 leading-tight" style={{ color: textMuted }}>{STATS_KEYS[2].label}</p>
          </div>
        </div>

        {/* Próximo edificio (mobile) — compacto + botón Donar, separado de stats */}
        {(() => {
          const formatArs = (n) => Number(n).toLocaleString('es-AR');
          const currentIndex = BUILDING_GOALS.findIndex((g) => totalRaised < g.amount);
          const currentBuilding = currentIndex === -1 ? BUILDING_GOALS[BUILDING_GOALS.length - 1] : BUILDING_GOALS[currentIndex];
          const currentGoal = currentBuilding.amount;
          const progress = currentGoal ? Math.min(100, (totalRaised / currentGoal) * 100) : 0;
          const objetivoBg = isDark ? '#16161f' : '#f1f5f9';
          return (
            <div
              className="px-4 py-2 flex items-stretch gap-2.5 min-w-0 border-t"
              style={{ background: objetivoBg, borderColor: border }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border p-2" style={{ ...cardStyle, background: cardBg }}>
                <Image
                  src={encodeURI(currentBuilding.image)}
                  alt={currentBuilding.name}
                  width={50}
                  height={50}
                  className="h-[50px] w-[50px] flex-shrink-0 object-contain"
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p className="mb-0.5 text-xs font-black leading-tight tabular-nums" style={{ color: accent }}>
                    🏗️ <span className="font-bold">{currentBuilding.name}</span>
                    {' '}
                    <span className="tabular-nums">${formatArs(currentGoal)} ARS</span>
                  </p>
                  <div className="mb-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: progressBarBg }}>
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)' }} />
                  </div>
                  <p className="leading-tight tabular-nums" style={{ color: textMuted }}>
                    <span className="text-lg font-black" style={{ color: text }}>Recaudado: ${formatArs(totalRaised)}</span>
                    {' '}
                    <span className="text-base font-bold">de ${formatArs(currentGoal)}</span>
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setDonationModalOpen(true)} className="vibe-btn-gradient flex-shrink-0 rounded-xl px-3 py-2 font-bold text-white text-sm self-center">
                Donar
              </button>
            </div>
          );
        })()}

        <div className="px-4 py-4 space-y-6 min-w-0">
          {/* Juegos del día — scroll horizontal tipo Netflix, cards 75vw, sin scrollbar */}
          <section id="juegos-dia" className="min-w-0 scroll-mt-24">
            <h2 className="text-base font-bold mb-3 w-full" style={{ color: text }}>🎮 Juegos del día — Gratis</h2>
            {dailyGames.length === 0 ? (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>Hoy no hay juegos gratuitos disponibles</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                {dailyGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      onMouseEnter={() => setHoveredGameId(game.id)}
                      onMouseLeave={() => setHoveredGameId(null)}
                      onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                      className={`${cardBase} flex-shrink-0 p-4 flex flex-col cursor-pointer transition-all duration-200`}
                      style={{ width: '75vw', ...cardStyle }}
                    >
                      <div className="flex items-center gap-1.5 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                        <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                        <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#22c55e', color: '#fff' }}>
                          GRATIS HOY
                        </span>
                      </div>
                      <h3 className={`font-bold text-sm ${isExpanded ? '' : 'line-clamp-1'} min-w-0 flex-1`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                      {game.show_author !== false && gameAuthors[game.submitted_by] && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                          por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                      <GameMetricsCompact
                        game={game}
                        uniquePlayers={uniquePlayersByGame[game.id]}
                        showLikeButton
                        liked={userLikedIds.has(game.id)}
                        onLike={() => handleToggleLike(game.id)}
                      />
                      <Link href={`/jugar/${game.id}`} onClick={(e) => e.stopPropagation()} className="vibe-btn-gradient mt-3 w-full rounded-xl py-3 font-bold text-white text-sm text-center block">Jugar</Link>
                    </div>
                  );
                })}
                <div
                  className={`${cardBase} p-4 flex flex-col justify-between flex-shrink-0`}
                  style={{ ...cardStyle, width: '75vw', maxWidth: 300 }}
                >
                  <div>
                    <p className="text-2xl mb-2">🎮</p>
                    <h3 className="font-bold text-base" style={{ color: text }}>¡Creá tu juego!</h3>
                    <p className="text-xs mt-2" style={{ color: textMuted }}>
                      Hacé tu propio juego y compartilo con todo el colegio.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/game-lab')}
                      className="vibe-btn-gradient w-full rounded-xl px-4 py-2 text-sm font-bold text-white cursor-pointer"
                    >
                      🤖 Crear con Andy
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/juegos/subir')}
                      className="w-full rounded-xl px-4 py-2 text-sm font-bold border cursor-pointer transition-colors hover:opacity-80"
                      style={{ borderColor: border, color: textMuted, background: 'transparent' }}
                    >
                      🕹️ Subir mi juego
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Banner CTA — mismo texto y botones que desktop */}
          {stats.juegos < 3 && (
            <section className="min-w-0 -mx-4">
              <div
                className="rounded-none mx-0 py-8 px-4 flex flex-col items-center justify-center text-center gap-4"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', borderTop: `2px solid ${border}`, borderBottom: `2px solid ${border}` }}
              >
                <p
                  className="text-2xl font-black uppercase tracking-wide text-white"
                  style={{ fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
                >
                  ¡Desbloqueá juegos y construyamos el Campus!
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/juegos" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                    Ver juegos
                  </Link>
                  <button type="button" onClick={() => setDonationModalOpen(true)} className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                    Donar
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Juegos para desbloquear — scroll horizontal mismo estilo que Juegos del día */}
          <section className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: text }}>🎮 Juegos para desbloquear</h2>
              {!hasAllAccess && (
                <button
                  type="button"
                  onClick={() => router.push('/juegos')}
                  className="text-xs font-bold px-3 py-1 rounded-lg border cursor-pointer hover:opacity-80"
                  style={{ borderColor: border, color: accent }}
                >
                  Ver todos →
                </button>
              )}
            </div>
            {hasAllAccess ? (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>
                Tenés ALL ACCESS — todos los juegos del catálogo están desbloqueados.
              </p>
            ) : gamesToUnlock.length === 0 ? (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>No hay más juegos para desbloquear</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                {gamesToUnlock.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      onMouseEnter={() => setHoveredGameId(game.id)}
                      onMouseLeave={() => setHoveredGameId(null)}
                      onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                      className={`${cardBase} flex-shrink-0 p-4 flex flex-col cursor-pointer transition-all duration-200`}
                      style={{ width: '75vw', ...cardStyle }}
                    >
                      <div className="flex items-center gap-1.5 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                        <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <h3 className={`font-bold text-sm ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                      {game.show_author !== false && gameAuthors[game.submitted_by] && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                          por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                      <GameMetricsFull
                        game={game}
                        uniquePlayers={uniquePlayersByGame[game.id]}
                        showLikeButton={false}
                        liked={userLikedIds.has(game.id)}
                        onLike={() => handleToggleLike(game.id)}
                      />
                      <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>
                        ${effectiveIndividualGamePrice(game.price).toLocaleString('es-AR')} ARS
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openUnlockModal(game); }}
                        className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block"
                      >
                        Desbloquear
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Mis juegos desbloqueados — vacío o grid 2 cols */}
          <section className="min-w-0">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>{unlockedCarouselTitle}</h2>
            {hasUnlockedGames ? (
              <div className="grid grid-cols-2 gap-3 min-w-0">
                {unlockedGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      onMouseEnter={() => setHoveredGameId(game.id)}
                      onMouseLeave={() => setHoveredGameId(null)}
                      onClick={() => setTappedGameId((prev) => (prev === game.id ? null : game.id))}
                      className={`${cardBase} p-4 flex flex-col cursor-pointer transition-all duration-200`}
                      style={cardStyle}
                    >
                      <div className="flex items-center gap-1.5 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={20} height={20} className="flex-shrink-0 object-contain" />
                        <span className="text-[10px] font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                        {dailyGameIdSet.has(game.id) ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#22c55e', color: '#fff' }}>
                            GRATIS HOY
                          </span>
                        ) : hasAllAccess ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#eab308', color: '#0f172a' }}>
                            ALL ACCESS
                          </span>
                        ) : (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: accent, color: '#fff' }}>
                            DESBLOQUEADO
                          </span>
                        )}
                      </div>
                      <h3 className={`font-bold text-sm ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h3>
                      {game.show_author !== false && gameAuthors[game.submitted_by] && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                          por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0`} style={{ color: textMuted }}>{game.description || ''}</p>
                      <GameMetricsCompact
                        game={game}
                        uniquePlayers={uniquePlayersByGame[game.id]}
                        showLikeButton
                        liked={userLikedIds.has(game.id)}
                        onLike={() => handleToggleLike(game.id)}
                      />
                      <Link href={`/jugar/${game.id}`} onClick={(e) => e.stopPropagation()} className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block">Jugar</Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border p-6 text-center min-w-0" style={cardStyle}>
                <p className="text-sm mb-4" style={{ color: textMuted }}>Todavía no desbloqueaste ningún juego</p>
                <Link href="/juegos" className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white text-sm">
                  Ver todos los juegos
                </Link>
              </div>
            )}
          </section>

          {/* Ranking de Houses — carrusel 8 rankings (mobile 1x1) */}
          <section id="ranking-houses" className="min-w-0 scroll-mt-24">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: text }}>🏆 Ranking de Houses</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    goRankingPrev();
                    resetRankingAutoTimer();
                  }}
                  className="w-8 h-8 rounded-lg border text-sm font-bold"
                  style={{ borderColor: border, color: text }}
                  aria-label="Ranking anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goRankingNext();
                    resetRankingAutoTimer();
                  }}
                  className="w-8 h-8 rounded-lg border text-sm font-bold"
                  style={{ borderColor: border, color: text }}
                  aria-label="Ranking siguiente"
                >
                  →
                </button>
              </div>
            </div>
            <div
              className="min-w-0 w-full overflow-x-hidden overflow-y-visible pt-7"
              onWheel={handleRankingWheel}
            >
              <div
                className="flex"
                style={{
                  width: `${rankingPages.length * 100}%`,
                  transform: `translateX(-${(rankingPage * 100) / rankingPages.length}%)`,
                  transition: 'transform 350ms ease-in-out',
                }}
              >
                {rankingPages.map((pageRankings, pageIdx) => (
                  <div
                    key={`mobile-page-${pageIdx}`}
                    className="box-border min-w-0 shrink-0"
                    style={{
                      width: `${100 / rankingPages.length}%`,
                      paddingRight: pageIdx < rankingPages.length - 1 ? 24 : 0,
                      transition: 'opacity 350ms ease-in-out',
                      opacity: rankingPage === pageIdx ? 1 : 0.9,
                    }}
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-3">
                      {pageRankings.map((ranking) => renderRankingCard(ranking))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              {[0, 1].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRankingPage(i);
                    resetRankingAutoTimer();
                  }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: rankingPage === i ? accent : border }}
                  aria-label={`Ir a página ${i + 1} de rankings`}
                />
              ))}
            </div>
            <button
              type="button"
              className="vibe-btn-gradient w-full rounded-xl py-2.5 mt-4 font-bold text-white text-sm"
            >
              🏆 Ver Rankings — ¡Visita el Campus!
            </button>
            <button
              type="button"
              onClick={() => setDonationModalOpen(true)}
              className="vibe-btn-gradient w-full rounded-xl py-2.5 mt-2 font-bold text-white text-sm"
            >
              Donar
            </button>
          </section>

          {/* Progreso del Campus (mobile) oculto temporalmente
          <section id="progreso-campus" className="min-w-0 scroll-mt-24">
            <button
              type="button"
              onClick={() => setCampusOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-xl border p-4 font-bold text-left min-w-0"
              style={{ ...cardStyle, color: text }}
            >
              <span className="truncate">🏗 Progreso del Campus</span>
              <IconChevronDown open={campusOpen} />
            </button>
            {campusOpen && (
              <div className="mt-2 space-y-2 min-w-0">
                {(buildings.length > 0 ? buildings : []).map((b) => {
                  const target = Number(b.target_amount) || 0;
                  const current = Number(b.current_amount) || 0;
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                  return (
                    <div key={b.id} className={`${cardBase} p-2.5 flex items-center gap-2`} style={cardStyle}>
                      <span className="font-semibold text-xs truncate min-w-0 flex-1" style={{ color: text }}>{b.name || 'Edificio'}</span>
                      <div className="w-16 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: progressBarFill }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums flex-shrink-0 w-6 text-right" style={{ color: textMuted }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          */}

          {/* Perfil — sección mínima para tab inferior */}
          <section id="perfil" className="min-w-0 scroll-mt-24 pb-4">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>👤 Perfil</h2>
            <button
              type="button"
              onClick={() => router.push('/perfil')}
              className={`${cardBase} p-4 flex items-center gap-3 w-full text-left cursor-pointer border transition-opacity hover:opacity-90`}
              style={cardStyle}
            >
              <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={48} height={48} className="flex-shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</p>
                <p className="text-xs" style={{ color: textMuted }}>Tu House</p>
              </div>
            </button>
          </section>
        </div>
      </div>

      {/* Modal de donación — identidad PRD (dark), logo, espaciado, hover botones */}
      {donationModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(10,10,15,0.82)' }}
          onClick={() => setDonationModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-modal-title"
        >
          <div
            className="relative rounded-2xl border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: cardBg,
              borderColor: border,
              color: text,
              boxShadow: isDark ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px ${border}` : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDonationModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90"
              style={{ background: isDark ? '#2a2a3a' : '#e2e8f0', color: text }}
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8 pt-14 pb-10">
              <div className={`flex justify-center ${profile?.user_type !== 'padre' ? 'mb-8' : 'mb-6'}`}>
                <Image
                  src="/images/logo-sass.png"
                  alt="Campus San Andrés"
                  width={profile?.user_type !== 'padre' ? 96 : 64}
                  height={profile?.user_type !== 'padre' ? 96 : 64}
                  className="object-contain"
                />
              </div>
              {profile?.user_type !== 'padre' ? (
                <div className="text-center px-4 py-6 space-y-4">
                  <p className="text-base leading-relaxed" style={{ color: text }}>
                    Solo los perfiles de Padres pueden realizar donaciones.
                  </p>
                  <p className="text-base leading-relaxed" style={{ color: text }}>
                    Hablá con ellos si querés que ayuden en la construcción del Campus San Andrés 🏫
                  </p>
                </div>
              ) : (
                <>
                  <h2 id="donation-modal-title" className="text-2xl font-bold mb-6 text-center" style={{ color: text }}>
                    Donar al Campus San Andrés
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {DONATION_AMOUNTS.map((item) => {
                      const isHovered = hoveredDonationAmount === item.amount && donatingAmount == null;
                      const glow = item.gold
                        ? '0 0 0 3px rgba(234,179,8,0.5), 0 8px 24px rgba(234,179,8,0.25)'
                        : '0 0 0 3px rgba(124,58,237,0.5), 0 8px 24px rgba(124,58,237,0.25)';
                      return (
                        <button
                          key={item.amount}
                          type="button"
                          disabled={donatingAmount != null}
                          onClick={() => handleDonationAmount(item.amount)}
                          onMouseEnter={() => setHoveredDonationAmount(item.amount)}
                          onMouseLeave={() => setHoveredDonationAmount(null)}
                          className="rounded-xl border-2 py-5 px-4 font-bold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                          style={{
                            borderColor: item.gold ? '#eab308' : border,
                            background: item.gold ? 'rgba(234,179,8,0.15)' : (isDark ? '#1a1a24' : '#f1f5f9'),
                            color: item.gold ? '#eab308' : text,
                            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                            boxShadow: isHovered ? glow : 'none',
                          }}
                        >
                          {item.gold && <span className="block text-base mb-0.5">⭐</span>}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                    Importante
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                    Los montos donados van directamente a la cuenta de la Asociación Civil Educativa Escocesa San Andrés, sin intermediarios. Los datos del donante serán registrados junto a los datos de la cuenta de Mercado Pago utilizada.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <UnlockGameModal
        isOpen={!!unlockModalGame}
        onClose={() => setUnlockModalGame(null)}
        game={unlockModalGame}
        userCredits={profile?.unlock_credits ?? 0}
        hasAllAccess={!!profile?.has_all_access}
        onUnlockSuccess={(g) => {
          setGamesToUnlock((prev) => prev.filter((x) => x.id !== g.id));
          setUnlockedGames((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
          setUnlockModalGame(null);
        }}
      />

      <MobileBottomNav
        theme={theme}
        activeTabId={mobileTab}
        onTabChange={(id) => {
          setMobileTab(id);
          scrollToSection(id);
        }}
      />
    </div>
  );
}
