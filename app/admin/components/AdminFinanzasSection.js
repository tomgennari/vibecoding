'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME, HOUSES } from '../constants.js';
import { BUILDING_GOALS } from '@/lib/building-goals.js';

const PAGE_SIZE = 20;

const TX_KIND_LABEL = {
  individual: 'Individual',
  pack_10: 'Pack 10',
  pack_30: 'Pack 30',
  all_access: 'ALL ACCESS',
  unlock_all: 'Unlock All',
  donation: 'Donación',
};

const TX_KIND_OPTIONS = [
  { id: '', label: 'Todos los tipos' },
  { id: 'individual', label: 'Individual' },
  { id: 'pack_10', label: 'Pack 10' },
  { id: 'pack_30', label: 'Pack 30' },
  { id: 'all_access', label: 'ALL ACCESS' },
  { id: 'unlock_all', label: 'Unlock All' },
  { id: 'donation', label: 'Donación' },
];

function formatArs(n) {
  return Number(n).toLocaleString('es-AR');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function AdminFinanzasSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalRaised, setTotalRaised] = useState(0);
  const [kpi, setKpi] = useState(null);
  const [profileCount, setProfileCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [gamesById, setGamesById] = useState({});

  const [filterKind, setFilterKind] = useState('');
  const [filterHouse, setFilterHouse] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortKey, setSortKey] = useState('at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sin sesión');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/finanzas', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }
      setTotalRaised(Number(body.totalRaised) || 0);
      setKpi(body.kpi || null);
      setProfileCount(Number(body.profileCount) || 0);
      setTransactions(Array.isArray(body.transactions) ? body.transactions : []);
      setProfilesById(body.profilesById || {});
      setGamesById(body.gamesById || {});
    } catch (e) {
      setError(e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const fromMs = filterDateFrom ? new Date(filterDateFrom).setHours(0, 0, 0, 0) : null;
    const toMs = filterDateTo ? new Date(filterDateTo).setHours(23, 59, 59, 999) : null;
    return transactions.filter((t) => {
      if (filterKind && t.kind !== filterKind) return false;
      if (filterHouse) {
        const house = profilesById[t.userId]?.house;
        if (house !== filterHouse) return false;
      }
      if (fromMs != null || toMs != null) {
        const ms = new Date(t.at).getTime();
        if (fromMs != null && ms < fromMs) return false;
        if (toMs != null && ms > toMs) return false;
      }
      return true;
    });
  }, [transactions, filterKind, filterHouse, filterDateFrom, filterDateTo, profilesById]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'at':
          cmp = new Date(a.at).getTime() - new Date(b.at).getTime();
          break;
        case 'user': {
          const na = profilesById[a.userId]?.name || '';
          const nb = profilesById[b.userId]?.name || '';
          cmp = na.localeCompare(nb, 'es');
          break;
        }
        case 'kind':
          cmp = (TX_KIND_LABEL[a.kind] || a.kind).localeCompare(TX_KIND_LABEL[b.kind] || b.kind, 'es');
          break;
        case 'amount':
          cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
          break;
        case 'payment':
          cmp = String(a.paymentId || '').localeCompare(String(b.paymentId || ''), 'es');
          break;
        case 'game': {
          const ga = a.gameId ? (gamesById[a.gameId] || '') : '';
          const gb = b.gameId ? (gamesById[b.gameId] || '') : '';
          cmp = ga.localeCompare(gb, 'es');
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir, profilesById, gamesById]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [filterKind, filterHouse, filterDateFrom, filterDateTo, transactions.length]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'at' ? 'desc' : 'asc');
    }
  };

  const sortHint = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const ticketPromedioGlobal = transactions.length > 0 ? totalRaised / transactions.length : 0;
  const ticketPromedioFiltrado = sorted.length > 0
    ? sorted.reduce((a, t) => a + (Number(t.amount) || 0), 0) / sorted.length
    : 0;
  const payingUserIds = useMemo(() => {
    const s = new Set();
    transactions.forEach((t) => {
      if (t.userId && (Number(t.amount) || 0) > 0) s.add(t.userId);
    });
    return s;
  }, [transactions]);
  const conversionPct = profileCount > 0 ? (payingUserIds.size / profileCount) * 100 : 0;

  const topCompradores = useMemo(() => {
    const byUser = {};
    transactions.forEach((t) => {
      if (!t.userId) return;
      byUser[t.userId] = (byUser[t.userId] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(byUser)
      .map(([userId, total]) => ({ userId, total, name: profilesById[userId]?.name || userId }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, profilesById]);

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando finanzas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={load} className="mt-2 text-sm underline" style={{ color: ADMIN_THEME.accent }}>
          Reintentar
        </button>
      </div>
    );
  }

  const kpiCards = kpi
    ? [
        { label: 'Total recaudado', value: `$${formatArs(totalRaised)} ARS`, highlight: true },
        { label: 'Juegos individuales', value: `$${formatArs(kpi.individual)} ARS` },
        { label: 'Packs (10 + 30)', value: `$${formatArs(kpi.packs1030)} ARS` },
        { label: 'ALL ACCESS', value: `$${formatArs(kpi.allAccess)} ARS` },
        { label: 'Desbloquear para todos', value: `$${formatArs(kpi.unlockAll)} ARS` },
        { label: 'Donaciones', value: `$${formatArs(kpi.donations)} ARS` },
      ]
    : [];

  return (
    <div className="p-6 min-w-0 max-w-[1600px]">
      <h2 className="text-xl font-bold mb-2" style={{ color: ADMIN_THEME.text }}>Finanzas</h2>

      <div
        className="mb-6 rounded-xl border p-3 text-sm"
        style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card, color: ADMIN_THEME.textMuted }}
      >
        <strong style={{ color: ADMIN_THEME.text }}>Nota (RLS):</strong>{' '}
        Los datos de <code className="text-xs">pack_purchases</code> se leen con service role en{' '}
        <code className="text-xs">/api/admin/finanzas</code>. Si querés usar el cliente Supabase del admin sin API,
        agregá en Supabase una policy <code className="text-xs">SELECT</code> para admins (p. ej. rol o{' '}
        <code className="text-xs">is_admin</code>).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border p-5 min-w-0"
            style={{
              borderColor: ADMIN_THEME.border,
              background: ADMIN_THEME.card,
              ...(c.highlight ? { borderColor: ADMIN_THEME.accent, boxShadow: `0 0 0 1px ${ADMIN_THEME.accent}40` } : {}),
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>{c.label}</p>
            <p
              className={`tabular-nums font-black ${c.highlight ? 'text-3xl' : 'text-2xl'}`}
              style={{ color: ADMIN_THEME.accent }}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mb-3" style={{ color: ADMIN_THEME.text }}>Progreso de edificios</h3>
      <p className="text-sm mb-4" style={{ color: ADMIN_THEME.textMuted }}>
        Monto global recaudado (misma base que el dashboard): <strong style={{ color: ADMIN_THEME.text }}>${formatArs(totalRaised)} ARS</strong>
      </p>
      <ul className="space-y-3 mb-10">
        {BUILDING_GOALS.map((b) => {
          const unlocked = totalRaised >= b.amount;
          const pct = b.amount > 0 ? Math.min(100, (totalRaised / b.amount) * 100) : 0;
          return (
            <li
              key={`${b.amount}-${b.name}`}
              className="rounded-xl border p-4 min-w-0"
              style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-semibold" style={{ color: ADMIN_THEME.text }}>{b.name}</span>
                <span className="text-sm" style={{ color: unlocked ? '#22c55e' : ADMIN_THEME.textMuted }}>
                  {unlocked ? '✅ Desbloqueado' : '🔒 Bloqueado'}
                </span>
              </div>
              <p className="text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>
                Meta: ${formatArs(b.amount)} ARS — Recaudado total: ${formatArs(totalRaised)} ARS ({pct.toFixed(1)}%)
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: ADMIN_THEME.border }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${ADMIN_THEME.accent} 0%, ${ADMIN_THEME.accentSecondary} 100%)`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="text-lg font-bold mb-3" style={{ color: ADMIN_THEME.text }}>Transacciones</h3>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
        >
          {TX_KIND_OPTIONS.map((o) => (
            <option key={o.id || 'all'} value={o.id}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterHouse}
          onChange={(e) => setFilterHouse(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
        >
          <option value="">Todas las Houses</option>
          {HOUSES.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm" style={{ color: ADMIN_THEME.textMuted }}>
          Desde
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-lg border px-2 py-1"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          />
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: ADMIN_THEME.textMuted }}>
          Hasta
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-lg border px-2 py-1"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          />
        </label>
        <span className="text-sm self-center" style={{ color: ADMIN_THEME.textMuted }}>
          {sorted.length} filas · Página {pageSafe + 1} / {pageCount}
        </span>
      </div>

      <div className="rounded-xl border overflow-x-auto min-w-0 mb-4" style={{ borderColor: ADMIN_THEME.border }}>
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr style={{ background: ADMIN_THEME.bg }}>
              <th className="text-left">
                <button type="button" onClick={() => toggleSort('at')} className="px-3 py-2 font-bold w-full text-left" style={{ color: ADMIN_THEME.text }}>
                  Fecha{sortHint('at')}
                </button>
              </th>
              <th className="text-left">
                <button type="button" onClick={() => toggleSort('user')} className="px-3 py-2 font-bold w-full text-left" style={{ color: ADMIN_THEME.text }}>
                  Usuario{sortHint('user')}
                </button>
              </th>
              <th className="text-left">
                <button type="button" onClick={() => toggleSort('kind')} className="px-3 py-2 font-bold w-full text-left" style={{ color: ADMIN_THEME.text }}>
                  Tipo{sortHint('kind')}
                </button>
              </th>
              <th className="text-right">
                <button type="button" onClick={() => toggleSort('amount')} className="px-3 py-2 font-bold w-full text-right" style={{ color: ADMIN_THEME.text }}>
                  Monto{sortHint('amount')}
                </button>
              </th>
              <th className="text-left">
                <button type="button" onClick={() => toggleSort('payment')} className="px-3 py-2 font-bold w-full text-left" style={{ color: ADMIN_THEME.text }}>
                  Payment ID{sortHint('payment')}
                </button>
              </th>
              <th className="text-left">
                <button type="button" onClick={() => toggleSort('game')} className="px-3 py-2 font-bold w-full text-left" style={{ color: ADMIN_THEME.text }}>
                  Juego{sortHint('game')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>Sin transacciones</td>
              </tr>
            ) : (
              pageRows.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>{formatDateTime(t.at)}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]" style={{ color: ADMIN_THEME.text }} title={profilesById[t.userId]?.name}>
                    {profilesById[t.userId]?.name || t.userId || '—'}
                  </td>
                  <td className="px-3 py-2" style={{ color: ADMIN_THEME.text }}>{TX_KIND_LABEL[t.kind] || t.kind}</td>
                  <td className="px-3 py-2 text-right font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>${formatArs(t.amount)}</td>
                  <td className="px-3 py-2 truncate max-w-[140px] font-mono text-xs" style={{ color: ADMIN_THEME.textMuted }} title={t.paymentId || ''}>
                    {t.paymentId || '—'}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[160px]" style={{ color: ADMIN_THEME.text }} title={t.gameId ? gamesById[t.gameId] : ''}>
                    {t.gameId ? (gamesById[t.gameId] || t.gameId) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 mb-10">
        <button
          type="button"
          disabled={pageSafe <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
          style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={pageSafe >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
          style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
        >
          Siguiente
        </button>
      </div>

      <h3 className="text-lg font-bold mb-3" style={{ color: ADMIN_THEME.text }}>Métricas adicionales</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
          <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>Ticket promedio</p>
          <p className="text-xl font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>
            ${formatArs(Math.round(ticketPromedioGlobal))} ARS
          </p>
          <p className="text-xs mt-1" style={{ color: ADMIN_THEME.textMuted }}>
            Total recaudado ÷ {transactions.length} transacciones. Con filtros: ${formatArs(Math.round(ticketPromedioFiltrado))} ({sorted.length} filas).
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
          <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>Conversión (pagaron al menos una vez)</p>
          <p className="text-xl font-black tabular-nums" style={{ color: ADMIN_THEME.accent }}>
            {conversionPct.toFixed(2)}%
          </p>
          <p className="text-xs mt-1" style={{ color: ADMIN_THEME.textMuted }}>
            {payingUserIds.size} usuarios con pago / {profileCount} registrados
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}>
          <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>Top 5 compradores</p>
          <ul className="text-sm space-y-1 mt-2">
            {topCompradores.length === 0 ? (
              <li style={{ color: ADMIN_THEME.textMuted }}>—</li>
            ) : (
              topCompradores.map((r) => (
                <li key={r.userId} className="flex justify-between gap-2" style={{ color: ADMIN_THEME.text }}>
                  <span className="truncate">{r.name}</span>
                  <span className="font-black tabular-nums flex-shrink-0" style={{ color: ADMIN_THEME.accent }}>${formatArs(r.total)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
