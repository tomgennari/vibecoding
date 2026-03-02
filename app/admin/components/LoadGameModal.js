'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const DEFAULT_PRICE = 5000;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

function getOrientation(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w > h) return 'horizontal';
  if (h > w) return 'vertical';
  return 'square';
}

function parseHtmlDimensions(html) {
  if (!html || typeof html !== 'string') return null;
  const str = html.replace(/\s+/g, ' ');
  let w = null;
  let h = null;

  const viewportMatch = str.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i) || str.match(/content=["']([^"']*width[^"']*)["'][^>]*name=["']viewport["']/i);
  if (viewportMatch) {
    const content = viewportMatch[1];
    const widthMatch = content.match(/width\s*=\s*(\d+)/i);
    const heightMatch = content.match(/height\s*=\s*(\d+)/i);
    if (widthMatch) w = parseInt(widthMatch[1], 10);
    if (heightMatch) h = parseInt(heightMatch[1], 10);
  }
  if ((w == null || h == null) && /<canvas/i.test(str)) {
    const cw = str.match(/<canvas[^>]*\bwidth\s*=\s*["']?(\d+)/i);
    const ch = str.match(/<canvas[^>]*\bheight\s*=\s*["']?(\d+)/i);
    if (cw) w = w ?? parseInt(cw[1], 10);
    if (ch) h = h ?? parseInt(ch[1], 10);
  }
  if ((w == null || h == null) && /(?:body|html)\s*\{[^}]*\}/i.test(str)) {
    const widthPx = str.match(/(?:body|html|#game|\.game)[^}]*\b(?:width|max-width)\s*:\s*(\d+)\s*px/gi);
    const heightPx = str.match(/(?:body|html|#game|\.game)[^}]*\bheight\s*:\s*(\d+)\s*px/gi);
    if (widthPx && widthPx.length) w = w ?? parseInt(widthPx[0].match(/(\d+)/)[1], 10);
    if (heightPx && heightPx.length) h = h ?? parseInt(heightPx[0].match(/(\d+)/)[1], 10);
  }
  if ((w == null || h == null) && /--(?:game-)?(?:width|height)/i.test(str)) {
    const vw = str.match(/--game-width\s*:\s*(\d+)/i) || str.match(/--width\s*:\s*(\d+)/i);
    const vh = str.match(/--game-height\s*:\s*(\d+)/i) || str.match(/--height\s*:\s*(\d+)/i);
    if (vw) w = w ?? parseInt(vw[1], 10);
    if (vh) h = h ?? parseInt(vh[1], 10);
  }

  if (w != null && h != null && w > 0 && h > 0) return { width: w, height: h };
  return null;
}

function IconUpload() {
  return (
    <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export default function LoadGameModal({ game: editGame, onSave, onClose }) {
  const isEdit = Boolean(editGame?.id);
  const [title, setTitle] = useState(editGame?.title ?? '');
  const [description, setDescription] = useState(editGame?.description ?? '');
  const [house, setHouse] = useState(editGame?.house ?? 'william_brown');
  const [price, setPrice] = useState(editGame?.price != null ? String(editGame.price) : String(DEFAULT_PRICE));
  const [file, setFile] = useState(null);
  const [detectedSize, setDetectedSize] = useState(null);
  const [manualWidth, setManualWidth] = useState(String(DEFAULT_WIDTH));
  const [manualHeight, setManualHeight] = useState(String(DEFAULT_HEIGHT));
  const [showManualFields, setShowManualFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editGame) {
      setTitle(editGame.title ?? '');
      setDescription(editGame.description ?? '');
      setHouse(editGame.house ?? 'william_brown');
      setPrice(editGame.price != null ? String(editGame.price) : String(DEFAULT_PRICE));
      const gw = editGame.game_width ?? DEFAULT_WIDTH;
      const gh = editGame.game_height ?? DEFAULT_HEIGHT;
      setManualWidth(String(gw));
      setManualHeight(String(gh));
      setDetectedSize(editGame.game_width != null ? { width: gw, height: gh } : null);
      setShowManualFields(editGame.game_width == null && editGame.game_height == null);
    }
  }, [editGame]);

  const style = {
    overlay: { background: 'rgba(0,0,0,0.7)' },
    card: { background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border },
    text: ADMIN_THEME.text,
    textMuted: ADMIN_THEME.textMuted,
    input: { background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text },
  };

  function runAnalysis(fileObj) {
    if (!fileObj) {
      setDetectedSize(null);
      setShowManualFields(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const html = reader.result;
      const dims = parseHtmlDimensions(html);
      if (dims) {
        setDetectedSize(dims);
        setShowManualFields(false);
        setManualWidth(String(dims.width));
        setManualHeight(String(dims.height));
      } else {
        setDetectedSize(null);
        setShowManualFields(true);
        setManualWidth(String(DEFAULT_WIDTH));
        setManualHeight(String(DEFAULT_HEIGHT));
      }
    };
    reader.readAsText(fileObj);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    runAnalysis(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith('.html') || f.type === 'text/html')) {
      setFile(f);
      runAnalysis(f);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!isEdit && !file) {
      setError('Subí un archivo .html para cargar el juego.');
      return;
    }
    let w = DEFAULT_WIDTH;
    let h = DEFAULT_HEIGHT;
    if (detectedSize) {
      w = detectedSize.width;
      h = detectedSize.height;
    } else if (isEdit && editGame?.game_width != null && editGame?.game_height != null && !file) {
      w = editGame.game_width;
      h = editGame.game_height;
    } else {
      w = Number(manualWidth) || DEFAULT_WIDTH;
      h = Number(manualHeight) || DEFAULT_HEIGHT;
    }
    const orientation = getOrientation(w, h);

    setSaving(true);
    try {
      await onSave({
        id: editGame?.id,
        title: title.trim(),
        description: description.trim(),
        house,
        price: Number(price) || DEFAULT_PRICE,
        file: file || null,
        game_width: w,
        game_height: h,
        orientation,
      });
      onClose();
    } catch (err) {
      setError(err?.message || (isEdit ? 'Error al guardar.' : 'Error al cargar el juego.'));
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
        <h3 className="text-lg font-bold mb-4" style={{ color: style.text }}>{isEdit ? 'Editar juego' : 'Cargar juego'}</h3>
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
              ref={inputRef}
              type="file"
              accept=".html"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed py-6 px-4 text-center cursor-pointer transition-colors"
              style={{
                borderColor: dragOver ? ADMIN_THEME.accent : ADMIN_THEME.accent,
                background: dragOver ? `${ADMIN_THEME.accent}10` : 'transparent',
                color: style.textMuted,
              }}
            >
              {file ? (
                <p className="text-sm font-medium flex items-center justify-center gap-2" style={{ color: '#22c55e' }}>
                  <span className="inline-block w-5 h-5 rounded-full bg-[#22c55e] text-white flex items-center justify-center text-xs">✓</span>
                  {file.name}
                </p>
              ) : (
                <>
                  <IconUpload />
                  <p className="mt-2 text-sm">Hacé clic o arrastrá tu archivo .html aquí</p>
                  {isEdit && <p className="mt-1 text-xs opacity-80">Si no subís uno nuevo se mantiene el actual</p>}
                </>
              )}
            </div>
            {(file || (isEdit && (editGame?.game_width != null || showManualFields))) && (
              <div className="mt-2 space-y-2">
                {detectedSize && !showManualFields ? (
                  <p className="text-sm flex items-center gap-2" style={{ color: '#22c55e' }}>
                    <span className="inline-flex w-5 h-5 rounded-full bg-[#22c55e] text-white items-center justify-center text-xs flex-shrink-0">✓</span>
                    Detectado: {detectedSize.width}×{detectedSize.height}px — {getOrientation(detectedSize.width, detectedSize.height) === 'horizontal' ? 'Horizontal' : getOrientation(detectedSize.width, detectedSize.height) === 'vertical' ? 'Vertical' : 'Cuadrado'}
                  </p>
                ) : showManualFields || (isEdit && editGame?.game_width == null) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: style.textMuted }}>Ancho (px)</label>
                      <input
                        type="number"
                        value={manualWidth}
                        onChange={(e) => setManualWidth(e.target.value)}
                        min={1}
                        className="w-full rounded-lg px-2 py-1.5 text-sm border"
                        style={style.input}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: style.textMuted }}>Alto (px)</label>
                      <input
                        type="number"
                        value={manualHeight}
                        onChange={(e) => setManualHeight(e.target.value)}
                        min={1}
                        className="w-full rounded-lg px-2 py-1.5 text-sm border"
                        style={style.input}
                      />
                    </div>
                  </div>
                ) : isEdit && editGame?.game_width != null ? (
                  <p className="text-sm flex items-center gap-2" style={{ color: style.textMuted }}>
                    <span className="inline-flex w-5 h-5 rounded-full bg-[#22c55e] text-white items-center justify-center text-xs flex-shrink-0">✓</span>
                    {editGame.game_width}×{editGame.game_height}px — {editGame.orientation === 'horizontal' ? 'Horizontal' : editGame.orientation === 'vertical' ? 'Vertical' : 'Cuadrado'}
                  </p>
                ) : null}
              </div>
            )}
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
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Cargar juego'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
