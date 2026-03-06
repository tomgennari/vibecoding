'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client.js';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function friendlyResetError(message) {
  if (!message) return 'No se pudo enviar el email. Intentá de nuevo.';
  const lower = message.toLowerCase();
  if (lower.includes('user not found') || lower.includes('email'))
    return 'No existe una cuenta con ese email. Revisá la dirección o registrate.';
  if (lower.includes('too many'))
    return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Error de conexión. Revisá tu internet e intentá de nuevo.';
  return 'No se pudo enviar el email. Intentá de nuevo más tarde.';
}

export default function RecuperarContrasenaPage() {
  const [theme, , toggleTheme] = useAuthTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
        : process.env.NEXT_PUBLIC_BASE_URL || '';
      const redirectTo = `${baseUrl.replace(/\/$/, '')}/nueva-contrasena`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        setError(friendlyResetError(resetError.message));
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(friendlyResetError(err?.message));
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
              Recuperar contraseña
            </h2>
            <p className="text-sm mb-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Ingresá tu email y te enviamos un link para crear una nueva contraseña.
            </p>

            {success ? (
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 mb-6">
                Te enviamos un email con el link para recuperar tu contraseña. Revisá tu bandeja de entrada.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-6 min-w-0">
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
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            )}

            <p className="text-center font-medium mt-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              <Link
                href="/login"
                className={`font-bold transition-colors ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}
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
