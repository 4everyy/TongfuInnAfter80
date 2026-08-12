'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceRoot = process.env.SHIWEI_SOURCE_ROOT
  || 'D:\\AI\\design-assets\\dengxia\\season2-ch910\\sources';
const runtimeRoot = path.join(root, 'minigame', 'subpackages', 's2ch910', 'assets', 'art', 'characters', 'shiwei');
const directions = ['side', 'front', 'back'];
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 16) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function validateDirection(direction) {
  const source = path.join(sourceRoot, `shiwei-walk-${direction}-source.png`);
  const atlas = path.join(runtimeRoot, `explore-${direction}.png`);
  assert(fs.existsSync(source), `缺少${direction}正式步态源图`);
  assert(fs.existsSync(atlas), `缺少${direction}运行图集`);
  if (!fs.existsSync(source) || !fs.existsSync(atlas)) return;

  const metadata = await sharp(atlas).metadata();
  assert(metadata.width === 1536 && metadata.height === 768, `${direction}图集尺寸应为1536x768`);
  assert(metadata.hasAlpha, `${direction}图集缺少Alpha通道`);

  const bounds = [];
  const fingerprints = new Set();
  for (let clipIndex = 0; clipIndex < 8; clipIndex += 1) {
    const frameIndex = clipIndex + 4;
    const frame = await sharp(atlas)
      .extract({
        left: (frameIndex % 8) * 192,
        top: Math.floor(frameIndex / 8) * 256,
        width: 192,
        height: 256,
      })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const frameBounds = alphaBounds(frame, 192, 256);
    assert(frameBounds, `${direction}行走第${clipIndex + 1}帧为空`);
    if (!frameBounds) continue;
    bounds.push(frameBounds);

    let hash = 2166136261;
    for (let offset = 3; offset < frame.length; offset += 16) {
      hash ^= frame[offset];
      hash = Math.imul(hash, 16777619);
    }
    fingerprints.add(hash >>> 0);
  }

  if (!bounds.length) return;
  const bottoms = bounds.map((item) => item.maxY);
  const heights = bounds.map((item) => item.height);
  const bottomDrift = Math.max.apply(null, bottoms) - Math.min.apply(null, bottoms);
  const heightDrift = (Math.max.apply(null, heights) - Math.min.apply(null, heights))
    / Math.max.apply(null, heights);
  assert(bottomDrift <= 2, `${direction}脚底基线漂移${bottomDrift}px，超过2px`);
  assert(heightDrift <= 0.02, `${direction}人物高度漂移${(heightDrift * 100).toFixed(1)}%，超过2%`);
  assert(fingerprints.size >= 6, `${direction}八帧动作差异不足，疑似使用浮动占位`);
}

async function main() {
  for (let index = 0; index < directions.length; index += 1) {
    await validateDirection(directions[index]);
  }
  if (errors.length) {
    errors.forEach((error) => console.error('ERROR:', error));
    process.exit(1);
  }
  console.log('Li Dazui animation validation passed: formal sources, alpha, 8-frame motion, baseline and scale.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
