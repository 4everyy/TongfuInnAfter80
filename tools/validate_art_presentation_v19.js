'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const minigame = path.join(root, 'minigame');
const content = require(path.join(minigame, 'data/content'));
const presentation = require(path.join(minigame, 'data/presentation'));
const manifest = require(path.join(minigame, 'assets/art/manifest'));
const store = require(path.join(minigame, 'src/core/store'));
const world = require(path.join(minigame, 'src/world/explore'));
const combat = require(path.join(minigame, 'src/combat/battle'));

function runtimePath(value) {
  if (!value) return null;
  if (value.charAt(0) === '@') {
    const slash = value.indexOf('/');
    const packageName = value.slice(1, slash);
    return path.join(minigame, 'subpackages', packageName, 'assets', 'art', value.slice(slash + 1));
  }
  return path.join(minigame, 'assets', 'art', value);
}

const roleIds = ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'];
const styles = { bubble: true, standard: true, dramatic: true };

Object.entries(content.dialogues).forEach(([id, definition]) => {
  const visual = presentation.dialogue(id, definition);
  assert(styles[visual.presentation], `${id} must have a supported presentation`);
  assert(visual.expression, `${id} must have an expression fallback`);
  assert(visual.pose, `${id} must have a pose fallback`);
});

roleIds.forEach((id) => {
  const art = manifest.characters[id];
  assert(art && art.dialogue && art.dialogue.bust, `${id} needs dialogue bust art`);
  assert(art.battlePortrait, `${id} needs battle portrait art`);
  assert(art.skillCutIn, `${id} needs skill cut-in art`);
  ['dialogue', 'battlePortrait', 'skillCutIn'].forEach((field) => {
    const value = field === 'dialogue' ? art.dialogue.bust : art[field];
    assert(fs.existsSync(runtimePath(value)), `${id}/${field} missing: ${value}`);
  });
  const role = content.roles.find((item) => item.id === id);
  assert(role && role.skills.length === 3, `${id} needs exactly three current skills`);
  role.skills.forEach((skill, index) => {
    const visual = presentation.skill(id, index, skill[1]);
    assert(visual.motif && visual.palette.length === 3, `${id} skill ${index} needs visual identity`);
    assert(visual.anticipation >= 180 && visual.impact >= 60, `${id} skill ${index} timing invalid`);
    assert(visual.cutIn === (index === 2), `${id} third skill cut-in rule mismatch`);
  });
});

content.maps.forEach((map) => {
  map.exits.forEach((exit) => {
    const target = content.maps.find((item) => item.id === exit.target);
    const visual = presentation.transition(map.id, exit.target);
    assert(target, `${map.id}/${exit.id} target missing`);
    assert(target.exits.some((candidate) => candidate.target === map.id), `${map.id}/${exit.id} must have a return route`);
    assert(target.spawns[exit.spawn] || target.spawns.main, `${map.id}/${exit.id} target spawn missing`);
    assert(['door', 'ink-pan', 'route'].includes(visual.kind), `${map.id}/${exit.id} transition missing`);
    assert(visual.duration >= 300 && visual.duration <= 700, `${map.id}/${exit.id} duration invalid`);
  });
});

const state = store.freshState();
state.screen = 'explore';
state.mode = 'explore';
world.spawn(state, 'inn', 'recovery');
const exit = world.map('inn').exits[0];
assert(world.beginTransition(state, exit), 'Exit should begin a visual transition');
assert(state.mapId === 'inn', 'Map should not switch before transition midpoint');
state.sceneTransition.startedAt -= state.sceneTransition.duration * 0.7;
world.update(state, { move: { x: 0, y: 0 } }, 1 / 30);
assert(state.mapId === exit.target, 'Map should switch at transition midpoint');

state.party = ['zhangdeng'];
combat.start(state, 'training');
state.visualTransition = null;
state.battle.turn = { side: 'party', unit: state.battle.party[0] };
state.battle.queue = [];
combat.action(state, 'skill', 2, state.battle.enemies[0].id);
assert(state.battle.performance && state.battle.performance.cutIn, 'Third skill should create a cut-in performance');
assert(state.battle.effects.every((effect) => effect.roleId === 'zhangdeng'), 'Skill effects should carry role identity');
assert(state.battle.effects.every((effect) => effect.startedAt === state.battle.performance.impactAt), 'Skill effects should align to impact timing');

console.log(`Art presentation v19 validation passed: ${Object.keys(content.dialogues).length} dialogues, 15 skills, ${content.maps.length} maps.`);
