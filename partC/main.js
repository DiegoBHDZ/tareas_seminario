import { createRobotArmTSL }    from '../src/tsl/RobotArm.js';
import { createSolarSystemTSL } from '../src/tsl/SolarSystem.js';
import { buildRobotControls, buildSolarControls } from '../src/shared/controls-ui.js';

const canvas    = document.getElementById('tsl');
const tabs      = document.querySelectorAll('.tab');
const ctrlTitle = document.getElementById('ctrlTitle');
const ctrlBody  = document.getElementById('ctrlBody');
const errDiv    = document.getElementById('err');
const errMsg    = document.getElementById('errMsg');

let active = null;

const SCENES = {
  robot: {
    title: 'Brazo robótico',
    factory: () => createRobotArmTSL(canvas),
    buildControls: (scene) => buildRobotControls(ctrlBody, scene),
  },
  solar: {
    title: 'Sistema solar',
    factory: () => createSolarSystemTSL(canvas),
    buildControls: (scene) => buildSolarControls(ctrlBody, scene),
  },
};

async function switchScene(name) {
  if (active) active.stop();
  try {
    const def = SCENES[name];
    ctrlTitle.textContent = def.title;
    active = def.factory();
    await active.start();
    def.buildControls(active);
  } catch (err) {
    console.error(err);
    errMsg.textContent = '⚠ ' + err.message;
    errDiv.style.display = 'flex';
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
