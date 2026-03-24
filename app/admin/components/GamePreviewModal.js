'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Code, Gamepad2 } from 'lucide-react';
import { ADMIN_THEME } from '../constants.js';

export default function GamePreviewModal({
  game,
  authorName,
  onApprove,
  onReject,
  onClose,
  analyzing = false,
  analysisResult = null,
  onAnalyze,
}) {
  const [htmlContent, setHtmlContent] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [verCodigo, setVerCodigo] = useState(false);

  useEffect(() => {
    if (!game?.file_url) return;
    let cancelled = false;
    setHtmlContent(null);
    setLoadError(false);

    fetch(game.file_url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then((html) => { if (!cancelled) setHtmlContent(html); })
      .catch(() => { if (!cancelled) setLoadError(true); });

    return () => { cancelled = true; };
  }, [game?.file_url]);

  if (!game) return null;

  const isPending = game.status === 'pending';
  const createdWithAndy = game.file_url?.includes('game-lab-');
  const loading = game.file_url && htmlContent === null && !loadError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border-2 p-5 shadow-xl flex flex-col max-h-[90vh] overflow-y-auto"
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
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-sm truncate" style={{ color: ADMIN_THEME.textMuted }}>
            por {authorName || 'Desconocido'}
          </p>
          {htmlContent && (
            <button
              type="button"
              onClick={() => setVerCodigo((v) => !v)}
              className="vibe-btn-secondary flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
              style={{ color: ADMIN_THEME.accent, border: `1px solid ${ADMIN_THEME.accent}` }}
            >
              {verCodigo ? <><Gamepad2 size={14} /> Ver juego</> : <><Code size={14} /> Ver código</>}
            </button>
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

        <div
          className="relative w-full rounded-lg overflow-hidden border flex-shrink-0"
          style={{
            aspectRatio: '480 / 640',
            borderColor: ADMIN_THEME.border,
            background: ADMIN_THEME.bg,
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin" style={{ color: ADMIN_THEME.accent }} />
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Cargando juego…</p>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#ef4444' }}>Error al cargar el juego</p>
            </div>
          )}
          {htmlContent && !verCodigo && (
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin"
              title={game.title || 'Vista previa del juego'}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          )}
          {htmlContent && verCodigo && (
            <pre
              className="absolute inset-0 w-full h-full overflow-auto m-0"
              style={{
                background: '#0a0a0f',
                color: '#f1f5f9',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '16px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >{htmlContent}</pre>
          )}
          {!game.file_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>Sin archivo disponible</p>
            </div>
          )}
        </div>

        {isPending && (
          <>
            {typeof onAnalyze === 'function' && !createdWithAndy && (
              <>
                <button
                  type="button"
                  onClick={() => htmlContent && onAnalyze(htmlContent)}
                  disabled={analyzing || !htmlContent}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-bold border cursor-pointer transition-colors mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderColor: '#06b6d4', color: '#06b6d4', background: 'transparent' }}
                >
                  {analyzing ? '🔄 Analizando...' : '🤖 Analizar con IA'}
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
                      {analysisResult.contentApproved ? '✅ Contenido apropiado' : '⚠️ Problemas de contenido detectados'}
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
                        {analysisResult.hasScoreReporting ? '✅ Score reporting incluido' : '⚠️ Sin score reporting'}
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
                🤖 Creado con Andy — las reglas de contenido ya fueron aplicadas
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
