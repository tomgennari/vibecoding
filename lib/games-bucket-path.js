/**
 * Ruta relativa dentro del bucket `games` a partir de la URL pública de Storage.
 * Soporta URLs con /object/public/games/... y fallbacks.
 */
export function getGamesBucketPathFromPublicUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const noQuery = fileUrl.split('?')[0];
  try {
    const u = new URL(noQuery);
    const segs = u.pathname.split('/').filter(Boolean);
    const idx = segs.indexOf('games');
    if (idx >= 0 && idx < segs.length - 1) {
      return decodeURIComponent(segs.slice(idx + 1).join('/'));
    }
  } catch {
    /* fall through */
  }
  const m = noQuery.match(/\/object\/public\/games\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  const legacy = noQuery.match(/\/games\/(.+)$/);
  return legacy ? decodeURIComponent(legacy[1]) : null;
}
