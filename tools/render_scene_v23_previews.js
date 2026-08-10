'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const sceneV23 = require('../minigame/assets/art/scene-v23');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'outputs', 'product-design', 'scene-v23-audit');
const WIDTH = 844;
const SCENE_HEIGHT = 348;
const HUD_HEIGHT = 42;
const PHASES = ['morning', 'noon', 'evening'];

const FOCUS = {
  inn: [500, 320],
  yard: [390, 315],
  street: [560, 318],
  paper_mill: [580, 318],
  old_post: [840, 318],
  grain_market: [760, 320],
  merchant_alliance_hall: [1140, 320],
  old_ledger_vault: [1040, 320],
  jiangnan_branch: [570, 318],
  jiangnan_dock: [700, 320],
  river_market: [580, 320],
  jiangnan_spice_workshop: [1010, 320],
  old_banquet_kitchen: [650, 320]
};

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function mapById(id) {
  return content.maps.find((map) => map.id === id);
}

async function cropWorld(file, layer, camera) {
  const width = Math.round(layer.worldWidth);
  const height = Math.round(layer.worldHeight);
  const resized = sharp(file).resize(width, height, { fit: 'fill' });
  const top = Math.max(0, Math.round(-(layer.y || 0)));
  return resized.extract({ left: Math.round(camera), top, width: WIDTH, height: SCENE_HEIGHT }).png().toBuffer();
}

async function placeImage(file, width, height, left, top) {
  let image = await sharp(file).resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), { fit: 'fill' }).png().toBuffer();
  let metadata = await sharp(image).metadata();
  let sourceLeft = 0;
  let sourceTop = 0;
  let drawLeft = Math.round(left);
  let drawTop = Math.round(top);
  if (drawLeft < 0) { sourceLeft = -drawLeft; drawLeft = 0; }
  if (drawTop < 0) { sourceTop = -drawTop; drawTop = 0; }
  const visibleWidth = Math.min(metadata.width - sourceLeft, WIDTH - drawLeft);
  const visibleHeight = Math.min(metadata.height - sourceTop, SCENE_HEIGHT - drawTop);
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;
  if (sourceLeft || sourceTop || visibleWidth !== metadata.width || visibleHeight !== metadata.height) {
    image = await sharp(image).extract({ left: sourceLeft, top: sourceTop, width: visibleWidth, height: visibleHeight }).png().toBuffer();
  }
  return { input: image, left: drawLeft, top: drawTop };
}

async function roleItem(roleId, x, y, camera, height) {
  const art = manifest.characters[roleId];
  const atlas = runtimePath(art.atlases.side);
  const frame = await sharp(atlas).extract({ left: 0, top: 0, width: 192, height: 256 }).png().toBuffer();
  const drawHeight = height || 112;
  const scale = drawHeight / 256;
  return placeImage(frame, 192 * scale, drawHeight, x - art.pivot.x * scale - camera, y - art.pivot.y * scale);
}

async function scenePropItem(prop, camera) {
  const file = runtimePath(prop.src);
  if (!fs.existsSync(file)) return null;
  const metadata = await sharp(file).metadata();
  const scale = typeof prop.scale === 'number' ? prop.scale : 1;
  const width = typeof prop.width === 'number' ? prop.width : metadata.width * scale;
  const height = typeof prop.height === 'number' ? prop.height : metadata.height * scale;
  const drawX = prop.pivot ? prop.x - prop.pivot.x * (width / metadata.width) : prop.x;
  const drawY = prop.pivot ? prop.y - prop.pivot.y * (height / metadata.height) : prop.y;
  return placeImage(file, width, height, drawX - camera, drawY);
}

