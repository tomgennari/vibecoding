# DB Changelog

Registro de cambios de estructura en la base de datos.

| Fecha | Cambio | Motivo |
|-------|--------|--------|
| Feb 2026 | Panel Admin: `profiles.is_admin` (boolean), `profiles.is_blocked` (boolean) | Control de acceso admin y bloqueo de cuentas |
| Feb 2026 | Panel Admin: `games.rejection_reason` (text, opcional) | Guardar motivo al rechazar un juego |
| Feb 2026 | Storage bucket `games` (público para lectura) | Subida de archivos .html por el admin |
| Feb 2026 | `games.game_width` (INTEGER DEFAULT 800), `games.game_height` (INTEGER DEFAULT 600), `games.orientation` (TEXT DEFAULT 'horizontal') | Dimensiones y orientación del juego para el iframe |
| Feb 2026 | `games.total_revenue` (NUMERIC DEFAULT 0) | Recaudación total por juego (MercadoPago Checkout Pro) |
| Feb 2026 | `games.total_likes` (INTEGER DEFAULT 0) | Cantidad de likes por juego (sincronizado con game_likes) |
| Mar 2026 | **game_sessions** ya existente | Tabla usada para tracking de tiempo jugado: `id`, `user_id`, `game_id`, `started_at`, `ended_at`, `duration_seconds`. La API `/api/sesion` crea y finaliza sesiones; dashboard y perfil suman `duration_seconds` por usuario. |
| Mar 2026 | `games.total_plays` (INTEGER, opcional) | Contador de partidas por juego; se actualiza al finalizar cada sesión en `/api/sesion` (PATCH). Si no existe, el admin/juegos siguen calculando jugadas desde `game_sessions`. |
| Mar 2026 | `daily_free_games.scheduled_for` (DATE, nullable), `daily_free_games.auto_selected` (BOOLEAN DEFAULT FALSE) | Planificación: programar juegos para una fecha; el cron activa con `active_date`. `auto_selected` indica si lo eligió el cron. Las filas solo programadas pueden tener `active_date` NULL hasta que el cron las active. Ejecutar: `ALTER TABLE daily_free_games ADD COLUMN IF NOT EXISTS scheduled_for DATE; ALTER TABLE daily_free_games ADD COLUMN IF NOT EXISTS auto_selected BOOLEAN DEFAULT FALSE;` Si `active_date` es NOT NULL, considerar `ALTER TABLE daily_free_games ALTER COLUMN active_date DROP NOT NULL;` para permitir programación. |
| Mar 2026 | Variable de entorno `CRON_SECRET` | String aleatorio para proteger `/api/cron/daily-games`. Añadir en `.env.local` (local) y en Vercel → Project → Settings → Environment Variables. El cron envía `Authorization: Bearer <CRON_SECRET>`. |
| Mar 2026 | `games.total_plays` (INTEGER DEFAULT 0) | Ejecutado: `ALTER TABLE games ADD COLUMN IF NOT EXISTS total_plays INTEGER DEFAULT 0;` |
| Mar 2026 | `games.total_likes` (INTEGER DEFAULT 0) | Ejecutado: `ALTER TABLE games ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;` |
| Mar 2026 | Edge Function activate-daily-games + cron pg_cron a las 03:00 UTC | Activar automáticamente los juegos programados para el día y completar con auto-selección si hay menos de 3 |
| Mar 2026 | donations tabla usada para registrar donaciones directas de padres: id, user_id, amount, payment_id, house | Requerida para el sistema de donaciones vía MercadoPago y para el ranking de donaciones por House |