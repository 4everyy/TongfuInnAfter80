/**
 * 美术层基元：纹理缓存 / 通用绘制 / 颜色与形状工具。
 *
 * 风格约定（正交俯视 2.5D）：
 * - 地面为正交方形网格（TILE=64），物体用"伪透视"表达体积：
 *   顶面压缩 + 立面 + 底部投影（blobShadow）。
 * - Q 版卡通平涂 + 深色描边，不用渐变（兼容低端 Canvas 与微信小游戏）。
 * - 全部贴图程序化生成：离屏 Canvas，运行时零外部资源。
 */

export type Draw = (ctx: CanvasRenderingContext2D) => void;

const cache = new Map<string, HTMLCanvasElement>();

/** 生成（或取缓存）一张离屏贴图，key 必须唯一对应一组绘制参数 */
export function makeTex(key: string, w: number, h: number, draw: Draw): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  draw(c.getContext('2d')!);
  cache.set(key, c);
  return c;
}

/** 清空贴图缓存（换肤 / 重开一局时用） */
export function clearTexCache() {
  cache.clear();
}

/** 以 (x, y) 为底边中心绘制贴图 —— 物体"立"在该锚点上 */
export function drawTex(
  ctx: CanvasRenderingContext2D,
  tex: HTMLCanvasElement,
  x: number,
  y: number,
  scale = 1,
  alpha = 1,
) {
  if (alpha <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha * prev;
  const w = tex.width * scale;
  const h = tex.height * scale;
  ctx.drawImage(tex, x - w / 2, y - h, w, h);
  ctx.globalAlpha = prev;
}

/* ---------------- 颜色工具 ---------------- */

function clamp8(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** hex 颜色加亮/加暗（amt: -255..255），用于手绘阴影与高光 */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp8((n >> 16) + amt);
  const g = clamp8(((n >> 8) & 0xff) + amt);
  const b = clamp8((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 字符串 → 32 位种子（FNV-1a），让程序化贴图跨运行确定性一致 */
export function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ---------------- 形状工具 ---------------- */

/** 圆角矩形路径（quadratic 圆角，兼容性最好） */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** 椭圆路径 */
export function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** 实心圆点 */
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ell(ctx, x, y, r, r);
  ctx.fillStyle = color;
  ctx.fill();
}

/** 对当前路径填充（可选描边） */
export function fillStroke(
  ctx: CanvasRenderingContext2D,
  fill: string,
  line?: string,
  lw = 1.5,
) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** 物体底部的接地投影（椭圆软阴影） */
export function blobShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, k = 1) {
  ell(ctx, cx, cy, rx, ry);
  ctx.fillStyle = `rgba(24,18,8,${0.22 * k})`;
  ctx.fill();
}
