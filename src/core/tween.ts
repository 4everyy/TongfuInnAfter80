/** 引擎循环与显示对象：极简 scene-graph，满足小游戏性能预算 */

export type Updateable = { update(dt: number): void };

const _tweens: Tween[] = [];

export class Tween {
  private t = 0;
  private done = false;
  constructor(
    private dur: number,
    private fn: (k: number) => void,
    private ease: (t: number) => number = (t) => t,
    private onEnd?: () => void,
  ) {}
  static to(dur: number, fn: (k: number) => void, ease?: (t: number) => number, onEnd?: () => void) {
    const tw = new Tween(dur, fn, ease, onEnd);
    _tweens.push(tw);
    return tw;
  }
  update(dt: number) {
    if (this.done) return;
    this.t += dt;
    const k = Math.min(this.t / this.dur, 1);
    this.fn(this.ease(k));
    if (k >= 1) {
      this.done = true;
      this.onEnd?.();
    }
  }
  get isDone() {
    return this.done;
  }
  cancel() {
    this.done = true;
  }
}

export function updateTweens(dt: number) {
  for (let i = _tweens.length - 1; i >= 0; i--) {
    const tw = _tweens[i];
    tw.update(dt);
    if (tw.isDone) _tweens.splice(i, 1);
  }
}

export function killAllTweens() {
  _tweens.length = 0;
}

export function delay(sec: number, cb: () => void) {
  return Tween.to(sec, () => {}, undefined, cb);
}
