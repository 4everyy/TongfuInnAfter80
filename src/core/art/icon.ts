/** UI 图标贴图：菜品 / 银两 / 心情气泡（程序化生成） */

import { makeTex } from './tex';

/** 菜品图标（冒热气的碗） */
export function dishTex(id: string, color: string) {
  return makeTex(`dish:${id}`, 64, 56, (ctx) => {
    // 碗
    ctx.fillStyle = '#f5efe0';
    ctx.beginPath();
    ctx.moveTo(8, 24);
    ctx.quadraticCurveTo(32, 48, 56, 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8a888';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 食物
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(32, 24, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 热气
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const dx of [24, 34, 44]) {
      ctx.beginPath();
      ctx.moveTo(dx, 16);
      ctx.quadraticCurveTo(dx + 3, 10, dx, 4);
      ctx.stroke();
    }
  });
}

/** 银两图标 */
export function coinTex() {
  return makeTex('coin', 48, 48, (ctx) => {
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(24, 24, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(24, 22, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a87b0a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('银', 24, 23);
  });
}

/** 心情气泡：满意 / 生气 / 等待 —— 几何绘制 */
export function moodTex(mood: 'happy' | 'angry' | 'wait') {
  return makeTex(`mood:${mood}`, 44, 44, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(22, 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 30);
    ctx.lineTo(22, 42);
    ctx.lineTo(26, 28);
    ctx.closePath();
    ctx.fill();
    const col = mood === 'angry' ? '#d43a2f' : mood === 'wait' ? '#e8a23a' : '#3a8f3a';
    if (mood === 'happy') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(16, 15, 2.5, 0, Math.PI * 2);
      ctx.arc(28, 15, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(22, 19, 7, 0.2, Math.PI - 0.2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col;
      ctx.stroke();
    } else if (mood === 'angry') {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(12, 10);
      ctx.lineTo(20, 14);
      ctx.moveTo(32, 10);
      ctx.lineTo(24, 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(22, 26, 6, Math.PI + 0.4, -0.4);
      ctx.stroke();
    } else {
      // wait: 沙漏
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(16, 10);
      ctx.lineTo(28, 10);
      ctx.lineTo(18, 26);
      ctx.lineTo(28, 26);
      ctx.stroke();
    }
  });
}
