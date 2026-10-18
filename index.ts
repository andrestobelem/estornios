export * from './src/simulation.ts';
export * from './src/murmuration.ts';
import { StarlingSimulation } from './src/simulation.ts';
if (import.meta.main) {
  const flock = new StarlingSimulation({ count: 300, seed: 42 });
  for (let frame=0;frame<600;frame++) flock.step(1/60);
  console.log(JSON.stringify({ seconds:10, birds:flock.snapshot().length, sample:flock.snapshot().slice(0,3) },null,2));
}
