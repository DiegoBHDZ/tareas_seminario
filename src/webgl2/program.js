// WebGL2 helper utilities

export function createProgram(gl, vertSrc, fragSrc) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error: ' + gl.getProgramInfoLog(prog));
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return prog;
}

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const label = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    throw new Error(`${label} shader: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

export function createMesh(gl, positions, normals, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Interleaved buffer: pos(3) + normal(3)
  const count = positions.length / 3;
  const interleaved = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    interleaved[i * 6 + 0] = positions[i * 3 + 0];
    interleaved[i * 6 + 1] = positions[i * 3 + 1];
    interleaved[i * 6 + 2] = positions[i * 3 + 2];
    interleaved[i * 6 + 3] = normals[i * 3 + 0];
    interleaved[i * 6 + 4] = normals[i * 3 + 1];
    interleaved[i * 6 + 5] = normals[i * 3 + 2];
  }

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

  const stride = 6 * 4;
  // location 0 = a_position
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  // location 1 = a_normal
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);

  return { vao, vbo, ebo, indexCount: indices.length };
}

export function setUniforms(gl, prog, uniforms) {
  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(prog, name);
    if (loc === null) continue;
    if (value instanceof Float32Array) {
      if (value.length === 16) gl.uniformMatrix4fv(loc, false, value);
      else if (value.length === 9) gl.uniformMatrix3fv(loc, false, value);
      else if (value.length === 3) gl.uniform3fv(loc, value);
    } else if (typeof value === 'number') {
      gl.uniform1f(loc, value);
    }
  }
}
