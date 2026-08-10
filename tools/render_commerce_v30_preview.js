'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'commerce-v30');
process.chdir(minigameRoot);

global.wx = {
  createImage() { return new canvasModule.Image(); },
  loadSubpackage(options) {
    options.success();
    return { onProgressUpdate(callback) { callback({ progress: 100 }); } };
  },
  getWindowInfo() {
    return { windowWidth: 844, windowHeight: 390, pixelRatio: 1, safeArea: { left: 0, top: 0, width: 844, height: 390 } };
  },
  getMenuButtonBoundingClientRect() {
    return { left: 776, right: 834, top: 8, bottom: 36, width: 58, height: 28 };
  },
};

const store = require(path.join(minigameRoot, 'src/core/store'));
const commerce = require(path.join(minigameRoot, 'src/world/commerce'));
const rendererModule = require(path.join(minigameRoot, 'src/render/canvas'));

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function renderState(name, configure) {
  const canvas = canvasModule.createCanvas(844, 390);
  const renderer = rendererModule.createRenderer(canvas);
  const state = store.freshState();
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'street';
  state.position = { x: 620, y: 310 };
  state.campaign.chapter = 8;
  state.toast = null;
  configure(state);
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
  await renderState('01-general-store.png', (state) => commerce.open(state, 'ma-goods'));
  await renderState('02-jewelry-shop.png', (state) => {
    state.characters.wuchen.recruited = true;
    state.characters.wuchen.innUnlocked = true;
    commerce.buy(state, 'wen-jewelry', 'peace-knot', 'zhangdeng');
    commerce.open(state, 'wen-jewelry');
  });
  await renderState('03-weapon-shop.png', (state) => {
    commerce.buy(state, 'han-armory', 'elm-ruler', 'zhangdeng');
    commerce.open(state, 'han-armory');
  });
  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
