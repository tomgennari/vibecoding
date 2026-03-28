# Campus San Andrés — Vibe Coding San Andrés
## Product Requirements Document (PRD) v4.0

**Fecha:** Marzo 2026  
**Autor:** Tomás Gennari  
**URL:** sass.vibecoding.ar  
**Repositorio:** github.com/tomgennari/vibecoding  
**Lema:** *Sic itur ad astra*

---

## 1. Resumen Ejecutivo

Campus San Andrés / Vibe Coding San Andrés es una plataforma web de fundraising gamificado para la comunidad del St. Andrew's Scots School (SASS), colegio bilingüe escocés con 188 años de historia en Argentina.

**Doble propósito:**
1. Recaudar fondos para la construcción del Campus unificado en San Fernando
2. Introducir a los alumnos de todos los niveles en el mundo del vibe-coding, permitiéndoles crear y publicar sus propios videojuegos

Los usuarios crean juegos con ayuda de la IA dentro de la plataforma y por cuenta propia, y los pueden subir a la plataforma. Los usuarios luego desbloquean juegos mediante pagos en pesos argentinos vía MercadoPago. Los padres además pueden acceder a las mismas funciones y además realizar donaciones directas para edificios. Todo el dinero va íntegramente a la construcción del campus. La competencia se organiza alrededor del sistema de Houses del colegio.

---

## 2. Contexto

### 2.1 El Colegio

| Campo | Detalle |
|-------|---------|
| Nombre completo | St. Andrew's Scots School (SASS) |
| Fundado | 1838 — 188 años de historia |
| Tipo | Bilingüe (español/inglés), laico, escocés |
| Alumnos | ~1.900 alumnos |
| Niveles | Kinder (K2) → Primaria → Secundaria completa |
| Sedes actuales | Campus San Fernando (Kinder/Primaria) + Olivos (Secundaria) |
| Objetivo | Unificar todo el colegio en San Fernando |
| Web oficial | sanandres.esc.edu.ar |
| Campaña oficial | sasscampus.com |

### 2.2 Los Edificios ya Construidos y a Construir

- Kinder (ya construido)
- Primaria (ya construido)
- Sports Pavilion (ya construido)
- Natatorio (en construcción actualmente)
- Community Hub (nombre general del proyecto de campus; no es un edificio individual en la plataforma)
- Colegio Secundario unificado
- Dining Hall – Gimnasio – Auditorio
- Performing Arts Center
- El Barco Symmetry (elemento de fantasía histórico, solo referenciado en esta plataforma — los fundadores del colegio, escoceses, llegaron en este barco a la Argentina)

### 2.3 El Sistema de Houses

| House | Color | Hex |
|-------|-------|-----|
| William Brown | Azul | `#3b82f6` |
| James Dodds | Amarillo | `#eab308` |
| James Fleming | Rojo | `#ef4444` |
| John Monteith | Verde | `#22c55e` |

---

## 3. Usuarios de la Plataforma

### 3.1 Alumnos

- Todos los niveles: Kinder, Primaria y Secundaria
- Se registran solos con email y contraseña
- Eligen su House al registrarse
- **SIN foto de perfil**
- **PUEDEN:** jugar juegos gratuitos del día
- **PUEDEN:** comprar/desbloquear juegos individuales o en paquetes con MercadoPago
- **PUEDEN:** subir sus propios juegos creados con vibe-coding
- **PUEDEN:** crear sus propios juegos dentro de la plataforma con la ayuda de Andy, nuestra IA.
- **PUEDEN:** ver los resultados y el progreso de las donaciones
- **NO PUEDEN:** realizar donaciones directas (solo los padres pueden hacer esto)
- **NO PUEDEN:** chat de texto, comentarios ni mensajes de ningún tipo
- **BOTÓN COMPARTIR:** en juegos y edificios, pueden compartir por WhatsApp para pedir a sus padres que donen

### 3.2 Padres / Familiares

- Se registran solos con email y contraseña
- **Eligen su House al registrarse** — la pertenencia al colegio es por familias, no solo por alumnos
- **SIN foto de perfil**
- **PUEDEN:** jugar juegos gratuitos del día
- **PUEDEN:** comprar/desbloquear juegos individuales o en paquetes
- **PUEDEN:** realizar donaciones directas para desbloquear edificios del campus
- **PUEDEN:** ver todos los scoreboards y el progreso de construcción
- **NO PUEDEN:** subir juegos
- **NO PUEDEN:** chat ni comentarios

### 3.3 Administrador (Tomás Gennari — fase MVP)

- Aprueba o rechaza juegos con mensaje al alumno
- Edita HTML de juegos inline o reemplaza archivos desde el panel admin
- Gestión completa de usuarios: alta, baja, modificación, bloqueo
- Acceso a todas las métricas, finanzas y reportes de recaudación
- Configura los 3 juegos gratuitos del día (manualmente o automático)
- Activa o desactiva paquetes de juegos según volumen disponible
- En fases futuras: el colegio tendrá su propio administrador

### 3.4 Escala Esperada

- ~1.900 alumnos potenciales
- ~3.800 padres potenciales (dos por alumno en promedio)
- Picos de cientos de usuarios simultáneos
- Campus 3D (Fase 4): soportar al menos 500 usuarios simultáneos

---

## 4. Funcionalidades del MVP (Fase 1)

### 4.1 Sistema de Usuarios

- Registro con email + contraseña
- Confirmación de email (activo en producción, desactivado en desarrollo)
- Login, logout y recuperación de contraseña
- Perfil: nombre, apellido, tipo, house — SIN foto de perfil
- Seguridad: Supabase Auth + Row Level Security en toda la DB
- **Email transaccional:** Resend configurado como SMTP custom en Supabase Auth. Sender: `noreply@sass.vibecoding.ar`. Dominio `sass.vibecoding.ar` verificado en Resend con registros DNS en Vercel. Rate limit free tier: 100 emails/día — suficiente para MVP, escalar a plan pago en lanzamiento masivo.
- **Validación de contraseña:** mínimo 8 caracteres, máximo 16, al menos 1 mayúscula, 1 minúscula y 1 número. Checklist visual en tiempo real durante el registro.
- **Confirmación de email:** template custom en Supabase Auth con redirect a `/auth/callback?token_hash={{ .TokenHash }}&type=signup` para crear sesión y redirigir al dashboard automáticamente.
- **Site URL en Supabase Auth:** `https://sass.vibecoding.ar` (producción). Los redirect URLs incluyen localhost para desarrollo y sass.vibecoding.ar + vibecoding-xi-sage.vercel.app para producción.

