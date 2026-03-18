Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const game = payload.record;

    if (!game || game.status !== 'pending') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    if (!resendKey || !adminEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing RESEND_API_KEY or ADMIN_EMAIL' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Campus San Andrés <noreply@sass.vibecoding.ar>',
        to: adminEmail,
        subject: `Nuevo juego para moderar: ${game.title}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#0f172a;margin:0 0 16px;">Nuevo juego enviado a moderación</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;">Título</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${game.title}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;">Descripción</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;">${game.description || 'Sin descripción'}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;">House</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;">${game.house}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;">Fecha</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;">${new Date(game.created_at).toLocaleString('es-AR')}</td>
              </tr>
            </table>
            <div style="margin-top:24px;text-align:center;">
              <a href="https://sass.vibecoding.ar/admin" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                Ir al panel de admin
              </a>
            </div>
            <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">
              Campus San Andrés — Vibe Coding San Andrés
            </p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: res.ok }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
