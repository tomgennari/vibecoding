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

export async function GET(request, context) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const params = await context.params;
  const id = params?.id;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Falta id de sesión' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionRow, error: sErr } = await admin
    .from('andy_sessions')
    .select(
      `
      id,
      user_id,
      session_key,
      messages_count,
      credits_consumed,
      had_errors,
      had_auto_retry,
      framework_used,
      started_at,
      ended_in_submission,
      game_id,
      duration_seconds,
      profiles ( first_name, last_name, house )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (sErr) {
    console.error('andy session detail:', sErr);
    return NextResponse.json({ error: sErr.message || 'Error al leer sesión' }, { status: 500 });
  }
  if (!sessionRow) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
  }

  const { data: messages, error: mErr } = await admin
    .from('andy_messages')
    .select('id, role, content, generated_html, tokens_input, tokens_output, cost_usd, is_error_fix, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  if (mErr) {
    const retry = await admin
      .from('andy_messages')
      .select('id, role, content, generated_html, tokens_input, tokens_output, cost_usd, is_error_fix')
      .eq('session_id', id)
      .order('id', { ascending: true });
    if (retry.error) {
      console.error('andy messages:', mErr, retry.error);
      return NextResponse.json({ error: mErr.message || 'Error al leer mensajes' }, { status: 500 });
    }
    return NextResponse.json({
      session: normalizeSession(sessionRow),
      messages: (retry.data || []).map((m) => ({ ...m, created_at: null })),
    });
  }

  return NextResponse.json({
    session: normalizeSession(sessionRow),
    messages: messages || [],
  });
}

function normalizeSession(row) {
  const p = row.profiles;
  const prof = Array.isArray(p) ? p[0] : p;
  return {
    id: row.id,
    user_id: row.user_id,
    session_key: row.session_key,
    messages_count: row.messages_count,
    credits_consumed: row.credits_consumed,
    had_errors: row.had_errors,
    had_auto_retry: row.had_auto_retry,
    framework_used: row.framework_used,
    started_at: row.started_at,
    ended_in_submission: row.ended_in_submission,
    game_id: row.game_id,
    duration_seconds: row.duration_seconds,
    student: {
      name: [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || '—',
      house: prof?.house ?? null,
    },
  };
}
