import { NextResponse } from 'next/server';

/**
 * Password gate global (presentación al colegio). Capa aparte de Supabase.
 * Quitar: borrar este bloque, /gate y /api/gate/verify, y SITE_PASSWORD del entorno.
 */
export function middleware(request) {
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === '/gate' || pathname.startsWith('/api/gate/')) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/fonts/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }

  if (pathname === '/api/mp/webhook') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  if (pathname === '/auth/callback') {
    return NextResponse.next();
  }

  if (!request.cookies.get('site_access')?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/gate';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png).*)'],
};
