'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GatePage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        router.push('/');
        router.refresh();
        return;
      }
      setError(data.error || 'Código incorrecto');
    } catch {
      setError('No se pudo verificar. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--vibe-bg)' }}
    >
      <p className="text-xs mb-8 tracking-wide" style={{ color: 'var(--vibe-text-muted)' }}>
        Acceso restringido
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Código de acceso"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:ring-2 transition-shadow"
          style={{
            background: 'var(--vibe-card)',
            borderColor: 'var(--vibe-border)',
            color: 'var(--vibe-text)',
          }}
        />
        {error ? (
          <p className="text-xs text-center" style={{ color: '#f87171' }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="vibe-btn-gradient w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
