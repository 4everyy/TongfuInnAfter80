'use strict';

const content = require('../minigame/data/content');
const store = require('../minigame/src/core/store');
const world = require('../minigame/src/world/explore');

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function validateUnlockedState() {
  const state = store.freshState();
  const unlocked = world.syncMapAccess(state);
  content.maps.forEach((map) => {
    assert(unlocked[map.id] === true, `Map is not unlocked: ${map.id}`);
    map.exits.forEach((exit) => {
      assert(world.exitUnlocked(state, exit), `Exit is locked: ${map.id}.${exit.id}`);
    });
  });
}

function validateConnectedGraph() {
  const known = new Set(content.maps.map((map) => map.id));
  const reached = new Set(['inn']);
  const queue = ['inn'];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = content.maps.find((map) => map.id === queue[cursor]);
    (current.exits || []).forEach((exit) => {
      const target = content.maps.find((map) => map.id === exit.target);
      assert(known.has(exit.target), `Unknown exit target: ${current.id}.${exit.id} -> ${exit.target}`);
      assert(!!(target && target.spawns && target.spawns[exit.spawn]), `Missing target spawn: ${current.id}.${exit.id} -> ${exit.target}.${exit.spawn}`);
      assert(!!(target && target.exits || []).find((reverse) => reverse.target === current.id), `Missing return route: ${current.id} <-> ${exit.target}`);
      if (!reached.has(exit.target)) {
        reached.add(exit.target);
        queue.push(exit.target);
      }
    });
  }
  content.maps.forEach((map) => assert(reached.has(map.id), `Map is disconnected from inn: ${map.id}`));
}

function validateRegionalTravel() {
  const state = store.freshState();
  const bridge = content.maps.find((map) => map.id === 'stone_bridge');
  const outbound = bridge.exits.find((exit) => exit.id === 'to-jiangnan-dock');
  world.spawn(state, 'stone_bridge', 'jiangnanReturn');
  assert(world.beginTransition(state, outbound), 'Could not start Jiangnan route transition');
  state.sceneTransition.startedAt = Date.now() - state.sceneTransition.duration;
  world.update(state, { move: { x: 0, y: 0 } }, 0);
  assert(state.mapId === 'jiangnan_dock', 'Jiangnan route did not arrive at the dock');
  assert(state.activeBranchId === 'jiangnan', 'Jiangnan route did not switch branch context');

  const dock = content.maps.find((map) => map.id === 'jiangnan_dock');
  const inbound = dock.exits.find((exit) => exit.id === 'to-guanzhong-route');
  assert(world.beginTransition(state, inbound), 'Could not start Guanzhong return transition');
  state.sceneTransition.startedAt = Date.now() - state.sceneTransition.duration;
  world.update(state, { move: { x: 0, y: 0 } }, 0);
  assert(state.mapId === 'stone_bridge', 'Guanzhong route did not return to the stone bridge');
  assert(state.activeBranchId === 'changfeng', 'Guanzhong route did not restore branch context');
}

validateUnlockedState();
validateConnectedGraph();
validateRegionalTravel();

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

console.log(`All-map access v27 passed: ${content.maps.length} maps are unlocked, connected and reversible.`);
