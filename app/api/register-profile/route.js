import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VALID_HOUSES } from '@/lib/house-resolve-server.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidHouseField(house) {
  return house === 'random' || VALID_HOUSES.includes(house);
}

function normalizeEmail(e) {
  return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

/**
 * POST /api/register-profile
 * Crea el perfil tras el signup. house puede ser "random" (se resuelve en el primer login).
 *
 * Con Authorization: Bearer <session.access_token> — inserta para el usuario del JWT.
 * Sin Authorization — body debe incluir userId + email; se verifica con auth.admin.getUserById (sin sesión, p. ej. confirmación por email).
 */
export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const first_name = typeof body?.first_name === 'string' ? body.first_name.trim() : '';
  const last_name = typeof body?.last_name === 'string' ? body.last_name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const user_type = body?.user_type === 'padre' ? 'padre' : 'alumno';
  const houseRaw = body?.house;

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'Faltan datos del perfil' }, { status: 400 });
  }
  if (!isValidHouseField(houseRaw)) {
    return NextResponse.json({ error: 'House inválido' }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  let targetUserId;

  if (token) {
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }
    targetUserId = user.id;
  } else {
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (adminErr || !adminData?.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }
    const authEmail = normalizeEmail(adminData.user.email);
    if (!authEmail || authEmail !== normalizeEmail(email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    targetUserId = userId;
  }

  const { error: insertError } = await supabaseAdmin.from('profiles').insert({
    id: targetUserId,
    first_name,
    last_name,
    email,
    user_type,
    house: houseRaw,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ ok: true, house: houseRaw, duplicate: true });
    }
    return NextResponse.json({ error: insertError.message || 'Error al crear el perfil' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, house: houseRaw });
}
