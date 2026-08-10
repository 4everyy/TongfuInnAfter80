'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const sceneV23 = require('../minigame/assets/art/scene-v23');
const gameConfig = require('../minigame/game.json');

const ROOT = path.resolve(__dirname, '..');
const PHASES = ['morning', 'noon', 'evening'];
const MAX_PACKAGE_BYTES = 3.8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024;

function runtimePath(src) {
  const match = /^@([^/]+)\/(.+)$/.exec(src || '');
  if (match) return path.join(ROOT, 'minigame', 'subpackages', match[1], 'assets', 'art', match[2]);
  return path.join(ROOT, 'minigame', 'assets', 'art', src || '');
}

function fail(message) {
  throw new Error(message);
}

function mapById(id) {
  return content.maps.find((map) => map.id === id);
}

function directoryBytes(directory) {
  let total = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    total += entry.isDirectory() ? directoryBytes(file) : fs.statSync(file).size;
  }
  return total;
}

function collectKnownFlags(value, key, result) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if ((key === 'requires' || key === 'unless') && typeof item === 'string') result.add(item);
      collectKnownFlags(item, key, result);
    });
    return;
  }
  if (typeof value !== 'object') {
    if ((key === 'flag' || key === 'requires' || key === 'unless') && typeof value === 'string') result.add(value);
    return;
  }
  Object.keys(value).forEach((childKey) => collectKnownFlags(value[childKey], childKey, result));
}

async function metadata(file, label) {
  if (!fs.existsSync(file)) fail('Missing ' + label + ': ' + file);
  return sharp(file).metadata();
}

async function validateMap(mapId, knownFlags) {
  const art = manifest.maps[mapId];
  const map = mapById(mapId);
  const packageName = sceneV23.mapPackages[mapId];
  if (!art || !map || !packageName) fail('Incomplete map registration: ' + mapId);
  const base = art.layers.find((layer) => !layer.v23 && layer.kind !== 'lighting');
  if (!base) fail('Missing base layer: ' + mapId);
  const baseMeta = await metadata(runtimePath(base.src), mapId + ' base');
  for (const phase of PHASES) {
    const layer = art.layers.find((item) => item.kind === 'lighting' && item.phase === phase);
    if (!layer || !layer.optional || layer.order !== 5) fail('Invalid ' + phase + ' layer: ' + mapId);
    const lightMeta = await metadata(runtimePath(layer.src), mapId + ' ' + phase + ' light');
    if (!lightMeta.hasAlpha) fail('Lighting lacks alpha: ' + mapId + '/' + phase);
    if (lightMeta.width !== baseMeta.width || lightMeta.height !== baseMeta.height) {
      fail('Lighting dimensions differ from base: ' + mapId + '/' + phase);
    }
  }

  for (const obstacle of map.obstacles || []) {
    if (obstacle.occludes === false) continue;
    const prop = (art.props || []).find((item) => item.v23 && item.obstacleId === obstacle.id);
    if (!prop) fail('Missing occluder for ' + mapId + '/' + obstacle.id);
    const propMeta = await metadata(runtimePath(prop.src), mapId + '/' + obstacle.id);
    if (!propMeta.hasAlpha) fail('Occluder lacks alpha: ' + mapId + '/' + obstacle.id);
    if (Math.abs(prop.sortY - (typeof obstacle.sortY === 'number'
      ? obstacle.sortY
      : Math.max.apply(Math, obstacle.polygon.map((point) => point[1])))) > 1) {
      fail('Occluder sortY mismatch: ' + mapId + '/' + obstacle.id);
    }
  }

  for (const prop of (art.props || []).filter((item) => item.id && item.id.indexOf('v23-task-') === 0)) {
    const propMeta = await metadata(runtimePath(prop.src), prop.id);
    if (!propMeta.hasAlpha || propMeta.width !== 192 || propMeta.height !== 192) fail('Invalid task prop canvas: ' + prop.id);
    for (const flag of (prop.requires || []).concat(prop.unless || [])) {
      if (!knownFlags.has(flag)) fail('Unknown condition flag on ' + prop.id + ': ' + flag);
    }
    if (!prop.decorative) {
      const anchor = prop.interactionAnchor || prop;
      const nearest = (map.hotspots || []).reduce((best, hotspot) => {
        const distance = Math.hypot(anchor.x - hotspot.x, anchor.y - hotspot.y);
        return !best || distance < best.distance ? { hotspot, distance } : best;
      }, null);
      if (!nearest || nearest.distance > 12) fail('Task prop is not aligned to a hotspot: ' + mapId + '/' + prop.id);
    }
  }
}

async function main() {
  const knownFlags = new Set();
  collectKnownFlags(content, '', knownFlags);
  const packages = Array.from(new Set(Object.values(sceneV23.mapPackages)));
  const configuredPackages = new Set((gameConfig.subpackages || []).map((item) => item.name));
  let totalBytes = 0;
  for (const packageName of packages) {
    const directory = path.join(ROOT, 'minigame', 'subpackages', packageName);
    if (!configuredPackages.has(packageName)) fail('Package missing from game.json: ' + packageName);
    if (!fs.existsSync(path.join(directory, 'game.js'))) fail('Package has no root game.js: ' + packageName);
    const bytes = directoryBytes(directory);
    totalBytes += bytes;
    if (bytes > MAX_PACKAGE_BYTES) fail('Package exceeds 3.8 MB: ' + packageName);
  }
  if (totalBytes > MAX_TOTAL_BYTES) fail('Scene v23 resources exceed 4.5 MB');
  for (const mapId of Object.keys(sceneV23.mapPackages)) await validateMap(mapId, knownFlags);

  const createAssetStore = require('../minigame/src/render/assets').createAssetStore;
  if (typeof createAssetStore !== 'function') fail('AssetStore factory is unavailable');
  const store = createAssetStore();
  const fallbackPaths = store.mapPaths('inn', { phase: 'morning', includeOptional: false });
  const phasePaths = store.mapPaths('inn', { phase: 'morning', includeOptional: true, includeNextPhase: true });
  if (fallbackPaths.some((item) => item.indexOf('@scene-') === 0)) fail('Fallback path incorrectly depends on v23 package');
  if (!phasePaths.some((item) => /light-morning/.test(item)) || !phasePaths.some((item) => /light-noon/.test(item))) {
    fail('Current and next phase were not selected for prefetch');
  }
  if (phasePaths.some((item) => /light-evening/.test(item))) fail('Unneeded third phase was prefetched');
  const basePaths = manifest.maps.inn.layers.filter((layer) => !layer.optional).map((layer) => layer.src);
  if (!basePaths.length) fail('Base scene fallback was removed');

  console.log(JSON.stringify({
    maps: Object.keys(sceneV23.mapPackages).length,
    phases: PHASES.length,
    packages: packages.length,
    totalMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    knownFlags: knownFlags.size,
    fallback: true
  }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
