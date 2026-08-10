'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = 'D:\\AI\\design-assets\\dengxia\\npc-population-v26\\sources';
const OUTPUT_ROOT = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26', 'assets', 'art', 'npcs');
const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 256;
const FOOT_Y = 244;

const GROUPS = {
  a: [
    'herbalist-qiu', 'opera-lady-su', 'coppersmith-han',
    'noodle-vendor-ma', 'porter-alu', 'storyteller-shen',
    'seamstress-wen', 'umbrella-maker-luo', 'courier-aqi'
  ],
  b: [
    'salt-merchant-xu', 'grain-inspector-lin', 'boatwoman-he',
    'ticket-clerk-fang', 'scale-mender-ge', 'spice-broker-rong',
    'warehouse-foreman-dou', 'scribe-pei', 'caravan-matriarch-shao'
  ],
  c: [
    'bridge-mason-zhao', 'woodcutter-yun', 'ferryman-wu',
    'boat-tracker-qiao', 'paper-apprentice-mo', 'night-watchman-lai',
    'retired-guard-cao', 'cartwright-lu', 'fisherman-jiang'
  ],
  d: [
    'physician-ning', 'fortune-reader-yan', 'runaway-apprentice-tang',
    'debt-collector-xiao', 'refugee-father-gu', 'tea-picker-qing',
    'cook-helper-pang', 'locksmith-qi', 'map-seller-ye'
  ]
};

function keyedAlpha(buffer, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const red = buffer[offset];
    const green = buffer[offset + 1];
    const blue = buffer[offset + 2];
    const distance = Math.sqrt((255 - red) ** 2 + green ** 2 + (255 - blue) ** 2);
    let alpha = buffer[offset + 3];
    const magentaBias = red + blue - green * 2;
    if (distance < 66 || (red > 168 && blue > 150 && green < 132 && magentaBias > 172)) alpha = 0;
    else if (distance < 132 || (red > 140 && blue > 132 && magentaBias > 118)) {
      const distanceAlpha = Math.max(0, Math.min(255, Math.round((distance - 66) / 66 * 255)));
      const biasAlpha = Math.max(0, Math.min(255, Math.round((220 - magentaBias) / 102 * 255)));
      alpha = Math.min(alpha, distanceAlpha, biasAlpha);
    }
    if (alpha > 0 && red > green * 1.35 && blue > green * 1.3) {
      const neutral = Math.max(green, Math.round((red + blue + green) / 4));
      buffer[offset] = Math.min(red, neutral);
      buffer[offset + 2] = Math.min(blue, neutral);
    }
    buffer[offset + 3] = alpha;
    if (alpha > 18) {
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('No foreground subject detected');
  return { buffer, bounds: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}

async function buildGroup(groupId, ids) {
  const source = path.join(SOURCE_ROOT, 'group-' + groupId + '.png');
  if (!fs.existsSync(source)) throw new Error('Missing NPC source sheet: ' + source);
  const metadata = await sharp(source).metadata();
  const result = [];
  for (let index = 0; index < ids.length; index += 1) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const left = Math.floor(column * metadata.width / 3);
    const top = Math.floor(row * metadata.height / 3);
    const right = Math.floor((column + 1) * metadata.width / 3);
    const bottom = Math.floor((row + 1) * metadata.height / 3);
    const raw = await sharp(source)
      .extract({ left, top, width: right - left, height: bottom - top })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const keyed = keyedAlpha(raw.data, raw.info.width, raw.info.height);
    const subject = await sharp(keyed.buffer, { raw: raw.info })
      .extract(keyed.bounds)
      .resize({ width: 174, height: 236, fit: 'inside', withoutEnlargement: false })
      .png({ compressionLevel: 9, palette: true, quality: 92 })
      .toBuffer({ resolveWithObject: true });
    const x = Math.round((FRAME_WIDTH - subject.info.width) / 2);
    const y = FOOT_Y - subject.info.height;
    const destination = path.join(OUTPUT_ROOT, ids[index] + '.png');
    await sharp({
      create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: subject.data, left: x, top: y }])
      .png({ compressionLevel: 9, palette: true, quality: 92 })
      .toFile(destination);
    result.push({ id: ids[index], source: path.basename(source), cell: index, width: subject.info.width, height: subject.info.height });
  }
  return result;
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const built = [];
  for (const groupId of Object.keys(GROUPS)) {
    built.push.apply(built, await buildGroup(groupId, GROUPS[groupId]));
  }
  const report = {
    count: built.length,
    frame: { width: FRAME_WIDTH, height: FRAME_HEIGHT, footY: FOOT_Y },
    items: built
  };
  fs.writeFileSync(path.join(OUTPUT_ROOT, 'build-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ count: built.length, output: OUTPUT_ROOT }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
