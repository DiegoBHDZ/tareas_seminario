export const VERT_SRC = /* glsl */`#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec3 v_normal;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal   = u_normalMatrix * a_normal;
  gl_Position = u_projection * u_view * worldPos;
}
`;

export const FRAG_SRC = /* glsl */`#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;

uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform float u_shininess;
uniform float u_emissive;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_worldPos);
  vec3 V = normalize(u_viewPos  - v_worldPos);
  vec3 H = normalize(L + V);          // Blinn-Phong half-vector

  vec3 ambient  = u_ambientColor * u_lightColor * 0.25;
  float diff    = max(dot(N, L), 0.0);
  vec3 diffuse  = diff * u_diffuseColor * u_lightColor;
  float spec    = pow(max(dot(N, H), 0.0), u_shininess);
  vec3 specular = spec * u_specularColor * u_lightColor;

  vec3 color = ambient + diffuse + specular + u_diffuseColor * u_emissive;
  fragColor  = vec4(color, 1.0);
}
`;
