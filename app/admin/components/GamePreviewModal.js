'use client';

import { X } from 'lucide-react';
import { ADMIN_THEME } from '../constants.js';

export default function GamePreviewModal({ game, authorName, onApprove, onReject, onClose }) {
  if (!game) return null;

  const isPending = game.status === 'pending';

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
          {game.file_url ? (
            <iframe
              src={game.file_url}
              sandbox="allow-scripts allow-same-origin"
              title={game.title || 'Vista previa del juego'}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>
                Sin archivo disponible
              </p>
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
