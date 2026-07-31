'use strict';

const assert = require('assert');
const store = require('../minigame/src/core/store');
const combat = require('../minigame/src/combat/battle');

function forcePartyTurn(state) {
  state.battle.turn = { side: 'party', unit: state.battle.party[0] };
  state.battle.queue = [];
}

const state = store.freshState();
state.characters.wuchen.recruited = true;
state.characters.wuchen.inParty = true;
state.party = ['zhangdeng', 'wuchen'];

assert(combat.start(state, 'bridge_ruffians'), 'Bridge battle should start.');
forcePartyTurn(state);

combat.action(state, 'attack');
assert(state.battle.pendingAction, 'Multiple enemies should require an explicit target.');
assert.strictEqual(state.battle.pendingAction.type, 'attack', 'Pending action must retain its action type.');

const secondTarget = state.battle.enemies[1];
const hpBefore = secondTarget.hp;
assert.strictEqual(combat.selectTarget(state, secondTarget.id), undefined, 'Selecting a target should execute the pending action.');
assert(secondTarget.hp < hpBefore, 'Selected enemy should receive the attack.');
assert.strictEqual(state.battle.pendingAction, null, 'Target selection must clear after execution.');

assert(combat.inspect(state, 'party', 'zhangdeng'), 'Party status should be inspectable.');
assert.strictEqual(state.battle.inspect.id, 'zhangdeng', 'Inspect state should retain the selected unit.');
assert(combat.closeInspect(state), 'Inspect state should close safely.');

state.battle = null;
assert(combat.start(state, 'bridge_ruffians'), 'Second bridge battle should start.');
forcePartyTurn(state);
state.battle.enemies[0].hp = 0;
state.battle.enemies[1].hp = 1;
combat.action(state, 'attack', 0, state.battle.enemies[1].id);

assert(state.battle.result && state.battle.result.status === 'victory', 'Final selected attack should create a victory result.');
assert(state.battle.result.grade && state.battle.result.grade.grade, 'Victory result must include a battle grade.');
assert(state.battle.result.links, 'Victory result must include chapter and relationship links.');
assert(state.battle.result.links.relationships.length, 'Participating companion should gain battle relationship feedback.');
assert(state.battle.result.links.rareDrop, 'S/A bridge victory should grant its configured rare drop.');
assert(state.inventory.trophies['bridge-pass-fragment'] >= 1, 'Rare battle drop must persist in the inventory.');

console.log('Battle tactics v17 validation passed: target selection, inspection, grade, relationship and rare drop links.');
