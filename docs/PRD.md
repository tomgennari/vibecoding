# Campus San Andrés — Vibe Coding San Andrés
## Product Requirements Document (PRD) v3.5

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

Los usuarios desbloquean juegos mediante pagos en pesos argentinos vía MercadoPago. Los padres además pueden realizar donaciones directas para edificios. Todo el dinero va íntegramente a la construcción del campus. La competencia se organiza alrededor del sistema de Houses del colegio.

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

### 2.2 Los Edificios a Construir

- Natatorio
- Community Hub (en construcción actualmente)
- Colegio Secundario unificado
- Dining Hall – Gimnasio – Auditorio
- Performing Arts Center
- Sports Pavilion
- El Barco Symmetry (elemento histórico — los fundadores escoceses llegaron en este barco)

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
- **PUEDEN:** ver los resultados y el progreso de las donaciones
- **PUEDEN:** enviar emojis a otros usuarios dentro del campus 3D (Fase 4)
- **NO PUEDEN:** realizar donaciones directas
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
- Gestión completa de usuarios: alta, baja, modificación, bloqueo
- Acceso a todas las métricas y reportes de recaudación
- Configura los 2-3 juegos gratuitos del día (manualmente o automático)
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

### 4.2 Sistema de Juegos

**Acceso:**
- 2-3 juegos gratuitos por día para todos los usuarios
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
| Juego individual | $5.000 ARS | Desde el día 1 |
| Pack 10 juegos | $30.000 ARS | Desde el día 1 |
| Pack 50 juegos | $100.000 ARS | Cuando haya 50+ juegos |
| ALL ACCESS | $250.000 ARS | Cuando haya 100+ juegos |

**Donaciones directas (solo padres):**
- Monto libre elegido por el padre
- Se asignan al edificio que el padre elija
- Los alumnos NO pueden donar — solo compartir por WhatsApp para pedir a sus padres
- Todo el dinero (compras + donaciones) va al mismo fondo de construcción

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

### 4.5 Scoreboards y Rankings

- Top juegos por tiempo jugado total
- Top juegos por likes
- Top juegos por dinero recaudado
- Top juegos por puntuación máxima
- Juegos más nuevos
- Top jugadores individuales
- Ranking de Houses (suma ponderada de todas las métricas)
- Progreso de construcción por edificio (barra de avance visible para todos)

### 4.6 Panel de Administración ✅ Implementado

El panel de admin está construido en Next.js en `/app/admin` con las siguientes secciones operativas:

**Juegos del día (`AdminDailyGamesSection`):**
- Vista de juegos activos hoy
- Vista de juegos programados para mañana (con botón Quitar)
- Tabla de todos los juegos aprobados con métricas: jugadores únicos, likes, recaudado, última vez usado como gratis
- Filtros: Todos / No usados / Ya usados como gratis
- Ordenamiento por cualquier columna
- Paginación
- Botón "Programar para mañana" — inserta con `scheduled_for = mañana` y `active_date = null`
- Límite de 3 juegos programados por día (validado en frontend y API)
- Fallback automático: los juegos faltantes se seleccionan automáticamente a las 00:00

**API routes de admin:**
- `POST /api/admin/daily-games` — programa un juego para mañana
- `DELETE /api/admin/daily-games?gameId=` — quita un juego programado
- Ambas rutas verifican sesión activa y rol `is_admin` antes de operar

**Moderación de juegos — ✅ Implementado:**
- Modal `GamePreviewModal` al hacer click en "Ver" en cualquier juego de la tabla
- El modal carga el HTML del juego via `fetch` y lo renderiza en `<iframe srcdoc>` (evita problema de Content-Type de Supabase Storage que mostraba el código como texto plano)
- Toggle "Ver código / Ver juego" para inspeccionar el HTML fuente antes de aprobar
- Si el juego está pendiente, botones Aprobar y Rechazar disponibles dentro del modal
- **Notificación al admin:** Edge Function `notify-new-game` + Database Webhook en Supabase. Cuando se inserta un juego con `status = 'pending'`, se envía un email automático al admin via Resend con título, descripción, house y link directo al panel de admin
- **Problema de encoding conocido:** juegos generados en Safari/Mac pueden tener caracteres especiales corruptos (ej: `PresionÃ¡` en vez de `Presioná`). Andy tiene regla en `quality-rules.md` para usar unicode escapado (`\u00E1` etc.) y evitarlo. Si un juego llega corrupto, rechazarlo para que el alumno lo regenere.

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

