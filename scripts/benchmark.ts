import { Murmuration } from "../src/murmuration.ts";
import { SeededRandom } from "../src/random.ts";

// Same initial states and integration rate as the viewer; report the median to limit warmup noise.
for (const counts of [
  [450, 0, 0],
  [450, 90, 40],
  [1200, 400, 200],
]) {
  const samples: number[] = [];
  for (let trial = 0; trial < 5; trial++) {
    const random = new SeededRandom(42);
    const scene = new Murmuration(1280, 720, counts, () => random.next());
    for (let i = 0; i < 120; i++) scene.step(0.5);
    const start = performance.now();
    for (let i = 0; i < 600; i++) scene.step(0.5);
    samples.push(performance.now() - start);
  }
  const ms = samples.sort((a, b) => a - b)[2]!;
  console.log(
    `${counts.reduce((a, b) => a + b, 0)} aves · 600 medios pasos · mediana ${ms.toFixed(1)} ms · ${(ms / 600).toFixed(3)} ms/paso`,
  );
}
