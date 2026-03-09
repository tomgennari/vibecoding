'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

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
function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function DashboardNavbar({ profile, stats, theme, onToggleTheme, onLogout }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const navStyle = isDark ? { color: textMuted } : { color: '#64748b' };

  const userHouse = profile?.house || 'william_brown';
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];
  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';

  const statValues = {
    juegos: stats?.juegos ?? 0,
    tiempo: formatDuration(stats?.tiempoSeconds ?? 0),
    puntos: stats?.puntos ?? 0,
  };

  return (
    <>
      <header
        className="hidden lg:flex flex-shrink-0 items-center gap-4 px-4 h-14 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <Image src="/images/logo-sass.png" alt="SASS" width={32} height={32} className="object-contain" />
          <span className="text-base md:text-lg font-bold truncate" style={{ color: isDark ? text : '#00478E' }}>
            Campus San Andrés
          </span>
        </Link>

        <div className="flex-1 flex items-center justify-center gap-6 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.juegos}</span>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[0].label}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.tiempo}</span>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[1].label}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.puntos}</span>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[2].label}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="vibe-btn-gradient rounded-xl px-4 py-1.5 text-sm font-bold text-white whitespace-nowrap"
        >
          🎮 Crea tu juego
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/perfil" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border min-w-0 transition-opacity hover:opacity-90" style={{ borderColor: userHouseMeta.color, background: `${userHouseMeta.color}15` }}>
            <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={28} height={28} className="flex-shrink-0 object-contain" />
            <div className="min-w-0 flex flex-col items-start">
              <span className="text-sm font-bold truncate w-full" style={{ color: text }}>{displayName}</span>
              <span className="text-xs truncate w-full" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
            </div>
          </Link>
          <button type="button" onClick={onToggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg transition-colors" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={onLogout} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      <header
        className="lg:hidden flex-shrink-0 flex items-center px-3 h-12 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <div className="flex-1 min-w-0 flex items-center justify-start">
          <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-90" aria-label="Campus San Andrés">
            <Image src="/images/logo-sass.png" alt="Campus San Andrés" width={28} height={28} className="object-contain flex-shrink-0" />
          </Link>
        </div>
        <Link href="/perfil" className="flex items-center gap-2 px-2 py-1 rounded-lg border min-w-0 flex-shrink-0 overflow-hidden mx-1" style={{ borderColor: userHouseMeta.color, background: `${userHouseMeta.color}15` }}>
          <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={24} height={24} className="flex-shrink-0 object-contain" />
          <div className="min-w-0 flex flex-col items-start">
            <span className="text-xs font-bold truncate w-full leading-tight" style={{ color: text }}>{displayName}</span>
            <span className="text-[10px] truncate w-full leading-tight" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
          </div>
        </Link>
        <div className="flex-1 min-w-0 flex items-center justify-end gap-0">
          <button type="button" onClick={onToggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={onLogout} className="p-2 rounded-lg" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="relative w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ background: cardBg, borderColor: border }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: textMuted }}
            >
              <IconClose />
            </button>
            <h2 id="modal-title" className="text-lg font-bold mb-4 pr-8" style={{ color: text }}>
              Crear tu juego
            </h2>

            <div className="space-y-4">
              <div className="rounded-xl border p-4" style={{ borderColor: border, background: isDark ? '#0f0f14' : '#ffffff' }}>
                <h3 className="font-bold mb-1" style={{ color: text }}>🤖 Crear con IA</h3>
                <p className="text-sm mb-3" style={{ color: textMuted }}>
                  Usá IA para diseñar tu juego desde cero. Te damos un template y un prompt para arrancar.
                </p>
                <button type="button" disabled className="rounded-xl px-4 py-2 text-sm font-bold opacity-50" style={{ background: textMuted, color: cardBg }}>
                  Próximamente
                </button>
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: border, background: isDark ? '#0f0f14' : '#ffffff' }}>
                <h3 className="font-bold mb-1" style={{ color: text }}>🕹️ Subir mi juego</h3>
                <p className="text-sm mb-3" style={{ color: textMuted }}>
                  Ya tenés tu juego listo y querés subirlo a la plataforma.
                </p>
                <Link
                  href="/juegos/subir"
                  onClick={() => setModalOpen(false)}
                  className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: accent }}
                >
                  Subir mi juego
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
