// Column-major 4x4 matrix library (matches WebGL/WGSL conventions)

export function create() {
  return new Float32Array([1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1]);
}

export function copy(out, a) {
  out.set(a);
  return out;
}

export function multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8]  = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[9]  = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  return out;
}

export function perspective(out, fovY, aspect, near, far) {
  const f = 1.0 / Math.tan(fovY / 2);
  out[0] = f / aspect; out[1] = 0; out[2] = 0;  out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0; out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
  return out;
}

export function lookAt(out, eye, center, up) {
  let fx = center[0] - eye[0];
  let fy = center[1] - eye[1];
  let fz = center[2] - eye[2];
  let len = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
  fx *= len; fy *= len; fz *= len;

  let sx = fy*up[2] - fz*up[1];
  let sy = fz*up[0] - fx*up[2];
  let sz = fx*up[1] - fy*up[0];
  len = Math.sqrt(sx*sx + sy*sy + sz*sz);
  if (len > 0) { len = 1/len; sx*=len; sy*=len; sz*=len; }

  const ux = sy*fz - sz*fy;
  const uy = sz*fx - sx*fz;
  const uz = sx*fy - sy*fx;

  out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
  out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
  out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
  out[12] = -(sx*eye[0] + sy*eye[1] + sz*eye[2]);
  out[13] = -(ux*eye[0] + uy*eye[1] + uz*eye[2]);
  out[14] =  (fx*eye[0] + fy*eye[1] + fz*eye[2]);
  out[15] = 1;
  return out;
}

export function translate(out, a, tx, ty, tz) {
  copy(out, a);
  out[12] = a[0]*tx + a[4]*ty + a[8]*tz  + a[12];
  out[13] = a[1]*tx + a[5]*ty + a[9]*tz  + a[13];
  out[14] = a[2]*tx + a[6]*ty + a[10]*tz + a[14];
  out[15] = a[3]*tx + a[7]*ty + a[11]*tz + a[15];
  return out;
}

export function rotateX(out, a, rad) {
  const s = Math.sin(rad), c = Math.cos(rad);
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  copy(out, a);
  out[4]  =  a10*c + a20*s; out[5]  =  a11*c + a21*s;
  out[6]  =  a12*c + a22*s; out[7]  =  a13*c + a23*s;
  out[8]  = -a10*s + a20*c; out[9]  = -a11*s + a21*c;
  out[10] = -a12*s + a22*c; out[11] = -a13*s + a23*c;
  return out;
}

export function rotateY(out, a, rad) {
  const s = Math.sin(rad), c = Math.cos(rad);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  copy(out, a);
  out[0]  =  a00*c - a20*s; out[1]  =  a01*c - a21*s;
  out[2]  =  a02*c - a22*s; out[3]  =  a03*c - a23*s;
  out[8]  =  a00*s + a20*c; out[9]  =  a01*s + a21*c;
  out[10] =  a02*s + a22*c; out[11] =  a03*s + a23*c;
  return out;
}

export function rotateZ(out, a, rad) {
  const s = Math.sin(rad), c = Math.cos(rad);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  copy(out, a);
  out[0] = a00*c + a10*s; out[1] = a01*c + a11*s;
  out[2] = a02*c + a12*s; out[3] = a03*c + a13*s;
  out[4] = -a00*s + a10*c; out[5] = -a01*s + a11*c;
  out[6] = -a02*s + a12*c; out[7] = -a03*s + a13*c;
  return out;
}

export function scale(out, a, sx, sy, sz) {
  out[0] = a[0]*sx;  out[1] = a[1]*sx;  out[2] = a[2]*sx;  out[3] = a[3]*sx;
  out[4] = a[4]*sy;  out[5] = a[5]*sy;  out[6] = a[6]*sy;  out[7] = a[7]*sy;
  out[8] = a[8]*sz;  out[9] = a[9]*sz;  out[10]= a[10]*sz; out[11]= a[11]*sz;
  out[12]= a[12];    out[13]= a[13];    out[14]= a[14];    out[15]= a[15];
  return out;
}

export function invert(out, a) {
  const a00=a[0], a01=a[1], a02=a[2],  a03=a[3];
  const a10=a[4], a11=a[5], a12=a[6],  a13=a[7];
  const a20=a[8], a21=a[9], a22=a[10], a23=a[11];
  const a30=a[12],a31=a[13],a32=a[14], a33=a[15];

  const b00=a00*a11 - a01*a10, b01=a00*a12 - a02*a10;
  const b02=a00*a13 - a03*a10, b03=a01*a12 - a02*a11;
  const b04=a01*a13 - a03*a11, b05=a02*a13 - a03*a12;
  const b06=a20*a31 - a21*a30, b07=a20*a32 - a22*a30;
  const b08=a20*a33 - a23*a30, b09=a21*a32 - a22*a31;
  const b10=a21*a33 - a23*a31, b11=a22*a33 - a23*a32;

  let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
  if (!det) return null;
  det = 1 / det;

  out[0]  = (a11*b11 - a12*b10 + a13*b09) * det;
  out[1]  = (a02*b10 - a01*b11 - a03*b09) * det;
  out[2]  = (a31*b05 - a32*b04 + a33*b03) * det;
  out[3]  = (a22*b04 - a21*b05 - a23*b03) * det;
  out[4]  = (a12*b08 - a10*b11 - a13*b07) * det;
  out[5]  = (a00*b11 - a02*b08 + a03*b07) * det;
  out[6]  = (a32*b02 - a30*b05 - a33*b01) * det;
  out[7]  = (a20*b05 - a22*b02 + a23*b01) * det;
  out[8]  = (a10*b10 - a11*b08 + a13*b06) * det;
  out[9]  = (a01*b08 - a00*b10 - a03*b06) * det;
  out[10] = (a30*b04 - a31*b02 + a33*b00) * det;
  out[11] = (a21*b02 - a20*b04 - a23*b00) * det;
  out[12] = (a11*b07 - a10*b09 - a12*b06) * det;
  out[13] = (a00*b09 - a01*b07 + a02*b06) * det;
  out[14] = (a31*b01 - a30*b03 - a32*b00) * det;
  out[15] = (a20*b03 - a21*b01 + a22*b00) * det;
  return out;
}

// Returns column-major 3x3 normal matrix (transpose of inverse of upper-left 3x3)
export function normalMatrix(out9, m) {
  const inv = new Float32Array(16);
  invert(inv, m);
  // transpose the upper-left 3x3
  out9[0] = inv[0]; out9[1] = inv[4]; out9[2] = inv[8];
  out9[3] = inv[1]; out9[4] = inv[5]; out9[5] = inv[9];
  out9[6] = inv[2]; out9[7] = inv[6]; out9[8] = inv[10];
  return out9;
}
