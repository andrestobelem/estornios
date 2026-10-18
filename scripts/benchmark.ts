import { Murmuration } from "../src/murmuration.ts";
import { SeededRandom } from "../src/random.ts";

for (const counts of [
  [450, 90, 40],
  [1200, 400, 200],
]) {
  const random = new SeededRandom(42);
  const scene = new Murmuration(1280, 720, counts, () => random.next());
  for (let i = 0; i < 60; i++) scene.step();
  const start = performance.now();
  for (let i = 0; i < 300; i++) scene.step();
  const ms = performance.now() - start;
  console.log(
    `${counts.reduce((a, b) => a + b, 0)} aves · 300 pasos · ${ms.toFixed(1)} ms · ${(ms / 300).toFixed(2)} ms/paso`,
  );
}
