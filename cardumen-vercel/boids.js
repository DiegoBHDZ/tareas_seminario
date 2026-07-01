import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FpsMeter } from '../src/shared/FpsMeter.js';

const DEFAULT_COUNT = 50;
const MAX_COUNT = 300;
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

export function createBoidsSwarm(canvas, hud) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06101b);
  scene.fog = new THREE.FogExp2(0x06101b, 0.014);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 17, 52);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 5, 0);
  controls.maxDistance = 150;

  scene.add(new THREE.HemisphereLight(0xb8e8ff, 0x06111d, 2.1));
  const sun = new THREE.DirectionalLight(0xffefcf, 1.9);
  sun.position.set(-12, 24, 10);
  scene.add(sun);

  const seabed = new THREE.Mesh(
    new THREE.CircleGeometry(60, 48),
    new THREE.MeshStandardMaterial({ color: 0x0c2032, roughness: 1 })
  );
  seabed.rotation.x = -Math.PI / 2;
  scene.add(seabed);

  const fps = new FpsMeter(hud.fpsEl);

  const posX = new Float32Array(MAX_COUNT);
  const posY = new Float32Array(MAX_COUNT);
  const posZ = new Float32Array(MAX_COUNT);
  const velX = new Float32Array(MAX_COUNT);
  const velY = new Float32Array(MAX_COUNT);
  const velZ = new Float32Array(MAX_COUNT);
  const phase = new Float32Array(MAX_COUNT);
  const scaleArr = new Float32Array(MAX_COUNT);

  for (let i = 0; i < MAX_COUNT; i += 1) {
    posX[i] = THREE.MathUtils.randFloatSpread(BOUNDS.x * 1.7);
    posY[i] = THREE.MathUtils.randFloat(1.0, BOUNDS.y);
    posZ[i] = THREE.MathUtils.randFloatSpread(BOUNDS.z * 1.7);
    phase[i] = Math.random() * Math.PI * 2;
    scaleArr[i] = THREE.MathUtils.randFloat(0.5, 1.15);

    const yaw = Math.random() * Math.PI * 2;
    const pitch = THREE.MathUtils.randFloat(-0.28, 0.28);
    const speed = THREE.MathUtils.randFloat(1.4, 2.8);
    velX[i] = Math.sin(yaw) * Math.cos(pitch) * speed;
    velY[i] = Math.sin(pitch) * speed * 0.5;
    velZ[i] = Math.cos(yaw) * Math.cos(pitch) * speed;
  }

  const state = {
    count: DEFAULT_COUNT,
    wSep: 1.45,
    wAli: 1.0,
    wCoh: 0.95,
    perceptionRadius: 9.5,
    maxSpeed: 3.2,
    maxForce: 4.0,
    avgNeighbors: 0,
    activeCells: 0,
  };

  let cellSize = state.perceptionRadius;
  const grid = new Map();
  const dummy = new THREE.Object3D();
  const position = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const separation = new THREE.Vector3();
  const alignment = new THREE.Vector3();
  const cohesion = new THREE.Vector3();
  const desired = new THREE.Vector3();

  let boidMesh = null;
  let material = null;

  function keyFor(ix, iy, iz) {
    return `${ix}|${iy}|${iz}`;
  }

  function clearGrid() {
    grid.clear();
  }

  function insertIntoGrid(index) {
    const ix = Math.floor(posX[index] / cellSize);
    const iy = Math.floor(posY[index] / cellSize);
    const iz = Math.floor(posZ[index] / cellSize);
    const key = keyFor(ix, iy, iz);
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  }

  function buildGrid() {
    clearGrid();
    for (let i = 0; i < state.count; i += 1) insertIntoGrid(i);
    state.activeCells = grid.size;
  }

  function limitVector(vec, maxLength) {
    const lenSq = vec.lengthSq();
    if (lenSq > maxLength * maxLength && lenSq > 0) {
      vec.multiplyScalar(maxLength / Math.sqrt(lenSq));
    }
  }

  function wrapPosition(i) {
    if (posX[i] > BOUNDS.x) posX[i] = -BOUNDS.x;
    else if (posX[i] < -BOUNDS.x) posX[i] = BOUNDS.x;

    if (posZ[i] > BOUNDS.z) posZ[i] = -BOUNDS.z;
    else if (posZ[i] < -BOUNDS.z) posZ[i] = BOUNDS.z;

    if (posY[i] > BOUNDS.y) {
      posY[i] = BOUNDS.y;
      velY[i] *= -0.6;
    } else if (posY[i] < 0.9) {
      posY[i] = 0.9;
      velY[i] *= -0.6;
    }
  }

  function syncInstanceMatrix(i, elapsed) {
    position.set(posX[i], posY[i], posZ[i]);
    velocity.set(velX[i], velY[i], velZ[i]);
    const yaw = Math.atan2(velocity.x, velocity.z);
    const flatSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const pitch = Math.atan2(velocity.y, flatSpeed) * 0.75;

    dummy.position.copy(position);
    dummy.rotation.set(pitch, yaw, -velocity.x * 0.03);
    dummy.scale.setScalar(scaleArr[i]);
    dummy.updateMatrix();
    boidMesh.setMatrixAt(i, dummy.matrix);
  }

  function updateBoids(dt, elapsed) {
    if (!boidMesh) return;

    buildGrid();
    const perceptionSq = state.perceptionRadius * state.perceptionRadius;
    const separationSq = perceptionSq * 0.2025;
    const neighborRange = Math.ceil(state.perceptionRadius / cellSize);
    let neighborSum = 0;

    for (let i = 0; i < state.count; i += 1) {
      const px = posX[i];
      const py = posY[i];
      const pz = posZ[i];
      const vx = velX[i];
      const vy = velY[i];
      const vz = velZ[i];
      const cellX = Math.floor(px / cellSize);
      const cellY = Math.floor(py / cellSize);
      const cellZ = Math.floor(pz / cellSize);

      separation.set(0, 0, 0);
      alignment.set(0, 0, 0);
      cohesion.set(0, 0, 0);

      let neighbors = 0;
      for (let dx = -neighborRange; dx <= neighborRange; dx += 1) {
        for (let dy = -neighborRange; dy <= neighborRange; dy += 1) {
          for (let dz = -neighborRange; dz <= neighborRange; dz += 1) {
            const bucket = grid.get(keyFor(cellX + dx, cellY + dy, cellZ + dz));
            if (!bucket) continue;
            for (let b = 0; b < bucket.length; b += 1) {
              const j = bucket[b];
              if (j === i) continue;

              const ox = posX[j] - px;
              const oy = posY[j] - py;
              const oz = posZ[j] - pz;
              const distSq = ox * ox + oy * oy + oz * oz;
              if (distSq < 1e-8 || distSq > perceptionSq) continue;

              neighbors += 1;
              alignment.x += velX[j];
              alignment.y += velY[j];
              alignment.z += velZ[j];
              cohesion.x += posX[j];
              cohesion.y += posY[j];
              cohesion.z += posZ[j];

              if (distSq < separationSq) {
                const inv = 1 / distSq;
                separation.x -= ox * inv;
                separation.y -= oy * inv;
                separation.z -= oz * inv;
              }
            }
          }
        }
      }

      neighborSum += neighbors;

      if (neighbors > 0) {
        alignment.multiplyScalar(1 / neighbors);
        if (alignment.lengthSq() > 0) alignment.setLength(state.maxSpeed).sub(velocity.set(vx, vy, vz));
        else alignment.set(0, 0, 0);

        cohesion.multiplyScalar(1 / neighbors);
        cohesion.sub(position.set(px, py, pz));
        if (cohesion.lengthSq() > 0) cohesion.setLength(state.maxSpeed).sub(velocity.set(vx, vy, vz));
        else cohesion.set(0, 0, 0);

        if (separation.lengthSq() > 0) separation.setLength(state.maxSpeed).sub(velocity.set(vx, vy, vz));
        else separation.set(0, 0, 0);
      }

      desired.set(0, 0, 0)
        .addScaledVector(separation, state.wSep)
        .addScaledVector(alignment, state.wAli)
        .addScaledVector(cohesion, state.wCoh);

      limitVector(desired, state.maxForce);

      velX[i] += desired.x * dt;
      velY[i] += desired.y * dt;
      velZ[i] += desired.z * dt;

      velX[i] += Math.sin(elapsed * 0.45 + phase[i]) * 0.02 * dt;
      velY[i] += Math.cos(elapsed * 0.31 + phase[i]) * 0.012 * dt;

      const currentSpeed = Math.sqrt(velX[i] * velX[i] + velY[i] * velY[i] + velZ[i] * velZ[i]);
      if (currentSpeed > state.maxSpeed && currentSpeed > 0) {
        const ratio = state.maxSpeed / currentSpeed;
        velX[i] *= ratio;
        velY[i] *= ratio;
        velZ[i] *= ratio;
      }

      posX[i] += velX[i] * dt;
      posY[i] += velY[i] * dt;
      posZ[i] += velZ[i] * dt;

      wrapPosition(i);
      syncInstanceMatrix(i, elapsed);
    }

    boidMesh.instanceMatrix.needsUpdate = true;
    state.avgNeighbors = neighborSum / state.count;
  }

  const loader = new GLTFLoader();
  loader.load(
    '../models/clown_fish_low_poly_animated.glb',
    (gltf) => {
      let sourceMesh = null;
      gltf.scene.traverse((obj) => {
        if (obj.isMesh && !sourceMesh) sourceMesh = obj;
      });

      if (!sourceMesh) throw new Error('El GLB no contiene un mesh renderizable.');

      const geometry = sourceMesh.geometry.clone();
      geometry.deleteAttribute('skinIndex');
      geometry.deleteAttribute('skinWeight');
      geometry.computeBoundingBox();

      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      const normalize = 2.5 / Math.max(size.x, size.y, size.z);
      geometry.scale(normalize, normalize, normalize);
      geometry.rotateY(Math.PI);

      geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phase, 1));

      const gradientMap = createToonGradientMap();
      material = new THREE.MeshToonMaterial({
        color: sourceMesh.material.color?.clone?.() ?? new THREE.Color(0xffffff),
        map: sourceMesh.material.map ?? null,
        gradientMap,
        fog: true,
        transparent: Boolean(sourceMesh.material.transparent),
        alphaTest: sourceMesh.material.alphaTest ?? 0,
      });
      material.side = THREE.DoubleSide;
      material.depthWrite = sourceMesh.material.depthWrite;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWobbleStrength = { value: 0.055 };
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nattribute float instancePhase;\nuniform float uTime;\nuniform float uWobbleStrength;'
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float wobbleWave = sin(uTime * 3.2 + instancePhase * 6.28318 + position.y * 7.0);
float tailPulse = sin(uTime * 5.6 + instancePhase * 11.0 + position.z * 12.0);
transformed += normal * (wobbleWave * 0.032 + tailPulse * 0.022) * uWobbleStrength;`
          );
        material.userData.shader = shader;
      };
      material.needsUpdate = true;

      boidMesh = new THREE.InstancedMesh(geometry, material, MAX_COUNT);
      boidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      boidMesh.count = state.count;
      scene.add(boidMesh);

      for (let i = 0; i < state.count; i += 1) {
        syncInstanceMatrix(i, 0);
      }
      boidMesh.instanceMatrix.needsUpdate = true;

      hud.onReady?.(state.count, MAX_COUNT);
    },
    undefined,
    (err) => {
      console.error('Error cargando el cardumen:', err);
      hud.onError?.(err);
    }
  );

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
    if (material?.userData?.shader) material.userData.shader.uniforms.uTime.value = elapsed;
    updateBoids(dt, elapsed);
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
    setCount(value) {
      state.count = THREE.MathUtils.clamp(value, 1, MAX_COUNT);
      if (boidMesh) boidMesh.count = state.count;
      return state.count;
    },
    setWeights(weights) {
      if (typeof weights.sep === 'number') state.wSep = weights.sep;
      if (typeof weights.ali === 'number') state.wAli = weights.ali;
      if (typeof weights.coh === 'number') state.wCoh = weights.coh;
    },
    setPerceptionRadius(value) {
      state.perceptionRadius = THREE.MathUtils.clamp(value, 3, 18);
      cellSize = state.perceptionRadius;
    },
    setMaxSpeed(value) {
      state.maxSpeed = THREE.MathUtils.clamp(value, 0.8, 6);
    },
    getStats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        avgNeighbors: state.avgNeighbors,
        activeCells: state.activeCells,
      };
    },
  };
}