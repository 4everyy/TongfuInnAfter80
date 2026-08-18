/** 大地图布局：52×38 格一镜到底；区域=功能分区（客栈/大街/市集/河畔/田野…） */

import { TILE, WORLD_COLS, WORLD_ROWS, type Rect, type Dir, dirFromVec, gToWorld, mulberry32 } from '@core/geom';
import type { GroundKind } from '@core/art/building';
import {
  innTex,
  houseTex,
  yihonglouTex,
  bankTex,
  yamenTex,
  treeTex,
  rockTex,
  wellTex,
  stallTex,
  tableTex,
  lanternPostTex,
  fenceTex,
  bridgeTex,
  boatTex,
  signpostTex,
  reedTex,
  lotusTex,
  duckTex,
  bushTex,
  flowerbedTex,
  scarecrowTex,
} from '@core/art/building';
import type { TreeKind } from '@core/art/building';

/* ---------------- 分区 ---------------- */

export interface Zone {
  id: string;
  name: string;
  rect: Rect;
}
const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });

/** 分区表（先到先得：具体区域在前） */
export const ZONES: Zone[] = [
  { id: 'inn', name: '同福客栈', rect: R(5, 4, 19, 15) },
  { id: 'market', name: '十八里铺·市集', rect: R(35, 19, 49, 23) },
  { id: 'street', name: '七侠镇大街', rect: R(3, 16, 49, 18) },
  { id: 'riverside', name: '河畔', rect: R(2, 24, 49, 30) },
  { id: 'farm', name: '田野', rect: R(2, 31, 49, 37) },
  { id: 'north', name: '镇北民居', rect: R(3, 2, 50, 15) },
];

export function zoneAt(gx: number, gy: number): string {
  for (const z of ZONES) {
    if (gx >= z.rect.x0 && gx <= z.rect.x1 && gy >= z.rect.y0 && gy <= z.rect.y1) return z.name;
  }
  return '七侠镇郊外';
}

/* ---------------- 地面 ---------------- */

/** 桥面（可通行）所在格 */
const BRIDGE = R(24, 26, 25, 28);

/** 河道中心线（连续正弦蜿蜒） */
const riverY = (gx: number) => 27 + Math.sin(gx * 0.3);

export function groundKindAt(gx: number, gy: number): GroundKind {
  // 桥及引桥（先于河水判定）
  if (gx >= 23 && gx <= 26 && gy >= 25 && gy <= 29) return 'stone';
  // 蜿蜒河道（中心 ±1 行）
  const rc = Math.round(riverY(gx));
  if (gy >= rc - 1 && gy <= rc + 1) return 'water';
  // 大街
  if (gy >= 16 && gy <= 18 && gx >= 3 && gx <= 49) return 'stone';
  // 市集广场
  if (gy >= 19 && gy <= 22 && gx >= 36 && gx <= 48) return 'stone';
  // 客栈前院（木地板）
  if (gy >= 13 && gy <= 15 && gx >= 8 && gx <= 16) return 'plank';
  // 通向各建筑的土路
  if ((gx === 30 || gx === 31) && gy >= 13 && gy <= 15) return 'dirt';
  if ((gx === 40 || gx === 41) && gy >= 11 && gy <= 15) return 'dirt';
  if ((gx === 45 || gx === 46) && gy >= 13 && gy <= 15) return 'dirt';
  // 河畔步道
  if (gy >= 24 && gy <= 25 && gx >= 3 && gx <= 49) return 'dirt';
  // 桥南引道
  if (gy >= 29 && gy <= 30 && gx >= 21 && gx <= 28) return 'dirt';
  // 田垄
  if (gy >= 31 && gy <= 36 && ((gx >= 4 && gx <= 20) || (gx >= 30 && gx <= 46))) return 'field';
  return 'grass';
}

/* ---------------- 陈设（建筑/树木/…） ---------------- */

