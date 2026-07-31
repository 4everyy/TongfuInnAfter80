'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const sourceRoot = process.env.BATTLE_ART_SOURCE_ROOT
  || 'D:\\AI\\design-assets\\dengxia-jianghu\\battle-v16\\source';
const outputRoot = path.join(root, 'minigame', 'assets', 'art', 'ui', 'battle');
const frameSize = 96;
const columns = 5;
const rows = 4;

const roleSheets = [
  'skills-zhangdeng.png',
  'skills-wuchen.png',
  'skills-jingzhi.png',
  'skills-wenyan.png',
  'skills-shiwei.png',
];

function writeWebp(name, canvas, quality) {
  fs.writeFileSync(
    path.join(outputRoot, name),
    canvas.toBuffer('image/webp', { quality: quality || 86 })
  );
}

function alphaBounds(image, region) {
  const canvas = canvasModule.createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  const left = Math.max(0, Math.floor(region && region.x || 0));
  const top = Math.max(0, Math.floor(region && region.y || 0));
  const right = Math.min(image.width, Math.ceil(region ? region.x + region.width : image.width));
  const bottom = Math.min(image.height, Math.ceil(region ? region.y + region.height : image.height));
  let minX = right;
  let minY = bottom;
  let maxX = left - 1;
  let maxY = top - 1;
  let x;
  let y;
  let alpha;

  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  for (y = top; y < bottom; y += 1) {
    for (x = left; x < right; x += 1) {
      alpha = pixels[(y * image.width + x) * 4 + 3];
      if (alpha <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function drawFit(ctx, image, bounds, x, y, width, height, padding) {
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
  const drawWidth = bounds.width * scale;
  const drawHeight = bounds.height * scale;
  ctx.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

function drawCommonIcon(ctx, frame, type) {
  const x = frame % columns * frameSize;
  const y = Math.floor(frame / columns) * frameSize;
  const centerX = x + frameSize / 2;
  const centerY = y + frameSize / 2;
  ctx.save();
  ctx.fillStyle = type === 'attack' ? '#3b281e' : '#173d39';
  ctx.strokeStyle = '#d8ab55';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 39, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f3e2b9';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'attack') {
    ctx.beginPath();
    ctx.moveTo(centerX - 18, centerY + 20);
    ctx.lineTo(centerX + 16, centerY - 18);
    ctx.moveTo(centerX + 7, centerY - 20);
    ctx.lineTo(centerX + 20, centerY - 21);
    ctx.lineTo(centerX + 18, centerY - 8);
    ctx.moveTo(centerX - 19, centerY + 9);
    ctx.lineTo(centerX - 7, centerY + 20);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 22);
    ctx.lineTo(centerX + 21, centerY - 13);
    ctx.lineTo(centerX + 16, centerY + 14);
    ctx.quadraticCurveTo(centerX, centerY + 28, centerX - 16, centerY + 14);
    ctx.lineTo(centerX - 21, centerY - 13);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

async function buildIconAtlas() {
  const canvas = canvasModule.createCanvas(columns * frameSize, rows * frameSize);
  const ctx = canvas.getContext('2d');
  let frame = 2;
  let sheetIndex;
  let iconIndex;
  drawCommonIcon(ctx, 0, 'attack');
  drawCommonIcon(ctx, 1, 'defend');
  for (sheetIndex = 0; sheetIndex < roleSheets.length; sheetIndex += 1) {
    const image = await canvasModule.loadImage(path.join(sourceRoot, roleSheets[sheetIndex]));
    const third = image.width / 3;
    for (iconIndex = 0; iconIndex < 3; iconIndex += 1) {
      const bounds = alphaBounds(image, {
        x: third * iconIndex,
        y: 0,
        width: third,
        height: image.height,
      });
      drawFit(
        ctx,
        image,
        bounds,
        frame % columns * frameSize,
        Math.floor(frame / columns) * frameSize,
        frameSize,
        frameSize,
        3
      );
      frame += 1;
    }
  }
  writeWebp('action-icons-v16.webp', canvas, 88);
}

async function buildWheel() {
  const image = await canvasModule.loadImage(path.join(sourceRoot, 'wheel.png'));
  const bounds = alphaBounds(image);
  const canvas = canvasModule.createCanvas(320, 172);
  drawFit(canvas.getContext('2d'), image, bounds, 0, 0, canvas.width, canvas.height, 0);
  writeWebp('wheel-v16.webp', canvas, 84);
}

async function buildLedger() {
  const image = await canvasModule.loadImage(path.join(sourceRoot, 'ledger.png'));
  const bounds = alphaBounds(image);
  const canvas = canvasModule.createCanvas(940, 448);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  drawFit(ctx, image, bounds, 0, 0, canvas.width, canvas.height, 0);
  ctx.restore();
  writeWebp('victory-ledger-v16.webp', canvas, 84);
}

async function main() {
  roleSheets.concat(['wheel.png', 'ledger.png']).forEach((name) => {
    const source = path.join(sourceRoot, name);
    if (!fs.existsSync(source)) throw new Error('Missing battle art source: ' + source);
  });
  fs.mkdirSync(outputRoot, { recursive: true });
  await Promise.all([buildIconAtlas(), buildWheel(), buildLedger()]);
  fs.readdirSync(outputRoot).forEach((name) => {
    const file = path.join(outputRoot, name);
    console.log(name + ' ' + fs.statSync(file).size + ' bytes');
  });
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
