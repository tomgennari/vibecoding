/**
 * Devuelve la fecha actual en Argentina (UTC-3) como string YYYY-MM-DD.
 * Funciona tanto en el server (Node.js) como en el client (browser).
 */
export function getTodayArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Devuelve la fecha de mañana en Argentina como string YYYY-MM-DD.
 */
export function getTomorrowArgentina() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
}
