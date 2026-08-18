/** 角色 Q 版（二头身：头大身小）贴图：四向 × 三相位（站立/走A/走B），锚点=底边中心 */

import { makeTex, rr, ell, dot, fillStroke, blobShadow, shade, fnv } from './tex';
import type { Dir } from '../geom';

/** Q 版造型特征：按角色特性设计的发型 / 配饰 / 体型（未提供 = 普通村民） */
export interface CharFeat {
  hairStyle?:
    | 'default' // 普通束发（村民）
    | 'bun' // 高发髻 + 金步摇（佟湘玉）
    | 'doubleBun' // 双髻 + 发带（郭芙蓉）
    | 'ponytail' // 束发马尾（白展堂）
    | 'scholar' // 文士方巾（吕秀才）
    | 'band' // 布头巾（村民变体）
    | 'scarf' // 厨师缠头巾（李大嘴）
    | 'childBun' // 双丫髻红头绳（莫小贝）
    | 'constable' // 皂隶帽 + 络腮胡（邢捕头）
    | 'conical'; // 斗笠遮面（神秘客）
  /** 络腮胡 */
  beard?: boolean;
  /** 壮硕体型 */
  wide?: boolean;
  /** 小孩体型（绘制时整体缩小） */
  small?: boolean;
}

export interface CharColors {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  accent: string;
  feat?: CharFeat;
}

export type WalkFrame = 0 | 1 | 2; // 0 站立；1/2 行走相位

const CW = 48;
const CH = 64;
const CX = 24;
const OUT = '#241a12';
const SCARF_CLOTH = '#ece6d8';

/** Q 版整体缩放：小孩更娇小 */
export function charScale(c: CharColors): number {
  return c.feat?.small ? 0.84 : 1;
}

export function charTex(c: CharColors, dir: Dir, frame: WalkFrame) {
  const st = c.feat?.hairStyle ?? 'd';
  const fl = `${c.feat?.beard ? 1 : 0}${c.feat?.wide ? 1 : 0}${c.feat?.small ? 1 : 0}`;
  const key = `ch:${fnv(`${c.skin}|${c.hair}|${c.top}|${c.bottom}|${c.accent}|${st}|${fl}`)}:${dir}:${frame}`;
  return makeTex(key, CW, CH, (ctx) => {
    if (dir === 'right') {
      // 右向 = 左向镜像
      ctx.translate(CW, 0);
      ctx.scale(-1, 1);
    }
    blobShadow(ctx, CX, 60.5, 12.5, 4.2);
    legs(ctx, c, frame, dir === 'left' || dir === 'right');
    body(ctx, c, frame, dir === 'up', dir === 'left' || dir === 'right');
    head(ctx, c, dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'side', frame);
  });
}

/* ---------------- 腿（小短腿 + 布鞋） ---------------- */

function legs(ctx: CanvasRenderingContext2D, c: CharColors, f: WalkFrame, side: boolean) {
  const shoe = shade(c.bottom, -46);
  if (side) {
    const sw = f === 1 ? 3.5 : f === 2 ? -3.5 : 0;
    // 后腿
    rr(ctx, 21 - sw, 49.5, 6.5, 10, 3);
    fillStroke(ctx, shade(c.bottom, -26), OUT, 1.1);
    rr(ctx, 21 - sw, 56.5, 6.5, 3.2, 1.6);
    ctx.fillStyle = shade(shoe, -8);
    ctx.fill();
    // 前腿
    rr(ctx, 21 + sw, 49.5, 6.5, 10, 3);
    fillStroke(ctx, c.bottom, OUT, 1.2);
    rr(ctx, 21 + sw, 56.5, 6.5, 3.2, 1.6);
    ctx.fillStyle = shoe;
    ctx.fill();
  } else {
    const lift = f === 1 ? 2.2 : f === 2 ? -2.2 : 0;
    rr(ctx, 17.8, 49.5 - Math.max(0, lift), 6.8, 10, 3);
    fillStroke(ctx, c.bottom, OUT, 1.2);
    rr(ctx, 17.8, 56.5 - Math.max(0, lift), 6.8, 3.2, 1.6);
    ctx.fillStyle = shoe;
    ctx.fill();
    rr(ctx, 23.4, 49.5 - Math.max(0, -lift), 6.8, 10, 3);
    fillStroke(ctx, c.bottom, OUT, 1.2);
    rr(ctx, 23.4, 56.5 - Math.max(0, -lift), 6.8, 3.2, 1.6);
    ctx.fillStyle = shoe;
    ctx.fill();
  }
}

