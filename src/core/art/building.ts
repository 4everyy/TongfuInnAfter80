/** 建筑与陈设程序化贴图：Q 版中式 2.5D 伪透视（顶面压缩 + 立面 + 接地投影） */

import { makeTex, rr, ell, dot, fillStroke, blobShadow, shade } from './tex';
import { TILE, clamp, lerp, mulberry32 } from '../geom';

const OUT = '#241a12';
const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';

/* ================= 地面 ================= */

export type GroundKind = 'grass' | 'dirt' | 'stone' | 'water' | 'plank' | 'field';

interface GroundSpec {
  base: string;
  line: string;
  dots: [string, string];
}
const GROUND: Record<GroundKind, GroundSpec> = {
  grass: { base: '#7ba258', line: '#5f8a40', dots: ['#6a9148', '#8ab466'] },
  dirt: { base: '#b28b5e', line: '#9a744c', dots: ['#a5815a', '#8f6a44'] },
  stone: { base: '#9c968c', line: '#878176', dots: ['#8f897f', '#a9a39a'] },
  water: { base: '#5d94be', line: '#8fb8d8', dots: ['#7fb0d4', '#a8d0e8'] },
  plank: { base: '#a87e50', line: '#8f6840', dots: ['#966e44', '#b58a5a'] },
  field: { base: '#96703f', line: '#7d5c34', dots: ['#7d5c34', '#a8834e'] },
};

/** 四邻地面类型（用于边缘过渡绘制） */
interface NB {
  u: GroundKind;
  d: GroundKind;
  l: GroundKind;
  r: GroundKind;
}

