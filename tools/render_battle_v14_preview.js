'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'battle-v17-audit');

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
const combat = require(path.join(minigameRoot, 'src/combat/battle'));
const campaign = require(path.join(minigameRoot, 'src/core/campaign'));

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
  campaign.addTemporaryFollower(state, 'wuchen', '战斗界面预览');
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'yard';
  state.position = { x: 280, y: 292 };
  combat.start(state, 'bridge_ruffians');
  state.battle.turn = { side: 'party', unit: state.battle.party[0] };
  state.battle.queue = [];
  combat.action(state, 'attack');
  await renderTo('01-target-selection.png');

  combat.selectTarget(state, state.battle.enemies[1].id);
  state.battle.turn = { side: 'enemy', unit: state.battle.enemies[0] };
  state.battle.warning = {
    sourceId: state.battle.enemies[0].id,
    targetIds: [state.battle.party[1].id],
    name: '沉肩冲撞',
    style: 'heavy',
    estimated: 18,
  };
  state.battle.log = '灰衣匪徒正在蓄势：“沉肩冲撞”。';
  await renderTo('02-enemy-warning.png');

  state.battle.warning = null;
  state.battle.turn = { side: 'party', unit: state.battle.party[0] };
  state.battle.inspect = { side: 'party', id: state.battle.party[1].id };
  state.battle.party[1].shield = 14;
  state.battle.party[1].focus = 6;
  await renderTo('03-status-details.png');

  state.battle = null;
  combat.start(state, 'bridge_ruffians');
  state.battle.turn = { side: 'party', unit: state.battle.party[0] };
  state.battle.queue = [];
  state.battle.enemies[0].hp = 0;
  state.battle.enemies[1].hp = 1;
  combat.action(state, 'attack', 0, state.battle.enemies[1].id);
  await delay(1120);
  await renderTo('04-victory-links.png');

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