### 5.3 Sistema de Desbloqueo de Edificios por House

| Edificio | Cómo se desbloquea | Notas |
|----------|-------------------|-------|
| Kinder (existente) | Publicar juegos aprobados | Alumnos que publican juegos |
| Primaria | Tiempo jugado | Horas acumuladas del House |
| Secundaria | Donaciones directas de padres | Dinero donado sin comprar juegos |
| Community Hub | Compra de juegos | Dinero gastado en desbloquear juegos del House |
| Sports Pavilion | Likes en juegos del House | Juegos del House con alto rating |
| Barco Symmetry | Donaciones corporativas | Empresas de padres — mecanismo a definir |

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
| Game Lab — Frameworks | Canvas 2D, p5.js, Kaplay | Librerías hosteadas en Supabase Storage (`libs/` bucket) |
| MobileBottomNav | Componente reutilizable | Barra de navegación inferior mobile, presente en todas las páginas excepto /jugar |
| Email transaccional | Resend | SMTP custom para Supabase Auth + Edge Functions. Dominio: `sass.vibecoding.ar`. Free tier: 3.000 emails/mes, 100/día |

### 7.2 Estructura de Base de Datos

Tablas principales (todas con RLS habilitado):

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `profiles` | Datos de usuario | id, first_name, last_name, email, user_type, house, tokens_used, tokens_limit, is_admin, is_blocked, created_at |
| `games` | Juegos publicados | id, title, description, house, file_url, github_url, status, submitted_by, approved_at, show_author, unlocked_for_all, unlocked_for_all_by, unlocked_for_all_at, total_likes, total_revenue, total_plays |
| `game_sessions` | Sesiones de juego | id, user_id, game_id, started_at, ended_at, duration_seconds |
| `game_scores` | Puntuaciones | id, user_id, game_id, score, played_at |
| `game_likes` | Likes | id, user_id, game_id, created_at |
| `game_unlocks` | Desbloqueos | id, user_id, game_id, amount_paid, payment_id, unlocked_at |
| `donations` | Donaciones directas | id, user_id, building_id, amount, payment_id, donated_at |
| `buildings` | Edificios | id, name, target_amount, current_amount, unlock_type |
| `daily_free_games` | Juegos gratuitos del día | id, game_id, active_date (date\|null), scheduled_for (date\|null), auto_selected (bool) |
| `house_points` | Puntos por House | house, total_points, points_by_games, points_by_time, points_by_donations |

**Lógica de `daily_free_games`:**
- `scheduled_for`: fecha para la que está programado el juego (seteada por el admin o el cron)
- `active_date`: fecha en que el juego fue efectivamente activado (seteada por el cron a las 00:00)
- `auto_selected`: `true` si fue elegido automáticamente por el cron, `false` si fue elegido por el admin
- Al insertar manualmente: `active_date = null`, `scheduled_for = mañana`, `auto_selected = false`
- El cron de las 00:00 setea `active_date` en los registros con `scheduled_for = hoy`

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

### 7.4 Reglas de Limpieza y Orden

- **NUNCA** dejar columnas, tablas o índices sin usar en la base de datos
- **NUNCA** dejar archivos de código sin usar en el repositorio
- Cada cambio de estructura en la DB se documenta en `/docs/db-changelog.md`
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
| Sentry | Gratis | Logging de errores — Fase 2 |
| **TOTAL MVP** | **~USD 25-40/mes** | Cursor Pro + Anthropic API variable |

---

## 8. Roadmap de Desarrollo

### Fase 1 — MVP Funcional ← EN CURSO