/** 画单格地面（供分块地面贴图内部使用；nb 供边缘过渡，deep 供河床深浅） */
function paintTile(
  ctx: CanvasRenderingContext2D,
  kind: GroundKind,
  x: number,
  y: number,
  rnd: () => number,
  nb: NB,
  deep: boolean,
) {
  const g = GROUND[kind];
  ctx.fillStyle = g.base;
  ctx.fillRect(x, y, TILE, TILE);

  if (kind === 'stone') {
    // 2×2 错缝石板（跨格连续）
    ctx.strokeStyle = g.line;
    ctx.lineWidth = 2;
    for (let r = 0; r < 2; r++) {
      const yy = y + r * 32;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + TILE, yy);
      ctx.stroke();
      const off = r % 2 ? 32 : 0;
      for (let c = 0; c < 2; c++) {
        const xx = x + off + c * 64;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + 32);
        ctx.stroke();
      }
    }
  } else if (kind === 'plank') {
    // 横木板 + 排钉
    ctx.strokeStyle = g.line;
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * 16);
      ctx.lineTo(x + TILE, y + i * 16);
      ctx.stroke();
    }
    ctx.fillStyle = shade(g.line, -26);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 6, y + i * 16 + 6, 3, 3);
      ctx.fillRect(x + TILE - 9, y + i * 16 + 6, 3, 3);
    }
  } else if (kind === 'field') {
    // 横垄 + 作物
    ctx.strokeStyle = g.line;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const yy = y + i * 16 + 8;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + TILE, yy);
      ctx.stroke();
      for (let c = 0; c < 3; c++) {
        const px = x + 10 + c * 22 + rnd() * 6;
        ctx.fillStyle = rnd() > 0.35 ? '#5f8f3f' : '#c9a44a';
        ctx.beginPath();
        ctx.arc(px, yy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'water') {
    // 波光
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const wx = x + 8 + rnd() * 40;
      const wy = y + 12 + rnd() * 40;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 8, wy - 4, wx + 16, wy);
      ctx.stroke();
    }
  } else if (kind === 'grass') {
    // 深浅斑块 + 草簇
    for (let i = 0; i < 3; i++) {
      ell(ctx, x + rnd() * TILE, y + rnd() * TILE, 9 + rnd() * 9, 6 + rnd() * 6);
      ctx.fillStyle = g.dots[rnd() > 0.5 ? 0 : 1];
      ctx.fill();
    }
    ctx.strokeStyle = g.line;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const px = x + 8 + rnd() * 48;
      const py = y + 10 + rnd() * 48;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 3, py - 6);
      ctx.moveTo(px, py);
      ctx.lineTo(px + 3, py - 6);
      ctx.stroke();
    }
    if (rnd() > 0.8) {
      // 小野花点缀
      dot(ctx, x + 12 + rnd() * 40, y + 12 + rnd() * 40, 2, rnd() > 0.5 ? '#f0ead0' : '#e8b8c8');
    }
  } else {
    // dirt：石子 + 裂纹
    for (let i = 0; i < 5; i++) {
      dot(ctx, x + rnd() * TILE, y + rnd() * TILE, 2 + rnd() * 2.5, g.dots[rnd() > 0.5 ? 0 : 1]);
    }
    ctx.strokeStyle = g.line;
    ctx.lineWidth = 1.6;
    const cx = x + 16 + rnd() * 32;
    const cy = y + 16 + rnd() * 32;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 14, cy - 2);
    ctx.stroke();
  }
  // 深水区压暗（模拟河床深度）
  if (kind === 'water' && deep) {
    ctx.fillStyle = 'rgba(34,70,100,0.28)';
    ctx.fillRect(x, y, TILE, TILE);
  }
  // 邻接过渡：河岸沙滩/浪沫、岸边湿土、植被爬边
  const bankEdge = (side: 'u' | 'd' | 'l' | 'r', other: GroundKind) => {
    if (other === kind) return;
    const arch =
      (kind === 'plank' && other === 'stone') || (kind === 'stone' && other === 'plank');
    if (kind === 'water' && other !== 'stone') {
      // 沙滩缓坡 + 浪沫虚线
      const S = 12;
      const g =
        side === 'u'
          ? ctx.createLinearGradient(0, y, 0, y + S)
          : side === 'd'
            ? ctx.createLinearGradient(0, y + TILE, 0, y + TILE - S)
            : side === 'l'
              ? ctx.createLinearGradient(x, 0, x + S, 0)
              : ctx.createLinearGradient(x + TILE, 0, x + TILE - S, 0);
      g.addColorStop(0, 'rgba(206,188,142,0.95)');
      g.addColorStop(1, 'rgba(206,188,142,0)');
      ctx.fillStyle = g;
      if (side === 'u') ctx.fillRect(x, y, TILE, S);
      else if (side === 'd') ctx.fillRect(x, y + TILE - S, TILE, S);
      else if (side === 'l') ctx.fillRect(x, y, S, TILE);
      else ctx.fillRect(x + TILE - S, y, S, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      if (side === 'u') {
        ctx.moveTo(x + 2, y + S - 4);
        ctx.lineTo(x + TILE - 2, y + S - 4);
      } else if (side === 'd') {
        ctx.moveTo(x + 2, y + TILE - S + 4);
        ctx.lineTo(x + TILE - 2, y + TILE - S + 4);
      } else if (side === 'l') {
        ctx.moveTo(x + S - 4, y + 2);
        ctx.lineTo(x + S - 4, y + TILE - 2);
      } else {
        ctx.moveTo(x + TILE - S + 4, y + 2);
        ctx.lineTo(x + TILE - S + 4, y + TILE - 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (kind === 'water') {
      // 桥基阴影边
      ctx.fillStyle = 'rgba(28,50,72,0.35)';
      if (side === 'u') ctx.fillRect(x, y, TILE, 6);
      else if (side === 'd') ctx.fillRect(x, y + TILE - 6, TILE, 6);
      else if (side === 'l') ctx.fillRect(x, y, 6, TILE);
      else ctx.fillRect(x + TILE - 6, y, 6, TILE);
    } else if (other === 'water') {
      // 岸线湿土
      ctx.fillStyle = 'rgba(32,52,70,0.28)';
      if (side === 'u') ctx.fillRect(x, y, TILE, 7);
      else if (side === 'd') ctx.fillRect(x, y + TILE - 7, TILE, 7);
      else if (side === 'l') ctx.fillRect(x, y, 7, TILE);
      else ctx.fillRect(x + TILE - 7, y, 7, TILE);
    } else if (!arch) {
      // 植被/碎石互相侵入边缘（自然咬合）
      ctx.fillStyle = GROUND[other].dots[rnd() > 0.5 ? 0 : 1];
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const r = 2.5 + rnd() * 3.5;
        let bx = x + 10 + rnd() * (TILE - 20);
        let by = y + 10 + rnd() * (TILE - 20);
        if (side === 'u') by = y + rnd() * 10;
        else if (side === 'd') by = y + TILE - rnd() * 10;
        else if (side === 'l') bx = x + rnd() * 10;
        else if (side === 'r') bx = x + TILE - rnd() * 10;
        ell(ctx, bx, by, r + 2, r);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
  bankEdge('u', nb.u);
  bankEdge('d', nb.d);
  bankEdge('l', nb.l);
  bankEdge('r', nb.r);
}

export const GROUND_CHUNK = 8; // 每块 8×8 格（512px）

/** 地面分块贴图：块内逐格按 kindAt 取地面类型绘制 */
export function groundChunkTex(
  cx: number,
  cy: number,
  kindAt: (gx: number, gy: number) => GroundKind,
) {
  const size = GROUND_CHUNK * TILE;
  return makeTex(`gc2:${cx}:${cy}`, size, size, (ctx) => {
    const rnd = mulberry32(((cx * 73856093) ^ (cy * 19349663)) >>> 0);
    let grassy = false;
    for (let iy = 0; iy < GROUND_CHUNK; iy++) {
      for (let ix = 0; ix < GROUND_CHUNK; ix++) {
        const gx = cx * GROUND_CHUNK + ix;
        const gy = cy * GROUND_CHUNK + iy;
        const kind = kindAt(gx, gy);
        if (kind === 'grass') grassy = true;
        const nb: NB = {
          u: kindAt(gx, gy - 1),
          d: kindAt(gx, gy + 1),
          l: kindAt(gx - 1, gy),
          r: kindAt(gx + 1, gy),
        };
        const deep =
          kind === 'water' &&
          nb.u === 'water' && nb.d === 'water' && nb.l === 'water' && nb.r === 'water';
        const x = ix * TILE;
        const y = iy * TILE;
        paintTile(ctx, kind, x, y, rnd, nb, deep);
        // 大街车辙 / 广场磨损
        if (kind === 'stone' && nb.u === 'stone' && nb.d === 'stone' && nb.l === 'stone' && nb.r === 'stone') {
          if (gy >= 16 && gy <= 18) {
            ctx.save();
            ctx.strokeStyle = 'rgba(66,54,40,0.16)';
            ctx.lineWidth = 4;
            ctx.setLineDash([16, 10]);
            for (const yy of [y + 20, y + 46]) {
              ctx.beginPath();
              ctx.moveTo(x, yy);
              ctx.lineTo(x + TILE, yy);
              ctx.stroke();
            }
            ctx.restore();
          } else if (rnd() > 0.55) {
            ctx.fillStyle = 'rgba(50,42,32,0.07)';
            ell(ctx, x + 12 + rnd() * 40, y + 12 + rnd() * 40, 8 + rnd() * 8, 5 + rnd() * 5);
            ctx.fill();
          }
        }
      }
    }
    // 大尺度草色斑驳（远景自然色差）
    if (grassy) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(104,144,74,0.06)' : 'rgba(152,182,112,0.06)';
        ell(ctx, rnd() * size, rnd() * size, 130 + rnd() * 90, 90 + rnd() * 60);
        ctx.fill();
      }
    }
  });
}

/* ================= 建筑 ================= */

export interface BuildingSkin {
  key: string;
  w: number;
  h: number;
  body: string;
  trim: string;
  roof: string;
  ridge: string;
  sign?: string;
  twoFloors?: boolean;
  lanterns?: boolean;
  /** 门前挑幌（如"酒"字幌子） */
  banner?: string;
}

export function buildingTex(s: BuildingSkin) {
  return makeTex(`b:${s.key}`, s.w, s.h, (ctx) => {
    const { w, h } = s;
    blobShadow(ctx, w / 2, h - 3, w * 0.46, 10);

    const roofB = Math.round(h * 0.34);
    const f1Top = s.twoFloors ? Math.round(h * 0.56) : roofB;
    const wallBot = h - 12;

    // 台基
    rr(ctx, w * 0.04, wallBot, w * 0.92, 12, 3);
    fillStroke(ctx, '#8d867a', OUT, 1.5);

    drawWall(ctx, s, roofB, f1Top, wallBot);
    drawRoof(ctx, s, roofB);
    if (s.sign) {
      drawSign(ctx, s, s.twoFloors ? (f1Top + roofB) / 2 + 4 : roofB + 24);
    }
    if (s.lanterns) {
      drawLantern(ctx, w * 0.14, roofB + 6);
      drawLantern(ctx, w * 0.86, roofB + 6);
    }
    if (s.banner) {
      // 挑杆 + 随风微摆的幌布
      const bx = s.w - 34;
      const by = roofB + 8;
      ctx.strokeStyle = '#6a4a2c';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by + 36);
      ctx.lineTo(bx + 28, by + 22);
      ctx.stroke();
      const fx = bx + 12;
      const fy = by + 22;
      const fw = 24;
      const fh = 54;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + fw, fy);
      ctx.quadraticCurveTo(fx + fw + 8, fy + fh * 0.45, fx + fw - 3, fy + fh);
      ctx.lineTo(fx + 3, fy + fh);
      ctx.quadraticCurveTo(fx - 5, fy + fh * 0.55, fx, fy);
      ctx.closePath();
      fillStroke(ctx, '#e8c860', OUT, 1.5);
      ctx.fillStyle = '#8a2222';
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.banner, fx + fw / 2 + 2, fy + fh / 2);
    }
  });
}

function wallRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
) {
  if (h <= 0) return;
  rr(ctx, x, y, w, h, 4);
  fillStroke(ctx, body, OUT, 1.6);
}

function drawWin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // 支摘窗：上糊纸透光 + 下木板 + 十字棂
  rr(ctx, x, y, 26, 30, 4);
  fillStroke(ctx, '#6a4a2c', OUT, 1.4);
  ctx.fillStyle = '#ecd6a4';
  ctx.fillRect(x + 3, y + 3, 20, 15);
  ctx.strokeStyle = '#8a6642';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 3);
  ctx.lineTo(x + 13, y + 18);
  ctx.moveTo(x + 3, y + 10);
  ctx.lineTo(x + 23, y + 10);
  ctx.stroke();
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(x + 3, y + 20, 20, 7);
  ctx.strokeStyle = shade('#7a5a34', -22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 23.5);
  ctx.lineTo(x + 23, y + 23.5);
  ctx.stroke();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  s: BuildingSkin,
  top: number,
  f1Top: number,
  bot: number,
) {
  const { w } = s;
  // 二层
  if (s.twoFloors) {
    wallRect(ctx, w * 0.05, top, w * 0.9, f1Top - top, shade(s.body, 6));
    drawWin(ctx, w * 0.2, top + (f1Top - top) * 0.18);
    drawWin(ctx, w * 0.66, top + (f1Top - top) * 0.18);
    // 层间腰线 + 栏杆
    ctx.fillStyle = shade(s.trim, -10);
    rr(ctx, w * 0.05, f1Top - 8, w * 0.9, 8, 3);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i <= 6; i++) {
      const px = lerp(w * 0.08, w * 0.9, i / 6);
      ctx.beginPath();
      ctx.moveTo(px, f1Top - 16);
      ctx.lineTo(px, f1Top - 8);
      ctx.stroke();
    }
  }
  // 一层
  wallRect(ctx, w * 0.03, f1Top, w * 0.94, bot - f1Top, s.body);
  // 墙面木板横缝（增加体量感）
  ctx.strokeStyle = shade(s.body, -16);
  ctx.lineWidth = 1.2;
  const rows = Math.max(2, Math.floor((bot - f1Top) / 26));
  for (let i = 1; i <= rows; i++) {
    const yy = f1Top + ((bot - f1Top) * i) / (rows + 1);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, yy);
    ctx.lineTo(w * 0.95, yy);
    ctx.stroke();
  }
  // 柱（四柱夹门）
  for (const cx of [w * 0.055, w * 0.5 - 17, w * 0.5 + 7, w * 0.945 - 10]) {
    rr(ctx, cx, f1Top + 4, 10, bot - f1Top - 10, 3);
    fillStroke(ctx, shade(s.trim, -8), OUT, 1.4);
  }
  // 门（中央双开 + 门环）
  const dw = w * 0.2;
  const dh = Math.min(74, (bot - f1Top) * 0.74);
  const dx = w / 2 - dw / 2;
  const dy = bot - dh;
  rr(ctx, dx, dy, dw, dh, 4);
  fillStroke(ctx, shade(s.trim, -28), OUT, 1.5);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(w / 2, dy + 3);
  ctx.lineTo(w / 2, bot - 1);
  ctx.stroke();
  dot(ctx, w / 2 - 8, dy + dh * 0.42, 2.4, '#e8c060');
  dot(ctx, w / 2 + 8, dy + dh * 0.42, 2.4, '#e8c060');
  // 一层侧窗
  const wy = f1Top + (bot - f1Top) * 0.18;
  drawWin(ctx, w * 0.12, wy);
  drawWin(ctx, w * 0.76, wy);
}

