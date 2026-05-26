# Template — Kaplay (ex-Kaboom.js)

## Scaffold Base

Este es el esqueleto que Andy usa para juegos Kaplay. Ideal para plataformers, shooters, y juegos de acción con física.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TITULO_DEL_JUEGO</title>
  <script src="https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/kaplay.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
<script>
// === INICIALIZAR KAPLAY ===
// Portrait: const W = 480, H = 640  |  Landscape: const W = 960, H = 540
// Elegí según la tabla de orientación en quality-rules.md
const W = 480, H = 640;
kaplay({
  width: W,
  height: H,
  background: [20, 20, 30],
  stretch: true,
  letterbox: true,
  global: true,
});

// === DATOS DE NIVELES ===
const NIVELES = [
  { velocidadEnemigos: 100, cantidadEnemigos: 5, boss: false },
  { velocidadEnemigos: 150, cantidadEnemigos: 8, boss: false },
  { velocidadEnemigos: 200, cantidadEnemigos: 6, boss: true },
];

// === ESCENA: MENU ===
scene("menu", () => {
  add([
    text("TITULO_DEL_JUEGO", { size: 32 }),
    pos(width() / 2, height() / 3),
    anchor("center"),
    color(255, 255, 255),
  ]);

  add([
    text("Presioná ESPACIO para jugar", { size: 18 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(200, 200, 200),
  ]);

  onKeyPress("space", () => go("juego", { nivel: 0, score: 0 }));
});

// === ESCENA: JUEGO ===
scene("juego", ({ nivel: nivelActual, score: scoreActual }) => {
  const datos = NIVELES[nivelActual] || NIVELES[NIVELES.length - 1];
  let score = scoreActual;

  // Gravedad (para plataformers)
  setGravity(1200);

  // Jugador — formas compuestas (REGLA DE ORO: nunca emoji)
  const jugador = add([
    rect(28, 36, { radius: 6 }),
    pos(width() / 2, height() - 100),
    color(74, 144, 226),
    area(),
    body(),
    anchor("center"),
    "jugador",
  ]);
  jugador.add([circle(10), pos(0, -22), color(255, 220, 180), anchor("center")]);

  // \u00cdtem coleccionable — emoji permitido solo para \u00edtems secundarios
  add([
    text("\u2B50", { size: 24 }),
    pos(width() / 2, 200),
    area({ shape: new Rect(vec2(0), 24, 24) }),
    anchor("center"),
    "item",
  ]);

  // Plataforma base
  add([
    rect(width(), 20),
    pos(0, height() - 40),
    area(),
    body({ isStatic: true }),
    color(100, 100, 100),
    "plataforma",
  ]);

  // HUD
  const hud = add([
    text("Score: 0", { size: 18 }),
    pos(10, 10),
    fixed(),
    { update() { this.text = "Score: " + score; } },
  ]);

  // Controles — move(vx, vy) ya es en px/s (Kaplay aplica dt internamente)
  onKeyDown("left", () => jugador.move(-200, 0));
  onKeyDown("right", () => jugador.move(200, 0));
  onKeyPress("space", () => {
    if (jugador.isGrounded()) jugador.jump(500);
  });

  // Colisiones
  jugador.onCollide("enemigo", () => {
    go("gameover", { score });
  });

  jugador.onCollide("item", (item) => {
    score += 10;
    destroy(item);
  });
});

// === ESCENA: GAME OVER ===
scene("gameover", ({ score }) => {
  // Reportar score
  window.parent.postMessage({ type: 'GAME_SCORE', score: score }, '*');

  add([
    text("GAME OVER", { size: 36 }),
    pos(width() / 2, height() / 3),
    anchor("center"),
    color(255, 255, 255),
  ]);

  add([
    text("Score: " + score, { size: 24 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(255, 255, 255),
  ]);

  add([
    text("Presioná ESPACIO para reiniciar", { size: 18 }),
    pos(width() / 2, height() / 2 + 50),
    anchor("center"),
    color(200, 200, 200),
  ]);

  onKeyPress("space", () => go("menu"));
});

// === INICIAR ===
go("menu");
</script>
</body>
</html>
```

## ERRORES COMUNES A EVITAR

- NUNCA agregar una propiedad custom `vel` a un objeto que ya tiene `body()`. El componente `body()` ya provee `vel` (la velocidad). Para mover un objeto con body, usar `jugador.vel` directamente o los métodos `move()`/`jump()`, nunca redefinir `vel` en el array de componentes.
- NUNCA poner componentes condicionales que puedan evaluar a `undefined`/`false` dentro del array de `add([...])`. En vez de `add([sprite, esBoss && health(5)])`, construir el array primero y hacer push condicional:
  ```javascript
  const comps = [rect(28, 28, { radius: 4 }), pos(x, y), area(), color(192, 57, 43), "enemigo"];
  if (esBoss) comps.push(health(5));
  add(comps);
  ```
- NUNCA agregar dos veces el mismo componente al mismo objeto (ej: dos `pos()`, dos `body()`).
- Si un objeto necesita guardar estado custom, usar un objeto plano al final del array con propiedades que NO colisionen con componentes de Kaplay (`vel`, `pos`, `scale`, `angle`, `opacity`, `color` están reservadas). Usar nombres propios como `velocidadCustom`, `estado`, `vidaJugador`.

## Notas para Andy

- Resolución fija **480×640** o **960×540** según género (tabla en `quality-rules.md`); `kaplay({ width: W, height: H })` siempre con `const W, H`. Sin canvas tag manual ni escalado responsivo dentro del juego — el iframe escala.

### API de Kaplay — Referencia Rápida

**Crear game objects:**
```javascript
// Protagonista — formas compuestas (REGLA DE ORO: nunca emoji)
const jugador = add([
  rect(28, 36, { radius: 6 }),
  pos(100, 200),
  color(74, 144, 226),
  area(),
  body(),
  anchor("center"),
  "jugador",
]);

// \u00cdtem coleccionable — emoji solo para \u00edtems inocuos
add([
  text("\u2B50", { size: 24 }),
  pos(300, 150),
  area({ shape: new Rect(vec2(0), 24, 24) }),
  "item",
]);
```

**Componentes útiles:**
- `pos(x, y)` — posición
- `area()` — habilita colisiones. Para objetos pequeños: `area({ shape: new Rect(vec2(0), w, h) })`
- `body()` — cuerpo físico con gravedad. `body({ isStatic: true })` para plataformas
- `anchor("center")` — punto de anclaje
- `move(dir, speed)` — movimiento constante: `move(LEFT, 200)`
- `rotate(angulo)` — rotación
- `scale(n)` — escala
- `opacity(n)` — transparencia
- `offscreen({ destroy: true })` — destruir cuando sale de pantalla
- `health(n)` — sistema de vida: `.hurt(1)`, `.heal(1)`, `.hp()`

**Controles:**
- `onKeyDown("left", fn)` — mientras se mantiene la tecla
- `onKeyPress("space", fn)` — al presionar (una vez)
- `onKeyRelease("right", fn)` — al soltar

**Colisiones:**
- `obj.onCollide("tag", (other) => { ... })` — al colisionar
- `obj.isColliding("tag")` — ¿está colisionando ahora?
- `obj.isGrounded()` — ¿está en el piso? (para saltar)

**Spawning:**
- `loop(segundos, fn)` — repetir cada X segundos
- `wait(segundos, fn)` — ejecutar después de X segundos
- `destroy(obj)` — eliminar un game object

**Escenas:**
- `scene("nombre", (datos) => { ... })` — definir escena
- `go("nombre", { datos })` — cambiar a escena

**Utilidades:**
- `rand(min, max)` — número random
- `choose([a, b, c])` — elegir random de array
- `width()`, `height()` — dimensiones del canvas
- `vec2(x, y)` — crear vector
- `dt()` — delta time en segundos — **OBLIGATORIO** en `onUpdate()` para rotaciones, timers, fades y cualquier lógica “por segundo” que **no** use `move(vx,vy)` (ese método ya va en px/s y Kaplay aplica `dt` adentro). Para `moveBy(dx,dy)` los deltas son **por frame**; si querés px/s, usá `moveBy(vel * dt(), 0)` o directamente `move(vel, 0)`.

### ASCII Maps para Niveles (MUY PODEROSO)
```javascript
const mapa = addLevel([
  "         ",
  "   ===   ",
  "         ",
  " ===     ",
  "     === ",
  "=========",
], {
  tileWidth: 48,
  tileHeight: 48,
  tiles: {
    "=": () => [rect(48, 48), area(), body({ isStatic: true }), color(100, 100, 100), "plataforma"],
  }
});
```
Esto permite definir niveles enteros como strings ASCII — extremadamente eficiente en tokens.

### Formas compuestas para protagonista y enemigos (REGLA DE ORO)

Protagonista y enemigos **siempre** con `rect()`, `circle()` y `color()`. Nunca `text()` con emoji.

```javascript
// Enemigo con formas
const enemigo = add([
  rect(28, 28, { radius: 4 }),
  pos(200, 100),
  color(192, 57, 43),
  area(),
  anchor("center"),
  "enemigo",
]);
enemigo.add([circle(8), pos(0, -16), color(255, 200, 200), anchor("center")]);
```

### Emojis solo para \u00edtems coleccionables

Los emojis con `text()` est\u00e1n **prohibidos** para jugador y enemigos. Solo para \u00edtems secundarios:

```javascript
add([
  text("\u2B50", { size: 24 }),
  pos(200, 100),
  area({ shape: new Rect(vec2(0), 24, 24) }),
  "item",
]);
```

**IMPORTANTE:** cuando us\u00e9s emojis con `text()` para \u00edtems, el `area()` necesita shape expl\u00edcito porque `text()` no calcula el \u00e1rea autom\u00e1ticamente.

### Errores comunes en Kaplay — EVITAR

**Gravedad en platformers:**
Si el juego tiene plataformas y el jugador necesita saltar, SIEMPRE incluir `setGravity(1200)` (o el valor apropiado) al inicio de la escena. Sin esto, `body()` no hace nada y el jugador flota.

**Salto con formas compuestas:**
Si `isGrounded()` falla con personajes hechos de varias formas, usar un contador de contactos con plataformas:
```javascript
let contactosPiso = 0;
jugador.onCollide("plataforma", () => { contactosPiso++; });
jugador.onCollideEnd("plataforma", () => { contactosPiso = Math.max(0, contactosPiso - 1); });

onKeyPress("space", () => {
  if (contactosPiso > 0) {
    jugador.jump(520);
    contactosPiso = 0;
  }
});
```

**`onKeyUp` NO EXISTE en Kaplay.** La función correcta es `onKeyRelease()`.

**`onKeyPress` vs `onKeyDown`:**
- `onKeyPress("space", fn)` — se dispara UNA vez al presionar (ideal para saltar, disparar)
- `onKeyDown("left", fn)` — se dispara CADA FRAME mientras se mantiene (ideal para moverse)
No confundirlos. Usar `onKeyDown` para saltar hace que el jugador salte múltiples veces.

**Google Fonts en Kaplay — NO usar font en text():**
NUNCA usar `text("Hola", { size: 24, font: "Russo One" })` — esto causa "Error: Font not found" porque Kaplay busca una fuente cargada con loadFont(), no una Google Font.
La forma correcta es:
1. Cargar la fuente en el <head> con <link> de Google Fonts
2. Aplicar en CSS: `canvas { font-family: 'Russo One', sans-serif; }`
3. Usar text() SIN parámetro font: `text("Hola", { size: 24 })`
Kaplay hereda la fuente del CSS automáticamente.

**NO pasar canvas manual a kaplay():**
NUNCA usar `canvas: document.createElement('canvas')` en la config de kaplay(). Dejar que Kaplay cree y agregue su canvas automáticamente. Solo configurar width, height, background, stretch, letterbox y global (con `width: W`, `height: H` desde constantes definidas antes).
```javascript
// ❌ MAL — canvas huérfano que nunca se ve
kaplay({
  canvas: document.createElement('canvas'),
  width: 960,
  ...
});

// ✅ BIEN — Kaplay crea el canvas solo; mismas variables W/H que elegís por género
const W = 960, H = 540;
kaplay({
  width: W,
  height: H,
  background: [20, 20, 30],
  stretch: true,
  letterbox: true,
  global: true,
});
```

**`radius()` NO es un componente standalone:**
NUNCA usar `radius(n)` como componente dentro de `add([...])`. El radio se pasa como propiedad de `rect()`.
```javascript
// ❌ MAL — radius no existe como componente
add([
  rect(100, 40),
  radius(8),
  pos(50, 50),
]);

// ✅ BIEN — radius como propiedad de rect
add([
  rect(100, 40, { radius: 8 }),
  pos(50, 50),
]);
```

**Botones clickeables SIEMPRE necesitan `area()`:**
Si un objeto necesita recibir clicks (como un botón "JUGAR"), SIEMPRE agregar `area()` al array de componentes. Sin `area()`, el onClick no se dispara.
```javascript
// ❌ MAL — no tiene area(), el click no funciona
const btn = add([
  rect(200, 60, { radius: 12 }),
  pos(width() / 2, height() / 2),
  anchor("center"),
  color(39, 174, 96),
]);
btn.onClick(() => go("juego"));

// ✅ BIEN — con area(), el click funciona
const btn = add([
  rect(200, 60, { radius: 12 }),
  pos(width() / 2, height() / 2),
  anchor("center"),
  area(),
  color(39, 174, 96),
]);
btn.onClick(() => go("juego"));
```

**Click/tap global para menú y game over:**
Además de los botones con area(), SIEMPRE agregar onClick global como fallback para iniciar y reiniciar:
```javascript
// En la escena de menú y game over, agregar:
onClick(() => go("juego", { nivel: 0, score: 0 }));
```
