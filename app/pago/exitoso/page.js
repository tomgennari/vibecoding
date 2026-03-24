'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function ExitosoContent() {
  const searchParams = useSearchParams();
  const [theme, , toggleTheme] = useAuthTheme();
  const gameId = searchParams.get('gameId');
  const gameTitle = searchParams.get('gameTitle') || 'el juego';
  const pack = searchParams.get('pack');

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  return (
    <>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="min-h-screen flex flex-col items-center justify-center p-6 font-sans" style={{ background: bg }}>
        <div className="w-full max-w-md p-8 rounded-2xl border text-center" style={{ background: cardBg, borderColor: border }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e]/20 ring-2 ring-[#22c55e]/40">
            <svg className="h-9 w-9 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: text }}>¡Pago exitoso!</h1>
          {pack ? (
            <p className="mt-2 text-base" style={{ color: textMuted }}>
              Tu compra se registró correctamente. Los créditos o el acceso ALL ACCESS ya están activos en tu cuenta.
            </p>
          ) : (
            <p className="mt-2 text-base" style={{ color: textMuted }}>
              Desbloqueaste <strong style={{ color: text }}>{decodeURIComponent(gameTitle)}</strong> correctamente.
            </p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {pack ? (
              <Link
                href="/juegos"
                className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-white"
              >
                Ir al catálogo de juegos
              </Link>
            ) : gameId ? (
              <Link
                href={`/jugar/${gameId}`}
                className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-white"
              >
                Jugar ahora
              </Link>
            ) : null}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold border transition-colors"
              style={{ borderColor: border, color: text, background: isDark ? '#1e1e28' : '#f1f5f9' }}
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={null}>
      <ExitosoContent />
    </Suspense>
  );
}
