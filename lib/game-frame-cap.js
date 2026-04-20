/**
 * Script inyectado antes del primer <script> del juego para limitar ~60fps vía requestAnimationFrame.
 * Si el HTML ya contiene FRAME_CAP_MARKER, no se vuelve a inyectar (idempotente).
 */
export const FRAME_CAP_MARKER = '/*__VIBE_FRAME_CAP__*/';

export const FRAME_CAP_SCRIPT = `<script>
${FRAME_CAP_MARKER}
(function() {
  var _raf = window.requestAnimationFrame;
  var lastFrame = 0;
  var minInterval = 1000 / 62;
  window.requestAnimationFrame = function(cb) {
    return _raf(function(ts) {
      if (ts - lastFrame >= minInterval) {
        lastFrame = ts;
        cb(ts);
      } else {
        _raf(function(ts2) { lastFrame = ts2; cb(ts2); });
      }
    });
  };
})();
</script>`;