### 4.2 Sistema de Juegos

**Acceso:**
- 3 juegos gratuitos por día para todos los usuarios
- Todos los demás requieren compra/desbloqueo
- Los juegos desbloqueados quedan disponibles permanentemente para ese usuario
- Todos se ejecutan en iframe sandboxeado

**Subida de juegos (alumnos) — ✅ Implementado:**
- Página `/juegos/subir` accesible desde el navbar y el modal "Crea tu juego"
- Formulario: título, descripción (opcional), orientación, archivo .html o .zip (máximo 10MB)
- House detectada automáticamente del perfil del alumno — no se pide manualmente
- Dimensiones del juego detectadas automáticamente del HTML si es posible
- Archivo subido al bucket `games` en Supabase Storage
- Estado inicial: `pending` → flujo de moderación existente del admin
- El alumno ve confirmación post-envío y puede ver el estado en su perfil

**Moderación — tolerancia cero:**
- No violencia, racismo, contenido sexual, insultos ni temáticas sensibles
- No imágenes externas no aprobadas ni llamadas a APIs externas
- Historial de rechazos visible para el alumno (con motivo, para aprendizaje)
- Admin puede desactivar cualquier juego publicado en cualquier momento

**Interacción social — extremadamente limitada:**
- **NO existe** chat de texto ni comentarios en ninguna parte
- **NO existe** mensajería privada
- **ÚNICA interacción social:** emojis dentro del campus 3D (Fase 4)
- Botón compartir vía WhatsApp con link pre-formateado
- Esta decisión elimina toda necesidad de moderación de contenido generado por usuarios

### 4.3 Sistema de Pagos y Donaciones

**Precios para desbloquear juegos (alumnos y padres):**

| Paquete | Precio | Activación |
|---------|--------|-----------|
| Juego individual | $6.000 ARS | Desde el día 1 |
| Pack 10 juegos | $40.000 ARS | Desde el día 1 |
| Pack 30 juegos | $100.000 ARS | Cuando haya 50+ juegos |
| ALL ACCESS | $300.000 ARS | Cuando haya 100+ juegos |
| Juego individual - Desbloqueo para todos los usuarios | $50.000 ARS | Desde el día 1 |

**Sistema de packs y créditos — ✅ Implementado:**
- **Juego individual:** desbloquea 1 juego específico al pagar. Se registra en `game_unlocks`.
- **Pack 10 / Pack 30:** al pagar, se acreditan N créditos en `profiles.unlock_credits`. El usuario luego elige qué juegos desbloquear uno por uno desde la pantalla de desbloqueo, sin pagar de nuevo.
- **Auto-desbloqueo del juego origen:** si el usuario compra un pack desde un juego específico, ese juego se desbloquea automáticamente y se acreditan N-1 créditos (ej: Pack 10 → 9 créditos + 1 juego desbloqueado). Si el juego ya estaba desbloqueado, se acreditan los N créditos completos. El `back_url` de MercadoPago redirige al juego para que pueda jugar inmediatamente.
- **ALL ACCESS:** setea `profiles.has_all_access = true` permanentemente. Acceso a todos los juegos actuales y futuros sin necesidad de desbloquear individualmente.
- Los créditos se acumulan: un usuario puede comprar múltiples packs y sumar créditos.
- El desbloqueo con crédito se hace via endpoint `/api/games/unlock-with-credits` con protección de race condition.
- Pack 30 solo visible si hay 50+ juegos aprobados; ALL ACCESS solo si hay 100+ juegos aprobados (conteo dinámico via `/api/games/count`).
- Todas las compras se registran en tabla `pack_purchases` para historial y auditoría.
- Indicador de créditos disponibles visible en navbar y perfil. Badge "ALL ACCESS" si aplica.
- Créditos de Andy: +$1.00 USD al comprar cualquier paquete (individual, pack o ALL ACCESS).
- **Modal `UnlockGameModal`:** componente reutilizable (`components/unlock-game-modal.js`) integrado en dashboard, `/juegos` y `/jugar/[id]`. Muestra opciones de crédito (si disponible), individual, packs y ALL ACCESS. Tema oscuro fijo para legibilidad en ambos modos.
- **Precios centralizados** en `lib/pricing.js` — fuente única de verdad para todos los componentes y APIs.
- **Dashboard con ALL ACCESS:** si el usuario tiene `has_all_access`, todos los juegos aparecen en el carrusel "Todos los juegos" con tag "ALL ACCESS" y la sección "Juegos para desbloquear" se oculta.

**Donaciones directas (solo padres):**
- Monto elegido por el padre: $20.000 ARS | $100.000 ARS | $200.000 ARS | $500.000 ARS |
- Los alumnos NO pueden donar — solo compartir por WhatsApp para pedir a sus padres
- Todo el dinero (compras + donaciones) va al mismo fondo de construcción

**Cálculo de recaudación total — ✅ Implementado:**
- Función RPC `get_total_raised()` en Supabase con `SECURITY DEFINER`
- Fórmula: `SUM(pack_purchases.amount_paid) + SUM(game_unlocks.amount_paid WHERE payment_id NOT IN pack_purchases AND amount_paid > 0) + SUM(donations.amount)`
- Evita doble conteo: compras individuales están en ambas tablas (`pack_purchases` y `game_unlocks`) con el mismo `payment_id`; la RPC usa anti-join por `payment_id`
- Bypasea RLS para mostrar el total global a todos los usuarios

**Infraestructura:**
- Procesador: MercadoPago (~3% comisión por transacción)
- MVP: fondos a cuenta personal de Tomás Gennari
- Producción: fondos directamente a la cuenta del colegio
- 100% del neto (menos comisión MercadoPago) va a construcción del campus

### 4.4 Sistema de Métricas por Juego

Cada juego registra en la base de datos:

- Tiempo total jugado (suma de todas las sesiones)
- Tiempo jugado por usuario individual
- Cantidad de usuarios únicos
- Cantidad de likes
- Dinero total recaudado por ese juego
- Fecha de publicación y última partida
- **High Scores:** si el juego tiene puntaje, se guarda el top de puntuaciones — esta es la métrica de mayor engagement

