import type { Bird, Vector3 } from './types.ts';
import { Starling } from './starling.ts';
import { StarlingSimulation } from './simulation.ts';
import { createSimulationOptions } from './configuration.ts';
import { FlockingBehavior } from './flocking.ts';
import { SpatialGrid } from './spatial-grid.ts';
import { SeededRandom } from './random.ts';
import { add, sub, mul, norm, unit, zero, limit } from './vector.ts';
import { validateVector } from './validation.ts';

export interface FieldParameters { separation: number; alignment: number; cohesion: number; speed: number; wind: number }
export interface FieldBird extends Bird { species: number }
export interface Obstacle { x: number; y: number; radius: number }
export interface Alarm { x: number; y: number; strength: number }
export const FIELD_BOUNDS = Object.freeze({ x: 180, y: 100, z: 60 });
export const SPECIES = Object.freeze([
  Object.freeze({ name: 'Estornino', speed: 1, separation: 1, alignment: 1, cohesion: 1 }),
  Object.freeze({ name: 'Golondrina', speed: 1.4, separation: 0.8, alignment: 0.55, cohesion: 0.45 }),
  Object.freeze({ name: 'Paloma', speed: 0.72, separation: 1.6, alignment: 1.2, cohesion: 1.5 }),
]);

/** Multi-species scene; composes the same entities, neighbor index and flocking rules as the base simulator. */
export class Murmuration {
  private flocks: Starling[][] = [[], [], []];
  private parameters: FieldParameters = { separation: 1.6, alignment: 1, cohesion: 0.9, speed: 3.4, wind: 0 };
  private obstacles: Obstacle[] = [];
  private alarm: Alarm | null = null;
  private predator: Bird | null = null;
  private readonly random: SeededRandom;
  private readonly seed: number;

  constructor(counts: readonly number[] = [450, 90, 40], seed = 42) {
    if (counts.length !== 3 || !Number.isSafeInteger(seed)) throw new RangeError('Expected three counts and an integer seed');
    this.seed = seed;
    this.random = new SeededRandom(seed);
    counts.forEach((count, species) => this.setCount(species, count));
  }

  get settings(): FieldParameters { return { ...this.parameters }; }

  configure(patch: Partial<FieldParameters>): void {
    const next = { ...this.parameters, ...patch };
    if (!Object.values(next).every(Number.isFinite)
      || [next.separation, next.alignment, next.cohesion].some(n => n < 0 || n > 3)
      || next.speed < 1 || next.speed > 7 || Math.abs(next.wind) > 1) throw new RangeError('Invalid field parameters');
    this.parameters = next;
  }

  setCount(species: number, count: number): void {
    if (!Number.isInteger(species) || !SPECIES[species] || !Number.isInteger(count) || count < 0 || count > [1200, 400, 200][species]!) throw new RangeError('Invalid species or count');
    const flock = this.flocks[species]!;
    if (count <= flock.length) { this.flocks[species] = flock.slice(0, count); return; }
    const initial = new StarlingSimulation({ count, seed: this.seed + species * 101, bounds: FIELD_BOUNDS }).snapshot();
    for (let i = flock.length; i < count; i++) {
      const bird = initial[i]!;
      this.flocks[species]!.push(new Starling({ ...bird, id: species * 10000 + i }));
    }
  }

  snapshot(): FieldBird[] {
    return this.flocks.flatMap((flock, species) => flock.map(bird => ({ ...bird.snapshot(), species })));
  }

  environment() {
    return {
      obstacles: this.obstacles.map(ob => ({ ...ob })),
      alarm: this.alarm ? { ...this.alarm } : null,
      hawk: this.predator ? { ...this.predator, position: { ...this.predator.position }, velocity: { ...this.predator.velocity } } : null,
    };
  }

  scare(x: number, y: number): void {
    validateVector({ x, y, z: 0 }, 'alarm');
    this.alarm = { x, y, strength: 1 };
  }

  toggleObstacle(x: number, y: number): void {
    validateVector({ x, y, z: 0 }, 'obstacle');
    if (Math.abs(x) > FIELD_BOUNDS.x - 14 || Math.abs(y) > FIELD_BOUNDS.y - 14) return;
    const hit = this.obstacles.findIndex(ob => Math.hypot(x - ob.x, y - ob.y) < ob.radius);
    if (hit >= 0) this.obstacles.splice(hit, 1);
    else if (this.obstacles.length < 20) this.obstacles.push({ x, y, radius: 10 });
  }

  clearObstacles(): void { this.obstacles = []; }

