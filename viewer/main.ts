import { Murmuration } from "../src/murmuration.ts";
import type { Parameters } from "../src/murmuration.ts";
import { RenderCadence } from "./render-cadence.ts";
import { SkyRenderer } from "./sky-renderer.ts";

const element = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
};
const canvas = element<HTMLCanvasElement>("sky");
const renderer = new SkyRenderer(canvas);
const viewport = renderer.resize();
const scene = new Murmuration(viewport.width, viewport.height);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cadence = new RenderCadence(120);
const state = {
  paused: reducedMotion,
  trails: !reducedMotion,
  hawk: false,
  mode: "scare",
};
const status = element("status");
const count = element("t-count"),
  speed = element("t-speed"),
  fps = element("t-fps");
let last = 0,
  accumulator = 0,
  frames = 0,
  statsTime = 0,
  meanSpeed = 0;

const parameters: Record<string, keyof Parameters> = {
  sep: "sep",
  ali: "ali",
  coh: "coh",
  spd: "spd",
  wind: "wind",
};
for (const [id, key] of Object.entries(parameters)) {
  const input = element<HTMLInputElement>(id),
    output = element<HTMLOutputElement>(`${id}-o`);
  const update = () => {
    const value = Number(input.value);
    scene.configure({ [key]: value });
    output.value =
      key === "wind"
        ? `${value > 0 ? "→ " : value < 0 ? "← " : ""}${Math.abs(value).toFixed(2)}`
        : value.toFixed(key === "spd" ? 1 : 2);
  };
  input.addEventListener("input", update);
  update();
}
for (let species = 0; species < 3; species++) {
  const input = element<HTMLInputElement>(`n${species}`),
    output = element<HTMLOutputElement>(`n${species}-o`);
  const update = () => {
    const value = Number(input.value);
    scene.setCount(species, value);
    output.value = String(value);
    count.textContent = String(scene.view().birds.length);
    renderer.invalidate();
  };
  input.addEventListener("input", update);
  update();
}

function updateButtons() {
  for (const key of ["hawk", "trails", "pause"] as const) {
    const button = element<HTMLButtonElement>(key);
    const pressed = key === "pause" ? state.paused : state[key];
    button.setAttribute("aria-pressed", String(pressed));
  }
  element("pause").textContent = state.paused ? "Seguir" : "Pausa";
}
element("pause").addEventListener("click", () => {
  state.paused = !state.paused;
  renderer.invalidate();
  cadence.reset();
  last = 0;
  accumulator = 0;
  updateButtons();
  status.textContent = state.paused
    ? "Simulación pausada"
    : "Simulación en marcha";
});
element("hawk").addEventListener("click", () => {
  state.hawk = !state.hawk;
  scene.setHawk(state.hawk);
  renderer.invalidate();
  updateButtons();
  status.textContent = state.hawk ? "Halcón activado" : "Halcón retirado";
});
element("trails").addEventListener("click", () => {
  state.trails = !state.trails;
  renderer.invalidate();
  updateButtons();
});
element("scatter").addEventListener("click", () => {
  scene.scatter();
  renderer.invalidate();
  status.textContent = "Bandadas dispersadas";
});
element("clear").addEventListener("click", () => {
  scene.clearObstacles();
  renderer.invalidate();
  status.textContent = "Obstáculos retirados";
});

function setMode(mode: string) {
  state.mode = mode;
  element("m-scare").setAttribute("aria-pressed", String(mode === "scare"));
  element("m-obst").setAttribute("aria-pressed", String(mode === "obst"));
  element("hint").textContent =
    mode === "obst"
      ? "Tocá el cielo para poner un obstáculo. Tocá uno existente para quitarlo. Las aves intentan rodearlo."
      : "Tocá el cielo para espantar a las aves. Cada especie se agrupa con sus vecinas y se aparta de las demás.";
}
element("m-scare").addEventListener("click", () => setMode("scare"));
element("m-obst").addEventListener("click", () => setMode("obst"));
const panelBody = element("body"),
  collapse = element<HTMLButtonElement>("collapse");
collapse.addEventListener("click", () => {
  panelBody.hidden = !panelBody.hidden;
  collapse.setAttribute("aria-expanded", String(!panelBody.hidden));
  collapse.textContent = panelBody.hidden ? "Mostrar" : "Ocultar";
});
canvas.addEventListener("pointerdown", (event) => {
  const p = renderer.world(event.clientX, event.clientY);
  if (state.mode === "obst") scene.toggleObstacle(p.x, p.y);
  else scene.scareAt(p.x, p.y);
  renderer.invalidate();
});
document.addEventListener("visibilitychange", () => {
  cadence.reset();
  last = 0;
  accumulator = 0;
  statsTime = 0;
  frames = 0;
});
new ResizeObserver(() => {
  const size = renderer.resize();
  scene.resize(size.width, size.height);
}).observe(canvas);

function frame(now: number) {
  if (!cadence.shouldRender(now)) {
    requestAnimationFrame(frame);
    return;
  }
  const realElapsed = last ? (now - last) / 1000 : 0;
  const elapsed = Math.min(realElapsed, 0.1);
  last = now;
  if (!document.hidden) {
    if (!state.paused) {
      accumulator += elapsed;
      while (accumulator >= 1 / 120) {
        meanSpeed = scene.step(0.5);
        accumulator -= 1 / 120;
      }
    }
    renderer.draw(scene, state.trails, state.paused, elapsed);
    frames++;
    statsTime += realElapsed;
    if (statsTime >= 0.5) {
      speed.textContent = meanSpeed.toFixed(1);
      speed.setAttribute(
        "aria-label",
        `${meanSpeed.toFixed(1)} píxeles por paso`,
      );
      fps.textContent = String(Math.round(frames / statsTime));
      statsTime = 0;
      frames = 0;
    }
  }
  requestAnimationFrame(frame);
}
updateButtons();
setMode("scare");
requestAnimationFrame(frame);
