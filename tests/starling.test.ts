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