**Integración de puntajes desde HTML5:**
- Script de análisis que detecta si el juego expone un puntaje final
- El script inyecta un listener en el iframe que captura eventos de fin de partida
- Si no hay puntaje detectable: la métrica principal es tiempo jugado
- Tabla `game_scores`: user_id, game_id, score, played_at
- Leaderboard por juego: top 10 histórico
- Los puntajes suman puntos al House del jugador

### 4.5 Scoreboards, Rankings y Sistema de Edificios ✅ Implementado

**Rankings de Houses en el Dashboard:**

8 rankings organizados en carrusel de grillas 2×2, en este orden:

| # | Ranking | Edificio asociado |
|---|---------|------------------|
| 1 | Más alumnos registrados | Kinder |
| 2 | Más padres registrados | Primary School |
| 3 | Más juegos creados | Sports Pavilion |
| 4 | Juegos Desbloqueados | Natatorio |
| 5 | Ranking de Likes | Dinning Hall |
| 6 | Tiempo Jugado | Performing Arts Center |
| 7 | Donaciones | Secondary School |
| 8 | Ranking Total | Symmetry Boat |

Cada tarjeta de ranking muestra una miniatura del edificio asociado en la esquina superior derecha (80×80px, `z-20`, sobresale de la tarjeta). Tamaño ajustable por edificio via `rankingScale` en `BUILDING_GOALS`.

**Sistema de Edificios a Desbloquear:**

Los edificios se desbloquean progresivamente según la recaudación total de la plataforma (calculada via RPC `get_total_raised()`):

| # | Edificio | Meta de recaudación | Progresión |
|---|----------|-------------------|------------|
| 1 | Kinder | $200.000 ARS | — |
| 2 | Primary School | $500.000 ARS | ×2.5 |
| 3 | Sports Pavilion | $1.500.000 ARS | ×3 |
| 4 | Natatorio | $5.000.000 ARS | ×3.3 |
| 5 | Dinning Hall | $15.000.000 ARS | ×3 |
| 6 | Performing Arts Center | $40.000.000 ARS | ×2.67 |
| 7 | Secondary School | $80.000.000 ARS | ×2 |
| 8 | Symmetry Boat | $150.000.000 ARS | ×1.875 |

Progresión exponencial decreciente: los primeros edificios son "alcanzables" rápido (genera momentum), los últimos son aspiracionales. Los primeros 3 edificios se desbloquean con $1.5M (1% del total).

Los milestones están definidos en el array `BUILDING_GOALS` en `app/dashboard/page.js`.

**Imágenes de edificios:**
- Ubicación: `public/images/Buildings No Backgrounds/`
- Patrón de nombres: `{Edificio}_Normal.png` (versión neutral) y `{Edificio}_{House}.png` (versión con colores de House)
- Sufijos de House: `William_Brown`, `James_Dodds`, `James_Fleming`, `John_Monteith`
- Excepciones de naming: `Natatorio_William Brown.png` y `Secondary_John Monteith.png` tienen espacio en vez de guion bajo (mapeado en `BUILDING_HOUSE_FILE_QUIRKS`)

**Estados visuales de los edificios en los rankings:**
- **Bloqueado** (`totalRaised < meta`): imagen Normal en `grayscale(100%)`, `opacity: 0.7`, ícono 🔒 superpuesto. Sin animación.
- **Desbloqueado** (`totalRaised >= meta`): animación CSS loop de 5s — ~2s imagen Normal a color → fade → ~3s imagen con colores del House que lidera ESE ranking → fade. Si el House líder cambia, la imagen se actualiza reactivamente. Animación en `app/globals.css`.

**Widget "Próximo Edificio a Desbloquear" (sidebar derecha del dashboard):**
- Título: "🏗️ Próximo Edificio a Desbloquear"
- Imagen del edificio actual en estado Normal (~80px, centrada)
- Nombre del edificio en negrita
- Monto recaudado vs meta con barra de progreso gradient (violeta→cyan)
- Lista de edificios ya completados con ✅ y nombre
- Versión mobile: compacta con nombre del edificio, barra de progreso y botón Donar
- Botón "Donar" abre modal de donación

### 4.6 Panel de Administración ✅ Implementado

El panel de admin está construido en Next.js en `/app/admin` con 6 hojas definidas en `app/admin/constants.js`:

**🎮 Juegos (`AdminGamesSection`) — ✅ Implementado:**
- Tabla completa de juegos con datos enriquecidos via `/api/admin/juegos`
- Columnas: ID (copiable), Título, House, Autor, Tipo (Andy/Manual), Estado, Fecha, Jugadores únicos, Likes, Recaudado, Tiempo jugado, High Score, Última partida, Badges (Gratis hoy, Para todos, Nunca gratis)
- Filtros: buscador por título/autor, estado, House, tipo (Andy/Manual)
- Ordenamiento por cualquier columna, paginación 20 por página
- Acciones: Ver (modal preview), Descargar HTML, Eliminar
- **Editor HTML inline:** en el modal de preview, el modo "Ver código" es un textarea editable. Botón "Guardar cambios" sube el HTML editado a Storage reemplazando el archivo existente via `/api/admin/juegos/update-html`
- **Resubir HTML:** botón "Reemplazar HTML" permite subir un archivo .html nuevo (< 500KB) que reemplaza el anterior en Storage. No afecta likes, compras, métricas ni scores del juego (están vinculados al `game_id`, no al archivo)
- **Moderación:** botones Aprobar/Rechazar en juegos pendientes, "Analizar con IA" para verificar contenido
- Botón "Cargar juego" para subir juegos nuevos como admin

**📅 Juegos del día (`AdminDailyGamesSection`):**
- Vista de juegos activos hoy y programados para mañana
- Tabla de todos los juegos aprobados con métricas
- Botón "Programar para mañana", límite 3 por día
- Fallback automático via cron a las 00:00

