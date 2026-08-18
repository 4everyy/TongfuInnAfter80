/** 主场景：大地图渲染（分块地面 + 深度排序）+ 玩家点击移动 + NPC 游荡 */

import { Scene } from '@core/scene';
import { Camera } from '@core/camera';
import {
  TILE,
  WORLD_W,
  WORLD_H,
  WORLD_COLS,
  WORLD_ROWS,
  dist,
  dirFromVec,
  mulberry32,
  worldToG,
  gToWorld,
} from '@core/geom';
import type { Dir } from '@core/geom';
import { groundChunkTex, GROUND_CHUNK, drawTex, charTex, charScale, rr, dishTex } from '@core/art';
import type { CharColors, WalkFrame } from '@core/art';
import { CHAR_MAP } from './defs';
import { PROPS, NPC_SPAWNS, PLAYER_START, groundKindAt, isSolidAt, zoneAt } from './world';
import type { NpcSpawn } from './world';
import type { InnManager, Customer } from './inn';
import type { Season } from './defs';
import { SEASON_FX } from './defs';

export interface SceneHooks {
  onTalk: (npcId: string) => void;
  onZone: (name: string) => void;
}

interface ActorState {
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  animT: number;
  stuckT: number;
  colors: CharColors;
}

export interface Player extends ActorState {
  tx: number | null;
  ty: number | null;
}

export interface Npc extends ActorState {
  id: string;
  name: string;
  hx: number;
  hy: number;
  radius: number;
  speed: number;
  waitT: number;
  tx: number;
  ty: number;
  rnd: () => number;
  near: boolean;
}

const PLAYER_SPEED = 4.4 * TILE;

function makeNpc(s: NpcSpawn): Npc {
  const def = CHAR_MAP[s.id] ?? CHAR_MAP['moody'];
  const p = gToWorld(s.gx, s.gy);
  return {
    id: s.id,
    name: def.name,
    colors: def.colors,
    x: p.x,
    y: p.y,
    dir: 'down',
    moving: false,
    animT: 0,
    stuckT: 0,
    hx: p.x,
    hy: p.y,
    radius: s.r,
    speed: s.speed * TILE,
    waitT: Math.random() * 2,
    tx: p.x,
    ty: p.y,
    rnd: mulberry32(((s.gx * 73856093) ^ (s.gy * 19349663)) >>> 0),
    near: false,
  };
}

export class MainScene extends Scene {
  readonly camera: Camera;
  readonly player: Player;
  readonly npcs: Npc[] = [];
  inn: InnManager | null = null;
  paused = false;
  /** 当前季节（app 层驱动） */
  season: Season = '春';
  /** 季节飘落粒子（屏幕空间） */
  private flakes: Array<{ x: number; y: number; vx: number; vy: number; r: number; c: string }> = [];

  private hooks: SceneHooks;
  private lastDt = 1 / 60;
  private pendingTalk: Npc | null = null;
  private marker: { x: number; y: number; t: number } | null = null;
  private curZone: string;

  constructor(viewW: number, viewH: number, hooks: SceneHooks) {
    super();
    this.hooks = hooks;
    this.camera = new Camera(viewW, viewH, WORLD_W, WORLD_H);
    const start = gToWorld(PLAYER_START.gx, PLAYER_START.gy);
    this.player = {
      colors: CHAR_MAP['tongxy'].colors,
      x: start.x,
      y: start.y,
      dir: 'down',
      moving: false,
      animT: 0,
      stuckT: 0,
      tx: null,
      ty: null,
    };
    this.camera.snapTo(start.x, start.y);
    for (const s of NPC_SPAWNS) this.npcs.push(makeNpc(s));
    this.curZone = zoneAt(PLAYER_START.gx, PLAYER_START.gy);
  }

  resize(w: number, h: number) {
    this.camera.resize(w, h);
  }

  /* ---------------- 输入 ---------------- */

