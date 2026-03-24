import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

async function grantAndyTokens(supabase, userId) {
  const { data: buyerProfile } = await supabase
    .from('profiles')
    .select('tokens_limit')
    .eq('id', userId)
    .single();
  if (buyerProfile) {
    await supabase
      .from('profiles')
      .update({ tokens_limit: (Number(buyerProfile.tokens_limit) || 1.0) + 1.0 })
      .eq('id', userId);
  }
}

async function insertPackPurchase(supabase, row) {
  const { error } = await supabase.from('pack_purchases').insert({
    user_id: row.user_id,
    pack_type: row.pack_type,
    credits_granted: row.credits_granted,
    amount_paid: row.amount_paid,
    payment_id: row.payment_id,
  });
  if (error) {
    console.error('pack_purchases insert:', error);
  }
}

async function addHousePointsForGamePurchase(supabase, house, amountPaid) {
  if (!house) return;
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
    const paymentIdStr = String(payment.id);

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
        payment_id: paymentIdStr,
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

    // Desbloquear para todos: userId|gameId|unlock_all (3 partes)
    if (parts.length === 3 && parts[2] === 'unlock_all') {
      const [userId, gameId] = parts;

      const { data: game } = await supabase.from('games').select('id, house').eq('id', gameId).single();
      if (!game) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      await supabase
        .from('games')
        .update({
          unlocked_for_all: true,
          unlocked_for_all_by: userId,
          unlocked_for_all_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      await supabase.from('game_unlocks').insert({
        user_id: userId,
        game_id: gameId,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
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

      await addHousePointsForGamePurchase(supabase, game.house, amountPaid);
      await grantAndyTokens(supabase, userId);

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Packs: pack10_<uuid>, pack30_<uuid>, allaccess_<uuid>
    if (externalRef.startsWith('pack10_')) {
      const userId = externalRef.slice('pack10_'.length);
      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'pack_10',
        credits_granted: 10,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });
      const { data: prof } = await supabase.from('profiles').select('unlock_credits').eq('id', userId).single();
      const cur = Number(prof?.unlock_credits) || 0;
      await supabase.from('profiles').update({ unlock_credits: cur + 10 }).eq('id', userId);
      await grantAndyTokens(supabase, userId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (externalRef.startsWith('pack30_')) {
      const userId = externalRef.slice('pack30_'.length);
      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'pack_30',
        credits_granted: 30,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });
      const { data: prof } = await supabase.from('profiles').select('unlock_credits').eq('id', userId).single();
      const cur = Number(prof?.unlock_credits) || 0;
      await supabase.from('profiles').update({ unlock_credits: cur + 30 }).eq('id', userId);
      await grantAndyTokens(supabase, userId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (externalRef.startsWith('allaccess_')) {
      const userId = externalRef.slice('allaccess_'.length);
      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'all_access',
        credits_granted: 0,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });
      await supabase.from('profiles').update({
        has_all_access: true,
        all_access_at: new Date().toISOString(),
      }).eq('id', userId);
      await grantAndyTokens(supabase, userId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Individual nuevo: unlock_<userId>_<gameId>
    const unlockMatch = externalRef.match(/^unlock_([0-9a-f-]{36})_([0-9a-f-]{36})$/i);
    if (unlockMatch) {
      const [, userId, gameId] = unlockMatch;
      const { data: game } = await supabase.from('games').select('id, house').eq('id', gameId).single();
      if (!game) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      await supabase.from('game_unlocks').insert({
        user_id: userId,
        game_id: gameId,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });

      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'individual',
        credits_granted: 0,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
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

      await addHousePointsForGamePurchase(supabase, game.house, amountPaid);
      await grantAndyTokens(supabase, userId);

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Legacy: userId|gameId (2 partes)
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
      payment_id: paymentIdStr,
    });

    await insertPackPurchase(supabase, {
      user_id: userId,
      pack_type: 'individual',
      credits_granted: 0,
      amount_paid: amountPaid,
      payment_id: paymentIdStr,
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

    await addHousePointsForGamePurchase(supabase, game.house, amountPaid);
    await grantAndyTokens(supabase, userId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('webhook:', e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