**👥 Usuarios (`AdminUsersSection`) — ✅ Implementado:**
- Tabla enriquecida via `/api/admin/usuarios` con datos agregados de múltiples tablas
- Columnas: Nombre, Email, Tipo, House, Registro, Juegos creados, Juegos comprados, Total gastado, Donado, Créditos Andy (usados/límite), Créditos desbloqueo, ALL ACCESS, Tiempo jugado, Puntos, Última actividad, Acciones
- Filtros: buscador, tipo (alumno/padre), House, estado (activos/bloqueados/admin), pagos (pagaron/nunca/ALL ACCESS)
- Ordenamiento por cualquier columna, paginación 20 por página
- Fila expandible con detalle de packs comprados y donaciones
- Acciones: Hacer admin / Quitar admin / Bloquear / Desbloquear

**📈 Engagement (`AdminEngagementSection`) — ✅ Implementado:**
- Datos via `/api/admin/engagement` (timezone `America/Argentina/Buenos_Aires`)
- KPIs: Usuarios activos hoy / 7 días / 30 días, Tiempo total jugado
- Tendencias (30 días): Registros por día, Tiempo jugado por día, Juegos creados por día — gráficos de barras CSS con eje Y
- Distribución: Registros por House, Andy vs Manual, Retención
- Rankings top 10: juegos por tiempo/jugadores/likes, jugadores por tiempo/desbloqueos
- Andy/Game Lab: créditos consumidos, promedio por usuario, juegos generados/publicados/rechazados

**💰 Finanzas (`AdminFinanzasSection`) — ✅ Implementado:**
- Datos via `/api/admin/finanzas`
- KPIs: Total recaudado (via RPC `get_total_raised()`), desglose por fuente (individuales, packs, ALL ACCESS, unlock_all, donaciones)
- Progreso de edificios: 8 barras con nombre, meta, recaudado, porcentaje, estado (✅/🔒)
- Tabla de transacciones: todas las transacciones unificadas de `pack_purchases` + `game_unlocks` (exclusivos) + `donations`, ordenadas por fecha. Columnas: Fecha, Usuario, Tipo, Monto, Payment ID, Juego. Tipos: Individual, Pack 10, Pack 30, ALL ACCESS, Unlock All, Individual (legacy), Donación
- Filtros: tipo, House, rango de fechas. Paginación 20 por página
- Métricas adicionales: Ticket promedio, Conversión (usuarios que pagaron vs registrados), Top 5 compradores

**🤖 Andy / Game Lab (`AdminAndySection`) — ✅ Implementado:**
- Datos via `/api/admin/andy/stats` y `/api/admin/andy/sessions` (listado paginado con filtros: todas, con errores, abandonadas, exitosas)
- KPIs: totales de sesiones, últimos 7 días, tasa de envío a moderación, mensajes y créditos por sesión, framework más usado, créditos USD agregados
- Tabla de sesiones con alumno, House, framework, flags de error/auto-retry, resultado (enviado vs abandonado), créditos y fechas
- Modal de detalle por sesión: conversación completa (mensajes alumno/Andy) con metadatos de tokens y coste
- **Analizar patrones con IA:** `POST /api/admin/andy/analyze` — toma hasta las últimas 50 sesiones problemáticas (errores o no enviadas a moderación), arma contexto desde `andy_messages` (sin HTML) y devuelve análisis en streaming (SSE) para mostrar en modal con markdown

**API routes de admin:**
- `GET /api/admin/juegos` — juegos enriquecidos con métricas
- `POST /api/admin/juegos/update-html` — editor inline y resubida de HTML
- `GET /api/admin/usuarios` — usuarios enriquecidos con datos agregados
- `GET /api/admin/engagement` — métricas de engagement
- `GET /api/admin/finanzas` — métricas financieras y transacciones
- `GET /api/admin/andy/stats` — KPIs de sesiones Andy / Game Lab
- `GET /api/admin/andy/sessions` — listado de sesiones (filtros y paginación)
- `GET /api/admin/andy/sessions/[id]` — detalle y mensajes de una sesión
- `POST /api/admin/andy/analyze` — análisis con IA de patrones (stream SSE)
- `POST /api/admin/daily-games` — programar juego del día
- `DELETE /api/admin/daily-games?gameId=` — quitar juego programado
- `POST /api/admin/notify-rejection` — email de rechazo al alumno
- Todas verifican sesión activa + `is_admin` + usan service role para bypasear RLS

**Moderación de juegos:**
- Modal `GamePreviewModal` con iframe `srcdoc` + toggle ver juego / ver código (editable)
- Botones Aprobar y Rechazar para juegos pendientes
- "Analizar con IA" verifica contenido apropiado y score reporting
- Badge "Creado con Andy" / "Subido como HTML" — análisis IA solo para HTML subidos
- Notificación email al admin cuando hay juegos pendientes (Edge Function `notify-new-game` + Database Webhook + Resend)
- Email de rechazo al alumno con motivo y link a editar

---

## 5. Mundo 3D — Campus Virtual (Fase 4)

### 5.1 Tecnología

- Three.js o Babylon.js — 3D nativo web, sin Unity, sin descarga de cliente
- Compatible con PWA (funciona en celulares como app nativa)

### 5.2 Experiencia

- Avatares simples sin personalización de foto
- Otros usuarios visibles en tiempo real
- Scoreboards como carteles dentro del mundo 3D
- **ÚNICA interacción:** envío de emojis a usuarios cercanos

### 5.3 Sistema de Desbloqueo de Edificios por House (Fase 4)

> Nota: En Fase 4, el desbloqueo visual en el mundo 3D será por House. En la fase actual, el desbloqueo en el dashboard es global por recaudación total (ver §4.5).

---

## Fase 3 — GitHub Integration (Alumnos Avanzados)

Para alumnos de secundaria que quieran crear juegos más complejos que no entren en un solo archivo HTML.

### Concepto
Los alumnos publican su proyecto en GitHub Pages y cargan la URL en la plataforma. El iframe apunta a esa URL externa.

### Flujo propuesto
1. El alumno crea su juego con múltiples archivos (HTML + JS + CSS + assets)
2. Sube el proyecto a un repositorio público en GitHub
3. Activa GitHub Pages en el repositorio
4. En Campus San Andrés, al enviar a moderación, carga la URL de GitHub Pages
5. El admin valida que la URL funciona y aprueba el juego
6. El juego queda disponible en la plataforma cargando la URL en el iframe

### Notas técnicas
- El campo github_url en la tabla games ya existe para esto
- El iframe necesita sandbox="allow-scripts allow-same-origin" para URLs externas
- Validar que la URL sea de github.io antes de aceptarla

