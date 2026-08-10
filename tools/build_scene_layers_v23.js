'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const sceneV23 = require('../minigame/assets/art/scene-v23');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = process.env.SCENE_V23_SOURCE_ROOT || 'D:\\AI\\design-assets\\dengxia\\scene-v23\\source';
const FRAME_SIZE = 192;
const FRAME_BASELINE = 183;

const SHEETS = {
  core: {
    file: 'core-props-chroma-v23.png',
    names: ['ledger', 'notice-scroll', 'broken-rope', 'returned-dishes', 'spice-crate', 'lantern', 'road-plaque', 'ingredient-basket']
  },
  s1: {
    file: 's1-props-chroma-v23.png',
    names: ['fiber-basket', 'watermark-paper', 'paper-edge', 'old-letter', 'seal-press', 'marked-grain-crate', 'old-bronze-seal', 'burnt-ledger-page']
  },
  s2: {
    file: 's2-props-chroma-v23.png',
    names: ['spice-record', 'sealed-spice-sack', 'broken-seal-rope', 'workshop-ledger', 'charred-recipe', 'banquet-cauldron', 'inspection-lantern', 'seasoning-bowl']
  }
};

const PACKAGE_SHEETS = {
  'scene-core-v23': { core: SHEETS.core.names },
  'scene-s1-v23': { s1: SHEETS.s1.names, s2: ['inspection-lantern'] },
  'scene-s2-v23': { core: ['returned-dishes', 'spice-crate'], s2: SHEETS.s2.names }
};

const LAMPS = {
  inn: [[700, 170], [865, 270], [170, 250]],
  yard: [[145, 210], [790, 220]],
  street: [[175, 195], [610, 185], [1015, 190]],
  paper_mill: [[585, 145], [1020, 200]],
  old_post: [[335, 205], [1035, 190]],
  grain_market: [[230, 190], [655, 185], [1035, 190]],
  merchant_alliance_hall: [[710, 125], [1180, 190]],
  old_ledger_vault: [[1040, 210], [1280, 205]],
  jiangnan_branch: [[390, 215], [810, 235]],
  jiangnan_dock: [[285, 380], [730, 445], [1120, 390]],
  river_market: [[220, 355], [650, 420], [1070, 350]],
  jiangnan_spice_workshop: [[600, 360], [1060, 330]],
  old_banquet_kitchen: [[650, 390], [1050, 340]]
};

