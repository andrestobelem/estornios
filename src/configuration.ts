import type { SimulationOptions } from './types.ts';
import { axes } from './vector.ts';

const defaults: SimulationOptions = {
  count: 300, seed: 1, bounds: { x: 100, y: 60, z: 100 },
  perceptionRadius: 30, separationRadius: 6, neighbors: 7,
  minSpeed: 8, maxSpeed: 18, maxAcceleration: 20,
  separationWeight: 1.8, alignmentWeight: 1, cohesionWeight: 0.7,
};

export class SimulationConfiguration {
  readonly value: SimulationOptions;
  constructor(options: Partial<SimulationOptions> = {}) {
    const o = this.value = {...defaults,...options,bounds:{...(options.bounds ?? defaults.bounds)}};
    for (const [key,value] of Object.entries(o)) {
      if (key !== 'bounds' && (typeof value !== 'number' || !Number.isFinite(value))) throw new RangeError(`Invalid ${key}`);
    }
    if (!Number.isInteger(o.count) || o.count<0 || !Number.isInteger(o.seed) || !Number.isInteger(o.neighbors) || o.neighbors<1) throw new RangeError('Invalid count, seed or neighbors');
    for (const axis of axes) if (!Number.isFinite(o.bounds[axis]) || o.bounds[axis]<=0) throw new RangeError('Invalid bounds');
    if (o.minSpeed<=0 || o.maxSpeed<o.minSpeed || o.maxAcceleration<=0 || o.perceptionRadius<=0 || o.separationRadius<=0 || o.separationRadius>o.perceptionRadius) throw new RangeError('Invalid speed, acceleration or radii');
    if ([o.separationWeight,o.alignmentWeight,o.cohesionWeight].some(v=>v<0)) throw new RangeError('Weights must be nonnegative');
  }
}
