'use strict';

const content = require('../minigame/data/content');
const calibration = require('../minigame/data/scene-calibration-v34');

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function managed(npc) {
  return /^npcv26-/.test(npc.id || '');
}

content.maps.forEach((map) => {
  const occupied = [];
  const staticNpcs = (map.npcs || []).filter((npc) => !npc.roleId && !npc.requires && !npc.unless);
  const centralStatic = staticNpcs.filter((npc) => npc.x / map.width > 0.36 && npc.x / map.width < 0.64);
  assert(centralStatic.length <= 2, `${map.id} keeps too many idle NPCs in the scene center`);
  const depthBands = {};
  staticNpcs.forEach((npc) => {
    const band = Math.round(npc.y / 8);
    depthBands[band] = (depthBands[band] || 0) + 1;
  });
  Object.keys(depthBands).forEach((band) => {
    assert(depthBands[band] < 3, `${map.id} forms a static NPC row at depth band ${band}`);
  });
  (map.npcs || []).forEach((npc) => {
    assert(npc.allowBlockedPlacement || calibration.isSafeFoot(map, npc, true), `${map.id}.${npc.id} is blocked`);
    assert(npc.facing === 'left' || npc.facing === 'right', `${map.id}.${npc.id} does not face into the scene`);
    assert(npc.idleClip === 'idle' || npc.idleClip === 'interact', `${map.id}.${npc.id} has no harmonious idle clip`);
    if (managed(npc)) {
      const ratio = npc.x / map.width;
      assert(ratio <= 0.38 || ratio >= 0.62, `${map.id}.${npc.id} remains in the main travel lane`);
    }
    occupied.forEach((other) => {
      assert(Math.hypot(other.x - npc.x, other.y - npc.y) >= 43, `${map.id}.${npc.id} overlaps ${other.id}`);
    });
    occupied.push(npc);
  });
});

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}

console.log(`NPC staging v35 passed: ${content.maps.length} maps, edge placement, inward facing and idle poses.`);
