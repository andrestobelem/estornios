import { expect, test } from "bun:test";
import { SkyRenderer } from "../viewer/sky-renderer.ts";
import { Murmuration } from "../src/murmuration.ts";

test("paused scenes are painted once and repaint after invalidation", () => {
  let paints = 0;
  const ctx = new Proxy(
    {
      fillRect() {
        paints++;
      },
      createLinearGradient() {
        return { addColorStop() {} };
      },
    },
    {
      get(target, key) {
        return Reflect.get(target, key) ?? (() => {});
      },
    },
  );
  const canvas = { getContext: () => ctx } as unknown as HTMLCanvasElement;
  const renderer = new SkyRenderer(canvas);
  const scene = new Murmuration(1280, 720, [0, 0, 0]);
  renderer.draw(scene, true, true, 1 / 120);
  renderer.draw(scene, true, true, 1 / 120);
  expect(paints).toBe(1);
  renderer.invalidate();
  renderer.draw(scene, true, true, 1 / 120);
  expect(paints).toBe(2);
  renderer.draw(scene, true, false, 1 / 120);
  expect(paints).toBe(3);
});
