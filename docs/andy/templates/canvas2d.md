# Template — Canvas 2D Puro

## Scaffold Base

Este es el esqueleto que Andy usa para juegos Canvas 2D. Andy lo adapta según el juego, pero la estructura base siempre es esta.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TITULO_DEL_JUEGO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; display: flex; justify-content: center; align-items: center; }
    canvas { display: block; max-width: 100%; max-height: 100%; object-fit: contain; image-rendering: pixelated; }
  </style>
</head>
<body>
<canvas id="game"></canvas>
<script>
// === CONFIGURACIÓN ===
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// Portrait: const W = 480, H = 640  |  Landscape: const W = 960, H = 540
// Elegí según la tabla de orientación en quality-rules.md
const W = 480, H = 640;
canvas.width = W;
canvas.height = H;

// === ESTADOS DEL JUEGO ===
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

// === CONTROLES ===
const teclas = {};
document.addEventListener('keydown', e => {
  teclas[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (estado === ESTADO.MENU) iniciarJuego();
    else if (estado === ESTADO.GAMEOVER) reiniciar();
  }
});
document.addEventListener('keyup', e => { teclas[e.code] = false; });

// === ENTIDADES ===
const jugador = { x: W / 2, y: H - 120, color: '#4A90E2', tam: 40 };
const items = [{ x: W / 2, y: 200 }];

function dibujarPersonaje(x, y, color, tam) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + tam * 0.4, tam * 0.5, tam * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - tam * 0.3, y - tam * 0.2, tam * 0.6, tam * 0.5);
  ctx.beginPath();
  ctx.arc(x, y - tam * 0.35, tam * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(x - tam * 0.12, y - tam * 0.4, tam * 0.1, 0, Math.PI * 2);
  ctx.arc(x + tam * 0.12, y - tam * 0.4, tam * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x - tam * 0.1, y - tam * 0.4, tam * 0.05, 0, Math.PI * 2);
  ctx.arc(x + tam * 0.1, y - tam * 0.4, tam * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarEnemigo(x, y, tam) {
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(x - tam * 0.3, y - tam * 0.2, tam * 0.6, tam * 0.5);
  ctx.beginPath();
  ctx.arc(x, y - tam * 0.35, tam * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(x - tam * 0.1, y - tam * 0.38, tam * 0.08, 0, Math.PI * 2);
  ctx.arc(x + tam * 0.1, y - tam * 0.38, tam * 0.08, 0, Math.PI * 2);
  ctx.fill();
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

function gameOver() {
  estado = ESTADO.GAMEOVER;
  // Reportar score
  window.parent.postMessage({ type: 'GAME_SCORE', score: score }, '*');
}

// === PANTALLAS ===
function dibujarMenu() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TITULO_DEL_JUEGO', W/2, H/3);
  ctx.font = '20px sans-serif';
  ctx.fillText('Presioná ESPACIO para jugar', W/2, H/2);
}

function dibujarHUD() {
  ctx.fillStyle = '#FFF';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 30);
  ctx.textAlign = 'right';
  ctx.fillText('Nivel: ' + nivel, W - 10, 30);
}

function dibujarGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W/2, H/3);
  ctx.font = '24px sans-serif';
  ctx.fillText('Score: ' + score, W/2, H/2);
  ctx.font = '18px sans-serif';
  ctx.fillText('Presioná ESPACIO para reiniciar', W/2, H/2 + 50);
}

// === GAME LOOP ===
function update(dt) {
  if (estado !== ESTADO.JUGANDO) return;
  // Actualizar lógica del juego usando dt...
  // Ejemplo: jugador.x += velocidad * dt;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (estado === ESTADO.MENU) { dibujarMenu(); return; }
  if (estado === ESTADO.GAMEOVER) { dibujarGameOver(); return; }
  // Dibujar juego — REGLA DE ORO: protagonista y enemigos con formas, no emojis
  dibujarPersonaje(jugador.x, jugador.y, jugador.color, jugador.tam);
  // dibujarEnemigo(enemigo.x, enemigo.y, 36);
  ctx.font = '28px serif';
  items.forEach(item => ctx.fillText('\u2B50', item.x, item.y));
  dibujarHUD();
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.1) { requestAnimationFrame(gameLoop); return; }
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
</script>
</body>
</html>
```

## Notas para Andy

- Resolución fija: **480×640 (portrait)** o **960×540 (landscape)** según género/tipo — ver tabla en `quality-rules.md`. No alternar sin criterio; el plataformer va landscape, el Tetris portrait, etc.
- **Nunca** pongas `width`/`height` en la tag `<canvas>` — solo `canvas.width` / `canvas.height` en JS (el parser da prioridad a la tag y puede contradecir el `const W, H`).
- No implementes escalado responsivo dentro del juego; el contenedor usa `object-fit: contain`.
- `image-rendering: pixelated` en CSS hace que las formas se vean n\u00edtidas
- El game loop usa `requestAnimationFrame` — nunca `setInterval`
- `update(dt)` recibe delta time en segundos — **TODO** movimiento debe multiplicar por `dt`
- El guard `if (dt > 0.1)` evita saltos enormes cuando el tab estaba inactivo
- **NUNCA** usar `gameLoop()` sin par\u00e1metro — siempre `requestAnimationFrame(gameLoop)` para que el browser pase el `timestamp`
- **REGLA DE ORO:** protagonista y enemigos SIEMPRE con `dibujarPersonaje()` / `dibujarEnemigo()` (formas compuestas). Emojis solo para \u00edtems coleccionables: `ctx.font = '28px serif'; ctx.fillText('\u2B50', x, y);`
- Para colisiones simples: comparar rectangulos con función utilitaria
- Estados del juego con constantes numéricas (rápido y eficiente)
- Controles con objeto `teclas` — consultar `teclas['ArrowLeft']` en update(dt); al mover con teclas, usar `velocidad * dt`
