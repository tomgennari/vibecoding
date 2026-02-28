'use client';

import { useState, useEffect } from 'react';
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

const STATS = [
  { key: 'juegos', label: 'Juegos desbloqueados', value: '0' },
  { key: 'tiempo', label: 'Tiempo jugado', value: '0 h' },
  { key: 'puntos', label: 'Puntos', value: '0' },
];

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
function IconChevronDown({ open }) {
  return (
    <svg className={`w-5 h-5 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('juegos');

  const hasUnlockedGames = false; // placeholder: sin juegos desbloqueados

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
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

  const userHouse = profile?.house || 'william_brown';
  const userHouseMeta = HOUSES.find((h) => h.id === userHouse) || HOUSES[0];
  const displayName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario' : 'Usuario';

  const progressBarBg = isDark ? 'var(--vibe-border)' : '#e2e8f0';
  const progressBarFill = isDark ? 'var(--vibe-gradient-primary)' : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)';
  const cardBase = 'rounded-xl border min-w-0 overflow-hidden';
  const cardStyle = { borderColor: border, background: cardBg };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: bg, color: textMuted }}>
        Cargando...
      </div>
    );
  }

  const navStyle = isDark ? { color: textMuted } : { color: '#64748b' };

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      {/* ========== NAVBAR DESKTOP (lg+) ========== */}
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
          {STATS.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm font-black tabular-nums" style={{ color: accent }}>{s.value}</span>
              <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border min-w-0" style={{ borderColor: userHouseMeta.color, background: `${userHouseMeta.color}15` }}>
            <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={28} height={28} className="flex-shrink-0 object-contain" />
            <span className="text-sm font-bold truncate" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
          </div>
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg transition-colors" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={handleLogout} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* ========== NAVBAR MOBILE — minimalista, una sola línea ========== */}
      <header
        className="lg:hidden flex-shrink-0 flex items-center justify-between gap-2 px-3 h-12 border-b"
        style={{ background: cardBg, borderColor: border }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={24} height={24} className="flex-shrink-0 object-contain" />
          <span className="text-sm font-bold truncate" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</span>
        </div>
        <span className="text-2xl font-black tabular-nums flex-shrink-0" style={{ color: accent }}>0</span>
        <div className="flex items-center gap-0 flex-shrink-0">
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} className="p-2 rounded-lg" style={navStyle}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" onClick={handleLogout} className="p-2 rounded-lg" style={{ color: '#ef4444' }} aria-label="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* ========== DESKTOP: dos columnas 2/3 + 1/3, sin scroll ========== */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        {/* Columna izquierda (2/3) */}
        <div className="flex-[2] flex flex-col min-w-0 overflow-auto px-4 py-4">
          {/* Bienvenida sutil + Juegos del día */}
          <p className="text-base mb-4 flex-shrink-0" style={{ color: isDark ? 'var(--vibe-text-muted)' : '#64748b' }}>
            Bienvenido/a, {displayName}
          </p>
          <section className="flex-shrink-0 mb-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: text }}>🎮 Juegos del día — Gratis</h2>
            <div className="grid grid-cols-3 gap-4 min-w-0">
              {GAMES_PLACEHOLDER.map((game) => {
                const house = HOUSES.find((h) => h.id === game.houseId) || HOUSES[0];
                return (
                  <div key={game.title} className={`${cardBase} p-4 flex flex-col`} style={cardStyle}>
                    <h3 className="font-bold text-lg break-words min-w-0" style={{ color: text }}>{game.title}</h3>
                    <p className="text-sm mt-2 flex-1 break-words min-w-0" style={{ color: textMuted }}>{game.description}</p>
                    <div className="flex items-center gap-2 mt-3 min-w-0">
                      <Image src={house.image} alt={house.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                      <span className="text-xs font-bold uppercase truncate" style={{ color: house.color }}>{house.name}</span>
                    </div>
                    <button type="button" className="vibe-btn-gradient mt-4 w-full rounded-xl py-3.5 font-bold text-white">
                      Jugar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Carrusel 1 — Mis juegos desbloqueados */}
          <section className="flex-shrink-0 mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold" style={{ color: text }}>🔓 Mis juegos desbloqueados</h2>
              <Link href="#juegos-dia" className="text-sm font-semibold flex-shrink-0" style={{ color: accent }}>Ver todos →</Link>
            </div>
            {hasUnlockedGames ? (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* placeholder: cards cuando haya juegos */}
              </div>
            ) : (
              <p className="text-sm py-4 rounded-xl border text-center min-w-0" style={{ color: textMuted, ...cardStyle }}>Todavía no desbloqueaste ningún juego</p>
            )}
          </section>

          {/* Banner separador full width */}
          <div
            className="flex-shrink-0 rounded-xl py-6 px-4 mb-4 text-center -mx-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', border: `2px solid ${border}` }}
          >
            <p
              className="text-lg md:text-xl font-black uppercase tracking-wide text-white max-w-2xl mx-auto"
              style={{ fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
            >
              ¿Querés más juegos? Ayudá a tu House desbloqueándolos y nos acercamos a nuestros objetivos del Campus.
            </p>
          </div>

          {/* Carrusel 2 — Juegos para desbloquear */}
          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ color: text }}>🎮 Juegos para desbloquear</h2>
              <Link href="#juegos-dia" className="text-sm font-semibold flex-shrink-0" style={{ color: accent }}>Ver todos →</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 scrollbar-hide flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {GAMES_PLACEHOLDER.map((game) => {
                const house = HOUSES.find((h) => h.id === game.houseId) || HOUSES[0];
                return (
                  <div key={game.title} className="flex-shrink-0 w-[220px] rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                      <Image src={house.image} alt={house.name} width={24} height={24} className="flex-shrink-0 object-contain" />
                      <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                    </div>
                    <h3 className="font-bold text-sm break-words min-w-0" style={{ color: text }}>{game.title}</h3>
                    <p className="text-xs mt-1 flex-1 break-words min-w-0" style={{ color: textMuted }}>{game.description}</p>
                    <p className="text-lg font-black tabular-nums mt-2 flex-shrink-0" style={{ color: accent }}>$5.000 ARS</p>
                    <button type="button" className="vibe-btn-gradient mt-3 w-full rounded-xl py-2.5 font-bold text-white text-sm">Desbloquear</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Columna derecha (1/3) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto px-4 py-4 border-l" style={{ borderColor: border }}>
          {/* Ranking de Houses — 4 filas compactas */}
          <section className="flex-shrink-0 mb-6">
            <h2 className="text-lg font-bold mb-3" style={{ color: text }}>Ranking de Houses</h2>
            <div className="space-y-2 min-w-0">
              {HOUSES.map((h) => {
                const isUser = h.id === userHouse;
                return (
                  <div
                    key={h.id}
                    className={`${cardBase} p-2.5 flex items-center gap-2`}
                    style={{ ...cardStyle, borderColor: isUser ? h.color : border, borderWidth: isUser ? 2 : 1 }}
                  >
                    <Image src={h.image} alt={h.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                    <span className="font-bold text-sm truncate min-w-0 flex-1" style={{ color: h.color }}>{h.name}</span>
                    <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: text }}>0</span>
                    <div className="w-12 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: '0%', background: progressBarFill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Progreso del Campus — 7 filas compactas: nombre + barra + % */}
          <section className="flex-shrink-0">
            <h2 className="text-lg font-bold mb-3" style={{ color: text }}>Progreso del Campus</h2>
            <div className="space-y-2 min-w-0">
              {BUILDINGS.map((name) => (
                <div key={name} className={`${cardBase} p-2 flex items-center gap-2`} style={cardStyle}>
                  <span className="text-xs font-semibold truncate min-w-0 flex-1" style={{ color: text }}>{name}</span>
                  <div className="w-16 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: '0%', background: progressBarFill }} />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums flex-shrink-0 w-6 text-right" style={{ color: textMuted }}>0%</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ========== MOBILE: scroll vertical + barra inferior fija ========== */}
      <div className="lg:hidden flex-1 overflow-auto min-h-0" style={{ paddingBottom: '60px' }}>
        {/* Stats — 3 chips full width */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 min-w-0" style={{ background: cardBg, borderBottom: `1px solid ${border}` }}>
          {STATS.map((s) => (
            <div key={s.key} className="rounded-xl border py-2.5 px-2 text-center min-w-0 overflow-hidden" style={cardStyle}>
              <p className="text-lg font-black tabular-nums truncate" style={{ color: accent }}>{s.value}</p>
              <p className="text-[10px] font-medium truncate break-words hyphens-auto mt-0.5" style={{ color: textMuted }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 space-y-6 min-w-0">
          {/* Juegos del día — scroll horizontal tipo Netflix, cards 75vw, sin scrollbar */}
          <section id="juegos-dia" className="min-w-0 scroll-mt-24">
            <h2 className="text-base font-bold mb-3 w-full" style={{ color: text }}>🎮 Juegos del día — Gratis</h2>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {GAMES_PLACEHOLDER.map((game) => {
                const house = HOUSES.find((h) => h.id === game.houseId) || HOUSES[0];
                return (
                  <div key={game.title} className="flex-shrink-0 rounded-xl border p-4 flex flex-col min-w-0 overflow-hidden" style={{ width: '75vw', ...cardStyle }}>
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                      <Image src={house.image} alt={house.name} width={28} height={28} className="flex-shrink-0 object-contain" />
                      <span className="text-xs font-bold truncate" style={{ color: house.color }}>{house.name}</span>
                    </div>
                    <h3 className="font-bold text-sm break-words min-w-0 flex-1" style={{ color: text }}>{game.title}</h3>
                    <button type="button" className="vibe-btn-gradient mt-3 w-full rounded-xl py-3 font-bold text-white text-sm">Jugar</button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Banner CTA — Burbank Big + subtexto + botones */}
          <section className="min-w-0 -mx-4">
            <div
              className="rounded-none mx-0 py-8 px-4 flex flex-col items-center justify-center text-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', borderTop: `2px solid ${border}`, borderBottom: `2px solid ${border}` }}
            >
              <p
                className="text-2xl font-black uppercase tracking-wide text-white mb-2"
                style={{ fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }}
              >
                Cada peso construye el campus
              </p>
              <p className="text-sm text-white/90 mb-4">Desbloqueá más juegos o doná directamente</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="#juegos-dia" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                  Ver juegos
                </Link>
                <button type="button" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white bg-white/20 border border-white/40">
                  Donar
                </button>
              </div>
            </div>
          </section>

          {/* Mis juegos desbloqueados — vacío o grid 2 cols */}
          <section className="min-w-0">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>Mis juegos desbloqueados</h2>
            {hasUnlockedGames ? (
              <div className="grid grid-cols-2 gap-3 min-w-0">
                {/* placeholder para cuando haya juegos */}
              </div>
            ) : (
              <div className="rounded-xl border p-6 text-center min-w-0" style={cardStyle}>
                <p className="text-sm mb-4" style={{ color: textMuted }}>Todavía no desbloqueaste ningún juego</p>
                <Link href="#juegos-dia" className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold text-white text-sm">
                  Ver todos los juegos
                </Link>
              </div>
            )}
          </section>

          {/* Ranking de Houses — acordeón colapsado por defecto */}
          <section id="ranking-houses" className="min-w-0 scroll-mt-24">
            <button
              type="button"
              onClick={() => setRankingOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-xl border p-4 font-bold text-left min-w-0"
              style={{ ...cardStyle, color: text }}
            >
              <span className="truncate">🏆 Ranking de Houses</span>
              <IconChevronDown open={rankingOpen} />
            </button>
            {rankingOpen && (
              <div className="mt-2 space-y-2 min-w-0">
                {HOUSES.map((h) => {
                  const isUser = h.id === userHouse;
                  return (
                    <div
                      key={h.id}
                      className={`${cardBase} p-3 flex items-center gap-3`}
                      style={{ ...cardStyle, borderColor: isUser ? h.color : border, borderWidth: isUser ? 2 : 1 }}
                    >
                      <Image src={h.image} alt={h.name} width={32} height={32} className="flex-shrink-0 object-contain" />
                      <span className="font-bold text-sm truncate min-w-0 flex-1" style={{ color: h.color }}>{h.name}</span>
                      <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: text }}>0 pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Progreso del Campus — acordeón colapsado por defecto */}
          <section id="progreso-campus" className="min-w-0 scroll-mt-24">
            <button
              type="button"
              onClick={() => setCampusOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-xl border p-4 font-bold text-left min-w-0"
              style={{ ...cardStyle, color: text }}
            >
              <span className="truncate">🏗 Progreso del Campus</span>
              <IconChevronDown open={campusOpen} />
            </button>
            {campusOpen && (
              <div className="mt-2 space-y-2 min-w-0">
                {BUILDINGS.map((name) => (
                  <div key={name} className={`${cardBase} p-2.5 flex items-center gap-2`} style={cardStyle}>
                    <span className="font-semibold text-xs truncate min-w-0 flex-1" style={{ color: text }}>{name}</span>
                    <div className="w-16 rounded-full overflow-hidden flex-shrink-0" style={{ height: '0.25rem', background: progressBarBg }}>
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: '0%', background: progressBarFill }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums flex-shrink-0 w-6 text-right" style={{ color: textMuted }}>0%</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Perfil — sección mínima para tab inferior */}
          <section id="perfil" className="min-w-0 scroll-mt-24 pb-4">
            <h2 className="text-base font-bold mb-3" style={{ color: text }}>👤 Perfil</h2>
            <div className={`${cardBase} p-4 flex items-center gap-3`} style={cardStyle}>
              <Image src={userHouseMeta.image} alt={userHouseMeta.name} width={48} height={48} className="flex-shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: userHouseMeta.color }}>{userHouseMeta.name}</p>
                <p className="text-xs" style={{ color: textMuted }}>Tu House</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Barra inferior fija — solo mobile, 4 tabs */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t h-[60px]"
        style={{ background: cardBg, borderColor: border }}
      >
        {[
          { id: 'juegos-dia', label: 'Juegos', icon: '🎮' },
          { id: 'ranking-houses', label: 'Ranking', icon: '🏆' },
          { id: 'progreso-campus', label: 'Campus', icon: '🏗' },
          { id: 'perfil', label: 'Perfil', icon: '👤' },
        ].map((tab) => {
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setMobileTab(tab.id); scrollToSection(tab.id); }}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-w-0 transition-colors"
              style={{
                color: isActive ? userHouseMeta.color : textMuted,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] truncate w-full">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
