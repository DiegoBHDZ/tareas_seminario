// Generates indexed triangle geometry as Float32Arrays.
// Each vertex: [x, y, z, nx, ny, nz]  (position + normal)

export function createSphere(radius = 1, widthSeg = 32, heightSeg = 16) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let iy = 0; iy <= heightSeg; iy++) {
    const v = iy / heightSeg;
    const phi = v * Math.PI;
    for (let ix = 0; ix <= widthSeg; ix++) {
      const u = ix / widthSeg;
      const theta = u * 2 * Math.PI;
      const x = -Math.cos(theta) * Math.sin(phi);
      const y = Math.cos(phi);
      const z = Math.sin(theta) * Math.sin(phi);
      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let iy = 0; iy < heightSeg; iy++) {
    for (let ix = 0; ix < widthSeg; ix++) {
      const a = iy * (widthSeg + 1) + ix;
      const b = a + widthSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function createCylinder(radiusTop = 0.5, radiusBot = 0.5, height = 1, seg = 24) {
  const positions = [], normals = [], indices = [];

  // Side
  for (let iy = 0; iy <= 1; iy++) {
    const y = (iy - 0.5) * height;
    const r = iy === 0 ? radiusBot : radiusTop;
    const slope = (radiusBot - radiusTop) / height;
    for (let ix = 0; ix <= seg; ix++) {
      const theta = (ix / seg) * 2 * Math.PI;
      const nx = Math.cos(theta);
      const nz = Math.sin(theta);
      const len = Math.sqrt(1 + slope * slope);
      positions.push(r * nx, y, r * nz);
      normals.push(nx / len, slope / len, nz / len);
    }
  }

  for (let ix = 0; ix < seg; ix++) {
    const a = ix, b = ix + seg + 1;
    indices.push(a, b, a + 1);
    indices.push(b, b + 1, a + 1);
  }

  // Top cap
  const topCenter = positions.length / 3;
  positions.push(0, height * 0.5, 0);
  normals.push(0, 1, 0);
  const topStart = topCenter + 1;
  for (let ix = 0; ix <= seg; ix++) {
    const theta = (ix / seg) * 2 * Math.PI;
    positions.push(radiusTop * Math.cos(theta), height * 0.5, radiusTop * Math.sin(theta));
    normals.push(0, 1, 0);
  }
  for (let ix = 0; ix < seg; ix++) {
    indices.push(topCenter, topStart + ix, topStart + ix + 1);
  }

  // Bottom cap
  const botCenter = positions.length / 3;
  positions.push(0, -height * 0.5, 0);
  normals.push(0, -1, 0);
  const botStart = botCenter + 1;
  for (let ix = 0; ix <= seg; ix++) {
    const theta = (ix / seg) * 2 * Math.PI;
    positions.push(radiusBot * Math.cos(theta), -height * 0.5, radiusBot * Math.sin(theta));
    normals.push(0, -1, 0);
  }
  for (let ix = 0; ix < seg; ix++) {
    indices.push(botCenter, botStart + ix + 1, botStart + ix);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function createBox(w = 1, h = 1, d = 1) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  // 6 faces, each with 4 vertices
  const faceData = [
    // px py pz  nx ny nz
    [ hw, hh, hd,  0,0,1], [ hw,-hh, hd,  0,0,1], [-hw,-hh, hd,  0,0,1], [-hw, hh, hd,  0,0,1],
    [-hw, hh,-hd,  0,0,-1],[-hw,-hh,-hd,  0,0,-1],[ hw,-hh,-hd,  0,0,-1],[ hw, hh,-hd,  0,0,-1],
    [-hw, hh,-hd, -1,0,0], [-hw,-hh,-hd, -1,0,0], [-hw,-hh, hd, -1,0,0], [-hw, hh, hd, -1,0,0],
    [ hw, hh, hd,  1,0,0], [ hw,-hh, hd,  1,0,0], [ hw,-hh,-hd,  1,0,0], [ hw, hh,-hd,  1,0,0],
    [-hw, hh,-hd,  0,1,0], [-hw, hh, hd,  0,1,0], [ hw, hh, hd,  0,1,0], [ hw, hh,-hd,  0,1,0],
    [-hw,-hh, hd,  0,-1,0],[-hw,-hh,-hd,  0,-1,0],[ hw,-hh,-hd,  0,-1,0],[ hw,-hh, hd,  0,-1,0],
  ];
  const positions = [], normals = [], indices = [];
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    for (let v = 0; v < 4; v++) {
      const d = faceData[base + v];
      positions.push(d[0], d[1], d[2]);
      normals.push(d[3], d[4], d[5]);
    }
    const i = f * 4;
    indices.push(i, i+1, i+2,  i, i+2, i+3);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function createTorus(R = 1, r = 0.3, tubeSeg = 16, ringSeg = 32) {
  const positions = [], normals = [], indices = [];
  for (let j = 0; j <= ringSeg; j++) {
    const phi = (j / ringSeg) * 2 * Math.PI;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let i = 0; i <= tubeSeg; i++) {
      const theta = (i / tubeSeg) * 2 * Math.PI;
      const ct = Math.cos(theta), st = Math.sin(theta);
      positions.push((R + r*ct)*cp, r*st, (R + r*ct)*sp);
      normals.push(ct*cp, st, ct*sp);
    }
  }
  for (let j = 0; j < ringSeg; j++) {
    for (let i = 0; i < tubeSeg; i++) {
      const a = j*(tubeSeg+1)+i, b = a+tubeSeg+1;
      indices.push(a, b, a+1);
      indices.push(b, b+1, a+1);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}
