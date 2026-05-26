/**
 * Detección única de dimensiones lógicas de un juego HTML embebido.
 *
 * Combina las heurísticas de:
 * - app/juegos/subir/page.js y app/admin/components/LoadGameModal.js (parseHtmlDimensions)
 * - app/game-lab/page.js (createCanvas, kaplay, const W/H)
 *
 * Diferencia histórica ya resuelta: los parsers de subida solo miraban canvas/meta/CSS;
 * el Game Lab además leía p5/kaplay/W,H. Esta función aplica el orden unificado abajo.
 */

/**
 * Variables numéricas `const|let|var Name = dígito` (y pares Name, Name2 en la misma declaración).
 * Sirve para resolver createCanvas(W,H) y kaplay({ width: W, height: H }).
 */
function buildNumericBindings(str) {
  /** @type {Record<string, number>} */
  const bindings = {};

  const pairRe =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*,\s*([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*[;,]?/gi;
  let pm;
  while ((pm = pairRe.exec(str)) !== null) {
    bindings[pm[1]] = parseInt(pm[2], 10);
    bindings[pm[3]] = parseInt(pm[4], 10);
  }

  const singleRe =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*[;,]?/gi;
  let sm;
  while ((sm = singleRe.exec(str)) !== null) {
    if (!(sm[1] in bindings)) {
      bindings[sm[1]] = parseInt(sm[2], 10);
    }
  }

  return bindings;
}

/**
 * @param {Record<string, number>} bindings
 * @param {string} token
 */
function resolveBinding(bindings, token) {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const n = bindings[token];
  return typeof n === 'number' && n > 0 ? n : null;
}

/**
 * @param {string} html
 * @param {{ minDimension?: number, fallback?: { width: number, height: number } | null }} [options]
 * @returns {{ width: number, height: number } | null}
 */
export function getGameDimensions(html, options = {}) {
  const minDimension = options.minDimension ?? 300;
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback')
    ? options.fallback
    : null;

  if (!html || typeof html !== 'string') return fallback;

  const str = html.replace(/\s+/g, ' ');
  const bindings = buildNumericBindings(str);

  /*
   * Heurística fullscreen/responsive — idéntica a parseHtmlDimensions (subir / LoadGameModal):
   * sin dimensiones fijas → no intentamos número (el caller usa fallback).
   */
  const fullscreenPatterns = [
    /window\.innerWidth/i,
    /window\.innerHeight/i,
    /\b100vw\b/i,
    /\b100vh\b/i,
    /setSize\s*\(\s*window\./i,
    /document\.documentElement\.clientWidth/i,
    /document\.documentElement\.clientHeight/i,
  ];
  const looksFullscreen = fullscreenPatterns.some((re) => re.test(str));
  if (looksFullscreen) return fallback;

  /** @type {number | null} */
  let w = null;
  /** @type {number | null} */
  let h = null;

  // Heurística 2: viewport con width/height numérico explícito (subir)
  const viewportMatch =
    str.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i)
    || str.match(/content=["']([^"']*width[^"']*)["'][^>]*name=["']viewport["']/i);
  if (viewportMatch) {
    const content = viewportMatch[1];
    const widthMatch = content.match(/width\s*=\s*(\d+)/i);
    const heightMatch = content.match(/height\s*=\s*(\d+)/i);
    if (widthMatch) w = parseInt(widthMatch[1], 10);
    if (heightMatch) h = parseInt(heightMatch[1], 10);
  }

  // Heurística 3: <canvas> — mayor área (subir); no “primer canvas” del Game Lab viejo.
  if ((w == null || h == null) && /<canvas/i.test(str)) {
    const canvasRe = /<canvas\b[^>]*>/gi;
    let match;
    let bestArea = 0;
    let bestW = null;
    let bestH = null;
    while ((match = canvasRe.exec(str)) !== null) {
      const tag = match[0];
      const cw = tag.match(/\bwidth\s*=\s*["']?(\d+)/i);
      const ch = tag.match(/\bheight\s*=\s*["']?(\d+)/i);
      if (cw && ch) {
        const cwN = parseInt(cw[1], 10);
        const chN = parseInt(ch[1], 10);
        const area = cwN * chN;
        if (area > bestArea) {
          bestArea = area;
          bestW = cwN;
          bestH = chN;
        }
      }
    }
    if (bestW && bestH) {
      w = w ?? bestW;
      h = h ?? bestH;
    }
  }

  // Heurística 4: CSS body/html/#game/.game px (subir)
  if ((w == null || h == null) && /(?:body|html)\s*\{[^}]*\}/i.test(str)) {
    const widthPx = str.match(
      /(?:body|html|#game|\.game)[^}]*\b(?:width|max-width)\s*:\s*(\d+)\s*px/gi,
    );
    const heightPx = str.match(
      /(?:body|html|#game|\.game)[^}]*\bheight\s*:\s*(\d+)\s*px/gi,
    );
    if (widthPx?.length)
      w = w ?? parseInt(widthPx[0].match(/(\d+)/)[1], 10);
    if (heightPx?.length)
      h = h ?? parseInt(heightPx[0].match(/(\d+)/)[1], 10);
  }

  // Heurística 5: variables CSS (subir)
  if ((w == null || h == null) && /--(?:game-)?(?:width|height)/i.test(str)) {
    const vw =
      str.match(/--game-width\s*:\s*(\d+)/i) || str.match(/--width\s*:\s*(\d+)/i);
    const vh =
      str.match(/--game-height\s*:\s*(\d+)/i) || str.match(/--height\s*:\s*(\d+)/i);
    if (vw) w = w ?? parseInt(vw[1], 10);
    if (vh) h = h ?? parseInt(vh[1], 10);
  }

  // p5.js: createCanvas literal o identifiers (ej. createCanvas(W, H))
  if (w == null || h == null) {
    const cc = str.match(
      /createCanvas\s*\(\s*(\d+|[A-Za-z_$][\w$]*)\s*,\s*(\d+|[A-Za-z_$][\w$]*)\s*\)/,
    );
    if (cc) {
      const cw = resolveBinding(bindings, cc[1]);
      const ch = resolveBinding(bindings, cc[2]);
      if (cw != null && ch != null) {
        w = w ?? cw;
        h = h ?? ch;
      }
    }
  }

  // Kaplay: literales primero; si no, width/height desde variables resueltas con bindings.
  if (w == null || h == null) {
    let km = str.match(
      /kaplay\s*\(\s*\{[\s\S]*?\bwidth\s*:\s*(\d+)[\s\S]*?\bheight\s*:\s*(\d+)/i,
    );
    if (!km) {
      km = str.match(
        /kaplay\s*\(\s*\{[\s\S]*?\bheight\s*:\s*(\d+)[\s\S]*?\bwidth\s*:\s*(\d+)/i,
      );
      if (km) {
        const tw = parseInt(km[2], 10);
        const th = parseInt(km[1], 10);
        if (tw > 0 && th > 0) {
          w = w ?? tw;
          h = h ?? th;
        }
      }
    } else {
      const tw = parseInt(km[1], 10);
      const th = parseInt(km[2], 10);
      if (tw > 0 && th > 0) {
        w = w ?? tw;
        h = h ?? th;
      }
    }
  }

  if (w == null || h == null) {
    let mWH = str.match(
      /kaplay\s*\(\s*\{[\s\S]*?\bwidth\s*:\s*([A-Za-z_$][\w$]*)[\s\S]*?\bheight\s*:\s*([A-Za-z_$][\w$]*)/i,
    );
    let tw = null;
    let th = null;
    if (mWH) {
      tw = resolveBinding(bindings, mWH[1]);
      th = resolveBinding(bindings, mWH[2]);
    } else {
      const mHW = str.match(
        /kaplay\s*\(\s*\{[\s\S]*?\bheight\s*:\s*([A-Za-z_$][\w$]*)[\s\S]*?\bwidth\s*:\s*([A-Za-z_$][\w$]*)/i,
      );
      if (mHW) {
        th = resolveBinding(bindings, mHW[1]);
        tw = resolveBinding(bindings, mHW[2]);
      }
    }
    if (tw != null && th != null && tw > 0 && th > 0) {
      w = w ?? tw;
      h = h ?? th;
    }
  }

  // const W = …, H = … (retrocompatibilidad y games sin kaplay(vars) usable)
  if (w == null || h == null) {
    const wh = str.match(
      /const\s+W\s*=\s*(\d+)\s*,\s*H\s*=\s*(\d+)\s*[;,]?/,
    );
    if (wh) {
      const cw = parseInt(wh[1], 10);
      const ch = parseInt(wh[2], 10);
      if (cw > 0 && ch > 0) {
        w = w ?? cw;
        h = h ?? ch;
      }
    }
  }

  // Filtro final (subir): dimensiones demasiado chicas = probable HUD / minimapa.
  if (w != null && h != null && w > 0 && h > 0) {
    if (w < minDimension || h < minDimension) return fallback;
    return { width: w, height: h };
  }

  return fallback;
}
