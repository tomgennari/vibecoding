'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { useUser } from '@/lib/user-context.js';
import { PRICING } from '@/lib/pricing.js';

const MIN_PACK_30 = 50;
const MIN_ALL_ACCESS = 100;

/** Tema oscuro fijo del modal (legible siempre, independiente del modo de la página). */
const DM = {
  card: '#13131a',
  cardInner: '#0f0f14',
  border: '#2a2a3a',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#a78bfa',
  gold: '#fde047',
  goldMuted: '#facc15',
};

/**
 * Modal de desbloqueo: créditos, individual, packs (MercadoPago).
 * @param {{ isOpen: boolean, onClose: () => void, game: { id: string, title?: string } | null, userCredits: number, hasAllAccess: boolean, onUnlockSuccess?: (game: { id: string, title?: string }) => void }} props
 */
export function UnlockGameModal({
  isOpen,
  onClose,
  game,
  userCredits,
  hasAllAccess,
  onUnlockSuccess,
}) {
  const router = useRouter();
  const { mergeProfile, refreshStats } = useUser();
  const [approvedCount, setApprovedCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [mpLoading, setMpLoading] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [toast, setToast] = useState('');

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
              gamePrice: PRICING.INDIVIDUAL,
              pack_type: 'individual',
            }
          : {
              userId: session.user.id,
              pack_type: packType,
              gameId: game.id,
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

  const fmt = (n) => PRICING[n] != null ? PRICING[n].toLocaleString('es-AR') : '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        style={{ background: DM.card, borderColor: DM.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 id="unlock-modal-title" className="text-lg font-bold pr-2" style={{ color: DM.text }}>
            Desbloquear juego
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none px-2 py-1 rounded-lg border transition-opacity hover:opacity-90"
            style={{ color: DM.text, borderColor: DM.border, background: DM.cardInner }}
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
            <p className="text-sm" style={{ color: DM.textMuted }}>
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
                style={{ borderColor: DM.accent, background: 'rgba(124,58,237,0.18)' }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: DM.text }}>
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

            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DM.textMuted }}>
              Comprá juegos para el Campus
            </p>

            <div className="space-y-3">
              <button
                type="button"
                disabled={!!mpLoading}
                onClick={() => startMercadoPago('individual')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{ borderColor: DM.border, background: DM.cardInner }}
              >
                <div className="text-lg font-black" style={{ color: DM.text }}>
                  Desbloquear este juego — ${fmt('INDIVIDUAL')} ARS
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: DM.textMuted }}>
                  {game.title || 'Juego'}
                </div>
                {mpLoading === 'individual' && <div className="text-xs mt-2" style={{ color: DM.accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading}
                onClick={() => startMercadoPago('pack_10')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{ borderColor: DM.border, background: DM.cardInner }}
              >
                <div className="text-lg font-black" style={{ color: DM.text }}>Pack 10 juegos — ${fmt('PACK_10')} ARS</div>
                <div className="text-xs mt-1" style={{ color: DM.textMuted }}>$4.000 por juego</div>
                {mpLoading === 'pack_10' && <div className="text-xs mt-2" style={{ color: DM.accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading || countLoading || approvedCount < MIN_PACK_30}
                onClick={() => startMercadoPago('pack_30')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-40"
                style={{ borderColor: DM.border, background: DM.cardInner }}
              >
                <div className="text-lg font-black" style={{ color: DM.text }}>Pack 30 juegos — ${fmt('PACK_30')} ARS</div>
                <div className="text-xs mt-1" style={{ color: DM.textMuted }}>$3.333 por juego</div>
                {approvedCount < MIN_PACK_30 && !countLoading && (
                  <div className="text-xs mt-1" style={{ color: DM.goldMuted }}>Disponible con 50+ juegos en el catálogo</div>
                )}
                {mpLoading === 'pack_30' && <div className="text-xs mt-2" style={{ color: DM.accent }}>Abriendo MercadoPago…</div>}
              </button>

              <button
                type="button"
                disabled={!!mpLoading || countLoading || approvedCount < MIN_ALL_ACCESS}
                onClick={() => startMercadoPago('all_access')}
                className="w-full text-left rounded-xl border p-4 transition-opacity hover:opacity-95 disabled:opacity-40"
                style={{ borderColor: 'rgba(250,204,21,0.45)', background: 'rgba(234,179,8,0.1)' }}
              >
                <div className="text-lg font-black" style={{ color: DM.gold }}>ALL ACCESS — ${fmt('ALL_ACCESS')} ARS</div>
                <div className="text-xs mt-1" style={{ color: DM.textMuted }}>Todos los juegos, para siempre</div>
                {approvedCount < MIN_ALL_ACCESS && !countLoading && (
                  <div className="text-xs mt-1" style={{ color: DM.textMuted }}>Disponible con 100+ juegos en el catálogo</div>
                )}
                {mpLoading === 'all_access' && <div className="text-xs mt-2" style={{ color: DM.accent }}>Abriendo MercadoPago…</div>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