function drawRoof(ctx: CanvasRenderingContext2D, s: BuildingSkin, roofB: number) {
  const { w } = s;
  const midY = roofB * 0.52;
  // 顶面（俯视压缩梯形）+ 放射瓦垄
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 10);
  ctx.lineTo(w * 0.78, 10);
  ctx.lineTo(w * 0.96, midY);
  ctx.lineTo(w * 0.04, midY);
  ctx.closePath();
  fillStroke(ctx, shade(s.roof, 14), OUT, 1.6);
  ctx.strokeStyle = shade(s.roof, -14);
  ctx.lineWidth = 2;
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(lerp(w * 0.22, w * 0.04, t), lerp(10, midY, t));
    ctx.lineTo(lerp(w * 0.78, w * 0.96, t), lerp(10, midY, t));
    ctx.stroke();
  }
  // 前檐立面
  rr(ctx, w * 0.02, midY, w * 0.96, roofB - midY - 6, 3);
  fillStroke(ctx, s.roof, OUT, 1.6);
  ctx.strokeStyle = shade(s.roof, -28);
  ctx.lineWidth = 2;
  for (let x = w * 0.1; x < w * 0.92; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, midY + 3);
    ctx.lineTo(x, roofB - 12);
    ctx.stroke();
  }
  // 檐口瓦当
  ctx.fillStyle = s.ridge;
  rr(ctx, w * 0.02, roofB - 9, w * 0.96, 9, 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 正脊 + 翘角
  ctx.fillStyle = shade(s.ridge, 12);
  rr(ctx, w * 0.19, 2, w * 0.62, 9, 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const sx of [w * 0.16, w * 0.8]) {
    ctx.beginPath();
    ctx.moveTo(sx, 10);
    ctx.lineTo(sx + 10, 4);
    ctx.lineTo(sx + 12, 12);
    ctx.closePath();
    fillStroke(ctx, shade(s.ridge, 20), OUT, 1.3);
  }
}

function drawSign(ctx: CanvasRenderingContext2D, s: BuildingSkin, y: number) {
  const text = s.sign!;
  const fpx = clamp(Math.round(s.w / 15), 15, 24);
  ctx.font = `bold ${fpx}px ${FONT}`;
  const tw = ctx.measureText(text).width + 26;
  const x = s.w / 2 - tw / 2;
  rr(ctx, x, y - fpx * 0.75, tw, fpx * 1.5, 5);
  fillStroke(ctx, '#7a2222', '#e8c060', 2);
  ctx.fillStyle = '#f5d580';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, s.w / 2, y + 2);
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 1);
  ctx.stroke();
  dot(ctx, x, y + 1, 2.6, '#e8c060');
  ell(ctx, x, y + 11, 8.5, 10);
  fillStroke(ctx, '#d03a2c', OUT, 1.4);
  ctx.strokeStyle = 'rgba(120,20,10,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 4, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  ctx.moveTo(x, y + 21);
  ctx.lineTo(x, y + 26);
  ctx.stroke();
  dot(ctx, x, y + 28, 2.4, '#e8c060');
}

/* ---------- 建筑预置 ---------- */

export function innTex() {
  return buildingTex({
    key: 'inn',
    w: 368,
    h: 250,
    body: '#caa26b',
    trim: '#8a5a2e',
    roof: '#8a4030',
    ridge: '#5f2a20',
    sign: '同福客栈',
    twoFloors: true,
    lanterns: true,
    banner: '酒',
  });
}

const HOUSE_SKINS = [
  { body: '#d8c8a8', trim: '#7a5a34', roof: '#6a6f78', ridge: '#4a4f58' },
  { body: '#cfb090', trim: '#6a4a2c', roof: '#7a5850', ridge: '#5a3c36' },
];

export function houseTex(v: number) {
  const sk = HOUSE_SKINS[v % HOUSE_SKINS.length];
  return buildingTex({
    key: `house${v}`,
    w: 170,
    h: 150,
    ...sk,
  });
}

export function yihonglouTex() {
  return buildingTex({
    key: 'yihonglou',
    w: 300,
    h: 230,
    body: '#b87878',
    trim: '#7a2830',
    roof: '#5a2430',
    ridge: '#401820',
    sign: '怡红楼',
    twoFloors: true,
    lanterns: true,
  });
}

export function bankTex() {
  return buildingTex({
    key: 'bank',
    w: 220,
    h: 165,
    body: '#c8b088',
    trim: '#5a4a30',
    roof: '#3f5a68',
    ridge: '#2c4050',
    sign: '钱庄',
  });
}

export function yamenTex() {
  return buildingTex({
    key: 'yamen',
    w: 240,
    h: 175,
    body: '#b8a888',
    trim: '#4a4038',
    roof: '#4a5058',
    ridge: '#343a40',
    sign: '衙门',
    lanterns: true,
  });
}

