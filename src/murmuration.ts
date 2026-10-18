import { Starling } from "./starling.ts";
import type { BirdState } from "./starling.ts";

export interface Parameters {
  sep: number;
  ali: number;
  coh: number;
  spd: number;
  wind: number;
}
export interface Species {
  name: string;
  color: string;
  size: number;
  speed: number;
  sep: number;
  ali: number;
  coh: number;
  shape: string;
}
export interface Alarm {
  x: number;
  y: number;
  k: number;
}
export interface Hawk {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export const SPECIES: Species[] = [
  {
    name: "Estornino",
    color: "rgba(18,14,22,0.92)",
    size: 4.2,
    speed: 1.0,
    sep: 1.0,
    ali: 1.0,
    coh: 1.0,
    shape: "tri",
  },
  {
    name: "Golondrina",
    color: "rgba(34,48,94,0.95)",
    size: 4.6,
    speed: 1.4,
    sep: 0.8,
    ali: 0.55,
    coh: 0.45,
    shape: "fork",
  },
  {
    name: "Paloma",
    color: "rgba(232,221,210,0.95)",
    size: 5.8,
    speed: 0.72,
    sep: 1.6,
    ali: 1.2,
    coh: 1.5,
    shape: "tri",
  },
];

/** The original 2D model, in screen pixels, with reusable neighbor buffers and simultaneous integration. */
export class Murmuration {
  readonly step: (fraction?: number) => number;
  readonly resize: (width: number, height: number) => void;
  readonly configure: (patch: Partial<Parameters>) => void;
  readonly setCount: (species: number, count: number) => void;
  readonly setHawk: (enabled: boolean) => void;
  readonly scatter: () => void;
  readonly scareAt: (x: number, y: number) => void;
  readonly view: () => {
    birds: readonly Readonly<BirdState>[];
    scare: Readonly<Alarm> | null;
    hawk: Readonly<Hawk> | null;
  };

  constructor(
    width = 1280,
    height = 720,
    initialCounts: readonly number[] = [300, 0, 0],
    random: () => number = Math.random,
  ) {
    if (![width, height].every((n) => Number.isFinite(n) && n > 0))
      throw new RangeError("Invalid viewport");
    if (
      initialCounts.length !== 3 ||
      [0, 1, 2].some(
        (i) =>
          !Number.isInteger(initialCounts[i]) ||
          initialCounts[i]! < 0 ||
          initialCounts[i]! > [1200, 400, 200][i]!,
      )
    )
      throw new RangeError("Invalid species counts");
    let W = width,
      H = height;
    const P = { sep: 1.6, ali: 1.0, coh: 0.9, spd: 3.4, wind: 0 };
    const counts = [...initialCounts];
    const state = { hawk: false };
    const NEIGH = 7,
      VIEW = 60,
      SEP_R = 16;

    let birds: Starling[] = [];
    let scare: Alarm | null = null;
    const hawk = { x: 0, y: 0, vx: 2, vy: 0 };

    function makeBird(sp: number) {
      const a = random() * Math.PI * 2,
        s = P.spd * SPECIES[sp]!.speed;
      const cx = W * (0.3 + sp * 0.2),
        cy = H * (0.3 + sp * 0.08);
      return new Starling({
        sp,
        x: cx + (random() - 0.5) * W * 0.35,
        y: cy + (random() - 0.5) * H * 0.25,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        ax: 0,
        ay: 0,
      });
    }
    function syncCounts() {
      const bySp: Starling[][] = [[], [], []];
      for (const b of birds) bySp[b.sp]!.push(b);
      for (let s = 0; s < 3; s++) {
        while (bySp[s]!.length < counts[s]!) bySp[s]!.push(makeBird(s));
        bySp[s]!.length = counts[s]!;
      }
      birds = bySp[0]!.concat(bySp[1]!, bySp[2]!);
    }

    const CELL = VIEW;
    const grid = new Map<number, number[]>();
    const bucketPool: number[][] = [];
    const neighborhoods = new Map<number, number[]>();
    const neighborhoodPool: number[][] = [];
    let usedNeighborhoods = 0;
    function buildGrid() {
      grid.clear();
      neighborhoods.clear();
      usedNeighborhoods = 0;
      let used = 0;
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i]!;
        const k = ((b.x / CELL) | 0) * 7919 + ((b.y / CELL) | 0);
        let c = grid.get(k);
        if (!c) {
          c = bucketPool[used] ?? (bucketPool[used] = []);
          used++;
          c.length = 0;
          grid.set(k, c);
        }
        c.push(i);
      }
    }

