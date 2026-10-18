import { StarlingSimulation } from '../src/simulation.ts';
import type { Vector3 } from '../src/types.ts';
import { FlightCamera } from './projection.ts';

interface ViewState { count: number; paused: boolean; camera: string }
interface WidgetHost {
  widgetState?: { modelContent?: Partial<ViewState> };
  setWidgetState?(state: { modelContent: ViewState }): Promise<unknown>;
}
const host = (window as Window & { openai?: WidgetHost }).openai;
const root = document.getElementById('starling-view')!;
const canvas = root.querySelector('canvas')!;
const context = canvas.getContext('2d');
if (!context) throw new Error('El navegador no admite Canvas 2D');
const ctx = context;
const pause = root.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
const restart = root.querySelector<HTMLButtonElement>('[data-action="restart"]')!;
const countInput = root.querySelector<HTMLSelectElement>('[data-control="count"]')!;
const cameraInput = root.querySelector<HTMLSelectElement>('[data-control="camera"]')!;
const status = root.querySelector<HTMLElement>('[data-status]')!;
const clock = root.querySelector<HTMLElement>('[data-stat="time"]')!;
const countLabel = root.querySelector<HTMLElement>('[data-stat="count"]')!;
const camera = new FlightCamera();
let state: ViewState = { count: 300, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, camera: 'oblique' };
let simulation = new StarlingSimulation({ count: state.count, seed: 42 });
let seconds = 0, accumulator = 0, last = 0;
let width = 0, height = 0;

function syncControls() {
  countInput.value = String(state.count);
  cameraInput.value = state.camera;
  pause.textContent = state.paused ? 'Continuar' : 'Pausar';
  countLabel.textContent = `${state.count} aves`;
  camera.yaw = state.camera === 'side' ? 0 : state.camera === 'top' ? 0 : -0.6;
  camera.pitch = state.camera === 'top' ? Math.PI / 2 : state.camera === 'side' ? 0 : 0.3;
}
function reset() {
  simulation = new StarlingSimulation({ count: state.count, seed: 42 });
  seconds = 0; accumulator = 0; last = 0;
  syncControls();
  draw();
}
function save() { host?.setWidgetState?.({ modelContent: { ...state } }).catch(() => {}); }
function applySaved(saved?: Partial<ViewState>) {
  if (!saved) return;
  const count = [100, 300, 600].includes(saved.count ?? 0) ? saved.count! : state.count;
  state = {
    count,
    paused: typeof saved.paused === 'boolean' ? saved.paused : state.paused,
    camera: ['oblique', 'top', 'side'].includes(saved.camera ?? '') ? saved.camera! : state.camera,
  };
  reset();
}
function draw() {
  if (!width || !height) return;
  const birdColor = getComputedStyle(root.querySelector('[data-color="bird"]')!).color;
  const borderColor = getComputedStyle(root.querySelector('[data-color="border"]')!).color;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  // Draw the flight volume behind the flock.
  for (const x of [-100, 100]) for (const y of [-60, 60]) for (const z of [-100, 100]) {
    const a: Vector3 = { x, y, z };
    for (const axis of ['x', 'y', 'z'] as const) {
      if (a[axis] > 0) continue;
      const b = { ...a, [axis]: -a[axis] };
      const from = camera.project(a, width, height), to = camera.project(b, width, height);
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
  }
  ctx.fillStyle = birdColor;
  const birds = simulation.snapshot().map(bird => ({
    bird, projected: camera.project(bird.position, width, height),
  })).sort((a, b) => a.projected.depth - b.projected.depth);
  for (const { bird, projected: p } of birds) {
    const heading = camera.project({
      x: bird.position.x + bird.velocity.x,
      y: bird.position.y + bird.velocity.y,
      z: bird.position.z + bird.velocity.z,
    }, width, height);
    const angle = Math.atan2(heading.y - p.y, heading.x - p.x);
    const size = 3.5 + (p.depth + 160) / 320;
    ctx.globalAlpha = Math.max(0.4, Math.min(1, 0.7 + p.depth / 450));
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size, size * 0.55);
    ctx.lineTo(-size * 0.4, 0); ctx.lineTo(-size, -size * 0.55);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  clock.textContent = `${seconds.toFixed(1)} s`;
}
function frame(now: number) {
  const elapsed = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;
  if (!state.paused && !document.hidden) {
    accumulator += elapsed;
    while (accumulator >= 1 / 60) {
      simulation.step(1 / 60);
      seconds += 1 / 60;
      accumulator -= 1 / 60;
    }
  }
  draw();
  requestAnimationFrame(frame);
}
pause.addEventListener('click', () => {
  state.paused = !state.paused;
  accumulator = 0; last = 0;
  syncControls(); save();
  status.textContent = state.paused ? 'Simulación pausada' : 'Simulación en marcha';
});
restart.addEventListener('click', () => { reset(); save(); status.textContent = 'Bandada reiniciada con semilla 42'; });
countInput.addEventListener('change', () => {
  state.count = Number(countInput.value); reset(); save();
  status.textContent = `Nueva bandada de ${state.count} aves`;
});
cameraInput.addEventListener('change', () => { state.camera = cameraInput.value; syncControls(); draw(); save(); });
document.addEventListener('visibilitychange', () => { last = 0; accumulator = 0; });
window.addEventListener('openai:set_globals', event => {
  const globals = (event as CustomEvent<{ globals?: { widgetState?: WidgetHost['widgetState'] } }>).detail?.globals;
  applySaved(globals?.widgetState?.modelContent);
});
new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}).observe(canvas);
applySaved(host?.widgetState?.modelContent);
syncControls();
requestAnimationFrame(frame);
