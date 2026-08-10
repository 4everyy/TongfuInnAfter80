'use strict';

const fs = require('fs');
const path = require('path');
const canvasModule = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const minigameRoot = path.join(root, 'minigame');
const outputRoot = path.join(root, 'outputs', 'product-design', 'art-presentation-v19');

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
const combat = require(path.join(minigameRoot, 'src/combat/battle'));
const campaign = require(path.join(minigameRoot, 'src/core/campaign'));
const world = require(path.join(minigameRoot, 'src/world/explore'));

const canvas = canvasModule.createCanvas(844, 390);
const renderer = rendererModule.createRenderer(canvas);
const state = store.freshState();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderTo(name) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    renderer.render(state);
    if (renderer.readyFor(state)) break;
    await delay(35);
  }
  renderer.render(state);
  fs.writeFileSync(path.join(outputRoot, name), canvas.toBuffer('image/png'));
}

async function renderUltimate(roleId, name) {
  await renderSkill(roleId, 2, name, 790);
}

async function renderSkill(roleId, skillIndex, name, elapsed) {
  state.battle = null;
  state.visualTransition = null;
  if (roleId !== 'zhangdeng') campaign.setStage(state, roleId, 'recruited', 'skill preview');
  state.party = roleId === 'zhangdeng' ? ['zhangdeng'] : ['zhangdeng', roleId];
  state.party.forEach((id) => { state.characters[id].inParty = true; });
  combat.start(state, 'training');
  state.visualTransition = null;
  const actor = state.battle.party.find((unit) => unit.id === roleId);
  actor.qi = 999;
  state.battle.turn = { side: 'party', unit: actor };
  state.battle.queue = [];
  combat.action(state, 'skill', skillIndex, state.battle.enemies[0].id);
  state.battle.performance.startedAt = Date.now() - elapsed;
  await renderTo(name);
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  state.screen = 'explore';
  state.mode = 'explore';
  world.spawn(state, 'inn', 'recovery');
  state.position = { x: 520, y: 318 };
  dialogue.open(state, 'late-letter-briefing');
  state.dialogue.revealed = true;
  state.dialogue.openedAt = Date.now() - 300;
  await renderTo('01-standard-dialogue.png');

  dialogue.open(state, 'c03-old-letter');
  state.dialogue.revealed = true;
  state.dialogue.openedAt = Date.now() - 300;
  await renderTo('02-dramatic-dialogue.png');

  state.dialogue = null;
  state.party = ['zhangdeng'];
  combat.start(state, 'training');
  state.visualTransition = null;
  state.battle.turn = { side: 'party', unit: state.battle.party[0] };
  state.battle.queue = [];
  combat.action(state, 'skill', 2, state.battle.enemies[0].id);
  state.battle.performance.startedAt = Date.now() - 230;
  state.battle.performance.impactAt = state.battle.performance.startedAt + 570;
  await renderTo('03-zhangdeng-skill-cutin.png');

  state.battle = null;
  state.visualTransition = null;
  campaign.addTemporaryFollower(state, 'wuchen', 'v19 preview');
  state.party = ['zhangdeng', 'wuchen'];
  combat.start(state, 'bridge_ruffians');
  state.visualTransition = null;
  state.battle.turn = { side: 'party', unit: state.battle.party[1] };
  state.battle.queue = [];
  combat.action(state, 'skill', 1, state.battle.enemies[0].id);
  state.battle.performance.startedAt = Date.now() - 410;
  state.battle.performance.impactAt = Date.now() - 10;
  await renderTo('04-wuchen-skill-impact.png');

  await renderUltimate('zhangdeng', '09-zhangdeng-ultimate.png');
  await renderUltimate('wuchen', '10-wuchen-ultimate.png');
  await renderUltimate('jingzhi', '11-jingzhi-ultimate.png');
  await renderUltimate('wenyan', '12-wenyan-ultimate.png');
  await renderUltimate('shiwei', '13-shiwei-ultimate.png');
  await renderSkill('zhangdeng', 0, '14-zhangdeng-read-hearts.png', 410);
  await renderSkill('zhangdeng', 1, '15-zhangdeng-hundred-ledgers.png', 410);
  await renderSkill('wuchen', 0, '16-wuchen-flash-delivery.png', 410);
  await renderSkill('jingzhi', 0, '17-jingzhi-break-formation.png', 410);
  await renderSkill('jingzhi', 1, '18-jingzhi-guard-guests.png', 410);
  await renderSkill('wenyan', 0, '19-wenyan-hidden-ink.png', 410);
  await renderSkill('wenyan', 1, '20-wenyan-fixed-contract.png', 410);
  await renderSkill('shiwei', 0, '21-shiwei-ten-flavor-fire.png', 410);
  await renderSkill('shiwei', 1, '22-shiwei-herbal-feast.png', 410);

  state.battle = null;
  state.visualTransition = null;
  state.party = ['zhangdeng'];
  world.spawn(state, 'inn', 'recovery');
  const exit = world.map('inn').exits[0];
  world.beginTransition(state, exit);
  state.sceneTransition.startedAt = Date.now() - 180;
  await renderTo('05-inn-yard-transition.png');

  state.sceneTransition = null;
  world.spawn(state, 'inn', 'recovery');
  dialogue.open(state, 'c04-cooperate');
  state.dialogue.revealed = true;
  state.dialogue.openedAt = Date.now() - 300;
  await renderTo('06-jingzhi-dialogue.png');

  dialogue.open(state, 'c07-finale');
  state.dialogue.revealed = true;
  state.dialogue.openedAt = Date.now() - 300;
  await renderTo('07-wenyan-dialogue.png');

  world.spawn(state, 'jiangnan_branch', 'main');
  dialogue.open(state, 'c11-shiwei-quest');
  state.dialogue.revealed = true;
  state.dialogue.openedAt = Date.now() - 300;
  await renderTo('08-shiwei-dialogue.png');

  console.log(outputRoot);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
