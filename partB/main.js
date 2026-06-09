import { createRobotArmSceneGPU }    from '../src/webgpu/RobotArm.js';
import { createSolarSystemSceneGPU } from '../src/webgpu/SolarSystem.js';
import { buildRobotControls, buildSolarControls } from '../src/shared/controls-ui.js';

const canvas    = document.getElementById('gpu');
const tabs      = document.querySelectorAll('.tab');
const ctrlTitle = document.getElementById('ctrlTitle');
const ctrlBody  = document.getElementById('ctrlBody');
const errDiv    = document.getElementById('err');
const errMsg    = document.getElementById('errMsg');

let active = null;

const SCENES = {
  robot: {
    title: 'Brazo robótico',
    factory: () => createRobotArmSceneGPU(canvas),
    buildControls: (scene) => buildRobotControls(ctrlBody, scene),
  },
  solar: {
    title: 'Sistema solar',
    factory: () => createSolarSystemSceneGPU(canvas),
    buildControls: (scene) => buildSolarControls(ctrlBody, scene),
  },
};

async function switchScene(name) {
  if (active) active.stop();
  try {
    const def = SCENES[name];
    ctrlTitle.textContent = def.title;
    active = await def.factory();
    def.buildControls(active);
    active.start();
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
