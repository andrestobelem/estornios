import { expect, test } from 'bun:test';
import { createSimulationOptions } from '../src/configuration.ts';

test('configuration is detached and deeply frozen', () => {
  const bounds = { x: 10, y: 20, z: 30 };
  const options = createSimulationOptions({ bounds });
  bounds.x = 999;
  expect(options.bounds.x).toBe(10);
  expect(Object.isFrozen(options)).toBe(true);
  expect(Object.isFrozen(options.bounds)).toBe(true);
  expect(() => Object.assign(options, { minSpeed: -1 })).toThrow();
  expect(() => Object.assign(options.bounds, { x: 0 })).toThrow();
  expect(createSimulationOptions().bounds.x).toBe(100);
});

test('configuration rejects invalid flight and flocking parameters', () => {
  for (const patch of [
    { minSpeed: 0 }, { maxSpeed: 1 }, { maxAcceleration: Infinity },
    { bounds: { x: -1, y: 10, z: 10 } }, { perceptionRadius: 0 },
    { separationRadius: 31 }, { alignmentWeight: -1 }, { neighbors: 0 },
  ]) expect(() => createSimulationOptions(patch)).toThrow(RangeError);
});
