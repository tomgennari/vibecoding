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

export async function GET(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const filter = (searchParams.get('filter') || 'all').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let q = admin
    .from('andy_sessions')
    .select(
      `
      id,
      user_id,
      framework_used,
      messages_count,
      had_errors,
      had_auto_retry,
      ended_in_submission,
      credits_consumed,
      started_at,
      duration_seconds,
      profiles ( first_name, last_name, house )
    `,
      { count: 'exact' },
    )
    .order('started_at', { ascending: false });

  if (filter === 'errors') {
    q = q.eq('had_errors', true);
  } else if (filter === 'abandoned') {
    q = q.eq('ended_in_submission', false);
  } else if (filter === 'successful') {
    q = q.eq('ended_in_submission', true);
  } else if (filter !== 'all') {
    return NextResponse.json({ error: 'filter inválido' }, { status: 400 });
  }

  const { data, error, count } = await q.range(from, to);

  if (error) {
    console.error('andy sessions list:', error);
    return NextResponse.json({ error: error.message || 'Error al listar sesiones' }, { status: 500 });
  }

  const sessions = (data || []).map((row) => {
    const p = row.profiles;
    const prof = Array.isArray(p) ? p[0] : p;
    const name = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || '—';
    return {
      id: row.id,
      studentName: name,
      house: prof?.house ?? null,
      framework_used: row.framework_used,
      messages_count: row.messages_count,
      had_errors: row.had_errors,
      had_auto_retry: row.had_auto_retry,
      ended_in_submission: row.ended_in_submission,
      credits_consumed: row.credits_consumed,
      started_at: row.started_at,
      duration_seconds: row.duration_seconds,
    };
  });

  return NextResponse.json({
    sessions,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit) || 1,
  });
}
