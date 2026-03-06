'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

const GOALS_ARS = [20000, 100000, 500000, 2000000, 5000000, 10000000, 25000000, 50000000, 100000000, 1000000000];

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

export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
  const [dailyGames, setDailyGames] = useState([]);
  const [gamesToUnlock, setGamesToUnlock] = useState([]);
  const [unlockedGames, setUnlockedGames] = useState([]);
  const [houseRanking, setHouseRanking] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('juegos');
  const [unlockingGameId, setUnlockingGameId] = useState(null);
  const [userLikedIds, setUserLikedIds] = useState(new Set());
  const [likingGameId, setLikingGameId] = useState(null);
  const [uniquePlayersByGame, setUniquePlayersByGame] = useState({});

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
      const today = new Date().toISOString().split('T')[0];

      const [
        profileRes,
        unlocksCountRes,
        sessionsRes,
        sessionsAllRes,
        dailyIdsRes,
        unlocksListRes,
        approvedGamesRes,
        userLikesRes,
        housePointsRes,
        buildingsRes,
        unlocksAmountRes,
        donationsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, house').eq('id', uid).single().then((r) => ({ data: r.data, error: r.error })).catch(() => ({ data: null, error: true })),
        supabase.from('game_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', uid).then((r) => ({ count: r.count ?? 0, error: r.error })).catch(() => ({ count: 0, error: true })),
        supabase.from('game_sessions').select('duration_seconds').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_sessions').select('game_id, user_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('daily_free_games').select('game_id').eq('active_date', today).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('house_points').select('*').order('total_points', { ascending: false }).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('buildings').select('*').order('display_order', { ascending: true }).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => supabase.from('buildings').select('*').order('name', { ascending: true }).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true }))),
        supabase.from('game_unlocks').select('amount_paid').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('donations').select('amount').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
      ]);

      const profileData = profileRes.data || { first_name: 'Usuario', last_name: '', house: 'william_brown' };
      setProfile(profileData);
      const userHouse = profileData.house || 'william_brown';

      setStats({
        juegos: unlocksCountRes.count ?? 0,
        tiempoSeconds: (sessionsRes.data || []).reduce((acc, row) => acc + (Number(row.duration_seconds) || 0), 0),
        puntos: (housePointsRes.data || []).find((row) => row.house === userHouse)?.total_points ?? 0,
      });

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

      const dailyIds = (dailyIdsRes.data || []).map((row) => row.game_id).filter(Boolean);
      const unlockedIds = (unlocksListRes.data || []).map((row) => row.game_id).filter(Boolean);
      const approvedGames = approvedGamesRes.data || [];

      setDailyGames(approvedGames.filter((g) => g.id && dailyIds.includes(g.id)));
      setGamesToUnlock(approvedGames.filter((g) => g.id && !unlockedIds.includes(g.id) && !dailyIds.includes(g.id)));
      setUnlockedGames(approvedGames.filter((g) => g.id && unlockedIds.includes(g.id)));
      setUserLikedIds(new Set((userLikesRes.data || []).map((r) => r.game_id).filter(Boolean)));

      setHouseRanking(housePointsRes.data || []);
      setBuildings(buildingsRes.data || []);

      const sumUnlocks = (unlocksAmountRes.data || []).reduce((acc, row) => acc + (Number(row.amount_paid) || 0), 0);
      const sumDonations = (donationsRes.data || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      setTotalRaised(sumUnlocks + sumDonations);
      setLoading(false);
    }
    init();
  }, [router]);

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

  async function handleDesbloquear(game) {
    if (unlockingGameId) return;
    setUnlockingGameId(game.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }
      const gamePrice = Number(game.price) || 5000;
      const res = await fetch('/api/mp/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          gameId: game.id,
          userId: session.user.id,
          gameTitle: encodeURIComponent(game.title || 'Juego'),
          gamePrice,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnlockingGameId(null);
        return;
      }
      if (data.init_point) window.location.href = data.init_point;
      else setUnlockingGameId(null);
    } catch {
      setUnlockingGameId(null);
    }
  }

  const userHouse = profile?.house || 'william_brown';
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];
  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';
  const hasUnlockedGames = unlockedGames.length > 0;

  const progressBarBg = isDark ? 'var(--vibe-border)' : '#e2e8f0';
  const progressBarFill = isDark ? 'var(--vibe-gradient-primary)' : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };
  const skeletonBg = isDark ? '#2a2a3a' : '#e2e8f0';

  function Skeleton({ className = '', style = {} }) {
    return (
      <div
        className={`animate-pulse rounded ${className}`}
        style={{ background: skeletonBg, ...style }}
      />
    );
  }

  if (loading) {
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
        profile={profile}
        stats={stats}
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
                  return (
                    <div key={game.id} className={`${cardBase} p-4 flex flex-col`} style={cardStyle}>
                      <h3 className="font-bold text-lg break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                      <p className="text-sm mt-2 flex-1 break-words min-w-0" style={{ color: textMuted }}>{game.description || ''}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] items-center" style={{ color: textMuted }}>
                        <span>👥 {uniquePlayersByGame[game.id] ?? 0} jugadores</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLike(game.id)}
                          disabled={likingGameId === game.id}
                          className="inline-flex items-center gap-0.5 rounded p-0.5 transition-transform duration-150 hover:scale-110 active:scale-[1.2] disabled:opacity-70"
                          aria-label={userLikedIds.has(game.id) ? 'Quitar like' : 'Dar like'}
                        >
                          <span className="tabular-nums">{userLikedIds.has(game.id) ? '❤️' : '🤍'}</span>
                          <span>{game.total_likes ?? 0}</span>
                        </button>
                        <span>💰 ${(game.total_revenue ?? 0).toLocaleString('es-AR')} ARS recaudado</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 min-w-0">
                        <Image src={house.image} alt={house.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold uppercase truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient mt-4 w-full rounded-xl py-3.5 font-bold text-white text-center block">
                        Jugar
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Carrusel 2 — Juegos para desbloquear (segundo en orden) */}
          <section className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-bold" style={{ color: text }}>🎮 Juegos para desbloquear</h2>
              <Link href="/juegos" className="text-sm font-semibold flex-shrink-0" style={{ color: accent }}>Ver todos →</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {gamesToUnlock.map((game) => {
                const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                return (
                  <div key={game.id} className="flex-shrink-0 w-[220px] rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                      <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                      <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                    </div>
                    <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                    <p className="text-xs mt-1 flex-1 break-words min-w-0" style={{ color: textMuted }}>{game.description || ''}</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-[11px] min-w-0" style={{ color: textMuted }}>
                      <span>👥 {uniquePlayersByGame[game.id] ?? 0} jugadores</span>
                      <span>❤️ 0 likes</span>
                      <span>💰 ${(game.total_revenue ?? 0).toLocaleString('es-AR')} ARS recaudado</span>
                    </div>
                    <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>
                      ${(Number(game.price) || 5000).toLocaleString('es-AR')} ARS
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDesbloquear(game)}
                      disabled={unlockingGameId === game.id}
                      className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {unlockingGameId === game.id ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Redirigiendo...
                        </span>
                      ) : (
                        'Desbloquear'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Banner separador full width (tercero) */}
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
              <button type="button" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                Donar
              </button>
            </div>
          </div>

          {/* Carrusel 1 — Mis juegos desbloqueados (cuarto) */}
          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ color: text }}>🔓 Mis juegos desbloqueados</h2>
              <Link href="/juegos" className="text-sm font-semibold flex-shrink-0" style={{ color: accent }}>Ver todos →</Link>
            </div>
            {hasUnlockedGames ? (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {unlockedGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  return (
                    <div key={game.id} className="flex-shrink-0 w-[220px] rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-[11px] min-w-0 items-center" style={{ color: textMuted }}>
                        <span>👥 {uniquePlayersByGame[game.id] ?? 0}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLike(game.id)}
                          disabled={likingGameId === game.id}
                          className="inline-flex items-center gap-0.5 rounded p-0.5 transition-transform duration-150 hover:scale-110 active:scale-[1.2] disabled:opacity-70"
                          aria-label={userLikedIds.has(game.id) ? 'Quitar like' : 'Dar like'}
                        >
                          <span className="tabular-nums">{userLikedIds.has(game.id) ? '❤️' : '🤍'}</span>
                          <span>{game.total_likes ?? 0}</span>
                        </button>
                        <span>💰 ${(game.total_revenue ?? 0).toLocaleString('es-AR')} ARS</span>
                      </div>
                      <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block">Jugar</Link>
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
          {/* Próximo objetivo — barra de progreso por recaudación */}
          {(() => {
            const formatArs = (n) => Number(n).toLocaleString('es-AR');
            const currentIndex = GOALS_ARS.findIndex((g) => totalRaised < g);
            const currentGoal = currentIndex === -1 ? GOALS_ARS[GOALS_ARS.length - 1] : GOALS_ARS[currentIndex];
            const completedGoals = currentIndex <= 0 ? [] : GOALS_ARS.slice(0, currentIndex);
            const progress = currentGoal ? Math.min(100, (totalRaised / currentGoal) * 100) : 0;
            return (
              <section className="flex-shrink-0 mb-6">
                <h2 className="text-lg font-bold mb-2" style={{ color: text }}>🎯 Próximo objetivo</h2>
                {completedGoals.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-2 text-[11px]" style={{ color: textMuted }}>
                    {completedGoals.map((g) => (
                      <span key={g}>✅ ${formatArs(g)} ARS</span>
                    ))}
                  </div>
                )}
                <div
                  className="rounded-xl p-[2px] min-w-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
                >
                  <div className="rounded-[10px] p-4 min-w-0 h-full" style={{ background: cardBg }}>
                    <p
                      className="text-xl font-black tabular-nums mb-2"
                      style={{ color: accent, fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
                    >
                      ${formatArs(currentGoal)} ARS
                    </p>
                    <p className="text-sm mb-2" style={{ color: textMuted }}>
                      Recaudado: ${formatArs(totalRaised)} ARS de ${formatArs(currentGoal)} ARS
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

          {/* Ranking de Houses — 4 filas compactas */}
          <section className="flex-shrink-0 mb-6">
            <h2 className="text-lg font-bold mb-3" style={{ color: text }}>Ranking de Houses</h2>
            <div className="space-y-2 min-w-0">
              {houseRanking.length === 0
                ? HOUSES.map((h) => (
                    <div key={h.id} className={`${cardBase} p-2.5 flex items-center gap-2`} style={{ ...cardStyle, borderColor: h.id === userHouse ? h.color : border, borderWidth: h.id === userHouse ? 2 : 1 }}>
                      <Image src={h.image} alt={h.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                      <span className="font-bold text-sm truncate min-w-0 flex-1" style={{ color: h.color }}>{h.name}</span>
                      <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: text }}>0</span>
                      <div className="w-12 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: '0%', background: progressBarFill }} />
                      </div>
                    </div>
                  ))
                : (() => {
                    const maxPoints = Math.max(...houseRanking.map((r) => Number(r.total_points) || 0), 1);
                    return houseRanking.map((row) => {
                      const meta = HOUSES.find((h) => h.id === row.house);
                      const pts = Number(row.total_points) || 0;
                      const pct = maxPoints > 0 ? (pts / maxPoints) * 100 : 0;
                      const isUser = row.house === userHouse;
                      return (
                        <div
                          key={row.house}
                          className={`${cardBase} p-2.5 flex items-center gap-2`}
                          style={{ ...cardStyle, borderColor: isUser && meta ? meta.color : border, borderWidth: isUser ? 2 : 1 }}
                        >
                          {meta ? <Image src={meta.image} alt={meta.name} width={28} height={28} className="flex-shrink-0 object-contain" /> : <span className="w-7 h-7 flex-shrink-0" />}
                          <span className="font-bold text-sm truncate min-w-0 flex-1" style={{ color: meta ? meta.color : text }}>{meta ? meta.name : row.house}</span>
                          <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: text }}>{pts}</span>
                          <div className="w-12 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: progressBarFill }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
            </div>
          </section>

          {/* Progreso del Campus — nombre + barra + % */}
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
        </div>
      </div>

      {/* ========== MOBILE: scroll vertical + barra inferior fija ========== */}
      <div className="lg:hidden flex-1 overflow-auto min-h-0" style={{ paddingBottom: '60px' }}>
        {/* Stats — 3 chips full width */}
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
                  return (
                    <div key={game.id} className="flex-shrink-0 rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={{ width: '75vw', ...cardStyle }}>
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <h3 className="font-bold text-sm break-words min-w-0 flex-1" style={{ color: text }}>{game.title || 'Juego'}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(game.id)}
                          disabled={likingGameId === game.id}
                          className="inline-flex items-center gap-0.5 rounded p-0.5 text-[11px] transition-transform duration-150 hover:scale-110 active:scale-[1.2] disabled:opacity-70"
                          style={{ color: textMuted }}
                          aria-label={userLikedIds.has(game.id) ? 'Quitar like' : 'Dar like'}
                        >
                          <span className="tabular-nums">{userLikedIds.has(game.id) ? '❤️' : '🤍'}</span>
                          <span>{game.total_likes ?? 0}</span>
                        </button>
                      </div>
                      <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient mt-3 w-full rounded-xl py-3 font-bold text-white text-sm text-center block">Jugar</Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Banner CTA — mismo texto y botones que desktop */}
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
                <button type="button" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                  Donar
                </button>
              </div>
            </div>
          </section>

          {/* Juegos para desbloquear — scroll horizontal mismo estilo que Juegos del día */}
          <section className="min-w-0">
            <h2 className="text-base font-bold mb-3 w-full" style={{ color: text }}>🎮 Juegos para desbloquear</h2>
            {gamesToUnlock.length === 0 ? (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>No hay más juegos para desbloquear</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                {gamesToUnlock.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  return (
                    <div key={game.id} className="flex-shrink-0 rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={{ width: '75vw', ...cardStyle }}>
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                      <p className="text-xs mt-1 flex-1 break-words min-w-0 line-clamp-2" style={{ color: textMuted }}>{game.description || ''}</p>
                      <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>
                        ${(Number(game.price) || 5000).toLocaleString('es-AR')} ARS
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDesbloquear(game)}
                        disabled={unlockingGameId === game.id}
                        className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block disabled:opacity-70 disabled:pointer-events-none"
                      >
                        {unlockingGameId === game.id ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Redirigiendo...
                          </span>
                        ) : (
                          'Desbloquear'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Mis juegos desbloqueados — vacío o grid 2 cols */}
          <section className="min-w-0">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>Mis juegos desbloqueados</h2>
            {hasUnlockedGames ? (
              <div className="grid grid-cols-2 gap-3 min-w-0">
                {unlockedGames.map((game) => {
                  const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                  return (
                    <div key={game.id} className="rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                      </div>
                      <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                      <div className="flex items-center mt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(game.id)}
                          disabled={likingGameId === game.id}
                          className="inline-flex items-center gap-0.5 rounded p-0.5 text-[11px] transition-transform duration-150 hover:scale-110 active:scale-[1.2] disabled:opacity-70"
                          style={{ color: textMuted }}
                          aria-label={userLikedIds.has(game.id) ? 'Quitar like' : 'Dar like'}
                        >
                          <span className="tabular-nums">{userLikedIds.has(game.id) ? '❤️' : '🤍'}</span>
                          <span>{game.total_likes ?? 0}</span>
                        </button>
                      </div>
                      <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block">Jugar</Link>
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

          {/* Ranking de Houses — acordeón colapsado por defecto */}
          <section id="ranking-houses" className="min-w-0 scroll-mt-24">
            <button
              type="button"
              onClick={() => setRankingOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-xl border p-4 font-bold text-left min-w-0"
              style={{ ...cardStyle, color: text }}
            >
              <span className="truncate">🏆 Ranking de Houses</span>
              <IconChevronDown open={rankingOpen} />
            </button>
            {rankingOpen && (
              <div className="mt-2 space-y-2 min-w-0">
                {(houseRanking.length > 0 ? houseRanking : HOUSES.map((h) => ({ house: h.id, total_points: 0 }))).map((row) => {
                  const meta = HOUSES.find((h) => h.id === row.house);
                  const pts = Number(row.total_points) || 0;
                  const isUser = row.house === userHouse;
                  return (
                    <div
                      key={row.house}
                      className={`${cardBase} p-3 flex items-center gap-3`}
                      style={{ ...cardStyle, borderColor: isUser && meta ? meta.color : border, borderWidth: isUser ? 2 : 1 }}
                    >
                      {meta ? <Image src={meta.image} alt={meta.name} width={32} height={32} className="flex-shrink-0 object-contain" /> : <span className="w-8 h-8 flex-shrink-0" />}
                      <span className="font-bold text-sm truncate min-w-0 flex-1" style={{ color: meta ? meta.color : text }}>{meta ? meta.name : row.house}</span>
                      <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: text }}>{pts} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Progreso del Campus — acordeón colapsado por defecto */}
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

          {/* Perfil — sección mínima para tab inferior */}
          <section id="perfil" className="min-w-0 scroll-mt-24 pb-4">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>👤 Perfil</h2>
            <div className={`${cardBase} p-4 flex items-center gap-3`} style={cardStyle}>
              <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={48} height={48} className="flex-shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</p>
                <p className="text-xs" style={{ color: textMuted }}>Tu House</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Barra inferior fija — solo mobile, 4 tabs */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t h-[60px]"
        style={{ background: cardBg, borderColor: border }}
      >
        {[
          { id: 'juegos-dia', label: 'Juegos', icon: '🎮' },
          { id: 'ranking-houses', label: 'Ranking', icon: '🏆' },
          { id: 'progreso-campus', label: 'Campus', icon: '🏗' },
          { id: 'perfil', label: 'Perfil', icon: '👤' },
        ].map((tab) => {
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setMobileTab(tab.id); scrollToSection(tab.id); }}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-w-0 transition-colors"
              style={{
                color: isActive ? userHouseMeta.color : textMuted,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] truncate w-full">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
