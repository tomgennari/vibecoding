import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const nextPath = searchParams.get('next') || '';

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      const redirectPath = type === 'recovery' ? '/nueva-contrasena' : (nextPath || '/dashboard');
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    const redirectPath = type === 'recovery' ? '/nueva-contrasena' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
