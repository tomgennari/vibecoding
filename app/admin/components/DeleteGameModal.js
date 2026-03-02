'use client';

import { ADMIN_THEME } from '../constants.js';

export default function DeleteGameModal({ gameTitle, onConfirm, onClose }) {
  const style = {
    overlay: { background: 'rgba(0,0,0,0.7)' },
    card: { background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border },
    text: ADMIN_THEME.text,
    textMuted: ADMIN_THEME.textMuted,
    danger: '#ef4444',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={style.overlay} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border-2 p-6 shadow-xl"
        style={style.card}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: style.text }}>Eliminar juego</h3>
        <p className="text-sm mb-4" style={{ color: style.textMuted }}>
          ¿Estás seguro que querés eliminar {gameTitle ? `"${gameTitle}"` : 'este juego'}? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: style.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: style.danger }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