export interface PropDef {
  tex: () => HTMLCanvasElement;
  /** 世界像素锚点（底边中心） */
  x: number;
  y: number;
  /** 占用实心格（含端点） */
  cells?: Rect;
}

const P = (
  tex: () => HTMLCanvasElement,
  gx: number,
  gy: number,
  cells?: Rect,
): PropDef => ({ tex, ...gToWorld(gx, gy), cells });

function fencePlot(x0: number, y0: number, x1: number, y1: number, gapTop: number[]): PropDef[] {
  const out: PropDef[] = [];
  for (let gx = x0; gx <= x1; gx++) {
    if (!gapTop.includes(gx)) out.push(P(fenceTex, gx, y0, R(gx, y0, gx, y0)));
    if (y1 !== y0) out.push(P(fenceTex, gx, y1, R(gx, y1, gx, y1)));
  }
  for (let gy = y0 + 1; gy < y1; gy++) {
    out.push(P(fenceTex, x0, gy, R(x0, gy, x0, gy)));
    out.push(P(fenceTex, x1, gy, R(x1, gy, x1, gy)));
  }
  return out;
}

const TREES: Array<[number, number, TreeKind]> = [
  // 河畔北岸（避开桥区 22-28）：垂柳 + 松
  [5, 24.3, 'willow'], [12, 24.2, 'willow'], [19, 24.3, 'pine'], [33, 24.2, 'willow'],
  [38, 24.3, 'green'], [43, 24.2, 'willow'], [47.5, 24.4, 'pine'],
  // 镇内点缀
  [6.5, 14.6, 'green'], [33.8, 15.2, 'green'], [36, 8.5, 'autumn'], [48.8, 8.2, 'pine'],
  [50.3, 23.5, 'autumn'], [3, 22.5, 'green'], [23.5, 5.2, 'pine'], [9, 6.2, 'green'],
  // 河南岸
  [8, 30.3, 'green'], [33.5, 30.4, 'autumn'], [48, 30.3, 'green'], [16, 30.2, 'pine'],
  // 地图边缘围合（混植松树做背景层次）
  [3, 2, 'green'], [8, 1.6, 'pine'], [14, 2, 'willow'], [20, 1.6, 'green'], [26, 2, 'pine'],
  [32, 1.6, 'willow'], [38, 2, 'green'], [44, 1.6, 'pine'], [49, 2, 'green'],
  [1.4, 6, 'green'], [1.4, 12, 'willow'], [1.4, 18, 'pine'], [1.4, 26, 'green'], [1.4, 33, 'willow'],
  [50.6, 5, 'pine'], [50.6, 12, 'green'], [50.6, 19, 'willow'], [50.6, 33, 'pine'],
  [6, 36.6, 'green'], [12, 37, 'willow'], [24, 36.8, 'green'], [36, 37, 'pine'], [46, 36.6, 'willow'],
];

const ROCKS: Array<[number, number]> = [
  [3, 24.6], [22.5, 30.4], [29.5, 30.5], [49, 24.5], [31.8, 24.5],
];

