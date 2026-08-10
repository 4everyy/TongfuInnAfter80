'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26', 'assets', 'art', 'npcs');
const OUTPUT = path.join(ROOT, 'outputs', 'product-design', 'npc-population-v26');

async function main() {
  const files = fs.readdirSync(SOURCE).filter((name) => name.endsWith('.png')).sort();
  const columns = 9;
  const cellWidth = 128;
  const cellHeight = 176;
  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const image = await sharp(path.join(SOURCE, files[index]))
      .resize({ width: 112, height: 154, fit: 'inside' })
      .png()
      .toBuffer({ resolveWithObject: true });
    composites.push({
      input: image.data,
      left: index % columns * cellWidth + Math.round((cellWidth - image.info.width) / 2),
      top: Math.floor(index / columns) * cellHeight + cellHeight - image.info.height - 8
    });
  }
  fs.mkdirSync(OUTPUT, { recursive: true });
  const target = path.join(OUTPUT, 'npc-contact-sheet.png');
  await sharp({
    create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#d7c9aa' }
  }).composite(composites).png({ compressionLevel: 9 }).toFile(target);
  console.log(target);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
