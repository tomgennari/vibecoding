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
  const previewsRef = useRef(null);
  const prevImagesLengthRef = useRef(0);

  useEffect(() => {
    if (!userLoading && !profile) router.replace('/login');
  }, [userLoading, profile, router]);

  useEffect(() => {
    if (images.length > prevImagesLengthRef.current) {
      previewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevImagesLengthRef.current = images.length;
  }, [images.length]);

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
      <div
        className="min-h-screen font-sans flex flex-col bg-[var(--dashboard-bg)]"
        data-dashboard-theme={theme}
      >
        <DashboardNavbar theme={theme} onToggleTheme={toggleTheme} onLogout={() => {}} />
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-[var(--dashboard-text-muted)]">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans flex flex-col bg-[var(--dashboard-bg)] text-[var(--dashboard-text)]"
      data-dashboard-theme={theme}
    >
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-h-0 overflow-auto px-4 py-6 lg:px-6 pb-[60px] lg:pb-6 w-full max-w-2xl mx-auto">
        {submitErrorToast ? (
          <div
            className="fixed top-4 left-4 right-4 z-[70] mx-auto max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg bg-[var(--dashboard-toast-error-bg)] border-[var(--dashboard-toast-error-border)] text-[var(--dashboard-toast-error-text)]"
            role="alert"
          >
            Hubo un error al enviar el mensaje. Por favor intentá de nuevo.
          </div>
        ) : null}

        {success ? (
          <div className="vibe-card p-8 text-center flex flex-col items-center gap-4">
            <CheckCircle2
              className="w-16 h-16 flex-shrink-0 text-[var(--dashboard-success)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <h2 className="text-xl font-bold text-[var(--vibe-text)]">¡Mensaje enviado!</h2>
            <p className="text-sm leading-relaxed max-w-md text-[var(--vibe-text-muted)]">
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
              <h2 className="text-xl font-bold mb-3 text-[var(--vibe-text)]">Soporte</h2>
              <p className="text-sm leading-relaxed mb-4 text-[var(--vibe-text-muted)]">
                ¿Tenés algún problema o sugerencia? Completá el formulario y te responderemos en un plazo de 24 a 48 horas hábiles. Recibirás una copia del mensaje en tu email.
              </p>
              <div className="pt-4 border-t border-[var(--vibe-border)]" />
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="support-subject"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[var(--dashboard-text-muted)]"
                >
                  Asunto
                </label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: No puedo acceder a un juego"
                  className="vibe-input w-full rounded-xl px-4 py-3 text-sm font-medium text-[var(--vibe-text)] placeholder:text-[var(--vibe-text-muted)] placeholder:opacity-70"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="support-message"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[var(--dashboard-text-muted)]"
                >
                  Mensaje
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describí tu consulta o problema con el mayor detalle posible..."
                  rows={6}
                  className="vibe-input w-full rounded-xl px-4 py-3 text-sm font-medium min-h-[120px] resize-y text-[var(--vibe-text)] placeholder:text-[var(--vibe-text-muted)] placeholder:opacity-70"
                />
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[var(--dashboard-text-muted)]">
                  Imágenes <span className="font-normal normal-case opacity-80">(opcional)</span>
                </span>
                <div ref={previewsRef}>
                  {images.length > 0 ? (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {images.map((it) => (
                        <div key={it.id} className="relative inline-flex group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.url}
                            alt=""
                            className="rounded-lg border object-cover border-[var(--dashboard-border)]"
                            style={{ maxHeight: 80 }}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(it.id); }}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md bg-[var(--dashboard-surface)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]"
                            aria-label="Quitar imagen"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {imageError ? (
                  <p className="mb-2 text-sm font-medium text-[var(--dashboard-error)]">{imageError}</p>
                ) : null}
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
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-opacity hover:opacity-95 border-2 border-dashed border-[var(--vibe-border)] rounded-2xl bg-[var(--dashboard-dropzone-bg)]"
                >
                  <ImagePlus className="w-10 h-10 flex-shrink-0 text-[var(--dashboard-text-muted)] stroke-[1.5]" aria-hidden />
                  <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                    Arrastrá imágenes aquí o hacé click para seleccionar
                  </p>
                  <p className="text-xs text-[var(--dashboard-text-muted)]">
                    También podés pegar imágenes con Ctrl+V / Cmd+V
                  </p>
                  <p className="text-[11px] text-[var(--dashboard-text-muted)]">
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
