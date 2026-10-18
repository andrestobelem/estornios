export interface FrameSample {
  callbacksPerSecond: number;
  renderedPerSecond: number;
  meanWorkMs: number;
}

/** Observes every callback without scheduling or suppressing frames. */
export class FrameMetrics {
  private last: number | null = null;
  private elapsed = 0;
  private callbacks = 0;
  private rendered = 0;
  private work = 0;

  reset(): void {
    this.last = null;
    this.elapsed = this.callbacks = this.rendered = this.work = 0;
  }

  record(now: number, workMs: number, painted: boolean): FrameSample | null {
    if (this.last === null) {
      this.last = now;
      return null;
    }
    this.elapsed += now - this.last;
    this.last = now;
    this.callbacks++;
    this.rendered += Number(painted);
    this.work += workMs;
    if (this.elapsed < 500) return null;
    const sample = {
      callbacksPerSecond: (this.callbacks * 1000) / this.elapsed,
      renderedPerSecond: (this.rendered * 1000) / this.elapsed,
      meanWorkMs: this.work / this.callbacks,
    };
    this.elapsed = this.callbacks = this.rendered = this.work = 0;
    return sample;
  }
}
