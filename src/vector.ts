import type { Vector3 } from './types.ts';

export const axes = ['x', 'y', 'z'] as const;
export const zero = (): Vector3 => ({ x: 0, y: 0, z: 0 });
export const add = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x+b.x, y:a.y+b.y, z:a.z+b.z });
export const mul = (v: Vector3, n: number): Vector3 => ({ x:v.x*n, y:v.y*n, z:v.z*n });
export const sub = (a: Vector3, b: Vector3) => add(a, mul(b,-1));
export const norm = (v: Vector3) => Math.hypot(v.x,v.y,v.z);
export const unit = (v: Vector3) => norm(v)>1e-10 ? mul(v,1/norm(v)) : {x:1,y:0,z:0};
export const limit = (v: Vector3, max: number) => norm(v)>max ? mul(unit(v),max) : v;

