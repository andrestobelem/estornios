import type { Vector3 } from '../src/types.ts';

/** Orthographic camera; rotates the flight volume around its vertical axis. */
export class FlightCamera {
  constructor(public yaw = -0.6, public pitch = 0.3) {}

  project(point: Vector3, width: number, height: number) {
    const x = point.x * Math.cos(this.yaw) - point.z * Math.sin(this.yaw);
    const depth = point.x * Math.sin(this.yaw) + point.z * Math.cos(this.yaw);
    const y = point.y * Math.cos(this.pitch) - depth * Math.sin(this.pitch);
    const scale = Math.min(width / 320, height / 260);
    return {
      x: width / 2 + x * scale,
      y: height / 2 - y * scale,
      depth: point.y * Math.sin(this.pitch) + depth * Math.cos(this.pitch),
    };
  }
}
