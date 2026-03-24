'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';
import { useUser } from '@/lib/user-context.js';
import { UnlockGameModal } from '@/components/unlock-game-modal.js';

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

export default function JuegosPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, stats, userHouseMeta, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
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
  const [unlockModalGame, setUnlockModalGame] = useState(null);
  const [gameAuthors, setGameAuthors] = useState({});
  const [hoveredGameId, setHoveredGameId] = useState(null);
  const [tappedGameId, setTappedGameId] = useState(null);

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
    if (!userLoading && !profile) router.replace('/login');
  }, [userLoading, profile, router]);

  useEffect(() => {
    if (userLoading || !profile) return;
    let cancelled = false;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const uid = session.user.id;
      const today = new Date().toISOString().split('T')[0];

      const [
        gamesRes,
        sessionsRes,
        likesRes,
        userLikesRes,
        unlocksRes,
        dailyRes,
      ] = await Promise.all([
        supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_sessions').select('game_id, user_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_likes').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
        supabase.from('daily_free_games').select('game_id').eq('active_date', today).then((r) => ({ data: r.data ?? [], error: r.error })).catch(() => ({ data: [], error: true })),
      ]);

      const gamesList = gamesRes.data || [];

      const authorIds = gamesList
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
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [userLoading, profile]);

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

  function openUnlockModal(game) {
    setUnlockModalGame(game);
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

  if (userLoading || loading) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <DashboardNavbar theme={theme} onToggleTheme={toggleTheme} onLogout={() => {}} />
        <div className="flex-1 flex items-center justify-center p-8">
          <p style={{ color: textMuted }}>Cargando juegos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        }}
      />

      <div className="flex-1 min-h-0 overflow-auto px-4 py-6 lg:px-6 pb-[60px] lg:pb-6">
        <header className="mb-6 min-w-0">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-1"
            style={{
              color: text,
              fontFamily: isDark ? "'Burbank Big', sans-serif" : undefined,
              fontWeight: 900,
            }}
          >
            🎮 Todos los juegos
          </h1>
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
            const isExpanded = hoveredGameId === game.id || tappedGameId === game.id;
            const isUnlocked = unlockedIds.has(game.id) || game.unlocked_for_all === true || profile?.has_all_access === true;
            const isFreeToday = dailyIds.has(game.id);
            const canPlay = isUnlocked || isFreeToday;

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
                <div className="h-7 flex items-center mb-1">
                  {isFreeToday ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md leading-none" style={{ background: '#22c55e20', color: '#22c55e' }}>
                      GRATIS HOY
                    </span>
                  ) : isUnlocked ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md leading-none" style={{ background: '#7c3aed20', color: '#7c3aed' }}>
                      DESBLOQUEADO
                    </span>
                  ) : (
                    <span className="text-sm font-black" style={{ color: '#7c3aed' }}>
                      ${formatArs(Number(game.price) || 6000)} ARS
                    </span>
                  )}
                </div>
                <h2 className={`font-bold text-base ${isExpanded ? '' : 'line-clamp-1'} min-w-0`} style={{ color: text }}>{game.title || 'Juego'}</h2>
                {game.show_author !== false && gameAuthors[game.submitted_by] && (
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                    por {gameAuthors[game.submitted_by]?.first_name} {gameAuthors[game.submitted_by]?.last_name}
                  </p>
                )}
                <p className={`text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'} min-w-0 flex-1`} style={{ color: textMuted }}>{game.description || ''}</p>
                <GameMetricsFull
                  game={game}
                  uniquePlayers={game.total_plays}
                  showLikeButton={canPlay}
                  liked={userLikedIds.has(game.id)}
                  onLike={() => handleToggleLike(game.id)}
                />
                <div className="mt-3 flex-shrink-0">
                  {canPlay ? (
                    <Link href={`/jugar/${game.id}`} onClick={(e) => e.stopPropagation()} className="vibe-btn-gradient block w-full rounded-xl py-2.5 font-bold text-white text-sm text-center">
                      {isFreeToday ? 'Jugar gratis' : 'Jugar'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openUnlockModal(game); }}
                      className="vibe-btn-gradient w-full rounded-xl py-2.5 font-bold text-white text-sm"
                    >
                      Desbloquear
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

      <UnlockGameModal
        isOpen={!!unlockModalGame}
        onClose={() => setUnlockModalGame(null)}
        game={unlockModalGame}
        userCredits={profile?.unlock_credits ?? 0}
        hasAllAccess={!!profile?.has_all_access}
        isDark={isDark}
        onUnlockSuccess={(g) => {
          setUnlockedIds((prev) => new Set([...prev, g.id]));
          setUnlockModalGame(null);
        }}
      />

      <MobileBottomNav theme={theme} activeTabId="juegos-dia" />
    </div>
  );
}
