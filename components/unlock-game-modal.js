'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useUser } from '@/lib/user-context.js';

const PRICE_INDIVIDUAL = 6000;
const MIN_PACK_30 = 50;
const MIN_ALL_ACCESS = 100;

/**
 * Modal de desbloqueo: créditos, individual, packs (MercadoPago).
 * @param {{ isOpen: boolean, onClose: () => void, game: { id: string, title?: string } | null, userCredits: number, hasAllAccess: boolean, isDark?: boolean, onUnlockSuccess?: (game: { id: string, title?: string }) => void }} props
 */
export function UnlockGameModal({
  isOpen,
  onClose,
  game,
  userCredits,
  hasAllAccess,
  isDark = true,
  onUnlockSuccess,
}) {
  const router = useRouter();
  const { mergeProfile, refreshStats } = useUser();
  const [approvedCount, setApprovedCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [mpLoading, setMpLoading] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [toast, setToast] = useState('');

  const cardBg = isDark ? 'var(--vibe-card)' : '#f8fafc';
  const border = 'var(--vibe-border)';
  const text = 'var(--vibe-text)';
  const textMuted = 'var(--vibe-text-muted)';
  const accent = 'var(--vibe-accent)';

  const loadCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const res = await fetch('/api/games/count');
      const data = await res.json().catch(() => ({}));
      setApprovedCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      setApprovedCount(0);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && game) {
      loadCount();
    }
  }, [isOpen, game, loadCount]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async function handleUnlockWithCredit() {
    if (!game?.id || creditLoading) return;
    setCreditLoading(true);
    setToast('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/games/unlock-with-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.error || 'No se pudo desbloquear.');
        return;
      }
      if (typeof data.remaining_credits === 'number') {
        mergeProfile({ unlock_credits: data.remaining_credits });
      }
      await refreshStats();
      setToast('¡Listo! Juego desbloqueado.');
      onUnlockSuccess?.(game);
      setTimeout(() => {
        onClose();
        setToast('');
      }, 800);
    } finally {
      setCreditLoading(false);
    }
  }

  async function startMercadoPago(packType) {
    if (!game?.id || mpLoading) return;
    setMpLoading(packType);
    setToast('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }
      const body =
        packType === 'individual'
          ? {
              gameId: game.id,
              userId: session.user.id,
              gameTitle: game.title || 'Juego',
              gamePrice: PRICE_INDIVIDUAL,
              pack_type: 'individual',
            }
          : {
              userId: session.user.id,
              pack_type: packType,
            };
      const res = await fetch('/api/mp/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.error || 'No se pudo iniciar el pago.');
        return;
      }
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } finally {
      setMpLoading(null);
    }
  }

  if (!isOpen || !game) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        style={{ background: cardBg, borderColor: border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 id="unlock-modal-title" className="text-lg font-bold pr-2" style={{ color: text }}>
            Desbloquear juego
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none px-2 py-1 rounded-lg hover:opacity-80"
            style={{ color: textMuted }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {toast && (
          <div
            className="mb-3 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.35)' }}
          >
            {toast}
          </div>
        )}

        {hasAllAccess ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: textMuted }}>
              Ya tenés ALL ACCESS — podés jugar todos los juegos.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/jugar/${game.id}`);
              }}
              className="vibe-btn-gradient w-full rounded-xl py-3 font-bold text-white"
            >
              Jugar ahora
            </button>
          </div>
        ) : (
          <>
            {userCredits > 0 && (
              <div
                className="mb-5 rounded-xl border-2 p-4"
                style={{ borderColor: accent, background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)' }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: text }}>
                  Tenés {userCredits} crédito{userCredits === 1 ? '' : 's'} disponible{userCredits === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  disabled={creditLoading}
                  onClick={handleUnlockWithCredit}
                  className="w-full rounded-xl py-3 font-bold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
                >
                  {creditLoading ? 'Procesando…' : 'Desbloquear con crédito'}
                </button>
              </div>
            )}

            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
              Comprá juegos para el Campus
            </p>

            <div className="space-y-3">
              <button
                type="button"
                disabled={!!mpLoading}
                onClick={() => startMercadoPago('individual')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{ borderColor: border, background: isDark ? '#0f0f14' : '#fff' }}
              >
                <div className="text-lg font-black" style={{ color: text }}>
                  Desbloquear este juego — ${PRICE_INDIVIDUAL.toLocaleString('es-AR')}
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: textMuted }}>
                  {game.title || 'Juego'}
                </div>
                {mpLoading === 'individual' && <div className="text-xs mt-2" style={{ color: accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading}
                onClick={() => startMercadoPago('pack_10')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{ borderColor: border, background: isDark ? '#0f0f14' : '#fff' }}
              >
                <div className="text-lg font-black" style={{ color: text }}>Pack 10 juegos — $40.000</div>
                <div className="text-xs mt-1" style={{ color: textMuted }}>$4.000 por juego</div>
                {mpLoading === 'pack_10' && <div className="text-xs mt-2" style={{ color: accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading || countLoading || approvedCount < MIN_PACK_30}
                onClick={() => startMercadoPago('pack_30')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-40"
                style={{ borderColor: border, background: isDark ? '#0f0f14' : '#fff' }}
              >
                <div className="text-lg font-black" style={{ color: text }}>Pack 30 juegos — $100.000</div>
                <div className="text-xs mt-1" style={{ color: textMuted }}>$3.333 por juego</div>
                {approvedCount < MIN_PACK_30 && !countLoading && (
                  <div className="text-xs mt-1" style={{ color: '#eab308' }}>Disponible con 50+ juegos en el catálogo</div>
                )}
                {mpLoading === 'pack_30' && <div className="text-xs mt-2" style={{ color: accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading || countLoading || approvedCount < MIN_ALL_ACCESS}
                onClick={() => startMercadoPago('all_access')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-40"
                style={{ borderColor: 'rgba(234,179,8,0.45)', background: isDark ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.06)' }}
              >
                <div className="text-lg font-black" style={{ color: '#eab308' }}>ALL ACCESS — $300.000</div>
                <div className="text-xs mt-1" style={{ color: textMuted }}>Todos los juegos, para siempre</div>
                {approvedCount < MIN_ALL_ACCESS && !countLoading && (
                  <div className="text-xs mt-1" style={{ color: textMuted }}>Disponible con 100+ juegos en el catálogo</div>
                )}
                {mpLoading === 'all_access' && <div className="text-xs mt-2" style={{ color: accent }}>Abriendo MercadoPago…</div>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
