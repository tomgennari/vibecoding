'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const MAX_DAILY = 3;

export default function AdminDailyGamesSection() {
  const [dailyGames, setDailyGames] = useState([]);
  const [approvedGames, setApprovedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetch = useCallback(async () => {
    setLoading(true);
    const [dailyRes, gamesRes] = await Promise.all([
      supabase.from('daily_free_games').select('id, game_id').eq('active_date', today),
      supabase.from('games').select('id, title, house').eq('status', 'approved'),
    ]);
    const daily = dailyRes.data || [];
    const gameIds = daily.map((d) => d.game_id);
    const gamesList = gamesRes.data || [];
    let dailyWithGame = [];
    if (gameIds.length > 0) {
      const { data: full } = await supabase.from('games').select('id, title, house').in('id', gameIds);
      const map = (full || []).reduce((acc, g) => { acc[g.id] = g; return acc; }, {});
      dailyWithGame = daily.map((d) => ({ ...d, game: map[d.game_id] })).filter((d) => d.game);
    }
    setDailyGames(dailyWithGame);
    const alreadyIds = new Set(gameIds);
    setApprovedGames(gamesList.filter((g) => !alreadyIds.has(g.id)));
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
      <p className="text-sm mb-4" style={{ color: ADMIN_THEME.textMuted }}>Máximo 3 juegos. Fecha: {today}</p>

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
          <div className="w-full max-w-md rounded-xl border-2 p-6 shadow-xl" style={{ background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Elegir juego aprobado</h3>
            {approvedGames.length === 0 ? (
              <p style={{ color: ADMIN_THEME.textMuted }}>No hay más juegos aprobados para agregar.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {approvedGames.map((g) => {
                  const h = HOUSES.find((x) => x.id === g.house);
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: ADMIN_THEME.border }}>
                      <span className="truncate" style={{ color: ADMIN_THEME.text }}>{g.title}</span>
                      <button type="button" onClick={() => addGame(g.id)} className="px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0" style={{ background: ADMIN_THEME.accent }}>Agregar</button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={() => setPickerOpen(false)} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ color: ADMIN_THEME.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
