/** UI 组件：按钮、对话框、HUD —— 全 Canvas 绘制 */

import { drawTex, moodTex } from '@core/art';
import { Tween } from '@core/tween';
import { fmtNum } from '@core/iso';

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  onClick: () => void;
  accent?: string;
  small?: boolean;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawButton(ctx: CanvasRenderingContext2D, b: Button, pressed: boolean) {
  const off = pressed ? 2 : 0;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = b.accent || '#8a5a2a';
  roundRect(ctx, b.x, b.y + off, b.w, b.h, 10);
  ctx.fill();
  ctx.restore();
  // 高光
  const grad = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  grad.addColorStop(0, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  roundRect(ctx, b.x + 2, b.y + off + 2, b.w - 4, b.h / 2, 8);
  ctx.fill();
  // 文字
  ctx.fillStyle = '#fff8ec';
  ctx.font = `bold ${b.small ? 14 : 17}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + off + b.h / 2 + 1);
}

export function hitButton(b: Button, x: number, y: number) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

import type { Season } from './defs';
import { SEASON_FX } from './defs';

/** 顶部 HUD：银两 + 季节 + 掌故收录 */
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  money: number,
  season: Season,
  seasonRemain: number,
  seasonEarned: number,
  heardCount: number,
  storyTotal: number,
  gateProgress?: number | null,
) {
  // 底板
  ctx.fillStyle = 'rgba(30,20,10,0.75)';
  roundRect(ctx, 10, 10, W - 20, 42, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,160,23,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textBaseline = 'middle';
  // 银两
  ctx.drawImage(coinIcon(), 22, 18, 32, 32);
  ctx.fillStyle = '#f5d580';
  ctx.font = 'bold 18px "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtNum(money), 60, 32);
  // 季节徽章（带环形进度）
  const cx = W / 2 - 60;
  const cy = 31;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = SEASON_FX[season].tint;
  ctx.beginPath();
  ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, seasonRemain));
  ctx.stroke();
  ctx.fillStyle = '#ffe8b0';
  ctx.font = 'bold 14px "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(season, cx, cy + 1);
  ctx.restore();
  // 掌故收录
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8c8a8';
  ctx.font = '13px "PingFang SC", sans-serif';
  ctx.fillText(`掌故 ${heardCount}/${storyTotal}`, W / 2 + 42, 32);
  // 本季营收
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a8d8a8';
  ctx.fillText(`本季 +${fmtNum(seasonEarned)}`, W - 24, 32);
  // 新掌故门槛进度
  if (gateProgress != null) {
    ctx.textAlign = 'center';
    ctx.fillStyle = gateProgress >= 1 ? '#ffd76a' : '#b8a888';
    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText(
      gateProgress >= 1 ? '新掌故可听 · 出门走走吧' : `新掌故 ${Math.floor(gateProgress * 100)}%`,
      W / 2,
      46,
    );
  }
}

import { coinTex } from '@core/art';
function coinIcon() {
  return coinTex();
}

/** 立绘缓存：id → Image（懒加载，失败静默回退纯文本对话框） */
const portraits = new Map<string, HTMLImageElement>();
function portraitOf(id: string | undefined): HTMLImageElement | null {
  if (!id) return null;
  let img = portraits.get(id);
  if (!img) {
    img = new Image();
    img.src = `portraits/${id}.png`;
    portraits.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** 对话框：立绘名条 + 打字机文本 */
export class DialogBox {
  alpha = 0;
  textAlpha = 0;
  private chars = 0;
  private fullText = '';
  private typingSpeed = 28; // 字/秒

  show(text: string) {
    this.fullText = text;
    this.chars = 0;
    this.textAlpha = 0;
    Tween.to(0.18, (k) => (this.alpha = k));
    Tween.to(0.15, (k) => (this.textAlpha = k));
  }

  hide() {
    Tween.to(0.15, (k) => (this.alpha = 1 - k));
    this.textAlpha = 0;
  }

  /** 点击跳过打字：返回 true 表示已打完 */
  skip(): boolean {
    if (this.chars < this.fullText.length) {
      this.chars = this.fullText.length;
      return false;
    }
    return true;
  }

  update(dt: number) {
    if (this.alpha > 0.5) {
      this.chars = Math.min(this.chars + dt * this.typingSpeed, this.fullText.length);
    }
  }

  get finished() {
    return this.chars >= this.fullText.length;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    speaker: string,
    title: string,
    charId?: string,
  ) {
    if (this.alpha <= 0.01) return;
    const bh = Math.min(150, H * 0.26);
    const by = H - bh - 16;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(20,14,8,0.92)';
    roundRect(ctx, 16, by, W - 32, bh, 14);
    ctx.fill();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // AI 立绘（左侧，画在底板之上；未加载完成则跳过）
    const pt = portraitOf(charId);
    const pw = pt ? Math.min(bh - 16, W * 0.3) : 0;
    if (pt) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.rect(24, by + 8, pw, pw);
      ctx.clip();
      ctx.drawImage(pt, 24, by + 8, pw, pw);
      ctx.restore();
    }
    // 名条 / 正文起点（有立绘时右移避让）
    const tx = pt ? 24 + pw + 14 : 40;
    // 名条
    if (speaker) {
      ctx.fillStyle = '#8a5a2a';
      roundRect(ctx, tx - 8, by - 16, ctx.measureText(speaker).width + 76, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffe8b0';
      ctx.font = 'bold 15px "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${speaker}·${title}`, tx + 4, by);
    }
    // 正文（打字机）
    ctx.globalAlpha = this.alpha * this.textAlpha;
    ctx.fillStyle = '#f0e8d8';
    ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    this.wrapText(
      ctx,
      this.fullText.slice(0, Math.floor(this.chars)),
      tx,
      by + 34,
      W - 40 - tx,
      24,
    );
    // 继续提示
    if (this.finished) {
      ctx.fillStyle = '#d4a017';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('▼ 点击继续', W - 40, by + bh - 14);
    }
    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lh: number,
  ) {
    const paras = text.split('\n');
    let line = '';
    let yy = y;
    for (const para of paras) {
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > maxW) {
          ctx.fillText(line, x, yy);
          yy += lh;
          line = '';
        }
        line += ch;
      }
      ctx.fillText(line, x, yy);
      yy += lh;
      line = '';
    }
  }
}

/** 耐心环：客人头顶进度圈 */
export function drawPatience(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  mood: 'happy' | 'angry' | 'wait',
) {
  const tex = moodTex(mood);
  drawTex(ctx, tex, x, y, 0.9);
  if (k < 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 2, 24, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = k > 0.5 ? '#5ac85a' : k > 0.25 ? '#e8b830' : '#e05050';
    ctx.beginPath();
    ctx.arc(x, y - 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.restore();
  }
}
