'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

const PAGE_SIZE = 20;

const PACK_LABEL = {
  individual: 'Individual',
  pack_10: 'Pack 10',
  pack_30: 'Pack 30',
  all_access: 'ALL ACCESS',
};

function formatArs(n) {
  return Number(n || 0).toLocaleString('es-AR');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/** Duración en segundos → "Xh Ym" */
function formatPlayed(seconds) {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatRelativeActivity(iso) {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayDiff = Math.round((startToday - startDay) / 86400000);
    if (dayDiff === 0) return 'hoy';
    if (dayDiff === 1) return 'ayer';
    if (dayDiff > 1 && dayDiff < 7) return `hace ${dayDiff} días`;
    if (dayDiff >= 7 && dayDiff < 30) return `hace ${Math.floor(dayDiff / 7)} sem.`;
    if (dayDiff >= 30 && dayDiff < 365) return `hace ${Math.floor(dayDiff / 30)} meses`;
    return `hace ${Math.floor(dayDiff / 365)} años`;
  } catch {
    return '—';
  }
}

function displayName(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || '—';
}

export default function AdminUsersSection() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterHouse, setFilterHouse] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPago, setFilterPago] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sin sesión');
        setUsers([]);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/usuarios', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Error ${res.status}`);
        setUsers([]);
        setLoading(false);
        return;
      }
      setUsers(Array.isArray(body.users) ? body.users : []);
    } catch (e) {
      setError(e.message || 'Error al cargar');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const name = displayName(u).toLowerCase();
        const email = (u.email || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (filterType && u.user_type !== filterType) return false;
      if (filterHouse && u.house !== filterHouse) return false;
      if (filterEstado === 'activos' && u.is_blocked) return false;
      if (filterEstado === 'bloqueados' && !u.is_blocked) return false;
      if (filterEstado === 'admin' && !u.is_admin) return false;
      if (filterPago === 'pagaron' && (Number(u.total_spent) || 0) <= 0) return false;
      if (filterPago === 'nunca' && (Number(u.total_spent) || 0) > 0) return false;
      if (filterPago === 'all_access' && !u.has_all_access) return false;
      return true;
    });
  }, [users, search, filterType, filterHouse, filterEstado, filterPago]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = displayName(a).localeCompare(displayName(b), 'es');
          break;
        case 'email':
          cmp = (a.email || '').localeCompare(b.email || '', 'es');
          break;
        case 'user_type':
          cmp = (a.user_type || '').localeCompare(b.user_type || '', 'es');
          break;
        case 'house':
          cmp = (a.house || '').localeCompare(b.house || '', 'es');
          break;
        case 'created_at':
          cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'games_created':
          cmp = (Number(a.games_created) || 0) - (Number(b.games_created) || 0);
          break;
        case 'games_purchased':
          cmp = (Number(a.games_purchased) || 0) - (Number(b.games_purchased) || 0);
          break;
        case 'total_spent':
          cmp = (Number(a.total_spent) || 0) - (Number(b.total_spent) || 0);
          break;
        case 'total_donated':
          cmp = (Number(a.total_donated) || 0) - (Number(b.total_donated) || 0);
          break;
        case 'tokens':
          cmp = (Number(a.tokens_used) || 0) - (Number(b.tokens_used) || 0);
          break;
        case 'unlock_credits':
          cmp = (Number(a.unlock_credits) || 0) - (Number(b.unlock_credits) || 0);
          break;
        case 'has_all_access':
          cmp = (a.has_all_access === b.has_all_access ? 0 : a.has_all_access ? 1 : -1);
          break;
        case 'time_played':
          cmp = (Number(a.time_played_seconds) || 0) - (Number(b.time_played_seconds) || 0);
          break;
        case 'total_points':
          cmp = (Number(a.total_points) || 0) - (Number(b.total_points) || 0);
          break;
        case 'last_activity':
          cmp =
            new Date(a.last_activity || 0).getTime() - new Date(b.last_activity || 0).getTime();
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterHouse, filterEstado, filterPago, users.length]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      const prefersDesc = [
        'created_at',
        'last_activity',
        'games_created',
        'games_purchased',
        'total_spent',
        'total_donated',
        'tokens',
        'unlock_credits',
        'time_played',
        'total_points',
        'has_all_access',
      ].includes(key);
      setSortDir(prefersDesc ? 'desc' : 'asc');
    }
  };

  const sortHint = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleAdmin(profile) {
    const next = !profile.is_admin;
    const { error: err } = await supabase.from('profiles').update({ is_admin: next }).eq('id', profile.id);
    if (!err) load();
  }

  async function toggleBlock(profile) {
    const next = !profile.is_blocked;
    const { error: err } = await supabase.from('profiles').update({ is_blocked: next }).eq('id', profile.id);
    if (!err) load();
  }

  const thBtn = (key, label, className = '') => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className={`text-left font-semibold w-full px-3 py-2 hover:opacity-90 ${className}`}
      style={{ color: ADMIN_THEME.textMuted }}
    >
      {label}
      {sortHint(key)}
    </button>
  );

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando usuarios...</p>
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

  return (
    <div className="p-6 min-w-0 max-w-[100vw]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Usuarios</h2>
        <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>
          Mostrando {sorted.length === 0 ? 0 : pageSafe * PAGE_SIZE + 1}–
          {Math.min((pageSafe + 1) * PAGE_SIZE, sorted.length)} de {sorted.length} usuarios
          {sorted.length !== users.length ? ` (filtrados de ${users.length})` : ''}
        </p>
      </div>

      <div
        className="flex flex-wrap gap-3 mb-4 items-end"
        style={{ color: ADMIN_THEME.text }}
      >
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Buscar</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o email..."
            className="rounded-lg px-3 py-2 text-sm border outline-none w-52 min-w-0"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Tipo</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todos</option>
            <option value="alumno">Alumno</option>
            <option value="padre">Padre</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>House</label>
          <select
            value={filterHouse}
            onChange={(e) => setFilterHouse(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border min-w-[10rem]"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todas</option>
            {HOUSES.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Estado</label>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todos</option>
            <option value="activos">Activos</option>
            <option value="bloqueados">Bloqueados</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Pagos</label>
          <select
            value={filterPago}
            onChange={(e) => setFilterPago(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border min-w-[11rem]"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todos</option>
            <option value="pagaron">Pagaron al menos 1 vez</option>
            <option value="nunca">Nunca pagaron</option>
            <option value="all_access">ALL ACCESS</option>
          </select>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-x-auto min-w-0"
        style={{ borderColor: ADMIN_THEME.border }}
      >
        <table className="w-full text-sm min-w-[1200px]">
          <thead style={{ background: ADMIN_THEME.card }}>
            <tr>
              <th className="w-8" />
              <th className="min-w-[8rem]">{thBtn('name', 'Nombre')}</th>
              <th className="min-w-[7rem]">{thBtn('email', 'Email')}</th>
              <th className="min-w-[4rem]">{thBtn('user_type', 'Tipo')}</th>
              <th className="min-w-[5rem]">{thBtn('house', 'House')}</th>
              <th className="min-w-[5rem]">{thBtn('created_at', 'Registro')}</th>
              <th className="min-w-[3rem] text-right">{thBtn('games_created', 'Creados', 'text-right')}</th>
              <th className="min-w-[3rem] text-right">{thBtn('games_purchased', 'Comprados', 'text-right')}</th>
              <th className="min-w-[5rem] text-right">{thBtn('total_spent', 'Gastado', 'text-right')}</th>
              <th className="min-w-[5rem] text-right">{thBtn('total_donated', 'Donado', 'text-right')}</th>
              <th className="min-w-[6rem]">{thBtn('tokens', 'Andy', '')}</th>
              <th className="min-w-[4rem] text-right">{thBtn('unlock_credits', 'Cr. desbl.', 'text-right')}</th>
              <th className="min-w-[5rem]">{thBtn('has_all_access', 'ALL ACCESS')}</th>
              <th className="min-w-[4rem]">{thBtn('time_played', 'Jugado')}</th>
              <th className="min-w-[4rem] text-right">{thBtn('total_points', 'Puntos', 'text-right')}</th>
              <th className="min-w-[5rem]">{thBtn('last_activity', 'Última act.')}</th>
              <th className="min-w-[8rem] px-3 py-2 font-semibold text-left" style={{ color: ADMIN_THEME.textMuted }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((u, i) => {
              const house = HOUSES.find((h) => h.id === u.house);
              const isOpen = expanded.has(u.id);
              const rowBg = i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg;
              return (
                <Fragment key={u.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded(u.id);
                      }
                    }}
                    className="cursor-pointer border-t"
                    style={{ background: rowBg, borderColor: ADMIN_THEME.border }}
                  >
                    <td className="px-1 py-2 text-center" style={{ color: ADMIN_THEME.textMuted }}>
                      {isOpen ? '▼' : '▶'}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[10rem]" style={{ color: ADMIN_THEME.text }} title={displayName(u)}>
                      {displayName(u)}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[9rem] font-mono text-xs" style={{ color: ADMIN_THEME.textMuted }} title={u.email || ''}>
                      {u.email || '—'}
                    </td>
                    <td className="px-3 py-2 capitalize" style={{ color: ADMIN_THEME.text }}>{u.user_type || '—'}</td>
                    <td className="px-3 py-2">
                      {house ? (
                        <span style={{ color: house.color }}>{house.name}</span>
                      ) : (
                        <span style={{ color: ADMIN_THEME.textMuted }}>{u.house || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>{formatDate(u.created_at)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>{u.games_created}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>{u.games_purchased}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.accent }}>${formatArs(u.total_spent)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.accentSecondary }}>${formatArs(u.total_donated)}</td>
                    <td className="px-3 py-2 tabular-nums text-xs whitespace-nowrap" style={{ color: ADMIN_THEME.text }}>
                      ${Number(u.tokens_used || 0).toFixed(2)} / ${Number(u.tokens_limit ?? 1).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>{u.unlock_credits}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: ADMIN_THEME.text }}>
                      {u.has_all_access ? (
                        <span>
                          Sí
                          {u.all_access_at ? (
                            <span className="block" style={{ color: ADMIN_THEME.textMuted }}>{formatDate(u.all_access_at)}</span>
                          ) : null}
                        </span>
                      ) : (
                        'No'
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>{formatPlayed(u.time_played_seconds)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>
                      {Number(u.total_points || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }} title={formatDateTimeShort(u.last_activity)}>
                      {formatRelativeActivity(u.last_activity)}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <span className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => toggleAdmin(u)}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: u.is_admin ? '#64748b' : ADMIN_THEME.accent, color: '#fff' }}
                        >
                          {u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlock(u)}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: u.is_blocked ? '#22c55e' : '#ef4444', color: '#fff' }}
                        >
                          {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border }} className="border-t">
                      <td colSpan={17} className="px-6 py-4 text-sm">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold mb-2" style={{ color: ADMIN_THEME.text }}>Packs comprados</h4>
                            {(u.packs_purchased || []).length === 0 ? (
                              <p style={{ color: ADMIN_THEME.textMuted }}>Sin registros</p>
                            ) : (
                              <ul className="space-y-1">
                                {u.packs_purchased.map((p, idx) => (
                                  <li key={`${u.id}-p-${idx}`} style={{ color: ADMIN_THEME.textMuted }}>
                                    <span style={{ color: ADMIN_THEME.text }}>{PACK_LABEL[p.pack_type] || p.pack_type}</span>
                                    {' — '}${formatArs(p.amount_paid)}
                                    {p.purchased_at ? (
                                      <span className="text-xs"> · {formatDateTimeShort(p.purchased_at)}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold mb-2" style={{ color: ADMIN_THEME.text }}>Donaciones</h4>
                            {(u.donations_detail || []).length === 0 ? (
                              <p style={{ color: ADMIN_THEME.textMuted }}>Sin donaciones registradas</p>
                            ) : (
                              <ul className="space-y-1">
                                {u.donations_detail.map((d, idx) => (
                                  <li key={`${u.id}-d-${idx}`} style={{ color: ADMIN_THEME.textMuted }}>
                                    <span style={{ color: ADMIN_THEME.accentSecondary }}>${formatArs(d.amount)}</span>
                                    {d.donated_at ? (
                                      <span className="text-xs"> · {formatDateTimeShort(d.donated_at)}</span>
                                    ) : null}
                                    {d.payment_id ? (
                                      <span className="text-xs font-mono block truncate max-w-md">MP: {d.payment_id}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>No hay usuarios.</p>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <button
            type="button"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-40"
            style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text, background: ADMIN_THEME.card }}
          >
            Anterior
          </button>
          <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>
            Página {pageSafe + 1} de {pageCount}
          </p>
          <button
            type="button"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-40"
            style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text, background: ADMIN_THEME.card }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
