'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const identities = require('../minigame/data/npc-identities-v31');

const ROOT = path.resolve(__dirname, '..');
const ART_ROOT = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26', 'assets', 'art', 'npcs', 'classic-v31');
const OUTPUT_ROOT = path.join(ROOT, 'outputs', 'product-design', 'npc-v31');
const report = JSON.parse(fs.readFileSync(path.join(ART_ROOT, 'build-report.json'), 'utf8'));
const bySlug = {};

Object.keys(identities.classic).forEach(function (gameplayId) {
  const item = identities.classic[gameplayId];
  bySlug[item.slug] = item;
});

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char];
  });
}

async function renderSheet(sheetName, items, index) {
  const width = 1080;
  const height = 720;
  const tileWidth = 360;
  const tileHeight = 360;
  const composites = [];
  for (let cell = 0; cell < items.length; cell += 1) {
    const column = cell % 3;
    const row = Math.floor(cell / 3);
    const item = items[cell];
    const identity = bySlug[item.slug];
    composites.push({
      input: path.join(ART_ROOT, item.slug + '.png'),
      left: column * tileWidth + 84,
      top: row * tileHeight + 26,
    });
    const label = Buffer.from(
      '<svg width="360" height="54" xmlns="http://www.w3.org/2000/svg">'
      + '<rect x="72" y="4" width="216" height="42" rx="4" fill="#30231f" stroke="#b88842" stroke-width="2"/>'
      + '<text x="180" y="32" fill="#f5e5bd" font-family="Microsoft YaHei,SimSun,sans-serif" font-size="22" text-anchor="middle">'
      + escapeXml(identity ? identity.name : item.slug) + '</text></svg>'
    );
    composites.push({ input: label, left: column * tileWidth, top: row * tileHeight + 300 });
  }
  const destination = path.join(OUTPUT_ROOT, 'classic-npc-runtime-' + String(index).padStart(2, '0') + '.webp');
  await sharp({
    create: { width, height, channels: 4, background: { r: 231, g: 214, b: 174, alpha: 1 } },
  })
    .composite(composites)
    .webp({ quality: 90, effort: 6 })
    .toFile(destination);
  return destination;
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const groups = {};
  report.items.forEach(function (item) {
    groups[item.sheet] = groups[item.sheet] || [];
    groups[item.sheet].push(item);
  });
  const outputs = [];
  let index = 1;
  for (const sheetName of Object.keys(groups).sort()) {
    outputs.push(await renderSheet(sheetName, groups[sheetName].sort(function (a, b) { return a.cell - b.cell; }), index));
    index += 1;
  }
  console.log(JSON.stringify({ count: outputs.length, outputs }));
}

main().catch(function (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
