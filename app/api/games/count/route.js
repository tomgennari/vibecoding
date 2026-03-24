import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/games/count
 * Devuelve cantidad de juegos con status approved (para UI de packs).
 */
export async function GET() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { count, error } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
