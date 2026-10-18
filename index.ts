export { Murmuration, SPECIES } from "./src/murmuration.ts";
export type {
  Parameters,
  Species,
  Obstacle,
  Alarm,
  Hawk,
} from "./src/murmuration.ts";
export { Starling } from "./src/starling.ts";
export type { BirdState } from "./src/starling.ts";

import { Murmuration } from "./src/murmuration.ts";
import { SeededRandom } from "./src/random.ts";
if (import.meta.main) {
  const rng = new SeededRandom(42);
  const scene = new Murmuration(1280, 720, [300, 0, 0], () => rng.next());
  let meanSpeed = 0;
  for (let frame = 0; frame < 600; frame++) meanSpeed = scene.step();
  console.log(
    JSON.stringify(
      {
        seconds: 10,
        birds: scene.view().birds.length,
        meanSpeed,
        sample: scene.snapshot().birds.slice(0, 3),
      },
      null,
      2,
    ),
  );
}