- [x] Registro y login (alumnos y padres), ambos eligen House
- [x] Modo claro para páginas de acceso, oscuro para plataforma
- [x] Juegos HTML5 cargados por el admin
- [x] Sistema de juegos gratuitos del día — programación manual y automática
- [x] Panel de admin con dashboard, rankings de Houses, gestión de juegos del día
- [x] API routes de admin protegidas por sesión y rol is_admin
- [ ] Integración MercadoPago — precio fijo $5.000 por juego
- [ ] Scoreboard básico
- [ ] Deploy estable en sass.vibecoding.ar

### Fase 2 — Comunidad (4-6 semanas)

- [x] Panel para que alumnos suban juegos HTML5
- [x] Panel de moderación para el admin
- [x] Sistema de likes — con fix de sincronización via service role
- [x] Emails automáticos: aprobación de juegos al alumno (Resend), notificación al admin de juegos nuevos y actualizados
- [x] Botón compartir por WhatsApp — en perfil y en email de aprobación
- [ ] Dashboard de recaudación por edificio con barras de progreso
- [ ] Activación de paquetes de juegos
- [ ] Sentry para logging de errores
- [ ] Emails automáticos: bienvenida, rechazo

### Fase 2.5 — Generador de Juegos con IA (2-3 semanas)

- [ ] Integración con API de Anthropic (Claude) dentro de la plataforma
- Espacio dedicado llamado "SASS Vibe Coding — Game Lab"
- URL: /game-lab
- Accesible desde el modal "Crea tu juego" existente
- Es el espacio principal donde los alumnos describen y generan sus juegos con IA
- [ ] El usuario describe el juego en lenguaje natural y Claude genera el HTML5 completo
- [x] Sistema de límite de tokens por usuario (columnas `tokens_used` y `tokens_limit` en profiles) — ✅ Implementado como "Créditos de Andy"
- Límite de créditos por usuario: USD 1.00
- Acceso al Game Lab:
  - Alumnos: reciben USD 1.00 en créditos gratis al registrarse (default de la columna)
  - Padres: no reciben créditos gratis
  - Todos: reciben USD 1.00 en créditos adicionales por cada juego que compran/desbloquean
  - Administradores: acceso ilimitado sin consumo de créditos (bypass en backend)
- Tracking de costos: el backend captura `input_tokens` y `output_tokens` del stream de Anthropic, calcula el costo (Sonnet 4.6: $3/M input + $15/M output), y actualiza `tokens_used` en la DB
- El costo real por juego varía según complejidad: ~$0.03-0.05 para juegos simples, ~$0.15-0.50 para juegos complejos con auto-retry y auto-fix
- Barra visual de créditos: visible en header del Game Lab y en la página de perfil
- Tooltip explicativo (ícono i) que explica qué son los créditos y cómo recargar
- Cuando los créditos se agotan: Andy muestra mensaje amigable invitando a desbloquear juegos del catálogo
- Columnas en tabla `profiles`: `tokens_used` (DECIMAL, default 0) y `tokens_limit` (DECIMAL, default 1.00) — ambas en USD
- El panel de admin permite ver consumo por usuario y ajustar límites individualmente
- [ ] El juego generado va directo al flujo de moderación existente
- [ ] Panel de admin para ver consumo de tokens y ajustar límites
- [ ] Costo operativo: ~$0.01-0.05 USD por juego generado, sin suscripción mensual
- [ ] Diferencial clave para el pitch: democratiza la creación para familias sin conocimientos técnicos
- Interfaz del generador: modal existente "Crea tu juego" con opción "Generar con IA"
- Layout desktop: chat a la izquierda, iframe con previsualización del juego en vivo a la derecha
- Layout mobile: chat con fullscreen overlay para juegos. Cuando Andy genera un juego, se abre automáticamente en pantalla completa con botón "Salir del juego". Botones de acción unificados debajo del input: "Jugá tu juego", "Enviar a moderación", "Crear otro juego".
- El iframe usa sandbox="allow-scripts allow-same-origin" para permitir touch events en mobile
- Botón "Enviar a moderación" prominente cuando el alumno está conforme
- Barra de progreso o indicador de tokens restantes visible en todo momento
- Entrada por voz: botón de micrófono en la caja de texto usando Web Speech API nativa del navegador (sin servicios externos, sin costo adicional)
  - Compatible con Chrome y Edge principalmente
  - El alumno habla → el texto aparece en el input → se envía como texto normal a Claude
  - Requiere permiso de micrófono del navegador
  - Ideal para alumnos de primaria que no escriben rápido
