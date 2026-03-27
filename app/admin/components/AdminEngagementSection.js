'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client.js';
import { HOUSES, ADMIN_THEME } from '../constants.js';

function formatInt(n) {
  return Number(n ?? 0).toLocaleString('es-AR');
}

function formatUsd(n) {
  return Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatDurationSeconds(sec) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDayLabel(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

const BAR_CHART_MAX_PX = 120;

/** 3–4 marcas: máximo arriba, 0 abajo, intermedias. */
function yAxisTicks(maxData, segments = 3) {
  const m = Math.max(0, Number(maxData) || 0);
  if (m === 0) return [0];
  const out = [];
  for (let i = 0; i <= segments; i += 1) {
    out.push(Math.round((m * (segments - i)) / segments));
  }
  return [...new Set(out)].sort((a, b) => b - a);
}

function VerticalBars({ data, valueKey, formatTick }) {
  const vals = data.map((row) => Number(row[valueKey]) || 0);
  const maxData = Math.max(0, ...vals);
  const scaleMax = maxData > 0 ? maxData : 1;
  const ticks = yAxisTicks(maxData, 3);
  const fmt =
    formatTick ||
    ((v) => (Number.isInteger(v) ? formatInt(v) : Number(v).toLocaleString('es-AR', { maximumFractionDigits: 1 })));

  return (
    <div className="flex gap-2 items-end min-w-0">
      <div
        className="flex flex-col justify-between shrink-0 w-11 text-right pr-1 tabular-nums leading-none text-[10px]"
        style={{ height: BAR_CHART_MAX_PX, color: ADMIN_THEME.textMuted }}
      >
        {ticks.map((t, i) => (
          <span key={`${t}-${i}`}>{fmt(t)}</span>
        ))}
      </div>
      <div className="flex-1 flex items-end gap-0.5 min-w-0" style={{ height: BAR_CHART_MAX_PX }}>
        {data.map((row) => {
          const v = Number(row[valueKey]) || 0;
          const hPx =
            maxData > 0 ? Math.max(v > 0 ? 3 : 0, Math.round((v / scaleMax) * BAR_CHART_MAX_PX)) : 0;
          return (
            <div
              key={row.date}
              className="flex-1 min-w-[5px] flex flex-col items-center justify-end h-full"
              title={`${row.date}: ${v}`}
            >
              <div
                className="w-full rounded-t transition-all mt-auto"
                style={{
                  height: hPx,
                  background: `linear-gradient(180deg, ${ADMIN_THEME.accent} 0%, ${ADMIN_THEME.accentSecondary} 100%)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalBars({ items, max: maxOverride }) {
  const max = maxOverride ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <li key={item.key} className="min-w-0">
            <div className="flex justify-between text-xs mb-1" style={{ color: ADMIN_THEME.textMuted }}>
              <span style={{ color: item.color || ADMIN_THEME.text }} className="truncate font-medium">
                {item.label}
              </span>
              <span className="tabular-nums shrink-0">{formatInt(item.value)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: ADMIN_THEME.border }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: item.color || ADMIN_THEME.accent,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RankTable({ title, rows, columns }) {
  return (
    <div
      className="rounded-xl border p-4 min-w-0"
      style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
    >
      <h4 className="font-bold mb-3 text-sm" style={{ color: ADMIN_THEME.text }}>{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: ADMIN_THEME.textMuted }}>
              {columns.map((c) => (
                <th key={c.key} className={`text-left pb-2 font-semibold ${c.right ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ color: ADMIN_THEME.textMuted }}>
                  Sin datos
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.key || i} style={{ color: ADMIN_THEME.text, borderTop: `1px solid ${ADMIN_THEME.border}` }}>
                  {columns.map((c) => (
                    <td key={c.key} className={`py-1.5 ${c.right ? 'text-right tabular-nums' : ''} max-w-[10rem] truncate`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminEngagementSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

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
      const res = await fetch('/api/admin/engagement', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Error ${res.status}`);
        setData(null);
        return;
      }
      setData(body);
    } catch (e) {
      setError(e.message || 'Error al cargar');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: ADMIN_THEME.textMuted }}>Cargando engagement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-400">{error || 'Sin datos'}</p>
        <button type="button" onClick={load} className="mt-2 text-sm underline" style={{ color: ADMIN_THEME.accent }}>
          Reintentar
        </button>
      </div>
    );
  }

  const au = data.activeUsers || {};
  const regHouseItems = HOUSES.map((h) => ({
    key: h.id,
    label: h.name,
    color: h.color,
    value: data.registrationsByHouse?.[h.id] ?? 0,
  }));
  const andy = data.gamesAndyVsManual?.andy ?? 0;
  const manual = data.gamesAndyVsManual?.manual ?? 0;
  const andyTotal = Math.max(1, andy + manual);
  const retentionRate = data.retention?.rate ?? 0;

  const topTimeRows = (data.topGamesByTimePlayed || []).map((r, i) => ({
    key: r.game_id,
    rank: i + 1,
    title: r.title,
    value: formatDurationSeconds(r.seconds),
  }));
  const topPlayersRows = (data.topGamesByPlayers || []).map((r, i) => ({
    key: r.game_id,
    rank: i + 1,
    title: r.title,
    value: formatInt(r.unique_players),
  }));
  const topLikesRows = (data.topGamesByLikes || []).map((r, i) => ({
    key: r.game_id,
    rank: i + 1,
    title: r.title,
    value: formatInt(r.total_likes),
  }));
  const topPlayersTimeRows = (data.topPlayersByTimePlayed || []).map((r, i) => ({
    key: r.user_id,
    rank: i + 1,
    name: r.name,
    value: formatDurationSeconds(r.seconds),
  }));
  const topUnlockRows = (data.topPlayersByGamesUnlocked || []).map((r, i) => ({
    key: r.user_id,
    rank: i + 1,
    name: r.name,
    value: formatInt(r.count),
  }));

  const ac = data.andyCredits || {};

  return (
    <div className="p-6 min-w-0 max-w-[1400px] space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold" style={{ color: ADMIN_THEME.text }}>Engagement</h2>
        <button
          type="button"
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: ADMIN_THEME.border, color: ADMIN_THEME.accent }}
        >
          Actualizar
        </button>
      </div>

      <section>
        <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Actividad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Usuarios activos hoy', value: formatInt(au.today), highlight: false },
            { label: 'Últimos 7 días', value: formatInt(au.last7days), highlight: false },
            { label: 'Últimos 30 días', value: formatInt(au.last30days), highlight: false },
            {
              label: 'Tiempo total jugado',
              value: formatDurationSeconds(data.totalTimePlayed),
              highlight: true,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border p-5"
              style={{
                borderColor: ADMIN_THEME.border,
                background: ADMIN_THEME.card,
                ...(c.highlight
                  ? { borderColor: ADMIN_THEME.accentSecondary, boxShadow: `0 0 0 1px ${ADMIN_THEME.accentSecondary}40` }
                  : {}),
              }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: ADMIN_THEME.textMuted }}>{c.label}</p>
              <p
                className="text-3xl font-black tabular-nums"
                style={{ color: c.highlight ? ADMIN_THEME.accentSecondary : ADMIN_THEME.accent }}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Tendencias (30 días)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Registros por día',
              data: data.registrationsByDay || [],
              key: 'count',
            },
            {
              title: 'Tiempo jugado por día (minutos)',
              data: data.timePlayedByDay || [],
              key: 'minutes',
            },
            {
              title: 'Juegos creados por día',
              data: data.gamesCreatedByDay || [],
              key: 'count',
            },
          ].map((chart) => (
            <div
              key={chart.title}
              className="rounded-xl border p-4"
              style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
            >
              <h4 className="font-semibold text-sm mb-2" style={{ color: ADMIN_THEME.text }}>{chart.title}</h4>
              <VerticalBars
                data={chart.data}
                valueKey={chart.key}
                formatTick={
                  chart.key === 'minutes'
                    ? (v) =>
                        Number(v).toLocaleString('es-AR', { maximumFractionDigits: v >= 10 || Number.isInteger(v) ? 0 : 1 })
                    : undefined
                }
              />
              <p className="text-[10px] mt-2 flex flex-wrap gap-x-1" style={{ color: ADMIN_THEME.textMuted }}>
                {(chart.data || []).slice(0, 6).map((d) => (
                  <span key={d.date}>{formatDayLabel(d.date)}</span>
                ))}
                <span>…</span>
                {(chart.data || []).slice(-4).map((d) => (
                  <span key={`e-${d.date}`}>{formatDayLabel(d.date)}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Distribución</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
          >
            <h4 className="font-semibold text-sm mb-3" style={{ color: ADMIN_THEME.text }}>Registros por House</h4>
            <HorizontalBars items={regHouseItems} />
          </div>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
          >
            <h4 className="font-semibold text-sm mb-3" style={{ color: ADMIN_THEME.text }}>Juegos: Andy vs Manual</h4>
            <p className="text-xs mb-3" style={{ color: ADMIN_THEME.textMuted }}>
              Andy = URL de archivo contiene <code className="text-[10px]">game-lab</code>
            </p>
            <HorizontalBars
              items={[
                { key: 'andy', label: 'Game Lab (Andy)', value: andy, color: ADMIN_THEME.accent },
                { key: 'man', label: 'Subida manual', value: manual, color: ADMIN_THEME.accentSecondary },
              ]}
              max={andyTotal}
            />
          </div>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
          >
            <h4 className="font-semibold text-sm mb-3" style={{ color: ADMIN_THEME.text }}>Retención</h4>
            <p className="text-sm mb-2" style={{ color: ADMIN_THEME.text }}>
              <strong className="tabular-nums" style={{ color: ADMIN_THEME.accent }}>{retentionRate}%</strong>
              {' '}de usuarios que jugaron volvieron a jugar otro día distinto
            </p>
            <p className="text-xs mb-3" style={{ color: ADMIN_THEME.textMuted }}>
              Base: {formatInt(data.retention?.usersDay1)} jugadores con al menos una sesión ·{' '}
              {formatInt(data.retention?.usersReturned)} con 2+ días de actividad (calendario AR)
            </p>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: ADMIN_THEME.border }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, retentionRate)}%`,
                  background: ADMIN_THEME.accent,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Rankings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankTable
            title="Top juegos por tiempo jugado"
            rows={topTimeRows}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'title', label: 'Juego' },
              { key: 'value', label: 'Tiempo', right: true },
            ]}
          />
          <RankTable
            title="Top juegos por jugadores únicos"
            rows={topPlayersRows}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'title', label: 'Juego' },
              { key: 'value', label: 'Jugadores', right: true },
            ]}
          />
          <RankTable
            title="Top juegos por likes"
            rows={topLikesRows}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'title', label: 'Juego' },
              { key: 'value', label: 'Likes', right: true },
            ]}
          />
          <RankTable
            title="Top jugadores por tiempo jugado"
            rows={topPlayersTimeRows}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'name', label: 'Usuario' },
              { key: 'value', label: 'Tiempo', right: true },
            ]}
          />
          <RankTable
            title="Top jugadores por desbloqueos (filas en game_unlocks)"
            rows={topUnlockRows}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'name', label: 'Usuario' },
              { key: 'value', label: 'Desbloqueos', right: true },
            ]}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4" style={{ color: ADMIN_THEME.text }}>Andy / Game Lab</h3>
        <div
          className="rounded-xl border p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ borderColor: ADMIN_THEME.border, background: ADMIN_THEME.card }}
        >
          <div>
            <p className="text-xs font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Créditos consumidos (total)</p>
            <p className="text-2xl font-black tabular-nums mt-1" style={{ color: ADMIN_THEME.accent }}>
              ${formatUsd(ac.totalConsumed)} USD
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Promedio por usuario</p>
            <p className="text-2xl font-black tabular-nums mt-1" style={{ color: ADMIN_THEME.text }}>
              ${formatUsd(ac.averagePerUser)} USD
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Juegos generados (Andy)</p>
            <p className="text-2xl font-black tabular-nums mt-1" style={{ color: ADMIN_THEME.text }}>
              {formatInt(ac.gamesGenerated)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: ADMIN_THEME.textMuted }}>Publicados / rechazados</p>
            <p className="text-lg font-bold tabular-nums mt-1" style={{ color: '#22c55e' }}>
              ✓ {formatInt(ac.gamesPublished)}
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: '#ef4444' }}>
              ✗ {formatInt(ac.gamesRejected)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
