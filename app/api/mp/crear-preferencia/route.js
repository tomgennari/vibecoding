import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PRICING } from '@/lib/pricing.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
  ? 'https://sass.vibecoding.ar'
  : (process.env.NEXT_PUBLIC_BASE_URL || 'https://sass.vibecoding.ar');

const MIN_GAMES_PACK_30 = 50;
const MIN_GAMES_ALL_ACCESS = 100;

/** Sin apostrofes ni caracteres que rompan MercadoPago */
function sanitizeMpTitle(raw) {
  return String(raw ?? '')
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/[<>]/g, '')
    .replace(/[&]/g, ' y ')
    .replace(/[#%]/g, '')
    .replace(/[áàäâ]/gi, 'a')
    .replace(/[éèëê]/gi, 'e')
    .replace(/[íìïî]/gi, 'i')
    .replace(/[óòöô]/gi, 'o')
    .replace(/[úùüû]/gi, 'u')
    .replace(/ñ/gi, 'n')
    .trim()
    .slice(0, 200);
}

async function countApprovedGames(supabaseAdmin) {
  const { count, error } = await supabaseAdmin
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  if (error) throw error;
  return count ?? 0;
}

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

  const userId = body?.userId;
  if (userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const unlockAll = body?.unlockAll === true;
  const packTypeRaw = body?.pack_type;
  const packType = typeof packTypeRaw === 'string' ? packTypeRaw.trim() : '';

  const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  try {
    if (unlockAll) {
      const { gameId, gameTitle, gamePrice } = body;
      if (!gameId || !userId || gameTitle == null || gamePrice == null) {
        return NextResponse.json({ error: 'Faltan gameId, userId, gameTitle o gamePrice' }, { status: 400 });
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

      const cleanTitulo = sanitizeMpTitle(decodeURIComponent(String(gameTitle)));
      const safeTitulo = encodeURIComponent(cleanTitulo);
      const externalReference = `${userId}|${gameId}|unlock_all`;
      const price = Number(gamePrice) || PRICING.UNLOCK_FOR_ALL;
      if (price <= 0) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
      }

      const backUrls = {
        success: `${BASE_URL}/pago/exitoso?gameId=${gameId}&gameTitle=${safeTitulo}`,
        failure: `${BASE_URL}/pago/fallido?gameId=${gameId}`,
        pending: `${BASE_URL}/pago/pendiente?gameId=${gameId}`,
      };

      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      const preference = new Preference(client);
      const response = await preference.create({
        body: {
          items: [{
            id: String(gameId),
            title: sanitizeMpTitle(`Desbloquear para todos: ${cleanTitulo}`),
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS',
          }],
          back_urls: backUrls,
          auto_return: 'approved',
          external_reference: externalReference,
          notification_url: `${BASE_URL}/api/mp/webhook`,
        },
      });

      const initPoint = response?.init_point;
      if (!initPoint) {
        return NextResponse.json({ error: 'MercadoPago no devolvió URL de pago' }, { status: 500 });
      }
      return NextResponse.json({ init_point: initPoint });
    }

    if (['pack_10', 'pack_30', 'all_access'].includes(packType)) {
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
      }
      let approvedCount;
      try {
        approvedCount = await countApprovedGames(supabaseAdmin);
      } catch (e) {
        console.error('countApprovedGames:', e);
        return NextResponse.json({ error: 'No se pudo verificar los juegos disponibles' }, { status: 500 });
      }

      if (packType === 'pack_30' && approvedCount < MIN_GAMES_PACK_30) {
        return NextResponse.json(
          { error: `El Pack 30 estará disponible cuando haya al menos ${MIN_GAMES_PACK_30} juegos aprobados en la plataforma.` },
          { status: 400 },
        );
      }
      if (packType === 'all_access' && approvedCount < MIN_GAMES_ALL_ACCESS) {
        return NextResponse.json(
          { error: `ALL ACCESS estará disponible cuando haya al menos ${MIN_GAMES_ALL_ACCESS} juegos aprobados en la plataforma.` },
          { status: 400 },
        );
      }

      const packGameIdRaw = body?.gameId;
      const packGameId =
        typeof packGameIdRaw === 'string' && packGameIdRaw.trim() ? packGameIdRaw.trim() : null;

      if (packGameId) {
        const { data: packGame, error: packGameErr } = await supabase
          .from('games')
          .select('id, status')
          .eq('id', packGameId)
          .single();
        if (packGameErr || !packGame || packGame.status !== 'approved') {
          return NextResponse.json({ error: 'Juego no válido para este pack' }, { status: 400 });
        }
      }

      let price;
      let externalReference;
      let itemTitle;
      let packQuery;

      if (packType === 'pack_10') {
        price = PRICING.PACK_10;
        externalReference = packGameId ? `pack10_${userId}_${packGameId}` : `pack10_${userId}`;
        itemTitle = 'Pack 10 juegos - Campus San Andres';
        packQuery = 'pack_10';
      } else if (packType === 'pack_30') {
        price = PRICING.PACK_30;
        externalReference = packGameId ? `pack30_${userId}_${packGameId}` : `pack30_${userId}`;
        itemTitle = 'Pack 30 juegos - Campus San Andres';
        packQuery = 'pack_30';
      } else {
        price = PRICING.ALL_ACCESS;
        externalReference = packGameId ? `allaccess_${userId}_${packGameId}` : `allaccess_${userId}`;
        itemTitle = 'ALL ACCESS - Campus San Andres';
        packQuery = 'all_access';
      }

      const successUrl = packGameId
        ? `${BASE_URL}/jugar/${encodeURIComponent(packGameId)}?pack=${encodeURIComponent(packQuery)}`
        : `${BASE_URL}/pago/exitoso?pack=${encodeURIComponent(packQuery)}`;
      const failPack = `${BASE_URL}/pago/fallido?pack=${encodeURIComponent(packQuery)}${
        packGameId ? `&gameId=${encodeURIComponent(packGameId)}` : ''
      }`;
      const pendPack = `${BASE_URL}/pago/pendiente?pack=${encodeURIComponent(packQuery)}${
        packGameId ? `&gameId=${encodeURIComponent(packGameId)}` : ''
      }`;

      const backUrls = {
        success: successUrl,
        failure: failPack,
        pending: pendPack,
      };

      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      const preference = new Preference(client);
      const response = await preference.create({
        body: {
          items: [{
            id: packQuery,
            title: sanitizeMpTitle(itemTitle),
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS',
          }],
          back_urls: backUrls,
          auto_return: 'approved',
          external_reference: externalReference,
          notification_url: `${BASE_URL}/api/mp/webhook`,
        },
      });

      const initPoint = response?.init_point;
      if (!initPoint) {
        return NextResponse.json({ error: 'MercadoPago no devolvió URL de pago' }, { status: 500 });
      }
      return NextResponse.json({ init_point: initPoint });
    }

    const { gameId, gameTitle } = body;
    if (!gameId || !userId || gameTitle == null) {
      return NextResponse.json({ error: 'Faltan gameId, userId o gameTitle' }, { status: 400 });
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

    const cleanTitulo = sanitizeMpTitle(decodeURIComponent(String(gameTitle)));
    const safeTitulo = encodeURIComponent(cleanTitulo);
    const price = PRICING.INDIVIDUAL;
    if (price <= 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    }

    const externalReference = `unlock_${userId}_${gameId}`;

    const backUrls = {
      success: `${BASE_URL}/pago/exitoso?gameId=${gameId}&gameTitle=${safeTitulo}`,
      failure: `${BASE_URL}/pago/fallido?gameId=${gameId}`,
      pending: `${BASE_URL}/pago/pendiente?gameId=${gameId}`,
    };

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: [{
          id: String(gameId),
          title: sanitizeMpTitle(`Desbloquear juego - Campus San Andres`),
          quantity: 1,
          unit_price: price,
          currency_id: 'ARS',
        }],
        back_urls: backUrls,
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: `${BASE_URL}/api/mp/webhook`,
      },
    });

    const initPoint = response?.init_point;
    if (!initPoint) {
      return NextResponse.json({ error: 'MercadoPago no devolvió URL de pago' }, { status: 500 });
    }
    return NextResponse.json({ init_point: initPoint });
  } catch (error) {
    console.error('crear-preferencia:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear la preferencia' }, { status: 500 });
  }
}
