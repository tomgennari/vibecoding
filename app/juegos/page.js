'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

const SORT_OPTIONS = [
  { id: 'newest', label: 'Más nuevos' },
  { id: 'plays', label: 'Más jugados' },
  { id: 'likes', label: 'Más likes' },
  { id: 'revenue', label: 'Más recaudado' },
];

export default function JuegosPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
  const [games, setGames] = useState([]);
  const [gamesWithMetrics, setGamesWithMetrics] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [dailyIds, setDailyIds] = useState(new Set());
  const [userLikedIds, setUserLikedIds] = useState(new Set());
  const [likingGameId, setLikingGameId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [houseFilter, setHouseFilter] = useState('');
  const [housesDropdownOpen, setHousesDropdownOpen] = useState(false);
  const housesDropdownRefDesktop = useRef(null);
  const housesDropdownRefMobile = useRef(null);
  const [unlockingGameId, setUnlockingGameId] = useState(null);

  useEffect(() => {
    function handleClickOutside(e) {
      const insideDesktop = housesDropdownRefDesktop.current?.contains(e.target);
      const insideMobile = housesDropdownRefMobile.current?.contains(e.target);
      if (!insideDesktop && !insideMobile) setHousesDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };

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
        gamesRes,
        sessionsRes,
        likesRes,
        userLikesRes,
        unlocksRes,
        dailyRes,
        unlocksCountRes,
        sessionsUserRes,
        housePointsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, house').eq('id', uid).single().then((r) => ({ data: r.data, error: r.error })).catch(() => ({ data: null, error: true })),
        supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_sessions').select('game_id, user_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('daily_free_games').select('game_id').eq('active_date', today).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', uid).then((r) => ({ count: r.count ?? 0, error: r.error })).catch(() => ({ count: 0, error: true })),
        supabase.from('game_sessions').select('duration_seconds').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('house_points').select('*').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
      ]);

      const profileData = profileRes.data || { first_name: 'Usuario', last_name: '', house: 'william_brown' };
      setProfile(profileData);
      const userHouse = profileData.house || 'william_brown';

      setStats({
        juegos: unlocksCountRes.count ?? 0,
        tiempoSeconds: (sessionsUserRes.data || []).reduce((acc, row) => acc + (Number(row.duration_seconds) || 0), 0),
        puntos: (housePointsRes.data || []).find((row) => row.house === userHouse)?.total_points ?? 0,
      });

      const gamesList = gamesRes.data || [];
      const uniquePlayersByGame = {};
      (sessionsRes.data || []).forEach((s) => {
        if (s.game_id) {
          if (!uniquePlayersByGame[s.game_id]) uniquePlayersByGame[s.game_id] = new Set();
          uniquePlayersByGame[s.game_id].add(s.user_id);
        }
      });
      const likesByGame = {};
      (likesRes.data || []).forEach((r) => {
        if (r.game_id) likesByGame[r.game_id] = (likesByGame[r.game_id] || 0) + 1;
      });

      const withMetrics = gamesList.map((g) => ({
        ...g,
        total_plays: uniquePlayersByGame[g.id]?.size || 0,
        total_likes: likesByGame[g.id] || 0,
        total_revenue: Number(g.total_revenue) || 0,
      }));

      setGames(withMetrics);
      setGamesWithMetrics(withMetrics);
      setUnlockedIds(new Set((unlocksRes.data || []).map((r) => r.game_id).filter(Boolean)));
      setDailyIds(new Set((dailyRes.data || []).map((r) => r.game_id).filter(Boolean)));
      setUserLikedIds(new Set((userLikesRes.data || []).map((r) => r.game_id).filter(Boolean)));
      setLoading(false);
    }
    init();
  }, [router]);

  const filteredAndSortedGames = useMemo(() => {
    let list = gamesWithMetrics;
    if (houseFilter) {
      list = list.filter((g) => g.house === houseFilter);
    }
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          (g.title || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'plays') {
      sorted.sort((a, b) => (b.total_plays || 0) - (a.total_plays || 0));
    } else if (sortBy === 'likes') {
      sorted.sort((a, b) => (b.total_likes || 0) - (a.total_likes || 0));
    } else if (sortBy === 'revenue') {
      sorted.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    }
    return sorted;
  }, [gamesWithMetrics, searchQuery, sortBy, houseFilter]);

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

  function formatArs(n) {
    return Number(n).toLocaleString('es-AR');
  }

  async function handleToggleLike(gameId) {
    if (likingGameId) return;
    const session = (await supabase.auth.getSession()).data?.session;
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
    setGamesWithMetrics((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, total_likes: Math.max(0, (g.total_likes ?? 0) + delta) } : g))
    );
    try {
      const res = liked
        ? await fetch(`/api/likes?gameId=${encodeURIComponent(gameId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
        : await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ gameId }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.total_likes === 'number') {
        setGamesWithMetrics((prev) => prev.map((g) => (g.id === gameId ? { ...g, total_likes: data.total_likes } : g)));
      }
    } catch (_) {
      setUserLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(gameId);
        else next.delete(gameId);
        return next;
      });
      setGamesWithMetrics((prev) =>
        prev.map((g) => (g.id === gameId ? { ...g, total_likes: Math.max(0, (g.total_likes ?? 0) - delta) } : g))
      );
    } finally {
      setLikingGameId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <DashboardNavbar profile={profile} stats={stats} theme={theme} onToggleTheme={toggleTheme} onLogout={() => {}} />
        <div className="flex-1 flex items-center justify-center p-8">
          <p style={{ color: textMuted }}>Cargando juegos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        profile={profile}
        stats={stats}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        }}
      />

      <div className="flex-1 min-h-0 overflow-auto px-4 py-6 lg:px-6">
        <header className="mb-6 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight"
              style={{
                color: text,
                fontFamily: isDark ? "'Burbank Big', sans-serif" : undefined,
                fontWeight: 900,
              }}
            >
              🎮 Todos los juegos
            </h1>
            <Link
              href="/juegos/subir"
              className="vibe-btn-gradient-highlight rounded-xl px-4 py-2 font-bold text-sm text-white whitespace-nowrap"
            >
              🕹️ Subir mi juego
            </Link>
          </div>
          <p className="text-sm lg:text-base mb-4" style={{ color: textMuted }}>
            {filteredAndSortedGames.length} juego{filteredAndSortedGames.length !== 1 ? 's' : ''} disponible{filteredAndSortedGames.length !== 1 ? 's' : ''}
          </p>

          {/* Desktop: una línea — buscador (ancho limitado) | dropdown Houses | orden */}
          <div className="hidden sm:flex flex-1 items-center gap-3 mb-4 min-w-0">
            <input
              type="search"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs min-w-0 rounded-xl px-4 py-2.5 text-sm border transition-all outline-none focus:ring-2"
              style={
                isDark
                  ? { background: '#13131a', borderColor: border, color: text }
                  : { background: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }
              }
            />
            <div className="relative flex-shrink-0" ref={housesDropdownRefDesktop}>
              <button
                type="button"
                onClick={() => setHousesDropdownOpen((o) => !o)}
                className="rounded-xl px-3 py-2.5 text-sm font-bold border flex items-center gap-2 min-w-0"
                style={{
                  borderColor: border,
                  background: houseFilter ? (HOUSES.find((h) => h.id === houseFilter)?.color || cardBg) : cardBg,
                  color: houseFilter ? '#fff' : textMuted,
                }}
              >
                {houseFilter ? (
                  <>
                    <Image src={HOUSES.find((h) => h.id === houseFilter)?.image || HOUSES[0].image} alt="" width={20} height={20} className="object-contain flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{HOUSES.find((h) => h.id === houseFilter)?.name || ''}</span>
                  </>
                ) : (
                  <>🛡 Houses</>
                )}
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${housesDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {housesDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 z-20 rounded-xl border py-1 min-w-[180px] shadow-lg"
                  style={{ background: cardBg, borderColor: border }}
                >
                  <button
                    type="button"
                    onClick={() => { setHouseFilter(''); setHousesDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors hover:opacity-90 flex items-center gap-2"
                    style={{ color: text }}
                  >
                    Todas
                  </button>
                  {HOUSES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => { setHouseFilter(h.id); setHousesDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors hover:opacity-90 flex items-center gap-2"
                      style={{ color: houseFilter === h.id ? h.color : text }}
                    >
                      <Image src={h.image} alt={h.name} width={20} height={20} className="object-contain flex-shrink-0" />
                      <span className="truncate">{h.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className="rounded-xl px-3 py-2.5 text-sm font-bold transition-colors whitespace-nowrap"
                  style={
                    sortBy === opt.id
                      ? { background: accent, color: '#fff' }
                      : { background: 'transparent', border: `1px solid ${border}`, color: textMuted }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: buscador full width; segunda línea = dropdown Houses (sin overflow que recorte) + orden en scroll */}
          <div className="sm:hidden flex flex-col gap-3 mb-4 min-w-0">
            <input
              type="search"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 rounded-xl px-4 py-3 text-sm border transition-all outline-none focus:ring-2"
              style={
                isDark
                  ? { background: '#13131a', borderColor: border, color: text }
                  : { background: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }
              }
            />
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0" ref={housesDropdownRefMobile}>
                <button
                  type="button"
                  onClick={() => setHousesDropdownOpen((o) => !o)}
                  className="rounded-xl px-3 py-2.5 text-sm font-bold border flex items-center gap-2"
                  style={{
                    borderColor: border,
                    background: houseFilter ? (HOUSES.find((h) => h.id === houseFilter)?.color || cardBg) : cardBg,
                    color: houseFilter ? '#fff' : textMuted,
                  }}
                >
                  {houseFilter ? (
                    <>
                      <Image src={HOUSES.find((h) => h.id === houseFilter)?.image || HOUSES[0].image} alt="" width={20} height={20} className="object-contain flex-shrink-0" />
                      <span className="truncate max-w-[100px]">{HOUSES.find((h) => h.id === houseFilter)?.name || ''}</span>
                    </>
                  ) : (
                    <>🛡 Houses</>
                  )}
                  <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${housesDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {housesDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 z-50 rounded-xl border py-1 min-w-[180px] shadow-lg"
                    style={{ background: cardBg, borderColor: border }}
                  >
                    <button
                      type="button"
                      onClick={() => { setHouseFilter(''); setHousesDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm font-bold rounded-lg flex items-center gap-2"
                      style={{ color: text }}
                    >
                      Todas
                    </button>
                    {HOUSES.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => { setHouseFilter(h.id); setHousesDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm font-bold rounded-lg flex items-center gap-2"
                        style={{ color: houseFilter === h.id ? h.color : text }}
                      >
                        <Image src={h.image} alt={h.name} width={20} height={20} className="object-contain flex-shrink-0" />
                        <span className="truncate">{h.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className="flex-shrink-0 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors whitespace-nowrap"
                  style={
                    sortBy === opt.id
                      ? { background: accent, color: '#fff' }
                      : { background: 'transparent', border: `1px solid ${border}`, color: textMuted }
                  }
                >
                  {opt.label}
                </button>
              ))}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-0">
          {filteredAndSortedGames.map((game) => {
            const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
            const isUnlocked = unlockedIds.has(game.id);
            const isFreeToday = dailyIds.has(game.id);
            const canPlay = isUnlocked || isFreeToday;

            return (
              <div key={game.id} className={`${cardBase} p-4 flex flex-col`} style={cardStyle}>
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <Image src={house.image} alt={house.name} width={32} height={32} className="flex-shrink-0 object-contain" />
                  <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2 min-w-0">
                  {isFreeToday && (
                    <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: '#22c55e', color: '#fff' }}>
                      GRATIS HOY
                    </span>
                  )}
                  {isUnlocked && !isFreeToday && (
                    <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: accent, color: '#fff' }}>
                      DESBLOQUEADO
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-base break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h2>
                <p className="text-xs mt-1 line-clamp-2 break-words min-w-0 flex-1" style={{ color: textMuted }}>{game.description || ''}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-[11px] min-w-0 items-center" style={{ color: textMuted }}>
                  <span>👥 {game.total_plays ?? 0} jugadores</span>
                  {canPlay ? (
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
                  ) : (
                    <span>❤️ {game.total_likes ?? 0} likes</span>
                  )}
                  <span>💰 ${(game.total_revenue ?? 0).toLocaleString('es-AR')} ARS</span>
                </div>
                {!canPlay && (
                  <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>
                    ${formatArs(Number(game.price) || 5000)} ARS
                  </p>
                )}
                <div className="mt-3 flex-shrink-0">
                  {canPlay ? (
                    <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient block w-full rounded-xl py-2.5 font-bold text-white text-sm text-center">
                      {isFreeToday ? 'Jugar gratis' : 'Jugar'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDesbloquear(game)}
                      disabled={unlockingGameId === game.id}
                      className="vibe-btn-gradient w-full rounded-xl py-2.5 font-bold text-white text-sm disabled:opacity-70 disabled:pointer-events-none"
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
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredAndSortedGames.length === 0 && (
          <p className="text-center py-12 rounded-xl border min-w-0" style={{ color: textMuted, ...cardStyle }}>
            {searchQuery.trim() ? 'No hay juegos que coincidan con la búsqueda.' : 'No hay juegos disponibles.'}
          </p>
        )}
      </div>
    </div>
  );
}
