'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MINIGAME = path.join(ROOT, 'minigame');
const MAIN_ART = path.join(MINIGAME, 'assets', 'art');
const manifest = require('../minigame/assets/art/manifest');
const content = require('../minigame/data/content');
const presentation = require('../minigame/data/presentation');

const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

function collectStrings(value, result, seen) {
  if (typeof value === 'string') {
    if (IMAGE_PATTERN.test(value)) result.add(value.replace(/\\/g, '/'));
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result, seen));
    return;
  }
  Object.keys(value).forEach((key) => collectStrings(value[key], result, seen));
}

function runtimeFile(source) {
  const match = /^@([^/]+)\/(.+)$/.exec(source);
  return match
    ? path.join(MINIGAME, 'subpackages', match[1], 'assets', 'art', match[2])
    : path.join(MAIN_ART, source);
}

function listFiles(directory, result) {
  if (!fs.existsSync(directory)) return;
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) listFiles(target, result);
    else result.push(target);
  });
}

function removeEmptyDirectories(directory, keepRoot) {
  if (!fs.existsSync(directory)) return;
  fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).forEach((entry) => {
    removeEmptyDirectories(path.join(directory, entry.name), false);
  });
  if (!keepRoot && !fs.readdirSync(directory).length) fs.rmdirSync(directory);
}

function packageName(file) {
  if (!file.startsWith(path.join(MINIGAME, 'subpackages') + path.sep)) return null;
  const relative = path.relative(path.join(MINIGAME, 'subpackages'), file).split(path.sep);
  return relative.length > 1 ? relative[0] : null;
}

function main() {
  const sources = new Set();
  collectStrings(manifest, sources, new Set());
  collectStrings(content, sources, new Set());
  collectStrings(presentation, sources, new Set());
  Object.keys(manifest.characters || {}).forEach((roleId) => {
    for (let skillIndex = 0; skillIndex < 3; skillIndex += 1) {
      collectStrings(presentation.skill(roleId, skillIndex), sources, new Set());
    }
  });

  const live = new Set(Array.from(sources).map((source) => path.normalize(runtimeFile(source))));
  const files = [];
  listFiles(MAIN_ART, files);
  const packageRoot = path.join(MINIGAME, 'subpackages');
  if (fs.existsSync(packageRoot)) {
    fs.readdirSync(packageRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).forEach((entry) => {
      listFiles(path.join(packageRoot, entry.name, 'assets', 'art'), files);
    });
  }

  const candidates = files.filter((file) => IMAGE_PATTERN.test(file) || path.basename(file) === 'build-report.json');
  const unused = candidates.filter((file) => !live.has(path.normalize(file)));
  const missing = Array.from(live).filter((file) => !fs.existsSync(file));
  const byPackage = {};
  unused.forEach((file) => {
    const name = packageName(file) || 'main';
    byPackage[name] = byPackage[name] || { files: 0, bytes: 0 };
    byPackage[name].files += 1;
    byPackage[name].bytes += fs.statSync(file).size;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    liveAssets: live.size,
    scannedAssets: candidates.length,
    unusedAssets: unused.length,
    unusedBytes: unused.reduce((total, file) => total + fs.statSync(file).size, 0),
    missing: missing.map((file) => path.relative(ROOT, file).replace(/\\/g, '/')),
    byPackage,
    unused: unused.map((file) => ({
      path: path.relative(ROOT, file).replace(/\\/g, '/'),
      bytes: fs.statSync(file).size,
    })),
  };
  const output = path.join(ROOT, 'outputs', 'runtime-asset-audit.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  if (process.argv.includes('--prune')) {
    if (missing.length) throw new Error('Refusing to prune while live assets are missing');
    unused.forEach((file) => {
      const inMain = file.startsWith(MAIN_ART + path.sep);
      const inPackage = file.startsWith(path.join(MINIGAME, 'subpackages') + path.sep)
        && file.indexOf(path.join('assets', 'art') + path.sep) >= 0;
      if (!inMain && !inPackage) throw new Error('Unsafe prune path: ' + file);
      fs.unlinkSync(file);
    });
    removeEmptyDirectories(MAIN_ART, true);
    fs.readdirSync(packageRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).forEach((entry) => {
      const artRoot = path.join(packageRoot, entry.name, 'assets', 'art');
      if (fs.existsSync(artRoot)) removeEmptyDirectories(artRoot, true);
    });
    const pruneReport = path.join(ROOT, 'outputs', 'runtime-asset-prune-report.json');
    fs.writeFileSync(pruneReport, JSON.stringify({
      removedAt: new Date().toISOString(),
      removedAssets: report.unusedAssets,
      removedBytes: report.unusedBytes,
      files: report.unused,
    }, null, 2));
  }
  console.log(JSON.stringify({
    liveAssets: report.liveAssets,
    scannedAssets: report.scannedAssets,
    unusedAssets: report.unusedAssets,
    unusedMB: Number((report.unusedBytes / 1024 / 1024).toFixed(2)),
    missing: report.missing.length,
    byPackage: report.byPackage,
    report: output,
    pruned: process.argv.includes('--prune'),
  }, null, 2));
  if (missing.length) process.exitCode = 1;
}

main();
