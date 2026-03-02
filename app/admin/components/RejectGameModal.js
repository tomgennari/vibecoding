'use client';

import { useState } from 'react';
import { ADMIN_THEME } from '../constants.js';

export default function RejectGameModal({ gameTitle, onConfirm, onClose }) {
  const [reason, setReason] = useState('');

  const style = {
    overlay: { background: 'rgba(0,0,0,0.7)' },
    card: { background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border },
    text: ADMIN_THEME.text,
    textMuted: ADMIN_THEME.textMuted,
    accent: ADMIN_THEME.accent,
    danger: '#ef4444',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={style.overlay} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border-2 p-6 shadow-xl"
        style={style.card}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: style.text }}>Rechazar juego</h3>
        <p className="text-sm mb-4" style={{ color: style.textMuted }}>
          {gameTitle ? `Motivo del rechazo para "${gameTitle}"` : 'Motivo del rechazo'}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Contenido no apropiado, no cumple las reglas..."
          className="w-full rounded-lg px-3 py-2.5 text-sm min-h-[100px] resize-y border outline-none focus:ring-2"
          style={{
            background: ADMIN_THEME.bg,
            borderColor: ADMIN_THEME.border,
            color: style.text,
          }}
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: style.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: style.danger }}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
