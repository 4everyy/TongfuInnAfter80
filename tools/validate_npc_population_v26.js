'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const population = require('../minigame/data/npc-population-v26');
const world = require('../minigame/src/world/explore');
const gameConfig = require('../minigame/game.json');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26');

function fail(message) {
  throw new Error(message);
}

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function pointInExit(point, exit, padding) {
  const zone = exit.zone || exit;
  return point.x >= zone.x - padding && point.x <= zone.x + zone.width + padding
    && point.y >= zone.y - padding && point.y <= zone.y + zone.height + padding;
}

function routeExists(map, start, exit, state) {
  const step = 6;
  const queue = [{ x: Math.round(start.x / step) * step, y: Math.round(start.y / step) * step }];
  const visited = new Set();
  while (queue.length) {
    const point = queue.shift();
    const key = point.x + ':' + point.y;
    if (visited.has(key)) continue;
    visited.add(key);
    if (pointInExit(point, exit, 0)) return true;
    [[step, 0], [-step, 0], [0, step], [0, -step]].forEach((delta) => {
      const next = { x: point.x + delta[0], y: point.y + delta[1] };
      const nextKey = next.x + ':' + next.y;
      if (!visited.has(nextKey) && next.x >= 0 && next.x <= map.width && next.y >= 0 && next.y <= map.height
        && world.isWalkable(map, next, null, state)) queue.push(next);
    });
  }
  return false;
}

function directoryBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directoryBytes(target) : fs.statSync(target).size);
  }, 0);
}

async function validateSprite(entry) {
  const art = manifest.npcs[entry.id];
  if (!art || !art.atlas || art.atlas.indexOf('@npc-pop-v26/') !== 0) fail('Missing NPC art registration: ' + entry.id);
  const file = runtimePath(art.atlas);
  if (!fs.existsSync(file)) fail('Missing NPC sprite: ' + entry.id);
  const metadata = await sharp(file).metadata();
  if (metadata.width !== 192 || metadata.height !== 256 || !metadata.hasAlpha) fail('Invalid NPC sprite canvas: ' + entry.id);
  const alpha = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let maxY = -1;
  let coverage = 0;
  for (let index = 0; index < alpha.data.length; index += 1) {
    if (alpha.data[index] > 18) {
      maxY = Math.max(maxY, Math.floor(index / alpha.info.width));
      coverage += 1;
    }
  }
  if (Math.abs(maxY - 244) > 1) fail('NPC foot baseline drift: ' + entry.id + ' at ' + maxY);
  if (coverage < 2500 || coverage > 32000) fail('Implausible NPC alpha coverage: ' + entry.id);
  if (alpha.data[0] || alpha.data[alpha.data.length - 1]) fail('NPC transparent corners are not clear: ' + entry.id);
}

async function main() {
  if (population.roster.length !== 36) fail('Expected 36 new NPCs');
  const ids = new Set();
  population.roster.forEach((entry) => {
    if (ids.has(entry.id)) fail('Duplicate NPC id: ' + entry.id);
    ids.add(entry.id);
  });

  const npcs = content.maps.flatMap((map) => (map.npcs || []).filter((npc) => npc.populationV26).map((npc) => ({ map, npc })));
  const hotspots = content.maps.flatMap((map) => (map.hotspots || []).filter((spot) => spot.populationV26).map((spot) => ({ map, spot })));
  const props = Object.keys(manifest.maps).flatMap((mapId) => (manifest.maps[mapId].props || []).filter((prop) => prop.populationV26));
  if (npcs.length !== 36) fail('Expected 36 placed NPCs, received ' + npcs.length);
  if (props.length !== 30) fail('Expected 30 new task props, received ' + props.length);
  if (hotspots.length < 120) fail('NPC interactions are incomplete');

  npcs.forEach(({ map, npc }) => {
    if ((map.exits || []).some((exit) => pointInExit(npc, exit, 28))) fail('NPC blocks an exit: ' + map.id + '/' + npc.id);
    Object.keys(map.spawns || {}).forEach((spawnId) => {
      if (Math.hypot(npc.x - map.spawns[spawnId].x, npc.y - map.spawns[spawnId].y) < 36) {
        fail('NPC overlaps spawn: ' + map.id + '/' + npc.id + '/' + spawnId);
      }
    });
  });

  hotspots.filter((entry) => entry.spot.type === 'dialogue').forEach(({ map, spot }) => {
    if (!content.dialogues[spot.dialogue]) fail('Missing NPC dialogue: ' + map.id + '/' + spot.id);
  });
  const taskTypes = new Set(hotspots.filter((entry) => entry.spot.type !== 'dialogue').map((entry) => entry.spot.type));
  ['collect', 'investigate', 'repair', 'mechanism', 'recipeSample'].forEach((type) => {
    if (!taskTypes.has(type)) fail('Missing NPC task type: ' + type);
  });

  if (!fs.existsSync(path.join(PACKAGE, 'game.js'))) fail('NPC subpackage has no root game.js');
  if (!(gameConfig.subpackages || []).some((item) => item.name === 'npc-pop-v26')) fail('NPC subpackage is absent from game.json');
  const packageBytes = directoryBytes(PACKAGE);
  if (packageBytes > 3.8 * 1024 * 1024) fail('NPC subpackage exceeds 3.8 MB');
  for (const entry of population.roster) await validateSprite(entry);

  const inn = content.maps.find((map) => map.id === 'inn');
  const streetExit = inn.exits.find((exit) => exit.id === 'to-street');
  const routeState = { flags: { 'doorway-clues-ready': true }, party: [], characters: {} };
  if (!routeExists(inn, inn.spawns.main, streetExit, routeState)) fail('Inn-to-street route is blocked while the troublemaker is present');
  const street = content.maps.find((map) => map.id === 'street');
  const streetState = {
    flags: {
      doorwayDisturbanceResolved: true,
      'c03-started': true,
      'c03-decoy-ready': true,
      'c05-started': true
    },
    party: [],
    characters: {}
  };
  street.exits.forEach((exit) => {
    if (!routeExists(street, street.spawns.main, exit, streetState)) fail('Street route is blocked: ' + exit.id);
  });
  street.npcs.forEach((npc) => {
    if ((npc.populationV26 || npc.ambient || ['jingzhi-street', 'street-merchant', 'street-townsman'].indexOf(npc.id) >= 0)
      && npc.blocksMovement !== false) fail('Street crowd NPC blocks movement: ' + npc.id);
  });

  console.log(JSON.stringify({
    npcs: npcs.length,
    interactions: hotspots.length,
    taskProps: props.length,
    taskTypes: Array.from(taskTypes).sort(),
    dialogues: Object.keys(content.dialogues).length,
    packageMB: Number((packageBytes / 1024 / 1024).toFixed(2)),
    innStreetRoute: true,
    streetRoutes: street.exits.length
  }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
