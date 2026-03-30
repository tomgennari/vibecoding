import { NextResponse } from 'next/server';

export async function POST(request) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { success: false, error: 'Acceso no configurado' },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Solicitud inválida' }, { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';

  if (password !== expected) {
    return NextResponse.json({ success: false, error: 'Código incorrecto' }, { status: 401 });
  }

  const token = `granted_${Date.now()}`;
  const res = NextResponse.json({ success: true });
  res.cookies.set('site_access', token, {
    maxAge: 86400,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res;
}
