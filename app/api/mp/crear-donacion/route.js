import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
  ? 'https://sass.vibecoding.ar'
  : (process.env.NEXT_PUBLIC_BASE_URL || 'https://sass.vibecoding.ar');

const MIN_AMOUNT_ARS = 5_000;
const MAX_AMOUNT_ARS = 10_000_000;

function parseValidDonationAmount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Monto inválido' };
  if (!Number.isInteger(n)) return { ok: false, error: 'El monto debe ser un número entero (pesos).' };
  if (n < MIN_AMOUNT_ARS) {
    return { ok: false, error: `El monto mínimo es $${MIN_AMOUNT_ARS.toLocaleString('es-AR')} ARS` };
  }
  if (n > MAX_AMOUNT_ARS) {
    return { ok: false, error: `El monto máximo es $${MAX_AMOUNT_ARS.toLocaleString('es-AR')} ARS` };
  }
  return { ok: true, amount: n };
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

  const { userId, amount } = body;
  if (!userId) {
    return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
  }
  const parsed = parseValidDonationAmount(amount);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const amountNum = parsed.amount;

  if (userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: [{
          id: 'donacion',
          title: 'Donación Campus San Andrés',
          quantity: 1,
          unit_price: amountNum,
          currency_id: 'ARS',
        }],
        back_urls: {
          success: `${BASE_URL}/donacion/exitosa`,
          failure: `${BASE_URL}/donacion/fallida`,
          pending: `${BASE_URL}/donacion/pendiente`,
        },
        auto_return: 'approved',
        external_reference: `${userId}|donacion|${amountNum}`,
        notification_url: `${BASE_URL}/api/mp/webhook`,
      },
    });

    const initPoint = response?.init_point;
    if (!initPoint) {
      return NextResponse.json({ error: 'MercadoPago no devolvió URL de pago' }, { status: 500 });
    }
    return NextResponse.json({ init_point: initPoint });
  } catch (error) {
    console.error('Error crear preferencia donación:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear la preferencia' }, { status: 500 });
  }
}
