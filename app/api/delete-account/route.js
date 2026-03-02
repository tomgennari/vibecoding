import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/delete-account
 * Elimina la cuenta del usuario autenticado y todos sus datos.
 * Requiere Authorization: Bearer <session.access_token>
 */
export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  const uid = user.id;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    await supabaseAdmin.from('game_sessions').delete().eq('user_id', uid);
    await supabaseAdmin.from('game_likes').delete().eq('user_id', uid);
    await supabaseAdmin.from('game_unlocks').delete().eq('user_id', uid);
    await supabaseAdmin.from('game_scores').delete().eq('user_id', uid);
    await supabaseAdmin.from('games').update({ status: 'rejected' }).eq('submitted_by', uid);
    await supabaseAdmin.from('profiles').delete().eq('id', uid);
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message || 'No se pudo eliminar el usuario' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error al eliminar la cuenta' }, { status: 500 });
  }
}
