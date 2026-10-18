import { FIELD_BOUNDS } from '../src/murmuration.ts';
import type { Bird } from '../src/types.ts';
import type { Murmuration } from '../src/murmuration.ts';
import { SkyCamera } from './projection.ts';

const COLORS = ['rgba(18,14,22,.94)', 'rgba(34,48,94,.96)', 'rgba(232,221,210,.96)'];

/** Rendering and screen/world coordinates; independent of the simulation timestep. */
export class SkyRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private gradient: CanvasGradient | null = null;
  private fresh = true;
  private camera = new SkyCamera(1, 1);
  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no está disponible');
    this.ctx = ctx;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    this.camera = new SkyCamera(this.width, this.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.gradient = null;
    this.invalidate();
  }

  invalidate(): void { this.fresh = true; }

  world(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return this.camera.unproject(clientX - rect.left, clientY - rect.top);
  }

  private screen(x: number, y: number) { return this.camera.project(x, y); }

  draw(scene: Murmuration, trails: boolean, paused: boolean, elapsed: number): number {
    const ctx = this.ctx;
    if (!this.gradient) {
      this.gradient = ctx.createLinearGradient(0, 0, 0, this.height);
      this.gradient.addColorStop(0, '#1d2440');
      this.gradient.addColorStop(0.55, '#6b4e6e');
      this.gradient.addColorStop(1, '#d98a5f');
    }
    ctx.globalAlpha = trails && !paused && !this.fresh ? 1 - Math.exp(-20 * elapsed) : 1;
    ctx.fillStyle = this.gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;
    this.fresh = false;
    const environment = scene.environment();
    for (const obstacle of environment.obstacles) {
      const p = this.screen(obstacle.x, obstacle.y);
      ctx.fillStyle = '#1a1420'; ctx.strokeStyle = 'rgba(242,181,107,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, obstacle.radius * this.camera.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const birds = scene.snapshot().sort((a, b) => a.position.z - b.position.z);
    let totalSpeed = 0;
    for (const bird of birds) {
      totalSpeed += Math.hypot(bird.velocity.x, bird.velocity.y, bird.velocity.z);
      this.drawBird(bird, COLORS[bird.species]!, bird.species === 2 ? 5.8 : 4.2, bird.species === 1);
    }
    if (environment.hawk) this.drawBird(environment.hawk, '#ff6b57', 11, true);
    if (environment.alarm) {
      const p = this.screen(environment.alarm.x, environment.alarm.y);
      ctx.strokeStyle = `rgba(242,181,107,${environment.alarm.strength * 0.6})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, (55 * (1 - environment.alarm.strength) + 3) * this.camera.scale, 0, Math.PI * 2); ctx.stroke();
    }
    return birds.length ? totalSpeed / birds.length : 0;
  }

  private drawBird(bird: Bird, color: string, size: number, fork: boolean): void {
    const ctx = this.ctx;
    const p = this.screen(bird.position.x, bird.position.y);
    const angle = Math.atan2(-bird.velocity.y, bird.velocity.x);
    const depthSize = size * (0.85 + (bird.position.z / FIELD_BOUNDS.z + 1) * 0.15);
    ctx.fillStyle = color;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.beginPath(); ctx.moveTo(depthSize, 0);
    ctx.lineTo(-depthSize, depthSize * (fork ? 0.65 : 0.38));
    if (fork) ctx.lineTo(-depthSize * 0.35, 0);
    ctx.lineTo(-depthSize, -depthSize * (fork ? 0.65 : 0.38));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
