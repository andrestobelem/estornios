import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { Murmuration } from "../src/murmuration.ts";
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
      if (frame===40) obstacles.push({x:400,y:200,r:26+Math.random()*22});
      const speed=step();
      if ([0, 20, 60, 119].includes(frame)) frames.push(JSON.parse(JSON.stringify({birds,obstacles,scare,hawk:state.hawk?hawk:null,speed})));
    }
    return frames;
  })()`,
    { Math: math },
  );
}

test("matches original trajectories exactly in sparse and dense flocks", () => {
  for (const [counts, width, height] of [
    [[8, 3, 1], 1280, 720],
    [[60, 15, 5], 640, 480],
  ] as const) {
    const expected = originalTrajectory([...counts], width, height);
    const scene = create([...counts], width, height);
    const actual = [];
    for (let frame = 0; frame < 120; frame++) {
      if (frame === 10) scene.configure({ wind: 0.5, coh: 1.2 });
      if (frame === 20) scene.scareAt(width * 0.4, height * 0.35);
      if (frame === 30) scene.setHawk(true);
      if (frame === 40) scene.toggleObstacle(400, 200);
      const speed = scene.step();
      if ([0, 20, 60, 119].includes(frame))
        actual.push({ ...scene.snapshot(), speed });
    }
    expect(actual).toEqual(expected);
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

test("obstacles, empty flocks, resize and scatter remain functional", () => {
  const scene = create([0, 0, 0]);
  scene.clearObstacles();
  scene.toggleObstacle(300, 200);
  expect(scene.view().obstacles.length).toBe(1);
  scene.toggleObstacle(300, 200);
  expect(scene.view().obstacles.length).toBe(0);
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
  expect(() => scene.toggleObstacle(0, NaN)).toThrow();
});

test("defaults to 300 starlings and no obstacles", () => {
  const scene = new Murmuration();
  expect(scene.view().birds.length).toBe(300);
  expect(scene.view().birds.every((b) => b.sp === 0)).toBe(true);
  expect(scene.view().obstacles).toEqual([]);
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
