import { expect, test } from "bun:test";
import { RenderCadence } from "../viewer/render-cadence.ts";

test("targets 120 renders on 120 or 240 Hz screens, and accepts all 60 Hz frames", () => {
  for (const refresh of [60, 120, 240]) {
    const cadence = new RenderCadence(120);
    let renders = 0;
    for (let frame = 0; frame < refresh; frame++)
      if (cadence.shouldRender((frame * 1000) / refresh)) renders++;
    expect(renders).toBe(Math.min(refresh, 120));
  }
});

test("reset resumes immediately without catching up hidden time", () => {
  const cadence = new RenderCadence(120);
  expect(cadence.shouldRender(100)).toBe(true);
  expect(cadence.shouldRender(101)).toBe(false);
  cadence.reset();
  expect(cadence.shouldRender(101)).toBe(true);
  expect(cadence.shouldRender(100000)).toBe(true);
  expect(cadence.shouldRender(100000.1)).toBe(false);
});
