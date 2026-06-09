import { MatrixStack } from '../shared/MatrixStack.js';
import * as m4 from '../shared/mat4.js';
import { createCylinder, createSphere } from '../shared/primitives.js';
import {
  initGPU, createVertexBuffer, createIndexBuffer,
  createUniformBuffer, createRenderPipeline, createDepthTexture,
} from './pipeline.js';
import { WGSL_SHADER } from './shaders.js';

export async function createRobotArmSceneGPU(canvas) {
  const { device, context, format } = await initGPU(canvas);
  const shaderModule = device.createShaderModule({ code: WGSL_SHADER });
  const pipeline = createRenderPipeline(device, shaderModule, format);

  function makeMesh(geo) {
    return {
      vb: createVertexBuffer(device, geo.positions, geo.normals),
      ib: createIndexBuffer(device, geo.indices),
    };
  }

  const meshes = {
    base:     makeMesh(createCylinder(1.0, 1.0, 0.25, 32)),
    upper:    makeMesh(createCylinder(0.18, 0.18, 1.5, 20)),
    lower:    makeMesh(createCylinder(0.14, 0.14, 1.2, 20)),
    joint:    makeMesh(createSphere(0.22, 16, 12)),
    finger:   makeMesh(createCylinder(0.06, 0.06, 0.38, 12)),
    platform: makeMesh(createCylinder(0.3, 0.3, 0.1, 32)),
  };

  const cameraUB   = createUniformBuffer(device, 144);
  const lightUB    = createUniformBuffer(device, 32);
  const modelUB    = createUniformBuffer(device, 128);
  const materialUB = createUniformBuffer(device, 64);

  const proj    = m4.perspective(m4.create(), Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
  const view    = m4.lookAt(m4.create(), [5, 6, 8], [0, 2, 0], [0, 1, 0]);
  const viewPos = new Float32Array([5, 6, 8, 0]);

  function uploadCamera() {
    const data = new Float32Array(36);
    data.set(view, 0); data.set(proj, 16); data.set(viewPos, 32);
    device.queue.writeBuffer(cameraUB, 0, data);
  }
  function uploadLight() {
    const data = new Float32Array(8);
    data.set([6, 8, 5, 0], 0);
    data.set([1, 1, 1, 0], 4);
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

  const COLORS = {
    base:   { diff:[0.3,0.3,0.9], spec:[0.8,0.8,1.0], shin:64,  emi:0    },
    upper:  { diff:[0.2,0.7,0.3], spec:[0.6,1.0,0.6], shin:48,  emi:0    },
    lower:  { diff:[0.8,0.5,0.1], spec:[1.0,0.8,0.4], shin:48,  emi:0    },
    joint:  { diff:[0.9,0.2,0.2], spec:[1.0,0.6,0.6], shin:96,  emi:0.05 },
    finger: { diff:[0.7,0.7,0.7], spec:[1.0,1.0,1.0], shin:128, emi:0    },
  };

  function uploadMaterial(c) {
    const d = new Float32Array(16);
    d[0]=0.15; d[1]=0.15; d[2]=0.2; d[3]=0;
    d[4]=c.diff[0]; d[5]=c.diff[1]; d[6]=c.diff[2]; d[7]=0;
    d[8]=c.spec[0]; d[9]=c.spec[1]; d[10]=c.spec[2]; d[11]=c.shin;
    d[12]=c.emi;
    device.queue.writeBuffer(materialUB, 0, d);
  }

  function drawMesh(pass, mesh, color) {
    uploadModel(stack.get());
    uploadMaterial(color);
    pass.setBindGroup(0, bg0);
    pass.setBindGroup(1, bg1);
    pass.setVertexBuffer(0, mesh.vb.buf);
    pass.setIndexBuffer(mesh.ib.buf, 'uint32');
    pass.drawIndexed(mesh.ib.count);
  }

  const state = {
    auto: true,
    base: 0, shoulder: 0.3, elbow: -0.4,
    wrist: 0.2, finger1: 0.3, finger2: -0.3,
  };

  let _raf = 0;
  function frame(t) {
    const elapsed = t / 1000;
    if (state.auto) {
      state.base     = elapsed * 0.4;
      state.shoulder = Math.sin(elapsed * 0.8) * 0.7 + 0.2;
      state.elbow    = Math.sin(elapsed * 1.1 + 1) * 0.6 - 0.3;
      state.wrist    = Math.sin(elapsed * 1.6) * 0.5;
      state.finger1  =  Math.sin(elapsed * 2.2) * 0.35;
      state.finger2  = -Math.sin(elapsed * 2.2) * 0.35;
    }

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.08, g: 0.08, b: 0.14, a: 1 },
        loadOp: 'clear', storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTex.createView(),
        depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store',
      },
    });

    pass.setPipeline(pipeline);
    stack.identity();

    stack.push();
      stack.rotateY(state.base);
      drawMesh(pass, meshes.base, COLORS.base);

      stack.push();
        stack.translate(0, 0.18, 0);
        drawMesh(pass, meshes.platform, COLORS.joint);
      stack.pop();

      stack.push();
        stack.translate(0, 0.3, 0);
        drawMesh(pass, meshes.joint, COLORS.joint);
        stack.rotateZ(state.shoulder);

        stack.push();
          stack.translate(0, 0.75, 0);
          drawMesh(pass, meshes.upper, COLORS.upper);
        stack.pop();

        stack.push();
          stack.translate(0, 1.5, 0);
          drawMesh(pass, meshes.joint, COLORS.joint);
          stack.rotateZ(state.elbow);

          stack.push();
            stack.translate(0, 0.6, 0);
            drawMesh(pass, meshes.lower, COLORS.lower);
          stack.pop();

          stack.push();
            stack.translate(0, 1.2, 0);
            drawMesh(pass, meshes.joint, COLORS.joint);
            stack.rotateZ(state.wrist);

            for (const [sign, angle] of [[1, state.finger1], [-1, state.finger2]]) {
              stack.push();
                stack.translate(sign * 0.18, 0.19, 0);
                stack.rotateZ(angle);
                stack.translate(0, 0.19, 0);
                drawMesh(pass, meshes.finger, COLORS.finger);
              stack.pop();
            }
          stack.pop();
        stack.pop();
      stack.pop();
    stack.pop();

    pass.end();
    device.queue.submit([encoder.finish()]);
    _raf = requestAnimationFrame(frame);
  }

  function resize() {
    canvas.width  = canvas.clientWidth  * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    depthTex.destroy();
    depthTex = createDepthTexture(device, canvas.width, canvas.height);
    m4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    uploadCamera();
  }

  function start() { resize(); _raf = requestAnimationFrame(frame); }
  function stop()  { cancelAnimationFrame(_raf); }

  return {
    start, stop, resize,
    setAuto(v) { state.auto = v; },
    setAngle(joint, rad) { state[joint] = rad; },
    getState() { return state; },
  };
}
