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
  const profileUrl = 'https://sass.vibecoding.ar/perfil';
  const shareText = encodeURIComponent(`¡Mirá el juego que creé en Campus San Andrés! 🎮 Jugalo acá: https://sass.vibecoding.ar/jugar/${game.id}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;

  const emailHtml = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0f;border-radius:12px;color:#f1f5f9;">
      <h1 style="font-size:24px;font-weight:900;color:#7c3aed;margin-bottom:16px;">🎮 ¡Tu juego fue aprobado!</h1>
      <p style="font-size:14px;line-height:1.6;margin-bottom:8px;">
        ¡Hola ${student.first_name || 'crack'}!
      </p>
      <p style="font-size:14px;line-height:1.6;margin-bottom:16px;">
        Tu juego <strong style="color:#06b6d4;">"${game.title}"</strong> fue aprobado y ya está disponible en Campus San Andrés. 🎉
      </p>
      <p style="font-size:14px;line-height:1.6;margin-bottom:24px;">
        Ahora podés compartirlo con tus amigos para que lo jueguen, y si querés que esté disponible para todos los alumnos, podés desbloquearlo desde tu perfil.
      </p>
      <div style="margin-bottom:16px;">
        <a href="${profileUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
          👤 Ver en mi perfil
        </a>
      </div>
      <div style="margin-bottom:16px;">
        <a href="${whatsappUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
          📲 Compartir por WhatsApp
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #2a2a3a;margin:24px 0;" />
      <p style="font-size:11px;color:#94a3b8;text-align:center;">
        Campus San Andrés — sass.vibecoding.ar<br/>
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