- El historial de la conversación se mantiene durante la sesión para permitir ajustes iterativos ("cambiá el color", "agregá más enemigos")
- El juego y la conversación se persisten en sessionStorage del browser. Sobreviven refresh pero se limpian al cerrar la pestaña. El alumno puede iniciar un juego nuevo con el botón "Crear otro juego".
- Claude responde siempre con dos partes: (1) el HTML completo del juego, (2) una explicación en español amigable para niños de qué hizo y sugerencias de próximos pasos ("¿querés que agregue música? ¿más niveles? ¿un personaje diferente?")
- Claude hace preguntas antes de generar cuando el prompt es ambiguo, igual que haría un desarrollador: género, personaje principal, objetivo del juego, etc.
- Canvas fijo 480x640 (portrait) por default, 640x480 (landscape) si Andy decide internamente que el juego lo amerita. Andy NUNCA pregunta al alumno si es para celular o computadora — el iframe del Game Lab se encarga del escalado.
- Moderación en el system prompt — línea clara entre contenido permitido y prohibido:
  - PERMITIDO: disparos, explosiones, espadas, peleas, zombies, monstruos, sangre leve — contenido normal de videojuegos apto para todas las edades
  - PROHIBIDO: gore explícito (sangre excesiva, desmembramiento), desnudez o contenido sexual de cualquier tipo, insultos o lenguaje inapropiado, violencia contra personas reales identificables, temáticas religiosas o políticas controversiales
  - Criterio general: si el juego podría aparecer en una App Store con rating 9+ o E10+, está permitido
  - En caso de solicitud inapropiada: Claude explica amablemente y sugiere una alternativa divertida
- Idioma del Game Lab: español únicamente
  - Claude responde siempre en español, independientemente del idioma en que escriba el alumno
  - Los comentarios dentro del código HTML generado también van en español
  - Los mensajes de error, sugerencias y preguntas: siempre en español
  - Variante: español argentino — usar "vos", "che", tono cercano y entusiasta, vocabulario familiar para chicos argentinos
- El asistente de IA del Game Lab se llama "Andy"
  - Nombre inspirado en St. Andrew's Scots School
  - Se presenta como: "¡Hola! Soy Andy, tu asistente del Game Lab 🎮"
  - Personalidad: entusiasta, paciente, alentador, usa español argentino
  - Tono: como un amigo mayor que sabe mucho de juegos y quiere ayudarte
  - Andy nunca se identifica como Claude ni como una IA de Anthropic
  - Andy hace preguntas simples y divertidas para entender qué juego quiere crear el alumno antes de generarlo
  - Andy tiene un avatar: gaitero escocés con colores del SASS
  - Archivo: /public/images/andy-avatar.png
  - El avatar aparece al lado de cada mensaje de Andy en el chat del Game Lab

**Estado actual de la Fase 2.5 (Mar 2026):**