function ensureDirectory(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function mapById(id) {
  const found = content.maps.find((item) => item.id === id);
  if (!found) throw new Error('Unknown map: ' + id);
  return found;
}

function bounds(polygon) {
  const xs = polygon.map((point) => point[0]);
  const ys = polygon.map((point) => point[1]);
  return {
    left: Math.min.apply(Math, xs),
    top: Math.min.apply(Math, ys),
    right: Math.max.apply(Math, xs),
    bottom: Math.max.apply(Math, ys)
  };
}

function removeGreen(data, info) {
  let index;
  for (index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = info.channels > 3 ? data[index + 3] : 255;
    const maximumSide = Math.max(red, blue);
    const dominance = green - maximumSide;
    let factor = 1;
    if (green > 80 && dominance > 15) factor = Math.max(0, Math.min(1, (62 - dominance) / 47));
    if (green > 150 && dominance > 64) factor = 0;
    data[index + 1] = Math.min(green, maximumSide + 12);
    if (info.channels > 3) data[index + 3] = Math.round(alpha * factor);
  }
  return data;
}

async function keyedCell(sheetPath, cellIndex) {
  const metadata = await sharp(sheetPath).metadata();
  const cellWidth = Math.floor(metadata.width / 4);
  const cellHeight = Math.floor(metadata.height / 2);
  const left = (cellIndex % 4) * cellWidth;
  const top = Math.floor(cellIndex / 4) * cellHeight;
  const extracted = await sharp(sheetPath)
    .extract({ left, top, width: cellWidth, height: cellHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeGreen(extracted.data, extracted.info);
  return sharp(extracted.data, {
    raw: {
      width: extracted.info.width,
      height: extracted.info.height,
      channels: extracted.info.channels
    }
  }).png().toBuffer();
}

async function buildProp(sheetKey, name, output) {
  const sheet = SHEETS[sheetKey];
  const index = sheet.names.indexOf(name);
  if (index < 0) throw new Error('Unknown prop ' + sheetKey + '/' + name);
  const input = path.join(SOURCE_ROOT, sheet.file);
  if (!fs.existsSync(input)) throw new Error('Missing source sheet: ' + input);
  const transparent = await keyedCell(input, index);
  const trimmed = await sharp(transparent)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 3 })
    .png()
    .toBuffer();
  const fitted = await sharp(trimmed)
    .resize(165, 158, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const fittedMeta = await sharp(fitted).metadata();
  const left = Math.round((FRAME_SIZE - fittedMeta.width) / 2);
  const top = Math.max(0, FRAME_BASELINE - fittedMeta.height);
  ensureDirectory(output);
  await sharp({
    create: { width: FRAME_SIZE, height: FRAME_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: fitted, left, top }]).png({
    compressionLevel: 9,
    adaptiveFiltering: true,
    palette: true,
    quality: 92,
    colours: 256,
    dither: 0.72
  }).toFile(output);
}

function lightingSvg(width, height, mapId, phase) {
  const lamps = LAMPS[mapId] || [[width * 0.5, height * 0.55]];
  const glow = lamps.map((point, index) => (
    '<ellipse cx="' + point[0] + '" cy="' + point[1] + '" rx="' + Math.round(width * 0.095) + '" ry="' + Math.round(height * 0.22) + '" fill="url(#lamp' + index + ')"/>'
  )).join('');
  const lampDefs = lamps.map((point, index) => (
    '<radialGradient id="lamp' + index + '"><stop offset="0" stop-color="#ffd98a" stop-opacity=".66"/><stop offset=".42" stop-color="#efb34f" stop-opacity=".28"/><stop offset="1" stop-color="#d79a38" stop-opacity="0"/></radialGradient>'
  )).join('');
  if (phase === 'morning') {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe4a0" stop-opacity=".18"/><stop offset=".52" stop-color="#efc96d" stop-opacity=".07"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></linearGradient><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff1b0" stop-opacity=".18"/><stop offset="1" stop-color="#f1c76a" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><path d="M0 0 L' + Math.round(width * 0.32) + ' 0 L' + Math.round(width * 0.56) + ' ' + height + ' L' + Math.round(width * 0.22) + ' ' + height + ' Z" fill="url(#r)" opacity=".58"/></svg>';
  }
  if (phase === 'noon') {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff2c4" stop-opacity=".085"/><stop offset=".66" stop-color="#ffe6a2" stop-opacity=".025"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#n)"/></svg>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><defs><linearGradient id="e" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#102a3b" stop-opacity=".38"/><stop offset=".58" stop-color="#17384c" stop-opacity=".28"/><stop offset="1" stop-color="#172f3f" stop-opacity=".18"/></linearGradient><radialGradient id="path"><stop stop-color="#f0c878" stop-opacity=".16"/><stop offset="1" stop-color="#e8b75e" stop-opacity="0"/></radialGradient>' + lampDefs + '</defs><rect width="100%" height="100%" fill="url(#e)"/><ellipse cx="' + Math.round(width * 0.5) + '" cy="' + Math.round(height * 0.88) + '" rx="' + Math.round(width * 0.38) + '" ry="' + Math.round(height * 0.19) + '" fill="url(#path)"/>' + glow + '</svg>';
}

async function buildLighting(mapId, packageName, baseLayer, baseFile) {
  const metadata = await sharp(baseFile).metadata();
  const phases = ['morning', 'noon', 'evening'];
  for (const phase of phases) {
    const output = path.join(ROOT, 'minigame', 'subpackages', packageName, 'assets', 'art', 'maps', mapId, 'light-' + phase + '.webp');
    ensureDirectory(output);
    await sharp(Buffer.from(lightingSvg(metadata.width, metadata.height, mapId, phase)))
      .webp({ quality: 76, alphaQuality: 90, effort: 5 })
      .toFile(output);
  }
}

async function buildOccluder(mapId, packageName, baseLayer, baseFile, obstacle) {
  const metadata = await sharp(baseFile).metadata();
  const box = bounds(obstacle.polygon);
  const rise = typeof obstacle.occluderRise === 'number'
    ? obstacle.occluderRise
    : Math.min(86, Math.max(34, (box.bottom - box.top) * 0.9));
  const worldTop = Math.max(0, Math.floor(box.top - rise));
  const worldLeft = Math.floor(box.left);
  const worldWidth = Math.max(1, Math.ceil(box.right - box.left));
  const worldHeight = Math.max(1, Math.ceil(box.bottom - worldTop));
  const scaleX = metadata.width / baseLayer.worldWidth;
  const scaleY = metadata.height / baseLayer.worldHeight;
  const sourceLeft = Math.max(0, Math.round((worldLeft - (baseLayer.x || 0)) * scaleX));
  const sourceTop = Math.max(0, Math.round((worldTop - (baseLayer.y || 0)) * scaleY));
  const sourceWidth = Math.min(metadata.width - sourceLeft, Math.max(1, Math.round(worldWidth * scaleX)));
  const sourceHeight = Math.min(metadata.height - sourceTop, Math.max(1, Math.round(worldHeight * scaleY)));
  const output = path.join(ROOT, 'minigame', 'subpackages', packageName, 'assets', 'art', 'maps', mapId, 'props', 'occluder-' + obstacle.id + '.png');
  ensureDirectory(output);
  await sharp(baseFile)
    .extract({ left: sourceLeft, top: sourceTop, width: sourceWidth, height: sourceHeight })
    .ensureAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function buildMap(mapId, packageName) {
  const art = manifest.maps[mapId];
  const map = mapById(mapId);
  const baseLayer = art.layers.find((layer) => !layer.v23 && layer.kind !== 'lighting');
  if (!baseLayer) throw new Error('No base layer for ' + mapId);
  const baseFile = runtimePath(baseLayer.src);
  if (!fs.existsSync(baseFile)) throw new Error('Missing base art: ' + baseFile);
  await buildLighting(mapId, packageName, baseLayer, baseFile);
  for (const obstacle of map.obstacles || []) {
    if (obstacle.occludes === false) continue;
    await buildOccluder(mapId, packageName, baseLayer, baseFile, obstacle);
  }
}

async function main() {
  const report = { maps: [], props: [], sourceRoot: SOURCE_ROOT };
  for (const [packageName, groups] of Object.entries(PACKAGE_SHEETS)) {
    for (const [sheetKey, names] of Object.entries(groups)) {
      for (const name of names) {
        const output = path.join(ROOT, 'minigame', 'subpackages', packageName, 'assets', 'art', 'props', sheetKey, name + '.png');
        await buildProp(sheetKey, name, output);
        report.props.push(path.relative(ROOT, output));
      }
    }
  }
  for (const [mapId, packageName] of Object.entries(sceneV23.mapPackages)) {
    await buildMap(mapId, packageName);
    report.maps.push({ id: mapId, packageName });
  }
  const reportPath = path.join(ROOT, 'outputs', 'scene-v23-build-report.json');
  ensureDirectory(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ maps: report.maps.length, props: report.props.length, report: reportPath }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
