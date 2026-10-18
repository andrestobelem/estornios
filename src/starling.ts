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
}
