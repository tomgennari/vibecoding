'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const MAX_DAILY = 4;

function formatArs(n) {
  return Number(n).toLocaleString('es-AR');
}

export default function AdminDailyGamesSection() {
  const [dailyGames, setDailyGames] = useState([]);
  const [approvedGamesWithMetrics, setApprovedGamesWithMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetch = useCallback(async () => {
    setLoading(true);
    const [dailyRes, gamesRes, sessionsRes, likesRes, unlocksRes, everDailyRes] = await Promise.all([
      supabase.from('daily_free_games').select('id, game_id').eq('active_date', today),
      supabase.from('games').select('id, title, house').eq('status', 'approved'),
      supabase.from('game_sessions').select('game_id, user_id'),
      supabase.from('game_likes').select('game_id'),
      supabase.from('game_unlocks').select('game_id, amount_paid'),
      supabase.from('daily_free_games').select('game_id'),
    ]);
    const daily = dailyRes.data || [];
    const todayGameIds = new Set(daily.map((d) => d.game_id));
    const gamesList = gamesRes.data || [];
    const everDailyIds = new Set((everDailyRes.data || []).map((r) => r.game_id));

    const playsByGame = {};
    (sessionsRes.data || []).forEach((s) => {
      if (s.game_id) playsByGame[s.game_id] = (playsByGame[s.game_id] || 0) + 1;
    });
    const likesByGame = {};
    (likesRes.data || []).forEach((r) => {
      if (r.game_id) likesByGame[r.game_id] = (likesByGame[r.game_id] || 0) + 1;
    });
    const revenueByGame = {};
    (unlocksRes.data || []).forEach((r) => {
      if (r.game_id) revenueByGame[r.game_id] = (revenueByGame[r.game_id] || 0) + (Number(r.amount_paid) || 0);
    });

    let dailyWithGame = [];
    if (daily.length > 0) {
      const { data: full } = await supabase.from('games').select('id, title, house').in('id', [...todayGameIds]);
      const map = (full || []).reduce((acc, g) => { acc[g.id] = g; return acc; }, {});
      dailyWithGame = daily.map((d) => ({ ...d, game: map[d.game_id] })).filter((d) => d.game);
    }
    setDailyGames(dailyWithGame);

    const withMetrics = gamesList
      .filter((g) => !todayGameIds.has(g.id))
      .map((g) => ({
        ...g,
        total_plays: playsByGame[g.id] || 0,
        total_likes: likesByGame[g.id] || 0,
        total_revenue: revenueByGame[g.id] || 0,
        used_before: everDailyIds.has(g.id),
      }))
      .sort((a, b) => (b.total_plays || 0) - (a.total_plays || 0));
    setApprovedGamesWithMetrics(withMetrics);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function addGame(gameId) {
    if (dailyGames.length >= MAX_DAILY) return;
    const { error } = await supabase.from('daily_free_games').insert({ game_id: gameId, active_date: today });
    if (!error) {
      setPickerOpen(false);
      fetch();
    }
  }

  async function removeGame(dailyId) {
    const { error } = await supabase.from('daily_free_games').delete().eq('id', dailyId);
    if (!error) fetch();
  }

  return (
    <div className="p-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Juegos del día</h2>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={dailyGames.length >= MAX_DAILY}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ background: ADMIN_THEME.accent }}
        >
          Agregar juego del día
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: ADMIN_THEME.textMuted }}>Máximo 4 juegos. Fecha: {today}</p>

      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : dailyGames.length === 0 ? (
        <p className="py-4 rounded-xl border text-center" style={{ color: ADMIN_THEME.textMuted, borderColor: ADMIN_THEME.border }}>Hoy no hay juegos gratuitos.</p>
      ) : (
        <ul className="space-y-2">
          {dailyGames.map((d) => {
            const house = HOUSES.find((h) => h.id === d.game?.house);
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 min-w-0"
                style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {house && <Image src={house.image} alt="" width={24} height={24} className="object-contain flex-shrink-0" />}
                  <span className="truncate" style={{ color: ADMIN_THEME.text }}>{d.game?.title || d.game_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeGame(d.id)}
                  className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                  style={{ color: '#ef4444', border: '1px solid #ef4444' }}
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl border-2 p-6 shadow-xl" style={{ background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Elegir juego aprobado</h3>
            <p className="text-xs mb-3" style={{ color: ADMIN_THEME.textMuted }}>Ordenado por jugadas (total_plays) descendente.</p>
            {approvedGamesWithMetrics.length === 0 ? (
              <p style={{ color: ADMIN_THEME.textMuted }}>No hay más juegos aprobados para agregar.</p>
            ) : (
              <div className="rounded-xl border overflow-hidden min-w-0 max-h-[70vh] overflow-y-auto" style={{ borderColor: ADMIN_THEME.border }}>
                <table className="w-full text-sm">
                  <thead style={{ background: ADMIN_THEME.bg }}>
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Título</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>House</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Jugadas</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Likes</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Recaudado</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: ADMIN_THEME.textMuted }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedGamesWithMetrics.map((g, i) => {
                      const h = HOUSES.find((x) => x.id === g.house);
                      return (
                        <tr key={g.id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                          <td className="px-3 py-2 min-w-0">
                            <span className="truncate block max-w-[180px]" style={{ color: ADMIN_THEME.text }}>{g.title}</span>
                            {g.used_before && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: ADMIN_THEME.border, color: ADMIN_THEME.textMuted }}>Ya usado</span>}
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
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.text }}>{g.total_plays}</td>
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.text }}>{g.total_likes}</td>
                          <td className="px-3 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>${formatArs(g.total_revenue)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => addGame(g.id)} className="px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0" style={{ background: ADMIN_THEME.accent }}>Agregar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" onClick={() => setPickerOpen(false)} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ color: ADMIN_THEME.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
