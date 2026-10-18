import type { SimulationOptions, Vector3 } from './types.ts';
import { axes } from './vector.ts';

export type FlightLimits = Readonly<Pick<SimulationOptions, 'minSpeed' | 'maxSpeed' | 'maxAcceleration'>> & {
  readonly bounds: Readonly<Vector3>;
};

export function validateVector(vector: Readonly<Vector3>, name: string): void {
  if (!vector || axes.some(axis => !Number.isFinite(vector[axis]))) {
    throw new RangeError(`${name} must have finite x, y and z components`);
  }
}

export function validateFlightLimits(limits: FlightLimits): void {
  validateVector(limits.bounds, 'bounds');
  if (axes.some(axis => limits.bounds[axis] <= 0)) throw new RangeError('bounds must be positive');
  if (![limits.minSpeed, limits.maxSpeed, limits.maxAcceleration].every(Number.isFinite)
    || limits.minSpeed <= 0 || limits.maxSpeed < limits.minSpeed || limits.maxAcceleration <= 0) {
    throw new RangeError('Invalid speed or acceleration limits');
  }
}
