'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase.js';
import { HOUSES, GAME_STATUS, ADMIN_THEME } from '../constants.js';
import RejectGameModal from './RejectGameModal.js';
import LoadGameModal from './LoadGameModal.js';

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

  async function handleApprove(gameId) {
    const { error } = await supabase.from('games').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', gameId);
    if (!error) fetchGames();
  }

  async function handleReject(reason) {
    if (!rejectModal?.id) return;
    const update = { status: 'rejected' };
    if (reason && reason.trim()) update.rejection_reason = reason.trim();
    const { error } = await supabase.from('games').update(update).eq('id', rejectModal.id);
    if (!error) {
      setRejectModal(null);
      fetchGames();
    }
  }

  async function handleLoadGame(payload) {
    let fileUrl = null;
    if (payload.file) {
      const name = `games/${Date.now()}-${payload.file.name}`;
      const { error: uploadError } = await supabase.storage.from('games').upload(name, payload.file, { contentType: 'text/html', upsert: true });
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
    };
    const { error } = await supabase.from('games').insert(row);
    if (error) throw error;
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
            onClick={() => setLoadModalOpen(true)}
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
                      {game.status === 'pending' && (
                        <span className="flex gap-1">
                          <button type="button" onClick={() => handleApprove(game.id)} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: '#22c55e' }}>Aprobar</button>
                          <button type="button" onClick={() => setRejectModal({ id: game.id, title: game.title })} className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: '#ef4444' }}>Rechazar</button>
                        </span>
                      )}
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
          onConfirm={handleReject}
          onClose={() => setRejectModal(null)}
        />
      )}
      {loadModalOpen && (
        <LoadGameModal
          onSave={handleLoadGame}
          onClose={() => setLoadModalOpen(false)}
        />
      )}
    </div>
  );
}
