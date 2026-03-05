'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME } from '../constants.js';

function formatArs(n) {
  return Number(n).toLocaleString('es-AR');
}

export default function AdminMetricsSection() {
  const [loading, setLoading] = useState(true);
  const [totalRaised, setTotalRaised] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [mostPlayed, setMostPlayed] = useState([]);
  const [mostProfitable, setMostProfitable] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [
        profilesRes,
        gamesRes,
        sessionsRes,
        unlocksRes,
        donationsRes,
        unlocksByGameRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('game_sessions').select('id, game_id'),
        supabase.from('game_unlocks').select('amount_paid'),
        supabase.from('donations').select('amount'),
        supabase.from('game_unlocks').select('game_id, amount_paid'),
      ]);

      setTotalUsers(profilesRes.count ?? 0);
      setTotalGames(gamesRes.count ?? 0);
      const sessions = sessionsRes.data || [];
      setTotalSessions(sessions.length);
      const raisedUnlocks = (unlocksRes.data || []).reduce((acc, r) => acc + (Number(r.amount_paid) || 0), 0);
      const raisedDonations = (donationsRes.data || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      setTotalRaised(raisedUnlocks + raisedDonations);

      const playsByGame = {};
      sessions.forEach((s) => {
        if (s.game_id) playsByGame[s.game_id] = (playsByGame[s.game_id] || 0) + 1;
      });
      const playedList = Object.entries(playsByGame).map(([game_id, total_plays]) => ({ game_id, total_plays })).sort((a, b) => b.total_plays - a.total_plays).slice(0, 10);
      setMostPlayed(playedList);

      const revByGame = {};
      (unlocksByGameRes.data || []).forEach((r) => {
        const id = r.game_id;
        if (id) revByGame[id] = (revByGame[id] || 0) + (Number(r.amount_paid) || 0);
      });
      const revList = Object.entries(revByGame).map(([game_id, total_revenue]) => ({ game_id, total_revenue })).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10);
      setMostProfitable(revList);
      setLoading(false);
    }
    load();
  }, []);

  const [gamesMap, setGamesMap] = useState({});
  useEffect(() => {
    const ids = [...new Set([...mostPlayed.map((p) => p.game_id), ...mostProfitable.map((p) => p.game_id)])];
    if (ids.length === 0) return;
    supabase.from('games').select('id, title').in('id', ids).then(({ data }) => {
      const map = (data || []).reduce((acc, g) => { acc[g.id] = g.title; return acc; }, {});
      setGamesMap(map);
    });
  }, [mostPlayed, mostProfitable]);

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando métricas...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total recaudado', value: `$${formatArs(totalRaised)} ARS` },
    { label: 'Total usuarios', value: totalUsers },
    { label: 'Total juegos', value: totalGames },
    { label: 'Total sesiones', value: totalSessions },
  ];

  return (
    <div className="p-6 min-w-0">
      <h2 className="text-xl font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Métricas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-6 min-w-0" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
            <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>{c.label}</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border overflow-hidden min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
          <h3 className="px-4 py-3 font-bold text-sm" style={{ background: ADMIN_THEME.bg, color: ADMIN_THEME.text }}>Juegos más jugados</h3>
          <table className="w-full text-sm">
            <tbody>
              {mostPlayed.length === 0 ? (
                <tr><td className="px-4 py-4" style={{ color: ADMIN_THEME.textMuted }}>Sin datos</td></tr>
              ) : (
                mostPlayed.map((row, i) => (
                  <tr key={row.game_id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                    <td className="px-4 py-2 truncate" style={{ color: ADMIN_THEME.text }}>{gamesMap[row.game_id] || row.game_id}</td>
                    <td className="px-4 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>{row.total_plays}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border overflow-hidden min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
          <h3 className="px-4 py-3 font-bold text-sm" style={{ background: ADMIN_THEME.bg, color: ADMIN_THEME.text }}>Juegos más rentables</h3>
          <table className="w-full text-sm">
            <tbody>
              {mostProfitable.length === 0 ? (
                <tr><td className="px-4 py-4" style={{ color: ADMIN_THEME.textMuted }}>Sin datos</td></tr>
              ) : (
                mostProfitable.map((row, i) => (
                  <tr key={row.game_id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                    <td className="px-4 py-2 truncate" style={{ color: ADMIN_THEME.text }}>{gamesMap[row.game_id] || row.game_id}</td>
                    <td className="px-4 py-2 font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>${formatArs(row.total_revenue)} ARS</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
