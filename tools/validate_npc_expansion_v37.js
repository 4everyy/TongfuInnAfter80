'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const current = require('../minigame/data/npc-population-v37');
const previous = require('../minigame/data/npc-population-v26');
const gameConfig = require('../minigame/game.json');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v37');

function fail(message) { throw new Error(message); }

function runtimePath(value) {
  const match = /^@([^/]+)\/(.+)$/.exec(value || '');
  if (!match) fail('Invalid packaged asset path: ' + value);
  return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
}

function directoryBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directoryBytes(target) : fs.statSync(target).size);
  }, 0);
}

function inExit(point, exit, padding) {
  return point.x >= exit.x - padding && point.x <= exit.x + exit.width + padding
    && point.y >= exit.y - padding && point.y <= exit.y + exit.height + padding;
}

async function validateSprite(entry) {
  const art = manifest.npcs[entry.id];
  if (!art || !art.atlas || art.atlas.indexOf('@npc-pop-v37/') !== 0) fail('Missing NPC art registration: ' + entry.id);
  const spriteFile = runtimePath(art.atlas);
  const portraitFile = runtimePath(art.portrait);
  if (!fs.existsSync(spriteFile)) fail('Missing NPC sprite: ' + entry.id);
  if (!fs.existsSync(portraitFile)) fail('Missing NPC portrait: ' + entry.id);
  const metadata = await sharp(spriteFile).metadata();
  if (metadata.width !== 192 || metadata.height !== 256 || !metadata.hasAlpha) fail('Invalid NPC sprite canvas: ' + entry.id);
  const alpha = await sharp(spriteFile).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let maxY = -1;
  let coverage = 0;
  for (let index = 0; index < alpha.data.length; index += 1) {
    if (alpha.data[index] <= 18) continue;
    maxY = Math.max(maxY, Math.floor(index / alpha.info.width));
    coverage += 1;
  }
  if (Math.abs(maxY - 244) > 1) fail('NPC foot baseline drift: ' + entry.id + ' at ' + maxY);
  if (coverage < 2200 || coverage > 34000) fail('Implausible NPC alpha coverage: ' + entry.id + ' (' + coverage + ')');
  if (alpha.data[0] || alpha.data[alpha.data.length - 1]) fail('NPC transparent corners are not clear: ' + entry.id);
}

async function main() {
  if (current.roster.length !== 36) fail('Expected 36 v37 NPCs');
  if (current.roster.length + previous.roster.length !== 72) fail('Expected 72 special NPCs after expansion');
  const ids = new Set();
  const names = new Set();
  current.roster.forEach((entry) => {
    if (ids.has(entry.id)) fail('Duplicate NPC id: ' + entry.id);
    if (names.has(entry.name)) fail('Duplicate NPC name: ' + entry.name);
    ids.add(entry.id);
    names.add(entry.name);
  });
  const npcs = content.maps.flatMap((map) => (map.npcs || []).filter((npc) => npc.populationV37).map((npc) => ({ map, npc })));
  const hotspots = content.maps.flatMap((map) => (map.hotspots || []).filter((spot) => spot.populationV37).map((spot) => ({ map, spot })));
  if (npcs.length !== 36) fail('Expected 36 placed v37 NPCs, received ' + npcs.length);
  if (hotspots.length !== 72) fail('Expected 72 v37 dialogue hotspots, received ' + hotspots.length);
  const populatedMaps = new Set(npcs.map((entry) => entry.map.id));
  if (populatedMaps.size < 24) fail('NPC expansion does not cover enough maps: ' + populatedMaps.size);
  npcs.forEach(({ map, npc }) => {
    if (npc.blocksMovement !== false) fail('NPC blocks movement: ' + map.id + '/' + npc.id);
    if ((map.exits || []).some((exit) => inExit(npc, exit, 28))) fail('NPC blocks an exit: ' + map.id + '/' + npc.id);
    Object.keys(map.spawns || {}).forEach((spawnId) => {
      const spawn = map.spawns[spawnId];
      if (Math.hypot(npc.x - spawn.x, npc.y - spawn.y) < 36) fail('NPC overlaps spawn: ' + map.id + '/' + npc.id + '/' + spawnId);
    });
  });
  hotspots.forEach(({ map, spot }) => {
    if (!content.dialogues[spot.dialogue]) fail('Missing NPC dialogue: ' + map.id + '/' + spot.id);
  });
  if (!fs.existsSync(path.join(PACKAGE, 'game.js'))) fail('v37 NPC subpackage has no root game.js');
  if (!(gameConfig.subpackages || []).some((item) => item.name === 'npc-pop-v37')) fail('v37 NPC subpackage is absent from game.json');
  const packageBytes = directoryBytes(PACKAGE);
  if (packageBytes > 3.8 * 1024 * 1024) fail('v37 NPC subpackage exceeds 3.8 MB');
  for (const entry of current.roster) await validateSprite(entry);
  console.log(JSON.stringify({
    newNpcs: npcs.length,
    totalSpecialNpcs: current.roster.length + previous.roster.length,
    dialogues: hotspots.length,
    populatedMaps: populatedMaps.size,
    packageMB: Number((packageBytes / 1024 / 1024).toFixed(2)),
  }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
