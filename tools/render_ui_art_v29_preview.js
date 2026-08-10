'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'ui-art-v29');
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
const dialogue = require(path.join(minigameRoot, 'src/dialogue/dialogue'));

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function renderState(name, configure) {
  const canvas = canvasModule.createCanvas(844, 390);
  const renderer = rendererModule.createRenderer(canvas);
  const state = store.freshState();
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'inn';
  state.position = { x: 520, y: 318 };
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
  await renderState('01-dialogue.png', (state) => {
    dialogue.open(state, 'late-letter-briefing');
    state.dialogue.revealed = true;
  });
  await renderState('02-party.png', (state) => {
    Object.keys(state.characters).forEach((id) => {
      state.characters[id].recruited = true;
      state.characters[id].innUnlocked = true;
    });
    state.party = ['zhangdeng', 'wuchen', 'jingzhi'];
    state.modal = { type: 'party' };
  });
  await renderState('03-task.png', (state) => {
    state.quest = { title: '迟到的驿信', text: '检查柜台账本，再去后院寻找断绳留下的线索。' };
    state.modal = { type: 'task' };
  });
  await renderState('04-character.png', (state) => {
    state.characters.wuchen.innUnlocked = true;
    state.characters.wuchen.recruited = true;
    state.innScene.activePage = 'character';
    state.managementView = 'character';
    state.managementRoleId = 'wuchen';
  });
  await renderState('05-toast-and-task-card.png', (state) => {
    state.quest = { title: '柜台的第一步', text: '靠近账本，查清这笔没有来路的货款。' };
    state.toast = '已取得线索：褪色的货签';
  });
  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
