'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Loader2, Code, Gamepad2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME } from '../constants.js';
import { prepareGameHtml } from '@/lib/game-security.js';
import { scanGameHtml } from '@/lib/game-scan.js';

const MAX_FILE_BYTES = 500 * 1024;

export default function GamePreviewModal({
  game,
  authorName,
  onApprove,
  onReject,
  onClose,
  analyzing = false,
  analysisResult = null,
  onAnalyze,
  onHtmlUpdated,
  onSecurityScanResult,
}) {
  const [editedHtml, setEditedHtml] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [verCodigo, setVerCodigo] = useState(false);
  const baselineRef = useRef('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const replaceInputRef = useRef(null);
  const [scanPanelOpen, setScanPanelOpen] = useState(false);
  const [scanDetailIdx, setScanDetailIdx] = useState(() => ({}));

  const scanResult = useMemo(() => {
    if (editedHtml == null || typeof editedHtml !== 'string') return null;
    return scanGameHtml(editedHtml);
  }, [editedHtml]);

  useEffect(() => {
    if (!game?.id || !scanResult) return;
    onSecurityScanResult?.(game.id, scanResult.summary);
  }, [game?.id, scanResult, onSecurityScanResult]);

  useEffect(() => {
    if (scanResult?.summary === 'blocked') setScanPanelOpen(true);
    if (scanResult?.summary === 'warnings') setScanPanelOpen(false);
  }, [scanResult?.summary, game?.id]);

  useEffect(() => {
    setScanDetailIdx({});
  }, [game?.id, editedHtml]);

  useEffect(() => {
    if (!game?.file_url) {
      setEditedHtml(null);
      baselineRef.current = '';
      return;
    }
    let cancelled = false;
    setEditedHtml(null);
    setLoadError(false);

    fetch(game.file_url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        setEditedHtml(html);
        baselineRef.current = html;
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [game?.file_url]);

  async function postUpdateHtml(body) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sin sesión');
    const res = await fetch('/api/admin/juegos/update-html', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `Error ${res.status}`);
  }

  const handleSaveHtml = useCallback(async () => {
    if (editedHtml == null || !game?.id) return;
    setSaveMsg('');
    setSaving(true);
    try {
      await postUpdateHtml({ gameId: game.id, html: editedHtml });
      baselineRef.current = editedHtml;
      setSaveMsg('✅ HTML actualizado');
      onHtmlUpdated?.();
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) {
      setSaveMsg(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [editedHtml, game, onHtmlUpdated]);

  async function handleReplaceFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.html')) {
      setSaveMsg('Solo archivos .html');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSaveMsg('El archivo supera 500KB');
      return;
    }
    setSaveMsg('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('gameId', game.id);
      fd.set('file', file);
      await postUpdateHtml(fd);
      const text = await file.text();
      baselineRef.current = text;
      setEditedHtml(text);
      setSaveMsg('✅ HTML reemplazado');
      onHtmlUpdated?.();
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err) {
      setSaveMsg(err.message || 'Error al subir');
    } finally {
      setSaving(false);
    }
  }

  if (!game) return null;

  const isDirty = game.file_url && editedHtml != null && editedHtml !== baselineRef.current;
  const createdWithAndy = typeof game.file_url === 'string' && game.file_url.toLowerCase().includes('game-lab');
  const loading = game.file_url && editedHtml === null && !loadError;
  const isPending = game.status === 'pending';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-xl border-2 p-5 shadow-xl flex flex-col max-h-[92vh] overflow-y-auto"
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-sm truncate" style={{ color: ADMIN_THEME.textMuted }}>
            por {authorName || 'Desconocido'}
          </p>
          {editedHtml && game.file_url && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setVerCodigo((v) => !v)}
                className="vibe-btn-secondary flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                style={{ color: ADMIN_THEME.accent, border: `1px solid ${ADMIN_THEME.accent}` }}
              >
                {verCodigo ? <><Gamepad2 size={14} /> Ver juego</> : <><Code size={14} /> Ver código</>}
              </button>
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50"
                style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
              >
                Reemplazar HTML
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={handleReplaceFile}
              />
            </div>
          )}
        </div>

        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-md mb-2 inline-block"
          style={{
            background: createdWithAndy ? '#7c3aed20' : '#eab30820',
            color: createdWithAndy ? '#7c3aed' : '#eab308',
          }}
        >
          {createdWithAndy ? '🤖 Creado con Andy' : '📄 Subido como HTML'}
        </span>

        {saveMsg && (
          <p className={`text-sm mb-2 ${saveMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMsg}
          </p>
        )}

        {editedHtml != null && scanResult && (
          <div
            className="mb-3 rounded-xl border text-sm"
            style={{
              borderColor: 'var(--vibe-border)',
              background: 'var(--vibe-card)',
              color: 'var(--vibe-text)',
            }}
          >
            {scanResult.summary === 'clean' && (
              <div
                className="px-3 py-2 text-xs font-medium rounded-xl"
                style={{ color: '#22c55e' }}
              >
                ✅ Sin problemas de seguridad
              </div>
            )}
            {scanResult.summary === 'warnings' && (
              <div>
                <button
                  type="button"
                  onClick={() => setScanPanelOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:opacity-90"
                  style={{ color: '#eab308' }}
                >
                  <span className="text-xs font-bold">
                    ⚠️ {scanResult.alerts.filter((a) => a.level === 'warning').length} advertencia
                    {scanResult.alerts.filter((a) => a.level === 'warning').length !== 1 ? 's' : ''}
                    {scanResult.alerts.some((a) => a.level === 'info') ? ` · ${scanResult.alerts.filter((a) => a.level === 'info').length} nota(s)` : ''}
                  </span>
                  {scanPanelOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {scanPanelOpen && (
                  <ul className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'var(--vibe-border)' }}>
                    {scanResult.alerts.map((a, idx) => (
                      <li key={idx} className="pt-2 text-xs" style={{ color: 'var(--vibe-text-muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--vibe-text)' }}>
                          {a.level === 'warning' ? '🟡' : '🔵'} {a.message}
                        </span>
                        <button
                          type="button"
                          className="ml-2 underline underline-offset-2 text-[11px]"
                          style={{ color: 'var(--vibe-accent)' }}
                          onClick={() => setScanDetailIdx((d) => ({ ...d, [idx]: !d[idx] }))}
                        >
                          {scanDetailIdx[idx] ? 'Ocultar detalle' : 'Ver detalle'}
                        </button>
                        {scanDetailIdx[idx] ? (
                          <pre
                            className="mt-1 p-2 rounded-lg text-[10px] whitespace-pre-wrap break-all"
                            style={{ background: '#0a0a0f', color: '#94a3b8', border: '1px solid var(--vibe-border)' }}
                          >
                            {a.detail}
                          </pre>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {scanResult.summary === 'blocked' && (
              <div>
                <div
                  className="px-3 py-2 text-xs font-bold rounded-t-xl"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', borderBottom: '1px solid var(--vibe-border)' }}
                >
                  🔴 {scanResult.alerts.filter((a) => a.level === 'error').length} problema
                  {scanResult.alerts.filter((a) => a.level === 'error').length !== 1 ? 's' : ''} de seguridad detectados
                </div>
                <ul className="px-3 py-2 space-y-2 max-h-48 overflow-y-auto">
                  {scanResult.alerts.map((a, idx) => (
                    <li key={idx} className="text-xs" style={{ color: 'var(--vibe-text-muted)' }}>
                      <span className="font-medium" style={{ color: 'var(--vibe-text)' }}>
                        {a.level === 'error' ? '🔴' : a.level === 'warning' ? '🟡' : '🔵'} {a.message}
                      </span>
                      <button
                        type="button"
                        className="ml-2 underline underline-offset-2 text-[11px]"
                        style={{ color: 'var(--vibe-accent)' }}
                        onClick={() => setScanDetailIdx((d) => ({ ...d, [idx]: !d[idx] }))}
                      >
                        {scanDetailIdx[idx] ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                      {scanDetailIdx[idx] ? (
                        <pre
                          className="mt-1 p-2 rounded-lg text-[10px] whitespace-pre-wrap break-all"
                          style={{ background: '#0a0a0f', color: '#94a3b8', border: '1px solid var(--vibe-border)' }}
                        >
                          {a.detail}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div
          className="relative w-full rounded-lg overflow-hidden border flex-shrink-0 mb-3"
          style={{
            minHeight: verCodigo && editedHtml ? 420 : undefined,
            aspectRatio: verCodigo ? undefined : '480 / 640',
            borderColor: ADMIN_THEME.border,
            background: ADMIN_THEME.bg,
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 min-h-[200px]">
              <Loader2 size={28} className="animate-spin" style={{ color: ADMIN_THEME.accent }} />
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Cargando juego…</p>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
              <p className="text-sm" style={{ color: '#ef4444' }}>Error al cargar el juego</p>
            </div>
          )}
          {editedHtml != null && !verCodigo && (
            <iframe
              srcDoc={prepareGameHtml(editedHtml)}
              sandbox="allow-scripts allow-same-origin"
              title={game.title || 'Vista previa del juego'}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          )}
          {editedHtml != null && verCodigo && (
            <textarea
              value={editedHtml}
              onChange={(e) => setEditedHtml(e.target.value)}
              className="absolute inset-0 w-full min-h-[400px] resize-y box-border p-4 text-sm font-mono outline-none"
              style={{
                background: '#0a0a0f',
                color: '#f1f5f9',
                border: 'none',
              }}
              spellCheck={false}
            />
          )}
          {!game.file_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Sin archivo disponible</p>
            </div>
          )}
        </div>

        {verCodigo && editedHtml != null && isDirty && (
          <button
            type="button"
            onClick={handleSaveHtml}
            disabled={saving}
            className="w-full mb-3 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
            style={{ background: ADMIN_THEME.accent }}
          >
            {saving ? 'Guardando…' : '💾 Guardar cambios'}
          </button>
        )}

        {isPending && (
          <>
            {typeof onAnalyze === 'function' && !createdWithAndy && (
              <>
                <button
                  type="button"
                  onClick={() => editedHtml != null && onAnalyze(editedHtml)}
                  disabled={analyzing || editedHtml == null}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-bold border cursor-pointer transition-colors mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderColor: '#06b6d4', color: '#06b6d4', background: 'transparent' }}
                >
                  {analyzing ? 'Analizando...' : 'Analizar con IA'}
                </button>

                {analysisResult && (
                  <div
                    className="rounded-xl border p-4 mb-3 text-sm"
                    style={{
                      borderColor: analysisResult.contentApproved ? '#22c55e' : '#ef4444',
                      background: analysisResult.contentApproved ? '#22c55e10' : '#ef444410',
                    }}
                  >
                    <p className="font-bold mb-2" style={{ color: analysisResult.contentApproved ? '#22c55e' : '#ef4444' }}>
                      {analysisResult.contentApproved ? 'Contenido apropiado' : 'Problemas de contenido detectados'}
                    </p>
                    {analysisResult.contentIssues?.length > 0 && (
                      <ul className="list-disc pl-4 mb-2 text-xs" style={{ color: '#ef4444' }}>
                        {analysisResult.contentIssues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    {analysisResult.rejectionMessage && (
                      <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#ef444420', color: '#ef4444' }}>
                        <p className="font-bold mb-1">Mensaje sugerido para rechazo:</p>
                        <p>{analysisResult.rejectionMessage}</p>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: '#2a2a3a' }}>
                      <p className="font-bold mb-1" style={{ color: analysisResult.hasScoreReporting ? '#22c55e' : '#eab308' }}>
                        {analysisResult.hasScoreReporting ? 'Score reporting incluido' : 'Sin score reporting'}
                      </p>
                      {analysisResult.scoreFixSuggestion && (
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{analysisResult.scoreFixSuggestion}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {createdWithAndy && (
              <p className="text-xs text-center mb-3" style={{ color: '#94a3b8' }}>
                Creado con Andy — las reglas de contenido ya fueron aplicadas
              </p>
            )}
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
          </>
        )}
      </div>
    </div>
  );
}
