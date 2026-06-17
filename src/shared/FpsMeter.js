// Rolling FPS counter with overlay element.
export class FpsMeter {
  constructor(el) {
    this.el = el;
    this.frames = 0;
    this.last = performance.now();
    this.fps = 0;
  }

  tick(now) {
    this.frames += 1;
    const elapsed = now - this.last;
    if (elapsed >= 500) {
      this.fps = (this.frames * 1000) / elapsed;
      this.frames = 0;
      this.last = now;
      if (this.el) this.el.textContent = `FPS: ${this.fps.toFixed(1)}`;
    }
    return this.fps;
  }
}
