/**
 * CSP y monitor de seguridad para HTML de juegos en iframes (srcdoc).
 * Convive con el frame cap en {@link ./game-frame-cap.js}.
 */
import { FRAME_CAP_SCRIPT } from './game-frame-cap.js';

const SECURITY_MONITOR_MARKER = '/*__VIBE_SECURITY_MONITOR__*/';
const SECURITY_BUNDLE_MARKER = '<!--__VIBE_GAME_SECURITY_BUNDLE__-->';

const CSP_DIRECTIVES = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://*.supabase.co",
  "connect-src https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://*.supabase.co",
  "img-src 'self' blob: data: https: http:",
  "media-src 'self' blob: data: https: http:",
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "worker-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ');

/**
 * Meta tag CSP para insertar en el <head> del HTML del juego.
 * @returns {string}
 */
export function getSecurityMeta() {
  return `<meta http-equiv="Content-Security-Policy" content="${CSP_DIRECTIVES}">`;
}

/**
 * Script de monitor: violaciones CSP y window.onerror → postMessage al parent.
 * Debe ir después del meta CSP y antes del código del juego.
 * @returns {string}
 */
export function getSecurityMonitor() {
  const body = `
${SECURITY_MONITOR_MARKER}
(function() {
  function friendlyViolationMessage(directive, blocked) {
    var d = directive || '';
    var b = blocked || '';
    if (d.indexOf('connect-src') !== -1) {
      return 'El juego intentó conectarse a un servidor externo (' + b + ')';
    }
    if (d.indexOf('worker-src') !== -1) {
      return 'El juego intentó crear un proceso en segundo plano';
    }
    if (d.indexOf('frame-src') !== -1) {
      return 'El juego intentó abrir un iframe interno';
    }
    return 'El juego intentó una acción bloqueada por seguridad: ' + d;
  }
  document.addEventListener('securitypolicyviolation', function(e) {
    try {
      var d = e.violatedDirective || '';
      var b = e.blockedURI || '';
      window.parent.postMessage({
        type: 'SECURITY_VIOLATION',
        detail: {
          directive: d,
          blocked: b,
          message: friendlyViolationMessage(d, b)
        }
      }, '*');
    } catch (err) {}
  });
  var prevOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    try {
      window.parent.postMessage({
        type: 'GAME_ERROR',
        detail: { message: String(message), source: source || '', line: lineno }
      }, '*');
    } catch (e) {}
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, arguments);
    }
    return false;
  };
})();
`.trim();
  return `<script>${body}</script>`;
}

function buildSecurityBundle() {
  return `${SECURITY_BUNDLE_MARKER}${getSecurityMeta()}${getSecurityMonitor()}${FRAME_CAP_SCRIPT}`;
}

/**
 * Inserta CSP, monitor y frame cap en el <head>. Idempotente.
 * @param {string} html
 * @returns {string}
 */
export function prepareGameHtml(html) {
  if (!html || typeof html !== 'string') return html;
  if (html.includes(SECURITY_BUNDLE_MARKER) || html.includes(SECURITY_MONITOR_MARKER)) return html;

  const bundle = buildSecurityBundle();
  const headRe = /<head(\s[^>]*)?>/i;
  if (headRe.test(html)) {
    return html.replace(headRe, (m) => m + bundle);
  }
  const htmlRe = /<html(\s[^>]*)?>/i;
  if (htmlRe.test(html)) {
    return html.replace(htmlRe, (m) => m + '<head>' + bundle + '</head>');
  }
  return '<head>' + bundle + '</head>' + html;
}