### Valor pedagógico
Aprender Git, GitHub y deployment es una habilidad valiosa en sí misma y está alineado con el espíritu de SASS Vibe Coding.

---

## 6. Identidad Visual — Design Bible

> Esta sección es normativa. Todo componente debe cumplir estas especificaciones.

### 6.1 Nombre y Marca

- **Nombre principal:** Campus San Andrés
- **Subtítulo:** Vibe Coding San Andrés
- El nombre NUNCA se abrevia como "VibeCoding" en la interfaz pública
- El dominio `sass.vibecoding.ar` es técnico — en la UI aparece "Campus San Andrés"
- **Logo SASS:** `/public/images/logo-sass.png` — usado en navbar de landing page. Pendiente autorización formal del colegio para uso en producción.

### 6.2 Modo Claro — Light Mode (registro, login, páginas públicas)

Transmite seriedad institucional y confianza. Primera impresión para nuevos usuarios.

| Variable | Color | Uso |
|----------|-------|-----|
| Fondo principal | `#ffffff` | Fondo de página |
| Fondo cards | `#f8fafc` | Formularios y tarjetas |
| Color institucional SASS | `#00478E` | Títulos, links, elementos primarios |
| Acento violeta | `#7c3aed` | Botones de acción, CTAs |
| Texto principal | `#0f172a` | Cuerpo de texto |
| Texto secundario | `#64748b` | Labels, placeholders |
| Borde inputs | `#e2e8f0` | Bordes en reposo |

### 6.3 Modo Oscuro — Dark Mode (plataforma, juegos, campus 3D)

Estilo gaming tipo Discord + Fortnite. Donde los usuarios pasan la mayor parte del tiempo.

| Variable CSS | Color | Uso |
|-------------|-------|-----|
| `--vibe-bg` | `#0a0a0f` | Fondo de página — casi negro azulado |
| `--vibe-card` | `#13131a` | Fondo de tarjetas y paneles |
| `--vibe-border` | `#2a2a3a` | Bordes sutiles |
| `--vibe-accent` | `#7c3aed` | Acento principal — violeta vibrante |
| `--vibe-accent-secondary` | `#06b6d4` | Acento secundario — cyan neón |
| `--vibe-text` | `#f1f5f9` | Texto principal |
| `--vibe-text-muted` | `#94a3b8` | Labels, texto de apoyo |
| `--vibe-gradient-primary` | `#7c3aed → #06b6d4` | Botones CTA, barras de progreso |

### 6.4 Tipografía

- **Fuente principal:** Inter (Google Fonts)
- **Fallback:** Arial, sans-serif
- **H1:** 48-72px, weight 900, uppercase, letter-spacing tight
- **H2:** 28-36px, weight 700
- **H3:** 20-24px, weight 600
- **Cuerpo:** 16px, weight 400, line-height 1.6
- **Labels formulario:** 12-14px, weight 700, uppercase, letter-spacing wide
- **Scores/números:** weight 900, font-variant-numeric: tabular-nums

### 6.5 Clases CSS Reutilizables

| Clase | Uso |
|-------|-----|
| `.vibe-btn-gradient` | Botón principal violeta→cyan, hover brillante |
| `.vibe-btn-secondary` | Botón secundario con borde violeta |
| `.vibe-btn-danger` | Botón destructivo rojo `#ef4444` |
| `.vibe-input` | Input oscuro, glow violeta al foco |
| `.vibe-card` | Tarjeta `#13131a`, borde sutil, radius 1rem |
| `.vibe-badge-house` | Badge de colores según House |
| `.vibe-progress` | Barra de progreso con gradiente |
| `.vibe-scoreboard` | Tabla de líderes, top 3 con colores especiales |

### 6.6 Íconos y Assets

- **Librería:** Lucide React — no mezclar con otras librerías
- Sin fotos de alumnos ni padres en ningún lugar
- Logo del SASS: solo con permiso explícito del colegio

### 6.7 Animaciones

- Transiciones de página: fade 200ms ease-in-out
- Hover en botones: scale 1.02, brightness aumentado
- Hover en cards: scale 1.03, glow del color del House
- Loading: skeleton screens (no spinners)
- Notificaciones: slide desde esquina superior derecha, 3 segundos
- Respetar `prefers-reduced-motion`

### 6.8 Responsividad

- **Mobile-first:** diseñar para 390px (iPhone 14)
- **Breakpoints:** sm=640px, md=768px, lg=1024px, xl=1280px
- PWA: instalable en iOS y Android sin pasar por las tiendas

---

## 7. Principios Técnicos — Tech Bible

> Reglas de desarrollo no negociables. Cualquier excepción debe documentarse explícitamente.

### 7.1 Stack Tecnológico

| Componente | Tecnología | Restricciones |
|-----------|-----------|---------------|
| Frontend | Next.js 16 + Tailwind CSS | App Router, Server Components donde sea posible |
| Lenguaje | JavaScript (.js) | NO TypeScript en esta fase |
| Base de datos | Supabase (PostgreSQL) | Auth, RLS, Storage, Edge Functions, Realtime |
| Hosting | Vercel | Deploy automático en cada push a master |
| Pagos | MercadoPago API | Solo ARS, webhook para confirmar pagos |
| Control versiones | GitHub | Repo: tomgennari/vibecoding, rama master |
| IDE | Cursor Pro | USD 20/mes, Agent mode habilitado |
| 3D (Fase 4) | Three.js / Babylon.js | NO Unity — 3D nativo web, sin descarga |
| React Context API | CreateGameContext, UserContext | Estado global: modal "Crea tu juego" y perfil/stats del usuario |
| Game Lab — IA | Claude Sonnet 4.6 via Anthropic API | Streaming SSE, max 16K tokens, system prompt modular en `docs/andy/` |
| Game Lab — Frameworks | Canvas 2D, p5.js, Kaplay, Three.js (r128) | Librerías hosteadas en Supabase Storage (`libs/` bucket) |
| MobileBottomNav | Componente reutilizable | Barra de navegación inferior mobile, presente en todas las páginas excepto /jugar |
| Email transaccional | Resend | SMTP custom para Supabase Auth + Edge Functions. Dominio: `sass.vibecoding.ar`. Free tier: 3.000 emails/mes, 100/día |
| Landing Page | Server Component + Client Components | Light mode, Intersection Observer, YouTube embed |

