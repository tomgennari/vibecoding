'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

const TABS = [
  { id: 'datos', label: 'Mis datos' },
  { id: 'password', label: 'Cambiar contraseña' },
  { id: 'juegos', label: 'Juegos desbloqueados' },
  { id: 'subidos', label: 'Mis juegos subidos' },
];

function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return '0 h';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} h${minutes > 0 ? ` ${minutes} min` : ''}`;
  return `${minutes} min`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function IconLogout() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
  const [unlockedGames, setUnlockedGames] = useState([]);
  const [mySubmittedGames, setMySubmittedGames] = useState([]);
  const [activeTab, setActiveTab] = useState('datos');

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editHouse, setEditHouse] = useState('william_brown');
  const [datosMessage, setDatosMessage] = useState({ type: '', text: '' });
  const [datosSaving, setDatosSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };
  const navStyle = isDark ? { color: textMuted } : { color: '#64748b' };

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const uid = session.user.id;
    setEmail(session.user?.email || '');

    const [profileRes, unlocksCountRes, sessionsRes, unlocksListRes, approvedRes, housePointsRes, submittedRes] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, house, user_type, created_at').eq('id', uid).single().then((r) => ({ data: r.data, error: r.error })).catch(() => ({ data: null })),
      supabase.from('game_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', uid).then((r) => ({ count: r.count ?? 0 })).catch(() => ({ count: 0 })),
      supabase.from('game_sessions').select('duration_seconds').eq('user_id', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('house_points').select('*').then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('games').select('*').eq('submitted_by', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
    ]);

    const profileData = profileRes.data || { first_name: 'Usuario', last_name: '', house: 'william_brown', user_type: 'alumno', created_at: null };
    setProfile(profileData);
    setEditFirstName(profileData.first_name ?? '');
    setEditLastName(profileData.last_name ?? '');
    setEditHouse(profileData.house ?? 'william_brown');

    const userHouse = profileData.house || 'william_brown';
    const puntos = (housePointsRes.data || []).find((r) => r.house === userHouse)?.total_points ?? 0;
    setStats({
      juegos: unlocksCountRes.count ?? 0,
      tiempoSeconds: (sessionsRes.data || []).reduce((acc, row) => acc + (Number(row.duration_seconds) || 0), 0),
      puntos,
    });

    const unlockedIds = (unlocksListRes.data || []).map((r) => r.game_id).filter(Boolean);
    const approved = approvedRes.data || [];
    setUnlockedGames(approved.filter((g) => g.id && unlockedIds.includes(g.id)));
    setMySubmittedGames(submittedRes.data || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function handleSaveDatos(e) {
    e.preventDefault();
    setDatosMessage({ type: '', text: '' });
    setDatosSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDatosSaving(false);
      return;
    }
    const { error } = await supabase.from('profiles').update({
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      house: editHouse,
    }).eq('id', session.user.id);
    if (error) {
      setDatosMessage({ type: 'error', text: 'No se pudieron guardar los cambios. Intentá de nuevo.' });
    } else {
      setDatosMessage({ type: 'success', text: 'Cambios guardados correctamente.' });
      setProfile((p) => ({ ...p, first_name: editFirstName.trim(), last_name: editLastName.trim(), house: editHouse }));
    }
    setDatosSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña y la confirmación no coinciden.' });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMessage({ type: 'error', text: error.message === 'New password should be different from the old password.' ? 'La nueva contraseña debe ser distinta a la actual.' : 'No se pudo cambiar la contraseña. Revisá la contraseña actual.' });
    } else {
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  }

  const userHouse = profile?.house || 'william_brown';
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];
  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';
  const isAlumno = profile?.user_type === 'alumno';
  const visibleTabs = isAlumno ? TABS : TABS.filter((t) => t.id !== 'subidos');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: bg, color: textMuted }}>
        Cargando...
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      {/* Navbar desktop — mismo que dashboard */}
      <header
        className="hidden lg:flex flex-shrink-0 items-center gap-4 px-4 h-14 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <Image src="/images/logo-sass.png" alt="SASS" width={32} height={32} className="object-contain" />
          <span className="text-base md:text-lg font-bold truncate" style={{ color: isDark ? text : '#00478E' }}>Campus San Andrés</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/perfil" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border min-w-0" style={{ borderColor: userHouseMeta.color, background: `${userHouseMeta.color}15` }}>
            <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={28} height={28} className="flex-shrink-0 object-contain" />
            <div className="min-w-0 flex flex-col items-start">
              <span className="text-sm font-bold truncate w-full" style={{ color: text }}>{displayName}</span>
              <span className="text-xs truncate w-full" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
            </div>
          </Link>
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg transition-colors" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={handleLogout} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* Navbar mobile */}
      <header
        className="lg:hidden flex-shrink-0 flex items-center justify-between gap-2 px-3 h-12 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link href="/perfil" className="flex items-center gap-2 min-w-0">
          <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={24} height={24} className="flex-shrink-0 object-contain" />
          <span className="text-sm font-bold truncate" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
        </Link>
        <span className="text-2xl font-black tabular-nums flex-shrink-0" style={{ color: accent }}>{stats.puntos}</span>
        <div className="flex items-center gap-0 flex-shrink-0">
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={handleLogout} className="p-2 rounded-lg" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="lg:flex lg:flex-row lg:min-h-full">
          {/* Columna izquierda — card de perfil */}
          <aside className="flex-shrink-0 lg:w-1/3 p-4 lg:p-6">
            <div className={`${cardBase} p-6 text-center`} style={cardStyle}>
              <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={80} height={80} className="mx-auto object-contain" />
              <h1
                className="mt-4 text-2xl font-black uppercase tracking-tight break-words"
                style={{ color: text, fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
              >
                {displayName}
              </h1>
              <p className="mt-1 text-sm break-all" style={{ color: textMuted }}>{email}</p>
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: userHouseMeta.color, background: `${userHouseMeta.color}15` }}>
                <span className="text-sm font-bold" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: textMuted }}>{profile.user_type === 'padre' ? 'Padre' : 'Alumno'}</p>
              <p className="text-xs mt-1" style={{ color: textMuted }}>Miembro desde {formatDate(profile.created_at)}</p>
              <hr className="my-4" style={{ borderColor: border }} />
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm" style={{ color: textMuted }}>🎮 Juegos desbloqueados</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: accent }}>{stats.juegos}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm" style={{ color: textMuted }}>⏱ Tiempo jugado</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: accent }}>{formatDuration(stats.tiempoSeconds)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm" style={{ color: textMuted }}>⭐ Puntos</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: accent }}>{stats.puntos}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Columna derecha — tabs */}
          <main className="flex-1 min-w-0 p-4 lg:p-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b" style={{ borderColor: border }}>
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-shrink-0 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors"
                  style={{
                    background: activeTab === tab.id ? cardBg : 'transparent',
                    color: activeTab === tab.id ? text : textMuted,
                    border: `1px solid ${activeTab === tab.id ? border : 'transparent'}`,
                    borderBottom: activeTab === tab.id ? `1px solid ${cardBg}` : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-w-0">
              {/* Tab Mis datos */}
              {activeTab === 'datos' && (
                <div className={`${cardBase} p-6`} style={cardStyle}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: text }}>Mis datos</h2>
                  <form onSubmit={handleSaveDatos} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Nombre</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 min-w-0"
                        style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Apellido</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 min-w-0"
                        style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Email</label>
                      <input type="text" value={email} readOnly className="w-full rounded-xl px-4 py-3 border min-w-0 opacity-80" style={{ background: isDark ? '#0a0a0f' : '#e2e8f0', borderColor: border, color: textMuted }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>House</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {HOUSES.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => setEditHouse(h.id)}
                            className="rounded-xl border-2 p-3 flex flex-col items-center gap-1 min-w-0"
                            style={{
                              borderColor: editHouse === h.id ? h.color : border,
                              background: editHouse === h.id ? `${h.color}15` : 'transparent',
                            }}
                          >
                            <Image src={h.image} alt={h.name} width={32} height={32} className="object-contain" />
                            <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: h.color }}>{h.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {datosMessage.text && (
                      <p className="text-sm" style={{ color: datosMessage.type === 'error' ? '#ef4444' : '#22c55e' }}>{datosMessage.text}</p>
                    )}
                    <button type="submit" disabled={datosSaving} className="vibe-btn-gradient px-6 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                      {datosSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Cambiar contraseña */}
              {activeTab === 'password' && (
                <div className={`${cardBase} p-6`} style={cardStyle}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: text }}>Cambiar contraseña</h2>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Contraseña actual</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 min-w-0"
                        style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Nueva contraseña (mínimo 6 caracteres)</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 min-w-0"
                        style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Confirmar nueva contraseña</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                        className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 min-w-0"
                        style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
                      />
                    </div>
                    {passwordMessage.text && (
                      <p className="text-sm" style={{ color: passwordMessage.type === 'error' ? '#ef4444' : '#22c55e' }}>{passwordMessage.text}</p>
                    )}
                    <button type="submit" disabled={passwordSaving} className="vibe-btn-gradient px-6 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                      {passwordSaving ? 'Cambiando...' : 'Cambiar contraseña'}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Juegos desbloqueados */}
              {activeTab === 'juegos' && (
                <div className={`${cardBase} p-6`} style={cardStyle}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: text }}>Juegos desbloqueados</h2>
                  {unlockedGames.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm mb-4" style={{ color: textMuted }}>Todavía no desbloqueaste ningún juego</p>
                      <Link href="/dashboard" className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white text-sm">
                        Ver juegos disponibles
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {unlockedGames.map((game) => {
                        const house = HOUSES.find((h) => h.id === game.house) || HOUSES[0];
                        return (
                          <div key={game.id} className="rounded-xl border p-4 min-w-0" style={{ borderColor: border, background: isDark ? '#0a0a0f' : '#fff' }}>
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                              <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                              <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                            </div>
                            <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</h3>
                            <p className="text-xs mt-1 break-words min-w-0 line-clamp-2" style={{ color: textMuted }}>{game.description || ''}</p>
                            <Link href={`/jugar/${game.id}`} className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm text-center block">Jugar</Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Mis juegos subidos (solo alumnos) */}
              {activeTab === 'subidos' && isAlumno && (
                <div className={`${cardBase} p-6`} style={cardStyle}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: text }}>Mis juegos subidos</h2>
                  {mySubmittedGames.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: textMuted }}>Todavía no subiste ningún juego</p>
                  ) : (
                    <ul className="space-y-3">
                      {mySubmittedGames.map((game) => (
                        <li key={game.id} className="rounded-xl border p-4 min-w-0" style={{ borderColor: border, background: isDark ? '#0a0a0f' : '#fff' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold break-words min-w-0" style={{ color: text }}>{game.title || 'Juego'}</span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{
                                background: game.status === 'approved' ? '#22c55e20' : game.status === 'rejected' ? '#ef444420' : `${accent}20`,
                                color: game.status === 'approved' ? '#22c55e' : game.status === 'rejected' ? '#ef4444' : accent,
                              }}
                            >
                              {game.status === 'pending' ? 'Pendiente' : game.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                            </span>
                          </div>
                          {game.status === 'rejected' && game.rejection_reason && (
                            <p className="text-xs mt-2" style={{ color: '#ef4444' }}>Motivo: {game.rejection_reason}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs mt-4" style={{ color: textMuted }}>Subir nuevo juego (disponible en Fase 2)</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
