export type { Bird, Vector3, SimulationOptions } from './types.ts';
import type { Bird, SimulationOptions } from './types.ts';
import { SimulationConfiguration } from './configuration.ts';
import { SeededRandom } from './random.ts';
import { SpatialGrid } from './spatial-grid.ts';
import { FlockingBehavior } from './flocking.ts';
import { add, mul, limit, unit, norm, axes } from './vector.ts';

/** Coordinates initialization and synchronous flock updates. */
export class StarlingSimulation {
  private readonly options: SimulationOptions;
  private readonly behavior: FlockingBehavior;
  private birds: Bird[];
  constructor(options: Partial<SimulationOptions> = {}) {
    const o = this.options = new SimulationConfiguration(options).value;
    this.behavior = new FlockingBehavior(o);
    const generator = new SeededRandom(o.seed);
    const random = () => generator.next();
    this.birds = Array.from({length:o.count},(_,id)=>{
      const z = random()*2-1, angle = random()*Math.PI*2, r = Math.sqrt(1-z*z);
      return {id,position:{x:(random()*2-1)*o.bounds.x*0.5,y:(random()*2-1)*o.bounds.y*0.5,z:(random()*2-1)*o.bounds.z*0.5},velocity:mul({x:r*Math.cos(angle),y:r*Math.sin(angle),z},o.minSpeed+random()*(o.maxSpeed-o.minSpeed))};
    });
  }
  /** Detached data for consumers and renderers. */
  snapshot(): Bird[] { return this.birds.map(b=>({id:b.id,position:{...b.position},velocity:{...b.velocity}})); }
  /** Seconds in [0, 1]; integration substeps never exceed 1/60 second. */
  step(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds<0 || seconds>1) throw new RangeError('seconds must be between 0 and 1');
    const steps = Math.ceil(seconds*60);
    for (let i=0;i<steps;i++) this.integrate(seconds/steps);
  }
  private integrate(dt: number): void {
    const o = this.options;
    const grid = new SpatialGrid(this.birds, o.perceptionRadius);
    // Every bird reads the same previous frame.
    this.birds = this.birds.map(bird => {
      const acceleration = this.behavior.acceleration(bird, grid.neighborsOf(bird));
      let velocity=add(bird.velocity,mul(limit(acceleration,o.maxAcceleration),dt));
      velocity=mul(unit(velocity),Math.max(o.minSpeed,Math.min(o.maxSpeed,norm(velocity))));
      const position=add(bird.position,mul(velocity,dt));
      // Reflect at hard bounds when soft steering cannot turn fast enough.
      for (const axis of axes) if (Math.abs(position[axis])>o.bounds[axis]) {
        position[axis]=Math.sign(position[axis])*o.bounds[axis];
        velocity[axis]=-Math.sign(position[axis])*Math.abs(velocity[axis]);
      }
      return {id:bird.id,position,velocity};
    });
  }
}
