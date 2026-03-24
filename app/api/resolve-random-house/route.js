import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveLeastPopulatedHouse } from '@/lib/house-resolve-server.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/resolve-random-house
 * Si el perfil tiene house = 'random', lo reemplaza por el house con menos usuarios.
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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('house')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }
  if (profile.house !== 'random') {
    return NextResponse.json({ ok: true, house: profile.house, alreadyResolved: true });
  }

  let houseResolved;
  try {
    houseResolved = await resolveLeastPopulatedHouse(supabaseAdmin);
  } catch (e) {
    console.error('resolve-random-house:', e);
    return NextResponse.json({ error: 'No se pudo asignar un House' }, { status: 500 });
  }

  const { data: updatedRows, error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ house: houseResolved })
    .eq('id', user.id)
    .eq('house', 'random')
    .select('house');

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message || 'Error al actualizar el perfil' }, { status: 500 });
  }

  if (updatedRows?.length) {
    return NextResponse.json({ ok: true, house: updatedRows[0].house });
  }

  const { data: reread } = await supabaseAdmin.from('profiles').select('house').eq('id', user.id).maybeSingle();
  if (reread?.house && reread.house !== 'random') {
    return NextResponse.json({ ok: true, house: reread.house, alreadyResolved: true });
  }

  return NextResponse.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 });
}
