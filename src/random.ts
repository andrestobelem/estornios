/** Seeded generator, isolated from the simulation lifecycle. */
export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number {
    this.state = (this.state+0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15),this.state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7),t | 61);
    return ((t ^ (t >>> 14)) >>> 0)/4294967296;
  }
}
