import { expect, test } from 'bun:test';
import { SkyCamera } from '../viewer/projection.ts';

test('projects the world origin above the viewport center', () => {
  const camera = new SkyCamera(960, 720);
  expect(camera.project(0, 0)).toEqual({ x: 480, y: 288 });
});

test('pointer coordinates round-trip across desktop and mobile views', () => {
  for (const [width, height] of [[1280, 720], [320, 640], [736, 420]] as const) {
    const camera = new SkyCamera(width, height);
    for (const [x, y] of [[0, 0], [-45, 0], [65, 30], [180, -100]] as const) {
      const screen = camera.project(x, y);
      const world = camera.unproject(screen.x, screen.y);
      expect(world.x).toBeCloseTo(x, 10);
      expect(world.y).toBeCloseTo(y, 10);
    }
  }
});
