/**
 * Email del equipo para copias en notificaciones (p. ej. donaciones).
 * Definir `ADMIN_EMAIL` en Vercel / `.env.local`.
 */
export const ADMIN_EMAIL = (typeof process !== 'undefined' && process.env.ADMIN_EMAIL) || '';
