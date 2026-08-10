'use strict';

const fs = require('fs');
const path = require('path');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const population = require('../minigame/data/scene-population');
const world = require('../minigame/src/world/explore');

const ROOT = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) {
    return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  }
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function uniqueIds(items, label) {
  const seen = new Set();
  items.forEach((item) => {
    if (!item || !item.id) return;
    if (seen.has(item.id)) fail(label + ' contains duplicate id: ' + item.id);
    seen.add(item.id);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function interactionReachable(map, hotspot) {
  if (world.isWalkable(map, hotspot)) return true;
  const radius = Math.max(24, Number(hotspot.radius) || 62);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    for (let gap = 20; gap <= radius; gap += 12) {
      const point = {
        x: hotspot.x + Math.cos(angle) * gap,
        y: hotspot.y + Math.sin(angle) * gap
      };
      if (world.isWalkable(map, point)) return true;
    }
  }
  return false;
}

function validateMap(map) {
  const scene = population.scenes[map.id];
  const art = manifest.maps[map.id];
  if (!scene) fail('Missing population definition: ' + map.id);
  if (!art) fail('Missing map art: ' + map.id);

  uniqueIds(map.npcs || [], map.id + ' NPCs');
  uniqueIds(map.hotspots || [], map.id + ' hotspots');
  uniqueIds(art.props || [], map.id + ' props');

  const npcId = 'ambient-npc-' + map.id;
  const dialogueId = 'ambient-dialogue-' + map.id;
  const objectId = 'ambient-object-' + map.id;
  const propId = 'ambient-prop-' + map.id;
  const npc = (map.npcs || []).find((item) => item.id === npcId);
  const dialogueSpot = (map.hotspots || []).find((item) => item.id === dialogueId);
  const objectSpot = (map.hotspots || []).find((item) => item.id === objectId);
  const dialogue = content.dialogues[dialogueId];
  const prop = (art.props || []).find((item) => item.id === propId);

  if (!npc || !npc.ambient) fail('Missing ambient NPC: ' + map.id);
  if (!manifest.npcs[npc.artId]) fail('Unknown ambient NPC art: ' + map.id + '/' + npc.artId);
  if (!world.isWalkable(map, { x: npc.x, y: npc.y })) fail('Ambient NPC is outside walkable floor: ' + map.id);
  Object.keys(map.spawns || {}).forEach((spawnId) => {
    if (distance(npc, map.spawns[spawnId]) < 36) {
      fail('Ambient NPC overlaps spawn: ' + map.id + '/' + spawnId);
    }
  });

  if (!dialogueSpot || dialogueSpot.type !== 'dialogue' || dialogueSpot.dialogue !== dialogueId) {
    fail('Invalid ambient dialogue hotspot: ' + map.id);
  }
  if (!dialogue || dialogue.presentation !== 'bubble' || !dialogue.text) {
    fail('Invalid ambient dialogue: ' + map.id);
  }
  if (distance(npc, dialogueSpot) > 1) fail('Ambient dialogue is detached from NPC: ' + map.id);

  if (!objectSpot || objectSpot.type !== 'investigate' || !objectSpot.effects || !objectSpot.effects.flag) {
    fail('Invalid ambient object interaction: ' + map.id);
  }
  if (!interactionReachable(map, objectSpot)) {
    fail('Ambient object interaction is unreachable: ' + map.id);
  }
  if (!prop || !prop.ambient || distance(prop, objectSpot) > 1) {
    fail('Ambient prop is detached from interaction: ' + map.id);
  }
  if (!fs.existsSync(runtimePath(prop.src))) fail('Missing ambient prop asset: ' + prop.src);
}

function main() {
  if (content.maps.length !== 27) fail('Expected 27 maps, received ' + content.maps.length);
  content.maps.forEach(validateMap);
  const ambientNpcs = content.maps.reduce((sum, map) => sum + (map.npcs || []).filter((item) => item.ambient).length, 0);
  const ambientHotspots = content.maps.reduce((sum, map) => sum + (map.hotspots || []).filter((item) => item.ambient).length, 0);
  const ambientProps = Object.keys(manifest.maps).reduce((sum, mapId) => {
    return sum + (manifest.maps[mapId].props || []).filter((item) => item.ambient).length;
  }, 0);
  console.log(JSON.stringify({
    maps: content.maps.length,
    ambientNpcs: ambientNpcs,
    ambientInteractions: ambientHotspots,
    ambientProps: ambientProps,
    dialogues: Object.keys(content.dialogues).length
  }));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
