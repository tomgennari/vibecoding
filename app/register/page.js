'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase.js';

const HOUSES = [
  { id: 'william_brown', name: 'William Brown', color: 'azul', colorClass: 'bg-vibe-house-wb' },
  { id: 'james_dodds', name: 'James Dodds', color: 'amarillo', colorClass: 'bg-vibe-house-jd' },
  { id: 'james_fleming', name: 'James Fleming', color: 'rojo', colorClass: 'bg-vibe-house-jf' },
  { id: 'john_monteith', name: 'John Monteith', color: 'verde', colorClass: 'bg-vibe-house-jm' },
];

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('alumno');
  const [house, setHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (userType === 'alumno' && !house) {
      setError('Selecciona una House si eres alumno.');
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
            house: userType === 'alumno' ? house : null,
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
          house: userType === 'alumno' ? house : null,
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

  if (success) {
    return (
      <div className="min-h-screen bg-vibe-bg flex flex-col items-center justify-center p-6">
        <div className="vibe-card w-full max-w-md p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-vibe-accent/20 ring-2 ring-vibe-accent/40">
            <svg className="h-9 w-9 text-vibe-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-vibe-text tracking-tight">¡Registro completado!</h2>
          <p className="mt-2 text-vibe-text-muted text-base">
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
    );
  }

  return (
    <div className="min-h-screen bg-vibe-bg flex flex-col items-center justify-center p-6 overflow-x-hidden">
      <div className="w-full max-w-lg min-w-0">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-vibe-text tracking-tight uppercase">
            VibeCoding
          </h1>
          <p className="mt-3 text-vibe-text-muted text-lg font-medium">Crea tu cuenta</p>
        </header>

        <form onSubmit={handleSubmit} className="vibe-card p-6 sm:p-8 shadow-2xl min-w-0 overflow-hidden">
          <div className="grid gap-6 min-w-0">
            <div className="grid grid-cols-2 gap-4 min-w-0">
              <div className="min-w-0">
                <label htmlFor="firstName" className="block text-sm font-bold text-vibe-text-muted mb-2 uppercase tracking-wider">
                  Nombre
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium"
                  placeholder="Tu nombre"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="lastName" className="block text-sm font-bold text-vibe-text-muted mb-2 uppercase tracking-wider">
                  Apellido
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="email" className="block text-sm font-bold text-vibe-text-muted mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium"
                placeholder="tu@correo.com"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="password" className="block text-sm font-bold text-vibe-text-muted mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vibe-input w-full rounded-xl px-4 py-3.5 text-vibe-text placeholder-vibe-text-muted/60 font-medium"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-bold text-vibe-text-muted mb-3 uppercase tracking-wider">
                Tipo de usuario
              </label>
              <div className="flex gap-3 min-w-0">
                <label className="flex flex-1 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-vibe-border bg-vibe-card px-4 py-4 font-bold text-vibe-text-muted transition-all has-[:checked]:border-vibe-accent has-[:checked]:bg-vibe-accent/10 has-[:checked]:text-vibe-text has-[:checked]:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
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
                <label className="flex flex-1 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-vibe-border bg-vibe-card px-4 py-4 font-bold text-vibe-text-muted transition-all has-[:checked]:border-vibe-accent has-[:checked]:bg-vibe-accent/10 has-[:checked]:text-vibe-text has-[:checked]:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
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

            {userType === 'alumno' && (
              <div className="min-w-0">
                <label className="block text-sm font-bold text-vibe-text-muted mb-3 uppercase tracking-wider">
                  House
                </label>
                <p className="text-vibe-text-muted text-sm mb-3">Toca el nombre de tu House para seleccionarla</p>
                <div className="flex flex-nowrap gap-2 sm:gap-3 min-w-0 px-2 py-2">
                  {HOUSES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHouse(h.id)}
                      className={`flex-1 min-w-0 inline-flex items-center justify-center rounded-xl px-2 sm:px-4 py-3 text-xs sm:text-sm font-bold text-white transition-all truncate outline-none ${h.colorClass} ${house === h.id ? 'ring-2 ring-vibe-text ring-offset-2 ring-offset-vibe-card shadow-lg' : 'opacity-90 hover:opacity-100'}`}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        </form>

        <p className="mt-8 text-center text-vibe-text-muted font-medium">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold text-vibe-accent hover:text-vibe-accent-secondary transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