    function candidatesAt(gx: number, gy: number): number[] {
      const key = gx * 7919 + gy;
      let candidates = neighborhoods.get(key);
      if (candidates) return candidates;
      candidates =
        neighborhoodPool[usedNeighborhoods] ??
        (neighborhoodPool[usedNeighborhoods] = []);
      usedNeighborhoods++;
      candidates.length = 0;
      // Preserve the original cell traversal and bird order, including tie resolution.
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const bucket = grid.get((gx + dx) * 7919 + gy + dy);
          if (bucket) for (const index of bucket) candidates.push(index);
        }
      neighborhoods.set(key, candidates);
      return candidates;
    }

    const nIdx = new Int32Array(NEIGH),
      nD = new Float32Array(NEIGH);
    function step(fraction = 1) {
      if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1)
        throw new RangeError("fraction must be in (0, 1]");
      buildGrid();
      const margin = 80;
      const alarmed = !!scare || state.hawk;
      let sumS = 0;
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i]!,
          S = SPECIES[b.sp]!;
        const maxF = 0.08 * (P.spd / 3.4) * S.speed;
        let n = 0,
          sx = 0,
          sy = 0;
        const gx = (b.x / CELL) | 0,
          gy = (b.y / CELL) | 0;
        for (const j of candidatesAt(gx, gy)) {
          if (j === i) continue;
          const o = birds[j]!,
            ddx = o.x - b.x,
            ddy = o.y - b.y,
            d = ddx * ddx + ddy * ddy;
          if (d > VIEW * VIEW) continue;
          if (o.sp !== b.sp) {
            // other species: only keep distance
            const r = SEP_R * 1.4;
            if (d < r * r && d > 0) {
              const dd = Math.sqrt(d);
              sx -= (ddx / dd / dd) * 1.5;
              sy -= (ddy / dd / dd) * 1.5;
            }
            continue;
          }
          if (n < NEIGH) {
            nIdx[n] = j;
            nD[n] = d;
            n++;
          } else {
            let w = 0;
            for (let k = 1; k < NEIGH; k++) if (nD[k]! > nD[w]!) w = k;
            if (d < nD[w]!) {
              nIdx[w] = j;
              nD[w] = d;
            }
          }
        }
        let axv = 0,
          ayv = 0,
          cx = 0,
          cy = 0;
        const sepR = SEP_R * (S.size / 4.2);
        for (let k = 0; k < n; k++) {
          const o = birds[nIdx[k]!]!;
          axv += o.vx;
          ayv += o.vy;
          cx += o.x;
          cy += o.y;
          const d = Math.sqrt(nD[k]!);
          if (d < sepR && d > 0) {
            sx += (b.x - o.x) / d / d;
            sy += (b.y - o.y) / d / d;
          }
        }
        let fx = sx * 1.4 * P.sep * S.sep,
          fy = sy * 1.4 * P.sep * S.sep;
        if (n) {
          fx += (axv / n - b.vx) * 0.05 * P.ali * S.ali;
          fy += (ayv / n - b.vy) * 0.05 * P.ali * S.ali;
          fx += (cx / n - b.x) * 0.002 * P.coh * S.coh;
          fy += (cy / n - b.y) * 0.002 * P.coh * S.coh;
        }
        if (b.x < margin) fx += (margin - b.x) * 0.004;
        if (b.x > W - margin) fx -= (b.x - W + margin) * 0.004;
        if (b.y < margin) fy += (margin - b.y) * 0.004;
        if (b.y > H - margin * 1.6) fy -= (b.y - H + margin * 1.6) * 0.005;
        fx += P.wind * 0.03;

        if (scare) {
          const dx = b.x - scare.x,
            dy = b.y - scare.y,
            d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const d = Math.sqrt(d2) + 1;
            fx += (dx / d) * 0.6 * scare.k;
            fy += (dy / d) * 0.6 * scare.k;
          }
        }
        if (state.hawk) {
          const dx = b.x - hawk.x,
            dy = b.y - hawk.y,
            d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            const d = Math.sqrt(d2) + 1;
            fx += (dx / d) * 0.5;
            fy += (dy / d) * 0.5;
          }
        }
        const fm = Math.hypot(fx, fy);
        const lim = alarmed ? maxF * 4 : maxF;
        if (fm > lim) {
          fx = (fx / fm) * lim;
          fy = (fy / fm) * lim;
        }
        b.ax = fx;
        b.ay = fy;
      }
      for (const b of birds) {
        const S = SPECIES[b.sp]!,
          base = P.spd * S.speed;
        b.vx += b.ax * fraction;
        b.vy += b.ay * fraction;
        let s = Math.hypot(b.vx, b.vy);
        const cap = base * (alarmed ? 1.5 : 1),
          minS = base * 0.55;
        if (s > cap) {
          b.vx *= cap / s;
          b.vy *= cap / s;
          s = cap;
        }
        if (s < minS) {
          b.vx *= minS / (s || 1);
          b.vy *= minS / (s || 1);
          s = minS;
        }
        b.x += b.vx * fraction;
        b.y += b.vy * fraction;
        if (b.x < -20) b.x = W + 20;
        else if (b.x > W + 20) b.x = -20;
        if (b.y < -20) b.y = -19;
        else if (b.y > H + 20) b.y = H + 19;
        sumS += s;
      }
      if (scare) {
        scare.k *= Math.pow(0.94, fraction);
        if (scare.k < 0.05) scare = null;
      }
      if (state.hawk) stepHawk(fraction);
      return sumS / (birds.length || 1);
    }

    function stepHawk(fraction: number) {
      let best = null,
        bd = Infinity;
      for (let i = 0; i < birds.length; i += 4) {
        const b = birds[i]!,
          d = (b.x - hawk.x) ** 2 + (b.y - hawk.y) ** 2;
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best) {
        const dx = best.x - hawk.x,
          dy = best.y - hawk.y,
          d = Math.hypot(dx, dy) || 1;
        hawk.vx += (dx / d) * 0.18 * fraction;
        hawk.vy += (dy / d) * 0.18 * fraction;
      }
      const s = Math.hypot(hawk.vx, hawk.vy),
        cap = P.spd * 1.25;
      if (s > cap) {
        hawk.vx *= cap / s;
        hawk.vy *= cap / s;
      }
      hawk.x += hawk.vx * fraction;
      hawk.y += hawk.vy * fraction;
    }

    this.step = step;
    this.view = () => ({
      birds,
      scare,
      hawk: state.hawk ? hawk : null,
    });
    this.resize = (width, height) => {
      if (![width, height].every((n) => Number.isFinite(n) && n > 0))
        throw new RangeError("Invalid viewport");
      W = width;
      H = height;
    };
    this.configure = (patch) => {
      const next = { ...P, ...patch };
      if (
        !Object.values(next).every(Number.isFinite) ||
        [next.sep, next.ali, next.coh].some((n) => n < 0 || n > 3) ||
        next.spd < 1 ||
        next.spd > 7 ||
        Math.abs(next.wind) > 1
      )
        throw new RangeError("Invalid parameters");
      Object.assign(P, next);
    };
    this.setCount = (species, count) => {
      if (
        !Number.isInteger(species) ||
        species < 0 ||
        species > 2 ||
        !Number.isInteger(count) ||
        count < 0 ||
        count > [1200, 400, 200][species]!
      )
        throw new RangeError("Invalid count");
      counts[species] = count;
      syncCounts();
    };
    this.setHawk = (enabled) => {
      state.hawk = enabled;
      if (enabled) {
        hawk.x = random() < 0.5 ? -10 : W + 10;
        hawk.y = H * 0.2;
        hawk.vx = 0;
        hawk.vy = 0;
      }
    };
    this.scatter = () => {
      for (const b of birds) {
        const angle = random() * Math.PI * 2,
          speed = P.spd * SPECIES[b.sp]!.speed * 1.4;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    };
    const validatePoint = (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new RangeError("Invalid coordinates");
    };
    this.scareAt = (x, y) => {
      validatePoint(x, y);
      scare = { x, y, k: 1 };
    };
    syncCounts();
  }

  /** Detached data for callers that need to retain or modify a snapshot. */
  snapshot() {
    const view = this.view();
    return {
      birds: view.birds.map((b) => ({ ...b })),
      scare: view.scare ? { ...view.scare } : null,
      hawk: view.hawk ? { ...view.hawk } : null,
    };
  }
}
