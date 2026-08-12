'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = 'D:\\AI\\design-assets\\dengxia-npcs\\v31\\source';
const OUTPUT_ROOT = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26', 'assets', 'art', 'npcs', 'classic-v31');
const PORTRAIT_ROOT = path.join(OUTPUT_ROOT, 'portraits');
const FRAME = { width: 192, height: 256, footY: 244 };

const SHEETS = [
  ['xiaomi', 'qian-zhanggui', 'qian-furen', 'sai-diaochan', 'xiaocui', 'yang-huilan'],
  ['xing-butou', 'yan-xiaoliu', 'zhu-wushuang', 'zhan-hongling', 'zhuifeng', 'ling-tengyun'],
  ['zhu-xiansheng', 'dou-xiansheng', 'duanzhi-xuanyuan', 'zhuge-kongfang', 'qingfeng', 'hu-shiniang'],
  ['ji-wuming', 'ji-wubing', 'shangguan-yundun', 'pinggu-yidianhong', 'gongsun-wulong', 'xie-budong'],
  ['tong-boda', 'tong-shitou', 'bai-sanniang', 'guo-juxia', 'guo-qiangwei', 'murong-yan'],
  ['du-zijun', 'jin-xiangyu', 'bao-daren', 'liu-xingyu', 'liu-yueyun', 'yue-songtao'],
];

function removeChroma(buffer, width, height) {
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const red = buffer[offset];
    const green = buffer[offset + 1];
    const blue = buffer[offset + 2];
    const distance = Math.max(255 - red, green, 255 - blue);
    const dominance = Math.min(red, blue) - green;
    const keyLike = distance <= 42 || (red > 148 && blue > 138 && dominance > 18);
    let alpha = buffer[offset + 3];
    if (keyLike) {
      const ratio = Math.max(0, Math.min(1, (distance - 22) / 94));
      const smooth = ratio * ratio * (3 - 2 * ratio);
      const byDistance = Math.round(smooth * 255);
      const byDominance = dominance <= 0
        ? 255
        : Math.round((1 - Math.min(1, dominance / Math.max(1, 255 - green))) * 255);
      alpha = Math.min(alpha, byDistance, byDominance);
    }
    if (alpha <= 8) alpha = 0;
    if (alpha > 0 && alpha < 252 && keyLike) {
      const neutral = Math.max(0, green - 1);
      buffer[offset] = Math.min(red, neutral);
      buffer[offset + 2] = Math.min(blue, neutral);
    }
    buffer[offset + 3] = alpha;
  }
  contractAlpha(buffer, width, height);
  removeTinyComponents(buffer, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < width * height; index += 1) {
    if (buffer[index * 4 + 3] <= 20) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error('No subject found after chroma removal');
  return { buffer, bounds: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}

function contractAlpha(buffer, width, height) {
  const source = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) source[index] = buffer[index * 4 + 3];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let alpha = 255;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) alpha = Math.min(alpha, source[(y + oy) * width + x + ox]);
      }
      buffer[(y * width + x) * 4 + 3] = alpha;
    }
  }
}

function removeTinyComponents(buffer, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let seed = 0; seed < width * height; seed += 1) {
    if (visited[seed] || buffer[seed * 4 + 3] <= 20) continue;
    const stack = [seed];
    const pixels = [];
    visited[seed] = 1;
    while (stack.length) {
      const current = stack.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      pixels.push(current);
      for (let index = 0; index < offsets.length; index += 1) {
        const nx = x + offsets[index][0];
        const ny = y + offsets[index][1];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!visited[next] && buffer[next * 4 + 3] > 20) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
    components.push(pixels);
  }
  const largest = components.reduce((size, pixels) => Math.max(size, pixels.length), 0);
  const threshold = Math.max(56, Math.round(largest * 0.0012));
  components.forEach(function (pixels) {
    if (pixels.length >= threshold) return;
    pixels.forEach(function (pixel) { buffer[pixel * 4 + 3] = 0; });
  });
}

async function processCell(source, metadata, slug, index) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const left = Math.floor(column * metadata.width / 3);
  const top = Math.floor(row * metadata.height / 2);
  const right = Math.floor((column + 1) * metadata.width / 3);
  const bottom = Math.floor((row + 1) * metadata.height / 2);
  const raw = await sharp(source)
    .extract({ left, top, width: right - left, height: bottom - top })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const keyed = removeChroma(raw.data, raw.info.width, raw.info.height);
  const subjectPng = await sharp(keyed.buffer, { raw: raw.info })
    .extract(keyed.bounds)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const sprite = await sharp(subjectPng)
    .resize({ width: 174, height: 236, fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toBuffer({ resolveWithObject: true });
  const spriteX = Math.round((FRAME.width - sprite.info.width) / 2);
  const spriteY = FRAME.footY - sprite.info.height;
  await sharp({
    create: { width: FRAME.width, height: FRAME.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: sprite.data, left: spriteX, top: spriteY }])
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(path.join(OUTPUT_ROOT, slug + '.png'));

  await sharp(subjectPng)
    .resize({ width: 256, height: 256, fit: 'cover', position: 'north' })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(path.join(PORTRAIT_ROOT, slug + '.webp'));

  return {
    slug,
    sheet: path.basename(source),
    cell: index,
    sourceBounds: keyed.bounds,
    sprite: { width: sprite.info.width, height: sprite.info.height, x: spriteX, y: spriteY },
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.mkdirSync(PORTRAIT_ROOT, { recursive: true });
  const items = [];
  for (let sheetIndex = 0; sheetIndex < SHEETS.length; sheetIndex += 1) {
    const source = path.join(SOURCE_ROOT, 'classic-npc-anchor-' + String(sheetIndex + 1).padStart(2, '0') + '.png');
    if (!fs.existsSync(source)) throw new Error('Missing source sheet: ' + source);
    const metadata = await sharp(source).metadata();
    for (let cell = 0; cell < SHEETS[sheetIndex].length; cell += 1) {
      items.push(await processCell(source, metadata, SHEETS[sheetIndex][cell], cell));
    }
  }
  const report = {
    version: 31,
    count: items.length,
    frame: FRAME,
    sourceRoot: SOURCE_ROOT,
    items,
  };
  fs.writeFileSync(path.join(OUTPUT_ROOT, 'build-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ count: items.length, output: OUTPUT_ROOT }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
