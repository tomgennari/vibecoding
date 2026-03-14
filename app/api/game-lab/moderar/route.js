import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { token: null, supabase: null };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { token, supabase };
}

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Game Lab no configurado (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 503 });
  }

  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const html = typeof body?.html === 'string' ? body.html.trim() : '';
  if (!html) {
    return NextResponse.json({ error: 'Falta el HTML del juego' }, { status: 400 });
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('house')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error obteniendo perfil:', profileError);
    return NextResponse.json({ error: 'No se pudo obtener tu perfil' }, { status: 500 });
  }

  const filename = `game-lab-${user.id}-${Date.now()}.html`;
  const htmlBuffer = Buffer.from(html, 'utf-8');

  const { error: uploadError } = await supabaseAdmin.storage
    .from('games')
    .upload(filename, htmlBuffer, { contentType: 'text/html', upsert: false });

  if (uploadError) {
    console.error('Error subiendo juego:', uploadError);
    return NextResponse.json({ error: 'No se pudo subir el juego. Intentá de nuevo.' }, { status: 502 });
  }

  const { data: urlData } = supabaseAdmin.storage.from('games').getPublicUrl(filename);
  const fileUrl = urlData.publicUrl;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('games')
    .insert({
      title: title || 'Juego del Game Lab',
      description: description || 'Generado con Andy en el Game Lab',
      house: profile.house ?? 'william_brown',
      file_url: fileUrl,
      status: 'pending',
      submitted_by: user.id,
      price: 5000,
      game_width: 480,
      game_height: 640,
      orientation: 'vertical',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error insertando juego:', insertError);
    await supabaseAdmin.storage.from('games').remove([filename]).catch(() => {});
    return NextResponse.json({ error: 'No se pudo guardar el juego. Intentá de nuevo.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, gameId: inserted.id });
}
