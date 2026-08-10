'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const minigame = path.join(root, 'minigame');
const assets = [
  'assets/art/ui/presentation/dialogue-frame-v29.webp',
  'assets/art/ui/presentation/portrait-frame-v29.webp',
  'assets/art/ui/presentation/prompt-frame-v29.webp',
];
const requiredIcons = [
  'dialogue', 'investigate', 'battle', 'door', 'exit', 'quest', 'lock',
  'complete', 'warning', 'reward', 'relationship', 'party', 'energy',
  'mood', 'key', 'abacus', 'pot', 'basket', 'hammer', 'broom', 'hand', 'back', 'close',
  'shop', 'jewel', 'weapon', 'coin', 'medicine', 'tea', 'bell',
];
const integratedViews = [
  'src/render/views/overlays.js',
  'src/render/views/explore.js',
  'src/render/views/management-v12.js',
  'src/render/views/inn-scene-v18.js',
];

function fail(message) {
  throw new Error(message);
}

function imageInfo(file) {
  const data = fs.readFileSync(file);
  if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
    fail(`invalid WebP: ${file}`);
  }
  return {
    bytes: data.length,
  };
}

function main() {
  let total = 0;
  assets.forEach((relative) => {
    const file = path.join(minigame, relative);
    if (!fs.existsSync(file)) fail(`missing UI asset: ${relative}`);
    const info = imageInfo(file);
    total += info.bytes;
  });
  if (total > 1024 * 1024) fail(`presentation UI exceeds 1 MB: ${total}`);

  const artModule = fs.readFileSync(path.join(minigame, 'src/render/ui-art-v29.js'), 'utf8');
  requiredIcons.forEach((name) => {
    if (!artModule.includes(`'${name}'`)) fail(`missing semantic icon: ${name}`);
  });
  integratedViews.forEach((relative) => {
    const source = fs.readFileSync(path.join(minigame, relative), 'utf8');
    if (!source.includes("require('../ui-art-v29')")) fail(`view is not using UI art v29: ${relative}`);
  });
  const manifest = fs.readFileSync(path.join(minigame, 'assets/art/manifest.js'), 'utf8');
  assets.forEach((relative) => {
    const manifestPath = relative.replace('assets/art/', '');
    if (!manifest.includes(manifestPath)) fail(`asset is not registered: ${manifestPath}`);
  });
  const loader = fs.readFileSync(path.join(minigame, 'src/render/assets.js'), 'utf8');
  if (!loader.includes('Object.keys(presentation)')) fail('presentation assets are not preloaded');

  console.log(`ui art v29 ok: ${assets.length} transparent WebP panels, ${requiredIcons.length} icons, ${total} bytes`);
}

main();