function buildProps(): PropDef[] {
  const props: PropDef[] = [
    // 主要建筑
    P(innTex, 12, 12.4, R(9, 9, 15, 12)), // 同福客栈
    P(bankTex, 31, 12.4, R(30, 10, 33, 12)), // 钱庄
    P(yihonglouTex, 40, 10.4, R(38, 7, 42, 10)), // 怡红楼
    P(yamenTex, 46, 12.4, R(44, 10, 48, 12)), // 衙门
    // 民居
    P(() => houseTex(0), 21, 8.4, R(20, 6, 22, 8)),
    P(() => houseTex(1), 26, 6.4, R(25, 4, 27, 6)),
    P(() => houseTex(0), 35, 6.4, R(34, 4, 36, 6)),
    P(() => houseTex(1), 18, 22.4, R(17, 20, 19, 22)),
    P(() => houseTex(0), 27, 22.4, R(26, 20, 28, 22)),
    // 桥 / 船
    P(bridgeTex, 24.5, 28.6),
    P(boatTex, 8, Math.round(riverY(8)) + 0.25),
    P(boatTex, 43.5, Math.round(riverY(43.5)) + 0.25),
    // 客栈前院
    P(wellTex, 20, 19.6, R(20, 19, 20, 19)),
    P(tableTex, 9, 14.3, R(9, 14, 9, 14)),
    P(tableTex, 15.2, 14.3, R(15, 14, 15, 14)),
    // 市集摊位
    P(() => stallTex('#b04038', '#e8b030'), 38, 21.4, R(37, 21, 39, 21)),
    P(() => stallTex('#3f7a8a', '#d8e8e8'), 42, 20.8, R(41, 20, 42, 20)),
    P(() => stallTex('#7a4a8a', '#e8d0a0'), 46, 21.4, R(45, 21, 46, 21)),
    // 指路牌
    P(() => signpostTex('同福客栈'), 17.8, 15.7, R(17, 15, 17, 15)),
    P(() => signpostTex('十八里铺'), 34.6, 18.7, R(34, 18, 34, 18)),
    P(() => signpostTex('过河·田野'), 27, 24.5, R(27, 24, 27, 24)),
  ];
  // 河岸装饰：芦苇 / 莲叶 / 鸭（无碰撞，随河岸线分布）
  for (let gx = 4; gx <= 48; gx++) {
    if (gx >= 22 && gx <= 28) continue; // 桥区留空
    if ((gx * 7) % 5 === 0) props.push(P(() => reedTex(gx), gx + 0.3, Math.round(riverY(gx)) - 1.75));
    if ((gx * 11) % 7 === 0) props.push(P(() => reedTex(gx + 40), gx - 0.2, Math.round(riverY(gx)) + 1.85));
    if ((gx * 13) % 6 === 0) props.push(P(() => lotusTex(gx), gx + 0.5, Math.round(riverY(gx)) - 0.2));
    if ((gx * 17) % 9 === 0) props.push(P(() => duckTex(gx % 4), gx + 0.6, Math.round(riverY(gx)) + 0.3));
  }
  // 街灯
  for (const gx of [6, 16, 26, 36, 46]) props.push(P(lanternPostTex, gx, 18.6, R(gx, 18, gx, 18)));
  for (const gx of [11, 21, 31, 41]) props.push(P(lanternPostTex, gx, 15.4, R(gx, 15, gx, 15)));
  // 树 / 石
  for (const [gx, gy, kind] of TREES) {
    props.push(P(() => treeTex(kind), gx, gy, R(Math.round(gx), Math.round(gy), Math.round(gx), Math.round(gy))));
  }
  ROCKS.forEach(([gx, gy], i) => {
    props.push(P(() => rockTex(i + 1), gx, gy, R(Math.round(gx), Math.round(gy), Math.round(gx), Math.round(gy))));
  });
  // 灌木 / 花丛（撒在草地，无碰撞，确定性伪随机；避开路面与人群密集区）
  {
    const rnd = mulberry32(20260817);
    let bi = 0;
    let fi = 0;
    for (let i = 0; i < 40; i++) {
      const gx = 2 + rnd() * 47;
      const gy = 2 + rnd() * 34;
      if (groundKindAt(Math.floor(gx), Math.floor(gy)) !== 'grass') continue;
      if (gy >= 14 && gy <= 23 && gx >= 3 && gx <= 49) continue; // 大街/市集人流区
      if (rnd() > 0.45) props.push(P(() => bushTex(++bi), gx, gy));
      else props.push(P(() => flowerbedTex(++fi), gx, gy));
    }
  }
  // 田野稻草人 ×2
  props.push(P(scarecrowTex, 10, 33.4));
  props.push(P(scarecrowTex, 36, 33.4));
  // 田野围栏（北侧留门）
  props.push(...fencePlot(4, 31, 20, 35, [11, 12]));
  props.push(...fencePlot(30, 31, 46, 35, [37, 38]));
  return props;
}

export const PROPS: PropDef[] = buildProps();

