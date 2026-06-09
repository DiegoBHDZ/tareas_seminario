import * as THREE from 'three/webgpu';
import {
  uniform, vec3, normalize, dot, max, pow, add, mul,
  positionWorld, normalWorld, cameraPosition,
} from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function blinnPhongMat({ diffuseColor, specularColor, shininess, emissive = 0 }) {
  const lightPos   = uniform(new THREE.Vector3(0, 0, 0));
  const lightColor = uniform(new THREE.Color(1.0, 0.95, 0.8));
  const N = normalize(normalWorld);
  const L = normalize(lightPos.sub(positionWorld));
  const V = normalize(cameraPosition.sub(positionWorld));
  const H = normalize(L.add(V));
  const ambient  = mul(vec3(0.04, 0.04, 0.07), lightColor).mul(0.25);
  const diff     = max(dot(N, L), 0);
  const diffuse  = mul(diff, mul(vec3(...diffuseColor), lightColor));
  const spec     = pow(max(dot(N, H), 0), shininess);
  const specular = mul(spec, mul(vec3(...specularColor), lightColor));
  const emission = mul(vec3(...diffuseColor), emissive);
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = add(add(add(ambient, diffuse), specular), emission);
  return mat;
}

export function createSolarSystemTSL(canvas) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020210);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.5, 500);
  camera.position.set(0, 20, 36);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const geoSphere = new THREE.SphereGeometry(1, 40, 24);
  const geoRing   = new THREE.TorusGeometry(1.6, 0.06, 8, 64);

  const BODIES = {
    sun:    { r:2.2,  diff:[1.0,0.85,0.1], spec:[1.0,1.0,0.5], shin:16,  emi:1.5 },
    earth:  { r:0.65, diff:[0.2,0.5,0.9],  spec:[0.5,0.7,1.0], shin:64,  emi:0   },
    moon:   { r:0.18, diff:[0.7,0.7,0.65], spec:[0.3,0.3,0.3], shin:16,  emi:0   },
    mars:   { r:0.48, diff:[0.8,0.35,0.15],spec:[0.5,0.3,0.2], shin:20,  emi:0   },
    phobos: { r:0.13, diff:[0.55,0.5,0.45],spec:[0.2,0.2,0.2], shin:12,  emi:0   },
    deimos: { r:0.10, diff:[0.5,0.48,0.44],spec:[0.2,0.2,0.2], shin:12,  emi:0   },
    saturn: { r:1.1,  diff:[0.85,0.75,0.5],spec:[0.6,0.6,0.4], shin:32,  emi:0   },
    titan:  { r:0.24, diff:[0.75,0.6,0.3], spec:[0.3,0.3,0.2], shin:20,  emi:0   },
    ring:   { r:1.0,  diff:[0.7,0.65,0.45],spec:[0.3,0.3,0.2], shin:8,   emi:0   },
  };

  // [dist, orbitSpeed, tilt, selfRotSpeed]
  const PLANETS = {
    earth:  [10, 1.0,  0.41, 3.5],
    mars:   [16, 0.53, 0.03, 3.3],
    saturn: [25, 0.28, 0.27, 2.8],
  };

  const MOONS = {
    earth:  [{ body:'moon',   dist:1.5, speed:13  }],
    mars:   [{ body:'phobos', dist:1.1, speed:22  },
             { body:'deimos', dist:1.7, speed:9   }],
    saturn: [{ body:'titan',  dist:2.0, speed:5   }],
  };

  let speedMult = 1.0;

  function mkSphere(b) {
    const m = new THREE.Mesh(geoSphere, blinnPhongMat(b));
    m.scale.setScalar(b.r);
    return m;
  }

  // Sol
  const sunMesh = mkSphere(BODIES.sun);
  scene.add(sunMesh);

  // Build planet hierarchy as { orbitPivot, selfRotGroup, moons: [pivot, ...] }
  const planetData = {};

  for (const [name, [dist, , tilt]] of Object.entries(PLANETS)) {
    const b = BODIES[name];

    const orbitPivot = new THREE.Group();
    scene.add(orbitPivot);

    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.x = tilt;
    tiltGroup.position.x = dist;
    orbitPivot.add(tiltGroup);

    const selfRot = new THREE.Group();
    tiltGroup.add(selfRot);

    selfRot.add(mkSphere(b));

    const moonPivots = [];
    for (const { body, dist: md } of MOONS[name]) {
      const mp = new THREE.Group();
      selfRot.add(mp);
      const moonMesh = mkSphere(BODIES[body]);
      moonMesh.position.x = md + b.r + 0.2;
      mp.add(moonMesh);
      moonPivots.push(mp);
    }

    if (name === 'saturn') {
      const ringGroup = new THREE.Group();
      ringGroup.scale.setScalar(b.r * 1.6);
      ringGroup.rotation.x = 0.45;
      selfRot.add(ringGroup);
      ringGroup.add(new THREE.Mesh(geoRing, blinnPhongMat(BODIES.ring)));
    }

    planetData[name] = { orbitPivot, selfRot, moonPivots };
  }

  let _raf = 0;
  function update(elapsed) {
    const t = elapsed * speedMult;
    sunMesh.rotation.y = elapsed * 0.2;

    for (const [name, [, orbitSpd, , selfSpd]] of Object.entries(PLANETS)) {
      const { orbitPivot, selfRot, moonPivots } = planetData[name];
      orbitPivot.rotation.y = t * orbitSpd;
      selfRot.rotation.y    = t * selfSpd;
      MOONS[name].forEach(({ speed }, i) => {
        moonPivots[i].rotation.y = t * speed;
      });
    }
    controls.update();
    renderer.render(scene, camera);
    _raf = requestAnimationFrame(ts => update(ts / 1000));
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  async function start() {
    await renderer.init();
    resize();
    _raf = requestAnimationFrame(ts => update(ts / 1000));
  }
  function stop() { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setSpeed(v) { speedMult = v; },
  };
}
