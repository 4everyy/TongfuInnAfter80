/** 客栈经营核心：客流 / 点单 / 后厨 / 上菜 / 收银 状态机 */

import { TILE, mulberry32, gToWorld } from '@core/geom';
import type { Dir } from '@core/geom';
import type { CharColors, CharFeat } from '@core/art';
import { walkStep } from './world';
import { DISHES } from './defs';
import type { DishDef } from './defs';

export type CustState =
  | 'walkIn'
  | 'deciding'
  | 'ordered'
  | 'queued'
  | 'eating'
  | 'angry'
  | 'leaving';

export interface Customer {
  id: number;
  name: string;
  colors: CharColors;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  animT: number;
  stuckT: number;
  state: CustState;
  seat: number;
  dish: DishDef | null;
  patience: number;
  patienceMax: number;
  decideT: number;
  eatT: number;
  angryT: number;
  path: Array<{ x: number; y: number }>;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

const SKINS = ['#f2c9a0', '#e8b98c', '#f0d0a8', '#d8a878', '#f6d8b2', '#c8a888'];
const HAIRS = ['#241a10', '#2a2018', '#181410', '#3a2a1a', '#30241a', '#4a3828', '#584838'];
const TOPS = ['#7a5a8a', '#3a6a5a', '#8a5a2a', '#4a6a8a', '#8a3a4a', '#5a7a3a', '#6a5a3a', '#3a4a6a', '#806040'];
const BOTTOMS = ['#3a3430', '#4a4a3a', '#2e3844', '#5a4030', '#40382a'];
const ACCENTS = ['#d4a017', '#b8a050', '#a87b0a', '#c09040'];
/** 村民随机发型 / 配饰（与主演阵容区分开） */
const VILLAGER_FEATS: CharFeat[] = [{}, {}, { hairStyle: 'band' }, { hairStyle: 'band' }, { beard: true }, { hairStyle: 'ponytail' }];

const NAMES = ['江湖客', '货郎', '书生', '镖师', '游商', '小贩', '郎中', '镖头', '说书迷', '食客'];

const SEAT_G: Array<[number, number]> = [
  [8.3, 15.05],
  [9.7, 15.05],
  [14.5, 15.05],
  [15.9, 15.05],
];
const SPAWN_G: [number, number] = [12.5, 17.4];
const GATE_G: [number, number] = [12.5, 16.1];
const KITCHEN_G: [number, number] = [12.5, 13.8];

const SPEED = 2.6 * TILE;
const DECIDE_PATIENCE = 14;
const ORDER_PATIENCE = 42;
const MAX_READY = 3;

interface Order {
  custId: number;
  dish: DishDef;
}

export interface InnHooks {
  onPay: (amount: number, tip: number) => void;
  /** 经营事件音效（coin 收银 / order 下单 / serve 上菜 / angry 怒离） */
  onEvent?: (ev: 'coin' | 'order' | 'serve' | 'angry') => void;
}

export class InnManager {
  customers: Customer[] = [];
  queue: Order[] = [];
  cooking: (Order & { t: number }) | null = null;
  ready: Order[] = [];
  floaters: Floater[] = [];
  /** 经营阅历（已听掌故数），驱动节奏与菜谱 */
  progress = 0;

  private hooks: InnHooks;
  private rnd = mulberry32(20260817);
  private spawnT = 2.5;
  private seats: Array<number | null> = SEAT_G.map(() => null);
  private nextId = 1;

  constructor(hooks: InnHooks) {
    this.hooks = hooks;
  }

  get kitchenPos() {
    return gToWorld(KITCHEN_G[0], KITCHEN_G[1]);
  }

  serveable(c: Customer): boolean {
    return c.state === 'queued' && this.ready.some((r) => r.custId === c.id);
  }

  tapCustomer(c: Customer) {
    if (c.state === 'deciding') {
      c.decideT = 0;
    } else if (c.state === 'ordered' && c.dish) {
      this.queue.push({ custId: c.id, dish: c.dish });
      c.state = 'queued';
      this.hooks.onEvent?.('order');
      this.addFloater(c.x, c.y - 60, c.dish.name + '·已下单', '#a8d8ff');
    } else if (this.serveable(c)) {
      const i = this.ready.findIndex((r) => r.custId === c.id);
      if (i >= 0) this.serve(i);
    }
  }

  serve(index: number) {
    const r = this.ready[index];
    if (!r) return;
    const c = this.customers.find((u) => u.id === r.custId && u.state === 'queued');
    this.ready.splice(index, 1);
    if (!c || !c.dish) {
      const k = this.kitchenPos;
      this.addFloater(k.x, k.y - 30, '客人跑了，白做了…', '#e08050');
      return;
    }
    c.state = 'eating';
    c.eatT = 2.5 + r.dish.cookSec * 0.15;
    c.dir = 'down';
    this.hooks.onEvent?.('serve');
  }

  update(dt: number) {
    this.spawnT -= dt;
    const seated = this.seats.filter((s) => s !== null).length;
    if (this.spawnT <= 0) {
      this.spawnT = (5 + this.rnd() * 8) * Math.max(0.42, 1 - this.progress * 0.007);
      if (seated < SEAT_G.length) this.spawnCustomer();
    }
    if (!this.cooking && this.queue.length > 0) {
      const o = this.queue.shift()!;
      this.cooking = { ...o, t: 0 };
    }
    if (this.cooking) {
      this.cooking.t += dt;
      if (this.cooking.t >= this.cooking.dish.cookSec && this.ready.length < MAX_READY) {
        this.ready.push({ custId: this.cooking.custId, dish: this.cooking.dish });
        this.cooking = null;
      }
    }
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      this.updateCustomer(c, dt);
      if (c.state === 'leaving' && c.path.length === 0) this.customers.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t -= dt;
      f.y -= 22 * dt;
      if (f.t <= 0) this.floaters.splice(i, 1);
    }
  }

