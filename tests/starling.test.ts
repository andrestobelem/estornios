import { expect, test } from "bun:test";
import { Starling } from "../src/starling.ts";

test("an individual bird copies and validates its initial state", () => {
  const state = { sp: 0, x: 10, y: 20, vx: 3, vy: 1, ax: 0, ay: 0 };
  const bird = new Starling(state);
  state.x = 99;
  expect(bird.x).toBe(10);
  expect(() => new Starling({ ...state, sp: 3 })).toThrow();
  expect(() => new Starling({ ...state, vx: NaN })).toThrow();
});

test("canvas borders reflect outward motion without teleporting to the opposite side", () => {
  for (const [x, y, vx, vy, expectedX, expectedY, expectedVx, expectedVy] of [
    [-1, 50, -3, 2, 5, 50, 3, 2],
    [101, 50, 3, 2, 95, 50, -3, 2],
    [50, -1, 2, -3, 50, 5, 2, 3],
    [50, 101, 2, 3, 50, 95, 2, -3],
  ] as const) {
    const bird = new Starling({ sp: 0, x, y, vx, vy, ax: 0, ay: 0 });
    bird.contain(100, 100, 5);
    expect([bird.x, bird.y, bird.vx, bird.vy]).toEqual([
      expectedX,
      expectedY,
      expectedVx,
      expectedVy,
    ]);
  }
});
