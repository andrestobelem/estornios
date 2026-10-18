/** Side-on view of the 3D scene, with a reversible screen/world transform. */
export class SkyCamera {
  constructor(readonly width: number, readonly height: number) {}

  get scale(): number { return Math.min(this.width / 400, this.height / 270); }

  project(x: number, y: number) {
    return { x: this.width / 2 + x * this.scale, y: this.height * 0.4 - y * this.scale };
  }

  unproject(x: number, y: number) {
    return { x: (x - this.width / 2) / this.scale, y: -(y - this.height * 0.4) / this.scale };
  }
}
