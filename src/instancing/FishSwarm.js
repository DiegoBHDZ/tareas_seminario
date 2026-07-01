import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FpsMeter } from '../shared/FpsMeter.js';

const MAX_INSTANCES = 2000;
const DEFAULT_INSTANCES = 100;
const BOUNDS = { x: 30, y: 11, z: 30 };

function createToonGradientMap() {
  const data = new Uint8Array([
    18, 18, 18, 255,
    72, 72, 72, 255,
    150, 150, 150, 255,
    255, 255, 255, 255,
  ]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function createFishSwarmInstanced(canvas, hud) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071521);
  scene.fog = new THREE.FogExp2(0x071521, 0.014);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 16, 48);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 5, 0);
  controls.maxDistance = 140;

  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0d2031, 2.2));
  const sun = new THREE.DirectionalLight(0xfff2d7, 1.9);
  sun.position.set(-12, 22, 12);
  scene.add(sun);

  const seabed = new THREE.Mesh(
    new THREE.CircleGeometry(60, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d2030, roughness: 1 })
  );
  seabed.rotation.x = -Math.PI / 2;
  scene.add(seabed);

  const fps = new FpsMeter(hud.fpsEl);

  // Per-instance simulation state, pre-allocated for MAX_INSTANCES to allow
  // scaling the active count at runtime without reallocating typed arrays.
  const posX = new Float32Array(MAX_INSTANCES);
  const posY = new Float32Array(MAX_INSTANCES);
  const posZ = new Float32Array(MAX_INSTANCES);
  const heading = new Float32Array(MAX_INSTANCES);
  const speed = new Float32Array(MAX_INSTANCES);
  const phase = new Float32Array(MAX_INSTANCES);
  const scaleArr = new Float32Array(MAX_INSTANCES);
  const turnRate = new Float32Array(MAX_INSTANCES);

  for (let i = 0; i < MAX_INSTANCES; i += 1) {
    posX[i] = THREE.MathUtils.randFloatSpread(BOUNDS.x * 2);
    posY[i] = THREE.MathUtils.randFloat(1, BOUNDS.y);
    posZ[i] = THREE.MathUtils.randFloatSpread(BOUNDS.z * 2);
    heading[i] = Math.random() * Math.PI * 2;
    speed[i] = THREE.MathUtils.randFloat(1.6, 3.4);
    phase[i] = Math.random() * Math.PI * 2;
    scaleArr[i] = THREE.MathUtils.randFloat(0.55, 1.25);
    turnRate[i] = THREE.MathUtils.randFloat(-0.6, 0.6);
  }

  const dummy = new THREE.Object3D();
  let instancedMesh = null;
  let activeCount = DEFAULT_INSTANCES;

  const loader = new GLTFLoader();
  loader.load(
    '../models/clown_fish_low_poly_animated.glb',
    (gltf) => {
      let sourceMesh = null;
      gltf.scene.traverse((obj) => {
        if (obj.isMesh && !sourceMesh) sourceMesh = obj;
      });
      if (!sourceMesh) throw new Error('El GLB no contiene ningún mesh.');

      const geometry = sourceMesh.geometry.clone();
      geometry.deleteAttribute('skinIndex');
      geometry.deleteAttribute('skinWeight');
      geometry.computeBoundingBox();

      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      const normalize = 2.6 / Math.max(size.x, size.y, size.z);
      geometry.scale(normalize, normalize, normalize);
      geometry.rotateY(Math.PI);
      geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phase, 1));

      const gradientMap = createToonGradientMap();
      const material = new THREE.MeshToonMaterial({
        color: sourceMesh.material.color?.clone?.() ?? new THREE.Color(0xffffff),
        map: sourceMesh.material.map ?? null,
        gradientMap,
        fog: true,
        transparent: Boolean(sourceMesh.material.transparent),
        alphaTest: sourceMesh.material.alphaTest ?? 0,
      });
      material.side = sourceMesh.material.side;
      material.depthWrite = sourceMesh.material.depthWrite;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWobbleStrength = { value: 0.05 };
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nattribute float instancePhase;\nuniform float uTime;\nuniform float uWobbleStrength;'
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float wobbleWave = sin(uTime * 3.4 + instancePhase * 6.28318 + position.y * 7.5);
float tailPulse = sin(uTime * 6.0 + instancePhase * 11.0 + position.z * 12.0);
transformed += normal * (wobbleWave * 0.035 + tailPulse * 0.02) * uWobbleStrength;`
          );
        material.userData.shader = shader;
      };
      material.needsUpdate = true;

      instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instancedMesh.count = activeCount;
      scene.add(instancedMesh);
      hud.onReady?.(MAX_INSTANCES, DEFAULT_INSTANCES);
    },
    undefined,
    (err) => {
      console.error('Error cargando el GLB del pez:', err);
      hud.onError?.(err);
    }
  );

  function updateInstances(dt, elapsed) {
    if (!instancedMesh) return;
    const count = instancedMesh.count;
    for (let i = 0; i < count; i += 1) {
      heading[i] += turnRate[i] * dt * 0.2 + Math.sin(elapsed * 0.5 + phase[i]) * dt * 0.3;
      posX[i] += Math.cos(heading[i]) * speed[i] * dt;
      posZ[i] += Math.sin(heading[i]) * speed[i] * dt;
      posY[i] += Math.sin(elapsed * 1.3 + phase[i]) * dt * 0.6;

      if (posX[i] > BOUNDS.x) posX[i] = -BOUNDS.x;
      else if (posX[i] < -BOUNDS.x) posX[i] = BOUNDS.x;
      if (posZ[i] > BOUNDS.z) posZ[i] = -BOUNDS.z;
      else if (posZ[i] < -BOUNDS.z) posZ[i] = BOUNDS.z;
      if (posY[i] > BOUNDS.y) posY[i] = BOUNDS.y;
      else if (posY[i] < 0.6) posY[i] = 0.6;

      dummy.position.set(posX[i], posY[i], posZ[i]);
      dummy.rotation.set(Math.sin(elapsed * 4 + phase[i]) * 0.08, heading[i], 0);
      dummy.scale.setScalar(scaleArr[i]);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  let rafId = 0;
  let running = false;
  let last = performance.now();
  const t0 = last;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const elapsed = (now - t0) / 1000;

    controls.update();
    if (instancedMesh?.material?.userData?.shader) {
      instancedMesh.material.userData.shader.uniforms.uTime.value = elapsed;
    }
    updateInstances(dt, elapsed);
    renderer.render(scene, camera);
    fps.tick(now);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    resize,
    setCount(n) {
      activeCount = THREE.MathUtils.clamp(n, 1, MAX_INSTANCES);
      if (instancedMesh) instancedMesh.count = activeCount;
      return activeCount;
    },
    getCount() {
      return activeCount;
    },
    getStats() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    maxInstances: MAX_INSTANCES,
  };
}
