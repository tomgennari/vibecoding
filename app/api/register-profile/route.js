import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Mismos valores que en la UI; nunca persistir "random" en la DB */
const VALID_HOUSES = ['william_brown', 'james_dodds', 'james_fleming', 'john_monteith'];

/**
 * Cuenta usuarios por house (equiv. a GROUP BY; excluye null y "random").
 * Elige el house con menor cantidad; si hay empate, uno al azar entre los empatados.
 */
async function resolveLeastPopulatedHouse(supabaseAdmin) {
  const counts = await Promise.all(
    VALID_HOUSES.map(async (h) => {
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('house', h);
      if (error) throw error;
      return { house: h, count: count ?? 0 };
    }),
  );
  const minCount = Math.min(...counts.map((c) => c.count));
  const candidates = counts.filter((c) => c.count === minCount).map((c) => c.house);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isValidHouseField(house) {
  return house === 'random' || VALID_HOUSES.includes(house);
}

/**
 * POST /api/register-profile
 * Crea el perfil tras el signup. Si house === "random", asigna el house con menos usuarios.
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

  let houseResolved = houseRaw;
  if (houseRaw === 'random') {
    try {
      houseResolved = await resolveLeastPopulatedHouse(supabaseAdmin);
    } catch (e) {
      console.error('register-profile resolve house:', e);
      return NextResponse.json({ error: 'No se pudo asignar un House' }, { status: 500 });
    }
  }

  const { error: insertError } = await supabaseAdmin.from('profiles').insert({
    id: user.id,
    first_name,
    last_name,
    email,
    user_type,
    house: houseResolved,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ ok: true, house: houseResolved, duplicate: true });
    }
    return NextResponse.json({ error: insertError.message || 'Error al crear el perfil' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, house: houseResolved });
}
