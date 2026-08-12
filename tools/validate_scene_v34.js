'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const calibration = require('../minigame/data/scene-calibration-v34');
const sceneV34 = require('../minigame/assets/art/scene-v34');
const world = require('../minigame/src/world/explore');

const ROOT = path.resolve(__dirname, '..');
const errors = [];

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function nearWalkable(map, spot) {
  for (let y = Math.max(8, spot.y - (spot.discoverRadius || 112)); y <= Math.min(map.height - 8, spot.y + (spot.discoverRadius || 112)); y += 12) {
    for (let x = Math.max(8, spot.x - (spot.discoverRadius || 112)); x <= Math.min(map.width - 8, spot.x + (spot.discoverRadius || 112)); x += 12) {
      if (world.isWalkable(map, { x, y })) return true;
    }
  }
  return false;
}

async function validateMap(map) {
  const art = manifest.maps[map.id];
  if (map.sceneCalibration !== 'v34') errors.push(map.id + ': geometry is not v34');
  if (!art || !art.v34) errors.push(map.id + ': art is not v34');
  const background = art && art.layers && art.layers.find((layer) => layer.id === 'v34-background');
  if (!background) return errors.push(map.id + ': missing v34 background layer');
  const file = runtimePath(background.src);
  if (!fs.existsSync(file)) errors.push(map.id + ': missing background file ' + file);
  else {
    const meta = await sharp(file).metadata();
    if (meta.width !== map.width || meta.height !== map.height) errors.push(map.id + ': background dimensions do not match world');
  }
  Object.keys(map.spawns || {}).forEach((id) => {
    const point = map.spawns[id];
    if (!calibration.collisionSafe(map, point)) errors.push(map.id + ': spawn ' + id + ' is blocked');
  });
  (map.npcs || []).forEach((npc) => {
    if (!npc.allowBlockedPlacement && !calibration.isSafeFoot(map, npc, true)) errors.push(map.id + ': NPC ' + npc.id + ' is blocked');
  });
  (map.hotspots || []).forEach((spot) => {
    if (!nearWalkable(map, spot)) errors.push(map.id + ': hotspot ' + spot.id + ' cannot be approached');
  });
  (map.exits || []).forEach((exit) => {
    const target = content.maps.find((item) => item.id === exit.target);
    if (exit.zone.width < 44 || exit.zone.height < 44) errors.push(map.id + ': exit ' + exit.id + ' touch zone is below 44px');
    if (!target) errors.push(map.id + ': exit ' + exit.id + ' target missing');
    else if (!target.spawns[exit.spawn]) errors.push(map.id + ': target spawn ' + exit.target + '/' + exit.spawn + ' missing');
  });
  const staticObstacles = (map.obstacles || []).filter((item) => item.v34 && item.occludes !== false);
  for (const obstacle of staticObstacles) {
    const prop = (art.props || []).find((item) => item.obstacleId === obstacle.id);
    if (!prop) {
      errors.push(map.id + ': foreground missing for ' + obstacle.id);
      continue;
    }
    const propFile = runtimePath(prop.src);
    if (!fs.existsSync(propFile)) errors.push(map.id + ': foreground file missing for ' + obstacle.id);
    else {
      const meta = await sharp(propFile).metadata();
      if (!meta.hasAlpha) errors.push(map.id + ': foreground lacks alpha for ' + obstacle.id);
    }
  }
}

async function main() {
  for (const map of content.maps) await validateMap(map);
  const packages = {};
  Object.keys(sceneV34.mapPackages).forEach((id) => { packages[sceneV34.mapPackages[id]] = true; });
  Object.keys(packages).forEach((name) => {
    const packageRoot = path.join(ROOT, 'minigame', 'subpackages', name);
    const gameFile = path.join(packageRoot, 'game.js');
    if (!fs.existsSync(gameFile)) errors.push(name + ': missing root game.js');
    let bytes = 0;
    if (fs.existsSync(packageRoot)) {
      const stack = [packageRoot];
      while (stack.length) {
        const current = stack.pop();
        fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
          const file = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(file);
          else bytes += fs.statSync(file).size;
        });
      }
    }
    if (bytes > 3.8 * 1024 * 1024) errors.push(name + ': package exceeds 3.8 MB (' + bytes + ')');
  });
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ maps: content.maps.length, packages: Object.keys(packages).length, status: 'ok' }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
