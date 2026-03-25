'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client.js';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (password.length > 16) errors.push('Máximo 16 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Al menos 1 mayúscula');
  if (!/[a-z]/.test(password)) errors.push('Al menos 1 minúscula');
  if (!/[0-9]/.test(password)) errors.push('Al menos 1 número');
  return errors;
}

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: '#3b82f6', image: '/images/houses/house-brown.png' },
  { id: 'james_dodds', name: 'James Dodds', color: '#eab308', image: '/images/houses/house-dodds.png' },
  { id: 'james_fleming', name: 'James Fleming', color: '#ef4444', image: '/images/houses/house-fleming.png' },
  { id: 'john_monteith', name: 'John Monteith', color: '#22c55e', image: '/images/houses/house-monteith.png' },
];

/** Asignación automática en el servidor al house con menos usuarios */
const RANDOM_HOUSE = {
  id: 'random',
  label: 'No tengo House',
};

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

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setError(`La contraseña no cumple los requisitos: ${pwdErrors.join(' · ')}`);
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
        const accessToken = authData.session?.access_token;
        if (accessToken) {
          const res = await fetch('/api/register-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              email,
              user_type: userType,
              house,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(json.error || 'Error al guardar el perfil.');
            setLoading(false);
            return;
          }
          setSuccess(true);
        } else {
          const res = await fetch('/api/register-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              user_type: userType,
              house,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(json.error || 'Error al guardar el perfil.');
            setLoading(false);
            return;
          }
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

  const pwdLenOk = password.length >= 8 && password.length <= 16;
  const pwdUpper = /[A-Z]/.test(password);
  const pwdLower = /[a-z]/.test(password);
  const pwdNum = /[0-9]/.test(password);
  const passwordValid = validatePassword(password).length === 0;

  const pwdReqMetClass = (met) =>
    met
      ? isDark
        ? 'text-green-400 transition-colors duration-200'
        : 'text-green-600 transition-colors duration-200'
      : isDark
        ? 'text-slate-500 transition-colors duration-200'
        : 'text-slate-400 transition-colors duration-200';
  const pwdReqIconClass = (met) =>
    met
      ? isDark
        ? 'text-green-400 transition-colors duration-200'
        : 'text-green-600 transition-colors duration-200'
      : isDark
        ? 'text-slate-500 transition-colors duration-200'
        : 'text-slate-400 transition-colors duration-200';

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

          <p className="mb-6 text-center font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className={`font-bold transition-colors ${isDark ? 'text-vibe-accent hover:text-vibe-accent-secondary' : 'text-[#00478E] hover:text-[#7c3aed]'}`}>
              Iniciar sesión
            </Link>
          </p>

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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Entre 8 y 16 caracteres"
                  autoComplete="new-password"
                />
                <ul className="mt-2 space-y-1.5" aria-label="Requisitos de contraseña">
                  <li className="flex items-center gap-2">
                    {pwdLenOk ? (
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${pwdReqIconClass(true)}`} aria-hidden />
                    ) : (
                      <Circle className={`h-4 w-4 shrink-0 ${pwdReqIconClass(false)}`} aria-hidden />
                    )}
                    <span className={`text-xs ${pwdReqMetClass(pwdLenOk)}`}>8 a 16 caracteres</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {pwdUpper ? (
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${pwdReqIconClass(true)}`} aria-hidden />
                    ) : (
                      <Circle className={`h-4 w-4 shrink-0 ${pwdReqIconClass(false)}`} aria-hidden />
                    )}
                    <span className={`text-xs ${pwdReqMetClass(pwdUpper)}`}>Una letra mayúscula</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {pwdLower ? (
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${pwdReqIconClass(true)}`} aria-hidden />
                    ) : (
                      <Circle className={`h-4 w-4 shrink-0 ${pwdReqIconClass(false)}`} aria-hidden />
                    )}
                    <span className={`text-xs ${pwdReqMetClass(pwdLower)}`}>Una letra minúscula</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {pwdNum ? (
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${pwdReqIconClass(true)}`} aria-hidden />
                    ) : (
                      <Circle className={`h-4 w-4 shrink-0 ${pwdReqIconClass(false)}`} aria-hidden />
                    )}
                    <span className={`text-xs ${pwdReqMetClass(pwdNum)}`}>Un número</span>
                  </li>
                </ul>
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
                <div className="space-y-3 min-w-0">
                  <div className="grid grid-cols-2 gap-3 min-w-0">
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
                  <button
                    type="button"
                    onClick={() => setHouse(RANDOM_HOUSE.id)}
                    className="w-full flex flex-col items-stretch rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all outline-none min-h-0"
                    style={{
                      borderColor: house === RANDOM_HOUSE.id
                        ? '#7c3aed'
                        : (isDark ? '#2a2a3a' : '#e2e8f0'),
                      background: house === RANDOM_HOUSE.id
                        ? (isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.08)')
                        : (isDark ? 'rgba(100, 116, 139, 0.06)' : 'rgba(100, 116, 139, 0.04)'),
                      color: house === RANDOM_HOUSE.id
                        ? (isDark ? '#c4b5fd' : '#7c3aed')
                        : (isDark ? '#94a3b8' : '#64748b'),
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-lg leading-none flex-shrink-0" aria-hidden>
                        🎲
                      </span>
                      <span>{RANDOM_HOUSE.label}</span>
                    </div>
                    <span className="text-xs text-center mt-1 font-normal" style={{ color: '#64748b' }}>
                      Se te asignará uno automáticamente
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !passwordValid}
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
