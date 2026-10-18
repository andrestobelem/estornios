export interface Vector3 { x: number; y: number; z: number }
export interface Bird { id: number; position: Vector3; velocity: Vector3 }
export interface SimulationOptions {
  count: number; seed: number; bounds: Vector3;
  perceptionRadius: number; separationRadius: number; neighbors: number;
  minSpeed: number; maxSpeed: number; maxAcceleration: number;
  separationWeight: number; alignmentWeight: number; cohesionWeight: number;
}
const defaults: SimulationOptions = {
  count: 300, seed: 1, bounds: { x: 100, y: 60, z: 100 },
  perceptionRadius: 30, separationRadius: 6, neighbors: 7,
  minSpeed: 8, maxSpeed: 18, maxAcceleration: 20,
  separationWeight: 1.8, alignmentWeight: 1, cohesionWeight: 0.7,
};
const axes = ['x', 'y', 'z'] as const;
const zero = (): Vector3 => ({ x: 0, y: 0, z: 0 });
const add = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x+b.x, y:a.y+b.y, z:a.z+b.z });
const mul = (v: Vector3, n: number): Vector3 => ({ x:v.x*n, y:v.y*n, z:v.z*n });
const sub = (a: Vector3, b: Vector3) => add(a, mul(b,-1));
const norm = (v: Vector3) => Math.hypot(v.x,v.y,v.z);
const unit = (v: Vector3) => norm(v)>1e-10 ? mul(v,1/norm(v)) : {x:1,y:0,z:0};
const limit = (v: Vector3, max: number) => norm(v)>max ? mul(unit(v),max) : v;

/** Deterministic 3D Boids approximation with closest-neighbor flocking. */
export class StarlingSimulation {
  private readonly options: SimulationOptions;
  private birds: Bird[];
  constructor(options: Partial<SimulationOptions> = {}) {
    const o = this.options = {...defaults,...options,bounds:{...(options.bounds ?? defaults.bounds)}};
    for (const [key,value] of Object.entries(o)) {
      if (key !== 'bounds' && (typeof value !== 'number' || !Number.isFinite(value))) throw new RangeError(`Invalid ${key}`);
    }
    if (!Number.isInteger(o.count) || o.count<0 || !Number.isInteger(o.seed) || !Number.isInteger(o.neighbors) || o.neighbors<1) throw new RangeError('Invalid count, seed or neighbors');
    for (const axis of axes) if (!Number.isFinite(o.bounds[axis]) || o.bounds[axis]<=0) throw new RangeError('Invalid bounds');
    if (o.minSpeed<=0 || o.maxSpeed<o.minSpeed || o.maxAcceleration<=0 || o.perceptionRadius<=0 || o.separationRadius<=0 || o.separationRadius>o.perceptionRadius) throw new RangeError('Invalid speed, acceleration or radii');
    if ([o.separationWeight,o.alignmentWeight,o.cohesionWeight].some(v=>v<0)) throw new RangeError('Weights must be nonnegative');
    let state = o.seed >>> 0;
    const random = () => {
      state = (state+0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15),state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7),t | 61);
      return ((t ^ (t >>> 14)) >>> 0)/4294967296;
    };
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
    const o = this.options, cells = new Map<string,Bird[]>();
    const cell = (p: Vector3) => axes.map(a=>Math.floor(p[a]/o.perceptionRadius)) as [number,number,number];
    for (const bird of this.birds) {
      const key = cell(bird.position).join(',');
      const bucket = cells.get(key) ?? [];
      bucket.push(bird); cells.set(key,bucket);
    }
    // All forces read the previous frame, avoiding update-order bias.
    this.birds = this.birds.map(bird=>{
      const [cx,cy,cz] = cell(bird.position);
      const nearby: {bird: Bird; distance: number}[] = [];
      for (let x=-1;x<=1;x++) for (let y=-1;y<=1;y++) for (let z=-1;z<=1;z++) {
        for (const other of cells.get(`${cx+x},${cy+y},${cz+z}`) ?? []) {
          if (other.id===bird.id) continue;
          const distance = norm(sub(bird.position,other.position));
          if (distance<=o.perceptionRadius) nearby.push({bird:other,distance});
        }
      }
      nearby.sort((a,b)=>a.distance-b.distance || a.bird.id-b.bird.id);
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
