import * as THREE from 'three';

const BAKE_FPS = 24;

// Bakes one animation clip's bone transforms into a float DataTexture.
// Each bone occupies 4 consecutive texels per row (one mat4, column-major,
// matching THREE.Matrix4.toArray order), one row per sampled frame.
export function bakeBoneVAT(gltf, clipName) {
  let skinnedMesh = null;
  gltf.scene.traverse((obj) => {
    if (obj.isSkinnedMesh && !skinnedMesh) skinnedMesh = obj;
  });
  if (!skinnedMesh) throw new Error('El GLB no contiene un SkinnedMesh.');

  const clip = gltf.animations.find((c) => c.name === clipName) ?? gltf.animations[0];
  if (!clip) throw new Error('El GLB no contiene animaciones.');

  const skeleton = skinnedMesh.skeleton;
  const numBones = skeleton.bones.length;
  const numFrames = Math.max(2, Math.round(clip.duration * BAKE_FPS));

  const mixer = new THREE.AnimationMixer(gltf.scene);
  const action = mixer.clipAction(clip);
  action.play();

  const data = new Float32Array(numFrames * numBones * 16);
  for (let f = 0; f < numFrames; f += 1) {
    const t = (f / (numFrames - 1)) * clip.duration;
    mixer.setTime(t);
    gltf.scene.updateMatrixWorld(true);
    skeleton.update();
    data.set(skeleton.boneMatrices, f * numBones * 16);
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);

  const texture = new THREE.DataTexture(data, numBones * 4, numFrames, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    numBones,
    numFrames,
    duration: clip.duration,
    geometry: skinnedMesh.geometry,
    material: skinnedMesh.material,
    bindMatrix: skinnedMesh.bindMatrix.clone(),
    bindMatrixInverse: skinnedMesh.bindMatrixInverse.clone(),
  };
}
