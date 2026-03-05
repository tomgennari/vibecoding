'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

function RegisterContent() {
  const searchParams = useSearchParams();
  const [theme, , toggleTheme] = useAuthTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('alumno');
  const [house, setHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [urlMessage, setUrlMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setUrlMessage(decodeURIComponent(message));
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!house) {
      setError('Selecciona tu House.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
            house,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          user_type: userType,
          house,
        });

        if (profileError) {
          setError('Cuenta creada pero hubo un error al guardar el perfil: ' + profileError.message);
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      setError(err?.message || 'Error inesperado al registrarse.');
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === 'dark';

  if (success) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors"
          style={{ background: isDark ? '#0a0a0f' : '#ffffff' }}
        >
          <div
            className="w-full max-w-md p-8 text-center rounded-2xl shadow-xl border transition-colors"
            style={
              isDark
                ? { borderColor: '#2a2a3a', background: '#13131a' }
                : { borderColor: '#e2e8f0', background: '#f8fafc' }
            }
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]/20 ring-2 ring-[#7c3aed]/40">
              <svg className="h-9 w-9 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: isDark ? '#f1f5f9' : '#00478E' }}>
              ¡Registro completado!
            </h2>
            <p className="mt-2 text-base" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Revisa tu correo para confirmar tu cuenta y luego inicia sesión.
            </p>
            <Link
              href="/login"
              className="vibe-btn-gradient mt-8 inline-flex items-center justify-center rounded-xl px-8 py-4 font-bold text-white"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </>
    );
  }

  const inputClass = isDark
    ? 'vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium'
    : 'w-full rounded-xl px-4 py-3.5 text-[#0f172a] placeholder-[#64748b]/70 font-medium bg-white border border-[#e2e8f0] transition-all outline-none focus:border-[#00478E] focus:ring-2 focus:ring-[#00478E]/20';
  const labelClass = isDark ? 'block text-xs font-bold text-vibe-text-muted mb-2 uppercase tracking-wider' : 'block text-xs font-bold text-[#64748b] mb-2 uppercase tracking-wider';
  const radioClass = isDark
    ? 'flex flex-1 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-vibe-border bg-vibe-card px-4 py-4 font-bold text-vibe-text-muted transition-all has-[:checked]:border-vibe-accent has-[:checked]:bg-vibe-accent/10 has-[:checked]:text-vibe-text has-[:checked]:shadow-[0_0_20px_rgba(124,58,237,0.3)]'
    : 'flex flex-1 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-4 font-bold text-[#64748b] transition-all has-[:checked]:border-[#7c3aed] has-[:checked]:bg-[#7c3aed]/10 has-[:checked]:text-[#00478E] has-[:checked]:shadow-[0_0_20px_rgba(124,58,237,0.2)]';

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

          {urlMessage && (
            <div
              className="mb-6 p-4 rounded-xl border text-center text-sm font-medium"
              style={{ borderColor: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}
            >
              {urlMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`p-6 sm:p-8 shadow-xl min-w-0 overflow-hidden rounded-2xl border transition-colors ${isDark ? 'vibe-card' : ''}`}
            style={!isDark ? { borderColor: '#e2e8f0', background: '#f8fafc' } : undefined}
          >
            <div className="grid gap-6 min-w-0">
              <div className="grid grid-cols-2 gap-4 min-w-0">
                <div className="min-w-0">
                  <label htmlFor="firstName" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="lastName" className={labelClass}>
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
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
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="min-w-0">
                <label className={labelClass}>
                  Tipo de usuario
                </label>
                <div className="flex gap-3 min-w-0">
                  <label className={radioClass}>
                    <input
                      type="radio"
                      name="userType"
                      value="alumno"
                      checked={userType === 'alumno'}
                      onChange={(e) => setUserType(e.target.value)}
                      className="sr-only"
                    />
                    <span>Alumno</span>
                  </label>
                  <label className={radioClass}>
                    <input
                      type="radio"
                      name="userType"
                      value="padre"
                      checked={userType === 'padre'}
                      onChange={(e) => setUserType(e.target.value)}
                      className="sr-only"
                    />
                    <span>Padre</span>
                  </label>
                </div>
              </div>

              <div className="min-w-0">
                <label className={labelClass}>
                  House
                </label>
                <p className="text-sm mb-3" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Elige tu House (alumnos y padres)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
                  {HOUSES.map((h) => {
                    const selected = house === h.id;
                    const borderColor = isDark ? '#2a2a3a' : '#e2e8f0';
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setHouse(h.id)}
                        className="min-w-0 rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all outline-none overflow-hidden"
                        style={{
                          borderColor: selected ? h.color : borderColor,
                          background: selected ? `${h.color}15` : 'transparent',
                        }}
                      >
                        <Image src={h.image} alt={h.name} width={48} height={48} className="flex-shrink-0 object-contain" />
                        <span className="text-xs font-bold text-center break-words min-w-0 w-full" style={{ color: selected ? h.color : (isDark ? '#94a3b8' : '#64748b') }}>
                          {h.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>

              <p className="text-center text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                Al registrarte aceptás nuestros{' '}
                <Link href="/terminos" className={`font-medium underline ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}>
                  Términos y Condiciones
                </Link>
                {' y '}
                <Link href="/privacidad" className={`font-medium underline ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}>
                  Política de Privacidad
                </Link>
                .
              </p>
            </div>
          </form>

          <p className="mt-8 text-center font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className={`font-bold transition-colors ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
