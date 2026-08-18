/** 游戏主循环：rAF 驱动，前后台切换暂停 */

import type { Platform } from './platform';
import { updateTweens } from './tween';

export interface Game {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export class Engine {
  private last = 0;
  private paused = false;
  private stopped = false;

  constructor(
    private platform: Platform,
    private game: Game,
  ) {}

  start() {
    this.platform.onShow(() => {
      this.paused = false;
      this.last = 0;
    });
    this.platform.onHide(() => (this.paused = true));

    const loop = (ts: number) => {
      if (this.stopped) return;
      requestAnimationFrame(loop);
      if (!this.last) this.last = ts;
      const dt = Math.min((ts - this.last) / 1000, 0.05);
      this.last = ts;
      if (this.paused) return;
      updateTweens(dt);
      this.game.update(dt);
      this.game.render(this.platform.ctx);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.stopped = true;
  }
}
