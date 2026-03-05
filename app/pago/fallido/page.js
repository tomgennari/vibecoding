'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthTheme } from '@/lib/use-auth-theme.js';
import { ThemeToggle } from '@/components/auth-theme-toggle.js';

function FallidoContent() {
  const searchParams = useSearchParams();
  const [theme, , toggleTheme] = useAuthTheme();
  const gameId = searchParams.get('gameId');

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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]/20 ring-2 ring-[#ef4444]/40">
            <svg className="h-9 w-9 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: text }}>Pago no realizado</h1>
          <p className="mt-2 text-base" style={{ color: textMuted }}>
            El pago no pudo completarse. Podés intentar de nuevo desde el dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="vibe-btn-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-white"
            >
              Volver al dashboard
            </Link>
            {gameId && (
              <Link
                href="/dashboard#juegos-dia"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold border transition-colors"
                style={{ borderColor: border, color: text, background: isDark ? '#1e1e28' : '#f1f5f9' }}
              >
                Intentar de nuevo
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PagoFallidoPage() {
  return (
    <Suspense fallback={null}>
      <FallidoContent />
    </Suspense>
  );
}
