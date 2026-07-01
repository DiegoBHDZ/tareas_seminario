import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FpsMeter } from '../shared/FpsMeter.js';
import { bakeBoneVAT } from './BoneVAT.js';
import { VAT_VERTEX, VAT_FRAGMENT } from './boneVatShader.js';

const INSTANCE_COUNT = 100;
const BOUNDS = { x: 30, y: 11, z: 30 };

export function createFishSwarmVAT(canvas, hud) {
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

  const seabed = new THREE.Mesh(
    new THREE.CircleGeometry(60, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d2030, roughness: 1 })
  );
  seabed.rotation.x = -Math.PI / 2;
  scene.add(seabed);

  const fps = new FpsMeter(hud.fpsEl);

  let instancedMesh = null;
  let material = null;

  const loader = new GLTFLoader();
  loader.load(
    '../models/clown_fish_low_poly_animated.glb',
    (gltf) => {
      const baked = bakeBoneVAT(gltf, 'swim');

      const geometry = baked.geometry.clone();
      geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      const normalize = 2.6 / Math.max(size.x, size.y, size.z);
      geometry.scale(normalize, normalize, normalize);
      geometry.rotateY(Math.PI);

      // Per-instance desync offset: each fish samples the baked clip at a
      // different point in time, purely via this attribute (no CPU mixer).
      const timeOffsets = new Float32Array(INSTANCE_COUNT);
      for (let i = 0; i < INSTANCE_COUNT; i += 1) {
        timeOffsets[i] = Math.random() * baked.duration;
      }
      geometry.setAttribute('timeOffset', new THREE.InstancedBufferAttribute(timeOffsets, 1));

      material = new THREE.ShaderMaterial({
        vertexShader: VAT_VERTEX,
        fragmentShader: VAT_FRAGMENT,
        side: THREE.DoubleSide,
        uniforms: {
          boneTexture: { value: baked.texture },
          numBones: { value: baked.numBones },
          numFrames: { value: baked.numFrames },
          duration: { value: baked.duration },
          time: { value: 0 },
          bindMatrix: { value: baked.bindMatrix },
          bindMatrixInverse: { value: baked.bindMatrixInverse },
          map: { value: baked.material.map },
          lightDir: { value: new THREE.Vector3(-0.4, -1, -0.3) },
          lightColor: { value: new THREE.Color(0xffffff) },
          ambientColor: { value: new THREE.Color(0x4a8bd8) },
          rimColor: { value: new THREE.Color(0x9ef1ff) },
          toonSteps: { value: 4.0 },
          viewPos: { value: camera.position },
        },
      });

      instancedMesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);

      // Static per-instance placement, set once. Unlike Part D, instance
      // matrices are never touched again per frame — all visible motion
      // (the swim cycle) comes from the GPU-side VAT lookup above.
      const dummy = new THREE.Object3D();
      for (let i = 0; i < INSTANCE_COUNT; i += 1) {
        dummy.position.set(
          THREE.MathUtils.randFloatSpread(BOUNDS.x * 2),
          THREE.MathUtils.randFloat(1, BOUNDS.y),
          THREE.MathUtils.randFloatSpread(BOUNDS.z * 2)
        );
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.setScalar(THREE.MathUtils.randFloat(0.55, 1.25));
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      scene.add(instancedMesh);
      hud.onReady?.(INSTANCE_COUNT, baked.numBones, baked.numFrames);
    },
    undefined,
    (err) => {
      console.error('Error horneando boneVAT:', err);
      hud.onError?.(err);
    }
  );

  let rafId = 0;
  let running = false;
  let last = performance.now();
  const t0 = last;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    last = now;
    const elapsed = (now - t0) / 1000;

    controls.update();
    if (material) material.uniforms.time.value = elapsed;
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
    getStats() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    instanceCount: INSTANCE_COUNT,
  };
}
