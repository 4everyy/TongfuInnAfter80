'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'outputs', 'creative-production', 'season2');
const outputRoot = path.join(root, 'minigame', 'subpackages', 's2ch910', 'assets', 'art', 'characters', 'shiwei');
const anchorPath = path.join(sourceRoot, 'shiwei-anchor-source.png');
const frameWidth = 192;
const frameHeight = 256;
const columns = 8;

const crops = {
  front: { left: 20, top: 80, width: 385, height: 780 },
  side: { left: 390, top: 82, width: 260, height: 790 },
  back: { left: 635, top: 80, width: 360, height: 790 },
  interact: { left: 970, top: 70, width: 330, height: 800 },
  battle: { left: 1250, top: 180, width: 440, height: 690 },
  portrait: { left: 30, top: 90, width: 360, height: 390 },
};

const walkSources = {
  side: path.join(sourceRoot, 'shiwei-walk-side-source.png'),
  front: path.join(sourceRoot, 'shiwei-walk-front-source.png'),
  back: path.join(sourceRoot, 'shiwei-walk-back-source.png'),
};
const allowFallback = process.argv.includes('--allow-fallback');

async function chromaKey(input, extract) {
  let pipeline = sharp(input);
  if (extract) pipeline = pipeline.extract(extract);
  const image = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const mint = g > 150 && b > 130 && g - r > 7 && b - r > 2;
    const magenta = r > 185 && b > 165 && g < 110 && r - g > 80;
    if (mint || magenta) data[index + 3] = 0;
  }
  for (let pass = 0; pass < 2; pass += 1) {
    const alpha = Buffer.alloc(image.info.width * image.info.height);
    for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = data[pixel * 4 + 3];
    for (let y = 1; y < image.info.height - 1; y += 1) {
      for (let x = 1; x < image.info.width - 1; x += 1) {
        const pixel = y * image.info.width + x;
        const offset = pixel * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        if (!alpha[pixel] || g <= r + 6 || b <= r + 2) continue;
        if (!alpha[pixel - 1] || !alpha[pixel + 1]
          || !alpha[pixel - image.info.width] || !alpha[pixel + image.info.width]) {
          data[offset + 3] = 0;
        }
      }
    }
  }
  return sharp(data, {
    raw: { width: image.info.width, height: image.info.height, channels: 4 },
  }).png().toBuffer();
}

async function fitFrame(source, options) {
  const trimmed = await sharp(source).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const metadata = await sharp(trimmed).metadata();
  const maxHeight = options && options.maxHeight || 238;
  const maxWidth = options && options.maxWidth || 178;
  const scale = Math.min(maxWidth / metadata.width, maxHeight / metadata.height);
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = Math.max(1, Math.round(metadata.height * scale));
  const resized = await sharp(trimmed).resize(width, height).png().toBuffer();
  const bob = options && options.bob || 0;
  return sharp({
    create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{
    input: resized,
    left: Math.round((frameWidth - width) / 2),
    top: 244 - height + bob,
  }]).png().toBuffer();
}

