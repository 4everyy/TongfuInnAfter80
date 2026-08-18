/** 摄像机：跟随目标 + 世界边界钳制（无缩放，正交 2.5D） */

import { clamp, lerp } from './geom';

export class Camera {
  x = 0;
  y = 0;
  /** 平滑跟随系数（每秒收敛比例） */
  followK = 6;

  constructor(
    public viewW: number,
    public viewH: number,
    public worldW: number,
    public worldH: number,
  ) {}

  resize(viewW: number, viewH: number) {
    this.viewW = viewW;
    this.viewH = viewH;
  }

  /** 平滑跟向目标点 */
  follow(tx: number, ty: number, dt: number) {
    const k = 1 - Math.exp(-this.followK * dt);
    this.x = lerp(this.x, tx, k);
    this.y = lerp(this.y, ty, k);
    this.clampToWorld();
  }

  /** 立即对准（切场景/传送用） */
  snapTo(tx: number, ty: number) {
    this.x = tx;
    this.y = ty;
    this.clampToWorld();
  }

  private clampToWorld() {
    // 视口大于世界（小屏开局）时居中
    if (this.viewW >= this.worldW) {
      this.x = this.worldW / 2;
    } else {
      this.x = clamp(this.x, this.viewW / 2, this.worldW - this.viewW / 2);
    }
    if (this.viewH >= this.worldH) {
      this.y = this.worldH / 2;
    } else {
      this.y = clamp(this.y, this.viewH / 2, this.worldH - this.viewH / 2);
    }
  }

  /** 世界坐标 → 屏幕坐标 */
  toScreen(wx: number, wy: number) {
    return { sx: wx - this.x + this.viewW / 2, sy: wy - this.y + this.viewH / 2 };
  }

  /** 屏幕坐标 → 世界坐标 */
  toWorld(sx: number, sy: number) {
    return { wx: sx + this.x - this.viewW / 2, wy: sy + this.y - this.viewH / 2 };
  }

  /** 视口是否与矩形（世界坐标）相交（用于剔除） */
  intersects(wx0: number, wy0: number, wx1: number, wy1: number) {
    const vx0 = this.x - this.viewW / 2;
    const vx1 = this.x + this.viewW / 2;
    const vy0 = this.y - this.viewH / 2;
    const vy1 = this.y + this.viewH / 2;
    return wx1 >= vx0 && wx0 <= vx1 && wy1 >= vy0 && wy0 <= vy1;
  }

  /** 应用变换：ctx 平移到相机 */
  apply(ctx: CanvasRenderingContext2D) {
    ctx.translate(
      Math.round(this.viewW / 2 - this.x),
      Math.round(this.viewH / 2 - this.y),
    );
  }
}