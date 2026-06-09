import { MatrixStack } from '../shared/MatrixStack.js';
import * as m4 from '../shared/mat4.js';
import { createSphere, createTorus } from '../shared/primitives.js';
import {
  initGPU, createVertexBuffer, createIndexBuffer,
  createUniformBuffer, createRenderPipeline, createDepthTexture,
} from './pipeline.js';
import { WGSL_SHADER } from './shaders.js';

// T2 spec: sol → 3 planetas → 1-2 lunas por planeta, control de velocidad global
export async function createSolarSystemSceneGPU(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const shaderModule = device.createShaderModule({ code: WGSL_SHADER });
  const pipeline = createRenderPipeline(device, shaderModule, format);

  function makeMesh(geo) {
    return {
      vb: createVertexBuffer(device, geo.positions, geo.normals),
      ib: createIndexBuffer(device, geo.indices),
    };
  }

  const sphereMesh = makeMesh(createSphere(1, 40, 24));
  const ringMesh   = makeMesh(createTorus(1.6, 0.06, 8, 64));

  const proj    = m4.perspective(m4.create(), Math.PI / 4, canvas.width / canvas.height, 0.5, 500);
  const view    = m4.lookAt(m4.create(), [0, 20, 36], [0, 0, 0], [0, 1, 0]);
  const viewPos = new Float32Array([0, 20, 36, 0]);

  const cameraUB   = createUniformBuffer(device, 144);
  const lightUB    = createUniformBuffer(device, 32);
  const modelUB    = createUniformBuffer(device, 128);
  const materialUB = createUniformBuffer(device, 64);

  function uploadCamera() {
    const data = new Float32Array(36);
    data.set(view, 0); data.set(proj, 16); data.set(viewPos, 32);
    device.queue.writeBuffer(cameraUB, 0, data);
  }
  function uploadLight() {
    const data = new Float32Array(8);
    data.set([0, 0, 0, 0], 0);
    data.set([1.0, 0.95, 0.8, 0], 4);
    device.queue.writeBuffer(lightUB, 0, data);
  }
  uploadCamera();
  uploadLight();

  const bg0 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: cameraUB } },
      { binding: 1, resource: { buffer: lightUB  } },
    ],
  });
  const bg1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: { buffer: modelUB    } },
      { binding: 1, resource: { buffer: materialUB } },
    ],
  });

  let depthTex = createDepthTexture(device, canvas.width, canvas.height);
  const stack = new MatrixStack();
  const normalMat9 = new Float32Array(9);

  function uploadModel(mat4) {
    m4.normalMatrix(normalMat9, mat4);
    const data = new Float32Array(32);
    data.set(mat4, 0);
    data[16]=normalMat9[0]; data[17]=normalMat9[1]; data[18]=normalMat9[2]; data[19]=0;
    data[20]=normalMat9[3]; data[21]=normalMat9[4]; data[22]=normalMat9[5]; data[23]=0;
    data[24]=normalMat9[6]; data[25]=normalMat9[7]; data[26]=normalMat9[8]; data[27]=0;
    device.queue.writeBuffer(modelUB, 0, data);
  }

  function uploadMaterial(diff, spec, shin, emi) {
    const d = new Float32Array(16);
    d[0]=0.04; d[1]=0.04; d[2]=0.07; d[3]=0;
    d[4]=diff[0]; d[5]=diff[1]; d[6]=diff[2]; d[7]=0;
    d[8]=spec[0]; d[9]=spec[1]; d[10]=spec[2]; d[11]=shin;
    d[12]=emi;
    device.queue.writeBuffer(materialUB, 0, d);
  }

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

  function drawSphere(pass, b, emi = 0) {
    uploadModel(stack.get());
    uploadMaterial(b.diff, b.spec, b.shin, emi);
    pass.setBindGroup(0, bg0);
    pass.setBindGroup(1, bg1);
    pass.setVertexBuffer(0, sphereMesh.vb.buf);
    pass.setIndexBuffer(sphereMesh.ib.buf, 'uint32');
    pass.drawIndexed(sphereMesh.ib.count);
  }

  function drawRing(pass, b) {
    uploadModel(stack.get());
    uploadMaterial(b.diff, b.spec, b.shin, 0);
    pass.setBindGroup(0, bg0);
    pass.setBindGroup(1, bg1);
    pass.setVertexBuffer(0, ringMesh.vb.buf);
    pass.setIndexBuffer(ringMesh.ib.buf, 'uint32');
    pass.drawIndexed(ringMesh.ib.count);
  }

  let _raf = 0;
  function frame(ts) {
    const t = (ts / 1000) * speedMult;

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r:0.01, g:0.01, b:0.05, a:1 },
        loadOp: 'clear', storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTex.createView(),
        depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store',
      },
    });

    pass.setPipeline(pipeline);
    stack.identity();

    // Sol
    stack.push();
      stack.rotateY(ts / 1000 * 0.2);
      stack.scale(BODIES.sun.r, BODIES.sun.r, BODIES.sun.r);
      drawSphere(pass, BODIES.sun, BODIES.sun.emi);
    stack.pop();

    for (const [name, [dist, orbitSpd, tilt, selfSpd]] of Object.entries(PLANETS)) {
      stack.push();
        stack.rotateY(t * orbitSpd);
        stack.translate(dist, 0, 0);
        stack.rotateX(tilt);
        stack.push();
          stack.rotateY(t * selfSpd);
          const b = BODIES[name];
          stack.push();
            stack.scale(b.r, b.r, b.r);
            drawSphere(pass, b, 0);
          stack.pop();
          for (const { body, dist: md, speed: ms } of MOONS[name]) {
            stack.push();
              stack.rotateY(t * ms);
              stack.translate(md + b.r + 0.2, 0, 0);
              const mb = BODIES[body];
              stack.scale(mb.r, mb.r, mb.r);
              drawSphere(pass, mb, 0);
            stack.pop();
          }
          if (name === 'saturn') {
            stack.push();
              stack.scale(b.r, b.r, b.r);
              stack.rotateX(0.45);
              stack.scale(1.6, 1.6, 1.6);
              drawRing(pass, BODIES.ring);
            stack.pop();
          }
        stack.pop();
      stack.pop();
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    _raf = requestAnimationFrame(frame);
  }

  function resize() {
    canvas.width  = canvas.clientWidth  * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    depthTex.destroy();
    depthTex = createDepthTexture(device, canvas.width, canvas.height);
    m4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.5, 500);
    uploadCamera();
  }

  function start() { resize(); _raf = requestAnimationFrame(frame); }
  function stop()  { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setSpeed(v) { speedMult = v; },
  };
}
