'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e' },
];

const BUILDINGS = [
  'Natatorio',
  'Community Hub',
  'Secundaria',
  'Dining Hall',
  'Performing Arts Center',
  'Sports Pavilion',
  'Barco Symmetry',
];

const GAMES_PLACEHOLDER = [
  { title: 'Aventura Espacial', description: 'Recolectá estrellas y esquivá meteoritos.', houseId: 'william_brown' },
  { title: 'Carrera de Houses', description: 'Competí con tu House en pistas de obstáculos.', houseId: 'james_fleming' },
  { title: 'Puzzle del Campus', description: 'Armá el mapa del nuevo campus.', houseId: 'john_monteith' },
];

function IconGamepad() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v2h2a2 2 0 012 2v2H9V8a2 2 0 012-2h2V4zM5 12a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6z" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
function IconCampus() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  // Modo claro dashboard: texto principal #00478E (mismo azul que CAMPUS SAN ANDRÉS)
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, house')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData || { first_name: 'Usuario', last_name: '', house: 'william_brown' });
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario'
    : 'Usuario';
  const userHouse = profile?.house || 'william_brown';
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ background: bg, color: textMuted }}
      >
        Cargando...
      </div>
    );
  }

  const navLinkClass = `px-3 py-2 rounded-lg text-sm font-semibold transition-colors`;
  const navLinkStyle = isDark
    ? { color: textMuted }
    : { color: '#64748b' };

  return (
    <div
      className="min-h-screen font-sans pb-20 md:pb-0"
      style={{ background: bg, color: text }}
    >
      {/* Desktop: barra superior */}
      <header
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 h-14 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link
          href="/dashboard"
          className="text-lg font-bold truncate"
          style={{ color: isDark ? text : '#00478E' }}
        >
          Campus San Andrés
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="#juegos-dia" className={navLinkClass} style={navLinkStyle}>
            Juegos
          </Link>
          <Link href="#ranking-houses" className={navLinkClass} style={navLinkStyle}>
            Ranking
          </Link>
          <Link href="#progreso-campus" className={navLinkClass} style={navLinkStyle}>
            Campus
          </Link>
          <Link href="#bienvenida" className={navLinkClass} style={navLinkStyle}>
            Mi Perfil
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-lg transition-colors"
            style={navLinkStyle}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <span className="text-sm font-medium truncate max-w-[120px]" style={{ color: text }}>
            {displayName}
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: userHouseMeta.color }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: '#ef4444' }}
            aria-label="Cerrar sesión"
          >
            <IconLogout />
          </button>
        </div>
      </header>

      {/* Mobile: barra inferior */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link href="#juegos-dia" className="flex flex-col items-center gap-0.5 p-2" style={navLinkStyle}>
          <IconGamepad />
          <span className="text-xs font-medium">Juegos</span>
        </Link>
        <Link href="#ranking-houses" className="flex flex-col items-center gap-0.5 p-2" style={navLinkStyle}>
          <IconTrophy />
          <span className="text-xs font-medium">Ranking</span>
        </Link>
        <Link href="#progreso-campus" className="flex flex-col items-center gap-0.5 p-2" style={navLinkStyle}>
          <IconCampus />
          <span className="text-xs font-medium">Campus</span>
        </Link>
        <Link href="#bienvenida" className="flex flex-col items-center gap-0.5 p-2" style={navLinkStyle}>
          <IconUser />
          <span className="text-xs font-medium">Perfil</span>
        </Link>
      </nav>

      {/* Mobile: barra superior (logo + toggle + logout) — altura fija para evitar solapamiento */}
      <div
        className="md:hidden flex fixed top-0 left-0 right-0 z-40 items-center justify-between px-3 h-14 min-h-[3.5rem] border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <Link
          href="/dashboard"
          className="text-base font-bold truncate"
          style={{ color: isDark ? text : '#00478E' }}
        >
          Campus San Andrés
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-xl border"
            style={{ borderColor: border, background: cardBg, color: textMuted }}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl border"
            style={{ borderColor: border, background: cardBg, color: '#ef4444' }}
            aria-label="Cerrar sesión"
          >
            <IconLogout />
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-20 md:pt-20 min-w-0 overflow-x-hidden">
        {/* 1. BIENVENIDA */}
        <section id="bienvenida" className="mb-10 scroll-mt-24 min-w-0">
          <h1
            className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-4 break-words"
            style={{
              ...(isDark && { fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }),
              color: text,
            }}
          >
            Bienvenido/a, {displayName}
          </h1>
          <div
            className="inline-flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border-2 min-w-0 max-w-full overflow-hidden"
            style={{
              background: `${userHouseMeta.color}20`,
              borderColor: userHouseMeta.color,
              color: userHouseMeta.color,
            }}
          >
            <span className="text-lg sm:text-2xl font-black uppercase tracking-wide truncate">{userHouseMeta.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 min-w-0">
            {[
              { label: 'Juegos desbloqueados', value: '0' },
              { label: 'Tiempo jugado', value: '0 h' },
              { label: 'Puntos acumulados', value: '0' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border p-3 sm:p-4 text-center min-w-0 overflow-hidden"
                style={{ borderColor: border, background: cardBg }}
              >
                <p className="text-xl sm:text-2xl font-black tabular-nums truncate" style={{ color: accent }}>{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 break-words hyphens-auto" style={{ color: textMuted }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. JUEGOS DEL DÍA */}
        <section id="juegos-dia" className="mb-10 scroll-mt-24 min-w-0">
          <h2 className="text-xl font-bold mb-4 break-words" style={{ color: text }}>
            🎮 Juegos del día — Gratis
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 min-w-0">
            {GAMES_PLACEHOLDER.map((game) => {
              const house = HOUSES.find((h) => h.id === game.houseId) || HOUSES[0];
              return (
                <div
                  key={game.title}
                  className="rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden"
                  style={{ borderColor: border, background: cardBg }}
                >
                  <h3 className="font-bold text-lg break-words min-w-0" style={{ color: text }}>{game.title}</h3>
                  <p className="text-sm mt-1 flex-1 break-words min-w-0" style={{ color: textMuted }}>{game.description}</p>
                  <span
                    className="inline-block w-fit mt-2 px-2 py-1 rounded text-xs font-bold uppercase truncate max-w-full"
                    style={{ background: `${house.color}30`, color: house.color }}
                  >
                    {house.name}
                  </span>
                  <button
                    type="button"
                    className="vibe-btn-gradient mt-4 w-full rounded-xl py-3 font-bold text-white text-sm"
                  >
                    Jugar
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. RANKING DE HOUSES */}
        <section id="ranking-houses" className="mb-10 scroll-mt-24 min-w-0">
          <h2 className="text-xl font-bold mb-4 break-words" style={{ color: text }}>
            Ranking de Houses
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 min-w-0">
            {HOUSES.map((h) => {
              const isUserHouse = h.id === userHouse;
              return (
                <div
                  key={h.id}
                  className="rounded-xl border p-4 min-w-0 overflow-hidden"
                  style={{
                    borderColor: isUserHouse ? h.color : border,
                    borderWidth: isUserHouse ? 2 : 1,
                    background: cardBg,
                  }}
                >
                  <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
                    <span className="font-bold truncate" style={{ color: h.color }}>{h.name}</span>
                    <span className="text-lg font-black tabular-nums flex-shrink-0" style={{ color: text }}>0 pts</span>
                  </div>
                  <div
                    className="rounded-full overflow-hidden"
                    style={{
                      height: '0.5rem',
                      background: isDark ? 'var(--vibe-border)' : '#e2e8f0',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: '0%',
                        background: isDark ? 'var(--vibe-gradient-primary)' : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. PROGRESO DEL CAMPUS */}
        <section id="progreso-campus" className="mb-10 scroll-mt-24 min-w-0">
          <h2 className="text-xl font-bold mb-4 break-words" style={{ color: text }}>
            Progreso del Campus
          </h2>
          <div className="space-y-4 min-w-0">
            {BUILDINGS.map((name) => (
              <div
                key={name}
                className="rounded-xl border p-4 min-w-0 overflow-hidden"
                style={{ borderColor: border, background: cardBg }}
              >
                <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
                  <span className="font-semibold truncate" style={{ color: text }}>{name}</span>
                  <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: textMuted }}>$0 ARS</span>
                </div>
                <div
                  className="rounded-full overflow-hidden"
                  style={{
                    height: '0.5rem',
                    background: isDark ? 'var(--vibe-border)' : '#e2e8f0',
                  }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: '0%',
                      background: isDark ? 'var(--vibe-gradient-primary)' : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: textMuted }}>0%</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. MIS JUEGOS DESBLOQUEADOS */}
        <section id="mis-juegos" className="mb-10 scroll-mt-24 min-w-0">
          <h2 className="text-xl font-bold mb-4 break-words" style={{ color: text }}>
            Mis juegos desbloqueados
          </h2>
          <div
            className="rounded-xl border border-dashed p-6 sm:p-8 text-center min-w-0 overflow-hidden"
            style={{ borderColor: border, background: cardBg }}
          >
            <p className="mb-4" style={{ color: textMuted }}>
              Todavía no desbloqueaste ningún juego
            </p>
            <Link
              href="#juegos-dia"
              className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-white text-sm"
            >
              Ver todos los juegos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
