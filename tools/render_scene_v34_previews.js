'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'scene-v34-runtime');

process.chdir(minigameRoot);
global.wx = {
  createImage() { return new canvasModule.Image(); },
  loadSubpackage(options) { options.success(); return { onProgressUpdate(callback) { callback({ progress: 100 }); } }; },
  getWindowInfo() { return { windowWidth: 844, windowHeight: 390, pixelRatio: 1, safeArea: { left: 0, top: 0, width: 844, height: 390 } }; },
  getMenuButtonBoundingClientRect() { return { left: 776, right: 834, top: 8, bottom: 36, width: 58, height: 28 }; }
};

const content = require(path.join(minigameRoot, 'data/content'));
const store = require(path.join(minigameRoot, 'src/core/store'));
const rendererModule = require(path.join(minigameRoot, 'src/render/canvas'));
const world = require(path.join(minigameRoot, 'src/world/explore'));
const canvas = canvasModule.createCanvas(844, 390);
const renderer = rendererModule.createRenderer(canvas);

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function renderMap(map, index) {
  const state = store.freshState();
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = map.id;
  state.spawnId = 'main';
  state.position = { x: map.spawns.main.x, y: map.spawns.main.y };
  state.flags.doorwayDisturbanceResolved = true;
  state.flags['mission-accepted'] = true;
  state.toast = null;
  state.quest = { title: map.name, text: '场景、人物与交互校准预览。' };
  world.syncMapAccess(state);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(30);
  }
  renderer.render(state);
  const name = String(index + 1).padStart(2, '0') + '-' + map.id + '.png';
  const file = path.join(outputRoot, name);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  return { id: map.id, file };
}

async function contactSheet(items, page) {
  const selected = items.slice(page * 9, page * 9 + 9);
  const layers = [];
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const thumb = await sharp(item.file).resize(480, 222, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer();
    const x = index % 3 * 500;
    const y = Math.floor(index / 3) * 260;
    layers.push({ input: thumb, left: x, top: y + 28 });
    layers.push({ input: Buffer.from(`<svg width="480" height="28"><rect width="480" height="28" fill="#241b16"/><text x="12" y="20" fill="#f7e7c4" font-size="16" font-family="sans-serif">${item.id}</text></svg>`), left: x, top: y });
  }
  const output = path.join(outputRoot, 'contact-' + (page + 1) + '.jpg');
  await sharp({ create: { width: 1480, height: 770, channels: 3, background: '#3a302a' } }).composite(layers).jpeg({ quality: 90 }).toFile(output);
  return output;
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  const items = [];
  for (let index = 0; index < content.maps.length; index += 1) items.push(await renderMap(content.maps[index], index));
  const contacts = [];
  for (let page = 0; page < 3; page += 1) contacts.push(await contactSheet(items, page));
  console.log(JSON.stringify({ maps: items.length, contacts }, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
