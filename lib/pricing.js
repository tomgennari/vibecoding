/** Precios de desbloqueo (ARS). Fuente única para UI y APIs. */
export const PRICING = {
  INDIVIDUAL: 6000,
  PACK_10: 40000,
  PACK_30: 100000,
  ALL_ACCESS: 300000,
  UNLOCK_FOR_ALL: 50000,
};

/**
 * Precio individual efectivo (ARS): custom del juego si es entero > 0, si no {@link PRICING.INDIVIDUAL}.
 * @param {unknown} gamePrice Valor de `games.price` (puede ser null/0).
 * @returns {number}
 */
export function effectiveIndividualGamePrice(gamePrice) {
  const n = Number(gamePrice);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return PRICING.INDIVIDUAL;
}
