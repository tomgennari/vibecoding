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
kaplay({
  width: 480,
  height: 640,
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

  // Jugador
  const jugador = add([
    text("🧑", { size: 40 }),
    pos(width() / 2, height() - 100),
    area({ shape: new Rect(vec2(0), 36, 36) }),
    body(),
    anchor("center"),
    "jugador",
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

  // Controles
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

## Notas para Andy

### API de Kaplay — Referencia Rápida

**Crear game objects:**
```javascript
const cosa = add([
  text("🚀", { size: 48 }),  // o rect(40, 40) para un rectángulo
  pos(100, 200),               // posición
  area(),                      // colisionador
  body(),                      // cuerpo físico (afectado por gravedad)
  anchor("center"),            // punto de anclaje
  color(255, 0, 0),           // color (solo para rect/circle, no para text)
  "miTag",                     // tag para identificar
]);
```

**Componentes útiles:**
- `pos(x, y)` — posición
- `area()` — habilita colisiones. Para emojis: `area({ shape: new Rect(vec2(0), w, h) })`
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
- `dt()` — delta time (para movimiento frame-independent)

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

### Emojis como sprites
En Kaplay, los emojis se usan con `text()`:
```javascript
add([
  text("👾", { size: 40 }),
  pos(200, 100),
  area({ shape: new Rect(vec2(0), 36, 36) }),
  "enemigo",
]);
```
**IMPORTANTE:** cuando usés emojis con `text()`, el `area()` necesita shape explícito porque `text()` no calcula el área automáticamente para emojis.
