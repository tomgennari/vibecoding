'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ADMIN_THEME } from '../constants.js';

export default function GamePreviewModal({ game, authorName, onApprove, onReject, onClose }) {
  const [htmlContent, setHtmlContent] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!game?.file_url) return;
    let cancelled = false;
    setHtmlContent(null);
    setLoadError(false);

    fetch(game.file_url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then((html) => { if (!cancelled) setHtmlContent(html); })
      .catch(() => { if (!cancelled) setLoadError(true); });

    return () => { cancelled = true; };
  }, [game?.file_url]);

  if (!game) return null;

  const isPending = game.status === 'pending';
  const loading = game.file_url && htmlContent === null && !loadError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border-2 p-5 shadow-xl flex flex-col max-h-[95vh]"
        style={{ background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: ADMIN_THEME.textMuted }}
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold pr-8 mb-1 truncate" style={{ color: ADMIN_THEME.text }}>
          {game.title || 'Sin título'}
        </h3>
        <p className="text-sm mb-4 truncate" style={{ color: ADMIN_THEME.textMuted }}>
          por {authorName || 'Desconocido'}
        </p>

        <div
          className="relative w-full rounded-lg overflow-hidden border flex-shrink-0"
          style={{
            aspectRatio: '480 / 640',
            borderColor: ADMIN_THEME.border,
            background: ADMIN_THEME.bg,
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin" style={{ color: ADMIN_THEME.accent }} />
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Cargando juego…</p>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#ef4444' }}>Error al cargar el juego</p>
            </div>
          )}
          {htmlContent && (
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin"
              title={game.title || 'Vista previa del juego'}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          )}
          {!game.file_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Sin archivo disponible</p>
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 mt-4 justify-end">
            <button
              type="button"
              onClick={() => onApprove(game.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#22c55e' }}
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => onReject({ id: game.id, title: game.title })}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#ef4444' }}
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
