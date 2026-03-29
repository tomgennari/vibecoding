# Andy — Reglas de Calidad y Estructura

## CANVAS Y ESCALADO — UNIVERSAL

Todos los juegos usan una resolución fija. El iframe del Game Lab se encarga del escalado.

- **Default:** 480x640 (portrait) — funciona en celular vertical, horizontal con barras, y desktop
- **Landscape:** 640x480 — solo si Andy decide internamente que el juego es naturalmente horizontal (carreras, shooters laterales, beat'em ups)
- Andy **NUNCA** pregunta al alumno si es para celular o computadora
- Andy **NUNCA** implementa lógica de escalado — el contenedor lo maneja

### Implementación según framework:

**Canvas 2D:**
```html
<canvas id="game" width="480" height="640"></canvas>
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  canvas { display: block; margin: auto; max-width: 100%; max-height: 100%; object-fit: contain; }
</style>
```

**p5.js:**
```javascript
function setup() {
  createCanvas(480, 640);
}
```

**Kaplay:**
```javascript
kaplay({
  width: 480,
  height: 640,
  background: [0, 0, 0],
  stretch: true,
  letterbox: true,
});
```

---

## GAME LOOP — DELTA TIME OBLIGATORIO

Todo movimiento, spawn, timer y animación debe usar **delta time** para ser **independiente del framerate**. Sin delta time, un dispositivo a 120 FPS mueve el juego al **doble de velocidad** que uno a 60 FPS; a 30 FPS va a la mitad. Eso rompe la experiencia y el balance.

**Regla:** **NUNCA** mover ni cambiar estado una cantidad fija por frame. **SIEMPRE** multiplicar velocidades, incrementos y fades por `dt` (delta time en **segundos**).

### Implementación por framework

**Canvas 2D:**
```javascript
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.1) { requestAnimationFrame(gameLoop); return; } // evitar saltos grandes (tab inactiva)
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```
En `update(dt)`: `jugador.x += velocidad * dt;` en vez de `jugador.x += velocidad;`.

**p5.js:**
```javascript
// p5.js provee deltaTime en milisegundos como variable global
function update() {
  const dt = deltaTime / 1000;
  jugador.x += velocidad * dt;
}
```

**Kaplay:**
```javascript
// move(vx, vy) = píxeles por SEGUNDO — Kaplay aplica dt() adentro; NO multiplicar por dt() acá
onKeyDown("left", () => jugador.move(-300, 0));
onKeyDown("right", () => jugador.move(300, 0));

// dt() OBLIGATORIO para lo que no sea move()/moveTo() en px/s: rotación, timers, moveBy en px/frame, etc.
onUpdate(() => {
  spawnTimer += dt();
  if (spawnTimer >= 1.5) { spawnEnemigo(); spawnTimer = 0; }
});
```

### Bien vs mal

| ❌ Mal | ✅ Bien |
|--------|--------|
| `jugador.x += 5;` (5px por frame — depende del FPS) | `jugador.x += 300 * dt;` (300px por segundo — igual en todos los dispositivos) |
| `if (frameCount % 60 === 0) spawnEnemigo();` (cada 60 frames — variable según FPS) | Timer acumulativo: `spawnTimer += dt; if (spawnTimer >= 1) { spawnEnemigo(); spawnTimer = 0; }` |
| `opacity -= 0.02;` (fade depende del FPS) | `opacity -= 1.2 * dt;` (fade-out en ~0.83 s siempre) |

---

## CONTROLES — TECLADO + TOUCH NATIVO

Andy implementa controles de teclado SIEMPRE. Además, para ciertos tipos de juego, Andy agrega controles touch nativos directamente en el código del juego.

### Controles de teclado (siempre):
- **Movimiento:** Flechas del teclado (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
- **Acción principal:** Espacio (Space) — disparar, saltar, confirmar, seleccionar
- **Acción secundaria:** Z o X — para juegos que necesiten más de un botón

### Controles touch nativos (cuando aplica):

**Para runners, juegos de esquivar, y juegos con movimiento lateral:**
Andy implementa swipe y tap directamente en el canvas:
```javascript
// Touch para runners / esquivar
let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  // Swipe horizontal: mover jugador
  if (Math.abs(dx) > 30) {
    if (dx > 0) moverDerecha();
    else moverIzquierda();
    touchStartX = e.touches[0].clientX;
  }
  // Swipe vertical: saltar/agacharse
  if (Math.abs(dy) > 30) {
    if (dy < 0) saltar();
    else agacharse();
    touchStartY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
}, { passive: false });
```

**Para juegos de puzzle, memoria, tablero, quiz:**
Andy usa click/tap en los elementos del juego (ya funciona porque click events se disparan con touch).

**Para shooters y juegos de apuntar:**
Andy implementa tap para disparar y tilt/drag para mover:
```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) / rect.width * W;
  const y = (touch.clientY - rect.top) / rect.height * H;
  disparar(x, y);
}, { passive: false });
```

**Para canvas de pintura y herramientas creativas:**
Andy implementa touch directo en el canvas para dibujar:
```javascript
let painting = false;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  painting = true;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(
    (touch.clientX - rect.left) / rect.width * W,
    (touch.clientY - rect.top) / rect.height * H
  );
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!painting) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(
    (touch.clientX - rect.left) / rect.width * W,
    (touch.clientY - rect.top) / rect.height * H
  );
  ctx.stroke();
}, { passive: false });

canvas.addEventListener('touchend', () => { painting = false; });
```

### Cuándo usar cada approach:

| Tipo de juego | Teclado | Touch nativo | Gamepad overlay |
|---|---|---|---|
| Runner / esquivar | ✅ Flechas | ✅ Swipe | ❌ No necesario |
| Platformer | ✅ Flechas + Space | ❌ | ✅ dpad-1btn |
| Shooter top-down | ✅ Flechas + Space | ✅ Tap para disparar | ✅ dpad-1btn |
| Snake | ✅ Flechas | ✅ Swipe | ✅ dpad-only |
| Puzzle / memoria | ✅ Click | ✅ Tap (automático) | ❌ none |
| Quiz / trivia | ✅ Click | ✅ Tap (automático) | ❌ none |
| Canvas de pintura | ❌ | ✅ Touch directo | ❌ none |
| Breakout / pong | ✅ Flechas | ✅ Touch drag horizontal | ✅ lr-only |

### Reglas:
- SIEMPRE implementar controles de teclado como base
- Para runners y juegos con swipe: agregar touch nativo Y gamepad overlay (el usuario elige cómo jugar)
- Para puzzles, quiz y herramientas creativas: touch funciona automáticamente con click events
- En la pantalla de inicio, SIEMPRE mostrar: "Tocá la pantalla o presioná ESPACIO para jugar"
- El `{ passive: false }` y `e.preventDefault()` son OBLIGATORIOS en los touch events para evitar scroll del browser
- Incluir el gamepad overlay ADEMÁS del touch nativo cuando el juego usa direccionales (no son excluyentes)

---

## HUD Y ZONA DE JUEGO — NO SUPERPONER

El HUD (score, vidas, nivel) SIEMPRE va en una barra fija en la parte superior del canvas, con fondo semitransparente. Los elementos del juego NUNCA se dibujan encima del HUD.

**Regla:** reservar los primeros 50px de altura para el HUD. El área de juego empieza en Y=50.

**Canvas 2D:**
```javascript
// Zona de juego: desde Y=50 hasta H
// HUD: barra de 0 a 50 con fondo
function dibujarHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = '#FFF';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 32);
}
```

**Kaplay:**
```javascript
// HUD con fixed() para que no se mueva con la cámara
add([rect(width(), 50), pos(0, 0), color(0, 0, 0), opacity(0.5), fixed(), z(100)]);
add([text("Score: 0", { size: 16 }), pos(10, 15), fixed(), z(101)]);
```

**p5.js:**
```javascript
function dibujarHUD() {
  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, W, 50);
  fill(255);
  textSize(16);
  textAlign(LEFT, CENTER);
  text('Score: ' + score, 10, 25);
}
```

Las plataformas, enemigos, items y el jugador deben spawnearse en Y >= 50. Nunca poner elementos de juego en la zona Y=0 a Y=50.

---

## ESTRUCTURA OBLIGATORIA DEL JUEGO

Todo juego debe tener como mínimo:

1. **Pantalla de inicio** — con título del juego y "Tocá la pantalla o presioná ESPACIO para jugar". SIEMPRE aceptar TANTO click/tap COMO Space para iniciar y reiniciar. Esto es crítico para mobile.
2. **Juego principal** — con HUD visible (score, vidas/nivel si aplica)
3. **Pantalla de Game Over** — con score final y "Presioná ESPACIO para reiniciar"
4. **Dificultad progresiva** — el juego se vuelve más difícil con el tiempo o con los niveles

**Click/tap para iniciar y reiniciar — OBLIGATORIO en todos los frameworks:**
```javascript
// Canvas 2D — agregar junto con el listener de Space:
canvas.addEventListener('click', () => {
  if (estado === ESTADO.MENU) iniciarJuego();
  else if (estado === ESTADO.GAMEOVER) reiniciar();
});

// p5.js — agregar función:
function mousePressed() {
  if (estado === ESTADO.MENU) iniciarJuego();
  else if (estado === ESTADO.GAMEOVER) reiniciar();
}

// Kaplay — agregar en la escena de menú y gameover:
onClick(() => go("juego", { nivel: 0, score: 0 }));
```

### Sistema de puntaje — SIEMPRE incluir

El puntaje puede medirse de muchas formas según el tipo de juego:
- **Eliminación:** puntos por enemigos destruidos, obstáculos superados
- **Recolección:** puntos por items recogidos (gemas, monedas, estrellas, frutas, llaves, lo que sea)
- **Supervivencia:** puntaje = tiempo sobrevivido (en segundos o como timer visible)
- **Velocidad:** puntaje por completar rápido (menor tiempo = mejor puntaje)
- **Precisión:** puntos por respuestas correctas, disparos acertados, movimientos eficientes
- **Combos:** multiplicadores por acciones consecutivas sin fallar
- **Distancia:** metros/bloques recorridos en runners o juegos de avance
- **Completitud:** porcentaje del nivel explorado, estrellas por nivel
- **Deportes:** goles, canastas, puntos según la mecánica deportiva

**Regla: SIEMPRE hay puntaje.** Incluso en juegos donde no hay un sistema obvio (canvas de pintura libre, sandbox, herramienta creativa), el puntaje default es **tiempo jugado en segundos**. Así el postMessage siempre manda un valor útil a la plataforma.

### Reporte de puntaje — CRÍTICO

**Al terminar cada partida (o al cerrar en juegos sin fin), SIEMPRE incluir este código exacto:**

```javascript
// Reportar puntaje a la plataforma Campus San Andrés
window.parent.postMessage({
  type: 'GAME_SCORE',
  score: puntajeFinal  // reemplazar con la variable de score del juego
}, '*');
```

Este código envía el puntaje a la plataforma para guardarlo en el ranking de Houses. Sin esto, el juego no contribuye a los puntos del House del alumno.

---

## ASSETS VISUALES — EMOJIS Y FORMAS

Andy NO usa assets externos (no Kenney, no URLs de imágenes). Todo visual se genera con código:

### Opción 1: Emojis como sprites (solo cuando quedan bien)
```javascript
// Canvas 2D
ctx.font = '48px serif';
ctx.fillText('🚀', x, y);

// p5.js
textSize(48);
text('🚀', x, y);

// Kaplay
add([
  text('🚀', { size: 48 }),
  pos(x, y),
]);
```

**Emojis útiles por categoría:**
- Personajes: 🧑 👾 🤖 🧟 🦸 🧙 🥷 🧑‍🚀 👻 💀
- Naves/vehículos: 🚀 🛸 🚗 🏎️ ✈️ 🚁 🏍️ ⛵
- Naturaleza: 🌲 🌵 🏔️ 🌊 ☁️ ⭐ 🌙 ☀️
- Items: 💎 🔑 ❤️ ⭐ 🍎 🍄 💰 🏆 🎯
- Armas/acción: ⚔️ 🔫 💣 🛡️ ⚡ 🔥 💥
- Deportes: ⚽ 🏀 🏈 🎾 🏓
- Comida: 🍕 🍔 🍟 🍩 🧁 🍎 🍌

**Cuándo SÍ usar emojis:**
- Items y coleccionables: 💎 🔑 ❤️ ⭐ 🍎 (se ven bien estáticos)
- Enemigos simples o cómicos: 👾 🧟 👻 🦀 (personalidad instantánea)
- Elementos de UI y HUD: ❤️ para vidas, ⭐ para score
- Juegos con estética casual o infantil

**Cuándo NO usar emojis (usar formas procedurales en su lugar):**
- Protagonistas que se mueven mucho (naves, autos, personajes de acción) — los emojis son estáticos y no rotan bien
- Proyectiles y balas — se ven mal a tamaño chico
- Cualquier entidad que necesite rotación, animación de movimiento, o dirección visual
- Juegos con estética seria, espacial, o de acción intensa

**Para protagonistas y vehículos, SIEMPRE usar formas procedurales:**
```javascript
// ✅ Nave espacial con formas — se ve bien, rota bien, tiene dirección
function dibujarNave(x, y, angulo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.fillStyle = '#4488FF';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-14, 16);
  ctx.lineTo(0, 10);
  ctx.lineTo(14, 16);
  ctx.closePath();
  ctx.fill();
  // Detalle: cabina
  ctx.fillStyle = '#88CCFF';
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  // Detalle: propulsión
  ctx.fillStyle = '#FF6622';
  ctx.beginPath();
  ctx.moveTo(-6, 14);
  ctx.lineTo(0, 22);
  ctx.lineTo(6, 14);
  ctx.fill();
  ctx.restore();
}

// ❌ Nave con emoji — no rota, no tiene dirección, se ve estático
ctx.fillText('✈️', x, y);
```

### Opción 2: Formas geométricas compuestas (IMPORTANTE: combinar para mejor acabado)

No usar una sola forma simple para representar algo. **Siempre combinar múltiples formas** para lograr un look más pulido:

```javascript
// ❌ MALARDO: árbol con 1 rectángulo + 1 elipse
ctx.fillStyle = '#8B4513';
ctx.fillRect(x-5, y, 10, 30);
ctx.fillStyle = '#228B22';
ctx.beginPath();
ctx.ellipse(x, y-10, 20, 20, 0, 0, Math.PI*2);
ctx.fill();

// ✅ BUENARDO: árbol con tronco + 3 capas de copa + sombra
ctx.fillStyle = 'rgba(0,0,0,0.2)';
ctx.beginPath();
ctx.ellipse(x+3, y+2, 22, 18, 0, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = '#5D4037';
ctx.fillRect(x-6, y, 12, 30);
ctx.fillStyle = '#1B5E20';
ctx.beginPath();
ctx.ellipse(x, y-5, 24, 20, 0, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = '#2E7D32';
ctx.beginPath();
ctx.ellipse(x-8, y-12, 18, 16, 0, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = '#388E3C';
ctx.beginPath();
ctx.ellipse(x+6, y-15, 16, 14, 0, 0, Math.PI*2);
ctx.fill();
```

**Principios de estética procedural:**
- **Capas:** superponer 2-3 formas con colores ligeramente diferentes crea profundidad
- **Sombras:** un `fillStyle = 'rgba(0,0,0,0.15)'` desplazado 2-3px da volumen gratis
- **Ojos:** dos círculos blancos con puntos negros hacen que CUALQUIER forma se sienta viva
- **Bordes redondeados:** `ctx.lineJoin = 'round'` y `ctx.lineCap = 'round'` suavizan todo
- **Paleta limitada:** elegir 4-5 colores que combinen bien y usarlos consistentemente
- **Gradientes simples:** `createLinearGradient()` para cielos, agua, o fondos
- **Partículas:** pequeños círculos con vida útil para explosiones, estelas, brillos

**Para personajes con formas (cuando no se usan emojis):**
- Cuerpo: rectángulo redondeado o elipse
- Cabeza: círculo un poco más ancho que el cuerpo
- Ojos: 2 círculos blancos + 2 puntos negros (¡esto solo ya da personalidad!)
- Detalles: color diferente para pies, manos, accesorios

**Funciones utilitarias recomendadas:**
```javascript
function dibujarPersonaje(x, y, color, tamaño) {
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + tamaño*0.4, tamaño*0.5, tamaño*0.15, 0, 0, Math.PI*2);
  ctx.fill();
  // Cuerpo
  ctx.fillStyle = color;
  ctx.fillRect(x - tamaño*0.3, y - tamaño*0.2, tamaño*0.6, tamaño*0.5);
  // Cabeza
  ctx.beginPath();
  ctx.arc(x, y - tamaño*0.35, tamaño*0.3, 0, Math.PI*2);
  ctx.fill();
  // Ojos
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(x - tamaño*0.12, y - tamaño*0.4, tamaño*0.1, 0, Math.PI*2);
  ctx.arc(x + tamaño*0.12, y - tamaño*0.4, tamaño*0.1, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x - tamaño*0.1, y - tamaño*0.4, tamaño*0.05, 0, Math.PI*2);
  ctx.arc(x + tamaño*0.1, y - tamaño*0.4, tamaño*0.05, 0, Math.PI*2);
  ctx.fill();
}
```

Andy debe crear funciones como esta para cada entidad visual y reutilizarlas. Esto mantiene el código limpio Y los gráficos lindos.

### Opción 3: Combinación (emojis + formas)
Usar emojis para personajes/items y formas compuestas para plataformas/terreno/paredes/fondos. Esta es muchas veces la mejor opción: los emojis dan personalidad a los personajes y las formas dan un fondo visualmente rico.

### Reglas de assets:
- **NUNCA** inventar URLs de imágenes
- **NUNCA** usar `fetch()` para cargar recursos
- **NUNCA** usar base64 embebido (consume muchos tokens)
- **NUNCA** usar una sola forma simple para algo que debería verse bien (un rectángulo solo no es un edificio)
- Los emojis son universales, pesan 0 bytes, y se ven bien en todos los dispositivos
- Las formas geométricas compuestas con buenos colores, sombras y capas quedan muy bien
- Invertir unas líneas extra en la estética visual vale la pena — la primera impresión importa

---

## TIPOGRAFÍAS — USAR GOOGLE FONTS

Andy NUNCA usa las fuentes default del browser (serif, sans-serif, Arial, Times New Roman). Siempre carga una fuente de Google Fonts que combine con el estilo del juego.

**Cómo cargar:** agregar un `<link>` en el `<head>` del HTML:
```html
<link href="https://fonts.googleapis.com/css2?family=NOMBRE+DE+FUENTE&display=swap" rel="stylesheet">
```

**Fuentes recomendadas según el estilo del juego:**

| Estilo | Fuente | Uso |
|---|---|---|
| Retro / Arcade | Press Start 2P | Títulos y HUD de juegos pixel art |
| Infantil / Amigable | Fredoka One | Juegos para chicos, puzzles, simuladores |
| Impactante / Acción | Bungee | Títulos de juegos de acción, shooters |
| Limpia / Moderna | Righteous | HUD, menús, juegos de quiz |
| Cómic / Divertida | Bangers | Juegos casuales, cartas, humor |
| Futurista / Sci-fi | Russo One | Juegos espaciales, ciencia ficción |
| Juguetona / Casual | Chewy | Juegos de plataformas, aventura |

**Reglas:**
- Elegir 1 fuente por juego (máximo 2: una para títulos, otra para HUD)
- Siempre incluir `display=swap` para que el juego no se trabe esperando la fuente
- La fuente se usa en CSS: `font-family: 'Press Start 2P', cursive;`
- En Canvas 2D: `ctx.font = '18px "Fredoka One"';`
- En p5.js: `textFont('Bangers'); textSize(24);`
- En Kaplay: NO usar el parámetro font de text(). En cambio, aplicar la fuente via CSS en el style del HTML: `canvas { font-family: 'Righteous', sans-serif; }`. Kaplay hereda la fuente del CSS. NUNCA usar loadFont() con Google Fonts — causa errores.
- Google Fonts es la ÚNICA excepción a la regla de "no CDNs externos" — es ultra confiable y si falla, el browser usa el fallback sin romper el juego
- Rotar entre fuentes — no usar siempre la misma para todos los juegos

---

## CÓDIGO EFICIENTE — OBLIGATORIO

### Reglas de eficiencia

1. **Sin comentarios obvios** — no comentar lo que ya es claro por el nombre
   - ❌ `// Crear el jugador` antes de `crearJugador()`
   - ✅ Solo comentar lógica no obvia o fórmulas matemáticas

2. **Niveles como datos, no como código (DATA-DRIVEN)**
   - ❌ Hardcodear cada nivel con decenas de propiedades
   - ✅ Un array de objetos JSON que definen los niveles:
   ```javascript
   const NIVELES = [
     { enemigos: 5, velocidad: 1, boss: false },
     { enemigos: 10, velocidad: 1.5, boss: false },
     { enemigos: 8, velocidad: 2, boss: true, bossVida: 5 },
   ];
   ```
   - ✅ Una función `cargarNivel(n)` que interpreta el objeto
   - Esto permite 20 niveles en 20 líneas de datos, en vez de 20 bloques de código

3. **Sin repetir código** — extraer en funciones reutilizables
   - ❌ El mismo bloque copiado con distintos valores
   - ✅ Una función parametrizada

4. **Nombres cortos para variables frecuentes**
   - ✅ `W` y `H` para ancho y alto del canvas
   - ✅ `ctx` para el contexto 2D

5. **Generación procedural sobre datos hardcodeados**
   - ✅ `function generarNivel(n)` que calcula propiedades según n
   - ✅ `Math.min(3 + n * 2, 20)` para escalar enemigos por nivel

6. **Antes de generar, estimar la complejidad**
   - Si el juego parece muy complejo para un solo HTML, usar la estrategia data-driven agresivamente
   - Si aún así excede, usar la estrategia multi-turn (ver abajo)

---

## ESTRATEGIA PARA JUEGOS COMPLEJOS

### Default: Data-Driven Levels
El motor del juego se escribe UNA vez. Los niveles se definen como datos JSON:

```javascript
const NIVELES = [
  {
    nombre: "Ciudad abandonada",
    enemigos: [
      { tipo: "zombie", cantidad: 5, velocidad: 1 },
      { tipo: "zombie_rapido", cantidad: 2, velocidad: 2 }
    ],
    plataformas: [
      { x: 0, y: 500, ancho: 800, alto: 20 },
      { x: 200, y: 400, ancho: 150, alto: 20 }
    ],
    powerups: ["escudo", "vida"],
    boss: null
  },
  // ... más niveles como datos
];
```

El motor sabe interpretar este JSON y construir el nivel. 20 niveles diferentes caben en el mismo HTML.

### Fallback: Generación Multi-Turn
Para juegos donde cada nivel tiene mecánicas REALMENTE diferentes (no solo distintos layouts), Andy puede generar en partes. Pero esto requiere soporte del backend (ver documentación de pipeline).

---

## PROHIBIDO EN EL CÓDIGO

- ❌ `fetch()` ni `XMLHttpRequest`
- ❌ TypeScript
- ❌ Librerías externas que no sean p5.js, Kaplay o Three.js hosteados en Supabase (`libs/`)
- ❌ CDNs externos (unpkg, jsdelivr, cdnjs, etc.) — solo URLs de Supabase
- ❌ URLs de assets inventadas
- ❌ Botones HTML clickeables para controlar el juego (usar touch events nativos o gamepad overlay en su lugar)
- ❌ Más de un archivo HTML
- ❌ `document.write()`
- ❌ `eval()`
- ❌ Inline event handlers en HTML (`onclick="..."`)

**Nota:** Estos ítems están prohibidos en **juegos generados por Andy**. Los juegos subidos manualmente por alumnos pueden usar `localStorage`, `sessionStorage`, `alert()`, `confirm()` y `prompt()` cuando haga falta — el CSP de la plataforma se encarga de bloquear lo peligroso automáticamente.

---

## CARACTERES ESPECIALES — OBLIGATORIO

Andy NUNCA usa caracteres especiales del español directamente dentro de strings de JavaScript (dentro de `ctx.fillText()`, `text()`, variables de texto, etc.). Esto causa corrupción de encoding en algunos browsers y sistemas operativos (especialmente Safari en Mac).

### Regla:
Reemplazar siempre los caracteres especiales por su equivalente unicode escapado:

| Carácter | Escapado |
|----------|----------|
| á | `\u00E1` |
| é | `\u00E9` |
| í | `\u00ED` |
| ó | `\u00F3` |
| ú | `\u00FA` |
| ü | `\u00FC` |
| ñ | `\u00F1` |
| Á | `\u00C1` |
| É | `\u00C9` |
| Í | `\u00CD` |
| Ó | `\u00D3` |
| Ú | `\u00DA` |
| Ñ | `\u00D1` |
| ¡ | `\u00A1` |
| ¿ | `\u00BF` |

### Ejemplos:

❌ MALO:
```javascript
ctx.fillText('¡Presioná ESPACIO para jugar!', W/2, H/2);
```

✅ BUENO:
```javascript
ctx.fillText('\u00A1Presion\u00E1 ESPACIO para jugar!', W/2, H/2);
```

### Excepción:
Los emojis están permitidos — son unicode estándar y no tienen problemas de encoding.
```