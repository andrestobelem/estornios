import type { Bird, Vector3 } from './types.ts';
import { axes, norm, sub } from './vector.ts';

export interface Neighbor { bird: Bird; distance: number }

/** Read-only neighbor index for a single frame. */
export class SpatialGrid {
  private readonly cells = new Map<string, Bird[]>();
  constructor(birds: readonly Bird[], private readonly radius: number) {
    const cells = this.cells;
    for (const bird of birds) {
      const key = this.cell(bird.position).join(',');
      const bucket = cells.get(key) ?? [];
      bucket.push(bird); cells.set(key,bucket);
    }
  }
  private cell(p: Vector3): [number, number, number] {
    return axes.map(a=>Math.floor(p[a]/this.radius)) as [number,number,number];
  }
  neighborsOf(bird: Bird): Neighbor[] {
      const [cx,cy,cz] = this.cell(bird.position);
      const nearby: Neighbor[] = [];
      for (let x=-1;x<=1;x++) for (let y=-1;y<=1;y++) for (let z=-1;z<=1;z++) {
        for (const other of this.cells.get(`${cx+x},${cy+y},${cz+z}`) ?? []) {
          if (other.id===bird.id) continue;
          const distance = norm(sub(bird.position,other.position));
          if (distance<=this.radius) nearby.push({bird:other,distance});
        }
      }
      nearby.sort((a,b)=>a.distance-b.distance || a.bird.id-b.bird.id);
    return nearby;
  }
}
