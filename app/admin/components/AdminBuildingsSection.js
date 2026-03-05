'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME } from '../constants.js';

function formatArs(n) {
  return Number(n).toLocaleString('es-AR');
}

export default function AdminBuildingsSection() {
  const [buildings, setBuildings] = useState([]);
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('buildings').select('*').order('display_order', { ascending: true }).order('id', { ascending: true });
    if (error) {
      const { data: fallback } = await supabase.from('buildings').select('*').order('name', { ascending: true });
      setBuildings(fallback || []);
    } else {
      setBuildings(data || []);
    }
    setDirty({});
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  function setCurrentAmount(id, value) {
    setDirty((prev) => ({ ...prev, [id]: value }));
  }

  async function saveBuilding(b) {
    const value = dirty[b.id] !== undefined ? dirty[b.id] : b.current_amount;
    const num = Number(value) || 0;
    setSavingId(b.id);
    const { error } = await supabase.from('buildings').update({ current_amount: num }).eq('id', b.id);
    setSavingId(null);
    if (!error) fetchBuildings();
  }

  const currentValue = (b) => (dirty[b.id] !== undefined ? dirty[b.id] : (b.current_amount ?? 0));
  const target = (b) => Number(b.target_amount) || 0;
  const pct = (b) => (target(b) > 0 ? Math.min(100, Math.round((Number(currentValue(b)) / target(b)) * 100)) : 0);

  return (
    <div className="p-6 min-w-0">
      <h2 className="text-xl font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Edificios</h2>
      {loading ? (
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando...</p>
      ) : buildings.length === 0 ? (
        <p className="py-4 rounded-xl border text-center" style={{ color: ADMIN_THEME.textMuted, borderColor: ADMIN_THEME.border }}>No hay edificios.</p>
      ) : (
        <ul className="space-y-4">
          {buildings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border p-4 min-w-0"
              style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: ADMIN_THEME.text }}>{b.name || 'Edificio'}</p>
                  <p className="text-sm mt-1" style={{ color: ADMIN_THEME.textMuted }}>Objetivo: ${formatArs(b.target_amount)} ARS — {pct(b)}%</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-bold uppercase" style={{ color: ADMIN_THEME.textMuted }}>Recaudado</label>
                  <input
                    type="number"
                    value={currentValue(b)}
                    onChange={(e) => setCurrentAmount(b.id, e.target.value)}
                    min={0}
                    className="w-32 rounded-lg px-3 py-2 text-sm border tabular-nums"
                    style={{ background: ADMIN_THEME.bg, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text }}
                  />
                  <button
                    type="button"
                    onClick={() => saveBuilding(b)}
                    disabled={savingId === b.id}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: ADMIN_THEME.accent }}
                  >
                    {savingId === b.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: ADMIN_THEME.border }}>
                <div className="h-full rounded-full transition-[width]" style={{ width: `${pct(b)}%`, background: `linear-gradient(90deg, ${ADMIN_THEME.accent} 0%, ${ADMIN_THEME.accentSecondary} 100%)` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
