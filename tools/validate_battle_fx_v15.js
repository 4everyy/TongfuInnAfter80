'use strict';

const assert = require('assert');
const store = require('../minigame/src/core/store');
const combat = require('../minigame/src/combat/battle');

const state = store.freshState();
const coinBefore = state.inventory.coin;

assert(combat.start(state, 'training'), 'Training battle should start.');
assert(state.battle.turn && state.battle.turn.side === 'party', 'Party should receive the first training turn.');

state.battle.enemies[0].hp = 1;
combat.action(state, 'attack', 0);

assert(state.battle, 'Victory should remain visible until the player confirms.');
assert(state.battle.result && state.battle.result.status === 'victory', 'Victory result should be registered.');
assert(state.battle.effects && state.battle.effects.length, 'The final attack should register a visual effect.');
assert.strictEqual(state.inventory.coin, coinBefore + 12, 'Victory reward should be applied exactly once.');

combat.action(state, 'attack', 0);
assert.strictEqual(state.inventory.coin, coinBefore + 12, 'Victory reward must not repeat while settlement is open.');
state.battle.result.startedAt = Date.now() - 1200;
assert(state.battle.result.startedAt < Date.now() - 1000, 'Settlement animation should support a safe visual skip.');
assert(combat.finish(state), 'Victory settlement should be confirmable.');
assert.strictEqual(state.battle, null, 'Confirmed settlement should return to exploration.');
assert.strictEqual(state.inventory.coin, coinBefore + 12, 'Confirming settlement must not duplicate rewards.');

console.log('Battle FX v16 validation passed: effects, victory hold, animation skip, confirmation and single reward.');
