'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const sourceRoot = process.env.DENGXIA_CH11_SOURCE_ROOT
  || 'D:\\AI\\design-assets\\dengxia\\season2-ch11\\sources';
const packageRoot = path.join(root, 'minigame', 'subpackages', 's2ch11', 'assets', 'art');
const reportPath = path.join(root, 'outputs', 'creative-production', 'season2-ch11', 'runtime-report.json');

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function requireSource(name) {
  const file = path.join(sourceRoot, name);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1024) {
    throw new Error(`Missing formal chapter 11 source image: ${file}`);
  }
  return file;
}

function coverImage(ctx, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  ctx.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}

async function buildMap(sourceName, id, width, height) {
  const source = requireSource(sourceName);
  const image = await canvasModule.loadImage(source);
  const canvas = canvasModule.createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  coverImage(ctx, image, width, height);
  const target = path.join(packageRoot, 'maps', id, 'far.jpg');
  ensureDirectory(path.dirname(target));
  fs.writeFileSync(target, canvas.toBuffer('image/jpeg', 84));
  return { id, source, target, size: [width, height], bytes: fs.statSync(target).size };
}

function keyToAlpha(image, sectionX, sectionWidth) {
  const canvas = canvasModule.createCanvas(sectionWidth, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, sectionX, 0, sectionWidth, image.height, 0, 0, sectionWidth, image.height);
  const pixels = ctx.getImageData(0, 0, sectionWidth, image.height);
  const data = pixels.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const keyStrength = Math.min(red, blue) - green;
    const chroma = red > 90 && blue > 90 && keyStrength > 20;
    if (chroma) {
      const distance = Math.sqrt((255 - red) ** 2 + green ** 2 + (255 - blue) ** 2);
      data[index + 3] = distance < 90 ? 0 : Math.min(255, Math.round((distance - 90) * 2.35));
      if (data[index + 3] > 0) {
        const spill = Math.max(0, Math.min(red, blue) - green);
        data[index] = Math.max(green, red - spill * 0.95);
        data[index + 2] = Math.max(green, blue - spill * 0.95);
      }
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function alphaBounds(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] < 20) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('Chroma-key section contains no visible subject');
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function fitCutout(sourceCanvas, targetWidth, targetHeight, padding, baseline) {
  const bounds = alphaBounds(sourceCanvas);
  const usableWidth = targetWidth - padding * 2;
  const usableHeight = targetHeight - padding * 2;
  const scale = Math.min(usableWidth / bounds.width, usableHeight / bounds.height);
  const drawWidth = bounds.width * scale;
  const drawHeight = bounds.height * scale;
  const drawX = (targetWidth - drawWidth) / 2;
  const drawY = baseline == null
    ? (targetHeight - drawHeight) / 2
    : baseline - drawHeight;
  const target = canvasModule.createCanvas(targetWidth, targetHeight);
  target.getContext('2d').drawImage(
    sourceCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    drawX,
    Math.max(padding, drawY),
    drawWidth,
    drawHeight
  );
  return target;
}

async function buildProps() {
  const source = requireSource('story-props-source.png');
  const image = await canvasModule.loadImage(source);
  const names = [
    { id: 'problem-spice-sack', width: 220, height: 220 },
    { id: 'charred-recipe', width: 220, height: 220 },
  ];
  const sectionWidth = Math.floor(image.width / 3);
  const results = [];
  names.forEach((item, index) => {
    const keyed = keyToAlpha(image, index * sectionWidth, index === 2 ? image.width - sectionWidth * 2 : sectionWidth);
    const output = fitCutout(keyed, item.width, item.height, 10);
    const target = path.join(packageRoot, 'props', item.id + '.png');
    ensureDirectory(path.dirname(target));
    fs.writeFileSync(target, output.toBuffer('image/png'));
    results.push({ id: item.id, target, size: [item.width, item.height], bytes: fs.statSync(target).size });
  });
  return results;
}

async function buildShiweiActions() {
  const source = requireSource('shiwei-actions-source.png');
  const image = await canvasModule.loadImage(source);
  const sectionWidth = Math.floor(image.width / 3);
  const frameWidth = 240;
  const frameHeight = 320;
  const strip = canvasModule.createCanvas(frameWidth * 3, frameHeight);
  const ctx = strip.getContext('2d');
  for (let index = 0; index < 3; index += 1) {
    const keyed = keyToAlpha(image, index * sectionWidth, index === 2 ? image.width - sectionWidth * 2 : sectionWidth);
    const frame = fitCutout(keyed, frameWidth, frameHeight, 10, 308);
    ctx.drawImage(frame, index * frameWidth, 0);
  }
  const target = path.join(packageRoot, 'characters', 'shiwei', 'chapter11-actions.png');
  ensureDirectory(path.dirname(target));
  fs.writeFileSync(target, strip.toBuffer('image/png'));
  return { id: 'shiwei-chapter11-actions', target, size: [frameWidth * 3, frameHeight], bytes: fs.statSync(target).size };
}

async function main() {
  ensureDirectory(packageRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    maps: [
      await buildMap('spice-workshop-source.png', 'jiangnan_spice_workshop', 1260, 560),
      await buildMap('old-kitchen-source.png', 'old_banquet_kitchen', 1320, 560),
    ],
    props: await buildProps(),
    actions: await buildShiweiActions(),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(reportPath);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
