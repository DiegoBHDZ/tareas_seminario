import { createFishSwarmVAT } from '../src/vat/FishSwarmVAT.js';

const canvas    = document.getElementById('gl');
const fpsVal    = document.getElementById('fpsVal');
const drawCalls = document.getElementById('drawCalls');
const countVal  = document.getElementById('countVal');
const boneVal   = document.getElementById('boneVal');
const frameVal  = document.getElementById('frameVal');
const errDiv    = document.getElementById('err');
const errMsg    = document.getElementById('errMsg');

const scene = createFishSwarmVAT(canvas, {
  fpsEl: fpsVal,
  onReady(count, numBones, numFrames) {
    countVal.textContent = String(count);
    boneVal.textContent = String(numBones);
    frameVal.textContent = String(numFrames);
  },
  onError(err) {
    errMsg.textContent = '⚠ ' + err.message;
    errDiv.style.display = 'flex';
  },
});

function updateRendererStats() {
  const stats = scene.getStats();
  drawCalls.textContent = String(stats.calls);
  requestAnimationFrame(updateRendererStats);
}
updateRendererStats();

window.addEventListener('resize', () => scene.resize());

scene.resize();
scene.start();
