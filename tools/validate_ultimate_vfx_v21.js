'use strict';

const assert = require('assert');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const presentation = require(path.join(root, 'minigame/data/presentation'));
const store = require(path.join(root, 'minigame/src/core/store'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const combat = require(path.join(root, 'minigame/src/combat/battle'));
const roles = ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'];

function runtimePath(value) {
  const match = /^@([^/]+)\/(.+)$/.exec(value || '');
  if (!match) return path.join(root, 'minigame/assets/art', value);
  return path.join(root, 'minigame/subpackages', match[1], 'assets/art', match[2]);
}

async function validateAtlas(roleId) {
  const visual = presentation.skill(roleId, 2, 'focus');
  const metadata = await sharp(runtimePath(visual.atlas)).metadata();
  const sequence = visual.frames.anticipation.concat(visual.frames.active, visual.frames.impact, visual.frames.recovery);

  assert(visual.cutIn, `${roleId} third skill needs cut-in timing`);
  assert(visual.atlasColumns === 4, `${roleId} ultimate atlas columns mismatch`);
  assert(visual.displayScale >= 0.5 && visual.displayScale <= 0.7, `${roleId} display scale out of range`);
  assert(metadata.width === visual.frameSize.width * 4, `${roleId} ultimate width mismatch`);
  assert(metadata.height === visual.frameSize.height * 2, `${roleId} ultimate height mismatch`);
  assert(metadata.hasAlpha && metadata.channels === 4, `${roleId} ultimate needs alpha`);
  assert.deepStrictEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7], `${roleId} ultimate sequence mismatch`);

  for (let frame = 0; frame < 8; frame += 1) {
    const { data, info } = await sharp(runtimePath(visual.atlas))
      .extract({
        left: frame % 4 * visual.frameSize.width,
        top: Math.floor(frame / 4) * visual.frameSize.height,
        width: visual.frameSize.width,
        height: visual.frameSize.height,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let visible = 0;
    for (let index = 3; index < data.length; index += info.channels) if (data[index] > 20) visible += 1;
    const coverage = visible / (visual.frameSize.width * visual.frameSize.height);
    assert(coverage > 0.001 && coverage < 0.68, `${roleId} frame ${frame} coverage invalid: ${coverage.toFixed(4)}`);
  }

  const state = store.freshState();
  if (roleId !== 'zhangdeng') campaign.setStage(state, roleId, 'recruited', 'ultimate validation');
  state.party = roleId === 'zhangdeng' ? ['zhangdeng'] : ['zhangdeng', roleId];
  state.party.forEach((id) => { state.characters[id].inParty = true; });
  combat.start(state, 'training');
  state.visualTransition = null;
  const actor = state.battle.party.find((unit) => unit.id === roleId);
  state.battle.turn = { side: 'party', unit: actor };
  state.battle.queue = [];
  combat.action(state, 'skill', 2, state.battle.enemies[0].id);
  assert(state.battle.performance.atlas === visual.atlas, `${roleId} combat binding mismatch`);
}

(async function run() {
  for (const roleId of roles) await validateAtlas(roleId);
  console.log('Ultimate VFX v21 validation passed: 5 roles, 40 transparent frames, phases and combat bindings.');
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

