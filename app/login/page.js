'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.js';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function friendlyAuthError(message) {
  if (!message) return 'No se pudo iniciar sesión. Intentá de nuevo.';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid_credentials'))
    return 'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.';
  if (lower.includes('email not confirmed'))
    return 'Tu cuenta aún no está confirmada. Revisá tu correo y hacé clic en el enlace.';
  if (lower.includes('too many'))
    return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Error de conexión. Revisá tu internet e intentá de nuevo.';
  return 'No se pudo iniciar sesión. Revisá tus datos e intentá de nuevo.';
}

export default function LoginPage() {
  const router = useRouter();
  const [theme, , toggleTheme] = useAuthTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/dashboard');
          return;
        }
      } catch (_) {}
      setCheckingAuth(false);
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        setLoading(false);
        return;
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === 'dark';

  const inputClass = isDark
    ? 'vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium'
    : 'w-full rounded-xl px-4 py-3.5 text-[#0f172a] placeholder-[#64748b]/70 font-medium bg-white border border-[#e2e8f0] transition-all outline-none focus:border-[#00478E] focus:ring-2 focus:ring-[#00478E]/20';
  const labelClass = isDark
    ? 'block text-xs font-bold text-vibe-text-muted mb-2 uppercase tracking-wider'
    : 'block text-xs font-bold text-[#64748b] mb-2 uppercase tracking-wider';

  if (checkingAuth) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors"
          style={{ background: isDark ? '#0a0a0f' : '#ffffff' }}
        >
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Cargando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 overflow-x-hidden font-sans transition-colors"
        style={{ background: isDark ? '#0a0a0f' : '#ffffff' }}
      >
        <div className="w-full max-w-lg min-w-0">
          <header className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/logo-sass.png"
                alt="St. Andrew's Scots School"
                width={120}
                height={40}
                className="object-contain object-center"
                style={isDark ? { filter: 'brightness(0) invert(1)' } : undefined}
              />
            </div>
            <h1
              className="text-4xl sm:text-5xl font-extrabold tracking-tight uppercase"
              style={{
                color: isDark ? '#f1f5f9' : '#00478E',
                ...(isDark && { fontFamily: "'Burbank Big', sans-serif", fontWeight: 900 }),
              }}
            >
              CAMPUS
              <br />
              SAN ANDRÉS
            </h1>
            <p className="mt-3 text-[#7c3aed] text-lg font-semibold font-sans">Vibe Coding San Andrés</p>
          </header>

          <form
            onSubmit={handleSubmit}
            className={`p-6 sm:p-8 shadow-xl min-w-0 overflow-hidden rounded-2xl border transition-colors ${isDark ? 'vibe-card' : ''}`}
            style={!isDark ? { borderColor: '#e2e8f0', background: '#f8fafc' } : undefined}
          >
            <div className="grid gap-6 min-w-0">
              <div className="min-w-0">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="tu@correo.com"
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="password" className={labelClass}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={
                      isDark
                        ? { color: '#94a3b8' }
                        : { color: '#64748b' }
                    }
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2">
                  <Link
                    href="/recuperar-contrasena"
                    className={`text-sm font-medium ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="vibe-btn-gradient w-full rounded-xl py-4 font-bold text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>

              <p className="text-center font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                ¿No tenés cuenta?{' '}
                <Link
                  href="/register"
                  className={`font-bold transition-colors ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}
                >
                  Registrate
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
