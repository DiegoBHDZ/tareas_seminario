// Custom skinning shader driven entirely by a baked bone-VAT texture.
// No AnimationMixer, no per-frame CPU bone math: each instance reads its own
// animation frame from `boneTexture` using `timeOffset`, so cost stays O(1)
// per frame regardless of instance count.
export const VAT_VERTEX = /* glsl */ `
attribute float timeOffset;
attribute vec4 skinIndex;
attribute vec4 skinWeight;

uniform sampler2D boneTexture;
uniform float numBones;
uniform float numFrames;
uniform float duration;
uniform float time;
uniform mat4 bindMatrix;
uniform mat4 bindMatrixInverse;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

mat4 getBoneMatrix(float boneIndex, float frame) {
  float texWidth = numBones * 4.0;
  float u0 = (boneIndex * 4.0 + 0.5) / texWidth;
  float du = 1.0 / texWidth;
  float v  = (frame + 0.5) / numFrames;
  vec4 c0 = texture2D(boneTexture, vec2(u0, v));
  vec4 c1 = texture2D(boneTexture, vec2(u0 + du, v));
  vec4 c2 = texture2D(boneTexture, vec2(u0 + 2.0 * du, v));
  vec4 c3 = texture2D(boneTexture, vec2(u0 + 3.0 * du, v));
  return mat4(c0, c1, c2, c3);
}

void main() {
  float localTime = mod(time + timeOffset, duration);
  float framef = (localTime / duration) * numFrames;
  float f0 = floor(framef);
  float f1 = mod(f0 + 1.0, numFrames);
  float frac = framef - f0;

  vec4 skinVertex = bindMatrix * vec4(position, 1.0);
  vec4 skinNormal = vec4(normal, 0.0);

  mat4 bx0 = getBoneMatrix(skinIndex.x, f0);
  mat4 by0 = getBoneMatrix(skinIndex.y, f0);
  mat4 bz0 = getBoneMatrix(skinIndex.z, f0);
  mat4 bw0 = getBoneMatrix(skinIndex.w, f0);

  mat4 bx1 = getBoneMatrix(skinIndex.x, f1);
  mat4 by1 = getBoneMatrix(skinIndex.y, f1);
  mat4 bz1 = getBoneMatrix(skinIndex.z, f1);
  mat4 bw1 = getBoneMatrix(skinIndex.w, f1);

  vec4 pos0 = bx0 * skinVertex * skinWeight.x + by0 * skinVertex * skinWeight.y
            + bz0 * skinVertex * skinWeight.z + bw0 * skinVertex * skinWeight.w;
  vec4 pos1 = bx1 * skinVertex * skinWeight.x + by1 * skinVertex * skinWeight.y
            + bz1 * skinVertex * skinWeight.z + bw1 * skinVertex * skinWeight.w;
  vec4 skinnedPos = mix(pos0, pos1, frac);

  vec4 n0 = bx0 * skinNormal * skinWeight.x + by0 * skinNormal * skinWeight.y
          + bz0 * skinNormal * skinWeight.z + bw0 * skinNormal * skinWeight.w;
  vec4 n1 = bx1 * skinNormal * skinWeight.x + by1 * skinNormal * skinWeight.y
          + bz1 * skinNormal * skinWeight.z + bw1 * skinNormal * skinWeight.w;
  vec4 skinnedNormal = mix(n0, n1, frac);

  vec3 localPos    = (bindMatrixInverse * skinnedPos).xyz;
  vec3 localNormal = normalize((bindMatrixInverse * skinnedNormal).xyz);

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(localPos, 1.0);
  vNormal   = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * localNormal);
  vWorldPos = worldPos.xyz;
  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const VAT_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D map;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 rimColor;
uniform float toonSteps;
uniform vec3 viewPos;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(-lightDir);
  vec3 V = normalize(viewPos - vWorldPos);
  vec3 H = normalize(L + V);

  vec4 base = texture2D(map, vUv);
  float diff = max(dot(N, L), 0.0);
  float toon = floor(diff * toonSteps) / toonSteps;
  float spec = pow(max(dot(N, H), 0.0), 32.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);

  vec3 stylizedBase = mix(vec3(0.16, 0.84, 1.0), base.rgb, 0.55);
  vec3 color = stylizedBase * 0.42;
  color += stylizedBase * toon * lightColor * 1.15;
  color += ambientColor * stylizedBase * 0.75;
  color += vec3(0.28) * spec;
  color += rim * rimColor * 0.6;
  gl_FragColor = vec4(color, base.a);
}
`;
