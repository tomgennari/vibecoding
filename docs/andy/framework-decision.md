# Andy — Decisión de Framework

## CONTEXTO

Andy tiene 3 frameworks disponibles para generar juegos. La elección es INTERNA — el alumno nunca ve ni elige el framework. Andy decide según la naturaleza del juego.

---

## FRAMEWORKS DISPONIBLES

### 1. Canvas 2D Puro (vanilla JS)
**CDN:** Ninguno (API nativa del browser)
**Ideal para:**
- Juegos simples: snake, breakout, pong, asteroids, quiz, memory
- Juegos tipo puzzle o tablero: 2048, minesweeper, match-3
- Juegos de texto/narrativos con elementos visuales
- Juegos educativos: trivia, math games, word games
- Juegos donde la lógica es más importante que la física
- Juegos muy livianos que necesitan cargar rápido

**Ventajas:** Menor tamaño de código, sin dependencia de CDN, el LLM lo conoce perfecto, máxima compatibilidad
**Cuándo NO usarlo:** Juegos que necesitan física realista, colisiones complejas, o muchas entidades moviéndose simultáneamente

### 2. p5.js
**URL:** `https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/p5.min.js`
**Ideal para:**
- Juegos artísticos o visualmente creativos
- Juegos con partículas, efectos visuales, generación procedural
- Canvas de pintura / pixel art / herramientas creativas
- Juegos educativos con visualizaciones (fractales, geometría, física visual)
- Juegos que mezclan arte generativo con interacción
- Simulaciones (boids, game of life, autómatas celulares)

**Ventajas:** API muy intuitiva para dibujar, excelente para arte y visuales, muy bien documentado, el LLM lo conoce muy bien
**Cuándo NO usarlo:** Juegos de plataformas con colisiones, shooters con muchas entidades, juegos que necesitan física de cuerpos rígidos

### 3. Kaplay (ex-Kaboom.js)
**URL:** `https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/kaplay.js`
**Ideal para:**
- Plataformers (Mario, Celeste, Megaman style)
- Shooters (top-down, lateral, espacial)
- Juegos con física y colisiones complejas
- Juegos con muchas entidades en pantalla
- Tower defense, beat'em ups, juegos de acción
- Cualquier juego que necesite: gravedad, cuerpos físicos, colisiones, o componentes ECS

**Ventajas:** API expresiva y corta (un platformer en 80 líneas), física incorporada, sistema de componentes, ASCII maps para niveles, ideal para acción
**Cuándo NO usarlo:** Juegos puramente de tablero/puzzle sin física, herramientas creativas, juegos de texto

---

## REGLAS DE DECISIÓN

Andy sigue esta lógica en orden:

1. **¿El juego necesita física, gravedad, o colisiones complejas?**
   - SÍ → **Kaplay**
   - NO → seguir a 2

2. **¿El juego es artístico, visual, creativo, o una herramienta de dibujo?**
   - SÍ → **p5.js**
   - NO → seguir a 3

3. **¿El juego es simple, basado en lógica, tablero, quiz, o texto?**
   - SÍ → **Canvas 2D**
   - NO → seguir a 4

4. **En caso de duda:**
   - Si tiene plataformas o disparos → **Kaplay**
   - Si tiene efectos visuales llamativos → **p5.js**
   - Para todo lo demás → **Canvas 2D**

---

## EJEMPLOS DE DECISIÓN

| Juego | Framework | Por qué |
|---|---|---|
| Snake | Canvas 2D | Lógica de grilla, sin física |
| Tetris | Canvas 2D | Piezas en grilla, sin colisiones |
| Quiz de historia | Canvas 2D | Texto y botones, sin gráficos complejos |
| 2048 | Canvas 2D | Lógica pura con animaciones simples |
| Memory / Memotest | Canvas 2D | Cartas que se dan vuelta, sin física |
| Breakout / Arkanoid | Canvas 2D | Pelota con rebotes simples, sin gravedad |
| Plataformer de zombies | Kaplay | Necesita gravedad, plataformas, colisiones |
| Space shooter | Kaplay | Muchas entidades, disparos, colisiones |
| Tower defense | Kaplay | Entidades con paths, colisiones, oleadas |
| Beat'em up | Kaplay | Física, knockback, hitboxes |
| Flappy bird | Kaplay | Gravedad, colisiones con tubos |
| Canvas de pintura | p5.js | Herramienta creativa, dibujo libre |
| Simulación de partículas | p5.js | Efectos visuales, arte generativo |
| Juego de ritmo visual | p5.js | Sincronización visual con efectos |
| Generador de fractales | p5.js | Matemáticas visuales |
| Pixel art editor | p5.js | Herramienta de dibujo pixel a pixel |

---

## IMPORTANTE

- Andy NUNCA menciona el framework al alumno ni le pregunta cuál prefiere
- Andy NUNCA usa Phaser.js (descartado del stack)
- Andy NUNCA usa Excalibur.js (requiere TypeScript y bundler, incompatible con single-HTML)
- Andy NUNCA usa CDNs externos (unpkg, jsdelivr, cdnjs, etc.) — solo las URLs de Supabase listadas abajo
- Si Andy elige Kaplay, usa la versión global (no módulos ES): `<script src="https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/kaplay.js"></script>`
- Si Andy elige p5.js: `<script src="https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/p5.min.js"></script>`
- Si Andy elige Canvas 2D: no necesita ningún `<script>` externo

### ¿Por qué hosteamos las librerías en Supabase?
Las librerías están alojadas en nuestro propio bucket de Supabase (`libs/`) para evitar dependencia de CDNs externos que pueden caerse, estar lentos desde Argentina, o cambiar versiones sin aviso. Esto garantiza que los juegos siempre carguen rápido y sin problemas.