  private updateCustomer(c: Customer, dt: number) {
    switch (c.state) {
      case 'walkIn': {
        c.moving = this.followPath(c, dt);
        if (c.path.length === 0) {
          c.state = 'deciding';
          c.decideT = 1.4;
          const dp = this.decidePatience();
          c.patience = dp;
          c.patienceMax = dp;
          c.dir = 'up';
          c.moving = false;
        }
        break;
      }
      case 'deciding': {
        c.patience -= dt;
        c.decideT -= dt;
        if (c.decideT <= 0) {
          c.dish = this.pickDish();
          c.state = 'ordered';
          const op = this.orderPatience();
          c.patience = op;
          c.patienceMax = op;
        } else if (c.patience <= 0) this.becomeAngry(c);
        break;
      }
      case 'ordered': {
        c.patience -= dt;
        if (c.patience <= 0) this.becomeAngry(c);
        break;
      }
      case 'queued': {
        c.patience -= dt * 0.7;
        if (c.patience <= 0) this.becomeAngry(c);
        break;
      }
      case 'eating': {
        c.eatT -= dt;
        if (c.eatT <= 0) this.finishMeal(c);
        break;
      }
      case 'angry': {
        c.angryT -= dt;
        if (c.angryT <= 0) this.leave(c, false);
        break;
      }
      case 'leaving': {
        c.moving = this.followPath(c, dt);
        if (c.path.length === 0) c.moving = false;
        break;
      }
    }
  }

  private finishMeal(c: Customer) {
    const dish = c.dish!;
    const k = Math.max(0, c.patience / c.patienceMax);
    const tip = k > 0.35 ? Math.round(dish.price * (0.15 + 0.25 * k)) : 0;
    const pay = dish.price + tip;
    this.hooks.onPay(pay, tip);
    this.hooks.onEvent?.('coin');
    this.addFloater(c.x, c.y - 56, '+' + pay + '两' + (tip > 0 ? '（含赏' + tip + '）' : ''), '#8ce88c');
    this.leave(c, true);
  }

  private becomeAngry(c: Customer) {
    this.queue = this.queue.filter((o) => o.custId !== c.id);
    if (this.cooking && this.cooking.custId === c.id) this.cooking = null;
    this.ready = this.ready.filter((o) => o.custId !== c.id);
    c.state = 'angry';
    c.angryT = 1.3;
    c.moving = false;
    this.hooks.onEvent?.('angry');
    this.addFloater(c.x, c.y - 56, '哼！不等了！', '#ff7a6a');
  }

  private leave(c: Customer, _happy: boolean) {
    if (this.seats[c.seat] === c.id) this.seats[c.seat] = null;
    c.state = 'leaving';
    c.path = this.outPath(c.seat);
  }

  private followPath(c: Customer, dt: number): boolean {
    const p = c.path[0];
    if (!p) return false;
    const arrived = walkStep(c, p.x, p.y, SPEED, dt);
    if (arrived || c.stuckT > 0.6) {
      c.stuckT = 0;
      c.path.shift();
    }
    return true;
  }

  private inPath(seat: number): Array<{ x: number; y: number }> {
    const gate = gToWorld(GATE_G[0], GATE_G[1]);
    const s = gToWorld(SEAT_G[seat][0], SEAT_G[seat][1]);
    const spawn = gToWorld(SPAWN_G[0], SPAWN_G[1]);
    return [
      { x: spawn.x, y: gate.y },
      { x: s.x, y: gate.y },
      { x: s.x, y: s.y },
    ];
  }

  private outPath(seat: number): Array<{ x: number; y: number }> {
    return this.inPath(seat).reverse();
  }

  private spawnCustomer() {
    const seat = this.seats.findIndex((s) => s === null);
    if (seat < 0) return;
    const pick = <T,>(arr: T[]): T => arr[Math.floor(this.rnd() * arr.length)];
    const colors: CharColors = {
      skin: pick(SKINS),
      hair: pick(HAIRS),
      top: pick(TOPS),
      bottom: pick(BOTTOMS),
      accent: pick(ACCENTS),
      feat: pick(VILLAGER_FEATS),
    };
    const spawn = gToWorld(SPAWN_G[0], SPAWN_G[1]);
    const c: Customer = {
      id: this.nextId++,
      name: pick(NAMES),
      colors,
      x: spawn.x,
      y: spawn.y,
      dir: 'up',
      moving: false,
      animT: 0,
      stuckT: 0,
      state: 'walkIn',
      seat,
      dish: null,
      patience: 14,
      patienceMax: 14,
      decideT: 1.4,
      eatT: 0,
      angryT: 0,
      path: this.inPath(seat),
    };
    this.seats[seat] = c.id;
    this.customers.push(c);
  }

  /** 阅历越深节奏越快：耐心递减（菜价已随菜谱解锁上浮，形成难度曲线） */
  private decidePatience(): number {
    return Math.max(8, DECIDE_PATIENCE * (1 - this.progress * 0.004));
  }

  private orderPatience(): number {
    return Math.max(24, ORDER_PATIENCE * (1 - this.progress * 0.003));
  }

  private pickDish(): DishDef {
    const unlocked = DISHES.filter((d) => d.unlockChapter <= this.progress);
    return unlocked[Math.floor(this.rnd() * unlocked.length)] ?? DISHES[0];
  }

  private addFloater(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, color, t: 1.7 });
  }
}
