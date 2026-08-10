'use strict';

const assert = require('assert');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const presentation = require(path.join(root, 'minigame/data/presentation'));
const campaignData = require(path.join(root, 'minigame/data/campaign'));
const store = require(path.join(root, 'minigame/src/core/store'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const combat = require(path.join(root, 'minigame/src/combat/battle'));
const roleIds = ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'];

function runtimePath(value) {
  const match = /^@([^/]+)\/(.+)$/.exec(value || '');
  if (!match) return path.join(root, 'minigame/assets/art', value);
  return path.join(root, 'minigame/subpackages', match[1], 'assets/art', match[2]);
}

function skillType(roleId, skillIndex) {
  const role = campaignData.roles.find((entry) => entry.id === roleId);
  return role.skills[skillIndex][1];
}

async function validateFrames(roleId, skillIndex, visual) {
  const file = runtimePath(visual.atlas);
  const metadata = await sharp(file).metadata();
  const sequence = visual.frames.anticipation.concat(visual.frames.active, visual.frames.impact, visual.frames.recovery);

  assert(visual.atlasColumns === 4, `${roleId}/${skillIndex} atlas columns mismatch`);
  assert(visual.displayScale >= 0.5 && visual.displayScale <= 0.7, `${roleId}/${skillIndex} display scale out of range`);
  assert(metadata.width === visual.frameSize.width * 4, `${roleId}/${skillIndex} width mismatch`);
  assert(metadata.height === visual.frameSize.height * 2, `${roleId}/${skillIndex} height mismatch`);
  assert(metadata.hasAlpha && metadata.channels === 4, `${roleId}/${skillIndex} needs alpha`);
  assert.deepStrictEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7], `${roleId}/${skillIndex} frame sequence mismatch`);

  for (let frame = 0; frame < 8; frame += 1) {
    const result = await sharp(file)
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
    for (let index = 3; index < result.data.length; index += result.info.channels) {
      if (result.data[index] > 20) visible += 1;
    }
    const coverage = visible / (visual.frameSize.width * visual.frameSize.height);
    assert(coverage > 0.001 && coverage < 0.72, `${roleId}/${skillIndex} frame ${frame} coverage invalid: ${coverage.toFixed(4)}`);
  }
}

function validateCombatBinding(roleId, skillIndex, visual) {
  const state = store.freshState();
  if (roleId !== 'zhangdeng') campaign.setStage(state, roleId, 'recruited', 'all skill VFX validation');
  state.party = roleId === 'zhangdeng' ? ['zhangdeng'] : ['zhangdeng', roleId];
  state.party.forEach((id) => { state.characters[id].inParty = true; });
  combat.start(state, 'training');
  state.visualTransition = null;
  const actor = state.battle.party.find((unit) => unit.id === roleId);
  actor.qi = 999;
  state.battle.turn = { side: 'party', unit: actor };
  state.battle.queue = [];
  combat.action(state, 'skill', skillIndex, state.battle.enemies[0].id);
  assert(state.battle.performance.atlas === visual.atlas, `${roleId}/${skillIndex} combat binding mismatch`);
}

(async function run() {
  for (const roleId of roleIds) {
    for (let skillIndex = 0; skillIndex < 3; skillIndex += 1) {
      const visual = presentation.skill(roleId, skillIndex, skillType(roleId, skillIndex));
      assert(visual.atlas, `${roleId}/${skillIndex} is missing a formal atlas`);
      await validateFrames(roleId, skillIndex, visual);
      validateCombatBinding(roleId, skillIndex, visual);
    }
  }
  console.log('All skill VFX v22 validation passed: 5 roles, 15 skills, 120 transparent frames and combat bindings.');
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
