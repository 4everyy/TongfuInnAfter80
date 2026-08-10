'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const world = require('../minigame/src/world/explore');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'outputs', 'product-design', 'character-fit-audit');
const WIDTH = 844;
const HEIGHT = 348;

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function bounds(polygon) {
  const xs = polygon.map((point) => point[0]);
  const ys = polygon.map((point) => point[1]);
  return { left: Math.min.apply(null, xs), top: Math.min.apply(null, ys), right: Math.max.apply(null, xs), bottom: Math.max.apply(null, ys) };
}

function depthScale(map, y) {
  const all = [].concat.apply([], map.walkable || []);
  const ys = all.map((point) => point[1]);
  const minimum = Math.min.apply(null, ys);
  const maximum = Math.max.apply(null, ys);
  const ratio = Math.max(0, Math.min(1, (y - minimum) / Math.max(1, maximum - minimum)));
  return 0.88 + 0.16 * ratio;
}

async function worldBackground(base) {
  return sharp(runtimePath(base.src))
    .resize(Math.round(base.worldWidth), Math.round(base.worldHeight), { fit: 'fill' })
    .png()
    .toBuffer();
}

async function clippedPlacement(input, left, top, viewportWidth, viewportHeight) {
  let image = input;
  const metadata = await sharp(image).metadata();
  let sourceLeft = 0;
  let sourceTop = 0;
  let drawLeft = Math.round(left);
  let drawTop = Math.round(top);
  if (drawLeft < 0) { sourceLeft = -drawLeft; drawLeft = 0; }
  if (drawTop < 0) { sourceTop = -drawTop; drawTop = 0; }
  const width = Math.min(metadata.width - sourceLeft, viewportWidth - drawLeft);
  const height = Math.min(metadata.height - sourceTop, viewportHeight - drawTop);
  if (width <= 0 || height <= 0) return null;
  if (sourceLeft || sourceTop || width !== metadata.width || height !== metadata.height) {
    image = await sharp(image).extract({ left: sourceLeft, top: sourceTop, width, height }).png().toBuffer();
  }
  return { input: image, left: drawLeft, top: drawTop };
}

async function resizedPlacement(file, width, height, left, top) {
  const image = await sharp(file).resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), { fit: 'fill' }).png().toBuffer();
  return clippedPlacement(image, left, top, WIDTH, HEIGHT);
}

async function shadowPlacement(x, y, width, alpha, camera) {
  if (alpha <= 0) return null;
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(width) + '" height="14"><ellipse cx="50%" cy="7" rx="48%" ry="5" fill="#211a16" fill-opacity="' + alpha + '"/></svg>');
  return clippedPlacement(svg, x - width / 2 - camera, y - 7, WIDTH, HEIGHT);
}

async function rolePlacement(roleId, x, y, map, camera, npc) {
  const art = manifest.characters[roleId];
  const frameSize = art.frameSize || { width: 192, height: 256 };
  const atlas = runtimePath(art.atlases.side);
  const frame = await sharp(atlas).extract({ left: 0, top: 0, width: frameSize.width, height: frameSize.height }).png().toBuffer();
  const sceneScale = Number(manifest.maps[map.id].characterScale) || 1;
  const displayScale = Number(npc && npc.displayScale) || Number(art.displayScale) || 1;
  const height = (npc ? 104 : 112) * depthScale(map, y) * displayScale * sceneScale;
  const scale = height / frameSize.height;
  const pivot = art.pivot || { x: frameSize.width / 2, y: frameSize.height };
  return resizedPlacement(frame, frameSize.width * scale, height, x - pivot.x * scale - camera, y - pivot.y * scale);
}

async function npcPlacement(npc, map, camera) {
  if (npc.roleId) return rolePlacement(npc.roleId, npc.x, npc.y, map, camera, npc);
  const art = manifest.npcs[npc.artId];
  const source = runtimePath(art.atlas || art.sprite);
  const metadata = await sharp(source).metadata();
  const sceneScale = Number(manifest.maps[map.id].characterScale) || 1;
  const height = 104 * depthScale(map, npc.y) * (Number(npc.displayScale) || Number(art.displayScale) || 1) * sceneScale;
  const scale = height / metadata.height;
  const pivot = art.pivot || { x: metadata.width / 2, y: metadata.height };
  return resizedPlacement(source, metadata.width * scale, height, npc.x - pivot.x * scale - camera, npc.y - pivot.y * scale);
}

async function propPlacement(prop, camera) {
  const file = runtimePath(prop.src);
  if (!fs.existsSync(file)) return null;
  const metadata = await sharp(file).metadata();
  const scale = Number(prop.scale) || 1;
  const width = Number(prop.width) || metadata.width * scale;
  const height = Number(prop.height) || metadata.height * scale;
  const x = prop.pivot ? prop.x - prop.pivot.x * width / metadata.width : prop.x;
  const y = prop.pivot ? prop.y - prop.pivot.y * height / metadata.height : prop.y;
  return resizedPlacement(file, width, height, x - camera, y);
}

