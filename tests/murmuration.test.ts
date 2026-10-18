import { expect, test } from 'bun:test';
import { Murmuration, FIELD_BOUNDS } from '../src/murmuration.ts';

test('species counts change independently and settings preserve positions', () => {
  const scene = new Murmuration([8, 3, 2]);
  const before = scene.snapshot();
  scene.configure({ wind: 0.5, cohesion: 2 });
  expect(scene.snapshot()).toEqual(before);
  scene.setCount(0, 12);
  expect(scene.snapshot().filter(b => b.species !== 0)).toEqual(before.filter(b => b.species !== 0));
  expect(new Set(scene.snapshot().map(b => b.id)).size).toBe(17);
});

test('environment is detached and empty scenes can advance with a hawk', () => {
  const scene = new Murmuration([0, 0, 0]);
  scene.setHawk(true); scene.scare(0, 0); scene.toggleObstacle(0, 0);
  const state = scene.environment(); state.obstacles[0]!.x = 99; state.hawk!.position.x = 99;
  expect(scene.environment().obstacles[0]!.x).toBe(0);
  expect(scene.environment().hawk!.position.x).toBe(-160);
  scene.step(1);
  expect(scene.environment().alarm).toBeNull();
  scene.clearObstacles(); expect(scene.environment().obstacles).toEqual([]);
  scene.setHawk(false); expect(scene.environment().hawk).toBeNull();
});

test('wind, alarm and predator affect reproducible finite trajectories', () => {
  const a = new Murmuration([10, 5, 3]), b = new Murmuration([10, 5, 3]);
  a.configure({ wind: 1 }); b.configure({ wind: 1 });
  a.scare(0, 0); b.scare(0, 0); a.setHawk(true); b.setHawk(true);
  a.scatter(); b.scatter();
  a.step(1); b.step(1);
  expect(a.snapshot()).toEqual(b.snapshot());
  const baseline = new Murmuration([10, 5, 3]); baseline.step(1);
  expect(a.snapshot()).not.toEqual(baseline.snapshot());
  for (const bird of a.snapshot()) for (const axis of ['x', 'y', 'z'] as const) {
    expect(Number.isFinite(bird.velocity[axis])).toBe(true);
    expect(Math.abs(bird.position[axis])).toBeLessThanOrEqual(FIELD_BOUNDS[axis]);
  }
});

test('validates scene parameters and rejects invalid counts and input coordinates', () => {
  const scene = new Murmuration([0, 0, 0]);
  expect(() => scene.configure({ wind: NaN })).toThrow();
  expect(() => scene.configure({ speed: 0 })).toThrow();
  expect(() => scene.setCount(0, 1201)).toThrow();
  expect(() => scene.setCount(3, 1)).toThrow();
  expect(() => scene.scare(Infinity, 0)).toThrow();
  expect(() => scene.toggleObstacle(0, NaN)).toThrow();
  expect(() => scene.step(-1)).toThrow();
});

test('an obstacle at a bird position pushes it out and can be removed by another tap', () => {
  const scene = new Murmuration([1, 0, 0]);
  const p = scene.snapshot()[0]!.position;
  scene.toggleObstacle(p.x, p.y);
  scene.step(1 / 60);
  const after = scene.snapshot()[0]!.position;
  expect(Math.hypot(after.x - p.x, after.y - p.y)).toBeGreaterThanOrEqual(11 - 1e-10);
  scene.toggleObstacle(p.x, p.y);
  expect(scene.environment().obstacles).toEqual([]);
});

test('wind and alarm each change the trajectory by themselves', () => {
  const baseline = new Murmuration([10, 0, 0]); baseline.step(0.2);
  for (const apply of [
    (scene: Murmuration) => scene.configure({ wind: 1 }),
    (scene: Murmuration) => { const p = scene.snapshot()[0]!.position; scene.scare(p.x, p.y); },
  ]) {
    const scene = new Murmuration([10, 0, 0]);
    apply(scene); scene.step(0.2);
    expect(scene.snapshot()).not.toEqual(baseline.snapshot());
  }
});

test('a hunting hawk changes the flock trajectory after approaching it', () => {
  const hunted = new Murmuration([10, 0, 0]);
  const baseline = new Murmuration([10, 0, 0]);
  hunted.setHawk(true);
  for (let i = 0; i < 5; i++) { hunted.step(1); baseline.step(1); }
  expect(hunted.snapshot()).not.toEqual(baseline.snapshot());
});