/* ================= 陈设 ================= */

export type TreeKind = 'green' | 'willow' | 'autumn' | 'pine';

export function treeTex(kind: TreeKind) {
  return makeTex(`tree2:${kind}`, 104, 132, (ctx) => {
    blobShadow(ctx, 52, 124, 30, 8);
    if (kind === 'pine') {
      // 松树：塔形层叠 + 粗干
      ctx.beginPath();
      ctx.moveTo(44, 120);
      ctx.quadraticCurveTo(48, 84, 48, 62);
      ctx.lineTo(56, 62);
      ctx.quadraticCurveTo(56, 84, 60, 120);
      ctx.closePath();
      fillStroke(ctx, '#6a4830', OUT, 1.6);
      const p = ['#3f6a3a', '#4a7a42', '#568a4c'];
      for (let i = 0; i < 4; i++) {
        const cy = 96 - i * 24;
        const half = 44 - i * 9;
        ctx.beginPath();
        ctx.moveTo(52, cy - 30);
        ctx.lineTo(52 + half, cy);
        ctx.quadraticCurveTo(52, cy + 8, 52 - half, cy);
        ctx.closePath();
        fillStroke(ctx, p[i % 3], OUT, 1.5);
        // 枝叶锯齿
        ctx.strokeStyle = shade(p[i % 3], -20);
        ctx.lineWidth = 1.4;
        for (let s = 1; s < 5; s++) {
          const sx = 52 - half + (half * 2 * s) / 5;
          ctx.beginPath();
          ctx.moveTo(sx - 3, cy + 1);
          ctx.lineTo(sx, cy + 7);
          ctx.lineTo(sx + 3, cy + 1);
          ctx.stroke();
        }
      }
      dot(ctx, 52, 22, 3, '#568a4c');
      return;
    }
    // 阔叶树：根爪 + 分叉干
    ctx.beginPath();
    ctx.moveTo(36, 122);
    ctx.quadraticCurveTo(46, 82, 46, 52);
    ctx.lineTo(58, 52);
    ctx.quadraticCurveTo(58, 82, 68, 122);
    ctx.closePath();
    fillStroke(ctx, '#7a5636', OUT, 1.6);
    ctx.strokeStyle = shade('#7a5636', -24);
    ctx.lineWidth = 1.6;
    for (const [ax, ay] of [
      [46, 66],
      [58, 72],
    ]) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 8, ay - 14);
      ctx.stroke();
    }
    const c =
      kind === 'autumn'
        ? ['#c98f3f', '#b97a30', '#daa550']
        : kind === 'willow'
          ? ['#6f9c4c', '#7fae58', '#86b862']
          : ['#5f8f46', '#6fa050', '#7fb060'];
    // 后层冠（暗）
    ell(ctx, 32, 58, 20, 16);
    fillStroke(ctx, c[1], OUT, 1.4);
    ell(ctx, 72, 56, 19, 15);
    fillStroke(ctx, c[1], OUT, 1.4);
    // 主冠
    ell(ctx, 52, 42, 34, 28);
    fillStroke(ctx, c[0], OUT, 1.6);
    // 前层亮簇（叠出体积）
    ell(ctx, 40, 30, 18, 13);
    fillStroke(ctx, c[2], OUT, 1.4);
    ell(ctx, 64, 34, 16, 12);
    fillStroke(ctx, c[2], OUT, 1.4);
    ell(ctx, 52, 20, 19, 14);
    fillStroke(ctx, c[2], OUT, 1.4);
    // 高光点 / 果实
    dot(ctx, 42, 26, 3, shade(c[2], 24));
    dot(ctx, 66, 40, 3, shade(c[2], 24));
    dot(ctx, 54, 18, 2.5, shade(c[2], 24));
    if (kind === 'autumn') {
      dot(ctx, 34, 48, 2.6, '#e86840');
      dot(ctx, 70, 50, 2.6, '#e86840');
      dot(ctx, 50, 56, 2.6, '#e86840');
    }
    if (kind === 'willow') {
      // 垂柳枝帘
      ctx.strokeStyle = '#5f8f40';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const strands = [
        [22, 46],
        [30, 60],
        [82, 44],
        [74, 60],
        [52, 40],
        [16, 52],
        [88, 52],
      ];
      for (const [sx, sy] of strands) {
        const d = sx < 52 ? -7 : 7;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + d, sy + 20, sx + d / 3, sy + 40);
        ctx.stroke();
        // 小叶
        for (let t = 0.35; t <= 1; t += 0.3) {
          dot(ctx, sx + (d / 3) * t * t + d * 2 * t * (1 - t), sy + 40 * t * t, 1.8, '#7fae58');
        }
      }
    }
  });
}

/** 灌木丛（草地/树根点缀，无碰撞小件） */
export function bushTex(seed = 1) {
  return makeTex(`bush:${seed}`, 64, 46, (ctx) => {
    const rnd = mulberry32(seed);
    blobShadow(ctx, 32, 41, 22, 5);
    const c = ['#5f8f46', '#6fa050', '#7fb060'];
    ell(ctx, 18, 32, 14, 11);
    fillStroke(ctx, c[0], OUT, 1.4);
    ell(ctx, 46, 31, 13, 10);
    fillStroke(ctx, c[1], OUT, 1.4);
    ell(ctx, 32, 24, 17, 13);
    fillStroke(ctx, c[2], OUT, 1.4);
    for (let i = 0; i < 3; i++) {
      dot(ctx, 20 + rnd() * 26, 18 + rnd() * 14, 2, shade(c[2], 18));
    }
    if (rnd() > 0.5) {
      // 浆果
      dot(ctx, 26 + rnd() * 14, 22 + rnd() * 8, 2.2, '#d04838');
    }
  });
}

