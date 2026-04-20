# Schema de Base de Datos — Referencia Rápida

> **USO:** Antes de escribir queries a Supabase, consultá esta referencia para usar las columnas correctas.  
> **REGLA CLAVE:** Solo `profiles` y `games` tienen `created_at`. Las demás tablas usan nombres específicos para sus timestamps.

---

## Tablas y Columnas

### `profiles`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK, viene de Supabase Auth |
| first_name | text | |
| last_name | text | |
| email | text | |
| user_type | text | 'alumno' \| 'padre' |
| house | text | 'William Brown' \| 'James Dodds' \| 'James Fleming' \| 'John Monteith' \| 'random' |
| is_admin | boolean | default false |
| is_blocked | boolean | default false |
| tokens_used | decimal | Créditos Andy consumidos (USD) |
| tokens_limit | decimal | Límite de créditos Andy (USD), default 1.00 |
| unlock_credits | integer | Créditos de desbloqueo de juegos disponibles |
| has_all_access | boolean | ALL ACCESS permanente |
| all_access_at | timestamptz | Fecha de compra de ALL ACCESS |
| **created_at** | **timestamptz** | **✅ Esta tabla SÍ tiene created_at** |

### `games`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| title | text | |
| description | text | |
| house | text | |
| file_url | text | URL en Supabase Storage |
| github_url | text | Para juegos de GitHub (futuro) |
| status | text | 'pending' \| 'approved' \| 'rejected' |
| submitted_by | uuid | FK a profiles.id |
| approved_at | timestamptz | |
| show_author | boolean | |
| unlocked_for_all | boolean | |
| unlocked_for_all_by | uuid | |
| unlocked_for_all_at | timestamptz | |
| total_likes | integer | |
| total_revenue | integer | |
| total_plays | integer | |
| **created_at** | **timestamptz** | **✅ Esta tabla SÍ tiene created_at** |

### `game_sessions`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| game_id | uuid | FK a games.id |
| **started_at** | **timestamptz** | **⚠️ NO es created_at** |
| ended_at | timestamptz | |
| duration_seconds | integer | |

### `game_scores`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| game_id | uuid | FK a games.id |
| score | integer | |
| **played_at** | **timestamptz** | **⚠️ NO es created_at** |

### `game_likes`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| game_id | uuid | FK a games.id |
| created_at | timestamptz | Esta sí tiene created_at |

### `game_unlocks`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| game_id | uuid | FK a games.id |
| amount_paid | integer | 0 si fue con crédito de pack |
| payment_id | text | ID de MercadoPago |
| **unlocked_at** | **timestamptz** | **⚠️ NO es created_at** |

### `pack_purchases`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| pack_type | text | 'individual' \| 'pack_10' \| 'pack_30' \| 'all_access' |
| credits_granted | integer | |
| amount_paid | integer | |
| payment_id | text | ID de MercadoPago |
| **purchased_at** | **timestamptz** | **⚠️ NO es created_at** |

### `donations`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK a profiles.id |
| building_id | uuid | Nullable |
| amount | bigint | |
| payment_id | text | |
| **donated_at** | **timestamptz** | **⚠️ NO es created_at** |

### `daily_free_games`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| game_id | uuid | FK a games.id |
| active_date | date | Nullable — se setea por el cron o inmediatamente si el admin usa "Activar hoy" |
| scheduled_for | date | Nullable — programación (mañana desde el panel, u hoy si el admin activa el mismo día) |
| auto_selected | boolean | true = cron, false = admin |

### `buildings`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| name | text | |
| target_amount | bigint | |
| current_amount | bigint | |
| unlock_type | text | |
| display_order | integer | |

### `house_points`
| Columna | Tipo | Notas |
|---------|------|-------|
| house | text | PK |
| total_points | decimal | |
| points_by_games | decimal | |
| points_by_time | decimal | |
| points_by_donations | decimal | |

### `andy_sessions`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| user_id | uuid | FK → `profiles.id`, NOT NULL |
| session_key | text | NOT NULL — idempotente con `user_id` (clave del Game Lab en `sessionStorage`) |
| messages_count | integer | NOT NULL, default 0 — filas persistidas en `andy_messages` (user+assistant) |
| credits_consumed | numeric | NOT NULL, default 0 — suma USD consumidos en la sesión (costes de mensajes assistant) |
| had_errors | boolean | NOT NULL, default false — fallos de API / stream u otros errores server-side |
| had_auto_retry | boolean | NOT NULL, default false — hubo continuación, autofix o reintento por error |
| framework_used | text | Nullable — `kaplay` \| `p5js` \| `threejs` \| `canvas2d` (primera detección en HTML generado) |
| started_at | timestamptz | NOT NULL, default `now()` — inicio de la sesión |
| ended_in_submission | boolean | NOT NULL, default false — `true` cuando el alumno envía el juego a moderación |
| game_id | uuid | Nullable, FK → `games.id` — juego asociado tras moderar (si aplica) |
| duration_seconds | integer | Nullable — duración al cerrar sesión (p. ej. moderación) |

### `andy_messages`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| session_id | uuid | FK → `andy_sessions.id`, NOT NULL — ON DELETE típicamente CASCADE |
| role | text | NOT NULL — `user` \| `assistant` |
| content | text | NOT NULL — texto conversacional del turno (el HTML del juego no se guarda acá; va implícito en respuestas del asistente en el producto, acá suele ir el `reply` sin bloque) |
| generated_html | boolean | NOT NULL, default false — `true` si ese turno assistant incluyó generación de HTML/juego |
| tokens_input | integer | NOT NULL, default 0 — tokens de entrada reportados por Anthropic (solo turnos assistant con coste) |
| tokens_output | integer | NOT NULL, default 0 — tokens de salida |
| cost_usd | numeric | NOT NULL, default 0 — coste estimado USD del turno (API Anthropic) |
| is_error_fix | boolean | NOT NULL, default false — mensaje asociado a continuación por truncado, autofix o flujo de error |
| created_at | timestamptz | NOT NULL, default `now()` — orden cronológico del turno |

---

## RPCs (Funciones de Supabase)

| Función | Retorna | Descripción |
|---------|---------|-------------|
| `get_total_raised()` | bigint | Suma total recaudada sin doble conteo (pack_purchases + game_unlocks exclusivos + donations). SECURITY DEFINER. |
| `get_authors(user_ids UUID[])` | tabla | Nombres de autores respetando RLS. SECURITY DEFINER. |

---

## RLS Policies Relevantes

| Tabla | Policy | Alcance |
|-------|--------|---------|
| game_unlocks | `unlocks_read_own` | Usuario ve solo los suyos |
| game_unlocks | `admin_read_unlocks` | Admin ve todos |
| donations | `donations_read_own` | Usuario ve solo las suyas |
| donations | `admin_read_donations` | Admin ve todas |
| pack_purchases | `Users can view own pack purchases` | Usuario ve solo las suyas |
| pack_purchases | `admin_read_pack_purchases` | Admin ve todas |

---

*Actualizar este archivo cada vez que se modifique el schema de Supabase.*
