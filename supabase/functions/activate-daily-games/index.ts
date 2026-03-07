import { createClient } from 'npm:@supabase/supabase-js@2';

function getArgentinaDateISO(baseDate = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(baseDate);
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = getArgentinaDateISO();
  const sevenDaysAgo = shiftIsoDate(today, -6);

  try {
    const { data: activatedRows, error: activateError } = await supabase
      .from('daily_free_games')
      .update({ active_date: today })
      .eq('scheduled_for', today)
      .is('active_date', null)
      .select('id, game_id');

    if (activateError) {
      throw activateError;
    }

    const activatedCount = activatedRows?.length ?? 0;

    const { data: activeTodayRows, error: activeTodayError } = await supabase
      .from('daily_free_games')
      .select('game_id')
      .eq('active_date', today);

    if (activeTodayError) {
      throw activeTodayError;
    }

    const activeTodayGameIds = new Set((activeTodayRows ?? []).map((row) => row.game_id).filter(Boolean));
    let autoSelectedCount = 0;

    if (activeTodayGameIds.size < 3) {
      const missing = 3 - activeTodayGameIds.size;

      const { data: recentRows, error: recentError } = await supabase
        .from('daily_free_games')
        .select('game_id')
        .gte('active_date', sevenDaysAgo)
        .lte('active_date', today);

      if (recentError) {
        throw recentError;
      }

      const recentlyUsedGameIds = new Set((recentRows ?? []).map((row) => row.game_id).filter(Boolean));

      const { data: approvedGames, error: approvedError } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'approved');

      if (approvedError) {
        throw approvedError;
      }

      const candidateGameIds = (approvedGames ?? [])
        .map((game) => game.id)
        .filter((gameId) => gameId && !activeTodayGameIds.has(gameId) && !recentlyUsedGameIds.has(gameId));

      const selected = shuffle(candidateGameIds).slice(0, missing);

      if (selected.length > 0) {
        const insertPayload = selected.map((gameId) => ({
          game_id: gameId,
          active_date: today,
          auto_selected: true,
        }));

        const { data: insertedRows, error: insertError } = await supabase
          .from('daily_free_games')
          .insert(insertPayload)
          .select('id');

        if (insertError) {
          throw insertError;
        }

        autoSelectedCount = insertedRows?.length ?? 0;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        today,
        activated_count: activatedCount,
        auto_selected_count: autoSelectedCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error)?.message ?? 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
