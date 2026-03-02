'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AdminUsersSection() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      })
    : users;

  async function toggleAdmin(profile) {
    const next = !profile.is_admin;
    const { error } = await supabase.from('profiles').update({ is_admin: next }).eq('id', profile.id);
    if (!error) fetchUsers();
  }

  async function toggleBlock(profile) {
    const next = !profile.is_blocked;
    const { error } = await supabase.from('profiles').update({ is_blocked: next }).eq('id', profile.id);
    if (!error) fetchUsers();
  }

  const displayName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || '—';

  return (
    <div className="p-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Usuarios</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="rounded-lg px-3 py-2 text-sm w-64 min-w-0 border outline-none focus:ring-2"
          style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
        />
      </div>

      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : (
        <div className="rounded-xl border overflow-hidden min-w-0" style={{ borderColor: ADMIN_THEME.border }}>
          <table className="w-full text-sm">
            <thead style={{ background: ADMIN_THEME.bg }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Nombre</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Email</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Tipo</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>House</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Registro</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Admin</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const house = HOUSES.find((h) => h.id === u.house);
                return (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? ADMIN_THEME.card : ADMIN_THEME.bg }}>
                    <td className="px-4 py-2.5 truncate max-w-[160px]" style={{ color: ADMIN_THEME.text }}>{displayName(u)}</td>
                    <td className="px-4 py-2.5 truncate max-w-[180px]" style={{ color: ADMIN_THEME.textMuted }}>{u.email || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: ADMIN_THEME.text }}>{u.user_type || '—'}</td>
                    <td className="px-4 py-2.5">
                      {house ? <span style={{ color: house.color }}>{house.name}</span> : <span style={{ color: ADMIN_THEME.textMuted }}>{u.house || '—'}</span>}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: ADMIN_THEME.textMuted }}>{formatDate(u.created_at)}</td>
                    <td className="px-4 py-2.5" style={{ color: ADMIN_THEME.text }}>{u.is_admin ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => toggleAdmin(u)} className="px-2 py-1 rounded text-xs font-medium" style={{ background: u.is_admin ? '#64748b' : ADMIN_THEME.accent, color: '#fff' }}>{u.is_admin ? 'Quitar admin' : 'Hacer admin'}</button>
                        <button type="button" onClick={() => toggleBlock(u)} className="px-2 py-1 rounded text-xs font-medium" style={{ background: u.is_blocked ? '#22c55e' : '#ef4444', color: '#fff' }}>{u.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="px-4 py-6 text-center" style={{ color: ADMIN_THEME.textMuted }}>No hay usuarios.</p>}
        </div>
      )}
    </div>
  );
}
