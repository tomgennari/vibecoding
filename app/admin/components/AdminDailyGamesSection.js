'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/client.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const PAGE_SIZE = 20;
const MAX_SCHEDULED = 3;

function formatArs(n) {
  return Number(n).toLocaleString('es-AR');
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function AdminDailyGamesSection() {
  const [dailyGames, setDailyGames] = useState([]);
  const [allGamesWithMetrics, setAllGamesWithMetrics] = useState([]);
  const [scheduledTomorrow, setScheduledTomorrow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('title');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [actioning, setActioning] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = getTomorrow();

  const fetch = useCallback(async () => {
    setLoading(true);
    const [
      dailyRes,
      gamesRes,
      sessionsRes,
      likesRes,
      unlocksRes,
      allDailyRes,
      scheduledRes,
    ] = await Promise.all([
      supabase.from('daily_free_games').select('id, game_id').eq('active_date', today),
      supabase.from('games').select('id, title, house, total_revenue').eq('status', 'approved'),
      supabase.from('game_sessions').select('game_id, user_id'),
      supabase.from('game_likes').select('game_id'),
      supabase.from('game_unlocks').select('game_id, amount_paid'),
      supabase.from('daily_free_games').select('game_id, active_date'),
      supabase.from('daily_free_games').select('id, game_id').eq('scheduled_for', tomorrow),
    ]);
    const daily = dailyRes.data || [];
    const todayGameIds = new Set(daily.map((d) => d.game_id));
    const gamesList = gamesRes.data || [];
    const allDaily = allDailyRes.data || [];
    const scheduled = scheduledRes.data || [];

    const uniqueByGame = {};
    (sessionsRes.data || []).forEach((s) => {
      if (!s.game_id) return;
      if (!uniqueByGame[s.game_id]) uniqueByGame[s.game_id] = new Set();
      uniqueByGame[s.game_id].add(s.user_id);
    });
    const uniquePlayersByGame = {};
    Object.keys(uniqueByGame).forEach((gid) => { uniquePlayersByGame[gid] = uniqueByGame[gid].size; });
    const likesByGame = {};
    (likesRes.data || []).forEach((r) => {
      if (r.game_id) likesByGame[r.game_id] = (likesByGame[r.game_id] || 0) + 1;
    });
    const revenueByGame = {};
    (unlocksRes.data || []).forEach((r) => {
      if (r.game_id) revenueByGame[r.game_id] = (revenueByGame[r.game_id] || 0) + (Number(r.amount_paid) || 0);
    });
    const lastUsedByGame = {};
    allDaily.forEach((r) => {
      if (!r.game_id || !r.active_date) return;
      const prev = lastUsedByGame[r.game_id];
      if (!prev || r.active_date > prev) lastUsedByGame[r.game_id] = r.active_date;
    });
    const everUsedGameIds = new Set(Object.keys(lastUsedByGame));
    const scheduledGameIds = new Set(scheduled.map((r) => r.game_id));

    let dailyWithGame = [];
    if (daily.length > 0) {
      const { data: full } = await supabase.from('games').select('id, title, house').in('id', [...todayGameIds]);
      const map = (full || []).reduce((acc, g) => { acc[g.id] = g; return acc; }, {});
      dailyWithGame = daily.map((d) => ({ ...d, game: map[d.game_id] })).filter((d) => d.game);
    }
    setDailyGames(dailyWithGame);

    const withMetrics = gamesList.map((g) => ({
      ...g,
      unique_players: uniquePlayersByGame[g.id] || 0,
      total_likes: likesByGame[g.id] || 0,
      total_revenue: Number(g.total_revenue) ?? revenueByGame[g.id] ?? 0,
      used_before: everUsedGameIds.has(g.id),
      last_used_date: lastUsedByGame[g.id] || null,
      scheduled_for_tomorrow: scheduledGameIds.has(g.id),
    }));
    setAllGamesWithMetrics(withMetrics);

    const scheduledWithGame = scheduled.map((s) => {
      const g = gamesList.find((x) => x.id === s.game_id);
      return { ...s, game: g };
    }).filter((s) => s.game);
    setScheduledTomorrow(scheduledWithGame);
    setLoading(false);
  }, [today, tomorrow]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = useMemo(() => {
    let list = allGamesWithMetrics;
    if (filter === 'never_used') list = list.filter((g) => !g.used_before);
    if (filter === 'used') list = list.filter((g) => g.used_before);
    return list;
  }, [allGamesWithMetrics, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const mul = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'title') {
        va = (va || '').toLowerCase();
        vb = (vb || '').toLowerCase();
        return mul * (va < vb ? -1 : va > vb ? 1 : 0);
      }
      if (sortKey === 'house') {
        va = (va || '').toLowerCase();
        vb = (vb || '').toLowerCase();
        return mul * (va < vb ? -1 : va > vb ? 1 : 0);
      }
      va = Number(va) || 0;
      vb = Number(vb) || 0;
      return mul * (va - vb);
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  function handleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  async function scheduleForTomorrow(gameId) {
    setActioning(gameId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/admin/daily-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) await fetch();
    } finally {
      setActioning(null);
    }
  }

  async function unscheduleTomorrow(gameId) {
    setActioning(gameId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/admin/daily-games?gameId=${encodeURIComponent(gameId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) await fetch();
    } finally {
      setActioning(null);
    }
  }

  function Th({ label, sortKeyName, className = '' }) {
    const isActive = sortKey === sortKeyName;
    return (
      <th className={`text-left px-3 py-2 font-semibold cursor-pointer select-none ${className}`} style={{ color: ADMIN_THEME.textMuted }} onClick={() => sortKeyName && handleSort(sortKeyName)}>
        {label}
        {sortKeyName && <span className="ml-1 opacity-70">{isActive ? (sortAsc ? '↑' : '↓') : '↕'}</span>}
      </th>
    );
  }

  return (
    <div className="p-6 min-w-0">
      <h2 className="text-xl font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Juegos del día</h2>
      <p className="text-sm mb-4" style={{ color: ADMIN_THEME.textMuted }}>Hoy: {today}. Los juegos programados para mañana se activan a las 00:00.</p>

      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : (
        <>
          <section className="mb-6">
            <h3 className="text-lg font-bold mb-2" style={{ color: ADMIN_THEME.text }}>Hoy activos</h3>
            {dailyGames.length === 0 ? (
              <p className="py-4 rounded-xl border text-center text-sm" style={{ color: ADMIN_THEME.textMuted, borderColor: ADMIN_THEME.border }}>Hoy no hay juegos gratuitos.</p>
            ) : (
              <ul className="space-y-2">
                {dailyGames.map((d) => {
                  const house = HOUSES.find((h) => h.id === d.game?.house);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 min-w-0" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {house && <Image src={house.image} alt="" width={24} height={24} className="object-contain flex-shrink-0" />}
                        <span className="truncate" style={{ color: ADMIN_THEME.text }}>{d.game?.title || d.game_id}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-bold mb-2" style={{ color: ADMIN_THEME.text }}>Juegos del día de mañana</h3>
            {scheduledTomorrow.length === 0 ? (
              <p className="py-3 rounded-xl border text-center text-sm" style={{ color: ADMIN_THEME.textMuted, borderColor: ADMIN_THEME.border }}>Ninguno programado. Se elegirán automáticamente a las 00:00.</p>
            ) : (
              <ul className="space-y-2 mb-2">
                {scheduledTomorrow.map((s) => {
                  const house = HOUSES.find((h) => h.id === s.game?.house);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 min-w-0" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {house && <Image src={house.image} alt="" width={24} height={24} className="object-contain flex-shrink-0" />}
                        <span className="truncate" style={{ color: ADMIN_THEME.text }}>{s.game?.title || s.game_id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => unscheduleTomorrow(s.game_id)}
                        disabled={actioning === s.game_id}
                        className="px-2 py-1 rounded text-xs font-medium flex-shrink-0 disabled:opacity-50"
                        style={{ color: '#ef4444', border: '1px solid #ef4444' }}
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {scheduledTomorrow.length > 0 && scheduledTomorrow.length < MAX_SCHEDULED && (
              <p className="text-xs" style={{ color: ADMIN_THEME.textMuted }}>Los juegos faltantes se elegirán automáticamente a las 00:00.</p>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="text-sm font-semibold" style={{ color: ADMIN_THEME.text }}>Filtros:</span>
              {['all', 'never_used', 'used'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setFilter(key); setPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    background: filter === key ? ADMIN_THEME.accent : 'transparent',
                    color: filter === key ? '#fff' : ADMIN_THEME.textMuted,
                    border: `1px solid ${filter === key ? ADMIN_THEME.accent : ADMIN_THEME.border}`,
                  }}
                >
                  {key === 'all' ? 'Todos' : key === 'never_used' ? 'No usados' : 'Ya usados como gratis'}
                </button>
              ))}
            </div>
            <div className="rounded-xl border overflow-hidden min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: ADMIN_THEME.bg }}>
                    <tr>
                      <Th label="Título" sortKeyName="title" />
                      <Th label="House" sortKeyName="house" />
                      <Th label="👥 Jugadores únicos" sortKeyName="unique_players" />
                      <Th label="❤️ Likes" sortKeyName="total_likes" />
                      <Th label="💰 Recaudado" sortKeyName="total_revenue" />
                      <Th label="📅 Usado como gratis" sortKeyName="last_used_date" />
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((g, i) => {
                      const h = HOUSES.find((x) => x.id === g.house);
                      return (
                        <tr key={g.id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                          <td className="px-3 py-2 min-w-0">
                            <span className="truncate block max-w-[180px]" style={{ color: ADMIN_THEME.text }}>{g.title}</span>
                          </td>
                          <td className="px-3 py-2">
                            {h ? (
                              <span className="flex items-center gap-1.5">
                                <Image src={h.image} alt="" width={20} height={20} className="object-contain flex-shrink-0" />
                                <span style={{ color: h.color }}>{h.name}</span>
                              </span>
                            ) : (
                              <span style={{ color: ADMIN_THEME.textMuted }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.text }}>{g.unique_players}</td>
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.text }}>{g.total_likes}</td>
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>${formatArs(g.total_revenue)}</td>
                          <td className="px-3 py-2" style={{ color: ADMIN_THEME.textMuted }}>{g.last_used_date ? g.last_used_date : 'Nunca'}</td>
                          <td className="px-3 py-2">
                            {g.scheduled_for_tomorrow ? (
                              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: ADMIN_THEME.border, color: ADMIN_THEME.textMuted }}>✓ Programado</span>
                            ) : scheduledTomorrow.length >= MAX_SCHEDULED ? (
                              <span className="text-xs" style={{ color: ADMIN_THEME.textMuted }}>—</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => scheduleForTomorrow(g.id)}
                                disabled={actioning === g.id}
                                className="px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0 disabled:opacity-50"
                                style={{ background: ADMIN_THEME.accent }}
                              >
                                Programar para mañana
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <span className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  style={{ border: `1px solid ${ADMIN_THEME.border}`, color: ADMIN_THEME.text }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  style={{ border: `1px solid ${ADMIN_THEME.border}`, color: ADMIN_THEME.text }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
