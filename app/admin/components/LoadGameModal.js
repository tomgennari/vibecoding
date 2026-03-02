'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const DEFAULT_PRICE = 5000;

export default function LoadGameModal({ onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [house, setHouse] = useState('william_brown');
  const [price, setPrice] = useState(String(DEFAULT_PRICE));
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const style = {
    overlay: { background: 'rgba(0,0,0,0.7)' },
    card: { background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border },
    text: ADMIN_THEME.text,
    textMuted: ADMIN_THEME.textMuted,
    input: { background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), house, price: Number(price) || DEFAULT_PRICE, file });
      onClose();
    } catch (err) {
      setError(err?.message || 'Error al cargar el juego.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={style.overlay} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border-2 p-6 shadow-xl my-4"
        style={style.card}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4" style={{ color: style.text }}>Cargar juego</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: style.textMuted }}>Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-offset-0"
              style={{ ...style.input, focusRing: ADMIN_THEME.accent }}
              placeholder="Nombre del juego"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: style.textMuted }}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm border min-h-[80px] resize-y outline-none focus:ring-2 focus:ring-offset-0"
              style={style.input}
              placeholder="Breve descripción"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: style.textMuted }}>House</label>
            <div className="grid grid-cols-4 gap-2">
              {HOUSES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHouse(h.id)}
                  className="rounded-lg border-2 p-2 flex flex-col items-center gap-1 min-w-0"
                  style={{
                    borderColor: house === h.id ? h.color : ADMIN_THEME.border,
                    background: house === h.id ? `${h.color}15` : 'transparent',
                  }}
                >
                  <Image src={h.image} alt={h.name} width={32} height={32} className="object-contain" />
                  <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: h.color }}>{h.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: style.textMuted }}>Precio (ARS)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              className="w-full rounded-lg px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-offset-0"
              style={style.input}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: style.textMuted }}>Archivo .html</label>
            <input
              type="file"
              accept=".html"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
              style={{ color: style.text }}
            />
          </div>
          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: style.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: ADMIN_THEME.accent }}
            >
              {saving ? 'Guardando...' : 'Cargar juego'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
