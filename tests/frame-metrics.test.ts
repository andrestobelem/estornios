import { expect, test } from "bun:test";
import { FrameMetrics } from "../viewer/frame-metrics.ts";

test("counts all 120 Hz callbacks with alternating 0.3 ms jitter", () => {
  const metrics = new FrameMetrics();
  const samples = [];
  for (let i = 0; i <= 1200; i++) {
    const now = (i * 1000) / 120 + (i % 2 ? -0.3 : 0.3);
    const sample = metrics.record(now, 0.8, true);
    if (sample) samples.push(sample);
  }
  expect(samples.length).toBeGreaterThan(10);
  for (const sample of samples) {
    expect(sample.callbacksPerSecond).toBeGreaterThan(119);
    expect(sample.renderedPerSecond).toBeGreaterThan(119);
    expect(sample.meanWorkMs).toBeCloseTo(0.8, 8);
  }
});

test("distinguishes 60 Hz input, paused painting and work duration", () => {
  const metrics = new FrameMetrics();
  let sample;
  for (let i = 0; i <= 32; i++)
    sample = metrics.record((i * 1000) / 60, 1.5, false) ?? sample;
  expect(sample!.callbacksPerSecond).toBeCloseTo(60, 6);
  expect(sample!.renderedPerSecond).toBe(0);
  expect(sample!.meanWorkMs).toBe(1.5);
  metrics.reset();
  expect(metrics.record(100000, 0.5, true)).toBeNull();
});
