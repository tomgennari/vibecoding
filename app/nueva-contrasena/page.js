'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

const MIN_PASSWORD_LENGTH = 6;

function friendlyUpdateError(message) {
  if (!message) return 'No se pudo actualizar la contraseña. Intentá de nuevo.';
  const lower = message.toLowerCase();
  if (lower.includes('same') || lower.includes('igual'))
    return 'La nueva contraseña debe ser distinta a la anterior.';
  if (lower.includes('weak') || lower.includes('password'))
    return 'La contraseña es muy débil. Usá al menos 6 caracteres.';
  if (lower.includes('session') || lower.includes('expired') || lower.includes('invalid'))
    return 'El link expiró o ya fue usado. Solicitá uno nuevo desde "¿Olvidaste tu contraseña?".';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Error de conexión. Revisá tu internet e intentá de nuevo.';
  return 'No se pudo actualizar la contraseña. Intentá de nuevo.';
}

function parseHashParams(hash) {
  if (!hash || !hash.startsWith('#')) return {};
  const params = {};
  hash
    .slice(1)
    .split('&')
    .forEach((part) => {
      const [key, value] = part.split('=');
      if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    });
  return params;
}

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const [theme, , toggleTheme] = useAuthTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setSessionReady(true);
        return;
      }

      if (typeof window === 'undefined') return;
      const params = parseHashParams(window.location.hash);
      const accessToken = params.access_token || params['access_token'];
      const refreshToken = params.refresh_token || params['refresh_token'];
      const type = params.type || params['type'];

      if (type === 'recovery' && accessToken && refreshToken) {
        const { error: setError_ } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (setError_) {
          setLinkInvalid(true);
          return;
        }
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setSessionReady(true);
        return;
      }

      const { data: { session: session2 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session2) {
        setSessionReady(true);
        return;
      }

      setLinkInvalid(true);
    }

    initSession();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyUpdateError(updateError.message));
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(friendlyUpdateError(err?.message));
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

  if (linkInvalid) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors"
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
            </header>
            <div
              className={`p-6 sm:p-8 rounded-2xl border min-w-0 ${isDark ? 'vibe-card' : ''}`}
              style={!isDark ? { borderColor: '#e2e8f0', background: '#f8fafc' } : undefined}
            >
              <p className="text-center font-medium mb-4" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                El link expiró o ya fue usado. Solicitá uno nuevo para recuperar tu contraseña.
              </p>
              <Link
                href="/recuperar-contrasena"
                className="vibe-btn-gradient block w-full rounded-xl py-4 font-bold text-white text-center"
              >
                Solicitar nuevo link
              </Link>
              <p className="text-center mt-4">
                <Link
                  href="/login"
                  className={`text-sm font-bold ${isDark ? 'text-vibe-accent' : 'text-[#00478E]'}`}
                >
                  Volver al login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!sessionReady) {
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

          <div
            className={`p-6 sm:p-8 shadow-xl min-w-0 overflow-hidden rounded-2xl border transition-colors ${isDark ? 'vibe-card' : ''}`}
            style={!isDark ? { borderColor: '#e2e8f0', background: '#f8fafc' } : undefined}
          >
            <h2 className="text-xl font-bold mb-2" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
              Nueva contraseña
            </h2>
            <p className="text-sm mb-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Elegí una contraseña de al menos 6 caracteres.
            </p>

            {success ? (
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                ¡Contraseña actualizada! Ya podés iniciar sesión. Redirigiendo al login...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-6 min-w-0">
                <div className="min-w-0">
                  <label htmlFor="password" className={labelClass}>
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
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
                </div>

                <div className="min-w-0">
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Repetí la contraseña"
                  />
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
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>

                <p className="text-center font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  <Link
                    href="/login"
                    className={`font-bold ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}
                  >
                    Volver al login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
