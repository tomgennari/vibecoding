# Template — p5.js

## Scaffold Base

Este es el esqueleto que Andy usa para juegos p5.js. Ideal para juegos artísticos, creativos, y visualmente ricos.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TITULO_DEL_JUEGO</title>
  <script src="https://vjpsqfihlemymaqcznie.supabase.co/storage/v1/object/public/libs/p5.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; display: flex; justify-content: center; align-items: center; }
    canvas { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
<script>
// === CONFIGURACIÓN ===
const W = 480, H = 640;

// === ESTADOS ===
const ESTADO = { MENU: 0, JUGANDO: 1, GAMEOVER: 2 };
let estado = ESTADO.MENU;
let score = 0;
let nivel = 1;

// === NIVELES (data-driven) ===
const NIVELES = [
  { /* propiedades del nivel 1 */ },
  { /* propiedades del nivel 2 */ },
  { /* propiedades del nivel 3 */ },
];

// === ENTIDADES ===
// Definir jugador, enemigos, items, etc.

function setup() {
  createCanvas(W, H);
  textAlign(CENTER, CENTER);
}

function draw() {
  if (estado === ESTADO.MENU) { dibujarMenu(); return; }
  if (estado === ESTADO.GAMEOVER) { dibujarGameOver(); return; }
  // Juego principal
  background(30);
  update();
  dibujarJuego();
  dibujarHUD();
}

// === PANTALLAS ===
function dibujarMenu() {
  background(20);
  fill(255);
  textSize(36);
  text('TITULO_DEL_JUEGO', W/2, H/3);
  textSize(18);
  text('Presioná ESPACIO para jugar', W/2, H/2);
}

function dibujarHUD() {
  fill(255);
  textSize(18);
  textAlign(LEFT, TOP);
  text('Score: ' + score, 10, 10);
  textAlign(RIGHT, TOP);
  text('Nivel: ' + nivel, W - 10, 10);
  textAlign(CENTER, CENTER); // restaurar default
}

function dibujarGameOver() {
  background(0, 0, 0, 180);
  fill(255);
  textSize(36);
  text('GAME OVER', W/2, H/3);
  textSize(24);
  text('Score: ' + score, W/2, H/2);
  textSize(18);
  text('Presioná ESPACIO para reiniciar', W/2, H/2 + 50);
}

// === LÓGICA ===
function update() {
  // Mover entidades, detectar colisiones...
  // Usar keyIsDown(LEFT_ARROW), keyIsDown(UP_ARROW), etc.
}

function dibujarJuego() {
  // Dibujar entidades...
  // Para emojis: textSize(48); text('🚀', x, y);
}

// === CONTROLES ===
function keyPressed() {
  if (key === ' ') {
    if (estado === ESTADO.MENU) iniciarJuego();
    else if (estado === ESTADO.GAMEOVER) reiniciar();
  }
  return false; // prevenir scroll
}

// === FUNCIONES ===
function iniciarJuego() {
  score = 0;
  nivel = 1;
  estado = ESTADO.JUGANDO;
  // Inicializar entidades...
}

function reiniciar() {
  iniciarJuego();
}

function gameOverFn() {
  estado = ESTADO.GAMEOVER;
  window.parent.postMessage({ type: 'GAME_SCORE', score: score }, '*');
}
</script>
</body>
</html>
```

## Notas para Andy

- p5.js crea su propio canvas — no necesitás `<canvas>` en el HTML
- `setup()` se ejecuta una vez, `draw()` es el game loop (60fps default)
- Para movimiento continuo: usar `keyIsDown(LEFT_ARROW)` dentro de `draw()` o `update()`
- Para acciones discretas (saltar, disparar): usar `keyPressed()`
- Emojis: `textSize(48); text('🚀', x, y);` — funcionan perfecto
- Formas: `rect()`, `ellipse()`, `triangle()`, `line()` con `fill()` y `stroke()`
- Colores: `fill(255, 100, 50)` o `fill('#FF6432')`
- Para partículas y efectos: usar arrays de objetos con posición, velocidad, vida
- `frameCount` es útil para timing (ej: `if (frameCount % 60 === 0)` = cada segundo)
- `random()`, `noise()`, `map()`, `constrain()` son funciones built-in muy útiles
- Para colisiones: `dist(x1, y1, x2, y2)` para distancia entre puntos
