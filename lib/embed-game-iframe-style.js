/**
 * Estilo del iframe de juegos embebidos: tamaño lógico + max 100% + aspect-ratio.
 * `object-fit` no aplica a iframes; esto replica el comportamiento “contain”.
 *
 * @param {{ width: number, height: number } | null} dims Detectadas con getGameDimensions; null = DOM/fluid sin canvas fijo.
 * @returns {Record<string, string | number>}
 */
export function embedGameIframeStyle(dims) {
  if (
    dims == null ||
    !Number.isFinite(dims.width) ||
    !Number.isFinite(dims.height) ||
    dims.width < 1 ||
    dims.height < 1
  ) {
    return {
      flex: '1 1 auto',
      width: '100%',
      height: '100%',
      minHeight: 0,
      display: 'block',
    };
  }

  const w = Math.max(1, Math.min(8192, Math.floor(Number(dims.width))));
  const h = Math.max(1, Math.min(8192, Math.floor(Number(dims.height))));

  return {
    width: w,
    height: h,
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: `${w} / ${h}`,
    display: 'block',
  };
}
