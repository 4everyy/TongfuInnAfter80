'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'wechat-devtools', 'season2-ch11');

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
const cookingTrials = require(path.join(minigameRoot, 'src/inn/cooking-trials'));
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
    await delay(40);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, name), canvas.toBuffer('image/png'));
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });

  state.screen = 'title';
  state.mode = 'manage';
  await renderTo('01-single-entry-title.png');

  campaign.setStage(state, 'shiwei', 'cooperating', 'preview');
  state.party = ['zhangdeng', 'shiwei'];
  state.characters.shiwei.inParty = true;
  state.flags['c10-complete'] = true;
  state.flags['c11-started'] = true;
  state.flags['c11-identify-complete'] = true;
  state.flags['c11-market-traced'] = true;
  state.screen = 'explore';
  state.mode = 'explore';
  state.mapId = 'jiangnan_spice_workshop';
  state.position = { x: 760, y: 294 };
  state.quest = { title: '失味的宴席', text: '调查封绳仓与问题香料。' };
  await renderTo('02-spice-workshop.png');

  state.flags['c11-workshop-proof'] = true;
  state.flags['c11-recipe-fragment'] = true;
  state.flags['c11-shiwei-quest'] = true;
  state.mapId = 'old_banquet_kitchen';
  state.position = { x: 760, y: 294 };
  state.quest = { title: '失味的宴席', text: '重燃宴锅并保护烧损菜谱。' };
  await renderTo('03-old-banquet-kitchen.png');

  cookingTrials.start(state, 'c11-fire-control');
  await renderTo('04-fire-control-trial.png');

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
