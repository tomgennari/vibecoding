import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey || !mpAccessToken) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    let paymentId = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      paymentId = body?.data?.id ?? body?.id;
    } else {
      const formData = await request.formData();
      paymentId = formData.get('data.id') ?? formData.get('id');
    }
    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: String(paymentId) });

    if (!payment || payment.status !== 'approved') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const externalRef = payment.external_reference || '';
    const parts = externalRef.split('|');
    const amountPaid = Number(payment.transaction_amount) || 0;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Donación: userId|donacion|amount (3 partes)
    if (parts.length === 3 && parts[1] === 'donacion') {
      const [userId] = parts;
      const { data: profile } = await supabase.from('profiles').select('house').eq('id', userId).single();
      const house = profile?.house ?? null;

      await supabase.from('donations').insert({
        user_id: userId,
        amount: amountPaid,
        payment_id: String(payment.id),
        ...(house && { house }),
      });
      if (house) {
        const pointsToAdd = Math.max(1, Math.floor(amountPaid / 1000));
        const { data: row } = await supabase.from('house_points').select('total_points, points_by_donations').eq('house', house).single();
        if (row) {
          await supabase.from('house_points').update({
            total_points: (Number(row.total_points) || 0) + pointsToAdd,
            points_by_donations: (Number(row.points_by_donations) || 0) + pointsToAdd,
          }).eq('house', house);
        } else {
          await supabase.from('house_points').insert({
            house,
            total_points: pointsToAdd,
            points_by_games: 0,
            points_by_time: 0,
            points_by_donations: pointsToAdd,
          });
        }
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Juego: userId|gameId (2 partes)
    if (parts.length !== 2) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const [userId, gameId] = parts;

    const { data: game } = await supabase.from('games').select('id, house').eq('id', gameId).single();
    if (!game) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await supabase.from('game_unlocks').insert({
      user_id: userId,
      game_id: gameId,
      amount_paid: amountPaid,
      payment_id: String(payment.id),
    });

    const { data: gameRevenue } = await supabase
      .from('games')
      .select('total_revenue')
      .eq('id', gameId)
      .single();

    await supabase
      .from('games')
      .update({ total_revenue: (Number(gameRevenue?.total_revenue) || 0) + Number(amountPaid) })
      .eq('id', gameId);

    const house = game.house;
    if (house) {
      const pointsToAdd = Math.max(1, Math.floor(amountPaid / 1000));
      const { data: row } = await supabase.from('house_points').select('total_points, points_by_games').eq('house', house).single();
      if (row) {
        await supabase.from('house_points').update({
          total_points: (Number(row.total_points) || 0) + pointsToAdd,
          points_by_games: (Number(row.points_by_games) || 0) + pointsToAdd,
        }).eq('house', house);
      } else {
        await supabase.from('house_points').insert({
          house,
          total_points: pointsToAdd,
          points_by_games: pointsToAdd,
          points_by_time: 0,
          points_by_donations: 0,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
