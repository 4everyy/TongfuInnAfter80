'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'exploration-v13-audit');

process.chdir(minigameRoot);

global.wx = {
  createImage() { return new canvasModule.Image(); },
  loadSubpackage(options) {
    options.success();
    return { onProgressUpdate(callback) { callback({ progress: 100 }); } };
  },
  getWindowInfo() {
    return {
      windowWidth: 844,
      windowHeight: 390,
      pixelRatio: 1,
      safeArea: { left: 0, top: 0, width: 844, height: 390 },
    };
  },
  getMenuButtonBoundingClientRect() {
    return { left: 776, right: 834, top: 8, bottom: 36, width: 58, height: 28 };
  },
};

const store = require(path.join(minigameRoot, 'src/core/store'));
const rendererModule = require(path.join(minigameRoot, 'src/render/canvas'));
const dialogue = require(path.join(minigameRoot, 'src/dialogue/dialogue'));
const world = require(path.join(minigameRoot, 'src/world/explore'));

const canvas = canvasModule.createCanvas(844, 390);
const renderer = rendererModule.createRenderer(canvas);
const state = store.freshState();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderTo(name) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(35);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, name), canvas.toBuffer('image/png'));
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'inn';
  state.position = { x: 520, y: 318 };
  state.toast = null;
  world.syncQuest(state);
  await renderTo('01-inn-hotspot.png');

  state.mapId = 'street';
  state.position = { x: 752, y: 248 };
  state.toast = null;
  world.syncMapAccess(state);
  await renderTo('02-locked-exit.png');

  state.flags.doorwayDisturbanceResolved = true;
  world.syncMapAccess(state);
  state.mapId = 'locust_lane';
  state.position = { x: 410, y: 280 };
  state.quest = { title: '镇内自由调查', text: '公共区域已经开放，剧情线索仍需主动调查。' };
  await renderTo('03-town-open.png');

  state.mapId = 'inn';
  state.position = { x: 690, y: 318 };
  state.flags['mission-accepted'] = false;
  dialogue.open(state, 'late-letter-briefing');
  state.dialogue.revealed = true;
  await renderTo('04-storybook-dialogue.png');

  state.dialogue = null;
  state.settings = { worldDebug: true };
  state.position = { x: 520, y: 318 };
  await renderTo('05-collision-debug.png');

  state.settings = { worldDebug: false };
  state.modal = { type: 'task' };
  await renderTo('06-task-page.png');

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
