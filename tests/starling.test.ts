import { expect, test } from 'bun:test';
import { Starling } from '../index.ts';
import type { FlightLimits } from '../index.ts';

const limits: FlightLimits = {
  bounds: { x: 10, y: 10, z: 10 }, minSpeed: 1, maxSpeed: 5, maxAcceleration: 2,
};
const state = () => ({ id: 7, position: { x: 0, y: 0, z: 0 }, velocity: { x: 2, y: 0, z: 0 } });

test('encapsulates constructor data and snapshots', () => {
  const input = state();
  const bird = new Starling(input);
  input.position.x = 99;
  input.velocity.x = 99;
  const snapshot = bird.snapshot();
  snapshot.position.x = -99;
  snapshot.velocity.x = -99;
  expect(bird.id).toBe(7);
  expect(bird.snapshot()).toEqual(state());
});

test('advances with capped acceleration without mutating the previous frame', () => {
  const bird = new Starling(state());
  const next = bird.advance({ x: 100, y: 0, z: 0 }, 0.5, limits);
  expect(next).toBeInstanceOf(Starling);
  expect(next.snapshot()).toEqual({ id: 7, position: { x: 1.5, y: 0, z: 0 }, velocity: { x: 3, y: 0, z: 0 } });
  expect(bird.snapshot()).toEqual(state());
});

test('caps speed and reflects velocity at flight boundaries', () => {
  const bird = new Starling({ id: 1, position: { x: 9, y: 0, z: 0 }, velocity: { x: 5, y: 0, z: 0 } });
  const next = bird.advance({ x: 2, y: 0, z: 0 }, 1, limits);
  expect(next.snapshot()).toEqual({ id: 1, position: { x: 10, y: 0, z: 0 }, velocity: { x: -5, y: 0, z: 0 } });
});

test('preserves state at zero time and rejects invalid time', () => {
  const bird = new Starling(state());
  expect(bird.advance({ x: 100, y: 0, z: 0 }, 0, limits).snapshot()).toEqual(state());
  for (const dt of [-1, 2, NaN, Infinity]) expect(() => bird.advance({ x: 0, y: 0, z: 0 }, dt, limits)).toThrow();
});

test('rejects invalid identities and nonfinite initial state', () => {
  for (const id of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => new Starling({ ...state(), id })).toThrow(RangeError);
  }
  for (const field of ['position', 'velocity'] as const) {
    for (const axis of ['x', 'y', 'z'] as const) {
      for (const value of [NaN, Infinity, -Infinity]) {
        const input = state();
        input[field][axis] = value;
        expect(() => new Starling(input)).toThrow(RangeError);
      }
    }
  }
});

test('rejects nonfinite acceleration even at zero time without corrupting the bird', () => {
  const bird = new Starling(state());
  for (const axis of ['x', 'y', 'z'] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const acceleration = { x: 0, y: 0, z: 0, [axis]: value };
      for (const dt of [0, 0.1]) expect(() => bird.advance(acceleration, dt, limits)).toThrow(RangeError);
    }
  }
  expect(bird.snapshot()).toEqual(state());
});

test('rejects invalid flight limits even at zero time', () => {
  const bird = new Starling(state());
  const invalidLimits: FlightLimits[] = [
    ...[0, -1, NaN, Infinity].map(minSpeed => ({ ...limits, minSpeed })),
    ...[0, NaN, Infinity].map(maxSpeed => ({ ...limits, maxSpeed })),
    ...[0, -1, NaN, Infinity].map(maxAcceleration => ({ ...limits, maxAcceleration })),
    ...[0, -1, NaN, Infinity].map(x => ({ ...limits, bounds: { ...limits.bounds, x } })),
  ];
  for (const invalid of invalidLimits) for (const dt of [0, 0.1]) {
    expect(() => bird.advance({ x: 0, y: 0, z: 0 }, dt, invalid)).toThrow(RangeError);
  }
  expect(bird.snapshot()).toEqual(state());
});