- ✅ Arquitectura modular de Andy: 7 archivos de docs en `docs/andy/` (personality, pedagogy, framework-decision, quality-rules, templates x3)
- ✅ Backend dinámico: `loadAndyDocs()` + `buildSystemPrompt()` en `app/api/game-lab/chat/route.js`
- ✅ Multi-framework: Andy elige internamente entre Canvas 2D, p5.js y Kaplay según el tipo de juego
- ✅ Librerías hosteadas en Supabase Storage (bucket `libs/`): p5.min.js, kaplay.js, gamepad-overlay.js
- ✅ Assets visuales: emojis + formas geométricas procedurales (Kenney descartado)
- ✅ Flujo pedagógico: Andy guía al alumno a dar instrucciones detalladas antes de generar
- ✅ Preservación de juegos al iterar: contexto reducido + HTML actual para evitar regeneración
- ✅ Persistencia de sesión: sessionStorage para juego y chat (sobrevive refresh)
- ✅ Mobile: fullscreen overlay para juegos + botones unificados (Jugá tu juego, Enviar a moderación, Crear otro juego)
- ✅ Mobile: gamepad-overlay.js con layouts configurables (dpad-1btn, dpad-2btn, dpad-only, lr-only, none)
- ✅ Google Fonts para tipografías en juegos
- ✅ HUD estandarizado: zona reservada de 50px superiores
- ✅ Mensajes iniciales rotativos de Andy (5 variantes)
- ✅ Placeholder dinámico del input según estado
- ✅ Pipeline de validación HTML: verifica estructura, sintaxis JS con `new Function()`, y auto-fix enviando errores a Andy
- ✅ Auto-retry automático cuando HTML se trunca: reintenta con versión compacta sin intervención del alumno
- ✅ Optimización de tokens: en modificaciones se manda solo personality + qualityRules + template del framework usado (~50% menos tokens)
- ✅ Streaming visual: texto de Andy aparece en tiempo real mientras genera, con contador de líneas de código
- ✅ Barra de progreso y timer visible mientras Andy genera juegos
- ✅ Input por voz: Web Speech API nativa (es-AR), con interim results en PC y sin interim en mobile
- ✅ ReactMarkdown para parsear mensajes de Andy (negritas, listas, etc.)
- ✅ Ctrl+Enter envía mensaje en PC, Enter agrega nueva línea
- ✅ Tap/click para iniciar y reiniciar juegos obligatorio en todos los frameworks
- ✅ Emojis solo cuando quedan bien, formas procedurales para protagonistas y entidades dinámicas
- ✅ Bottom nav oculto durante fullscreen del juego en mobile
- ✅ Limpieza completa de Supabase: bucket kenney y RPC list_kenney_objects() eliminados
- ✅ Créditos de Andy: sistema completo de tracking de costos, barra visual en Game Lab y perfil, tooltip explicativo, bypass para admins
- ✅ Links a Términos y Condiciones y Política de Privacidad en página de perfil
- ✅ Regla de caracteres especiales en `quality-rules.md`: Andy usa unicode escapado (`\u00E1`, `\u00A1`, etc.) para evitar corrupción de encoding en Safari/Mac
- ✅ Panel admin: modal de previsualización de juegos con iframe `srcdoc` + toggle ver juego / ver código
- ✅ Notificación por email al admin cuando hay juegos pendientes (Edge Function `notify-new-game` + Database Webhook + Resend)
- ✅ Flujo post-moderación en Game Lab: al enviar a moderación, se limpia la sesión y se redirige al perfil con link a "Mis juegos subidos"
- ✅ Perfil — jugar propio juego desde "Mis juegos subidos" con fullscreen overlay
- ✅ Perfil — editar juego: carga el HTML en el Game Lab para que Andy lo modifique
- ✅ Re-envío a moderación: actualiza el mismo juego en vez de crear duplicado. Título bloqueado al re-enviar.
- ✅ Desbloquear juego para todos ($50,000 ARS via MercadoPago): columnas `unlocked_for_all`, `unlocked_for_all_by`, `unlocked_for_all_at` en `games`
- ✅ Compartir juego vía WhatsApp desde perfil (solo juegos aprobados)
- ✅ Email de aprobación al alumno via Resend: link a perfil, compartir por WhatsApp, invitación a desbloquear para todos
- ✅ Notificación email al admin cuando un juego se re-envía a moderación (actualización)
- ✅ Créditos de Andy por compra: +$1.00 USD al comprar/desbloquear cualquier juego (individual o para todos)
- ✅ Pantalla de desbloqueo cuando usuario accede a juego bloqueado via URL directa (ej: link de WhatsApp)
- ✅ Verificación `unlocked_for_all` en API de acceso a juegos
- ✅ Highscores por juego: Top 10 con modal, guardado automático via postMessage GAME_SCORE
- ✅ Fullscreen en PC: botón "Expandir" usando Fullscreen API del browser
- ✅ Rediseño layout de /jugar/[id]: header mínimo, barra de acciones abajo (Me gusta, Top 10, Compartir)
- ✅ Fix likes: service role para actualizar total_likes, sincronización con count real de game_likes
- ✅ Opción show_author: alumno elige si mostrar su nombre al publicar. Toggle en Game Lab, subida HTML y perfil.
- ✅ Tarjetas de juegos rediseñadas: nombre del autor, métricas inline (jugadores, likes, recaudado, min jugados), título y descripción con line-clamp, expansión hover/tap
- ✅ RPC `get_authors()` en Supabase para cargar autores respetando RLS restrictivo de profiles
- ✅ Tarjeta "Crea tu juego" en carrusel de Juegos del día (desktop y mobile)
- ✅ Bottom nav: botón Juegos lleva a /juegos, botón Ver todos en mobile para desbloquear
- ✅ Pestaña "Mis juegos subidos" visible para alumnos, admins y padres que crearon juegos
- ✅ Iframe de juegos carga via srcdoc en vez de src URL (fix Content-Type text/plain en mobile)
- ✅ Three.js hosteado en Supabase Storage (bucket libs/) para juegos 3D
- ✅ Controles touch nativos en quality-rules: swipe, tap, drag según tipo de juego
- ✅ Moderación con IA: botón "Analizar con IA" en panel admin, verifica contenido apropiado y score reporting
- ✅ Fix automático de score reporting: al aprobar un juego sin postMessage, la IA lo agrega al HTML
- ✅ Email de rechazo al alumno con motivo y link a editar
- ❌ Descartado: Phaser.js (juegos se truncaban, código demasiado largo)
- ❌ Descartado: Excalibur.js (requiere TypeScript y bundler)
- ❌ Descartado: Assets de Kenney (Andy no los usaba, consumían tokens innecesarios)
- 🔲 Pendiente: Persistencia robusta en Supabase (reemplazar sessionStorage)
- 🔲 Pendiente: Métrica total_time_played en tabla games (actualmente se calcula al vuelo desde game_sessions)

