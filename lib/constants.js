/**
 * Email del equipo para copias en notificaciones (p. ej. donaciones).
 * Definir `ADMIN_EMAIL` en Vercel / `.env.local`.
 */
export const ADMIN_EMAIL = (typeof process !== 'undefined' && process.env.ADMIN_EMAIL) || '';

/** Modelo Claude vía Anthropic API (Game Lab, análisis Andy, moderación IA). */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
