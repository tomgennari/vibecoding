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
// Definir jugador, enemigos, items, etc.

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
function update() {
  if (estado !== ESTADO.JUGANDO) return;
  // Actualizar lógica del juego...
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (estado === ESTADO.MENU) { dibujarMenu(); return; }
  if (estado === ESTADO.GAMEOVER) { dibujarGameOver(); return; }
  // Dibujar juego...
  dibujarHUD();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
</script>
</body>
</html>
```

## Notas para Andy

- El canvas siempre es 480x640 (portrait) o 640x480 (landscape)
- `image-rendering: pixelated` en CSS hace que los emojis y formas se vean nítidos
- El game loop usa `requestAnimationFrame` — nunca `setInterval`
- Para emojis como sprites: `ctx.font = '48px serif'; ctx.fillText('🚀', x, y);`
- Para colisiones simples: comparar rectangulos con función utilitaria
- Estados del juego con constantes numéricas (rápido y eficiente)
- Controles con objeto `teclas` — consultar `teclas['ArrowLeft']` en update()
