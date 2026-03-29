/**
 * Soporte por email (Resend). Auth: sesión Supabase vía cookies usando el cliente SSR del proyecto
 * (@/utils/supabase/server.js), equivalente al patrón de route handlers con @supabase/ssr.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server.js';
import { ADMIN_EMAIL } from '@/lib/constants.js';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripDataUrlBase64(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const m = /^data:image\/[^;]+;base64,(.+)$/i.exec(trimmed);
  if (m) return m[1].replace(/\s/g, '');
  return trimmed.replace(/\s/g, '');
}

export async function POST(request) {
  console.log('[support] POST recibido');

  if (!process.env.RESEND_API_KEY) {
    console.error('[support] Falta RESEND_API_KEY');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes('@')) {
    console.error('[support] ADMIN_EMAIL no configurado');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const imagesRaw = body.images;

  if (!subject) {
    return NextResponse.json({ error: 'El asunto es obligatorio' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 });
  }

  let images = [];
  if (imagesRaw != null) {
    if (!Array.isArray(imagesRaw)) {
      return NextResponse.json({ error: 'El campo images debe ser un array' }, { status: 400 });
    }
    if (imagesRaw.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Máximo ${MAX_IMAGES} imágenes` }, { status: 400 });
    }
    images = imagesRaw.filter((x) => typeof x === 'string' && x.length > 0);
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Máximo ${MAX_IMAGES} imágenes` }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userEmail = session.user.email?.trim();
  if (!userEmail) {
    return NextResponse.json({ error: 'Tu cuenta no tiene email asociado' }, { status: 400 });
  }

  const attachments = [];
  for (let i = 0; i < images.length; i++) {
    const b64 = stripDataUrlBase64(images[i]);
    if (!b64) continue;
    let buf;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return NextResponse.json({ error: 'Imagen con formato inválido' }, { status: 400 });
    }
    if (buf.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Cada imagen debe pesar como máximo 2MB' }, { status: 400 });
    }
    attachments.push({
      filename: `imagen-${i + 1}.png`,
      content: buf,
    });
  }

  const messageHtml = escapeHtml(message).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;">
              <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:#18181b;">Nuevo mensaje de soporte</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3f3f46;"><strong style="color:#18181b;">De:</strong> ${escapeHtml(userEmail)}</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3f3f46;"><strong style="color:#18181b;">Asunto:</strong> ${escapeHtml(subject)}</p>
              <div style="border-top:1px solid #e4e4e7;padding-top:16px;margin-top:8px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#52525b;">${messageHtml}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">Este mensaje fue enviado desde Campus San Andrés - Formulario de Soporte</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Campus San Andrés <noreply@sass.vibecoding.ar>',
      to: ADMIN_EMAIL,
      cc: [userEmail],
      replyTo: userEmail,
      subject: `[Soporte] ${subject}`,
      html,
      attachments: attachments.length ? attachments : undefined,
    });

    if (error) {
      console.error('[support] Error de Resend:', error);
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. Intentá de nuevo más tarde.' },
        { status: 502 },
      );
    }

    if (!data?.id) {
      console.error('[support] Resend no devolvió id del email', data);
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. Intentá de nuevo más tarde.' },
        { status: 502 },
      );
    }

    console.log('[support] Email enviado correctamente, id:', data.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[support] Excepción al enviar:', err);
    return NextResponse.json(
      { error: 'No se pudo enviar el mensaje. Intentá de nuevo más tarde.' },
      { status: 502 },
    );
  }
}
