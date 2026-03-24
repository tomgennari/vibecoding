/** Valores de house válidos en DB (sin "random", que es temporal). */
export const VALID_HOUSES = ['william_brown', 'james_dodds', 'james_fleming', 'john_monteith'];

/**
 * Cuenta usuarios por house; elige el mínimo y en empate uno al azar.
 * Los perfiles con house = 'random' no suman a ningún bucket.
 */
export async function resolveLeastPopulatedHouse(supabaseAdmin) {
  const counts = await Promise.all(
    VALID_HOUSES.map(async (h) => {
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('house', h);
      if (error) throw error;
      return { house: h, count: count ?? 0 };
    }),
  );
  const minCount = Math.min(...counts.map((c) => c.count));
  const candidates = counts.filter((c) => c.count === minCount).map((c) => c.house);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
