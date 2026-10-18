import { expect, test } from 'bun:test';
import { FlightCamera } from '../viewer/projection.ts';

test('projects the origin to the viewport center at desktop and mobile sizes', () => {
  const camera = new FlightCamera();
  for (const [w, h] of [[960, 420], [320, 320]]) {
    const point = camera.project({ x: 0, y: 0, z: 0 }, w!, h!);
    expect(point.x).toBe(w! / 2); expect(point.y).toBe(h! / 2);
  }
});

test('top view separates depth while side view preserves altitude', () => {
  const camera = new FlightCamera(0, Math.PI / 2);
  expect(camera.project({ x: 0, y: 0, z: 10 }, 736, 420).y).toBeGreaterThan(210);
  camera.pitch = 0;
  expect(camera.project({ x: 0, y: 10, z: 0 }, 736, 420).y).toBeLessThan(210);
});
