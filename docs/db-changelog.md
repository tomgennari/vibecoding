# DB Changelog

Registro de cambios de estructura en la base de datos.

| Fecha | Cambio | Motivo |
|-------|--------|--------|
| Feb 2026 | Panel Admin: `profiles.is_admin` (boolean), `profiles.is_blocked` (boolean) | Control de acceso admin y bloqueo de cuentas |
| Feb 2026 | Panel Admin: `games.rejection_reason` (text, opcional) | Guardar motivo al rechazar un juego |
| Feb 2026 | Storage bucket `games` (público para lectura) | Subida de archivos .html por el admin |
