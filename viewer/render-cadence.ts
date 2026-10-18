/** Caps rendering at the requested cadence; requestAnimationFrame still controls screen availability. */
export class RenderCadence {
  private next: number | null = null;
  private readonly period: number;
  constructor(fps: number) {
    if (!Number.isFinite(fps) || fps <= 0) throw new RangeError("Invalid FPS");
    this.period = 1000 / fps;
  }
  reset(): void {
    this.next = null;
  }
  shouldRender(now: number): boolean {
    if (this.next === null) this.next = now;
    // Small allowance for browser timestamp jitter, keeping the original schedule.
    if (now + 0.25 < this.next) return false;
    this.next +=
      (Math.floor((now + 0.25 - this.next) / this.period) + 1) * this.period;
    return true;
  }
}