/** 花丛（草地野花簇，无碰撞） */
export function flowerbedTex(seed = 1) {
  return makeTex(`flower:${seed}`, 58, 36, (ctx) => {
    const rnd = mulberry32(seed);
    blobShadow(ctx, 29, 32, 20, 4, 0.5);
    const petals = ['#e890b0', '#f0d060', '#e07050', '#d0a0e0'];
    for (let i = 0; i < 4; i++) {
      const fx = 10 + rnd() * 38;
      const fh = 10 + rnd() * 12;
      ctx.strokeStyle = '#5f8f40';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx, 32);
      ctx.quadraticCurveTo(fx + (rnd() - 0.5) * 6, 32 - fh * 0.6, fx + (rnd() - 0.5) * 8, 32 - fh);
      ctx.stroke();
      dot(ctx, fx + (rnd() - 0.5) * 4, 31 - fh, 3.4, petals[Math.floor(rnd() * 4)]);
      dot(ctx, fx + (rnd() - 0.5) * 4, 31 - fh, 1.4, '#f8f0d8');
    }
    ell(ctx, 29, 31, 20, 5);
    ctx.fillStyle = '#6a9148';
    ctx.fill();
  });
}

/** 田野稻草人（守望庄稼，无碰撞） */
export function scarecrowTex() {
  return makeTex('scarecrow', 70, 96, (ctx) => {
    blobShadow(ctx, 35, 90, 20, 5);
    // 支架
    ctx.strokeStyle = '#8a6642';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(35, 88);
    ctx.lineTo(35, 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(60, 38);
    ctx.stroke();
    // 斗笠
    ctx.beginPath();
    ctx.moveTo(35, 8);
    ctx.lineTo(56, 22);
    ctx.quadraticCurveTo(35, 28, 14, 22);
    ctx.closePath();
    fillStroke(ctx, '#c8a058', OUT, 1.5);
    ctx.strokeStyle = shade('#c8a058', -26);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(22, 20);
    ctx.lineTo(48, 20);
    ctx.stroke();
    // 头（麻布）
    dot(ctx, 35, 32, 6.5, '#d8c8a0');
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(35, 32, 6.5, 0, Math.PI * 2);
    ctx.stroke();
    dot(ctx, 32.6, 31.6, 0.9, OUT);
    dot(ctx, 37.4, 31.6, 0.9, OUT);
    // 交叉衣袍
    ctx.beginPath();
    ctx.moveTo(12, 38);
    ctx.lineTo(58, 38);
    ctx.lineTo(52, 66);
    ctx.lineTo(18, 66);
    ctx.closePath();
    fillStroke(ctx, '#a05838', OUT, 1.5);
    ctx.strokeStyle = shade('#a05838', -22);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(35, 38);
    ctx.lineTo(35, 66);
    ctx.stroke();
    // 垂草把
    ctx.strokeStyle = '#d8c070';
    ctx.lineWidth = 2.4;
    for (const sx of [14, 56]) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + i * 3, 38);
        ctx.lineTo(sx + i * 5, 52);
        ctx.stroke();
      }
    }
  });
}

export function rockTex(seed = 1) {
  return makeTex(`rock:${seed}`, 70, 48, (ctx) => {
    const rnd = mulberry32(seed);
    blobShadow(ctx, 35, 43, 24, 6);
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const x = 18 + rnd() * 34;
      const y = 26 - rnd() * 8;
      const r = 10 + rnd() * 8;
      ell(ctx, x, y, r, r * 0.78);
      fillStroke(ctx, rnd() > 0.5 ? '#9a948c' : '#8b857c', OUT, 1.4);
      dot(ctx, x - r * 0.3, y - r * 0.3, r * 0.18, 'rgba(255,255,255,0.35)');
    }
  });
}

