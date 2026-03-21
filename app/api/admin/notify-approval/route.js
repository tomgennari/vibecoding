import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

export async function POST(request) {
  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    return NextResponse.json({ error: 'Config incompleta' }, { status: 500 });
  }

  // Verificar que sea admin
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verificar que es admin
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const gameId = body?.gameId;
  if (!gameId) return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });

  // Obtener datos del juego y del alumno
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, title, submitted_by')
    .eq('id', gameId)
    .single();
  if (!game) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });

  const { data: student } = await supabaseAdmin
    .from('profiles')
    .select('first_name, email')
    .eq('id', game.submitted_by)
    .single();
  if (!student?.email) return NextResponse.json({ error: 'Alumno sin email' }, { status: 404 });

  // Enviar email
  const shareText = encodeURIComponent(`¡Mirá el juego que creé en Campus San Andrés! 🎮 Jugalo acá: https://sass.vibecoding.ar/jugar/${game.id}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;

  const emailHtml = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#0f172a;margin:0 0 8px;">🎮 ¡Tu juego fue aprobado!</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Campus San Andrés — Game Lab</p>
      
      <p style="color:#0f172a;font-size:14px;line-height:1.6;margin:0 0 8px;">
        ¡Hola ${student.first_name || 'crack'}!
      </p>
      <p style="color:#0f172a;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Tu juego <strong style="color:#7c3aed;">"${game.title}"</strong> fue aprobado y ya está disponible en la plataforma.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:14px;">Juego</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${game.title}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:14px;">Estado</td>
          <td style="padding:8px 0;color:#22c55e;font-size:14px;font-weight:600;">✅ Aprobado</td>
        </tr>
      </table>

      <p style="color:#0f172a;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Ahora podés compartirlo con tus amigos para que lo jueguen. ¡Cuantos más lo jueguen, más puntos sumás para tu House!
      </p>

      <div style="text-align:center;margin-bottom:12px;">
        <a href="https://sass.vibecoding.ar/perfil?tab=subidos" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver en mis juegos
        </a>
      </div>
      <div style="text-align:center;margin-bottom:12px;">
        <a href="${whatsappUrl}" style="display:inline-block;background:#22c55e;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Compartir por WhatsApp
        </a>
      </div>

      <div style="margin-top:16px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
        <p style="color:#0f172a;font-size:13px;line-height:1.5;margin:0 0 8px;">
          <strong>🌟 ¿Querés que todos puedan jugarlo?</strong>
        </p>
        <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0;">
          Desde tu perfil podés desbloquearlo para todos los alumnos del colegio. ¡Así todos juegan tu creación!
        </p>
      </div>

      <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">
        Campus San Andrés — Vibe Coding San Andrés<br/>
        <em>Sic itur ad astra</em>
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Campus San Andrés <noreply@sass.vibecoding.ar>',
        to: student.email,
        subject: `🎮 ¡Tu juego "${game.title}" fue aprobado!`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return NextResponse.json({ error: 'Error enviando email' }, { status: 502 });
    }
  } catch (err) {
    console.error('Error enviando email:', err);
    return NextResponse.json({ error: 'Error enviando email' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
