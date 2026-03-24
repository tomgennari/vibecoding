'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { supabase } from '@/utils/supabase/client.js';
import { HOUSES, GAME_STATUS, ADMIN_THEME } from '../constants.js';
import RejectGameModal from './RejectGameModal.js';
import LoadGameModal from './LoadGameModal.js';
import DeleteGameModal from './DeleteGameModal.js';
import GamePreviewModal from './GamePreviewModal.js';

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

export default function AdminGamesSection() {
  const [games, setGames] = useState([]);
  const [authors, setAuthors] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [deleteGame, setDeleteGame] = useState(null);
  const [previewGame, setPreviewGame] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    if (error) {
      setGames([]);
      setLoading(false);
      return;
    }
    setGames(data || []);
    const ids = [...new Set((data || []).map((g) => g.submitted_by).filter(Boolean))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', ids);
      const map = {};
      (profiles || []).forEach((p) => {
        map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
      });
      setAuthors(map);
    } else {
      setAuthors({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    setAnalysisResult(null);
  }, [previewGame]);

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
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }
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
    };
    const { error } = await supabase.from('games').insert(row);
    if (error) throw error;
    fetchGames();
  }

  function getStoragePathFromFileUrl(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string') return null;
    const match = fileUrl.match(/\/games\/(.+)$/);
    return match ? match[1] : null;
  }

  async function handleDeleteGame() {
    if (!deleteGame?.id) return;
    const game = games.find((g) => g.id === deleteGame.id);
    if (game?.file_url) {
      const path = getStoragePathFromFileUrl(game.file_url);
      if (path) await supabase.storage.from('games').remove([path]);
    }
    await supabase.from('games').delete().eq('id', deleteGame.id);
    setDeleteGame(null);
    fetchGames();
  }

  const filtered = statusFilter ? games.filter((g) => g.status === statusFilter) : games;
  const statusLabel = (s) => (s ? (GAME_STATUS[s] || s) : '—');

  return (
    <div className="p-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Juegos</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: statusFilter === f.value ? ADMIN_THEME.accent : 'transparent',
                color: statusFilter === f.value ? '#fff' : ADMIN_THEME.textMuted,
                border: `1px solid ${statusFilter === f.value ? ADMIN_THEME.accent : ADMIN_THEME.border}`,
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setEditGame(null); setLoadModalOpen(true); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: ADMIN_THEME.accent }}
          >
            Cargar juego
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : (
        <div className="rounded-xl border overflow-hidden min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
          <table className="w-full text-sm">
            <thead style={{ background: ADMIN_THEME.bg }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Título</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>House</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Autor</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Estado</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Fecha</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game, i) => {
                const house = HOUSES.find((h) => h.id === game.house);
                return (
                  <tr
                    key={game.id}
                    style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}
                  >
                    <td className="px-4 py-2.5 truncate max-w-[200px]" style={{ color: ADMIN_THEME.text }}>{game.title || '—'}</td>
                    <td className="px-4 py-2.5">
                      {house ? (
                        <span className="flex items-center gap-1.5">
                          <Image src={house.image} alt="" width={18} height={18} className="object-contain" />
                          <span style={{ color: house.color }}>{house.name}</span>
                        </span>
                      ) : (
                        <span style={{ color: ADMIN_THEME.textMuted }}>{game.house || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 truncate max-w-[140px]" style={{ color: ADMIN_THEME.textMuted }}>{authors[game.submitted_by] || game.submitted_by || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: ADMIN_THEME.text }}>{statusLabel(game.status)}</td>
                    <td className="px-4 py-2.5" style={{ color: ADMIN_THEME.textMuted }}>{formatDate(game.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {game.status === 'pending' && (
                          <>
                            <button type="button" onClick={() => handleApprove(game.id)} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: '#22c55e' }}>Aprobar</button>
                            <button type="button" onClick={() => setRejectModal({ id: game.id, title: game.title })} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: '#ef4444' }}>Rechazar</button>
                          </>
                        )}
                        <button type="button" onClick={() => setPreviewGame(game)} className="vibe-btn-secondary px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1" style={{ color: ADMIN_THEME.accent, border: `1px solid ${ADMIN_THEME.accent}` }}><Eye size={13} /> Ver</button>
                        <button type="button" onClick={() => setEditGame(game)} className="px-2 py-1 rounded text-xs font-medium" style={{ color: ADMIN_THEME.accent, border: `1px solid ${ADMIN_THEME.accent}` }}>Editar</button>
                        <button type="button" onClick={() => setDeleteGame({ id: game.id, title: game.title })} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: '#ef4444' }}>Eliminar</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>No hay juegos.</p>
          )}
        </div>
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
          authorName={authors[previewGame.submitted_by]}
          onApprove={(id) => { handleApprove(id); setPreviewGame(null); }}
          onReject={(data) => {
            setPreviewGame(null);
            setRejectModal({ ...data, defaultReason: analysisResult?.rejectionMessage });
          }}
          onClose={() => setPreviewGame(null)}
          analyzing={analyzing}
          analysisResult={analysisResult}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  );
}