async function detectWalkFigures(source) {
  const keyed = await chromaKey(source);
  const image = await sharp(keyed).raw().toBuffer({ resolveWithObject: true });
  const width = image.info.width;
  const height = image.info.height;
  const data = image.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const components = [];

  function isForeground(pixel) {
    return data[pixel * 4 + 3] > 32;
  }

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || !isForeground(start)) continue;
    let read = 0;
    let write = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    queue[write++] = start;
    visited[start] = 1;

    while (read < write) {
      const pixel = queue[read++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const neighbors = [];
      if (x > 0) neighbors.push(pixel - 1);
      if (x + 1 < width) neighbors.push(pixel + 1);
      if (y > 0) neighbors.push(pixel - width);
      if (y + 1 < height) neighbors.push(pixel + width);
      for (let index = 0; index < neighbors.length; index += 1) {
        const next = neighbors[index];
        if (visited[next] || !isForeground(next)) continue;
        visited[next] = 1;
        queue[write++] = next;
      }
    }

    if (write > 2000) {
      components.push({
        area: write,
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        pixels: queue.slice(0, write),
      });
    }
  }

  const widths = components.map((component) => component.width).sort((a, b) => a - b);
  const medianWidth = widths[Math.floor(widths.length / 2)] || 1;
  const separated = components.flatMap((component) => {
    const count = component.width > medianWidth * 1.45
      ? Math.max(2, Math.round(component.width / medianWidth))
      : 1;
    if (count === 1) return [component];
    return Array.from({ length: count }, (_, index) => {
      const left = component.left + Math.round(component.width * index / count);
      const right = component.left + Math.round(component.width * (index + 1) / count);
      return {
        area: Math.round(component.area / count),
        left,
        top: component.top,
        width: right - left,
        height: component.height,
        centerX: (left + right - 1) / 2,
        centerY: component.centerY,
        pixels: component.pixels,
      };
    });
  });
  const selected = separated
    .sort((a, b) => b.area - a.area)
    .slice(0, 8);
  const centerYs = selected.map((figure) => figure.centerY);
  const centerYRange = Math.max.apply(null, centerYs) - Math.min.apply(null, centerYs);
  const medianHeight = selected.map((figure) => figure.height).sort((a, b) => a - b)[Math.floor(selected.length / 2)];
  const figures = centerYRange > medianHeight * 0.5
    ? selected.sort((a, b) => {
      const rowA = a.centerY < (Math.min.apply(null, centerYs) + Math.max.apply(null, centerYs)) / 2 ? 0 : 1;
      const rowB = b.centerY < (Math.min.apply(null, centerYs) + Math.max.apply(null, centerYs)) / 2 ? 0 : 1;
      return rowA === rowB ? a.centerX - b.centerX : rowA - rowB;
    })
    : selected.sort((a, b) => a.centerX - b.centerX);
  if (figures.length !== 8) {
    throw new Error(`Expected 8 walk figures in ${source}, detected ${figures.length}.`);
  }
  return Promise.all(figures.map((bounds) => {
    const output = Buffer.alloc(bounds.width * bounds.height * 4);
    for (let index = 0; index < bounds.pixels.length; index += 1) {
      const pixel = bounds.pixels[index];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x < bounds.left || x >= bounds.left + bounds.width
        || y < bounds.top || y >= bounds.top + bounds.height) continue;
      const sourceOffset = pixel * 4;
      const targetOffset = ((y - bounds.top) * bounds.width + x - bounds.left) * 4;
      data.copy(output, targetOffset, sourceOffset, sourceOffset + 4);
    }
    return sharp(output, {
      raw: { width: bounds.width, height: bounds.height, channels: 4 },
    }).png().toBuffer();
  }));
}

async function walkFrames(direction, fallback) {
  const source = walkSources[direction];
  if (!fs.existsSync(source)) {
    if (!allowFallback) {
      throw new Error(`Missing formal ${direction} walk source: ${source}. Use --allow-fallback only for development previews.`);
    }
    return Promise.all([0, -2, 0, 2, 0, -2, 0, 2].map((bob) => fitFrame(fallback, { bob })));
  }
  const figures = await detectWalkFigures(source);
  return Promise.all(figures.map((figure) => fitFrame(figure, { maxHeight: 240, maxWidth: 184 })));
}

async function atlas(direction, base, interaction, hit) {
  const frames = [];
  const idleBobs = [0, -1, 0, 1];
  for (let index = 0; index < 4; index += 1) frames.push(await fitFrame(base, { bob: idleBobs[index] }));
  frames.push.apply(frames, await walkFrames(direction, base));
  for (let index = 0; index < 4; index += 1) frames.push(await fitFrame(interaction, { bob: index % 2 ? -1 : 0 }));
  for (let index = 0; index < 3; index += 1) frames.push(await fitFrame(hit, { bob: index }));

  const composites = frames.map((input, index) => ({
    input,
    left: (index % columns) * frameWidth,
    top: Math.floor(index / columns) * frameHeight,
  }));
  await sharp({
    create: {
      width: columns * frameWidth,
      height: 3 * frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites).png({ compressionLevel: 9 }).toFile(path.join(outputRoot, `explore-${direction}.png`));
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  const front = await chromaKey(anchorPath, crops.front);
  const side = await chromaKey(anchorPath, crops.side);
  const back = await chromaKey(anchorPath, crops.back);
  const interaction = await chromaKey(anchorPath, crops.interact);
  const battle = await chromaKey(anchorPath, crops.battle);

  await Promise.all([
    atlas('side', side, interaction, battle),
    atlas('front', front, front, battle),
    atlas('back', back, back, back),
    sharp(await chromaKey(anchorPath, crops.portrait))
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(192, 192, { fit: 'cover', position: 'north' })
      .webp({ quality: 86 })
      .toFile(path.join(outputRoot, 'portrait.webp')),
    sharp(battle)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 86, alphaQuality: 90 })
      .toFile(path.join(outputRoot, 'battle.webp')),
  ]);

  console.log(`Li Dazui runtime assets built in ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
