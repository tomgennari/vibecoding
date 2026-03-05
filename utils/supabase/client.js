import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para componentes cliente (navegador).
 * Usa cookies para que la sesión persista y sea visible en el servidor al recargar.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const supabase = createClient();