### 7.2 Estructura de Base de Datos

> Referencia detallada de columnas en `docs/schema-notes.md`. Consultarlo siempre antes de escribir queries.

Tablas principales (todas con RLS habilitado):

| Tabla | Descripción | Columna de fecha principal |
|-------|-------------|---------------------------|
| `profiles` | Datos de usuario | `created_at` |
| `games` | Juegos publicados | `created_at`, `approved_at` |
| `game_sessions` | Sesiones de juego | `started_at` ⚠️ |
| `game_scores` | Puntuaciones | `played_at` ⚠️ |
| `game_likes` | Likes | `created_at` |
| `game_unlocks` | Desbloqueos | `unlocked_at` ⚠️ |
| `pack_purchases` | Compras de packs | `purchased_at` ⚠️ |
| `donations` | Donaciones directas | `donated_at` ⚠️ |
| `buildings` | Edificios (legacy, ya no se usa en admin) | — |
| `daily_free_games` | Juegos gratuitos del día | `active_date`, `scheduled_for` |
| `house_points` | Puntos por House | — |
| `andy_sessions` | Sesiones Game Lab (alumno + Andy): métricas, framework, cierre | `started_at` ⚠️ |
| `andy_messages` | Mensajes persistidos por sesión (roles user/assistant, costes) | `created_at` ⚠️ |

⚠️ = NO tiene `created_at`. Usar la columna indicada.

**RPCs de Supabase:**
- `get_total_raised()` → bigint — suma total recaudada sin doble conteo. `SECURITY DEFINER`.
- `get_authors(user_ids UUID[])` → tabla — nombres de autores respetando RLS. `SECURITY DEFINER`.

**Lógica de `daily_free_games`:**
- `scheduled_for`: fecha para la que está programado el juego (seteada por el admin o el cron)
- `active_date`: fecha en que el juego fue efectivamente activado (seteada por el cron a las 00:00)
- `auto_selected`: `true` si fue elegido automáticamente por el cron, `false` si fue elegido por el admin

### 7.3 Seguridad

- **RLS:** habilitado en TODAS las tablas sin excepción
- **Auth:** Supabase Auth — bcrypt para contraseñas, JWT con expiración, refresh tokens
- **Variables de entorno:** NUNCA en el código. `.env.local` en local, Vercel Env Vars en producción. `.env.local` en `.gitignore`
- **iframes:** `sandbox="allow-scripts allow-same-origin"` — allow-same-origin necesario para touch events en mobile
- **CSP:** Content Security Policy configurado en `next.config.js` para prevenir XSS
- **Webhooks MercadoPago:** verificar firma HMAC-SHA256 antes de procesar cualquier pago
- **Archivos subidos:** solo `.html`, máximo 500KB, revisión manual del admin obligatoria
- **Rate limiting:** Attack Protection de Supabase habilitado (5 intentos fallidos por IP)
- **HTTPS:** obligatorio — Vercel lo maneja automáticamente
- **Datos de menores:** mínimo dato personal posible. Cumplimiento con Ley 25.326 Argentina
- **Auditoría:** registrar todas las acciones del admin en Supabase (aprobaciones, rechazos, bajas)
- **Dependencies:** `npm audit` antes de cada deploy a producción
- **Indexación bloqueada:** `public/robots.txt` con `Disallow: /` + meta `noindex, nofollow` hasta aprobación del colegio
- **Contraseñas seguras:** validación frontend obligatoria (8-16 chars, mayúscula, minúscula, número)

### 7.4 Reglas de Limpieza y Orden

- **NUNCA** dejar columnas, tablas o índices sin usar en la base de datos
- **NUNCA** dejar archivos de código sin usar en el repositorio
- Cada cambio de estructura en la DB se documenta en la sección 11 (DB Changelog)
- Referencia de schema completa en `docs/schema-notes.md`
- Antes de agregar una columna nueva: verificar que no existe algo similar
- Cada componente React tiene un único propósito
- Máximo 300 líneas por archivo — si supera, dividir en componentes

### 7.5 Convenciones de Nomenclatura

| Contexto | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos y carpetas | kebab-case | `login-page.js`, `game-card.js` |
| Componentes React | PascalCase | `LoginForm`, `GameCard`, `HouseScoreboard` |
| Variables y funciones | camelCase | `userId`, `handleSubmit`, `fetchGameData` |
| Columnas de DB | snake_case | `user_id`, `created_at`, `game_title` |
| Variables CSS | `--vibe-` prefix | `--vibe-bg`, `--vibe-accent` |
| Clases CSS custom | `.vibe-` prefix | `.vibe-card`, `.vibe-btn-gradient` |
| Commits Git | Español, infinitivo | `agregar login`, `corregir bug en registro` |

### 7.6 Flujo de Deploy

1. Desarrollo local: `npm run dev` en `localhost:3000`
2. Código listo → `git add .` → `git commit -m "descripción"` → `git push`
3. Vercel detecta el push automáticamente y deploya en 1-2 minutos
4. Verificar en `sass.vibecoding.ar` antes de dar por cerrado el feature
5. **NO** hacer push de código roto — corregir localmente primero
6. Variables de entorno nuevas: agregar en Vercel **ANTES** del deploy que las requiere

### 7.7 Manejo de Errores

- Errores de Supabase: mostrar al usuario en español, de forma amigable
- Nunca mostrar stack traces ni IDs técnicos al usuario
- Errores de pago: redirigir a paso de reintento claro
- Juego que no carga: pantalla de error con botón "reportar problema"
- Logging en producción: Sentry (plan gratuito) — incorporar en Fase 2

### 7.8 Performance

- **Lighthouse objetivo:** 90+ en Performance, Accessibility y Best Practices
- **Core Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- Imágenes en WebP con `next/image`
- Juegos HTML5: límite 500KB por archivo
- Lazy loading en listas: cargar de a 12 con paginación
- Server Components para reducir JavaScript al cliente
- Campus 3D: cargar mundo base en menos de 5 segundos en 4G

### 7.9 Accesibilidad

- Todos los inputs con labels asociados correctamente
- Contraste mínimo WCAG 2.1 nivel AA en ambos modos
- Navegación completa por teclado en formularios
- Atributos `alt` en todas las imágenes
- Respetar `prefers-reduced-motion`
- Elementos táctiles mínimo 44x44px en mobile