/* ---------------- 身体（迷你躯干 + 摆臂 + 腰带） ---------------- */

function body(ctx: CanvasRenderingContext2D, c: CharColors, f: WalkFrame, back: boolean, side: boolean) {
  const bw = c.feat?.wide ? 27 : 20;
  const bob = f === 1 ? -1 : f === 2 ? 0.5 : 0;
  const by = 34.5 + bob;
  const sw = f === 1 ? 2.2 : f === 2 ? -2.2 : 0;
  if (side) {
    // 单臂（可见侧，随步伐前后摆）
    ell(ctx, CX - 2 + sw, 43.5 + bob, 3, 5);
    fillStroke(ctx, shade(c.top, -16), OUT, 1.1);
    dot(ctx, CX - 2 + sw, 48.5 + bob, 2, c.skin);
    rr(ctx, CX - bw / 2, by, bw, 18.5, 8);
    fillStroke(ctx, c.top, OUT, 1.5);
  } else {
    // 双臂（与腿反相摆动）
    for (const s of [-1, 1]) {
      ell(ctx, CX + s * (bw / 2 + 2.2), 43.5 + bob - s * sw, 2.9, 4.6);
      fillStroke(ctx, shade(c.top, -16), OUT, 1.1);
      dot(ctx, CX + s * (bw / 2 + 2.2), 48 + bob - s * sw, 2, c.skin);
    }
    rr(ctx, CX - bw / 2, by, bw, 18.5, 8);
    fillStroke(ctx, c.top, OUT, 1.5);
    if (!back) {
      // 交领 V 字领口
      ctx.strokeStyle = shade(c.accent, 10);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(CX - 4.5, by + 1);
      ctx.lineTo(CX, by + 6);
      ctx.lineTo(CX + 4.5, by + 1);
      ctx.stroke();
    }
  }
  // 腰带
  ctx.fillStyle = shade(c.accent, -18);
  rr(ctx, CX - bw / 2 + 1.2, by + 12.5, bw - 2.4, 4, 2);
  ctx.fill();
}

/* ---------------- 头（大头占 2/3 身高） ---------------- */

function head(ctx: CanvasRenderingContext2D, c: CharColors, v: 'down' | 'up' | 'side', f: WalkFrame) {
  const hy = 22 + (f === 1 ? -1 : 0);
  const style = c.feat?.hairStyle;
  if (v === 'up') {
    // 后脑勺：满头头发 + 发型背影
    ell(ctx, CX, hy, 15, 14);
    fillStroke(ctx, c.hair, OUT, 1.6);
    hairBackExtras(ctx, c, style, hy);
    return;
  }
  // 马尾先画（垂在脑后/肩侧，被头压住）
  if (style === 'ponytail' && v === 'down') {
    ell(ctx, CX + 12.5, hy + 6, 3, 7.5);
    fillStroke(ctx, c.hair, OUT, 1.2);
    dot(ctx, CX + 12.2, hy - 0.5, 1.5, c.accent);
  }
  // 脸
  ell(ctx, CX, hy, 15, 14);
  fillStroke(ctx, c.skin, OUT, 1.6);
  if (v === 'down') {
    // 耳朵
    dot(ctx, CX - 14.6, hy + 2, 2.2, shade(c.skin, -12));
    dot(ctx, CX + 14.6, hy + 2, 2.2, shade(c.skin, -12));
  }
  hairFront(ctx, c, v, style, hy);
  face(ctx, c, v, hy);
}

/* ---------------- 发型（正面 / 侧面） ---------------- */