export function wellTex() {
  return makeTex('well', 110, 120, (ctx) => {
    blobShadow(ctx, 55, 114, 34, 9);
    // 井台（俯视石环）
    ell(ctx, 55, 92, 30, 16);
    fillStroke(ctx, '#9a948c', OUT, 1.6);
    ell(ctx, 55, 92, 18, 9);
    fillStroke(ctx, '#31404e', OUT, 1.4);
    // 支架
    rr(ctx, 24, 40, 8, 54, 3);
    fillStroke(ctx, '#8a5f38', OUT, 1.4);
    rr(ctx, 78, 40, 8, 54, 3);
    fillStroke(ctx, '#8a5f38', OUT, 1.4);
    rr(ctx, 18, 34, 74, 9, 4);
    fillStroke(ctx, '#8a5f38', OUT, 1.4);
    // 辘轳 + 吊绳 + 木桶
    ell(ctx, 55, 38, 8, 8);
    fillStroke(ctx, '#6a4a2c', OUT, 1.4);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(63, 36);
    ctx.lineTo(70, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(55, 44);
    ctx.lineTo(55, 64);
    ctx.stroke();
    rr(ctx, 47, 64, 16, 13, 2);
    fillStroke(ctx, '#a3763f', OUT, 1.4);
  });
}

/** 市集摊位：banner 篷布色 / goods 货物色 */
export function stallTex(banner: string, goods: string) {
  return makeTex(`stall:${banner}:${goods}`, 130, 122, (ctx) => {
    blobShadow(ctx, 65, 116, 46, 8);
    // 支杆
    rr(ctx, 22, 16, 6, 52, 3);
    fillStroke(ctx, '#6a4a2c', OUT, 1.3);
    rr(ctx, 102, 16, 6, 52, 3);
    fillStroke(ctx, '#6a4a2c', OUT, 1.3);
    // 篷顶面（条纹，clip）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(8, 28);
    ctx.lineTo(122, 28);
    ctx.lineTo(114, 10);
    ctx.lineTo(16, 10);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#f0e8d8';
    ctx.fillRect(0, 0, 130, 40);
    ctx.fillStyle = banner;
    for (let x = 6; x < 124; x += 28) ctx.fillRect(x, 0, 14, 40);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(8, 28);
    ctx.lineTo(122, 28);
    ctx.lineTo(114, 10);
    ctx.lineTo(16, 10);
    ctx.closePath();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 前檐窄立面
    rr(ctx, 8, 28, 114, 8, 3);
    fillStroke(ctx, shade(banner, -30), OUT, 1.4);
    // 台面立方体（正面 + 顶面）
    rr(ctx, 16, 66, 98, 42, 4);
    fillStroke(ctx, '#a87e50', OUT, 1.6);
    ctx.beginPath();
    ctx.moveTo(16, 66);
    ctx.lineTo(114, 66);
    ctx.lineTo(124, 55);
    ctx.lineTo(26, 55);
    ctx.closePath();
    fillStroke(ctx, '#c49a6a', OUT, 1.6);
    // 前腿
    rr(ctx, 20, 108, 8, 8, 2);
    fillStroke(ctx, '#8a5f38', OUT, 1.2);
    rr(ctx, 102, 108, 8, 8, 2);
    fillStroke(ctx, '#8a5f38', OUT, 1.2);
    // 货物
    ell(ctx, 42, 62, 10, 7);
    fillStroke(ctx, goods, OUT, 1.3);
    ell(ctx, 62, 60, 11, 8);
    fillStroke(ctx, shade(goods, 16), OUT, 1.3);
    ell(ctx, 82, 62, 10, 7);
    fillStroke(ctx, goods, OUT, 1.3);
    dot(ctx, 58, 56, 2.4, 'rgba(255,255,255,0.5)');
  });
}

/** 八仙桌 + 两侧长凳 */
export function tableTex() {
  return makeTex('table', 120, 88, (ctx) => {
    blobShadow(ctx, 60, 82, 44, 10);
    // 凳 ×2
    for (const dx of [6, 96]) {
      ell(ctx, dx + 9, 72, 12, 7);
      fillStroke(ctx, '#9a744c', OUT, 1.4);
      rr(ctx, dx + 1, 72, 17, 7, 3);
      fillStroke(ctx, '#8a6642', OUT, 1.2);
    }
    // 桌裙（立面半椭圆）
    ctx.beginPath();
    ctx.ellipse(60, 54, 34, 20, 0, 0, Math.PI);
    ctx.closePath();
    fillStroke(ctx, '#8f6840', OUT, 1.6);
    // 桌面（俯视椭圆）
    ell(ctx, 60, 52, 38, 22);
    fillStroke(ctx, '#c99a5f', OUT, 1.6);
    ctx.strokeStyle = shade('#c99a5f', -22);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(60, 52, 28, 15, 0, 0.4, Math.PI - 0.4);
    ctx.stroke();
  });
}

export function lanternPostTex() {
  return makeTex('lanternpost', 56, 140, (ctx) => {
    blobShadow(ctx, 28, 134, 15, 5);
    rr(ctx, 24, 30, 8, 104, 3);
    fillStroke(ctx, '#6a4a2c', OUT, 1.4);
    rr(ctx, 26, 34, 24, 6, 3);
    fillStroke(ctx, '#6a4a2c', OUT, 1.4);
    // 挂灯笼
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(48, 40);
    ctx.lineTo(48, 47);
    ctx.stroke();
    dot(ctx, 48, 47, 2.4, '#e8c060');
    ell(ctx, 48, 58, 9, 11);
    fillStroke(ctx, '#d03a2c', OUT, 1.4);
    ctx.strokeStyle = 'rgba(120,20,10,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(48, 58, 4, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.beginPath();
    ctx.moveTo(48, 69);
    ctx.lineTo(48, 74);
    ctx.stroke();
    dot(ctx, 48, 76, 2.2, '#e8c060');
  });
}

export function fenceTex() {
  return makeTex('fence', 100, 54, (ctx) => {
    blobShadow(ctx, 50, 50, 40, 6);
    for (const x of [10, 45, 80]) {
      rr(ctx, x, 12, 9, 38, 3);
      fillStroke(ctx, '#9a744c', OUT, 1.4);
    }
    rr(ctx, 5, 20, 90, 7, 3);
    fillStroke(ctx, '#8a6642', OUT, 1.3);
    rr(ctx, 5, 33, 90, 7, 3);
    fillStroke(ctx, '#8a6642', OUT, 1.3);
  });
}

/** 石桥（纵跨 3 格，宽 2 格） */
export function bridgeTex() {
  return makeTex('bridge', 130, 195, (ctx) => {
    blobShadow(ctx, 65, 188, 52, 9);
    // 桥面（远窄近宽）
    ctx.beginPath();
    ctx.moveTo(10, 184);
    ctx.lineTo(28, 14);
    ctx.lineTo(102, 14);
    ctx.lineTo(120, 184);
    ctx.closePath();
    fillStroke(ctx, '#cfc9be', OUT, 1.8);
    // 横向石缝
    ctx.strokeStyle = shade('#cfc9be', -34);
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const yy = lerp(14, 184, t);
      const half = lerp(37, 55, t);
      ctx.beginPath();
      ctx.moveTo(65 - half, yy);
      ctx.lineTo(65 + half, yy);
      ctx.stroke();
    }
    // 两侧栏杆（描双层模拟立体）
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(65 + side * 48, 184);
      ctx.lineTo(65 + side * 30, 14);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = '#b8b2a8';
      ctx.lineWidth = 6;
      ctx.stroke();
      // 栏杆柱
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const px = 65 + side * lerp(48, 30, t);
        const py = lerp(184, 14, t);
        dot(ctx, px, py, 4, '#a8a29a');
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(px, py, 4, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

/** 河上小船（装饰，无碰撞） */
export function boatTex() {
  return makeTex('boat', 110, 64, (ctx) => {
    blobShadow(ctx, 55, 56, 42, 8, 0.6);
    ctx.beginPath();
    ctx.moveTo(55, 6);
    ctx.lineTo(96, 30);
    ctx.lineTo(88, 52);
    ctx.lineTo(22, 52);
    ctx.lineTo(14, 30);
    ctx.closePath();
    fillStroke(ctx, '#8a5f38', OUT, 1.6);
    ctx.beginPath();
    ctx.moveTo(55, 14);
    ctx.lineTo(86, 30);
    ctx.lineTo(79, 46);
    ctx.lineTo(31, 46);
    ctx.lineTo(24, 30);
    ctx.closePath();
    fillStroke(ctx, '#a3763f', OUT, 1.3);
    // 舱篷
    ell(ctx, 55, 32, 22, 13);
    fillStroke(ctx, '#d8cfa8', OUT, 1.4);
    ctx.strokeStyle = shade('#d8cfa8', -26);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(55, 32, 15, 8, 0, 0.3, Math.PI - 0.3);
    ctx.stroke();
    dot(ctx, 92, 24, 2.5, '#d03a2c');
  });
}

/** 芦苇丛（河岸装饰，无碰撞） */
export function reedTex(seed = 1) {
  return makeTex(`reed:${seed}`, 72, 88, (ctx) => {
    const rnd = mulberry32(seed);
    blobShadow(ctx, 36, 84, 22, 5, 0.5);
    for (let i = 0; i < 7; i++) {
      const bx = 12 + rnd() * 48;
      const h = 34 + rnd() * 34;
      const sway = (rnd() - 0.5) * 14;
      ctx.strokeStyle = rnd() > 0.4 ? '#6f9c4c' : '#5f8a40';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, 84);
      ctx.quadraticCurveTo(bx + sway * 0.4, 84 - h * 0.55, bx + sway, 84 - h);
      ctx.stroke();
      if (rnd() > 0.45) {
        // 芦花穗
        ell(ctx, bx + sway, 84 - h, 2.6, 6);
        fillStroke(ctx, '#d8c890', OUT, 1);
      }
    }
  });
}

/** 莲叶（水面装饰，无碰撞） */
export function lotusTex(seed = 1) {
  return makeTex(`lotus:${seed}`, 56, 34, (ctx) => {
    const rnd = mulberry32(seed);
    for (let i = 0; i < 2; i++) {
      const x = 16 + rnd() * 24;
      const y = 14 + rnd() * 10;
      const r = 9 + rnd() * 6;
      ell(ctx, x, y, r, r * 0.55);
      fillStroke(ctx, '#4f8a46', '#2c5226', 1.3);
      ctx.strokeStyle = '#2c5226';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.85, y);
      ctx.lineTo(x + r * 0.85, y);
      ctx.stroke();
      if (rnd() > 0.6) {
        // 小莲蓬
        dot(ctx, x + r * 0.5, y - r * 0.55, 3.2, '#e890b0');
        dot(ctx, x + r * 0.5, y - r * 0.75, 1.6, '#f5d580');
      }
    }
  });
}

/** 水面鸭子（装饰，无碰撞） */
export function duckTex(seed = 1) {
  return makeTex(`duck:${seed}`, 40, 34, (ctx) => {
    ell(ctx, 20, 24, 13, 7);
    fillStroke(ctx, '#a8763a', OUT, 1.3);
    dot(ctx, 12, 18, 5, '#c8944c');
    dot(ctx, 28, 19, 4.5, '#c8944c');
    // 头颈
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.quadraticCurveTo(6, 12, 12, 9);
    ctx.lineWidth = 5.4;
    ctx.strokeStyle = '#a8763a';
    ctx.lineCap = 'round';
    ctx.stroke();
    dot(ctx, 12, 8, 3.6, '#c8944c');
    dot(ctx, 10.6, 7, 0.9, OUT);
    // 尾羽
    ctx.beginPath();
    ctx.moveTo(32, 22);
    ctx.quadraticCurveTo(37, 18, 35, 14);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8a5f2c';
    ctx.stroke();
  });
}

/** 指路牌（箭头木牌 + 立柱） */
export function signpostTex(label: string) {
  const pw = Math.max(64, 26 + label.length * 16);
  return makeTex(`signpost:${label}`, pw, 64, (ctx) => {
    blobShadow(ctx, pw / 2, 58, 20, 5);
    rr(ctx, pw / 2 - 5, 22, 10, 36, 3);
    fillStroke(ctx, '#6a4a2c', OUT, 1.4);
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(pw - 24, 10);
    ctx.lineTo(pw - 6, 24);
    ctx.lineTo(pw - 24, 38);
    ctx.lineTo(6, 38);
    ctx.closePath();
    fillStroke(ctx, '#9a744c', OUT, 1.6);
    ctx.fillStyle = '#3a2a18';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, (pw - 14) / 2 + 2, 25);
  });
}