async function render(mapId, phase) {
  const map = mapById(mapId);
  const art = manifest.maps[mapId];
  const base = art.layers.find((layer) => !layer.v23 && layer.kind !== 'lighting');
  const light = art.layers.find((layer) => layer.kind === 'lighting' && layer.phase === phase);
  const focus = FOCUS[mapId] || [map.width / 2, 320];
  const camera = Math.max(0, Math.min(map.width - WIDTH, Math.round(focus[0] - WIDTH * 0.5)));
  const background = await cropWorld(runtimePath(base.src), base, camera);
  const sceneComposites = [{ input: background, left: 0, top: 0 }];
  const taskProps = (art.props || []).filter((prop) => prop.id && prop.id.indexOf('v23-task-') === 0);
  const representativeTask = taskProps[0];
  const items = (art.props || []).filter((prop) => {
    return !prop.id || prop.id.indexOf('v23-task-') !== 0 || prop === representativeTask;
  }).map((prop) => ({ kind: 'prop', sortY: prop.sortY || prop.y || 0, prop }));
  if (mapId === 'inn') items.push({ kind: 'npc', roleId: 'wuchen', sortY: 250, x: 430, y: 250 });
  items.push({ kind: 'hero', sortY: focus[1], x: focus[0] - 72, y: focus[1] });
  items.sort((a, b) => a.sortY - b.sortY);

  for (const item of items) {
    const composite = item.kind === 'hero'
      ? await roleItem('zhangdeng', item.x, item.y, camera, 112)
      : item.kind === 'npc'
        ? await roleItem(item.roleId, item.x, item.y, camera, 100)
        : await scenePropItem(item.prop, camera);
    if (composite) sceneComposites.push(composite);
  }
  if (light) {
    const lightCrop = await cropWorld(runtimePath(light.src), light, camera);
    sceneComposites.push({
      input: lightCrop,
      left: 0,
      top: 0,
      blend: light.blend === 'source-over' ? 'over' : (light.blend || 'over')
    });
  }

  const scene = await sharp({
    create: { width: WIDTH, height: SCENE_HEIGHT, channels: 4, background: { r: 36, g: 27, b: 23, alpha: 1 } }
  }).composite(sceneComposites).png().toBuffer();
  const hud = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="844" height="42"><rect width="844" height="42" fill="#2b211d"/><circle cx="22" cy="21" r="5" fill="#d7a84a"/><path d="M35 21 H220" stroke="#f1dfb6" stroke-opacity=".42" stroke-width="2"/><path d="M690 21 H818" stroke="#d7a84a" stroke-opacity=".55" stroke-width="2"/></svg>');
  const output = path.join(OUTPUT, mapId + '-' + phase + '.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp({
    create: { width: WIDTH, height: HUD_HEIGHT + SCENE_HEIGHT, channels: 4, background: { r: 43, g: 33, b: 29, alpha: 1 } }
  }).composite([{ input: hud, left: 0, top: 0 }, { input: scene, left: 0, top: HUD_HEIGHT }]).png({ compressionLevel: 9 }).toFile(output);
  return output;
}

async function renderContactSheet(packageName, mapIds) {
  const cellWidth = 422;
  const cellHeight = 195;
  const labelHeight = 24;
  const width = cellWidth * PHASES.length;
  const height = (cellHeight + labelHeight) * mapIds.length;
  const composites = [];
  for (let row = 0; row < mapIds.length; row += 1) {
    const mapId = mapIds[row];
    const label = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + labelHeight + '"><rect width="100%" height="100%" fill="#2b211d"/><text x="12" y="17" font-family="sans-serif" font-size="12" fill="#f1dfb6">' + mapId + '</text><text x="210" y="17" font-family="sans-serif" font-size="10" fill="#d7a84a">MORNING</text><text x="632" y="17" font-family="sans-serif" font-size="10" fill="#d7a84a">NOON</text><text x="1054" y="17" font-family="sans-serif" font-size="10" fill="#d7a84a">EVENING</text></svg>');
    composites.push({ input: label, left: 0, top: row * (cellHeight + labelHeight) });
    for (let column = 0; column < PHASES.length; column += 1) {
      const preview = path.join(OUTPUT, mapId + '-' + PHASES[column] + '.png');
      const image = await sharp(preview).resize(cellWidth, cellHeight, { fit: 'fill' }).png().toBuffer();
      composites.push({ input: image, left: column * cellWidth, top: row * (cellHeight + labelHeight) + labelHeight });
    }
  }
  const output = path.join(OUTPUT, 'contact-' + packageName + '.png');
  await sharp({ create: { width, height, channels: 4, background: { r: 30, g: 24, b: 21, alpha: 1 } } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
}

(async function main() {
  const outputs = [];
  const requestedMaps = process.env.SCENE_V23_MAPS
    ? process.env.SCENE_V23_MAPS.split(',').map((id) => id.trim()).filter((id) => sceneV23.mapPackages[id])
    : Object.keys(sceneV23.mapPackages);
  for (const mapId of requestedMaps) {
    for (const phase of PHASES) outputs.push(await render(mapId, phase));
  }
  const contacts = [];
  for (const packageName of Array.from(new Set(requestedMaps.map((id) => sceneV23.mapPackages[id])))) {
    const mapIds = requestedMaps.filter((id) => sceneV23.mapPackages[id] === packageName);
    contacts.push(await renderContactSheet(packageName, mapIds));
  }
  console.log(JSON.stringify({ previews: outputs.length, contacts: contacts.length, output: OUTPUT }));
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
