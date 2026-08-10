'use strict';

const path = require('path');
const sharp = require('sharp');

const input = process.argv[2];
const output = process.argv[3];
const columns = Number(process.argv[4] || 4);
const rows = Number(process.argv[5] || 2);
const targetFrame = Number(process.argv[6] || 0);

if (!input || !output || !Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || !Number.isInteger(targetFrame) || targetFrame < 0) {
  console.error('Usage: node tools/normalize_vfx_sheet.js <input> <output> [columns] [rows] [targetFrame]');
  process.exit(1);
}

(async function run() {
  const metadata = await sharp(input).metadata();
  const frame = Math.min(Math.floor(metadata.width / columns), Math.floor(metadata.height / rows));
  const width = frame * columns;
  const height = frame * rows;
  const left = Math.floor((metadata.width - width) / 2);
  const top = Math.floor((metadata.height - height) / 2);

  let pipeline = sharp(input).extract({ left, top, width, height });
  if (targetFrame > 0 && targetFrame !== frame) {
    pipeline = pipeline.resize(targetFrame * columns, targetFrame * rows, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3
    });
  }

  await pipeline
    .webp({ quality: 86, alphaQuality: 95 })
    .toFile(output);

  console.log(JSON.stringify({
    output: path.resolve(output),
    columns,
    rows,
    sourceFrame: frame,
    frame: targetFrame || frame,
    width: (targetFrame || frame) * columns,
    height: (targetFrame || frame) * rows
  }));
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
