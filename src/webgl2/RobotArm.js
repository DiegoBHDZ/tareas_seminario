import { MatrixStack } from '../shared/MatrixStack.js';
import * as m4 from '../shared/mat4.js';
import { createCylinder, createSphere, createBox } from '../shared/primitives.js';
import { createProgram, createMesh, setUniforms } from './program.js';
import { VERT_SRC, FRAG_SRC } from './shaders.js';

export function createRobotArmScene(canvas) {
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 not supported');

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const prog = createProgram(gl, VERT_SRC, FRAG_SRC);
  gl.bindAttribLocation(prog, 0, 'a_position');
  gl.bindAttribLocation(prog, 1, 'a_normal');

  const baseMesh     = createMesh(gl, ...Object.values(createCylinder(1.0, 1.0, 0.25, 32)));
  const upperMesh    = createMesh(gl, ...Object.values(createCylinder(0.18, 0.18, 1.5, 20)));
  const lowerMesh    = createMesh(gl, ...Object.values(createCylinder(0.14, 0.14, 1.2, 20)));
  const jointMesh    = createMesh(gl, ...Object.values(createSphere(0.22, 16, 12)));
  const fingerMesh   = createMesh(gl, ...Object.values(createCylinder(0.06, 0.06, 0.38, 12)));
  const platformMesh = createMesh(gl, ...Object.values(createCylinder(0.3, 0.3, 0.1, 32)));

  const proj = m4.perspective(m4.create(), Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
  const view = m4.lookAt(m4.create(), [5, 6, 8], [0, 2, 0], [0, 1, 0]);

  const lightPos   = new Float32Array([6, 8, 5]);
  const lightColor = new Float32Array([1, 1, 1]);
  const viewPos    = new Float32Array([5, 6, 8]);

  // Animation + manual control state
  const state = {
    auto: true,
    base: 0, shoulder: 0.3, elbow: -0.4,
    wrist: 0.2, finger1: 0.3, finger2: -0.3,
  };

  const stack = new MatrixStack();
  const normalMat = new Float32Array(9);

  const COLORS = {
    base:    { diff: [0.3, 0.3, 0.9], spec: [0.8, 0.8, 1.0], shin: 64  },
    upper:   { diff: [0.2, 0.7, 0.3], spec: [0.6, 1.0, 0.6], shin: 48  },
    lower:   { diff: [0.8, 0.5, 0.1], spec: [1.0, 0.8, 0.4], shin: 48  },
    joint:   { diff: [0.9, 0.2, 0.2], spec: [1.0, 0.6, 0.6], shin: 96  },
    finger:  { diff: [0.7, 0.7, 0.7], spec: [1.0, 1.0, 1.0], shin: 128 },
  };

  function drawMesh(mesh, color, emissive = 0) {
    m4.normalMatrix(normalMat, stack.get());
    setUniforms(gl, prog, {
      u_model:         stack.get(),
      u_view:          view,
      u_projection:    proj,
      u_normalMatrix:  normalMat,
      u_lightPos:      lightPos,
      u_viewPos:       viewPos,
      u_lightColor:    lightColor,
      u_ambientColor:  new Float32Array([0.15, 0.15, 0.2]),
      u_diffuseColor:  new Float32Array(color.diff),
      u_specularColor: new Float32Array(color.spec),
      u_shininess:     color.shin,
      u_emissive:      emissive,
    });
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  function drawScene(elapsed) {
    if (state.auto) {
      state.base     = elapsed * 0.4;
      state.shoulder = Math.sin(elapsed * 0.8) * 0.7 + 0.2;
      state.elbow    = Math.sin(elapsed * 1.1 + 1.0) * 0.6 - 0.3;
      state.wrist    = Math.sin(elapsed * 1.6) * 0.5;
      state.finger1  =  Math.sin(elapsed * 2.2) * 0.35;
      state.finger2  = -Math.sin(elapsed * 2.2) * 0.35;
    }

    gl.clearColor(0.08, 0.08, 0.14, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);

    stack.identity();

    // BASE — eslabón 1
    stack.push();
      stack.rotateY(state.base);
      drawMesh(baseMesh, COLORS.base);

      stack.push();
        stack.translate(0, 0.18, 0);
        drawMesh(platformMesh, COLORS.joint);
      stack.pop();

      // HOMBRO — eslabón 2
      stack.push();
        stack.translate(0, 0.3, 0);
        drawMesh(jointMesh, COLORS.joint);
        stack.rotateZ(state.shoulder);

        // BRAZO SUPERIOR — eslabón 3
        stack.push();
          stack.translate(0, 0.75, 0);
          drawMesh(upperMesh, COLORS.upper);
        stack.pop();

        // CODO — eslabón 3→4
        stack.push();
          stack.translate(0, 1.5, 0);
          drawMesh(jointMesh, COLORS.joint);
          stack.rotateZ(state.elbow);

          // ANTEBRAZO — eslabón 4
          stack.push();
            stack.translate(0, 0.6, 0);
            drawMesh(lowerMesh, COLORS.lower);
          stack.pop();

          // MUÑECA — eslabón 4→5
          stack.push();
            stack.translate(0, 1.2, 0);
            drawMesh(jointMesh, COLORS.joint, 0.05);
            stack.rotateZ(state.wrist);

            // DEDO 1 — eslabón 5a
            stack.push();
              stack.translate(0.18, 0.19, 0);
              stack.rotateZ(state.finger1);
              stack.translate(0, 0.19, 0);
              drawMesh(fingerMesh, COLORS.finger);
            stack.pop();

            // DEDO 2 — eslabón 5b
            stack.push();
              stack.translate(-0.18, 0.19, 0);
              stack.rotateZ(state.finger2);
              stack.translate(0, 0.19, 0);
              drawMesh(fingerMesh, COLORS.finger);
            stack.pop();
          stack.pop();
        stack.pop();
      stack.pop();
    stack.pop();
  }

  function resize() {
    canvas.width  = canvas.clientWidth  * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    m4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
  }

  let _raf = 0;
  function tick(t) {
    drawScene(t / 1000);
    _raf = requestAnimationFrame(tick);
  }

  function start() { resize(); _raf = requestAnimationFrame(tick); }
  function stop()  { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setAuto(v) { state.auto = v; },
    setAngle(joint, rad) { state[joint] = rad; },
    getState() { return state; },
  };
}