/* ---------------- 出生点 ---------------- */

export const PLAYER_START = { gx: 12.5, gy: 13.6 };

export interface NpcSpawn {
  id: string;
  gx: number;
  gy: number;
  /** 游荡半径（格） */
  r: number;
  /** 移速（格/秒） */
  speed: number;
}
export const NPC_SPAWNS: NpcSpawn[] = [
  { id: 'moxb', gx: 14, gy: 13.4, r: 1.4, speed: 2.0 },
  { id: 'lidz', gx: 9.6, gy: 13.8, r: 1.2, speed: 1.8 },
  { id: 'lvc', gx: 10.4, gy: 15.2, r: 1.4, speed: 1.7 },
  { id: 'baizt', gx: 18.5, gy: 17.4, r: 2.6, speed: 2.2 },
  { id: 'xingbt', gx: 34, gy: 17.2, r: 7, speed: 2.4 },
  { id: 'guofr', gx: 40, gy: 20.6, r: 2.2, speed: 2.2 },
  { id: 'moody', gx: 24, gy: 16.6, r: 3, speed: 1.6 },
  { id: 'moody', gx: 44.5, gy: 17.6, r: 2.5, speed: 1.6 },
];

/* ---------------- 碰撞网格 ---------------- */

const solid = new Uint8Array(WORLD_COLS * WORLD_ROWS);

function markSolid(r: Rect, v: 0 | 1) {
  for (let gy = Math.max(0, r.y0); gy <= Math.min(WORLD_ROWS - 1, r.y1); gy++) {
    for (let gx = Math.max(0, r.x0); gx <= Math.min(WORLD_COLS - 1, r.x1); gx++) {
      solid[gy * WORLD_COLS + gx] = v;
    }
  }
}

// 河水（随蜿蜒河道逐格标记）
for (let gy = 0; gy < WORLD_ROWS; gy++)
  for (let gx = 0; gx < WORLD_COLS; gx++)
    if (groundKindAt(gx, gy) === 'water') markSolid(R(gx, gy, gx, gy), 1);
// 地图外圈
markSolid(R(0, 0, WORLD_COLS - 1, 0), 1);
markSolid(R(0, WORLD_ROWS - 1, WORLD_COLS - 1, WORLD_ROWS - 1), 1);
markSolid(R(0, 0, 0, WORLD_ROWS - 1), 1);
markSolid(R(WORLD_COLS - 1, 0, WORLD_COLS - 1, WORLD_ROWS - 1), 1);
// 建筑与陈设
for (const p of PROPS) if (p.cells) markSolid(p.cells, 1);
// 桥面放行
markSolid(BRIDGE, 0);

export function isSolidCell(gx: number, gy: number): boolean {
  return (
    gx < 0 || gy < 0 || gx >= WORLD_COLS || gy >= WORLD_ROWS ||
    solid[gy * WORLD_COLS + gx] === 1
  );
}

export function isSolidAt(x: number, y: number): boolean {
  return isSolidCell(Math.floor(x / TILE), Math.floor(y / TILE));
}
/* ---------------- 通用行走 ---------------- */

export interface Walker {
  x: number;
  y: number;
  dir: Dir;
  stuckT: number;
}

/** 朝目标走一步（分轴碰撞 + 卡墙计数），返回是否已到达 */
export function walkStep(a: Walker, tx: number, ty: number, speed: number, dt: number): boolean {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) return true;
  a.dir = dirFromVec(dx, dy, a.dir);
  const k = Math.min(speed * dt, d);
  const nx = a.x + (dx / d) * k;
  const ny = a.y + (dy / d) * k;
  const feet = 6;
  const px = a.x;
  const py = a.y;
  if (!isSolidAt(nx, a.y - feet)) a.x = nx;
  if (!isSolidAt(a.x, ny - feet)) a.y = ny;
  if (Math.hypot(a.x - px, a.y - py) < k * 0.4) a.stuckT += dt;
  else a.stuckT = 0;
  return false;
}