import { expect, test } from 'bun:test';
import { SpatialGrid } from '../src/spatial-grid.ts';
import type { Bird } from '../index.ts';

test('finds neighbors across cell boundaries and sorts ties by id', () => {
  const bird = (id: number, x: number): Bird => ({
    id, position: { x, y: 0, z: 0 }, velocity: { x: 8, y: 0, z: 0 },
  });
  const target = bird(0, 0);
  const grid = new SpatialGrid([target, bird(3, 10), bird(2, 1), bird(1, -1), bird(4, 11)], 10);
  expect(grid.neighborsOf(target).map(n => [n.bird.id, n.distance])).toEqual([[1, 1], [2, 1], [3, 10]]);
});