function occluderBounds(obstacle) {
  if (obstacle.occluderPolygon) return bounds(obstacle.occluderPolygon);
  const box = bounds(obstacle.polygon);
  const rise = Number.isFinite(obstacle.occluderRise)
    ? obstacle.occluderRise
    : Math.min(86, Math.max(34, (box.bottom - box.top) * 0.9));
  return { left: box.left, right: box.right, top: Math.max(0, box.top - rise), bottom: box.bottom };
}

function nearestWalkable(map, target) {
  for (let radius = 0; radius <= 160; radius += 8) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const point = { x: target.x + Math.cos(angle) * radius, y: target.y + Math.sin(angle) * radius };
      if (world.isWalkable(map, point)) return point;
    }
  }
  return map.spawns.main;
}

async function renderMap(map) {
  const art = manifest.maps[map.id];
  const base = art.layers.find((layer) => !layer.v23 && layer.kind !== 'lighting');
  const worldImage = await worldBackground(base);
  const focusX = map.npcs.length
    ? map.npcs.reduce((sum, npc) => sum + npc.x, 0) / map.npcs.length
    : map.spawns.main.x;
  const camera = Math.max(0, Math.min(map.width - WIDTH, Math.round(focusX - WIDTH / 2)));
  const sourceTop = Math.max(0, Math.round(-(base.y || 0)));
  const background = await sharp(worldImage).extract({ left: camera, top: sourceTop, width: WIDTH, height: HEIGHT }).png().toBuffer();
  const items = [];
  const linked = {};
  let sequence = 0;

  (art.props || []).filter((prop) => prop.obstacleId || prop.ambient || prop.populationV26).forEach((prop) => {
    if (prop.obstacleId) linked[prop.obstacleId] = true;
    items.push({ kind: 'prop', source: prop, sortY: Number(prop.sortY) || Number(prop.y) || 0, sequence: sequence++ });
  });
  (map.obstacles || []).forEach((obstacle) => {
    if (linked[obstacle.id] || obstacle.occludes === false) return;
    const box = bounds(obstacle.polygon);
    items.push({ kind: 'baked', source: obstacle, sortY: Number(obstacle.sortY) || box.bottom, sequence: sequence++ });
  });
  map.npcs.forEach((npc) => items.push({ kind: 'npc', source: npc, sortY: Number(npc.sortY) || npc.y, sequence: sequence++ }));
  const heroTarget = map.npcs.length
    ? { x: focusX - 110, y: map.npcs[0].y + 24 }
    : map.spawns.main;
  const hero = nearestWalkable(map, heroTarget);
  items.push({ kind: 'hero', x: hero.x, y: hero.y, sortY: hero.y, sequence: sequence++ });
  items.sort((a, b) => a.sortY - b.sortY || a.sequence - b.sequence);

  const composites = [{ input: background, left: 0, top: 0 }];
  for (const item of items) {
    let placement = null;
    if (item.kind === 'prop') placement = await propPlacement(item.source, camera);
    if (item.kind === 'baked') {
      const box = occluderBounds(item.source);
      const width = Math.max(1, Math.round(box.right - box.left));
      const height = Math.max(1, Math.round(box.bottom - box.top));
      const crop = await sharp(worldImage).extract({ left: Math.round(box.left), top: Math.round(box.top - (base.y || 0)), width, height }).png().toBuffer();
      placement = await clippedPlacement(crop, box.left - camera, box.top, WIDTH, HEIGHT);
    }
    if (item.kind === 'npc') {
      const artDef = item.source.roleId ? manifest.characters[item.source.roleId] : manifest.npcs[item.source.artId];
      const alpha = Number(item.source.shadowAlpha);
      const shadow = await shadowPlacement(item.source.x, item.source.y, 38 * (Number(artDef.shadowScale) || 1), Number.isFinite(alpha) ? alpha : Number(artDef.shadowAlpha) || 0.12, camera);
      if (shadow) composites.push(shadow);
      placement = await npcPlacement(item.source, map, camera);
    }
    if (item.kind === 'hero') {
      const shadow = await shadowPlacement(item.x, item.y, 42, 0.13, camera);
      if (shadow) composites.push(shadow);
      placement = await rolePlacement('zhangdeng', item.x, item.y, map, camera, null);
    }
    if (placement) composites.push(placement);
  }

  const output = path.join(OUTPUT, map.id + '.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: '#2b211d' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
}

async function contactSheet(files, index) {
  const cellWidth = 422;
  const cellHeight = 174;
  const columns = 2;
  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (let i = 0; i < files.length; i += 1) {
    const image = await sharp(files[i]).resize(cellWidth, cellHeight, { fit: 'fill' }).png().toBuffer();
    composites.push({ input: image, left: i % columns * cellWidth, top: Math.floor(i / columns) * cellHeight });
  }
  const output = path.join(OUTPUT, 'contact-' + String(index + 1).padStart(2, '0') + '.png');
  await sharp({ create: { width: cellWidth * columns, height: cellHeight * rows, channels: 4, background: '#2b211d' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
}

(async function main() {
  const files = [];
  for (const map of content.maps) files.push(await renderMap(map));
  const contacts = [];
  for (let index = 0; index < files.length; index += 8) contacts.push(await contactSheet(files.slice(index, index + 8), contacts.length));
  console.log(JSON.stringify({ maps: files.length, contacts: contacts.length, output: OUTPUT }));
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
