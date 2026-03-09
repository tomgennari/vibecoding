'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

const UserContext = createContext(null);

async function fetchUserData(uid) {
  const [profileRes, unlocksCountRes, sessionsRes, housePointsRes] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, house, user_type, created_at').eq('id', uid).single().then((r) => ({ data: r.data, error: r.error })).catch(() => ({ data: null })),
    supabase.from('game_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', uid).then((r) => ({ count: r.count ?? 0 })).catch(() => ({ count: 0 })),
    supabase.from('game_sessions').select('duration_seconds').eq('user_id', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
    supabase.from('house_points').select('*').then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
  ]);

  const profileData = profileRes.data || null;
  if (!profileData) {
    return { profile: null, stats: { juegos: 0, tiempoSeconds: 0, puntos: 0 }, userHouseMeta: HOUSES[0] };
  }

  const userHouse = profileData.house || 'william_brown';
  const puntos = (housePointsRes.data || []).find((r) => r.house === userHouse)?.total_points ?? 0;
  const stats = {
    juegos: unlocksCountRes.count ?? 0,
    tiempoSeconds: (sessionsRes.data || []).reduce((acc, row) => acc + (Number(row.duration_seconds) || 0), 0),
    puntos,
  };
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];
  return { profile: profileData, stats, userHouseMeta };
}

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
  const [userHouseMeta, setUserHouseMeta] = useState(HOUSES[0]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setProfile(null);
      setStats({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
      setUserHouseMeta(HOUSES[0]);
      setLoading(false);
      return;
    }
    const uid = session.user.id;
    const { profile: p, stats: s, userHouseMeta: h } = await fetchUserData(uid);
    setProfile(p);
    setStats(s);
    setUserHouseMeta(h);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStats = useCallback(() => {
    load();
  }, [load]);

  return (
    <UserContext.Provider
      value={{
        profile,
        stats,
        userHouseMeta,
        loading,
        refreshStats,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