/** 发顶（覆盖上半圆） */
function hairCap(ctx: CanvasRenderingContext2D, c: CharColors, hy: number) {
  ctx.beginPath();
  ctx.arc(CX, hy + 1, 15.1, Math.PI, Math.PI * 2);
  ctx.closePath();
  fillStroke(ctx, c.hair, OUT, 1.4);
}

function hairFront(
  ctx: CanvasRenderingContext2D,
  c: CharColors,
  v: 'down' | 'side',
  style: string | undefined,
  hy: number,
) {
  if (v === 'side') {
    // 后半头头发
    ctx.beginPath();
    ctx.arc(CX, hy + 1, 15.1, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
    fillStroke(ctx, c.hair, OUT, 1.4);
    // 前额碎发
    ell(ctx, CX - 7.5, hy - 6.5, 4.6, 4.2);
    ctx.fillStyle = c.hair;
    ctx.fill();
    switch (style) {
      case 'bun':
        ell(ctx, CX - 11.5, hy - 13, 4.4, 4);
        fillStroke(ctx, c.hair, OUT, 1.3);
        dot(ctx, CX - 14, hy - 12.5, 1.4, c.accent);
        break;
      case 'doubleBun':
        ell(ctx, CX - 1, hy - 15.2, 4.3, 4.1);
        fillStroke(ctx, c.hair, OUT, 1.3);
        ell(ctx, CX - 13, hy - 7, 3.5, 3.3);
        fillStroke(ctx, c.hair, OUT, 1.2);
        break;
      case 'ponytail':
        ell(ctx, CX - 13, hy + 2, 3, 9);
        fillStroke(ctx, c.hair, OUT, 1.2);
        dot(ctx, CX - 12.6, hy - 4.5, 1.6, c.accent);
        break;
      case 'scholar':
        rr(ctx, 12.5, hy - 18, 23, 8, 2.5);
        fillStroke(ctx, '#161310', OUT, 1.3);
        break;
      case 'band':
        rr(ctx, 9.2, hy - 8.6, 29.6, 3.4, 1.7);
        fillStroke(ctx, c.accent, OUT, 1);
        break;
      case 'scarf':
        rr(ctx, 9.2, hy - 8.8, 29.6, 6.2, 3.1);
        fillStroke(ctx, SCARF_CLOTH, OUT, 1.3);
        ell(ctx, CX - 14.6, hy - 5.6, 2.6, 2.3);
        fillStroke(ctx, SCARF_CLOTH, OUT, 1.1);
        rr(ctx, CX - 18.5, hy - 4.4, 4, 7.5, 2);
        ctx.fillStyle = SCARF_CLOTH;
        ctx.fill();
        break;
      case 'childBun':
        ell(ctx, CX - 13.2, hy - 9.6, 3.2, 4.2);
        fillStroke(ctx, c.hair, OUT, 1.2);
        dot(ctx, CX - 13.2, hy - 12, 1.2, c.accent);
        break;
      case 'constable':
        rr(ctx, 9, hy - 9.5, 30, 3.2, 1.6);
        fillStroke(ctx, '#141210', OUT, 1.1);
        rr(ctx, 12, hy - 16.8, 21, 8, 3);
        fillStroke(ctx, '#1d1a16', OUT, 1.3);
        break;
      case 'conical':
        conicalHat(ctx, hy);
        break;
    }
    return;
  }
  // ---- 正面 ----
  switch (style) {
    case 'bun':
      hairCap(ctx, c, hy);
      // 中分刘海
      ell(ctx, CX - 5.2, hy - 6.2, 5.2, 4.4);
      ctx.fillStyle = c.hair;
      ctx.fill();
      ell(ctx, CX + 5.2, hy - 6.2, 5.2, 4.4);
      ctx.fill();
      rr(ctx, 9.2, hy - 6, 3.4, 9, 1.7);
      ctx.fill();
      rr(ctx, 35.4, hy - 6, 3.4, 9, 1.7);
      ctx.fill();
      // 高发髻 + 金步摇
      ell(ctx, CX, hy - 16.4, 5, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.4);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(CX - 5.5, hy - 17.2);
      ctx.lineTo(CX + 5.5, hy - 15.6);
      ctx.stroke();
      dot(ctx, CX + 7, hy - 15.8, 1.5, c.accent);
      break;
    case 'doubleBun':
      hairCap(ctx, c, hy);
      // 平刘海 + 发带 + 双髻
      rr(ctx, 9.8, hy - 9, 28.4, 5.6, 2.8);
      fillStroke(ctx, c.hair, OUT, 1.2);
      rr(ctx, 9.8, hy - 8.4, 28.4, 2.2, 1.1);
      ctx.fillStyle = c.accent;
      ctx.fill();
      ell(ctx, CX - 10.5, hy - 13.6, 4.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.3);
      ell(ctx, CX + 10.5, hy - 13.6, 4.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.3);
      dot(ctx, CX - 10.5, hy - 13.6, 1.4, c.accent);
      dot(ctx, CX + 10.5, hy - 13.6, 1.4, c.accent);
      break;
    case 'ponytail':
      hairCap(ctx, c, hy);
      // 后梳刘海 + 束发带
      ell(ctx, CX - 4.8, hy - 6.4, 5, 4.3);
      ctx.fillStyle = c.hair;
      ctx.fill();
      ell(ctx, CX + 4.6, hy - 5.8, 4.6, 4);
      ctx.fill();
      rr(ctx, 9.6, hy - 8.6, 28.8, 2.6, 1.3);
      fillStroke(ctx, c.accent, OUT, 1);
      break;
    case 'scholar':
      hairCap(ctx, c, hy);
      // 文士方巾
      rr(ctx, 12.5, hy - 18, 23, 8, 2.5);
      fillStroke(ctx, '#161310', OUT, 1.3);
      ctx.strokeStyle = shade(c.accent, -10);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(CX, hy - 17.5);
      ctx.lineTo(CX, hy - 10.5);
      ctx.stroke();
      rr(ctx, 9.4, hy - 6.5, 3.4, 8.5, 1.7);
      ctx.fillStyle = c.hair;
      ctx.fill();
      rr(ctx, 35.2, hy - 6.5, 3.4, 8.5, 1.7);
      ctx.fill();
      break;
    case 'band':
      hairCap(ctx, c, hy);
      defaultBangs(ctx, c, hy);
      rr(ctx, 9.5, hy - 7.5, 29, 3.2, 1.6);
      fillStroke(ctx, c.accent, OUT, 1);
      break;
    case 'scarf':
      hairCap(ctx, c, hy);
      // 厨师缠头巾（侧结）
      rr(ctx, 9.2, hy - 8.8, 29.6, 6.2, 3.1);
      fillStroke(ctx, SCARF_CLOTH, OUT, 1.3);
      ell(ctx, CX + 15.6, hy - 5.6, 2.6, 2.2);
      fillStroke(ctx, SCARF_CLOTH, OUT, 1.1);
      rr(ctx, CX + 16.5, hy - 4.6, 3.4, 7, 1.7);
      ctx.fillStyle = SCARF_CLOTH;
      ctx.fill();
      break;
    case 'childBun':
      hairCap(ctx, c, hy);
      // 碎刘海 + 双丫髻（红头绳）
      for (const dx of [-5.5, 0, 5.5]) {
        ell(ctx, CX + dx, hy - 6.8, 4, 3.6);
        ctx.fillStyle = c.hair;
        ctx.fill();
      }
      ell(ctx, CX - 12.6, hy - 11.4, 3.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.2);
      ell(ctx, CX + 12.6, hy - 11.4, 3.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.2);
      dot(ctx, CX - 12.6, hy - 11.4, 1.3, c.accent);
      dot(ctx, CX + 12.6, hy - 11.4, 1.3, c.accent);
      break;
    case 'constable':
      hairCap(ctx, c, hy);
      // 皂隶帽：帽檐 + 帽体 + 前额牌
      rr(ctx, 9, hy - 9.5, 30, 3.2, 1.6);
      fillStroke(ctx, '#141210', OUT, 1.1);
      rr(ctx, 13, hy - 16.8, 22, 8, 3);
      fillStroke(ctx, '#1d1a16', OUT, 1.3);
      rr(ctx, 19.5, hy - 10.6, 9, 2.4, 1.2);
      fillStroke(ctx, c.accent, OUT, 1);
      rr(ctx, 9.6, hy - 6, 3.4, 8, 1.7);
      ctx.fillStyle = c.hair;
      ctx.fill();
      rr(ctx, 35, hy - 6, 3.4, 8, 1.7);
      ctx.fill();
      break;
    case 'conical':
      conicalHat(ctx, hy);
      break;
    default:
      hairCap(ctx, c, hy);
      defaultBangs(ctx, c, hy);
      break;
  }
}

/** 普通刘海三瓣 + 鬓发 */
function defaultBangs(ctx: CanvasRenderingContext2D, c: CharColors, hy: number) {
  for (const dx of [-6.5, 0, 6.5]) {
    ell(ctx, CX + dx, hy - 6.5, 4.4, 4);
    ctx.fillStyle = c.hair;
    ctx.fill();
  }
  rr(ctx, 8.8, hy - 7, 3.8, 10, 1.9);
  ctx.fillStyle = c.hair;
  ctx.fill();
  rr(ctx, 35.4, hy - 7, 3.8, 10, 1.9);
  ctx.fill();
}

/** 斗笠（遮眉眼） */
function conicalHat(ctx: CanvasRenderingContext2D, hy: number) {
  ctx.beginPath();
  ctx.moveTo(CX, hy - 20);
  ctx.lineTo(CX + 16.5, hy - 4);
  ctx.lineTo(CX - 16.5, hy - 4);
  ctx.closePath();
  fillStroke(ctx, '#8a6a3a', OUT, 1.5);
  ctx.strokeStyle = shade('#8a6a3a', -28);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(CX - 10, hy - 13);
  ctx.lineTo(CX + 10, hy - 13);
  ctx.moveTo(CX - 13.5, hy - 8.5);
  ctx.lineTo(CX + 13.5, hy - 8.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,12,6,0.28)';
  ctx.fillRect(CX - 16.5, hy - 4, 33, 3);
}

/* ---------------- 背影发型 ---------------- */

function hairBackExtras(
  ctx: CanvasRenderingContext2D,
  c: CharColors,
  style: string | undefined,
  hy: number,
) {
  switch (style) {
    case 'bun':
      ell(ctx, CX, hy - 16.6, 5, 4.4);
      fillStroke(ctx, shade(c.hair, 8), OUT, 1.4);
      dot(ctx, CX + 5.6, hy - 15.8, 1.5, c.accent);
      break;
    case 'doubleBun':
      ell(ctx, CX - 10.5, hy - 13.6, 4.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.3);
      ell(ctx, CX + 10.5, hy - 13.6, 4.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.3);
      break;
    case 'ponytail':
      ell(ctx, CX, hy + 8, 3.2, 9.5);
      fillStroke(ctx, c.hair, OUT, 1.2);
      dot(ctx, CX, hy + 0.5, 1.7, c.accent);
      break;
    case 'scholar':
      rr(ctx, 12.5, hy - 18, 23, 8, 2.5);
      fillStroke(ctx, '#161310', OUT, 1.3);
      break;
    case 'band':
      rr(ctx, 9.2, hy - 8.6, 29.6, 3.4, 1.7);
      fillStroke(ctx, c.accent, OUT, 1);
      break;
    case 'scarf':
      rr(ctx, 9.2, hy - 8.8, 29.6, 6.2, 3.1);
      fillStroke(ctx, SCARF_CLOTH, OUT, 1.3);
      ell(ctx, CX, hy - 5.4, 3, 2.5);
      fillStroke(ctx, SCARF_CLOTH, OUT, 1.1);
      rr(ctx, CX - 2.4, hy - 4, 4.8, 7, 2);
      ctx.fillStyle = SCARF_CLOTH;
      ctx.fill();
      break;
    case 'childBun':
      ell(ctx, CX - 12.6, hy - 11.4, 3.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.2);
      ell(ctx, CX + 12.6, hy - 11.4, 3.4, 4.2);
      fillStroke(ctx, c.hair, OUT, 1.2);
      break;
    case 'constable':
      rr(ctx, 13, hy - 16.8, 22, 8, 3);
      fillStroke(ctx, '#1d1a16', OUT, 1.3);
      rr(ctx, 9, hy - 9.5, 30, 3.2, 1.6);
      fillStroke(ctx, '#141210', OUT, 1.1);
      break;
    case 'conical':
      conicalHat(ctx, hy);
      break;
    default:
      // 小发髻
      ell(ctx, CX, hy - 14.5, 3.2, 3);
      fillStroke(ctx, shade(c.hair, 14), OUT, 1.2);
      dot(ctx, CX, hy - 17.2, 1.2, c.accent);
      break;
  }
}

/* ---------------- 五官（Q 版大眼） ---------------- */

function qEye(ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  ell(ctx, x, y, 2.2 * s, 2.7 * s);
  ctx.fillStyle = '#1a120c';
  ctx.fill();
  dot(ctx, x + 0.7 * s, y - 1 * s, 0.75 * s, '#ffffff');
}

function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2.6) {
  dot(ctx, x, y, r, 'rgba(230,120,110,0.33)');
}

