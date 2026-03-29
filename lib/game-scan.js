/**
 * Análisis estático de HTML/JS de juegos para el panel de moderación.
 */

/** @typedef {{ level: 'error' | 'warning' | 'info', message: string, detail: string }} GameScanAlert */

function lineAtIndex(html, index) {
  if (index < 0 || index > html.length) return 1;
  return html.slice(0, index).split('\n').length;
}

function snippetAt(html, index, radius = 80) {
  const lineStart = html.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = html.indexOf('\n', index);
  const slice = html.slice(
    lineStart,
    lineEnd === -1 ? html.length : lineEnd,
  );
  const col = index - lineStart;
  const start = Math.max(0, col - radius);
  const end = Math.min(slice.length, col + radius);
  const excerpt = slice.slice(start, end).replace(/\s+/g, ' ').trim();
  return { line: lineAtIndex(html, index), excerpt: excerpt || '(vacío)' };
}

/**
 * @param {string} html
 * @param {number} matchIndex - índice donde empieza "window.parent"
 */
function isGameScoreParentPostMessage(html, matchIndex) {
  const afterParent = html.slice(matchIndex + 'window.parent'.length);
  if (!/^\s*\.\s*postMessage\s*\(/i.test(afterParent)) return false;
  const relOpen = afterParent.indexOf('(');
  const openParen = matchIndex + 'window.parent'.length + relOpen + 1;
  let depth = 1;
  let i = openParen;
  while (i < html.length && depth > 0) {
    const ch = html[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < html.length && html[i] !== q) {
        if (html[i] === '\\') i++;
        i++;
      }
    }
    i++;
  }
  const firstArg = html.slice(openParen, i - 1);
  return /type\s*:\s*['"]GAME_SCORE['"]/i.test(firstArg);
}

function extractFetchUrl(fetchArgs) {
  const m1 = fetchArgs.match(/^\s*['"]([^'"]+)['"]/);
  if (m1) return m1[1];
  const m2 = fetchArgs.match(/^\s*`([^`]+)`/);
  if (m2) return m2[1];
  return null;
}

function isAllowedFetchHost(urlStr) {
  if (!urlStr) return false;
  try {
    const u = new URL(urlStr, 'https://placeholder.invalid');
    const h = u.hostname.toLowerCase();
    return (
      h === 'cdnjs.cloudflare.com'
      || h === 'cdn.jsdelivr.net'
      || h.endsWith('.cdn.jsdelivr.net')
      || h === 'unpkg.com'
      || h.endsWith('.supabase.co')
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} htmlString
 * @returns {{ alerts: GameScanAlert[], summary: 'clean' | 'warnings' | 'blocked' }}
 */
export function scanGameHtml(htmlString) {
  /** @type {GameScanAlert[]} */
  const alerts = [];
  if (htmlString == null || typeof htmlString !== 'string') {
    return { alerts: [], summary: 'clean' };
  }

  const html = htmlString;

  function addAlert(level, message, index) {
    const { line, excerpt } = snippetAt(html, index);
    alerts.push({
      level,
      message,
      detail: `Línea ${line}: …${excerpt}…`,
    });
  }

  {
    const re = /\bnew\s+websocket\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('error', 'El juego intenta abrir una conexión WebSocket. Esto está bloqueado por seguridad.', m.index);
    }
  }

  {
    const re = /crypto\s*\.\s*subtle\b/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('error', 'El juego usa funciones criptográficas. Podría ser un intento de minería de criptomonedas.', m.index);
    }
  }

  {
    const re = /\bcryptokey\b/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('error', 'El juego usa funciones criptográficas. Podría ser un intento de minería de criptomonedas.', m.index);
    }
  }

  {
    const re = /\bnew\s+(?:sharedworker|worker)\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('error', 'El juego intenta crear procesos en segundo plano. Esto está bloqueado por seguridad.', m.index);
    }
  }

  {
    const re = /document\s*\.\s*cookie\b/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('error', 'El juego intenta acceder a cookies del navegador.', m.index);
    }
  }

  {
    const re = /window\.parent/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (isGameScoreParentPostMessage(html, m.index)) continue;
      addAlert('error', 'El juego intenta acceder a la ventana principal de la plataforma.', m.index);
    }
  }

  const fetchMsg = 'El juego hace llamadas de red. Si usa CDNs conocidos (cdnjs, jsdelivr, unpkg) es normal. Si llama a servidores desconocidos, puede ser sospechoso.';
  {
    const re = /\bfetch\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const open = html.indexOf('(', m.index) + 1;
      let depth = 1;
      let i = open;
      while (i < html.length && depth > 0) {
        const ch = html[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === '"' || ch === "'" || ch === '`') {
          const q = ch;
          i++;
          while (i < html.length && html[i] !== q) {
            if (html[i] === '\\') i++;
            i++;
          }
        }
        i++;
      }
      const inner = html.slice(open, i - 1);
      const url = extractFetchUrl(inner);
      const line = lineAtIndex(html, m.index);
      if (url && isAllowedFetchHost(url)) {
        alerts.push({
          level: 'info',
          message: fetchMsg,
          detail: `Línea ${line}: fetch hacia origen permitido (${url})`,
        });
      } else {
        let detail = `Línea ${line}: …${snippetAt(html, m.index).excerpt}…`;
        if (url) detail = `Línea ${line}: fetch('${url.length > 120 ? `${url.slice(0, 120)}…` : url}')`;
        alerts.push({ level: 'warning', message: fetchMsg, detail });
      }
    }
  }

  {
    const re = /\bxmlhttprequest\b/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('warning', fetchMsg, m.index);
    }
  }

  {
    const re = /\beval\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('warning', 'El juego usa eval(). Algunos frameworks lo necesitan internamente, pero puede usarse para ofuscar código malicioso.', m.index);
    }
  }

  {
    const re = /window\.open\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('warning', 'El juego intenta abrir ventanas nuevas.', m.index);
    }
  }

  if (/\bnavigator\s*\.\s*geolocation\b/i.test(html)) {
    const idx = html.search(/navigator\s*\.\s*geolocation/i);
    addAlert('warning', 'El juego intenta acceder a la ubicación o cámara/micrófono. El sandbox del iframe debería bloquearlo.', idx);
  }
  if (/\bnavigator\s*\.\s*mediaDevices\b/i.test(html)) {
    const idx = html.search(/navigator\s*\.\s*mediaDevices/i);
    addAlert('warning', 'El juego intenta acceder a la ubicación o cámara/micrófono. El sandbox del iframe debería bloquearlo.', idx);
  }

  if (/\blocalstorage\b/i.test(html)) {
    const idx = html.search(/\blocalstorage\b/i);
    addAlert('info', 'El juego guarda datos localmente en el navegador. Es un patrón normal y está permitido.', idx);
  }
  if (/\bsessionstorage\b/i.test(html)) {
    const idx = html.search(/\bsessionstorage\b/i);
    addAlert('info', 'El juego guarda datos localmente en el navegador. Es un patrón normal y está permitido.', idx);
  }

  {
    const re = /\b(alert|confirm|prompt)\s*\(/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addAlert('info', 'El juego usa ventanas emergentes del navegador. Es un patrón común y está permitido.', m.index);
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const a of alerts) {
    const line = a.detail.match(/^Línea (\d+)/)?.[1] || '';
    const key = `${a.level}|${a.message}|${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }

  const hasError = deduped.some((a) => a.level === 'error');
  const hasWarning = deduped.some((a) => a.level === 'warning');
  let summary = 'clean';
  if (hasError) summary = 'blocked';
  else if (hasWarning) summary = 'warnings';

  return { alerts: deduped, summary };
}
