import * as m4 from './mat4.js';

export class MatrixStack {
  constructor() {
    this._stack = [];
    this._current = m4.create();
  }

  get() { return this._current; }

  push() {
    this._stack.push(new Float32Array(this._current));
    return this;
  }

  pop() {
    if (this._stack.length === 0) throw new Error('MatrixStack underflow');
    this._current = this._stack.pop();
    return this;
  }

  identity() {
    this._current = m4.create();
    return this;
  }

  load(m) {
    m4.copy(this._current, m);
    return this;
  }

  translate(tx, ty, tz) {
    m4.translate(this._current, this._current, tx, ty, tz);
    return this;
  }

  rotateX(rad) {
    m4.rotateX(this._current, this._current, rad);
    return this;
  }

  rotateY(rad) {
    m4.rotateY(this._current, this._current, rad);
    return this;
  }

  rotateZ(rad) {
    m4.rotateZ(this._current, this._current, rad);
    return this;
  }

  scale(sx, sy, sz) {
    m4.scale(this._current, this._current, sx, sy, sz);
    return this;
  }
}