function mouth(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#8a4a3a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

function face(ctx: CanvasRenderingContext2D, c: CharColors, v: 'down' | 'side', hy: number) {
  const hidden = c.feat?.hairStyle === 'conical'; // 斗笠遮眼，只露嘴
  if (v === 'down') {
    if (!hidden) {
      qEye(ctx, 18.5, hy + 2.5);
      qEye(ctx, 29.5, hy + 2.5);
      blush(ctx, 15.8, hy + 6.5);
      blush(ctx, 32.2, hy + 6.5);
    }
    if (c.feat?.beard) beardFront(ctx, c, hy);
    mouth(ctx, CX, hy + (c.feat?.beard ? 5.8 : 6.6));
  } else {
    // 侧面（朝左）
    if (!hidden) qEye(ctx, 17.5, hy + 2.5, 0.9);
    if (c.feat?.beard) beardSide(ctx, c, hy);
    dot(ctx, 9.8, hy + 3.5, 1.3, shade(c.skin, -14)); // 鼻尖
    ctx.strokeStyle = '#8a4a3a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(14.2, hy + 4.6, 2.1, Math.PI * 0.15, Math.PI * 0.95);
    ctx.stroke();
    if (!hidden) blush(ctx, 17, hy + 6.8, 2.2);
  }
}

/** 络腮胡（正面）：鬓角连鬓 + 下巴胡 + 八字须 */
function beardFront(ctx: CanvasRenderingContext2D, c: CharColors, hy: number) {
  for (const s of [-1, 1]) {
    rr(ctx, CX + s * 14.8 - 2.6, hy + 2, 5.2, 9, 2.6);
    fillStroke(ctx, c.hair, OUT, 1);
  }
  ell(ctx, CX, hy + 11.5, 9.5, 4.6);
  fillStroke(ctx, c.hair, OUT, 1);
  ctx.strokeStyle = c.hair;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(CX - 1.5, hy + 4.4);
  ctx.lineTo(CX - 5, hy + 5.8);
  ctx.moveTo(CX + 1.5, hy + 4.4);
  ctx.lineTo(CX + 5, hy + 5.8);
  ctx.stroke();
}

/** 络腮胡（侧面） */
function beardSide(ctx: CanvasRenderingContext2D, c: CharColors, hy: number) {
  rr(ctx, 9.6, hy + 1, 4.6, 10, 2.3);
  fillStroke(ctx, c.hair, OUT, 1);
  ell(ctx, 13.5, hy + 8.5, 6, 4.2);
  fillStroke(ctx, c.hair, OUT, 1);
}