### 7.10 Costos Operativos

| Servicio | Costo mensual | Notas |
|----------|--------------|-------|
| Cursor Pro | USD 20 | IDE con IA |
| Anthropic API (Claude) | Variable ~USD 5-20 | Game Lab — costo por uso, depende de actividad de alumnos |
| Supabase | Gratis / USD 25 | Free tier suficiente para MVP |
| Vercel | Gratis / USD 20 | Free tier suficiente para MVP |
| Dominio vibecoding.ar | ~ARS 5.000/año | NIC.ar — ya registrado |
| MercadoPago | ~3% por pago | Sin costo fijo |
| Resend | Gratis / USD 20 | Free tier: 3.000 emails/mes, 100/día — suficiente para MVP. Escalar antes del lanzamiento masivo |
| Figma | Gratis | Mockups y diseño |
| Sentry | Gratis | Logging de errores — pendiente |
| **TOTAL MVP** | **~USD 25-40/mes** | Cursor Pro + Anthropic API variable |

---

## 8. Roadmap de Desarrollo

### Fase 1 — MVP Funcional ✅ Completada

- [x] Registro y login (alumnos y padres), ambos eligen House
- [x] Modo claro para páginas de acceso, oscuro para plataforma
- [x] Juegos HTML5 cargados por el admin
- [x] Sistema de juegos gratuitos del día — programación manual y automática
- [x] Panel de admin con dashboard, rankings de Houses, gestión de juegos del día
- [x] API routes de admin protegidas por sesión y rol is_admin
- [x] Integración MercadoPago — precio fijo $6.000 por juego (packs y ALL ACCESS según catálogo)
- [x] Scoreboard básico
- [x] Deploy estable en sass.vibecoding.ar

### Fase 2 — Comunidad ✅ Completada

- [x] Panel para que alumnos suban juegos HTML5
- [x] Panel de moderación para el admin
- [x] Sistema de likes — con fix de sincronización via service role
- [x] Emails automáticos: aprobación de juegos al alumno, notificación al admin de juegos nuevos/actualizados
- [x] Email de bienvenida al registrarse
- [x] Email de rechazo al alumno con motivo y link a editar
- [x] Botón compartir por WhatsApp — en perfil y en email de aprobación
- [x] Sistema de packs de desbloqueo: Pack 10, Pack 30, ALL ACCESS
- [ ] Sentry para logging de errores

### Fase 2.5 — Generador de Juegos con IA ✅ Implementada

- [x] Integración con API de Anthropic (Claude) — Game Lab en `/game-lab`
- [x] Andy: asistente IA con personalidad, pedagogía y reglas de calidad modulares en `docs/andy/`
- [x] Multi-framework: Canvas 2D (preferido), p5.js, Kaplay (physics), Three.js r128 (3D)
- [x] Sistema de Créditos de Andy: tracking de costos, barra visual, bypass admin
- [x] Streaming visual, input por voz, auto-retry, pipeline de validación HTML
- [x] Flujo completo: generar → previsualizar → iterar → enviar a moderación
- 🔲 Pendiente: Persistencia robusta en Supabase (reemplazar sessionStorage)
- [x] Guardar interacciones alumno-Andy para análisis (`andy_sessions`, `andy_messages`, panel admin + análisis IA)
- 🔲 Pendiente: Videos tutoriales de cómo usar Game Lab y subir juegos

#### Estado actual de la Fase 2.5 (Mar 2026)

- ✅ Delta time obligatorio: quality-rules y templates de Canvas 2D, p5.js y Kaplay actualizados para movimiento frame-independent
- ✅ Frame cap ~60fps: `lib/game-frame-cap.js` inyecta throttle de requestAnimationFrame en todos los iframes (jugar, game-lab, admin preview, perfil) sin modificar el HTML guardado en Storage

### Fase 2.6 — Landing Page Pública ✅ Implementada

- [x] Landing page pública en sass.vibecoding.ar como home principal
- [x] 9 secciones scroll narrativo con animaciones fade-in
- [x] Mobile-first responsive, SEO, disclaimer modal
- [x] robots.txt bloqueando indexación hasta aprobación del colegio

### Fase 2.7 — Sistema de Edificios y Admin Completo ✅ Implementada

- [x] Sistema de edificios a desbloquear con milestones de recaudación progresivos ($200K → $150M)
- [x] Widget "Próximo Edificio a Desbloquear" en dashboard (desktop y mobile)
- [x] Edificios asociados a cada ranking de Houses con animación de colores del House líder
- [x] RPC `get_total_raised()` para cálculo correcto de recaudación sin doble conteo
- [x] Policy RLS `admin_read_pack_purchases` para que admin lea todas las compras
- [x] Panel admin reorganizado: Juegos (mejorado con editor HTML inline + descarga + resubida), Juegos del día, Usuarios (enriquecido con métricas por usuario), Engagement (nuevo), Finanzas (nuevo, reemplaza Edificios y Métricas)
- [x] Imágenes de edificios con variantes por House en `public/images/Buildings No Backgrounds/`

### Fase 3 — Gamificación (4-6 semanas)

- [x] Sistema de puntos individuales y por House
- [x] Leaderboards entre Houses (8 rankings con edificios asociados)
- [x] High scores por juego — Top 10 por juego con modal, guardado automático via postMessage
- [x] Script de detección y captura de puntajes HTML5
- [x] Donaciones directas de padres para edificios
- [ ] Soporte para juegos de Secundaria vía GitHub
- [ ] Insignias y logros

### Fase 4 — Campus 3D (3-6 meses)

- [ ] Campus virtual navegable en Three.js / Babylon.js
- [ ] Avatares simples con presencia en tiempo real
- [ ] Sistema de desbloqueo de edificios por House
- [ ] Scoreboards integrados en el mundo 3D
- [ ] Emojis como única interacción social
- [ ] Barco Symmetry — donaciones corporativas
- [ ] PWA — instalable en iOS y Android

---

## 9. Reglas de Negocio

### 9.1 Juegos Gratuitos del Día

