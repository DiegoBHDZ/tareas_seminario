import * as THREE from 'three/webgpu';
import {
  uniform, vec3, normalize, dot, max, pow, add, mul,
  positionWorld, normalWorld, cameraPosition,
} from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function blinnPhongMat({ diffuseColor, specularColor, shininess, emissive = 0 }) {
  const lightPos   = uniform(new THREE.Vector3(6, 8, 5));
  const lightColor = uniform(new THREE.Color(1, 1, 1));
  const N = normalize(normalWorld);
  const L = normalize(lightPos.sub(positionWorld));
  const V = normalize(cameraPosition.sub(positionWorld));
  const H = normalize(L.add(V));
  const ambient  = mul(vec3(0.15, 0.15, 0.2), lightColor).mul(0.25);
  const diff     = max(dot(N, L), 0);
  const diffuse  = mul(diff, mul(vec3(...diffuseColor), lightColor));
  const spec     = pow(max(dot(N, H), 0), shininess);
  const specular = mul(spec, mul(vec3(...specularColor), lightColor));
  const emission = mul(vec3(...diffuseColor), emissive);
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = add(add(add(ambient, diffuse), specular), emission);
  return mat;
}

export function createRobotArmTSL(canvas) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14141e);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(5, 6, 8);
  camera.lookAt(0, 2, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 2, 0);

  const matBase   = blinnPhongMat({ diffuseColor:[0.3,0.3,0.9], specularColor:[0.8,0.8,1.0], shininess:64  });
  const matUpper  = blinnPhongMat({ diffuseColor:[0.2,0.7,0.3], specularColor:[0.6,1.0,0.6], shininess:48  });
  const matLower  = blinnPhongMat({ diffuseColor:[0.8,0.5,0.1], specularColor:[1.0,0.8,0.4], shininess:48  });
  const matJoint  = blinnPhongMat({ diffuseColor:[0.9,0.2,0.2], specularColor:[1.0,0.6,0.6], shininess:96, emissive:0.05 });
  const matFinger = blinnPhongMat({ diffuseColor:[0.7,0.7,0.7], specularColor:[1.0,1.0,1.0], shininess:128 });

  function mkMesh(geo, mat) { return new THREE.Mesh(geo, mat); }

  // BASE — eslabón 1
  const baseGroup = new THREE.Group();
  scene.add(baseGroup);
  baseGroup.add(mkMesh(new THREE.CylinderGeometry(1.0, 1.0, 0.25, 32), matBase));

  const platform = mkMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32), matJoint);
  platform.position.y = 0.18;
  baseGroup.add(platform);

  // HOMBRO — eslabón 2
  const shoulderPivot = new THREE.Group();
  shoulderPivot.position.y = 0.3;
  baseGroup.add(shoulderPivot);
  shoulderPivot.add(mkMesh(new THREE.SphereGeometry(0.22, 16, 12), matJoint));

  const upperArm = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 20), matUpper);
  upperArm.position.y = 0.75;
  shoulderPivot.add(upperArm);

  // CODO — eslabón 3
  const elbowPivot = new THREE.Group();
  elbowPivot.position.y = 1.5;
  shoulderPivot.add(elbowPivot);
  elbowPivot.add(mkMesh(new THREE.SphereGeometry(0.22, 16, 12), matJoint));

  const lowerArm = mkMesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 20), matLower);
  lowerArm.position.y = 0.6;
  elbowPivot.add(lowerArm);

  // MUÑECA — eslabón 4
  const wristPivot = new THREE.Group();
  wristPivot.position.y = 1.2;
  elbowPivot.add(wristPivot);
  wristPivot.add(mkMesh(new THREE.SphereGeometry(0.22, 16, 12), matJoint));

  // DEDOS — eslabones 5a y 5b
  const finger1Pivot = new THREE.Group();
  finger1Pivot.position.set(0.18, 0.19, 0);
  wristPivot.add(finger1Pivot);
  const f1 = mkMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 12), matFinger);
  f1.position.y = 0.19;
  finger1Pivot.add(f1);

  const finger2Pivot = new THREE.Group();
  finger2Pivot.position.set(-0.18, 0.19, 0);
  wristPivot.add(finger2Pivot);
  const f2 = mkMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 12), matFinger);
  f2.position.y = 0.19;
  finger2Pivot.add(f2);

  const state = {
    auto: true,
    base: 0, shoulder: 0.3, elbow: -0.4,
    wrist: 0.2, finger1: 0.3, finger2: -0.3,
  };

  let _raf = 0;
  function update(elapsed) {
    if (state.auto) {
      state.base     = elapsed * 0.4;
      state.shoulder = Math.sin(elapsed * 0.8) * 0.7 + 0.2;
      state.elbow    = Math.sin(elapsed * 1.1 + 1) * 0.6 - 0.3;
      state.wrist    = Math.sin(elapsed * 1.6) * 0.5;
      state.finger1  =  Math.sin(elapsed * 2.2) * 0.35;
      state.finger2  = -Math.sin(elapsed * 2.2) * 0.35;
    }
    baseGroup.rotation.y      = state.base;
    shoulderPivot.rotation.z  = state.shoulder;
    elbowPivot.rotation.z     = state.elbow;
    wristPivot.rotation.z     = state.wrist;
    finger1Pivot.rotation.z   = state.finger1;
    finger2Pivot.rotation.z   = state.finger2;
    controls.update();
    renderer.render(scene, camera);
    _raf = requestAnimationFrame(t => update(t / 1000));
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
    _raf = requestAnimationFrame(t => update(t / 1000));
  }
  function stop() { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setAuto(v) { state.auto = v; },
    setAngle(joint, rad) { state[joint] = rad; },
    getState() { return state; },
  };
}
