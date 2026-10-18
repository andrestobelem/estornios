import type { Bird, SimulationOptions, Vector3 } from './types.ts';
import { add, mul, limit, unit, norm, axes } from './vector.ts';

export type FlightLimits = Pick<SimulationOptions, 'bounds' | 'minSpeed' | 'maxSpeed' | 'maxAcceleration'>;

/** An individual bird with encapsulated state and immutable movement updates. */
export class Starling {
  private readonly state: Bird;

  constructor(state: Bird) {
    this.state = { id: state.id, position: { ...state.position }, velocity: { ...state.velocity } };
  }

  get id(): number { return this.state.id; }

  snapshot(): Bird {
    return { id: this.id, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
  }

  /** Returns the next bird, leaving this frame's state intact for neighbor queries. */
  advance(acceleration: Vector3, dt: number, limits: FlightLimits): Starling {
    if (!Number.isFinite(dt) || dt < 0 || dt > 1) throw new RangeError('dt must be between 0 and 1');
    if (dt === 0) return new Starling(this.state);
    let velocity = add(this.state.velocity, mul(limit(acceleration, limits.maxAcceleration), dt));
    velocity = mul(unit(velocity), Math.max(limits.minSpeed, Math.min(limits.maxSpeed, norm(velocity))));
    const position = add(this.state.position, mul(velocity, dt));
    // Reflect at hard bounds when soft steering cannot turn fast enough.
    for (const axis of axes) if (Math.abs(position[axis]) > limits.bounds[axis]) {
      position[axis] = Math.sign(position[axis]) * limits.bounds[axis];
      velocity[axis] = -Math.sign(position[axis]) * Math.abs(velocity[axis]);
    }
    return new Starling({ id: this.id, position, velocity });
  }
}
