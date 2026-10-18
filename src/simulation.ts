export type { Bird, Vector3, SimulationOptions } from './types.ts';
import type { Bird, SimulationOptions } from './types.ts';
import { SimulationConfiguration } from './configuration.ts';
import { SeededRandom } from './random.ts';
import { SpatialGrid } from './spatial-grid.ts';
import { FlockingBehavior } from './flocking.ts';
import { mul } from './vector.ts';
import { Starling } from './starling.ts';
export { Starling } from './starling.ts';
export type { FlightLimits } from './starling.ts';

/** Coordinates initialization and synchronous flock updates. */
export class StarlingSimulation {
  private readonly options: SimulationOptions;
  private readonly behavior: FlockingBehavior;
  private birds: Starling[];
  constructor(options: Partial<SimulationOptions> = {}) {
    const o = this.options = new SimulationConfiguration(options).value;
    this.behavior = new FlockingBehavior(o);
    const generator = new SeededRandom(o.seed);
    const random = () => generator.next();
    this.birds = Array.from({length:o.count},(_,id)=>{
      const z = random()*2-1, angle = random()*Math.PI*2, r = Math.sqrt(1-z*z);
      return new Starling({id,position:{x:(random()*2-1)*o.bounds.x*0.5,y:(random()*2-1)*o.bounds.y*0.5,z:(random()*2-1)*o.bounds.z*0.5},velocity:mul({x:r*Math.cos(angle),y:r*Math.sin(angle),z},o.minSpeed+random()*(o.maxSpeed-o.minSpeed))});
    });
  }
  /** Detached data for consumers and renderers. */
  snapshot(): Bird[] { return this.birds.map(b => b.snapshot()); }
  /** Seconds in [0, 1]; integration substeps never exceed 1/60 second. */
  step(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds<0 || seconds>1) throw new RangeError('seconds must be between 0 and 1');
    const steps = Math.ceil(seconds*60);
    for (let i=0;i<steps;i++) this.integrate(seconds/steps);
  }
  private integrate(dt: number): void {
    const o = this.options;
    const previous = this.snapshot();
    const grid = new SpatialGrid(previous, o.perceptionRadius);
    // Every bird reads the same previous frame.
    this.birds = this.birds.map((bird, index) => {
      const state = previous[index]!;
      const acceleration = this.behavior.acceleration(state, grid.neighborsOf(state));
      return bird.advance(acceleration, dt, o);
    });
  }
}
