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
