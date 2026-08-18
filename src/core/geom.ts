/**
 * 世界网格数学：正交俯视网格（2.5D 表现由美术层伪透视完成）。
 * 大地图一镜到底：无场景切换，区域（客栈/后街/十八里铺…）只是地图上的功能分区。
 */

export const TILE = 64; // 逻辑格子像素
export const WORLD_COLS = 52; // 世界宽 52 格
export const WORLD_ROWS = 38; // 世界高 38 格
export const WORLD_W = WORLD_COLS * TILE;
export const WORLD_H = WORLD_ROWS * TILE;

export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}
export function easeOutBack(t: number) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
export function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}
export function fmtNum(n: number): string {
  return n.toLocaleString('zh-CN');
}

/** 确定性随机 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Dir = 'down' | 'up' | 'left' | 'right';

/** 由移动向量取主方向（四向） */
export function dirFromVec(dx: number, dy: number, fallback: Dir = 'down'): Dir {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** 世界格坐标 */
export interface GPos {
  gx: number;
  gy: number;
}
export function gToWorld(gx: number, gy: number) {
  return { x: (gx + 0.5) * TILE, y: (gy + 0.5) * TILE };
}
export function worldToG(x: number, y: number): GPos {
  return { gx: Math.floor(x / TILE), gy: Math.floor(y / TILE) };
}
export function inWorld(x: number, y: number) {
  return x >= TILE * 0.6 && x <= WORLD_W - TILE * 0.6 && y >= TILE * 0.6 && y <= WORLD_H - TILE * 0.6;
}

/** 矩形区域（格坐标，含端点） */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export function rectCenter(r: Rect) {
  return gToWorld((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
}
export function inRect(r: Rect, gx: number, gy: number) {
  return gx >= r.x0 && gx <= r.x1 && gy >= r.y0 && gy <= r.y1;
}
