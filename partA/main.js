import { createRobotArmScene }    from '../src/webgl2/RobotArm.js';
import { createSolarSystemScene } from '../src/webgl2/SolarSystem.js';
import { buildRobotControls, buildSolarControls } from '../src/shared/controls-ui.js';

const canvas    = document.getElementById('gl');
const tabs      = document.querySelectorAll('.tab');
const ctrlTitle = document.getElementById('ctrlTitle');
const ctrlBody  = document.getElementById('ctrlBody');

let active = null;

const SCENES = {
  robot: {
    title: 'Brazo robótico',
    factory: () => createRobotArmScene(canvas),
    buildControls: (scene) => { buildRobotControls(ctrlBody, scene); },
  },
  solar: {
    title: 'Sistema solar',
    factory: () => createSolarSystemScene(canvas),
    buildControls: (scene) => { buildSolarControls(ctrlBody, scene); },
  },
};

function switchScene(name) {
  if (active) active.stop();
  try {
    const def = SCENES[name];
    ctrlTitle.textContent = def.title;
    active = def.factory();
    def.buildControls(active);
    active.start();
  } catch (err) {
    console.error(err);
    ctrlBody.innerHTML = `<p style="color:#f88;font-size:.8rem">${err.message}</p>`;
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    switchScene(tab.dataset.scene);
  });
});

window.addEventListener('resize', () => { if (active) active.resize(); });

switchScene('robot');
