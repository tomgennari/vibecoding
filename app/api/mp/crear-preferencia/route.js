import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
// MP no acepta localhost en back_urls; usar siempre producción para redirects
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
  ? 'https://sass.vibecoding.ar'
  : (process.env.NEXT_PUBLIC_BASE_URL || 'https://sass.vibecoding.ar');

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey || !mpAccessToken) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { gameId, userId, gameTitle, gamePrice } = body;
  if (!gameId || !userId || gameTitle == null || gamePrice == null) {
    return NextResponse.json({ error: 'Faltan gameId, userId, gameTitle o gamePrice' }, { status: 400 });
  }
  const cleanTitulo = decodeURIComponent(gameTitle)
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/[<>]/g, '')
    .replace(/[&]/g, 'y')
    .replace(/[#%]/g, '')
    .trim();
  const safeTitulo = encodeURIComponent(cleanTitulo);

  if (userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, price')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
  }
  if (game.status !== 'approved') {
    return NextResponse.json({ error: 'El juego no está disponible para compra' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('game_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Ya tenés este juego desbloqueado' }, { status: 400 });
  }

  const price = Number(gamePrice) || Number(game.price) || 5000;
  if (price <= 0) {
    return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
  }

  try {
    console.log('MP_ACCESS_TOKEN exists:', !!process.env.MP_ACCESS_TOKEN);
    console.log('Body recibido:', { gameId, userId, gameTitle, gamePrice });
    const backUrls = {
      success: `${BASE_URL}/pago/exitoso?gameId=${gameId}&gameTitle=${safeTitulo}`,
      failure: `${BASE_URL}/pago/fallido?gameId=${gameId}`,
      pending: `${BASE_URL}/pago/pendiente?gameId=${gameId}`,
    };
    console.log('BASE_URL:', BASE_URL);
    console.log('back_urls generadas:', {
      success: `${BASE_URL}/pago/exitoso`,
      failure: `${BASE_URL}/pago/fallido`,
      pending: `${BASE_URL}/pago/pendiente`,
    });
    console.log('back_urls completas enviadas a MP:', backUrls);
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: [{
          id: String(gameId),
          title: `Desbloquear juego: ${String(cleanTitulo).slice(0, 200)}`,
          quantity: 1,
          unit_price: price,
          currency_id: 'ARS',
        }],
        back_urls: backUrls,
        auto_return: 'approved',
        external_reference: `${userId}|${gameId}`,
        notification_url: `${BASE_URL}/api/mp/webhook`,
      },
    });

    const initPoint = response?.init_point;
    if (!initPoint) {
      return NextResponse.json({ error: 'MercadoPago no devolvió URL de pago' }, { status: 500 });
    }
    return NextResponse.json({ init_point: initPoint });
  } catch (error) {
    console.error('Error completo:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear la preferencia' }, { status: 500 });
  }
}