  /** 屏幕坐标点选 NPC（点身体） */
  pickNpc(sx: number, sy: number): Npc | null {
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const n = this.npcs[i];
      const s = this.camera.toScreen(n.x, n.y - 24);
      if (Math.hypot(s.sx - sx, s.sy - sy) < 42) return n;
    }
    return null;
  }

  /** 屏幕坐标点选客栈客人（点身体） */
  pickCustomer(sx: number, sy: number): Customer | null {
    if (!this.inn) return null;
    for (let i = this.inn.customers.length - 1; i >= 0; i--) {
      const n = this.inn.customers[i];
      const s = this.camera.toScreen(n.x, n.y - 24);
      if (Math.hypot(s.sx - sx, s.sy - sy) < 42) return n;
    }
    return null;
  }

  /** 点击地面：走向世界点 */
  moveTo(sx: number, sy: number) {
    const w = this.camera.toWorld(sx, sy);
    if (w.wx < TILE * 0.5 || w.wy < TILE * 0.5 || w.wx > WORLD_W - TILE * 0.5 || w.wy > WORLD_H - TILE * 0.5) return;
    this.pendingTalk = null;
    this.player.tx = w.wx;
    this.player.ty = w.wy;
    this.marker = { x: w.wx, y: w.wy, t: 0.7 };
  }

  /** 点击 NPC：走过去搭话 */
  goToNpc(n: Npc) {
    this.pendingTalk = n;
    this.player.tx = n.x;
    this.player.ty = n.y + TILE * 0.55;
    this.marker = { x: n.x, y: n.y + TILE * 0.55, t: 0.7 };
  }

  talkRange(n: Npc) {
    return dist(this.player.x, this.player.y, n.x, n.y) < TILE * 1.6;
  }

  /* ---------------- 行为 ---------------- */

  update(dt: number) {
    this.lastDt = dt;
    const pl = this.player;
    if (!this.paused) {
      let walking = false;
      if (pl.tx !== null && pl.ty !== null) {
        const arrived = this.stepToward(pl, pl.tx, pl.ty, PLAYER_SPEED, dt);
        if (arrived || pl.stuckT > 0.4) {
          pl.tx = null;
          pl.ty = null;
          pl.stuckT = 0;
        } else {
          walking = true;
        }
      }
      pl.moving = walking;
      for (const n of this.npcs) this.updateNpc(n, dt);
      if (this.pendingTalk) {
        const n = this.pendingTalk;
        if (this.talkRange(n)) {
          pl.tx = null;
          pl.ty = null;
          this.pendingTalk = null;
          this.hooks.onTalk(n.id);
        }
      }
      // 分区提示
      const g = worldToG(pl.x, pl.y);
      const z = zoneAt(g.gx, g.gy);
      if (z !== this.curZone) {
        this.curZone = z;
        this.hooks.onZone(z);
      }
    }
    // 行走动画相位
    pl.animT = pl.moving ? pl.animT + dt : 0;
    for (const n of this.npcs) n.animT = n.moving ? n.animT + dt : 0;
    if (this.inn) for (const n of this.inn.customers) n.animT = n.moving ? n.animT + dt : 0;
    // 名牌显隐（玩家附近才显示）
    for (const n of this.npcs) n.near = dist(pl.x, pl.y, n.x, n.y) < TILE * 3.4;
    // 相机跟随 + 标记衰减
    this.camera.follow(pl.x, pl.y - TILE * 0.25, dt);
    if (this.marker) {
      this.marker.t -= dt;
      if (this.marker.t <= 0) this.marker = null;
    }
  }

  private updateNpc(n: Npc, dt: number) {
    if (n.waitT > 0) {
      n.waitT -= dt;
      n.moving = false;
      return;
    }
    const arrived = this.stepToward(n, n.tx, n.ty, n.speed, dt);
    if (arrived || n.stuckT > 0.5) {
      n.stuckT = 0;
      n.moving = false;
      n.waitT = 0.6 + n.rnd() * 2.4;
      const ang = n.rnd() * Math.PI * 2;
      const rad = n.rnd() * n.radius;
      n.tx = n.hx + Math.cos(ang) * rad * TILE;
      n.ty = n.hy + Math.sin(ang) * rad * TILE;
      return;
    }
    n.moving = true;
  }

  /** 朝目标走一步（分轴碰撞 + 卡墙检测），返回是否已到达 */
  private stepToward(a: ActorState, tx: number, ty: number, speed: number, dt: number): boolean {
    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    a.dir = dirFromVec(dx, dy, a.dir);
    const k = Math.min(speed * dt, d);
    const px = a.x;
    const py = a.y;
    this.tryMove(a, a.x + (dx / d) * k, a.y + (dy / d) * k);
    const moved = Math.hypot(a.x - px, a.y - py);
    if (moved < k * 0.4) a.stuckT += dt;
    else a.stuckT = 0;
    return false;
  }

  private tryMove(a: ActorState, nx: number, ny: number) {
    const feet = 6; // 脚底碰撞采样（略高于锚点）
    if (!isSolidAt(nx, a.y - feet)) a.x = nx;
    if (!isSolidAt(a.x, ny - feet)) a.y = ny;
  }

  /* ---------------- 渲染 ---------------- */

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.camera.apply(ctx);
    super.render(ctx);
    ctx.restore();
    // 季节色调 + 飘落粒子（屏幕空间叠加）
    this.drawSeasonFx(ctx);
  }

  /** 屏幕空间季节效果：multiply 色调 + 飘落粒子 */
  private drawSeasonFx(ctx: CanvasRenderingContext2D) {
    const fx = SEASON_FX[this.season];
    const W = this.camera.viewW;
    const H = this.camera.viewH;
    // 粒子：数量随季节，冬多夏少
    const target = this.season === '冬' ? 46 : this.season === '秋' ? 30 : 18;
    while (this.flakes.length < target) {
      const c = fx.particles[Math.floor(Math.random() * fx.particles.length)];
      this.flakes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.3) * 26,
        vy: 18 + Math.random() * 34,
        r: 1.6 + Math.random() * 2.6,
        c,
      });
    }
    if (this.flakes.length > target) this.flakes.length = target;
    const dt = this.lastDt;
    for (const f of this.flakes) {
      f.x += (f.vx + Math.sin(f.y * 0.02) * 12) * dt;
      f.y += f.vy * dt;
      if (f.y > H + 8) {
        f.y = -8;
        f.x = Math.random() * W;
      }
      if (f.x < -8) f.x += W + 16;
      if (f.x > W + 8) f.x -= W + 16;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = fx.alpha;
    ctx.fillStyle = fx.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    for (const f of this.flakes) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  buildFrame() {
    const cam = this.camera;
    // 地面分块（仅视口内，惰性生成）
    const CS = GROUND_CHUNK * TILE;
    const cx0 = Math.max(0, Math.floor((cam.x - cam.viewW / 2) / CS));
    const cx1 = Math.min(Math.ceil(WORLD_COLS / GROUND_CHUNK) - 1, Math.floor((cam.x + cam.viewW / 2) / CS));
    const cy0 = Math.max(0, Math.floor((cam.y - cam.viewH / 2) / CS));
    const cy1 = Math.min(Math.ceil(WORLD_ROWS / GROUND_CHUNK) - 1, Math.floor((cam.y + cam.viewH / 2) / CS));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const tex = groundChunkTex(cx, cy, groundKindAt);
        const px = cx * CS;
        const py = cy * CS;
        this.items.push({ depth: -1e9, draw: (c) => c.drawImage(tex, px, py) });
      }
    }
    // 点击落点标记（地面贴花）
    if (this.marker) {
      const m = this.marker;
      const k = Math.min(m.t / 0.7, 1);
      this.items.push({
        depth: m.y,
        draw: (c) => {
          c.save();
          c.globalAlpha = k * 0.9;
          c.strokeStyle = '#f5d580';
          c.lineWidth = 3;
          c.beginPath();
          c.ellipse(m.x, m.y, 16, 8, 0, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        },
      });
    }
    // 陈设（视口剔除）
    for (const p of PROPS) {
      const tex = p.tex();
      if (!cam.intersects(p.x - tex.width / 2, p.y - tex.height, p.x + tex.width / 2, p.y)) continue;
      const x = p.x;
      const y = p.y;
      this.items.push({ depth: y, draw: (c) => drawTex(c, tex, x, y) });
    }
    // 角色：客栈客人 + NPC，玩家压轴
    if (this.inn) this.pushCustomers(this.inn);
    for (const n of this.npcs) this.pushActor(n, n.near ? n.name : '');
    this.pushActor(this.player, '佟湘玉');
  }

  private pushActor(a: ActorState, label: string) {
    const frame: WalkFrame = a.moving ? (((Math.floor(a.animT * 7) % 2) + 1) as 1 | 2) : 0;
    const tex = charTex(a.colors, a.dir, frame);
    const sc = charScale(a.colors);
    const x = a.x;
    const y = a.y;
    this.items.push({
      depth: y + 0.01,
      draw: (c) => {
        drawTex(c, tex, x, y, sc);
        if (label) {
          c.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          const tw = c.measureText(label).width;
          rr(c, x - tw / 2 - 8, y - 84 * sc, tw + 16, 20, 9);
          c.fillStyle = 'rgba(20,14,8,0.72)';
          c.fill();
          c.strokeStyle = 'rgba(212,160,23,0.55)';
          c.lineWidth = 1;
          c.stroke();
          c.fillStyle = '#ffe8b0';
          c.fillText(label, x, y - 73.5 * sc);
        }
      },
    });
  }
  private pushCustomers(inn: InnManager) {
    for (const n of inn.customers) {
      const frame: WalkFrame = n.moving ? (((Math.floor(n.animT * 7) % 2) + 1) as 1 | 2) : 0;
      const tex = charTex(n.colors, n.dir, frame);
      const sc = charScale(n.colors);
      const x = n.x;
      const y = n.y;
      const st = n.state;
      const k = Math.max(0, n.patience / n.patienceMax);
      const dishName = n.dish ? n.dish.name : '';
      const dishIcon = n.dish && st === 'queued' ? dishTex(n.dish.id, n.dish.color) : null;
      this.items.push({
        depth: y + 0.005,
        draw: (c) => {
          drawTex(c, tex, x, y, sc);
          const icon = st === 'deciding' ? '?' : st === 'ordered' ? '!' : st === 'eating' ? '~' : st === 'angry' ? 'X' : '';
          if (icon) {
            c.save();
            c.globalAlpha = 0.92;
            rr(c, x - 12, y - 98 * sc, 24, 22, 8);
            c.fillStyle = 'rgba(252,246,232,0.94)';
            c.fill();
            c.strokeStyle = 'rgba(120,84,40,0.5)';
            c.lineWidth = 1;
            c.stroke();
            c.fillStyle = st === 'angry' ? '#c04030' : '#5a4020';
            c.font = 'bold 15px sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(icon, x, y - 86.5 * sc);
            c.restore();
          }
          if (st === 'deciding' || st === 'ordered' || st === 'queued') {
            c.save();
            c.strokeStyle = 'rgba(30,20,10,0.55)';
            c.lineWidth = 3.5;
            c.beginPath();
            c.arc(x, y - 112 * sc, 10, 0, Math.PI * 2);
            c.stroke();
            c.strokeStyle = k > 0.5 ? '#7ac86a' : k > 0.25 ? '#e0b040' : '#d05040';
            c.beginPath();
            c.arc(x, y - 112 * sc, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
            c.stroke();
            c.restore();
          }
          if (dishName && st === 'queued') {
            c.save();
            if (dishIcon) {
              // 菜品小图标（左侧）+ 菜名
              drawTex(c, dishIcon, x - 20, y - 134 * sc, 0.38, 0.95);
              c.font = '11px "Microsoft YaHei", sans-serif';
              c.textAlign = 'left';
              c.textBaseline = 'middle';
              const tw = c.measureText(dishName).width;
              rr(c, x - 2, y - 134 * sc, tw + 14, 17, 8);
              c.fillStyle = 'rgba(20,14,8,0.7)';
              c.fill();
              c.fillStyle = '#ffe8b0';
              c.fillText(dishName, x + 5, y - 125 * sc);
            } else {
              c.font = '11px "Microsoft YaHei", sans-serif';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              const tw = c.measureText(dishName).width;
              rr(c, x - tw / 2 - 6, y - 134 * sc, tw + 12, 17, 8);
              c.fillStyle = 'rgba(20,14,8,0.7)';
              c.fill();
              c.fillStyle = '#ffe8b0';
              c.fillText(dishName, x, y - 125 * sc);
            }
            c.restore();
          }
        },
      });
    }
    for (const f of inn.floaters) {
      const x = f.x;
      const y = f.y;
      const text = f.text;
      const color = f.color;
      const alpha = Math.min(1, f.t / 0.6);
      this.items.push({
        depth: 1e9,
        draw: (c) => {
          c.save();
          c.globalAlpha = alpha;
          c.font = 'bold 13px "Microsoft YaHei", sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          const tw = c.measureText(text).width;
          rr(c, x - tw / 2 - 7, y - 11, tw + 14, 21, 8);
          c.fillStyle = 'rgba(16,10,4,0.78)';
          c.fill();
          c.fillStyle = color;
          c.fillText(text, x, y);
          c.restore();
        },
      });
    }
  }
}
