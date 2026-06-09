// Builds and wires the control overlay panel for each scene type.

const JOINTS = [
  { id: 'base',     label: 'Base (Y)',    min: -Math.PI, max: Math.PI },
  { id: 'shoulder', label: 'Hombro (Z)', min: -1.4,     max: 1.4     },
  { id: 'elbow',    label: 'Codo (Z)',   min: -1.6,     max: 0.4     },
  { id: 'wrist',    label: 'Muñeca (Z)', min: -1.2,     max: 1.2     },
  { id: 'finger1',  label: 'Dedo 1 (Z)', min: -0.6,     max: 0.6     },
  { id: 'finger2',  label: 'Dedo 2 (Z)', min: -0.6,     max: 0.6     },
];

export function buildRobotControls(container, scene) {
  container.innerHTML = `
    <label class="ctrl-row ctrl-toggle">
      <input type="checkbox" id="autoToggle" checked />
      <span>Animación automática</span>
    </label>
    <div id="sliderGroup" class="slider-group disabled">
      ${JOINTS.map(j => `
        <label class="ctrl-row">
          <span class="ctrl-label">${j.label}</span>
          <input type="range" data-joint="${j.id}"
            min="${j.min.toFixed(3)}" max="${j.max.toFixed(3)}" step="0.01"
            value="${(j.min + j.max) / 2}" />
          <span class="ctrl-val" data-val="${j.id}">0.00</span>
        </label>`).join('')}
    </div>`;

  const autoToggle  = container.querySelector('#autoToggle');
  const sliderGroup = container.querySelector('#sliderGroup');
  const sliders     = container.querySelectorAll('input[type=range]');

  // Sync slider positions from current scene state
  function syncSliders() {
    const s = scene.getState();
    sliders.forEach(sl => {
      const joint = sl.dataset.joint;
      sl.value = s[joint] ?? 0;
      container.querySelector(`[data-val="${joint}"]`).textContent =
        Number(sl.value).toFixed(2);
    });
  }

  autoToggle.addEventListener('change', () => {
    const auto = autoToggle.checked;
    scene.setAuto(auto);
    sliderGroup.classList.toggle('disabled', auto);
    if (!auto) syncSliders();
  });

  sliders.forEach(sl => {
    sl.addEventListener('input', () => {
      const rad = parseFloat(sl.value);
      scene.setAngle(sl.dataset.joint, rad);
      container.querySelector(`[data-val="${sl.dataset.joint}"]`).textContent =
        rad.toFixed(2);
    });
  });
}

export function buildSolarControls(container, scene) {
  container.innerHTML = `
    <label class="ctrl-row">
      <span class="ctrl-label">Velocidad global</span>
      <input type="range" id="speedSlider" min="0" max="4" step="0.05" value="1" />
      <span class="ctrl-val" id="speedVal">1.00×</span>
    </label>
    <p class="ctrl-note">
      Sol → 3 planetas → 1-2 lunas<br>
      Tierra (1 luna) · Marte (2 lunas) · Saturno (1 luna + anillo)
    </p>`;

  const sl  = container.querySelector('#speedSlider');
  const val = container.querySelector('#speedVal');
  sl.addEventListener('input', () => {
    const v = parseFloat(sl.value);
    scene.setSpeed(v);
    val.textContent = v.toFixed(2) + '×';
  });
}
