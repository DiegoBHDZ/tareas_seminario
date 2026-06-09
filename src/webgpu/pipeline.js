// WebGPU helpers

export async function initGPU(canvas) {
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU no está disponible en este navegador.\n' +
      'Usa Chrome 113+ o Edge 113+. En Linux puede requerir iniciar Chrome con:\n' +
      'google-chrome --enable-features=Vulkan,UseSkiaRenderer'
    );
  }

  // Try high-performance first, then low-power, then default
  let adapter =
    await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }) ??
    await navigator.gpu.requestAdapter({ powerPreference: 'low-power' }) ??
    await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error(
      'No se encontró adaptador WebGPU.\n' +
      'En Linux: asegúrate de tener Vulkan instalado (mesa-vulkan-drivers) y abre Chrome con:\n' +
      'google-chrome --enable-features=Vulkan\n' +
      'En Windows/Mac: actualiza los drivers de GPU.'
    );
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  return { device, context, format };
}

export function createVertexBuffer(device, positions, normals) {
  const count = positions.length / 3;
  const data = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    data[i * 6 + 0] = positions[i * 3 + 0];
    data[i * 6 + 1] = positions[i * 3 + 1];
    data[i * 6 + 2] = positions[i * 3 + 2];
    data[i * 6 + 3] = normals[i * 3 + 0];
    data[i * 6 + 4] = normals[i * 3 + 1];
    data[i * 6 + 5] = normals[i * 3 + 2];
  }
  const buf = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(buf.getMappedRange()).set(data);
  buf.unmap();
  return { buf, count };
}

export function createIndexBuffer(device, indices) {
  // Ensure 32-bit indices for larger meshes
  const data = indices instanceof Uint32Array ? indices : new Uint32Array(indices);
  const buf = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint32Array(buf.getMappedRange()).set(data);
  buf.unmap();
  return { buf, count: data.length };
}

export function createUniformBuffer(device, byteSize) {
  return device.createBuffer({
    size: Math.ceil(byteSize / 16) * 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
}

export function createRenderPipeline(device, shaderModule, format) {
  const vertexLayout = {
    arrayStride: 6 * 4,
    attributes: [
      { shaderLocation: 0, offset: 0,     format: 'float32x3' },
      { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' },
    ],
  };

  return device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
      buffers: [vertexLayout],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });
}

export function createDepthTexture(device, width, height) {
  return device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}
