import { MatrixStack } from '../shared/MatrixStack.js';
import * as m4 from '../shared/mat4.js';
import { createSphere, createTorus } from '../shared/primitives.js';
import { createProgram, createMesh, setUniforms } from './program.js';
import { VERT_SRC, FRAG_SRC } from './shaders.js';

// T2 spec: sol → 3 planetas → 1-2 lunas por planeta, control velocidad global
export function createSolarSystemScene(canvas) {
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 not supported');

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const prog = createProgram(gl, VERT_SRC, FRAG_SRC);

  const sphereMesh = createMesh(gl, ...Object.values(createSphere(1, 40, 24)));
  const ringMesh   = createMesh(gl, ...Object.values(createTorus(1.6, 0.06, 8, 64)));

  const proj = m4.perspective(m4.create(), Math.PI / 4, canvas.width / canvas.height, 0.5, 500);
  const view = m4.lookAt(m4.create(), [0, 20, 36], [0, 0, 0], [0, 1, 0]);

  const stack = new MatrixStack();
  const normalMat = new Float32Array(9);

  const sunPos    = new Float32Array([0, 0, 0]);
  const lightColor = new Float32Array([1.0, 0.95, 0.8]);
  const viewPos    = new Float32Array([0, 20, 36]);

  let speedMult = 1.0;

  // T2 spec: 3 planetas con 1-2 lunas c/u
  //   Tierra (1 luna), Marte (2 lunas), Saturno (1 luna + anillo)
  const BODIES = {
    sun:    { r: 2.2,  diff:[1.0,0.85,0.1], spec:[1.0,1.0,0.5], shin:16,  emi:1.5 },
    earth:  { r: 0.65, diff:[0.2,0.5,0.9],  spec:[0.5,0.7,1.0], shin:64,  emi:0   },
    moon:   { r: 0.18, diff:[0.7,0.7,0.65], spec:[0.3,0.3,0.3], shin:16,  emi:0   },
    mars:   { r: 0.48, diff:[0.8,0.35,0.15],spec:[0.5,0.3,0.2], shin:20,  emi:0   },
    phobos: { r: 0.13, diff:[0.55,0.5,0.45],spec:[0.2,0.2,0.2], shin:12,  emi:0   },
    deimos: { r: 0.10, diff:[0.5,0.48,0.44],spec:[0.2,0.2,0.2], shin:12,  emi:0   },
    saturn: { r: 1.1,  diff:[0.85,0.75,0.5],spec:[0.6,0.6,0.4], shin:32,  emi:0   },
    titan:  { r: 0.24, diff:[0.75,0.6,0.3], spec:[0.3,0.3,0.2], shin:20,  emi:0   },
    ring:   { r: 1.0,  diff:[0.7,0.65,0.45],spec:[0.3,0.3,0.2], shin:8,   emi:0   },
  };

  // [dist, orbitSpeed, tilt, selfRotSpeed]
  const PLANETS = {
    earth:  [10, 1.0,  0.41, 3.5],
    mars:   [16, 0.53, 0.03, 3.3],
    saturn: [25, 0.28, 0.27, 2.8],
  };

  // [dist, orbitSpeed] relative to parent planet
  const MOONS = {
    earth:  [{ body: 'moon',   dist: 1.5, speed: 13.0 }],
    mars:   [{ body: 'phobos', dist: 1.1, speed: 22.0 },
             { body: 'deimos', dist: 1.7, speed: 9.0  }],
    saturn: [{ body: 'titan',  dist: 2.0, speed: 5.0  }],
  };

  function drawSphere(b, emissive = 0) {
    m4.normalMatrix(normalMat, stack.get());
    setUniforms(gl, prog, {
      u_model:         stack.get(),
      u_view:          view,
      u_projection:    proj,
      u_normalMatrix:  normalMat,
      u_lightPos:      sunPos,
      u_viewPos:       viewPos,
      u_lightColor:    lightColor,
      u_ambientColor:  new Float32Array([0.04, 0.04, 0.07]),
      u_diffuseColor:  new Float32Array(b.diff),
      u_specularColor: new Float32Array(b.spec),
      u_shininess:     b.shin,
      u_emissive:      emissive,
    });
    gl.bindVertexArray(sphereMesh.vao);
    gl.drawElements(gl.TRIANGLES, sphereMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  function drawRing(b) {
    m4.normalMatrix(normalMat, stack.get());
    setUniforms(gl, prog, {
      u_model:         stack.get(),
      u_view:          view,
      u_projection:    proj,
      u_normalMatrix:  normalMat,
      u_lightPos:      sunPos,
      u_viewPos:       viewPos,
      u_lightColor:    lightColor,
      u_ambientColor:  new Float32Array([0.04, 0.04, 0.07]),
      u_diffuseColor:  new Float32Array(b.diff),
      u_specularColor: new Float32Array(b.spec),
      u_shininess:     b.shin,
      u_emissive:      0,
    });
    gl.bindVertexArray(ringMesh.vao);
    gl.drawElements(gl.TRIANGLES, ringMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  function drawScene(elapsed) {
    const t = elapsed * speedMult;

    gl.clearColor(0.01, 0.01, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    stack.identity();

    // Sol
    stack.push();
      stack.scale(BODIES.sun.r, BODIES.sun.r, BODIES.sun.r);
      stack.rotateY(elapsed * 0.2);
      drawSphere(BODIES.sun, BODIES.sun.emi);
    stack.pop();

    // Planetas
    for (const [name, [dist, orbitSpd, tilt, selfSpd]] of Object.entries(PLANETS)) {
      stack.push();
        stack.rotateY(t * orbitSpd);          // órbita alrededor del sol
        stack.translate(dist, 0, 0);
        stack.rotateX(tilt);                  // inclinación axial

        // Auto-rotación del planeta
        stack.push();
          stack.rotateY(t * selfSpd);
          stack.push();
            const b = BODIES[name];
            stack.scale(b.r, b.r, b.r);
            drawSphere(b, 0);
          stack.pop();

          // Lunas del planeta
          for (const { body, dist: moonDist, speed: moonSpd } of MOONS[name]) {
            stack.push();
              stack.rotateY(t * moonSpd);
              stack.translate(moonDist + b.r + 0.2, 0, 0);
              const mb = BODIES[body];
              stack.scale(mb.r, mb.r, mb.r);
              drawSphere(mb, 0);
            stack.pop();
          }

          // Anillo de Saturno
          if (name === 'saturn') {
            stack.push();
              stack.scale(b.r, b.r, b.r);
              stack.rotateX(0.45);
              stack.scale(1.6, 1.6, 1.6);
              drawRing(BODIES.ring);
            stack.pop();
          }
        stack.pop();
      stack.pop();
    }
  }

  function resize() {
    canvas.width  = canvas.clientWidth  * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    m4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.5, 500);
  }

  let _raf = 0;
  function tick(t) { drawScene(t / 1000); _raf = requestAnimationFrame(tick); }
  function start() { resize(); _raf = requestAnimationFrame(tick); }
  function stop()  { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setSpeed(v) { speedMult = v; },
  };
}
