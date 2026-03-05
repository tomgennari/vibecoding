'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function PendienteContent() {
  const searchParams = useSearchParams();
  const [theme, , toggleTheme] = useAuthTheme();
  const gameTitle = searchParams.get('gameTitle') || 'el juego';

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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eab308]/20 ring-2 ring-[#eab308]/40">
            <svg className="h-9 w-9 text-[#eab308]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: text }}>Pago pendiente</h1>
          <p className="mt-2 text-base" style={{ color: textMuted }}>
            Tu pago para <strong style={{ color: text }}>{decodeURIComponent(gameTitle)}</strong> está pendiente de acreditación.
          </p>
          <p className="mt-3 text-sm" style={{ color: textMuted }}>
            En breve recibirás la confirmación y el juego quedará desbloqueado. Revisá tu correo o volvé al dashboard más tarde.
          </p>
          <Link
            href="/dashboard"
            className="vibe-btn-gradient mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-white"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

export default function PagoPendientePage() {
  return (
    <Suspense fallback={null}>
      <PendienteContent />
    </Suspense>
  );
}
