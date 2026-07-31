'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'screenshots');

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
const rendererModule = require(path.join(minigameRoot, 'src/render/canvas'));
const branches = require(path.join(minigameRoot, 'src/inn/branches'));

const canvas = canvasModule.createCanvas(844, 390);
const renderer = rendererModule.createRenderer(canvas);
const state = store.freshState();

branches.unlock(state, 'jiangnan');
branches.switchTo(state, 'jiangnan');
state.screen = 'explore';
state.mode = 'explore';
state.mapId = 'jiangnan_branch';
state.spawnId = 'recovery';
state.position = { x: 340, y: 286 };
state.flags['c09-complete'] = true;
state.flags['c10-started'] = true;
state.quest = { title: '水巷开张', text: '检查客房、灶台和停业账目。' };
state.toast = null;

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-01-branch.png'), canvas.toBuffer('image/png'));

  state.mapId = 'jiangnan_dock';
  state.position = { x: 700, y: 292 };
  state.flags['c09-started'] = true;
  state.quest = { title: '一船南下', text: '检查码头上散落的香料箱。' };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-02-dock.png'), canvas.toBuffer('image/png'));

  state.mapId = 'river_market';
  state.position = { x: 900, y: 294 };
  state.flags['c09-started'] = true;
  state.flags['c09-crates-checked'] = true;
  state.flags['c09-market-checked'] = true;
  state.flags['c09-shiwei-met'] = false;
  state.quest = { title: '一船南下', text: '询问临时灶台旁的火工厨师。' };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-03-river-market.png'), canvas.toBuffer('image/png'));

  state.mapId = 'rain_ferry';
  state.position = { x: 930, y: 294 };
  state.flags['c09-shiwei-met'] = true;
  state.flags['c09-manifest-proof'] = true;
  state.quest = { title: '雨夜改泊', text: '逼近调包船伙，夺回香料箱。' };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-04-rain-ferry.png'), canvas.toBuffer('image/png'));

  state.screen = 'inn';
  state.mode = 'manage';
  state.mapId = 'jiangnan_branch';
  state.calendar.phase = 'morning';
  state.managementPage = 'today';
  state.managementView = 'scene';
  ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'].forEach((id) => {
    state.characters[id].innUnlocked = true;
  });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-05-management.png'), canvas.toBuffer('image/png'));

  state.managementView = 'counter';
  renderer.render(state);
  await delay(220);
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-06-management-counter.png'), canvas.toBuffer('image/png'));

  state.managementView = 'kitchen';
  renderer.render(state);
  await delay(220);
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-07-management-kitchen.png'), canvas.toBuffer('image/png'));

  state.managementView = 'rooms';
  renderer.render(state);
  await delay(220);
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-08-management-rooms.png'), canvas.toBuffer('image/png'));

  state.managementView = 'notice';
  renderer.render(state);
  await delay(220);
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-09-management-notice.png'), canvas.toBuffer('image/png'));

  state.managementView = 'character';
  state.managementRoleId = 'shiwei';
  renderer.render(state);
  await delay(220);
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, 'season2-10-management-character.png'), canvas.toBuffer('image/png'));

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