  setHawk(enabled: boolean): void {
    this.predator = enabled ? { id: 99999, position: { x: -160, y: 45, z: 0 }, velocity: { x: 20, y: 0, z: 0 } } : null;
  }

  scatter(): void {
    this.flocks = this.flocks.map(flock => flock.map(bird => {
      const angle = this.random.next() * Math.PI * 2;
      const z = this.random.next() * 2 - 1;
      return new Starling({ ...bird.snapshot(), velocity: mul(unit({ x: Math.cos(angle), y: Math.sin(angle), z }), this.parameters.speed * 7) });
    }));
  }

  step(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1) throw new RangeError('seconds must be between 0 and 1');
    const steps = Math.ceil(seconds * 60);
    for (let i = 0; i < steps; i++) this.integrate(seconds / steps);
  }

  private integrate(dt: number): void {
    const before = this.snapshot();
    const grid = new SpatialGrid(before, 30);
    const environment = this.environment();
    this.flocks = this.flocks.map((flock, species) => {
      const profile = SPECIES[species]!;
      const p = this.parameters;
      const options = createSimulationOptions({
        bounds: FIELD_BOUNDS, minSpeed: p.speed * 3 * profile.speed, maxSpeed: p.speed * 6 * profile.speed,
        maxAcceleration: 28, separationWeight: p.separation * profile.separation,
        alignmentWeight: p.alignment * profile.alignment, cohesionWeight: p.cohesion * profile.cohesion,
      });
      const behavior = new FlockingBehavior(options);
      return flock.map(bird => {
        const state = bird.snapshot();
        const nearby = grid.neighborsOf(state);
        const sameSpecies = nearby.filter(n => Math.floor(n.bird.id / 10000) === species);
        let acceleration = behavior.acceleration(state, sameSpecies);
        acceleration = add(acceleration, { x: p.wind * 10, y: 0, z: 0 });
        for (const other of nearby) if (Math.floor(other.bird.id / 10000) !== species && other.distance < 9) {
          const away = other.distance > 1e-10 ? unit(sub(state.position, other.bird.position)) : { x: state.id < other.bird.id ? -1 : 1, y: 0, z: 0 };
          acceleration = add(acceleration, mul(away, (1 - other.distance / 9) * 45));
        }
        for (const ob of environment.obstacles) {
          const ahead = add(state.position, mul(state.velocity, 0.4));
          acceleration = add(acceleration, this.repel(ahead, ob.x, ob.y, ob.radius + 14, 100));
        }
        if (environment.alarm) acceleration = add(acceleration, this.repel(state.position, environment.alarm.x, environment.alarm.y, 55, 160 * environment.alarm.strength));
        if (environment.hawk) acceleration = add(acceleration, this.repel(state.position, environment.hawk.position.x, environment.hawk.position.y, 50, 150));
        let next = bird.advance(acceleration, dt, options);
        // Obstacles are cylinders through the scene depth, matching their screen-space footprint.
        for (const ob of environment.obstacles) {
          const data = next.snapshot();
          const delta = { x: data.position.x - ob.x, y: data.position.y - ob.y, z: 0 };
          if (norm(delta) < ob.radius + 1) {
            const away = unit(delta);
            data.position.x = ob.x + away.x * (ob.radius + 1);
            data.position.y = ob.y + away.y * (ob.radius + 1);
            next = new Starling(data);
          }
        }
        return next;
      });
    });
    if (this.alarm) {
      this.alarm.strength *= Math.exp(-4 * dt);
      if (this.alarm.strength < 0.05) this.alarm = null;
    }
    if (this.predator) this.advanceHawk(before, dt);
  }

  private repel(position: Vector3, x: number, y: number, radius: number, force: number): Vector3 {
    const delta = { x: position.x - x, y: position.y - y, z: 0 };
    const distance = norm(delta);
    return distance < radius ? mul(unit(delta), (1 - distance / radius) * force) : zero();
  }

  private advanceHawk(birds: readonly FieldBird[], dt: number): void {
    const hawk = this.predator!;
    let target: FieldBird | undefined;
    let distance = Infinity;
    for (const bird of birds) {
      const d = norm(sub(bird.position, hawk.position));
      if (d < distance) { target = bird; distance = d; }
    }
    let force = target ? mul(unit(sub(target.position, hawk.position)), 35) : zero();
    for (const ob of this.obstacles) force = add(force, this.repel(hawk.position, ob.x, ob.y, ob.radius + 15, 80));
    const velocity = limit(add(hawk.velocity, mul(force, dt)), this.parameters.speed * 7.5);
    const position = add(hawk.position, mul(velocity, dt));
    this.predator = { id: hawk.id, position, velocity };
  }
}
