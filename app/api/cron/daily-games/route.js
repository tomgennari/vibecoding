import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayArgentina } from '@/lib/dates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = getTodayArgentina();
  let added = 0;

  try {
    const scheduledRes = await supabase
      .from('daily_free_games')
      .select('id, game_id')
      .eq('scheduled_for', today);
    const scheduled = scheduledRes.data || [];
    for (const row of scheduled) {
      await supabase
        .from('daily_free_games')
        .update({ active_date: today })
        .eq('id', row.id);
    }

    const activeRes = await supabase
      .from('daily_free_games')
      .select('game_id')
      .eq('active_date', today);
    const activeToday = activeRes.data || [];
    const activeCount = activeToday.length;
    const alreadyActiveGameIds = new Set(activeToday.map((r) => r.game_id));

    if (activeCount < 3) {
      const toAdd = 3 - activeCount;

      const { data: everDaily } = await supabase.from('daily_free_games').select('game_id');
      const everUsedGameIds = new Set((everDaily || []).map((r) => r.game_id));

      const { data: sessions } = await supabase.from('game_sessions').select('game_id, user_id');
      const uniqueByGame = {};
      (sessions || []).forEach((s) => {
        if (!s.game_id) return;
        if (!uniqueByGame[s.game_id]) uniqueByGame[s.game_id] = new Set();
        uniqueByGame[s.game_id].add(s.user_id);
      });
      const playsByGame = {};
      Object.keys(uniqueByGame).forEach((gid) => { playsByGame[gid] = uniqueByGame[gid].size; });

      const { data: approvedGames } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'approved');
      const candidates = (approvedGames || [])
        .filter((g) => !alreadyActiveGameIds.has(g.id))
        .map((g) => ({
          id: g.id,
          neverUsed: !everUsedGameIds.has(g.id),
          plays: playsByGame[g.id] || 0,
        }))
        .sort((a, b) => {
          if (a.neverUsed !== b.neverUsed) return a.neverUsed ? -1 : 1;
          return a.plays - b.plays;
        });

      const toInsert = candidates.slice(0, toAdd);
      for (const g of toInsert) {
        const { error } = await supabase.from('daily_free_games').insert({
          game_id: g.id,
          active_date: today,
          auto_selected: true,
        });
        if (!error) added += 1;
      }
    }

    return NextResponse.json({ ok: true, added });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
