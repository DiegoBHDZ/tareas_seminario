import { createFishSwarmInstanced } from '../src/instancing/FishSwarm.js';

const canvas    = document.getElementById('gl');
const fpsVal    = document.getElementById('fpsVal');
const drawCalls = document.getElementById('drawCalls');
const triCount  = document.getElementById('triCount');
const countSlider = document.getElementById('countSlider');
const countVal  = document.getElementById('countVal');
const errDiv    = document.getElementById('err');
const errMsg    = document.getElementById('errMsg');

const scene = createFishSwarmInstanced(canvas, {
  fpsEl: fpsVal,
  onReady(max, initial) {
    countSlider.max = String(max);
    countSlider.value = String(initial);
    countVal.textContent = String(initial);
  },
  onError(err) {
    errMsg.textContent = '⚠ ' + err.message;
    errDiv.style.display = 'flex';
  },
});

countSlider.addEventListener('input', () => {
  const n = scene.setCount(Number(countSlider.value));
  countVal.textContent = String(n);
});

function updateRendererStats() {
  const stats = scene.getStats();
  drawCalls.textContent = String(stats.calls);
  triCount.textContent = stats.triangles.toLocaleString('es-MX');
  requestAnimationFrame(updateRendererStats);
}
updateRendererStats();

window.addEventListener('resize', () => scene.resize());

scene.resize();
scene.start();
