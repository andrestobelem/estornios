import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { Murmuration, SPECIES } from "../src/murmuration.ts";
import { SeededRandom } from "../src/random.ts";

const create = (counts = [8, 3, 1], width = 1280, height = 720) => {
  const random = new SeededRandom(42);
  return new Murmuration(width, height, counts, () => random.next());
};

// Execute the supplied reference arithmetic with the same random stream.
// The HTML is used strictly as a test fixture, never loaded into the viewer.
function originalTrajectory(counts = [8, 3, 1], width = 1280, height = 720) {
  const html = readFileSync(
    new URL("./fixtures/original.html", import.meta.url),
    "utf8",
  );
  const original = html
    .slice(html.indexOf("  const P ="), html.indexOf("  function drawBirds"))
    .replace(
      "const counts = [450, 90, 40]",
      `const counts = ${JSON.stringify(counts)}`,
    );
  const random = new SeededRandom(42);
  const math = Object.create(Math);
  math.random = () => random.next();
  return runInNewContext(
    `(() => {
    let W = ${width}, H = ${height};
    ${original}
    syncCounts();
    obstacles = [];
    const frames = [];
    for (let frame=0;frame<120;frame++) {
      if (frame===10) { P.wind=.5; P.coh=1.2; }
      if (frame===20) scare={x:W*.4,y:H*.35,k:1};
      if (frame===30) { state.hawk=true; hawk.x=Math.random()<.5?-10:W+10; hawk.y=H*.2; hawk.vx=0; hawk.vy=0; }
      const speed=step();
      frames.push(JSON.parse(JSON.stringify({birds,scare,hawk:state.hawk?hawk:null,speed})));
    }
    return frames;
  })()`,
    { Math: math },
  );
}

test("preserves original forces until a canvas boundary is reached", () => {
  for (const [counts, width, height] of [
    [[8, 3, 1], 1280, 720],
    [[60, 15, 5], 640, 480],
  ] as const) {
    const expected = originalTrajectory([...counts], width, height);
    const scene = create([...counts], width, height);
    let checked = 0;
    for (let frame = 0; frame < 120; frame++) {
      if (frame === 10) scene.configure({ wind: 0.5, coh: 1.2 });
      if (frame === 20) scene.scareAt(width * 0.4, height * 0.35);
      if (frame === 30) scene.setHawk(true);
      const speed = scene.step();
      const reference = expected[frame];
      const reachesBoundary = reference.birds.some(
        (b: { sp: number; x: number; y: number }) => {
          const profile = SPECIES[b.sp]!;
          const radius = Math.hypot(
            profile.size,
            profile.size * 0.38 * (profile.shape === "fork" ? 1.6 : 1),
          );
          return (
            b.x < radius ||
            b.x > width - radius ||
            b.y < radius ||
            b.y > height - radius
          );
        },
      );
      if (reachesBoundary) break;
      expect({ ...scene.snapshot(), speed }).toEqual(reference);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  }
});

test("count changes retain existing birds and snapshots are detached", () => {
  const scene = create();
  const first = scene.view().birds[0];
  scene.setCount(0, 10);
  expect(scene.view().birds[0]).toBe(first);
  expect(scene.view().birds.length).toBe(14);
  const copy = scene.snapshot();
  copy.birds[0]!.x = 999;
  expect(scene.view().birds[0]!.x).not.toBe(999);
  scene.setCount(1, 0);
  expect(scene.view().birds.filter((b) => b.sp === 1)).toEqual([]);
});

test("empty flocks, resize and scatter remain functional", () => {
  const scene = create([0, 0, 0]);
  scene.setHawk(true);
  expect(scene.step()).toBe(0);
  scene.setHawk(false);
  expect(scene.view().hawk).toBeNull();
  scene.resize(800, 600);
  scene.setCount(0, 1);
  const before = scene.snapshot().birds[0]!;
  scene.scatter();
  expect(scene.view().birds[0]!.vx).not.toBe(before.vx);
});

test("rejects invalid public input", () => {
  const scene = create();
  expect(() => scene.configure({ spd: 0 })).toThrow();
  expect(() => scene.configure({ wind: NaN })).toThrow();
  expect(() => scene.setCount(0, 1201)).toThrow();
  expect(() => scene.setCount(3, 1)).toThrow();
  expect(() => scene.resize(0, 720)).toThrow();
  expect(() => scene.scareAt(Infinity, 0)).toThrow();
});

test("defaults to 450 starlings", () => {
  const scene = new Murmuration();
  expect(scene.view().birds.length).toBe(450);
  expect(scene.view().birds.every((b) => b.sp === 0)).toBe(true);
});

test("120 half steps preserve flight speed relative to 60 original steps", () => {
  const full = new Murmuration(10000, 10000, [1, 0, 0], () => 0.5);
  const half = new Murmuration(10000, 10000, [1, 0, 0], () => 0.5);
  for (let i = 0; i < 60; i++) full.step();
  for (let i = 0; i < 120; i++) half.step(0.5);
  expect(half.view().birds[0]!.x).toBeCloseTo(full.view().birds[0]!.x, 8);
  expect(half.view().birds[0]!.y).toBeCloseTo(full.view().birds[0]!.y, 8);
  expect(half.view().birds[0]!.vx).toBe(full.view().birds[0]!.vx);
  for (const fraction of [0, -1, 2, NaN])
    expect(() => half.step(fraction)).toThrow();
});

test("all species stay inside the canvas through wind, scatter, alarm and resize", () => {
  const scene = create([30, 10, 5], 320, 240);
  scene.configure({ wind: 1, spd: 7 });
  scene.setHawk(true);
  scene.scatter();
  let width = 320,
    height = 240;
  const check = () => {
    for (const b of scene.view().birds) {
      const profile = SPECIES[b.sp]!;
      const radius = Math.hypot(
        profile.size,
        profile.size * 0.38 * (profile.shape === "fork" ? 1.6 : 1),
      );
      expect(b.x).toBeGreaterThanOrEqual(Math.min(radius, width / 2));
      expect(b.x).toBeLessThanOrEqual(width - Math.min(radius, width / 2));
      expect(b.y).toBeGreaterThanOrEqual(Math.min(radius, height / 2));
      expect(b.y).toBeLessThanOrEqual(height - Math.min(radius, height / 2));
    }
  };
  for (let frame = 0; frame < 600; frame++) {
    if (frame % 100 === 0) scene.scareAt(width / 2, height / 2);
    if (frame === 200) {
      width = 160;
      height = 120;
      scene.resize(width, height);
      check();
    }
    scene.step(0.5);
    check();
  }
  width = 1;
  height = 1;
  scene.resize(width, height);
  check();
  scene.setCount(0, 35);
  check();
  scene.step(0.5);
  check();
});
