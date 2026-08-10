'use strict';

const assert = require('assert');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const presentation = require(path.join(root, 'minigame/data/presentation'));
const store = require(path.join(root, 'minigame/src/core/store'));
const combat = require(path.join(root, 'minigame/src/combat/battle'));

function runtimePath(value) {
  const match = /^@([^/]+)\/(.+)$/.exec(value || '');
  if (!match) return path.join(root, 'minigame/assets/art', value);
  return path.join(root, 'minigame/subpackages', match[1], 'assets/art', match[2]);
}

(async function run() {
  const visual = presentation.skill('wuchen', 1, 'stun');
  const file = runtimePath(visual.atlas);
  const metadata = await sharp(file).metadata();
  const frameWidth = visual.frameSize.width;
  const frameHeight = visual.frameSize.height;
  const phases = visual.frames;
  const sequence = phases.anticipation.concat(phases.active, phases.impact, phases.recovery);

  assert(visual.atlas && visual.atlasColumns === 4, 'Wuchen anchor needs a 4-column atlas');
  assert(metadata.width === frameWidth * 4, 'Skill atlas width mismatch');
  assert(metadata.height === frameHeight * 2, 'Skill atlas height mismatch');
  assert(metadata.hasAlpha && metadata.channels === 4, 'Skill atlas needs a real alpha channel');
  assert.deepStrictEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7], 'Skill frames must form a complete sequence');

  for (let frame = 0; frame < 8; frame += 1) {
    const left = frame % 4 * frameWidth;
    const top = Math.floor(frame / 4) * frameHeight;
    const { data, info } = await sharp(file)
      .extract({ left, top, width: frameWidth, height: frameHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let visible = 0;
    for (let index = 3; index < data.length; index += info.channels) {
      if (data[index] > 20) visible += 1;
    }
    const coverage = visible / (frameWidth * frameHeight);
    assert(coverage > 0.001 && coverage < 0.55, `Skill frame ${frame} coverage out of range: ${coverage.toFixed(4)}`);
  }

  const state = store.freshState();
  state.party = ['zhangdeng', 'wuchen'];
  state.characters.wuchen.innUnlocked = true;
  state.characters.wuchen.recruited = true;
  state.characters.wuchen.inParty = true;
  combat.start(state, 'bridge_ruffians');
  state.visualTransition = null;
  state.battle.turn = { side: 'party', unit: state.battle.party[1] };
  state.battle.queue = [];
  combat.action(state, 'skill', 1, state.battle.enemies[0].id);
  assert(state.battle.performance.atlas === visual.atlas, 'Combat performance must carry the formal atlas');

  console.log('Skill VFX v20 validation passed: Wuchen 8-frame control anchor, alpha, phases and combat binding.');
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