### Fase 3 — Gamificación (4-6 semanas)

- [ ] Sistema de puntos individuales y por House
- [ ] Leaderboards entre Houses
- [x] High scores por juego — Top 10 por juego con modal, guardado automático via postMessage
- [x] Script de detección y captura de puntajes HTML5 — game_scores se inserta al recibir GAME_SCORE postMessage
- [ ] Soporte para juegos de Secundaria vía GitHub
- [ ] Insignias y logros
- [ ] Donaciones directas de padres para edificios

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

| Producto | Precio | Condición de activación |
|----------|--------|------------------------|
| Juego individual | $5.000 ARS | Desde el día 1 |
| Pack 10 juegos | $30.000 ARS | Desde el día 1 |
| Pack 50 juegos | $100.000 ARS | Cuando haya 50+ juegos disponibles |
| ALL ACCESS | $250.000 ARS | Cuando haya 100+ juegos disponibles |

Los precios se revisan trimestralmente según inflación.

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
- [ ] **PENDIENTE COLEGIO — Whitelist de emails:** consultar al SASS si prefieren que solo emails previamente validados puedan registrarse. Requeriría que el colegio provea una lista actualizada de emails de alumnos y familias.
- [ ] **PENDIENTE COLEGIO — Registro de emails:** verificar si el SASS tiene un registro de emails de sus ~1.900 alumnos. Si no lo tienen, el registro abierto es la única opción viable para el MVP.
- [ ] SEGURIDAD — Regenerar service role key antes de producción: la service role key actual fue compartida durante el desarrollo. Antes del lanzamiento oficial con el colegio, regenerarla en Supabase → Settings → API → Legacy keys → service_role → Regenerate. Luego actualizar la variable de entorno en Vercel.

---

## 11. DB Changelog

> Registrar aquí todos los cambios de estructura en la base de datos.

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

---

*Documento vivo — actualizar con cada decisión importante del proyecto.*  
*Sic itur ad astra — St. Andrew's Scots School, 1838*
