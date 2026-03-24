'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';
import { useUser } from '@/lib/user-context.js';

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

export default function PerfilPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, stats, userHouseMeta, loading: userLoading, refreshStats } = useUser();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [credits, setCredits] = useState(null);
  const [showCreditsInfo, setShowCreditsInfo] = useState(false);
  const [playingGame, setPlayingGame] = useState(null); // { id, title, file_url }
  const [playingGameHtml, setPlayingGameHtml] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const uid = session.user.id;
    setEmail(session.user?.email || '');

    const [unlocksListRes, approvedRes, submittedRes, profileAdminRes] = await Promise.all([
      supabase.from('game_unlocks').select('game_id').eq('user_id', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('games').select('*').eq('status', 'approved').then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('games').select('*').eq('submitted_by', uid).then((r) => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
      supabase.from('profiles').select('is_admin').eq('id', uid).single().then((r) => ({ data: r.data })).catch(() => ({ data: null })),
    ]);

    const unlockedIds = (unlocksListRes.data || []).map((r) => r.game_id).filter(Boolean);
    const approved = approvedRes.data || [];
    setUnlockedGames(approved.filter((g) => g.id && unlockedIds.includes(g.id)));
    setMySubmittedGames(submittedRes.data || []);
    setIsAdmin(!!profileAdminRes.data?.is_admin);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (profile) {
      setEditFirstName(profile.first_name ?? '');
      setEditLastName(profile.last_name ?? '');
      setEditHouse(profile.house ?? 'william_brown');
    }
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'subidos') {
      setActiveTab('subidos');
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !profile) router.replace('/login');
  }, [userLoading, profile, router]);

  useEffect(() => {
    if (userLoading || !profile) return;
    fetchData();
  }, [userLoading, profile, fetchData]);

  useEffect(() => {
    if (!profile) return;
    async function loadCredits() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
          .from('profiles')
          .select('tokens_used, tokens_limit')
          .eq('id', session.user.id)
          .single();
        if (data) {
          const used = data.tokens_used || 0;
          const limit = data.tokens_limit || 1.0;
          setCredits({ used, limit, remaining: Math.max(0, limit - used) });
        }
      } catch {}
    }
    loadCredits();
  }, [profile]);

  useEffect(() => {
    if (!deleteModalOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeDeleteModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteModalOpen]);

  useEffect(() => {
    if (playingGame) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [playingGame]);

  useEffect(() => {
    if (!playingGame?.file_url) {
      setPlayingGameHtml(null);
      return;
    }
    fetch(playingGame.file_url)
      .then((res) => (res.ok ? res.text() : null))
      .then((html) => setPlayingGameHtml(html))
      .catch(() => setPlayingGameHtml(null));
  }, [playingGame]);

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
      refreshStats();
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

  function openDeleteModal() {
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
    setDeleteError('');
  }

  function closeDeleteModal() {
    if (!deleteLoading) {
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setDeleteError('');
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'ELIMINAR' || deleteLoading) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDeleteError('Sesión expirada. Volvé a iniciar sesión.');
        setDeleteLoading(false);
        return;
      }
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || 'No se pudo eliminar la cuenta. Intentá de nuevo.');
        setDeleteLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace('/register?message=' + encodeURIComponent('Tu cuenta fue eliminada correctamente'));
    } catch (err) {
      setDeleteError(err.message || 'Error de conexión.');
      setDeleteLoading(false);
    }
  }

  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';
  const isAlumno = profile?.user_type === 'alumno';
  const visibleTabs = (isAlumno || isAdmin || mySubmittedGames.length > 0) ? TABS : TABS.filter((t) => t.id !== 'subidos');

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: bg, color: textMuted }}>
        Cargando...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-auto min-h-0 pb-[60px] lg:pb-0">
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
              {profile?.has_all_access ? (
                <p className="mt-3 text-sm font-bold" style={{ color: '#eab308' }}>🌟 ALL ACCESS — acceso a todos los juegos</p>
              ) : (profile?.unlock_credits ?? 0) > 0 ? (
                <p className="mt-3 text-sm font-bold" style={{ color: accent }}>🎮 {profile.unlock_credits} créditos de desbloqueo disponibles</p>
              ) : null}
              <p className="mt-2 text-sm" style={{ color: textMuted }}>{profile.user_type === 'padre' ? 'Padre' : 'Alumno'}</p>
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
                {credits && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm" style={{ color: textMuted }}>⚡ Créditos de Andy</span>
                        <button
                          type="button"
                          onClick={() => setShowCreditsInfo((prev) => !prev)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border"
                          style={{ borderColor: textMuted, color: textMuted }}
                          aria-label="Info sobre créditos"
                        >
                          i
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 rounded-full h-1.5 overflow-hidden" style={{ background: isDark ? '#1a1a2a' : '#e2e8f0' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: Math.max(2, (credits.remaining / credits.limit) * 100) + '%',
                              background: credits.remaining > 0.3 ? '#7c3aed' : credits.remaining > 0.1 ? '#eab308' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-lg font-black tabular-nums" style={{ color: credits.remaining > 0.3 ? accent : credits.remaining > 0.1 ? '#eab308' : '#ef4444' }}>
                          ${credits.remaining.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {showCreditsInfo && (
                      <div className="mt-2 rounded-lg border p-2.5 text-xs" style={{ background: isDark ? '#0a0a0f' : '#f1f5f9', borderColor: border, color: textMuted }}>
                        Cada vez que Andy crea o modifica un juego, usa un poco de créditos. Podés conseguir más desbloqueando juegos del catálogo.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push('/game-lab')}
                      className="mt-2 w-full text-xs font-medium py-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ color: accent }}
                    >
                      🎮 Usá tus créditos creando un juego →
                    </button>
                  </div>
                )}
              </div>
              {/* Zona de peligro */}
              <hr className="my-4" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }} />
              <p className="text-xs mb-2" style={{ color: textMuted }}>Eliminar cuenta</p>
              <button
                type="button"
                onClick={openDeleteModal}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              >
                Eliminar mi cuenta
              </button>
              <div className="mt-6 pt-4 border-t flex flex-col gap-1.5" style={{ borderColor: border }}>
                <a href="/terminos" className="text-xs hover:underline" style={{ color: textMuted }}>
                  Términos y condiciones
                </a>
                <a href="/privacidad" className="text-xs hover:underline" style={{ color: textMuted }}>
                  Política de privacidad
                </a>
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

              {/* Tab Mis juegos subidos (alumnos, admins o quien tenga juegos subidos) */}
              {activeTab === 'subidos' && (isAlumno || isAdmin || mySubmittedGames.length > 0) && (
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
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => setPlayingGame(game)}
                              className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold border transition-colors hover:opacity-80"
                              style={{ borderColor: accent, color: accent, background: 'transparent' }}
                            >
                              🎮 Jugar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sessionStorage.setItem('gamelab_edit_game_id', game.id);
                                sessionStorage.setItem('gamelab_edit_url', game.file_url);
                                router.push('/game-lab');
                              }}
                              className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold border transition-colors hover:opacity-80"
                              style={{ borderColor: border, color: textMuted, background: 'transparent' }}
                            >
                              ✏️ Editar
                            </button>
                            {game.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = `https://sass.vibecoding.ar/jugar/${game.id}`;
                                  const text = `¡Mirá el juego que creé en Campus San Andrés! 🎮 Jugalo acá: ${url}`;
                                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold border transition-colors hover:opacity-80"
                                style={{ borderColor: '#22c55e', color: '#22c55e', background: 'transparent' }}
                              >
                                📲 Compartir
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: border }}>
                            <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: textMuted }}>
                              <input
                                type="checkbox"
                                checked={game.show_author !== false}
                                onChange={async (e) => {
                                  const newValue = e.target.checked;
                                  const { error } = await supabase
                                    .from('games')
                                    .update({ show_author: newValue })
                                    .eq('id', game.id);
                                  if (!error) {
                                    // Actualizar la lista local
                                    setMySubmittedGames((prev) =>
                                      prev.map((g) => g.id === game.id ? { ...g, show_author: newValue } : g)
                                    );
                                  }
                                }}
                                className="w-4 h-4 rounded cursor-pointer accent-[#7c3aed]"
                              />
                              {game.show_author !== false ? 'Tu nombre aparece como autor' : 'Autor anónimo'}
                            </label>
                          </div>
                          {game.status === 'approved' && !game.unlocked_for_all && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  if (!session) return;
                                  const res = await fetch('/api/mp/crear-preferencia', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${session.access_token}`,
                                    },
                                    body: JSON.stringify({
                                      gameId: game.id,
                                      userId: session.user.id,
                                      gameTitle: game.title,
                                      gamePrice: 50000,
                                      unlockAll: true,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (data.init_point) {
                                    window.location.href = data.init_point;
                                  }
                                } catch (err) {
                                  console.error('Error creando preferencia:', err);
                                }
                              }}
                              className="w-full cursor-pointer rounded-lg px-3 py-2 text-xs font-bold border transition-colors hover:opacity-80 mt-1"
                              style={{ borderColor: '#eab308', color: '#eab308', background: 'transparent' }}
                            >
                              🌟 Desbloquear para todos — $50.000
                            </button>
                          )}
                          {game.unlocked_for_all && (
                            <p className="text-xs text-center mt-1 font-medium" style={{ color: '#22c55e' }}>
                              🌟 ¡Desbloqueado para todos!
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/game-lab')}
                      className="vibe-btn-gradient cursor-pointer flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                    >
                      🤖 Crear con Andy
                    </button>
                    <Link href="/juegos/subir" className="flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-center border transition-colors hover:opacity-80" style={{ borderColor: border, color: textMuted }}>
                      🕹️ Subir mi juego
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modal eliminar cuenta */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={closeDeleteModal}
          onKeyDown={(e) => e.key === 'Escape' && closeDeleteModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="rounded-xl border shadow-xl max-w-md w-full p-6"
            style={{ background: cardBg, borderColor: border }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" className="text-lg font-bold mb-2" style={{ color: text }}>¿Eliminar tu cuenta?</h2>
            <p className="text-sm mb-4" style={{ color: textMuted }}>
              Esta acción eliminará permanentemente tu cuenta y todos tus datos. Los juegos que hayas subido serán desactivados. Esta acción no se puede deshacer.
            </p>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
              Escribí ELIMINAR para confirmar
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full rounded-xl px-4 py-3 border outline-none focus:ring-2 mb-4 min-w-0"
              style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
              autoComplete="off"
            />
            {deleteError && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
                style={{ background: isDark ? '#2a2a3a' : '#e2e8f0', color: text }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleteLoading}
                className="px-4 py-2.5 rounded-xl font-medium text-sm text-white disabled:opacity-50"
                style={{ background: deleteConfirmText === 'ELIMINAR' && !deleteLoading ? '#ef4444' : '#94a3b8' }}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar cuenta definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {playingGame && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.9)' }}>
            <span className="text-white text-sm font-bold truncate mr-4">🎮 {playingGame.title || 'Mi juego'}</span>
            <button
              type="button"
              onClick={() => setPlayingGame(null)}
              className="text-red-400 text-sm font-bold px-3 py-1 rounded-lg border border-red-400/50 hover:bg-red-400/10 shrink-0"
            >
              ✕ Salir
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ touchAction: 'none' }}>
            {playingGameHtml ? (
              <iframe
                title={playingGame.title || 'Mi juego'}
                sandbox="allow-scripts allow-same-origin"
                srcDoc={playingGameHtml}
                className="w-full h-full border-0 flex-1 min-h-0"
                style={{ touchAction: 'auto' }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: textMuted }}>Cargando juego...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!playingGame && <MobileBottomNav theme={theme} activeTabId="perfil" />}
    </div>
  );
}