- El admin puede seleccionar hasta 3 juegos gratuitos manualmente desde el panel, programándolos con `scheduled_for = mañana`
- Los juegos faltantes se completan automáticamente por el cron a las 00:00 hora Argentina (UTC-3)
- El cron activa los juegos programados seteando `active_date = hoy`
- Los juegos ya desbloqueados por compra permanecen desbloqueados para ese usuario
- No se puede programar el mismo juego dos veces para el mismo día (validado en API)
- Máximo 3 juegos programados por día (validado en API)

### 9.2 Precios

| Paquete | Precio | Activación |
|---------|--------|-----------|
| Juego individual | $6.000 ARS | Desde el día 1 |
| Pack 10 juegos | $40.000 ARS | Desde el día 1 |
| Pack 30 juegos | $100.000 ARS | Cuando haya 50+ juegos |
| ALL ACCESS | $300.000 ARS | Cuando haya 100+ juegos |
| Juego individual - Desbloqueo para todos los usuarios | $50.000 ARS | Desde el día 1 |

Los precios se revisan trimestralmente según inflación. Fuente única: `lib/pricing.js`.

**Reglas de packs:**
- Los packs otorgan créditos de desbloqueo en `profiles.unlock_credits` que se gastan uno a uno al elegir juegos
- ALL ACCESS otorga acceso permanente a todos los juegos actuales y futuros (`profiles.has_all_access = true`)
- Los créditos se acumulan sin límite: un usuario puede comprar múltiples packs
- Un usuario con ALL ACCESS no necesita créditos — tiene acceso directo
- La verificación de acceso sigue este orden: `has_all_access` → `game_unlocks` → `unlocked_for_all` → juego gratuito del día
- Los umbrales de activación (50+ y 100+ juegos) se validan dinámicamente al crear la preference de MercadoPago
- El `external_reference` de MercadoPago codifica el tipo: `unlock_userId_gameId` (individual), `pack10_userId_gameId` (pack con juego origen), `pack10_userId` (pack sin juego origen), `allaccess_userId_gameId`, `allaccess_userId`. El gameId es opcional en packs — si está presente, el webhook auto-desbloquea ese juego.

### 9.3 Puntos por House

| Acción | Puntos House |
|--------|-------------|
| Publicar un juego aprobado | +500 |
| Like recibido en juego del House | +10 |
| Hora jugada en juego del House | +50 |
| $1.000 ARS gastados en juegos del House | +100 |
| High score en juego del House | +200 bonus |

Los valores son configurables por el admin.

---

## 10. Decisiones Pendientes

- [ ] Presentación formal al colegio — Pitch Deck a preparar cuando llegue el momento
- [ ] Confirmar cuenta bancaria definitiva del colegio
- [ ] Validar mecanismo de donaciones corporativas para el Barco Symmetry
- [ ] Definir si el logo de SASS puede usarse en la plataforma (pedir permiso)
- [ ] Evaluar si alumnos de Kinder necesitan flow de registro asistido por padres
- [ ] Definir proceso para que alumnos de Secundaria compartan repos de GitHub
- [ ] **PENDIENTE COLEGIO — Whitelist de emails:** consultar al SASS si prefieren que solo emails previamente validados puedan registrarse
- [ ] **PENDIENTE COLEGIO — Registro de emails:** verificar si el SASS tiene un registro de emails de sus ~1.900 alumnos
- [ ] SEGURIDAD — Regenerar service role key antes de producción
- [ ] **LANDING — Fotos institucionales:** conseguir fotos profesionales del campus
- [ ] **LANDING — Aprobación del colegio:** remover robots.txt Disallow, quitar meta noindex, quitar DisclaimerModal
- [ ] Sentry para logging de errores
- [ ] Persistencia robusta en Game Lab (reemplazar sessionStorage por Supabase)
- [ ] Métrica `total_time_played` en tabla games (actualmente se calcula al vuelo)
- [x] Guardar interacciones alumno-Andy para análisis y mejora — ver `andy_sessions` / `andy_messages` y pestaña Andy en admin
- [ ] Videos tutoriales de cómo usar Game Lab y subir juegos

---

## 11. DB Changelog

> Registrar aquí todos los cambios de estructura en la base de datos.
> Referencia completa del schema: `docs/schema-notes.md`

| Fecha | Cambio | Motivo |
|-------|--------|--------|
| Feb 2026 | Creación tabla `profiles` | Setup inicial |
| Feb 2026 | Eliminación columnas `nombre`, `apellido`, `tipo` | Duplicadas con `first_name`, `last_name`, `user_type` |
| Feb 2026 | Eliminación constraint `profiles_house_check` | Conflicto con valores del formulario |
| Mar 2026 | Agregado columna `scheduled_for` (date, nullable) a `daily_free_games` | Permitir programar juegos para días futuros |
| Mar 2026 | Agregado columna `auto_selected` (bool, default false) a `daily_free_games` | Distinguir selección manual del admin vs automática del cron |
| Mar 2026 | Agregado columnas `tokens_used` (DECIMAL, default 0) y `tokens_limit` (DECIMAL, default 1.00) a `profiles` | Sistema de Créditos de Andy para el Game Lab |
| Mar 2026 | Agregado columnas `unlocked_for_all` (bool), `unlocked_for_all_by` (uuid), `unlocked_for_all_at` (timestamptz) a `games` | Desbloquear juego para todos los usuarios |
| Mar 2026 | Agregado columna `show_author` (bool, default true) a `games` | Opción de privacidad para autores |
| Mar 2026 | Creada función RPC `get_authors(user_ids UUID[])` con SECURITY DEFINER | Cargar nombres de autores respetando RLS restrictivo de profiles |
| Mar 2026 | Agregado columnas `unlock_credits` (integer, default 0), `has_all_access` (boolean, default false), `all_access_at` (timestamptz, null) a `profiles` | Sistema de packs de desbloqueo de juegos |
| Mar 2026 | Creada tabla `pack_purchases` (id, user_id, pack_type, credits_granted, amount_paid, payment_id, purchased_at) con RLS | Historial de compras de packs individuales y grupales |
| Mar 2026 | Creada función RPC `get_total_raised()` con SECURITY DEFINER | Suma total recaudada sin doble conteo, bypasea RLS |
| Mar 2026 | Creada policy `admin_read_pack_purchases` en `pack_purchases` | Admin puede leer todas las compras para panel Finanzas |

---

*Documento vivo — actualizar con cada decisión importante del proyecto.*  
*Sic itur ad astra — St. Andrew's Scots School, 1838*
