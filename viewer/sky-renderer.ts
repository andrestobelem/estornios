import { SPECIES } from "../src/murmuration.ts";
import type { Murmuration } from "../src/murmuration.ts";

/** Original sky and batched silhouette rendering, in the simulation's screen coordinates. */
export class SkyRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private gradient: CanvasGradient | null = null;
  private fresh = true;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
  }
  resize(): { width: number; height: number } {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.gradient = null;
    this.invalidate();
    return { width: this.width, height: this.height };
  }
  invalidate(): void {
    this.fresh = true;
  }
  world(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
  draw(
    scene: Murmuration,
    trails: boolean,
    paused: boolean,
    elapsed: number,
  ): void {
    if (paused && !this.fresh) return;
    const ctx = this.ctx,
      W = this.width,
      H = this.height;
    if (!this.gradient) {
      this.gradient = ctx.createLinearGradient(0, 0, 0, H);
      this.gradient.addColorStop(0, "#1d2440");
      this.gradient.addColorStop(0.55, "#6b4e6e");
      this.gradient.addColorStop(1, "#d98a5f");
    }
    const gradient = this.gradient;
    const paintSky = (alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    };
    const { birds, obstacles, scare, hawk: activeHawk } = scene.view();
    const state = {
      trails: trails && !paused && !this.fresh,
      hawk: !!activeHawk,
    };
    const reduce = false;
    const hawk = activeHawk!;
    function drawBirds(sp: number) {
      const S = SPECIES[sp]!,
        L = S.size,
        Wd = S.size * 0.38;
      ctx.fillStyle = S.color;
      ctx.beginPath();
      for (const b of birds) {
        if (b.sp !== sp) continue;
        const s = Math.hypot(b.vx, b.vy) || 1,
          ux = b.vx / s,
          uy = b.vy / s;
        ctx.moveTo(b.x + ux * L, b.y + uy * L);
        if (S.shape === "fork") {
          // swept wings with a notched tail
          ctx.lineTo(
            b.x - ux * L - uy * Wd * 1.6,
            b.y - uy * L + ux * Wd * 1.6,
          );
          ctx.lineTo(b.x - ux * L * 0.35, b.y - uy * L * 0.35);
          ctx.lineTo(
            b.x - ux * L + uy * Wd * 1.6,
            b.y - uy * L - ux * Wd * 1.6,
          );
        } else {
          ctx.lineTo(b.x - ux * L - uy * Wd, b.y - uy * L + ux * Wd);
          ctx.lineTo(b.x - ux * L + uy * Wd, b.y - uy * L - ux * Wd);
        }
        ctx.closePath();
      }
      ctx.fill();
    }

    function draw() {
      if (state.trails && !reduce) paintSky(1 - Math.pow(0.72, elapsed * 60));
      else paintSky(1);
      for (const ob of obstacles) {
        ctx.fillStyle = "#1a1420";
        ctx.beginPath();
        ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(242,181,107,0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      for (let sp = 0; sp < 3; sp++) drawBirds(sp);
      if (state.hawk) {
        const s = Math.hypot(hawk.vx, hawk.vy) || 1,
          ux = hawk.vx / s,
          uy = hawk.vy / s;
        ctx.fillStyle = "#ff6b57";
        ctx.beginPath();
        ctx.moveTo(hawk.x + ux * 11, hawk.y + uy * 11);
        ctx.lineTo(hawk.x - ux * 8 - uy * 9, hawk.y - uy * 8 + ux * 9);
        ctx.lineTo(hawk.x - ux * 3, hawk.y - uy * 3);
        ctx.lineTo(hawk.x - ux * 8 + uy * 9, hawk.y - uy * 8 - ux * 9);
        ctx.closePath();
        ctx.fill();
      }
      if (scare) {
        ctx.strokeStyle = `rgba(242, 181, 107, ${scare.k * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(scare.x, scare.y, 150 * (1 - scare.k) + 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    draw();
    this.fresh = false;
  }
}
