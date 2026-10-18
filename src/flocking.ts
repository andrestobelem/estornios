import type { Bird } from './types.ts';
import type { ValidatedSimulationOptions } from './configuration.ts';
import type { Neighbor } from './spatial-grid.ts';
import { zero, add, mul, sub, axes } from './vector.ts';

/** Separation, alignment, cohesion and boundary steering. */
export class FlockingBehavior {
  constructor(private readonly options: ValidatedSimulationOptions) {}
  acceleration(bird: Bird, nearby: readonly Neighbor[]) {
    const o = this.options;
      let separation = zero();
      for (const other of nearby) if (other.distance<o.separationRadius) {
        const away = other.distance>1e-10 ? mul(sub(bird.position,other.bird.position),1/other.distance) : {x:bird.id<other.bird.id?-1:1,y:0,z:0};
        separation = add(separation,mul(away,1-other.distance/o.separationRadius));
      }
      let acceleration = mul(separation,o.maxAcceleration*o.separationWeight);
      const neighbors = nearby.slice(0,o.neighbors);
      if (neighbors.length) {
        let center = zero(), velocity = zero();
        for (const other of neighbors) { center=add(center,other.bird.position); velocity=add(velocity,other.bird.velocity); }
        acceleration=add(acceleration,mul(sub(mul(velocity,1/neighbors.length),bird.velocity),o.alignmentWeight));
        acceleration=add(acceleration,mul(sub(mul(center,1/neighbors.length),bird.position),o.cohesionWeight));
      }
      for (const axis of axes) {
        const ratio=bird.position[axis]/o.bounds[axis];
        if (Math.abs(ratio)>0.7) acceleration[axis]-=Math.sign(ratio)*(Math.abs(ratio)-0.7)/0.3*o.maxAcceleration*2;
      }
    return acceleration;
  }
}
