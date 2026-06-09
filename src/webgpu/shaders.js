export const WGSL_SHADER = /* wgsl */`
struct Camera {
  view       : mat4x4<f32>,
  projection : mat4x4<f32>,
  viewPos    : vec3<f32>,
  _pad       : f32,
};

struct Model {
  model      : mat4x4<f32>,
  normalMat  : mat3x3<f32>,
  _pad       : array<f32, 3>,
};

struct Light {
  position   : vec3<f32>,
  _pad0      : f32,
  color      : vec3<f32>,
  _pad1      : f32,
};

struct Material {
  ambient    : vec3<f32>,
  _pad0      : f32,
  diffuse    : vec3<f32>,
  _pad1      : f32,
  specular   : vec3<f32>,
  shininess  : f32,
  emissive   : f32,
  _pad2      : array<f32, 3>,
};

@group(0) @binding(0) var<uniform> camera   : Camera;
@group(1) @binding(0) var<uniform> model    : Model;
@group(1) @binding(1) var<uniform> material : Material;
@group(0) @binding(1) var<uniform> light    : Light;

struct VertIn {
  @location(0) position : vec3<f32>,
  @location(1) normal   : vec3<f32>,
};

struct VertOut {
  @builtin(position) clip : vec4<f32>,
  @location(0) worldPos   : vec3<f32>,
  @location(1) normal      : vec3<f32>,
};

@vertex
fn vs_main(in: VertIn) -> VertOut {
  var out: VertOut;
  let worldPos = model.model * vec4<f32>(in.position, 1.0);
  out.worldPos  = worldPos.xyz;
  out.normal    = model.normalMat * in.normal;
  out.clip      = camera.projection * camera.view * worldPos;
  return out;
}

@fragment
fn fs_main(in: VertOut) -> @location(0) vec4<f32> {
  let N = normalize(in.normal);
  let L = normalize(light.position - in.worldPos);
  let V = normalize(camera.viewPos  - in.worldPos);
  let H = normalize(L + V);

  let ambient  = material.ambient * light.color * 0.25;
  let diff     = max(dot(N, L), 0.0);
  let diffuse  = diff * material.diffuse * light.color;
  let spec     = pow(max(dot(N, H), 0.0), material.shininess);
  let specular = spec * material.specular * light.color;
  let color    = ambient + diffuse + specular + material.diffuse * material.emissive;

  return vec4<f32>(color, 1.0);
}
`;
