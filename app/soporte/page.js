'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ImagePlus,
  Send,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';
import { useUser } from '@/lib/user-context.js';

const MAX_IMAGES = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}

export default function SoportePage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, loading: userLoading } = useUser();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitErrorToast, setSubmitErrorToast] = useState(false);

  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#00478E';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';

  useEffect(() => {
    if (!userLoading && !profile) router.replace('/login');
  }, [userLoading, profile, router]);

  useEffect(() => {
    if (!submitErrorToast) return;
    const t = setTimeout(() => setSubmitErrorToast(false), 6000);
    return () => clearTimeout(t);
  }, [submitErrorToast]);

  const imagesRef = useRef([]);
  imagesRef.current = images;

  useEffect(() => () => {
    imagesRef.current.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
  }, []);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    for (const f of incoming) {
      if (f.size > MAX_FILE_BYTES) {
        setImageError('Cada imagen debe pesar como máximo 2MB.');
        return;
      }
    }

    setImageError('');
    setImages((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_IMAGES) {
          setImageError(`Máximo ${MAX_IMAGES} imágenes.`);
          break;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: f,
          url: URL.createObjectURL(f),
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    function onPaste(e) {
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  function removeImage(id) {
    setImages((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((x) => x.id !== id);
    });
    setImageError('');
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    addFiles(e.dataTransfer?.files || []);
  }

  async function handleSend() {
    const sub = subject.trim();
    const msg = message.trim();
    if (!sub || !msg) return;

    setSending(true);
    setSubmitErrorToast(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const base64List = await Promise.all(images.map((it) => fileToDataUrl(it.file)));

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          subject: sub,
          message: msg,
          images: base64List.length ? base64List : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setSubmitErrorToast(true);
        return;
      }

      images.forEach((it) => {
        if (it.url) URL.revokeObjectURL(it.url);
      });
      setImages([]);
      setSuccess(true);
    } catch {
      setSubmitErrorToast(true);
    } finally {
      setSending(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (userLoading || !profile) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <DashboardNavbar theme={theme} onToggleTheme={toggleTheme} onLogout={() => {}} />
        <div className="flex-1 flex items-center justify-center p-8">
          <p style={{ color: textMuted }}>Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg, color: text }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div
        className="flex-1 min-h-0 overflow-auto px-4 py-6 lg:px-6 pb-[60px] lg:pb-6 w-full max-w-2xl mx-auto"
        style={{ color: text }}
      >
        {submitErrorToast ? (
          <div
            className="fixed top-4 left-4 right-4 z-[70] mx-auto max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
            style={{
              background: 'rgba(127,29,29,0.95)',
              borderColor: '#f87171',
              color: '#fecaca',
            }}
            role="alert"
          >
            Hubo un error al enviar el mensaje. Por favor intentá de nuevo.
          </div>
        ) : null}

        {success ? (
          <div className="vibe-card p-8 text-center flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 flex-shrink-0" style={{ color: '#22c55e' }} strokeWidth={1.75} aria-hidden />
            <h2 className="text-xl font-bold" style={{ color: text }}>¡Mensaje enviado!</h2>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: textMuted }}>
              Tu consulta fue enviada correctamente. Recibirás una copia en tu email y te responderemos en 24 a 48 horas hábiles.
            </p>
            <Link
              href="/dashboard"
              className="vibe-btn-secondary inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-sm mt-2"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <div className="vibe-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-3" style={{ color: text }}>Soporte</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: textMuted }}>
                ¿Tenés algún problema o sugerencia? Completá el formulario y te responderemos en un plazo de 24 a 48 horas hábiles. Recibirás una copia del mensaje en tu email.
              </p>
              <div className="pt-4" style={{ borderTop: `1px solid var(--vibe-border, ${border})` }} />
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="support-subject" className="block text-sm font-bold mb-2" style={{ color: text }}>
                  Asunto
                </label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: No puedo acceder a un juego"
                  className="vibe-input w-full rounded-xl px-4 py-3 text-sm font-medium placeholder:text-vibe-text-muted/60"
                  style={{ color: text }}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="support-message" className="block text-sm font-bold mb-2" style={{ color: text }}>
                  Mensaje
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describí tu consulta o problema con el mayor detalle posible..."
                  rows={6}
                  className="vibe-input w-full rounded-xl px-4 py-3 text-sm font-medium placeholder:text-vibe-text-muted/60 min-h-[120px] resize-y"
                  style={{ color: text }}
                />
              </div>

              <div>
                <span className="block text-sm font-bold mb-2" style={{ color: text }}>
                  Imágenes <span className="font-normal opacity-80">(opcional)</span>
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-colors hover:opacity-95"
                  style={{
                    border: '2px dashed var(--vibe-border)',
                    borderRadius: '1rem',
                    background: isDark ? 'rgba(19,19,26,0.5)' : '#f8fafc',
                  }}
                >
                  <ImagePlus className="w-10 h-10 flex-shrink-0" style={{ color: textMuted }} strokeWidth={1.5} aria-hidden />
                  <p className="text-sm font-semibold" style={{ color: text }}>
                    Arrastrá imágenes aquí o hacé click para seleccionar
                  </p>
                  <p className="text-xs" style={{ color: textMuted }}>
                    También podés pegar imágenes con Ctrl+V / Cmd+V
                  </p>
                  <p className="text-[11px]" style={{ color: textMuted }}>
                    Máximo 3 imágenes, 2MB cada una. Formatos: PNG, JPG, GIF
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                {imageError ? (
                  <p className="mt-2 text-sm font-medium" style={{ color: '#f87171' }}>{imageError}</p>
                ) : null}
                {images.length > 0 ? (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {images.map((it) => (
                      <div key={it.id} className="relative inline-flex group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt="" className="rounded-lg border object-cover" style={{ maxHeight: 80, borderColor: border }} />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(it.id); }}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md"
                          style={{ background: isDark ? '#13131a' : '#f8fafc', borderColor: border, color: text }}
                          aria-label="Quitar imagen"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                disabled={sending || !subject.trim() || !message.trim()}
                onClick={handleSend}
                className="vibe-btn-gradient w-full rounded-xl py-3.5 font-bold text-white text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" aria-hidden />
                    Enviar mensaje
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <MobileBottomNav theme={theme} activeTabId="" />
    </div>
  );
}
