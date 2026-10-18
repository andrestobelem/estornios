export interface BirdState {
  sp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

/** Mutable entity owned by the scene; exposed to renderers through a readonly view. */
export class Starling implements BirdState {
  sp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  constructor(state: BirdState) {
    if (
      !Number.isInteger(state.sp) ||
      state.sp < 0 ||
      state.sp > 2 ||
      !Object.values(state).every(Number.isFinite)
    )
      throw new RangeError("Invalid bird state");
    this.sp = state.sp;
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.ax = state.ax;
    this.ay = state.ay;
  }
  /** Keep the full silhouette inside the canvas; only outward velocity is reflected. */
  contain(width: number, height: number, radius: number): void {
    const left = Math.min(radius, width / 2);
    const top = Math.min(radius, height / 2);
    const right = width - left;
    const bottom = height - top;
    if (left === right) {
      this.x = left;
      this.vx = 0;
    } else if (this.x < left) {
      this.x = left;
      this.vx = Math.abs(this.vx);
    } else if (this.x > right) {
      this.x = right;
      this.vx = -Math.abs(this.vx);
    }
    if (top === bottom) {
      this.y = top;
      this.vy = 0;
    } else if (this.y < top) {
      this.y = top;
      this.vy = Math.abs(this.vy);
    } else if (this.y > bottom) {
      this.y = bottom;
      this.vy = -Math.abs(this.vy);
    }
  }
}
