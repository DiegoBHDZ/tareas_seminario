import { createBoidsSwarm } from './boids.js';

const canvas = document.getElementById('gl');
const fpsVal = document.getElementById('fpsVal');
const drawCalls = document.getElementById('drawCalls');
const countVal = document.getElementById('countVal');
const neighborsVal = document.getElementById('neighborsVal');
const cellsVal = document.getElementById('cellsVal');
const countSlider = document.getElementById('countSlider');
const countOut = document.getElementById('countOut');
const wSep = document.getElementById('wSep');
const wAli = document.getElementById('wAli');
const wCoh = document.getElementById('wCoh');
const perception = document.getElementById('perception');
const speed = document.getElementById('speed');
const wSepOut = document.getElementById('wSepOut');
const wAliOut = document.getElementById('wAliOut');
const wCohOut = document.getElementById('wCohOut');
const perceptionOut = document.getElementById('perceptionOut');
const speedOut = document.getElementById('speedOut');
const errDiv = document.getElementById('err');
const errMsg = document.getElementById('errMsg');

const swarm = createBoidsSwarm(canvas, {
  fpsEl: fpsVal,
  onReady(count, maxCount) {
    countSlider.max = String(maxCount);
    countSlider.value = String(count);
    countVal.textContent = String(count);
    countOut.textContent = String(count);
  },
  onError(err) {
    errMsg.textContent = '⚠ ' + err.message;
    errDiv.style.display = 'flex';
  },
});

function syncWeights() {
  const weights = {
    sep: Number(wSep.value),
    ali: Number(wAli.value),
    coh: Number(wCoh.value),
  };
  swarm.setWeights(weights);
  wSepOut.textContent = weights.sep.toFixed(2);
  wAliOut.textContent = weights.ali.toFixed(2);
  wCohOut.textContent = weights.coh.toFixed(2);
}

function syncPerception() {
  const value = Number(perception.value);
  swarm.setPerceptionRadius(value);
  perceptionOut.textContent = value.toFixed(2);
}

function syncSpeed() {
  const value = Number(speed.value);
  swarm.setMaxSpeed(value);
  speedOut.textContent = value.toFixed(2);
}

countSlider.addEventListener('input', () => {
  const value = swarm.setCount(Number(countSlider.value));
  countVal.textContent = String(value);
  countOut.textContent = String(value);
});
wSep.addEventListener('input', syncWeights);
wAli.addEventListener('input', syncWeights);
wCoh.addEventListener('input', syncWeights);
perception.addEventListener('input', syncPerception);
speed.addEventListener('input', syncSpeed);

syncWeights();
syncPerception();
syncSpeed();

function updateStats() {
  const stats = swarm.getStats();
  drawCalls.textContent = String(stats.calls);
  neighborsVal.textContent = stats.avgNeighbors.toFixed(1);
  cellsVal.textContent = String(stats.activeCells);
  requestAnimationFrame(updateStats);
}

window.addEventListener('resize', () => swarm.resize());

swarm.resize();
swarm.start();
updateStats();