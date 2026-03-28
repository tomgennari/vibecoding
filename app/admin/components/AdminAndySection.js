'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME, HOUSES } from '../constants.js';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, RefreshCw, Check, X, Sparkles } from 'lucide-react';

function formatInt(n) {
  return Number(n ?? 0).toLocaleString('es-AR');
}

function formatUsd(n) {
  return Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDuration(sec) {
  if (sec == null || sec === '') return '—';
  const s = Number(sec);
  if (!Number.isFinite(s) || s < 0) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function houseLabel(houseId) {
  if (!houseId) return '—';
  const h = HOUSES.find((x) => x.id === houseId);
  return h ? h.name : houseId;
}

function frameworkLabel(fw) {
  if (!fw) return '—';
  const map = {
    kaplay: 'Kaplay',
    p5js: 'p5.js',
    threejs: 'Three.js',
    canvas2d: 'Canvas 2D',
  };
  return map[fw] || fw;
}

function KpiCard({ label, value, sub }) {
  return (
    <div
      className="rounded-xl border p-4 min-w-0"
      style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: ADMIN_THEME.textMuted }}>
        {label}
      </p>
      <p className="text-xl font-black tabular-nums truncate" style={{ color: ADMIN_THEME.text }}>
        {value}
      </p>
      {sub ? (
        <p className="text-[11px] mt-1" style={{ color: ADMIN_THEME.textMuted }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminAndySection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [modalSessionId, setModalSessionId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detail, setDetail] = useState(null);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [analyzeMarkdown, setAnalyzeMarkdown] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/admin/andy/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Stats: ${res.status}`);
        setStats(null);
        return;
      }
      setStats(body);
    } catch (e) {
      setError(e.message || 'Error stats');
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sin sesión');
        return;
      }
      const qs = new URLSearchParams({ filter, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/andy/sessions?${qs}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Lista: ${res.status}`);
        setSessions([]);
        return;
      }
      setSessions(Array.isArray(body.sessions) ? body.sessions : []);
      setListMeta({
        total: body.total ?? 0,
        page: body.page ?? 1,
        totalPages: body.totalPages ?? 1,
      });
    } catch (e) {
      setError(e.message || 'Error al listar');
      setSessions([]);
    }
  }, [filter, page]);

  const sessionsInitialLoaded = useRef(false);
  const analyzeAbortRef = useRef(null);

  const refreshStatsAndList = useCallback(async () => {
    setError('');
    await loadStats();
    await loadSessions();
  }, [loadStats, loadSessions]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      await loadStats();
      await loadSessions();
      sessionsInitialLoaded.current = true;
      setLoading(false);
    })();
  }, [loadStats, loadSessions]);

  useEffect(() => {
    if (!sessionsInitialLoaded.current) return;
    void loadSessions();
  }, [filter, page, loadSessions]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  async function openDetail(sessionId) {
    setModalSessionId(sessionId);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDetailError('Sin sesión');
        setDetailLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/andy/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(body.error || `Error ${res.status}`);
        setDetailLoading(false);
        return;
      }
      setDetail(body);
    } catch (e) {
      setDetailError(e.message || 'Error');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setModalSessionId(null);
    setDetail(null);
    setDetailError('');
  }

  function closeAnalyzeModal() {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    setAnalyzeOpen(false);
    setAnalyzeLoading(false);
    setAnalyzeError('');
    setAnalyzeMarkdown('');
  }

  async function runAnalyzeWithAI() {
    analyzeAbortRef.current?.abort();
    const ac = new AbortController();
    analyzeAbortRef.current = ac;
    setAnalyzeOpen(true);
    setAnalyzeMarkdown('');
    setAnalyzeError('');
    setAnalyzeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAnalyzeError('Sin sesión');
        setAnalyzeLoading(false);
        return;
      }
      const res = await fetch('/api/admin/andy/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: ac.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAnalyzeError(body.error || `Error ${res.status}`);
        setAnalyzeLoading(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        setAnalyzeError('Sin cuerpo de respuesta');
        setAnalyzeLoading(false);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;
      function processLines(lines) {
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return true;
          try {
            const data = JSON.parse(payload);
            if (data.chunk != null && typeof data.chunk === 'string') {
              setAnalyzeMarkdown((prev) => prev + data.chunk);
            }
          } catch {
            // ignorar
          }
        }
        return false;
      }
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) streamDone = processLines(buffer.split('\n'));
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        streamDone = processLines(lines);
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setAnalyzeError(e.message || 'Error al analizar');
    } finally {
      if (analyzeAbortRef.current === ac) {
        analyzeAbortRef.current = null;
        setAnalyzeLoading(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando Andy / Game Lab...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: ADMIN_THEME.text }}>
            🤖 Andy — Game Lab
          </h2>
          <p className="text-sm mt-0.5" style={{ color: ADMIN_THEME.textMuted }}>
            Sesiones y conversaciones de alumnos con el asistente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              setLoading(true);
              await refreshStatsAndList();
              setLoading(false);
            })();
          }}
          className="text-sm font-bold px-4 py-2 rounded-lg border transition-colors"
          style={{ borderColor: ADMIN_THEME.accent, color: ADMIN_THEME.accent }}
        >
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#ef444440', color: '#fca5a5' }}>
          {error}
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total sesiones" value={formatInt(stats.totalSessions)} />
            <KpiCard label="Últimos 7 días" value={formatInt(stats.sessionsLast7Days)} />
            <KpiCard label="Tasa de éxito" value={`${stats.successRatePct}%`} sub="Enviadas a moderación" />
            <KpiCard label="Promedio mensajes" value={String(stats.avgMessagesPerSession)} sub="Por sesión" />
            <KpiCard
              label="Framework top"
              value={stats.topFramework ? frameworkLabel(stats.topFramework) : '—'}
              sub={stats.topFrameworkCount ? `${formatInt(stats.topFrameworkCount)} sesiones` : undefined}
            />
            <KpiCard label="Créditos consumidos" value={`$${formatUsd(stats.totalCreditsConsumed)}`} sub="USD (suma)" />
          </div>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: ADMIN_THEME.textMuted }}>
            <span>
              Promedio créditos / sesión: <strong style={{ color: ADMIN_THEME.text }}>${formatUsd(stats.avgCreditsPerSession)}</strong> USD
            </span>
            <span>
              % sesiones con errores: <strong style={{ color: ADMIN_THEME.text }}>{stats.pctSessionsWithErrors}%</strong>
            </span>
            <span>
              % con auto-retry: <strong style={{ color: ADMIN_THEME.text }}>{stats.pctSessionsWithAutoRetry}%</strong>
            </span>
          </div>
        </>
      ) : null}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
      >
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: ADMIN_THEME.border }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold mr-2" style={{ color: ADMIN_THEME.textMuted }}>FILTRO</span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'errors', label: 'Con errores' },
              { id: 'abandoned', label: 'Abandonadas' },
              { id: 'successful', label: 'Exitosas' },
            ].map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: active ? ADMIN_THEME.accent : ADMIN_THEME.border,
                    background: active ? `${ADMIN_THEME.accent}22` : 'transparent',
                    color: active ? ADMIN_THEME.text : ADMIN_THEME.textMuted,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={analyzeLoading}
            onClick={() => {
              void runAnalyzeWithAI();
            }}
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 shrink-0"
            style={{
              borderColor: ADMIN_THEME.accentSecondary,
              color: ADMIN_THEME.accentSecondary,
              background: `${ADMIN_THEME.accentSecondary}14`,
            }}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {analyzeLoading ? 'Analizando…' : 'Analizar patrones con IA'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: ADMIN_THEME.textMuted, borderBottom: `1px solid ${ADMIN_THEME.border}` }}>
                <th className="text-left p-3 font-semibold">Alumno</th>
                <th className="text-left p-3 font-semibold">House</th>
                <th className="text-left p-3 font-semibold">Framework</th>
                <th className="text-right p-3 font-semibold">Mensajes</th>
                <th className="text-center p-3 font-semibold">Errores</th>
                <th className="text-center p-3 font-semibold">Auto-retry</th>
                <th className="text-left p-3 font-semibold">Resultado</th>
                <th className="text-right p-3 font-semibold">Créditos</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>
                    No hay sesiones con este filtro.
                  </td>
                </tr>
              ) : (
                sessions.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(row.id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/5"
                    style={{ borderTop: `1px solid ${ADMIN_THEME.border}`, color: ADMIN_THEME.text }}
                  >
                    <td className="p-3 max-w-[140px] truncate font-medium">{row.studentName}</td>
                    <td className="p-3">{houseLabel(row.house)}</td>
                    <td className="p-3">{frameworkLabel(row.framework_used)}</td>
                    <td className="p-3 text-right tabular-nums">{formatInt(row.messages_count)}</td>
                    <td className="p-3 text-center">
                      {row.had_errors ? <AlertCircle className="inline w-4 h-4 text-amber-400" aria-label="Sí" /> : <span className="text-neutral-500">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      {row.had_auto_retry ? <RefreshCw className="inline w-4 h-4 text-cyan-400" aria-label="Sí" /> : <span className="text-neutral-500">—</span>}
                    </td>
                    <td className="p-3">
                      {row.ended_in_submission ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                          Abandonado
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">${formatUsd(row.credits_consumed)}</td>
                    <td className="p-3 whitespace-nowrap">{formatDateTime(row.started_at)}</td>
                    <td className="p-3">{formatDuration(row.duration_seconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {listMeta.totalPages > 1 ? (
          <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-t" style={{ borderColor: ADMIN_THEME.border }}>
            <span className="text-xs" style={{ color: ADMIN_THEME.textMuted }}>
              {formatInt(listMeta.total)} sesiones · Página {page}/{listMeta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= listMeta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalSessionId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="rounded-2xl border shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: ADMIN_THEME.border }}>
              <h3 className="font-bold" style={{ color: ADMIN_THEME.text }}>
                Detalle de sesión
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-white/10"
                style={{ color: ADMIN_THEME.textMuted }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {detailLoading ? (
                <p style={{ color: ADMIN_THEME.textMuted }}>Cargando conversación...</p>
              ) : detailError ? (
                <p style={{ color: '#fca5a5' }}>{detailError}</p>
              ) : detail?.session ? (
                <>
                  <div
                    className="rounded-xl border p-3 mb-4 text-xs space-y-1"
                    style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.bg }}
                  >
                    <p style={{ color: ADMIN_THEME.text }}>
                      <strong>Alumno:</strong> {detail.session.student?.name} ·{' '}
                      <strong>House:</strong> {houseLabel(detail.session.student?.house)}
                    </p>
                    <p style={{ color: ADMIN_THEME.textMuted }}>
                      <strong style={{ color: ADMIN_THEME.text }}>Framework:</strong> {frameworkLabel(detail.session.framework_used)} ·{' '}
                      <strong style={{ color: ADMIN_THEME.text }}>Duración:</strong> {formatDuration(detail.session.duration_seconds)} ·{' '}
                      <strong style={{ color: ADMIN_THEME.text }}>Créditos sesión:</strong> ${formatUsd(detail.session.credits_consumed)}
                    </p>
                    <p style={{ color: ADMIN_THEME.textMuted }}>
                      <strong style={{ color: ADMIN_THEME.text }}>Resultado:</strong>{' '}
                      {detail.session.ended_in_submission ? (
                        <span className="text-emerald-400">Enviado a moderación</span>
                      ) : (
                        <span className="text-slate-400">Abandonado</span>
                      )}
                      {detail.session.had_errors ? ' · hubo errores de stream' : ''}
                      {detail.session.had_auto_retry ? ' · hubo auto-retry' : ''}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {(detail.messages || []).map((m) => {
                      const isUser = m.role === 'user';
                      return (
                        <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className="max-w-[85%] rounded-xl px-3 py-2 border text-xs"
                            style={{
                              borderColor: isUser ? `${ADMIN_THEME.accent}55` : ADMIN_THEME.border,
                              background: isUser ? `${ADMIN_THEME.accent}18` : ADMIN_THEME.bg,
                              color: ADMIN_THEME.text,
                            }}
                          >
                            {!isUser ? (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ADMIN_THEME.accentSecondary }}>
                                  Andy
                                </span>
                                {m.is_error_fix ? (
                                  <span className="text-[9px] px-1.5 py-0 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Error-fix
                                  </span>
                                ) : null}
                                {m.generated_html ? (
                                  <span className="text-[9px] px-1.5 py-0 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                    HTML
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ADMIN_THEME.accent }}>
                                  Alumno
                                </span>
                                {m.is_error_fix ? (
                                  <span className="text-[9px] px-1.5 py-0 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Error-fix
                                  </span>
                                ) : null}
                              </div>
                            )}
                            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed break-words m-0">
                              {m.content || '—'}
                            </pre>
                            {!isUser && (Number(m.tokens_output) > 0 || Number(m.tokens_input) > 0) ? (
                              <p className="mt-2 text-[10px] tabular-nums" style={{ color: ADMIN_THEME.textMuted }}>
                                in {formatInt(m.tokens_input)} · out {formatInt(m.tokens_output)} · ${formatUsd(m.cost_usd)} USD
                              </p>
                            ) : null}
                            {m.created_at ? (
                              <p className="mt-1 text-[10px]" style={{ color: ADMIN_THEME.textMuted }}>
                                {formatDateTime(m.created_at)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {analyzeOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={closeAnalyzeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="andy-analyze-title"
        >
          <div
            className="rounded-2xl border shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: ADMIN_THEME.border }}>
              <h3 id="andy-analyze-title" className="font-bold flex items-center gap-2" style={{ color: ADMIN_THEME.text }}>
                <Sparkles className="w-5 h-5 text-cyan-400" aria-hidden />
                Análisis con IA
              </h3>
              <button
                type="button"
                onClick={closeAnalyzeModal}
                className="p-1 rounded-lg hover:bg-white/10"
                style={{ color: ADMIN_THEME.textMuted }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 text-sm">
              {analyzeError ? (
                <p className="text-sm" style={{ color: '#fca5a5' }}>{analyzeError}</p>
              ) : null}
              {analyzeLoading && !analyzeMarkdown ? (
                <p style={{ color: ADMIN_THEME.textMuted }}>Generando análisis en tiempo real…</p>
              ) : null}
              {analyzeMarkdown ? (
                <div
                  className="prose prose-sm max-w-none prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>h2]:text-base [&>h3]:text-sm"
                  style={{ color: ADMIN_THEME.text }}
                >
                  <ReactMarkdown>{analyzeMarkdown}</ReactMarkdown>
                </div>
              ) : null}
              {!analyzeLoading && !analyzeError && !analyzeMarkdown ? (
                <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>No hubo respuesta del modelo.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
