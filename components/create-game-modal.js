'use client';

import { useRouter } from 'next/navigation';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { useCreateGameModal } from '@/lib/create-game-context.js';

function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function CreateGameModal() {
  const router = useRouter();
  const [theme] = useDashboardTheme();
  const { isCreateGameModalOpen, closeCreateGameModal } = useCreateGameModal();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';

  function handleSubirClick() {
    closeCreateGameModal();
    router.push('/juegos/subir');
  }

  function handleGameLabClick() {
    closeCreateGameModal();
    router.push('/game-lab');
  }

  if (!isCreateGameModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={closeCreateGameModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-game-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-xl border p-6 shadow-xl"
        style={{ background: cardBg, borderColor: border }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeCreateGameModal}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: textMuted }}
        >
          <IconClose />
        </button>
        <h2 id="create-game-modal-title" className="text-lg font-bold mb-4 pr-8" style={{ color: text }}>
          Crea tu juego
        </h2>

        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ borderColor: border, background: isDark ? '#0f0f14' : '#ffffff' }}>
            <h3 className="font-bold mb-1" style={{ color: text }}>🤖 Crear con IA</h3>
            <p className="text-sm mb-3" style={{ color: textMuted }}>
              Chateá con Andy y describí tu juego. La IA genera el HTML por vos.
            </p>
            <button
              type="button"
              onClick={handleGameLabClick}
              className="vibe-btn-gradient rounded-xl px-4 py-2 text-sm font-bold text-white"
            >
              Ir al Game Lab
            </button>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: border, background: isDark ? '#0f0f14' : '#ffffff' }}>
            <h3 className="font-bold mb-1" style={{ color: text }}>🕹️ Subir mi juego</h3>
            <p className="text-sm mb-3" style={{ color: textMuted }}>
              Ya tenés tu juego listo y querés subirlo.
            </p>
            <button
              type="button"
              onClick={handleSubirClick}
              className="vibe-btn-gradient rounded-xl px-4 py-2 text-sm font-bold text-white"
            >
              Subir mi juego
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
