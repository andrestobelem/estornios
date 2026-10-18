import { test, expect } from 'bun:test';
import { StarlingSimulation } from '../index.ts';

test('reproduces a trajectory from the same seed',()=>{
  const a=new StarlingSimulation({count:20,seed:42}), b=new StarlingSimulation({count:20,seed:42});
  for(let i=0;i<60;i++) { a.step(1/60); b.step(1/60); }
  expect(a.snapshot()).toEqual(b.snapshot());
  expect(a.snapshot()).not.toEqual(new StarlingSimulation({count:20,seed:43}).snapshot());
});
test('maintains finite positions, boundaries and speed through many turns',()=>{
  const flock=new StarlingSimulation({count:50,bounds:{x:12,y:10,z:12}});
  for(let i=0;i<600;i++) {
    flock.step(1/60);
    for(const b of flock.snapshot()) {
      expect(Math.abs(b.position.x)).toBeLessThanOrEqual(12);
      expect(Math.abs(b.position.y)).toBeLessThanOrEqual(10);
      expect(Math.abs(b.position.z)).toBeLessThanOrEqual(12);
      const speed=Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z);
      expect(speed).toBeGreaterThanOrEqual(8-1e-10);
      expect(speed).toBeLessThanOrEqual(18+1e-10);
    }
  }
});
test('snapshots are detached and zero time does not advance',()=>{
  const flock=new StarlingSimulation({count:1});
  const before=flock.snapshot(); flock.step(0);
  expect(flock.snapshot()).toEqual(before);
  before[0]!.position.x=999;
  expect(flock.snapshot()[0]!.position.x).not.toBe(999);
});
test('handles empty flocks and validates inputs',()=>{
  const empty=new StarlingSimulation({count:0}); empty.step(1); expect(empty.snapshot()).toEqual([]);
  for(const count of [-1,1.5,NaN]) expect(()=>new StarlingSimulation({count})).toThrow();
  expect(()=>new StarlingSimulation({maxSpeed:1})).toThrow();
  expect(()=>new StarlingSimulation({bounds:{x:0,y:10,z:10}})).toThrow();
  const flock=new StarlingSimulation();
  for(const dt of [-1,2,NaN,Infinity]) expect(()=>flock.step(dt)).toThrow();
});

test('preserves the trajectory recorded before the object-oriented refactor', async () => {
  const expected = (await import('./fixtures/trajectory.json')).default;
  const flock = new StarlingSimulation({ count: 12, seed: 42, bounds: { x: 12, y: 10, z: 12 } });
  const actual = [flock.snapshot()];
  for (const dt of [1 / 60, 0.2, 1, 0, 0.03]) {
    flock.step(dt);
    actual.push(flock.snapshot());
  }
  expect(actual).toEqual(expected);
});
