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

async function getUserId(supabase, token) {
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = await getUserId(supabase, token);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const gameId = body?.gameId ?? body?.game_id;
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }

  const { error: insertError } = await supabase.from('game_likes').insert({ user_id: userId, game_id: gameId });
  if (insertError) {
    if (insertError.code === '23505') {
      const { count } = await supabase.from('game_likes').select('*', { count: 'exact', head: true }).eq('game_id', gameId);
      return NextResponse.json({ total_likes: count ?? 0 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { count } = await supabaseAdmin.from('game_likes').select('*', { count: 'exact', head: true }).eq('game_id', gameId);
  const newTotal = count ?? 0;
  await supabaseAdmin.from('games').update({ total_likes: newTotal }).eq('id', gameId);
  return NextResponse.json({ total_likes: newTotal });
}

export async function DELETE(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }
  const { token, supabase } = getAuthUser(request);
  if (!supabase || !token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = await getUserId(supabase, token);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId') ?? searchParams.get('game_id');
  if (!gameId) {
    return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from('game_likes').delete().eq('user_id', userId).eq('game_id', gameId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const { count } = await supabaseAdmin.from('game_likes').select('*', { count: 'exact', head: true }).eq('game_id', gameId);
  const newTotal = count ?? 0;
  await supabaseAdmin.from('games').update({ total_likes: newTotal }).eq('id', gameId);
  return NextResponse.json({ total_likes: newTotal });
}
