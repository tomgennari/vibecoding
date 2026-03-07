'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';

const ORIENTATIONS = [
  { value: 'horizontal', label: '🖥️ Horizontal', desc: 'Pantalla ancha' },
  { value: 'vertical', label: '📱 Vertical', desc: 'Móvil / portrait' },
];

function parseHtmlDimensions(html) {
  if (!html || typeof html !== 'string') return null;
  const str = html.replace(/\s+/g, ' ');
  let w = null, h = null;

  const viewportMatch = str.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i);
  if (viewportMatch) {
    const wm = viewportMatch[1].match(/width\s*=\s*(\d+)/i);
    const hm = viewportMatch[1].match(/height\s*=\s*(\d+)/i);
    if (wm) w = parseInt(wm[1], 10);
    if (hm) h = parseInt(hm[1], 10);
  }
  if ((w == null || h == null) && /<canvas/i.test(str)) {
    const cw = str.match(/<canvas[^>]*\bwidth\s*=\s*["']?(\d+)/i);
    const ch = str.match(/<canvas[^>]*\bheight\s*=\s*["']?(\d+)/i);
    if (cw) w = w ?? parseInt(cw[1], 10);
    if (ch) h = h ?? parseInt(ch[1], 10);
  }
  if (w != null && h != null && w > 0 && h > 0) return { width: w, height: h };
  return null;
}

function getOrientation(w, h) {
  if (!w || !h) return 'horizontal';
  return w >= h ? 'horizontal' : 'vertical';
}

function formatHouseName(house) {
  if (!house) return '';
  return house.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SubirJuegoPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const [profile, setProfile] = useState(null);
  const [stats] = useState({ juegos: 0, tiempoSeconds: 0, puntos: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submittedTitle, setSubmittedTitle] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [detectedSize, setDetectedSize] = useState(null);
  const [orientation, setOrientation] = useState('horizontal');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  const inputStyle = {
    background: isDark ? '#0a0a0f' : '#fff',
    borderColor: border,
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, house')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    }
    init();
  }, [router]);

  function analyzeFile(f) {
    const reader = new FileReader();
    reader.onload = () => {
      const dims = parseHtmlDimensions(reader.result);
      if (dims) {
        setDetectedSize(dims);
        setOrientation(getOrientation(dims.width, dims.height));
      } else {
        setDetectedSize(null);
      }
    };
    reader.readAsText(f);
  }

  function handleFileChange(selected) {
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.html') && !name.endsWith('.zip')) {
      setError('Solo se permiten archivos .html o .zip');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10MB');
      return;
    }
    setError('');
    setFile(selected);
    if (name.endsWith('.html')) analyzeFile(selected);
    else setDetectedSize(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('El nombre del juego es obligatorio'); return; }
    if (!file) { setError('Tenés que subir un archivo .html o .zip'); return; }

    setSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const ext = file.name.toLowerCase().endsWith('.zip') ? 'zip' : 'html';
      const storagePath = `games/${session.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('games')
        .upload(storagePath, file, {
          contentType: ext === 'zip' ? 'application/zip' : 'text/html',
          upsert: false,
        });

      if (uploadError) throw new Error('No se pudo subir el archivo. Intentá de nuevo.');

      const { data: urlData } = supabase.storage.from('games').getPublicUrl(storagePath);

      const w = detectedSize?.width ?? 800;
      const h = detectedSize?.height ?? 600;

      const { error: insertError } = await supabase.from('games').insert({
        title: title.trim(),
        description: description.trim() || null,
        house: profile?.house ?? 'william_brown',
        file_url: urlData.publicUrl,
        status: 'pending',
        submitted_by: session.user.id,
        price: 0,
        game_width: w,
        game_height: h,
        orientation: detectedSize ? getOrientation(w, h) : orientation,
      });

      if (insertError) {
        await supabase.storage.from('games').remove([storagePath]);
        throw new Error('Error al guardar el juego. Intentá de nuevo.');
      }

      setSubmittedTitle(title.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || 'Error inesperado. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setFile(null);
    setDetectedSize(null);
    setOrientation('horizontal');
    setError('');
    setSubmitted(false);
    setSubmittedTitle('');
  }

  if (loading) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <DashboardNavbar profile={profile} stats={stats} theme={theme} onToggleTheme={toggleTheme} onLogout={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: textMuted }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <DashboardNavbar
          profile={profile}
          stats={stats}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="rounded-2xl border p-8 max-w-md w-full text-center" style={{ background: cardBg, borderColor: border }}>
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-2xl font-black mb-2" style={{ color: text }}>¡Juego enviado!</h2>
            <p className="text-sm mb-6" style={{ color: textMuted }}>
              Tu juego{' '}
              <span className="font-bold" style={{ color: text }}>"{submittedTitle}"</span>{' '}
              fue enviado y está esperando aprobación. Un admin lo va a revisar antes de publicarlo.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/juegos"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: accent }}
              >
                Ver juegos
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: border, color: textMuted }}
              >
                Subir otro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        profile={profile}
        stats={stats}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
      />

      <div className="flex-1 overflow-auto px-4 py-6 lg:px-6">
        <div className="max-w-xl mx-auto">

          <div className="mb-6">
            <Link
              href="/juegos"
              className="text-sm font-medium mb-3 inline-flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: textMuted }}
            >
              ← Volver a juegos
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-2" style={{ color: text }}>
              🕹️ Subir mi juego
            </h1>
            {profile && (
              <p className="text-sm mt-1" style={{ color: textMuted }}>
                {profile.first_name} {profile.last_name}
                {profile.house && (
                  <> · Casa <span style={{ color: accent }}>{formatHouseName(profile.house)}</span></>
                )}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                Nombre del juego <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: La aventura de Dante"
                maxLength={80}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                Descripción <span className="normal-case font-normal">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contá de qué trata tu juego..."
                rows={3}
                maxLength={300}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none transition-colors"
                style={inputStyle}
              />
              <p className="text-right text-xs mt-1" style={{ color: textMuted }}>{description.length}/300</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                Orientación
              </label>
              <div className="flex gap-3">
                {ORIENTATIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOrientation(opt.value)}
                    className="flex-1 rounded-xl border-2 p-3 text-left transition-colors"
                    style={{
                      borderColor: orientation === opt.value ? accent : border,
                      background: orientation === opt.value ? `${accent}15` : cardBg,
                    }}
                  >
                    <div className="text-sm font-bold" style={{ color: orientation === opt.value ? accent : text }}>
                      {opt.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: textMuted }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
              {detectedSize && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: '#22c55e' }}>
                  ✓ Dimensiones detectadas automáticamente: {detectedSize.width}×{detectedSize.height}px
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                Archivo del juego <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                ref={inputRef}
                type="file"
                accept=".html,.zip"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="rounded-xl border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? accent : file ? '#22c55e' : border,
                  background: dragOver ? `${accent}10` : file ? '#22c55e10' : cardBg,
                }}
              >
                {file ? (
                  <div>
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{file.name}</p>
                    <p className="text-xs mt-1" style={{ color: textMuted }}>
                      {(file.size / 1024).toFixed(0)} KB · Click para cambiar
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📁</div>
                    <p className="text-sm font-medium" style={{ color: text }}>
                      Arrastrá tu archivo acá o hacé click
                    </p>
                    <p className="text-xs mt-1" style={{ color: textMuted }}>.html o .zip · máximo 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}
              >
                {error}
              </div>
            )}

            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: `${accent}15`, border: `1px solid ${accent}40`, color: textMuted }}
            >
              📋 Tu juego será revisado por un admin antes de publicarse. Normalmente tarda menos de 24hs.
            </div>

            <button
              type="submit"
              disabled={submitting || !file || !title.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: accent }}
            >
              {submitting ? 'Subiendo...' : '🚀 Enviar juego'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}