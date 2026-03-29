'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Eye, Download } from 'lucide-react';
import { supabase } from '@/utils/supabase/client.js';
import { HOUSES, GAME_STATUS, ADMIN_THEME } from '../constants.js';
import { getGamesBucketPathFromPublicUrl } from '@/lib/games-bucket-path.js';
import RejectGameModal from './RejectGameModal.js';
import LoadGameModal from './LoadGameModal.js';
import DeleteGameModal from './DeleteGameModal.js';
import GamePreviewModal from './GamePreviewModal.js';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatArs(n) {
  return Number(n || 0).toLocaleString('es-AR');
}

function formatPlayedSeconds(totalSeconds) {
  const s = Number(totalSeconds) || 0;
  if (s === 0) return '0m';
  const m = Math.floor(s / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  }
  return `${m}m`;
}

function formatRelativeLast(iso) {
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
    return `hace ${Math.floor(dayDiff / 30)} meses`;
  } catch {
    return '—';
  }
}

function slugFileName(title) {
  const base = (title || 'juego').replace(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ\s-]/g, '').trim().replace(/\s+/g, '-') || 'juego';
  return `${base}.html`;
}

export default function AdminGamesSection() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [houseFilter, setHouseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [deleteGame, setDeleteGame] = useState(null);
  const [previewGame, setPreviewGame] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  /** @type {Record<string, 'clean' | 'warnings' | 'blocked'>} */
  const [securityScanByGameId, setSecurityScanByGameId] = useState({});

  const handleSecurityScanResult = useCallback((gameId, summary) => {
    if (!gameId) return;
    setSecurityScanByGameId((prev) => ({ ...prev, [gameId]: summary }));
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setGames([]);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/juegos', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGames([]);
        setLoading(false);
        return;
      }
      const list = Array.isArray(body.games) ? body.games : [];
      setGames(list);
      setPreviewGame((prev) => {
        if (!prev) return null;
        return list.find((g) => g.id === prev.id) || prev;
      });
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    setAnalysisResult(null);
  }, [previewGame?.id]);

  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(t);
  }, [copiedId]);

  async function handleAnalyze(gameHtml) {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/admin/analyze-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ html: gameHtml }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysisResult(data.analysis);
    } catch (err) {
      console.error('Error analizando:', err);
    }
    setAnalyzing(false);
  }

  async function handleApprove(gameId) {
    const updateData = { status: 'approved', approved_at: new Date().toISOString() };
    const { error } = await supabase.from('games').update(updateData).eq('id', gameId);
    if (!error) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/admin/notify-approval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ gameId }),
        });
      } catch (err) {
        console.error('Error enviando email de aprobación:', err);
      }
      setAnalysisResult(null);
      fetchGames();
    }
  }

  async function handleReject(reason) {
    if (!rejectModal?.id) return;
    const update = { status: 'rejected' };
    if (reason && reason.trim()) update.rejection_reason = reason.trim();
    const { error } = await supabase.from('games').update(update).eq('id', rejectModal.id);
    if (!error) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/admin/notify-rejection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ gameId: rejectModal.id, reason: reason?.trim() || '' }),
        });
      } catch (err) {
        console.error('Error enviando email de rechazo:', err);
      }
      setRejectModal(null);
      setAnalysisResult(null);
      fetchGames();
    }
  }

  async function handleLoadGame(payload) {
    if (payload.id) {
      let fileUrl = payload.file ? null : undefined;
      if (payload.file) {
        const name = `games/${Date.now()}-${payload.file.name}`;
        const { error: uploadError } = await supabase.storage.from('games').upload(name, payload.file, { contentType: 'text/html', upsert: false });
        if (uploadError) throw new Error('No se pudo subir el archivo.');
        const { data: urlData } = supabase.storage.from('games').getPublicUrl(name);
        fileUrl = urlData?.publicUrl ?? name;
      }
      const row = {
        title: payload.title,
        description: payload.description || null,
        house: payload.house,
        price: payload.price,
        ...(fileUrl != null && { file_url: fileUrl }),
        ...(payload.game_width != null && { game_width: payload.game_width }),
        ...(payload.game_height != null && { game_height: payload.game_height }),
        ...(payload.orientation != null && { orientation: payload.orientation }),
      };
      const { error } = await supabase.from('games').update(row).eq('id', payload.id);
      if (error) throw error;
      setEditGame(null);
      fetchGames();
      return;
    }
    let fileUrl = null;
    if (payload.file) {
      const name = `games/${Date.now()}-${payload.file.name}`;
      const { error: uploadError } = await supabase.storage.from('games').upload(name, payload.file, { contentType: 'text/html', upsert: false });
      if (uploadError) throw new Error('No se pudo subir el archivo.');
      const { data: urlData } = supabase.storage.from('games').getPublicUrl(name);
      fileUrl = urlData?.publicUrl ?? name;
    }
    const row = {
      title: payload.title,
      description: payload.description || null,
      house: payload.house,
      file_url: fileUrl,
      status: 'approved',
      approved_at: new Date().toISOString(),
      game_width: payload.game_width ?? 800,
      game_height: payload.game_height ?? 600,
      orientation: payload.orientation ?? 'horizontal',
      price: payload.price ?? null,
    };
    const { error } = await supabase.from('games').insert(row);
    if (error) throw error;
    fetchGames();
  }

  async function handleDeleteGame() {
    if (!deleteGame?.id) return;
    const game = games.find((g) => g.id === deleteGame.id);
    if (game?.file_url) {
      const path = getGamesBucketPathFromPublicUrl(game.file_url);
      if (path) await supabase.storage.from('games').remove([path]);
    }
    await supabase.from('games').delete().eq('id', deleteGame.id);
    setDeleteGame(null);
    fetchGames();
  }

  async function downloadHtml(game) {
    if (!game.file_url) return;
    try {
      const res = await fetch(game.file_url);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slugFileName(game.title);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(game.file_url, '_blank', 'noopener');
    }
  }

  function copyGameId(id) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((g) => {
      if (q) {
        const title = (g.title || '').toLowerCase();
        const author = (g.author_name || '').toLowerCase();
        if (!title.includes(q) && !author.includes(q)) return false;
      }
      if (statusFilter && g.status !== statusFilter) return false;
      if (houseFilter && g.house !== houseFilter) return false;
      if (typeFilter === 'andy' && !g.is_andy) return false;
      if (typeFilter === 'manual' && g.is_andy) return false;
      return true;
    });
  }, [games, search, statusFilter, houseFilter, typeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = String(a.id).localeCompare(String(b.id));
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '', 'es');
          break;
        case 'house':
          cmp = (a.house || '').localeCompare(b.house || '', 'es');
          break;
        case 'author_name':
          cmp = (a.author_name || '').localeCompare(b.author_name || '', 'es');
          break;
        case 'is_andy':
          cmp = (a.is_andy === b.is_andy ? 0 : a.is_andy ? 1 : -1);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '', 'es');
          break;
        case 'created_at':
          cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'unique_players':
          cmp = (Number(a.unique_players) || 0) - (Number(b.unique_players) || 0);
          break;
        case 'total_likes':
          cmp = (Number(a.total_likes) || 0) - (Number(b.total_likes) || 0);
          break;
        case 'revenue':
          cmp = (Number(a.revenue) || 0) - (Number(b.revenue) || 0);
          break;
        case 'time_played_seconds':
          cmp = (Number(a.time_played_seconds) || 0) - (Number(b.time_played_seconds) || 0);
          break;
        case 'max_score':
          cmp = (Number(a.max_score) || -1) - (Number(b.max_score) || -1);
          break;
        case 'last_played':
          cmp = new Date(a.last_played || 0).getTime() - new Date(b.last_played || 0).getTime();
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
  }, [search, statusFilter, houseFilter, typeFilter, games.length]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      const prefersAsc = ['title', 'author_name', 'house', 'status', 'id'].includes(key);
      setSortDir(prefersAsc ? 'asc' : 'desc');
    }
  };

  const sortHint = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const thBtn = (key, label, right = false) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className={`w-full px-3 py-2 text-left font-semibold text-xs ${right ? 'text-right' : ''}`}
      style={{ color: ADMIN_THEME.textMuted }}
    >
      {label}{sortHint(key)}
    </button>
  );

  return (
    <div className="p-6 min-w-0 max-w-[100vw]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Juegos</h2>
        <p className="text-sm" style={{ color: ADMIN_THEME.textMuted }}>
          Mostrando {sorted.length === 0 ? 0 : pageSafe * PAGE_SIZE + 1}–
          {Math.min((pageSafe + 1) * PAGE_SIZE, sorted.length)} de {sorted.length} juegos
          {sorted.length !== games.length ? ` (filtrados de ${games.length})` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-end" style={{ color: ADMIN_THEME.text }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Buscar</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título o autor…"
            className="rounded-lg px-3 py-2 text-sm border w-48"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value || 'all'} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>House</label>
          <select
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todas</option>
            {HOUSES.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
          >
            <option value="">Todos</option>
            <option value="andy">Andy</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setEditGame(null); setLoadModalOpen(true); }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white mt-5 sm:mt-0"
          style={{ background: ADMIN_THEME.accent }}
        >
          Cargar juego
        </button>
      </div>

      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : (
        <>
          <div className="rounded-xl border overflow-x-auto min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
            <table className="w-full text-xs min-w-[1160px]">
              <thead style={{ background: ADMIN_THEME.card }}>
                <tr>
                  <th className="w-24">{thBtn('id', 'ID')}</th>
                  <th className="min-w-[7rem]">{thBtn('title', 'Título')}</th>
                  <th>{thBtn('house', 'House')}</th>
                  <th className="min-w-[6rem]">{thBtn('author_name', 'Autor')}</th>
                  <th>{thBtn('is_andy', 'Tipo')}</th>
                  <th>{thBtn('status', 'Estado')}</th>
                  <th>{thBtn('created_at', 'Fecha')}</th>
                  <th className="text-right">{thBtn('unique_players', 'Jugadores', true)}</th>
                  <th className="text-right">{thBtn('total_likes', 'Likes', true)}</th>
                  <th className="text-right">{thBtn('revenue', 'Recaudado', true)}</th>
                  <th>{thBtn('time_played_seconds', 'Tiempo')}</th>
                  <th className="text-right">{thBtn('max_score', 'High', true)}</th>
                  <th>{thBtn('last_played', 'Últ.part.')}</th>
                  <th className="px-2">Badges</th>
                  <th className="px-2 w-10 text-center" title="Seguridad (se actualiza al abrir Ver)">Seg.</th>
                  <th className="px-2 min-w-[8rem]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((game, i) => {
                  const house = HOUSES.find((h) => h.id === game.house);
                  const statusLabel = GAME_STATUS[game.status] || game.status;
                  return (
                    <tr
                      key={game.id}
                      style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg, borderTop: `1px solid ${ADMIN_THEME.border}` }}
                    >
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => copyGameId(game.id)}
                          className="font-mono text-[11px] underline-offset-2 hover:underline"
                          style={{ color: copiedId === game.id ? '#22c55e' : ADMIN_THEME.accent }}
                          title={copiedId === game.id ? '✅ Copiado' : 'Copiar UUID completo'}
                        >
                          {game.id.slice(0, 8)}
                        </button>
                      </td>
                      <td className="px-2 py-2 truncate max-w-[10rem] font-medium" style={{ color: ADMIN_THEME.text }} title={game.title}>
                        {game.title || '—'}
                      </td>
                      <td className="px-2 py-2">
                        {house ? (
                          <span className="inline-flex items-center gap-1">
                            <Image src={house.image} alt="" width={16} height={16} className="object-contain shrink-0" />
                            <span style={{ color: house.color }}>{house.name}</span>
                          </span>
                        ) : (
                          <span style={{ color: ADMIN_THEME.textMuted }}>{game.house || '—'}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 truncate max-w-[7rem]" style={{ color: ADMIN_THEME.textMuted }} title={game.author_name}>
                        {game.author_name || '—'}
                      </td>
                      <td className="px-2 py-2">
                        {game.is_andy ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#7c3aed30', color: '#a78bfa' }}>
                            🤖 Andy
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#64748b30', color: '#94a3b8' }}>
                            📄 Manual
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold capitalize"
                          style={{
                            background:
                              game.status === 'approved' ? '#22c55e25' : game.status === 'pending' ? '#eab30825' : '#ef444425',
                            color: game.status === 'approved' ? '#22c55e' : game.status === 'pending' ? '#eab308' : '#ef4444',
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>{formatDate(game.created_at)}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>{game.unique_players ?? 0}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>{game.total_likes ?? 0}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.accent }}>
                        ${formatArs(game.revenue)} ARS
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>
                        {formatPlayedSeconds(game.time_played_seconds)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: ADMIN_THEME.text }}>
                        {game.max_score != null ? formatArs(game.max_score) : '—'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap" style={{ color: ADMIN_THEME.textMuted }}>
                        {formatRelativeLast(game.last_played)}
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap gap-0.5">
                          {game.is_free_today && <span title="Gratis hoy" className="text-[10px] whitespace-nowrap">🆓 Hoy</span>}
                          {game.unlocked_for_all && <span title="Desbloqueado para todos" className="text-[10px] whitespace-nowrap">🌐 Todos</span>}
                          {!game.was_ever_free && game.status === 'approved' && (
                            <span className="text-[10px] whitespace-nowrap" style={{ color: ADMIN_THEME.accentSecondary }} title="Nunca en juego del día">
                              🆕 Nunca gratis
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-sm tabular-nums" title={securityScanByGameId[game.id] ? `Scan: ${securityScanByGameId[game.id]}` : 'Abrí la vista previa (Ver) para analizar el HTML'}>
                        {securityScanByGameId[game.id] === 'clean' ? '🟢' : securityScanByGameId[game.id] === 'warnings' ? '🟡' : securityScanByGameId[game.id] === 'blocked' ? '🔴' : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewGame(game)}
                            className="px-2 py-1 rounded text-[10px] font-medium inline-flex items-center gap-0.5"
                            style={{ color: ADMIN_THEME.accent, border: `1px solid ${ADMIN_THEME.accent}` }}
                          >
                            <Eye size={12} /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditGame(game)}
                            className="px-2 py-1 rounded text-[10px] font-medium"
                            style={{ color: ADMIN_THEME.textMuted, border: `1px solid ${ADMIN_THEME.border}` }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadHtml(game)}
                            disabled={!game.file_url}
                            title={!game.file_url ? 'Sin archivo' : 'Descargar HTML'}
                            className="px-2 py-1 rounded text-[10px] font-medium inline-flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ color: ADMIN_THEME.accentSecondary, border: `1px solid ${ADMIN_THEME.border}` }}
                          >
                            <Download size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteGame({ id: game.id, title: game.title })}
                            className="px-2 py-1 rounded text-[10px] font-medium text-white"
                            style={{ background: '#ef4444' }}
                          >
                            Eliminar
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <p className="px-4 py-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>No hay juegos.</p>
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
        </>
      )}

      {rejectModal && (
        <RejectGameModal
          gameTitle={rejectModal.title}
          defaultReason={rejectModal.defaultReason}
          onConfirm={handleReject}
          onClose={() => setRejectModal(null)}
        />
      )}
      {(loadModalOpen || editGame) && (
        <LoadGameModal
          game={editGame}
          onSave={handleLoadGame}
          onClose={() => { setLoadModalOpen(false); setEditGame(null); }}
        />
      )}
      {deleteGame && (
        <DeleteGameModal
          gameTitle={deleteGame.title}
          onConfirm={handleDeleteGame}
          onClose={() => setDeleteGame(null)}
        />
      )}
      {previewGame && (
        <GamePreviewModal
          game={previewGame}
          authorName={previewGame.author_name}
          onApprove={(id) => { handleApprove(id); setPreviewGame(null); }}
          onReject={(data) => {
            setPreviewGame(null);
            setRejectModal({ ...data, defaultReason: analysisResult?.rejectionMessage });
          }}
          onClose={() => setPreviewGame(null)}
          analyzing={analyzing}
          analysisResult={analysisResult}
          onAnalyze={handleAnalyze}
          onHtmlUpdated={fetchGames}
          onSecurityScanResult={handleSecurityScanResult}
        />
      )}
    </div>
  );
}
