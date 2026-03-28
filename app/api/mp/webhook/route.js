import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { ADMIN_EMAIL } from '@/lib/constants.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendDonationThankYouEmail({ resendApiKey, to, firstName, amountPaid }) {
  const name = escapeHtml(firstName || 'donante');
  const amountStr = Number(amountPaid).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const html = `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 20px;background:linear-gradient(180deg,#13131a 0%,#0a0a0f 100%);border-radius:16px;border:1px solid #2a2a3a;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:22px;font-weight:800;color:#7c3aed;letter-spacing:-0.02em;">Campus San Andrés</span>
      </div>
      <p style="color:#f1f5f9;font-size:16px;line-height:1.6;margin:0 0 16px;">Hola ${name},</p>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.65;margin:0 0 16px;">
        Recibimos tu donación de <strong style="color:#06b6d4;">$${amountStr} ARS</strong>. ¡Muchas gracias por tu generosidad y por acompañar este proyecto!
      </p>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.65;margin:0 0 20px;">
        El <strong style="color:#a78bfa;">100% del neto</strong> de tu aporte va a la construcción del campus — sin intermediarios, con total transparencia para la comunidad del St. Andrew&apos;s Scots School.
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:24px 0 0;padding-top:20px;border-top:1px solid #2a2a3a;">
        Con gratitud,<br/>
        <span style="color:#7c3aed;font-weight:600;">el equipo de Campus San Andrés</span>
      </p>
      <p style="margin-top:20px;color:#64748b;font-size:11px;text-align:center;line-height:1.5;">
        <em>Sic itur ad astra</em>
      </p>
    </div>
  `;
  const body = {
    from: 'Campus San Andrés <noreply@sass.vibecoding.ar>',
    to,
    subject: '¡Gracias por tu donación a Campus San Andrés!',
    html,
  };
  if (ADMIN_EMAIL) body.cc = [ADMIN_EMAIL];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${errText || res.statusText}`);
  }
}

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

    // Cliente con service role (SUPABASE_SERVICE_ROLE_KEY): bypass RLS en todo el webhook
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Donación: userId|donacion|amount (3 partes)
    if (parts.length === 3 && parts[1] === 'donacion') {
      const [userId] = parts;
      const { data: profile } = await supabase.from('profiles').select('house').eq('id', userId).single();
      const house = profile?.house ?? null;

      const amountInt = Math.round(Number(amountPaid)) || 0;
      const insertPayload = {
        user_id: userId,
        amount: amountInt,
        payment_id: paymentIdStr,
        building_id: null,
        donated_at: new Date().toISOString(),
      };
      console.log('Insertando donación:', {
        user_id: insertPayload.user_id,
        amount: insertPayload.amount,
        payment_id: insertPayload.payment_id,
      });

      const { data: insertedDonation, error: donationInsertError } = await supabase
        .from('donations')
        .insert(insertPayload)
        .select('id, user_id, amount, payment_id, donated_at')
        .single();

      if (donationInsertError) {
        console.error('Error insertando donación:', donationInsertError.message, donationInsertError);
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      console.log('Donación insertada:', insertedDonation);

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
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const { data: donor } = await supabase
            .from('profiles')
            .select('first_name, email')
            .eq('id', userId)
            .single();
          if (donor?.email) {
            await sendDonationThankYouEmail({
              resendApiKey,
              to: donor.email,
              firstName: donor.first_name,
              amountPaid,
            });
          }
        }
      } catch (mailErr) {
        console.error('donation thank-you email:', mailErr);
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

    // Packs: pack10_<uuid> | pack10_<uuid>_<gameId> (idem pack30, allaccess)
    const pack10Match = externalRef.match(/^pack10_([0-9a-f-]{36})(?:_([0-9a-f-]{36}))?$/i);
    if (pack10Match) {
      const userId = pack10Match[1];
      const gameIdOpt = pack10Match[2] || null;

      let creditsToAdd = 10;
      let shouldInsertUnlock = false;

      if (gameIdOpt) {
        const { data: already } = await supabase
          .from('game_unlocks')
          .select('id')
          .eq('user_id', userId)
          .eq('game_id', gameIdOpt)
          .maybeSingle();
        if (already) {
          creditsToAdd = 10;
        } else {
          const { data: g } = await supabase.from('games').select('id').eq('id', gameIdOpt).maybeSingle();
          if (g) {
            creditsToAdd = 9;
            shouldInsertUnlock = true;
          }
        }
      }

      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'pack_10',
        credits_granted: creditsToAdd,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });
      const { data: prof } = await supabase.from('profiles').select('unlock_credits').eq('id', userId).single();
      const cur = Number(prof?.unlock_credits) || 0;
      await supabase.from('profiles').update({ unlock_credits: cur + creditsToAdd }).eq('id', userId);

      if (shouldInsertUnlock) {
        await supabase.from('game_unlocks').insert({
          user_id: userId,
          game_id: gameIdOpt,
          amount_paid: 0,
          payment_id: paymentIdStr,
        });
      }

      await grantAndyTokens(supabase, userId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const pack30Match = externalRef.match(/^pack30_([0-9a-f-]{36})(?:_([0-9a-f-]{36}))?$/i);
    if (pack30Match) {
      const userId = pack30Match[1];
      const gameIdOpt = pack30Match[2] || null;

      let creditsToAdd = 30;
      let shouldInsertUnlock = false;

      if (gameIdOpt) {
        const { data: already } = await supabase
          .from('game_unlocks')
          .select('id')
          .eq('user_id', userId)
          .eq('game_id', gameIdOpt)
          .maybeSingle();
        if (already) {
          creditsToAdd = 30;
        } else {
          const { data: g } = await supabase.from('games').select('id').eq('id', gameIdOpt).maybeSingle();
          if (g) {
            creditsToAdd = 29;
            shouldInsertUnlock = true;
          }
        }
      }

      await insertPackPurchase(supabase, {
        user_id: userId,
        pack_type: 'pack_30',
        credits_granted: creditsToAdd,
        amount_paid: amountPaid,
        payment_id: paymentIdStr,
      });
      const { data: prof } = await supabase.from('profiles').select('unlock_credits').eq('id', userId).single();
      const cur = Number(prof?.unlock_credits) || 0;
      await supabase.from('profiles').update({ unlock_credits: cur + creditsToAdd }).eq('id', userId);

      if (shouldInsertUnlock) {
        await supabase.from('game_unlocks').insert({
          user_id: userId,
          game_id: gameIdOpt,
          amount_paid: 0,
          payment_id: paymentIdStr,
        });
      }

      await grantAndyTokens(supabase, userId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const allAccessMatch = externalRef.match(/^allaccess_([0-9a-f-]{36})(?:_([0-9a-f-]{36}))?$/i);
    if (allAccessMatch) {
      const userId = allAccessMatch[1];
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
