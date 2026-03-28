import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, status: 401 };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { ok: false, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { ok: false, status: 403 };
  return { ok: true, user };
}

async function paginateAllSessions(admin, columns) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from('andy_sessions')
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { error, rows: null };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { error: null, rows };
}

export async function GET(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { rows, error } = await paginateAllSessions(
    admin,
    'started_at, ended_in_submission, messages_count, credits_consumed, had_errors, had_auto_retry, framework_used',
  );

  if (error) {
    console.error('andy stats:', error);
    return NextResponse.json({ error: error.message || 'Error al leer sesiones' }, { status: 500 });
  }

  const totalSessions = rows.length;
  const cutoffIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let sessionsLast7d = 0;
  let submitted = 0;
  let sumMessages = 0;
  let sumCredits = 0;
  let withErrors = 0;
  let withAutoRetry = 0;
  const frameworkCounts = {};

  for (const r of rows) {
    if (r.started_at && r.started_at >= cutoffIso) sessionsLast7d += 1;
    if (r.ended_in_submission === true) submitted += 1;
    sumMessages += Number(r.messages_count) || 0;
    sumCredits += Number(r.credits_consumed) || 0;
    if (r.had_errors === true) withErrors += 1;
    if (r.had_auto_retry === true) withAutoRetry += 1;
    const fw = r.framework_used;
    if (fw && typeof fw === 'string') {
      frameworkCounts[fw] = (frameworkCounts[fw] || 0) + 1;
    }
  }

  const successRatePct = totalSessions > 0 ? Math.round((submitted / totalSessions) * 1000) / 10 : 0;
  const avgMessagesPerSession = totalSessions > 0 ? Math.round((sumMessages / totalSessions) * 10) / 10 : 0;
  const avgCreditsPerSession = totalSessions > 0 ? Math.round((sumCredits / totalSessions) * 10000) / 10000 : 0;
  const pctErrors = totalSessions > 0 ? Math.round((withErrors / totalSessions) * 1000) / 10 : 0;
  const pctAutoRetry = totalSessions > 0 ? Math.round((withAutoRetry / totalSessions) * 1000) / 10 : 0;

  let topFramework = null;
  let topFrameworkCount = 0;
  for (const [k, v] of Object.entries(frameworkCounts)) {
    if (v > topFrameworkCount) {
      topFrameworkCount = v;
      topFramework = k;
    }
  }

  return NextResponse.json({
    totalSessions,
    sessionsLast7Days: sessionsLast7d,
    successRatePct,
    avgMessagesPerSession,
    avgCreditsPerSession,
    pctSessionsWithErrors: pctErrors,
    pctSessionsWithAutoRetry: pctAutoRetry,
    topFramework,
    topFrameworkCount,
    totalCreditsConsumed: sumCredits,
  });
}
