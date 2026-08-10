'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'inn-v18-audit');

process.chdir(minigameRoot);

let viewportWidth = 844;
let viewportHeight = 390;

global.wx = {
  createImage() { return new canvasModule.Image(); },
  loadSubpackage(options) {
    options.success();
    return { onProgressUpdate(callback) { callback({ progress: 100 }); } };
  },
  getWindowInfo() {
    return {
      windowWidth: viewportWidth,
      windowHeight: viewportHeight,
      pixelRatio: 1,
      safeArea: { left: 0, top: 0, width: viewportWidth, height: viewportHeight },
    };
  },
  getMenuButtonBoundingClientRect() {
    return { left: viewportWidth - 68, right: viewportWidth - 10, top: 8, bottom: 36, width: 58, height: 28 };
  },
};

const store = require(path.join(minigameRoot, 'src/core/store'));
const rendererModule = require(path.join(minigameRoot, 'src/render/canvas'));
const scene = require(path.join(minigameRoot, 'src/inn/scene-interactions'));
const management = require(path.join(minigameRoot, 'src/inn/inn'));
const branches = require(path.join(minigameRoot, 'src/inn/branches'));

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

function resetSceneUi() {
  state.innScene.selectedObjectId = null;
  state.innScene.activePage = null;
  state.innScene.microGame = null;
  state.innScene.serviceOpen = false;
  state.modal = null;
  state.dialogue = null;
  state.toast = null;
}

async function renderResponsive(name, width, height) {
  viewportWidth = width;
  viewportHeight = height;
  const responsiveCanvas = canvasModule.createCanvas(width, height);
  const responsiveRenderer = rendererModule.createRenderer(responsiveCanvas);
  const responsiveState = store.freshState();
  responsiveState.screen = 'explore';
  responsiveState.mode = 'explore';
  responsiveState.mapId = 'inn';
  responsiveState.position = { x: 520, y: 318 };
  responsiveState.toast = null;
  scene.dispatch(responsiveState, { type: 'innObjectSelect', id: 'changfeng-counter' });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    responsiveRenderer.render(responsiveState);
    if (responsiveRenderer.readyFor(responsiveState)) break;
    await delay(35);
  }
  responsiveRenderer.render(responsiveState);
  fs.writeFileSync(path.join(outputRoot, name), responsiveCanvas.toBuffer('image/png'));
  viewportWidth = 844;
  viewportHeight = 390;
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'inn';
  state.position = { x: 520, y: 318 };
  resetSceneUi();
  await renderTo('01-inn-single-attention.png');

  scene.dispatch(state, { type: 'innObjectSelect', id: 'changfeng-counter' });
  await renderTo('02-counter-unified-actions.png');

  resetSceneUi();
  scene.dispatch(state, { type: 'innObjectSelect', id: 'changfeng-pantry' });
  scene.dispatch(state, { type: 'innObjectAction', id: 'purchase' });
  await renderTo('03-purchase-microgame.png');

  resetSceneUi();
  state.campaign.chapter = 3;
  state.campaign.chapterDay = 1;
  state.flags['c03-started'] = true;
  state.episodes.pendingId = null;
  management.dispatch(state, { type: 'startShift' });
  const serviceRole = scene.serviceObjectRole(state);
  const serviceObject = scene.objects(state).find((item) => item.role === serviceRole);
  scene.dispatch(state, { type: 'innObjectSelect', id: serviceObject.id });
  await renderTo('04-noon-object-task.png');

  resetSceneUi();
  branches.unlock(state, 'jiangnan');
  branches.switchTo(state, 'jiangnan');
  state.calendar.phase = 'morning';
  state.worldTime.phase = 'morning';
  state.mapId = 'jiangnan_branch';
  state.position = { x: 340, y: 286 };
  state.flags['c09-complete'] = true;
  state.flags['c10-started'] = true;
  await renderTo('05-jiangnan-single-attention.png');

  scene.dispatch(state, { type: 'innObjectSelect', id: 'jiangnan-stove' });
  await renderTo('06-jiangnan-stove-actions.png');

  await renderResponsive('07-standard-16x9.png', 693, 390);
  await renderResponsive('08-ultrawide.png', 960, 390);

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
