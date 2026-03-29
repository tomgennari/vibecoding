'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Gamepad2, Sun, Moon, LogOut, HelpCircle } from 'lucide-react';
import { useCreateGameModal } from '@/lib/create-game-context.js';
import { useUser } from '@/lib/user-context.js';

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
function IconLogout() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
export function DashboardNavbar({ theme, onToggleTheme, onLogout }) {
  const { openCreateGameModal } = useCreateGameModal();
  const { profile, stats, userHouseMeta } = useUser();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const navStyle = isDark ? { color: textMuted } : { color: '#64748b' };

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
          {profile?.has_all_access ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: '#eab308', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)' }}>
              🌟 ALL ACCESS
            </span>
          ) : (profile?.unlock_credits ?? 0) > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}40` }}>
              🎮 {profile.unlock_credits} créditos disponibles
            </span>
          ) : null}
          {!profile?.has_all_access && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.juegos}</span>
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[0].label}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.tiempo}</span>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[1].label}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{statValues.puntos}</span>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: textMuted }}>{STATS_KEYS[2].label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={openCreateGameModal}
            className="vibe-btn-gradient h-10 rounded-full px-4 text-sm font-bold text-white whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Gamepad2 size={16} /> Crea tu juego
          </button>

          <Link
            href="/perfil"
            className="h-10 rounded-full px-4 flex items-center gap-2 border min-w-0 transition-colors"
            style={{ borderColor: border, background: cardBg }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = userHouseMeta.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
          >
            <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={22} height={22} className="flex-shrink-0 object-contain" />
            <span className="text-sm font-bold truncate" style={{ color: text }}>{displayName}</span>
            <span className="text-xs font-medium truncate" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
          </Link>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="h-10 w-10 rounded-full flex items-center justify-center border transition-colors"
            style={{ borderColor: border, background: cardBg, color: textMuted }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/soporte"
            title="Soporte"
            aria-label="Soporte"
            className="h-10 w-10 rounded-full flex items-center justify-center border transition-colors"
            style={{ borderColor: border, background: cardBg, color: textMuted }}
          >
            <HelpCircle size={18} aria-hidden />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="h-10 w-10 rounded-full flex items-center justify-center border transition-colors"
            style={{ borderColor: border, background: cardBg, color: '#ef4444' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <header
        className="lg:hidden flex-shrink-0 flex items-center px-3 h-12 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <div className="flex-1 min-w-0 flex items-center justify-start gap-2">
          <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-90" aria-label="Campus San Andrés">
            <Image src="/images/logo-sass.png" alt="Campus San Andrés" width={28} height={28} className="object-contain flex-shrink-0" />
          </Link>
          {profile?.has_all_access ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md max-w-[100px] truncate" style={{ color: '#eab308', background: 'rgba(234,179,8,0.15)' }}>🌟 ALL ACCESS</span>
          ) : (profile?.unlock_credits ?? 0) > 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md max-w-[90px] truncate" style={{ color: accent }}>🎮 {profile.unlock_credits}</span>
          ) : null}
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
          <Link
            href="/soporte"
            title="Soporte"
            aria-label="Soporte"
            className="p-2 rounded-lg inline-flex items-center justify-center"
            style={navStyle}
          >
            <HelpCircle className="w-5 h-5" strokeWidth={2} aria-hidden />
          </Link>
          <button type="button" onClick={onLogout} className="p-2 rounded-lg" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>
    </>
  );
}
