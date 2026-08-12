'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const content = require('../minigame/data/content');
const sceneV34 = require('../minigame/assets/art/scene-v34');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = process.env.SCENE_V34_SOURCE_ROOT || 'D:\\AI\\design-assets\\tongfu-scenes';

const SOURCES = {
  inn: 'v33-bright/source/01-tongfu-inn-hall-bright.png',
  street: 'v33-bright/source/02-qixia-west-street-bright.png',
  stone_bridge: 'v33-bright/source/03-baishi-bridge-bright.png',
  east_gate: 'v34-redesign/source/01-qixia-town-gate-stage.png',
  locust_lane: 'v34-redesign/source/02-qixia-lantern-market-street.png',
  north_road: 'v34-redesign/source/03-heifeng-ridge-north-road.png',
  river_yard: 'v34-redesign/source/04-xiliang-river-old-ferry.png',
  yard: 'v34-redesign/source/05-tongfu-rear-yard.png',
  tea_shed: 'v34-redesign/source/06-qixia-east-street-tea-shed.png',
  paper_mill: 'v34-redesign/source/07-hanyuanzhai-paper-workshop.png',
  paper_alley: 'v34-redesign/source/08-hanyuanzhai-paper-alley.png',
  old_post: 'v34-redesign/source/09-shibalipu-abandoned-post.png',
  guild_warehouse: 'v34-redesign/source/10-shibalipu-merchant-warehouse.png',
  grain_market: 'v34-redesign/source/11-shibalipu-jiqing-grain-market.png',
  guild_office: 'v34-redesign/source/12-wanli-pawnshop-accounts-office.png',
  charity_granary: 'v34-redesign/source/13-zuojiazhuang-relief-granary.png',
  canal_checkpoint: 'v34-redesign/source/14-xiliang-canal-checkpoint.png',
  money_house: 'v34-redesign/source/15-shibalipu-money-house.png',
  scale_contract_lane: 'v34-redesign/source/16-qixia-scale-contract-lane.png',
  merchant_alliance_hall: 'v34-redesign/source/17-guangyang-merchant-alliance-hall.png',
  old_ledger_vault: 'v34-redesign/source/18-taiping-old-ledger-vault.png',
  jiangnan_branch: 'v34-redesign/source/19-yangzhou-zuixianlou-branch.png',
  jiangnan_dock: 'v34-redesign/source/20-yangzhou-canal-dock.png',
  river_market: 'v34-redesign/source/21-yangzhou-river-market.png',
  rain_ferry: 'v34-redesign/source/22-yangzhou-rain-ferry.png',
  jiangnan_spice_workshop: 'v34-redesign/source/23-zuixianlou-spice-workshop.png',
  old_banquet_kitchen: 'v34-redesign/source/24-zuixianlou-old-banquet-kitchen.png'
};

function ensureDirectory(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function mapById(id) {
  const found = content.maps.find((item) => item.id === id);
  if (!found) throw new Error('Unknown map ' + id);
  return found;
}

function polygonBounds(polygon) {
  const xs = polygon.map((point) => point[0]);
  const ys = polygon.map((point) => point[1]);
  return {
    left: Math.max(0, Math.floor(Math.min.apply(Math, xs))),
    top: Math.max(0, Math.floor(Math.min.apply(Math, ys))),
    right: Math.ceil(Math.max.apply(Math, xs)),
    bottom: Math.ceil(Math.max.apply(Math, ys))
  };
}

function foregroundBounds(obstacle, map) {
  const footprint = polygonBounds(obstacle.occluderPolygon || obstacle.polygon);
  const rise = typeof obstacle.occluderRise === 'number' ? obstacle.occluderRise : 64;
  return {
    left: Math.max(0, footprint.left),
    top: Math.max(0, Math.min(footprint.top, footprint.bottom - rise)),
    right: Math.min(map.width, footprint.right),
    bottom: Math.min(map.height, footprint.bottom)
  };
}

function maskSvg(obstacle, bounds) {
  const polygon = obstacle.occluderPolygon || obstacle.polygon;
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const center = { x: width / 2, y: height / 2 };
  const points = polygon.map((point) => {
    const x = point[0] - bounds.left;
    const y = point[1] - bounds.top;
    const insetX = x < center.x ? Math.min(center.x, x + 1) : Math.max(center.x, x - 1);
    const insetY = y < center.y ? Math.min(center.y, y + 1) : Math.max(center.y, y - 1);
    return insetX + ',' + insetY;
  }).join(' ');
  const footprint = polygonBounds(polygon);
  const rise = Math.max(0, footprint.top - bounds.top);
  const topLeft = Math.max(0, footprint.left - bounds.left);
  const topRight = Math.min(width, footprint.right - bounds.left);
  const silhouette = rise > 0
    ? `${topLeft + width * .04},1 ${topRight - width * .04},1 ${points}`
    : points;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${silhouette}" fill="white"/></svg>`);
}

async function buildBackground(id, source, output, map) {
  ensureDirectory(output);
  await sharp(source)
    .resize(map.width, map.height, { fit: 'cover', position: 'south', kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 78, chromaSubsampling: '4:2:0', mozjpeg: true })
    .toFile(output);
}

async function buildForegrounds(id, packageName, background, map) {
  const outputs = [];
  for (const obstacle of map.obstacles || []) {
    if (!obstacle.v34 || obstacle.occludes === false) continue;
    const bounds = foregroundBounds(obstacle, map);
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const output = path.join(ROOT, 'minigame', 'subpackages', packageName, 'assets', 'art', 'maps', id, 'foreground', obstacle.id + '.png');
    const crop = await sharp(background)
      .extract({ left: bounds.left, top: bounds.top, width, height })
      .ensureAlpha()
      .png()
      .toBuffer();
    ensureDirectory(output);
    await sharp(crop)
      .composite([{ input: maskSvg(obstacle, bounds), blend: 'dest-in' }])
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92, colours: 256, dither: .55 })
      .toFile(output);
    outputs.push(output);
  }
  return outputs;
}

async function main() {
  const report = { version: 34, sourceRoot: SOURCE_ROOT, maps: [], packages: {} };
  for (const id of Object.keys(sceneV34.mapPackages)) {
    const packageName = sceneV34.mapPackages[id];
    const map = mapById(id);
    const source = path.join(SOURCE_ROOT, SOURCES[id]);
    const packageMapsRoot = path.resolve(ROOT, 'minigame', 'subpackages', packageName, 'assets', 'art', 'maps');
    const mapOutputRoot = path.resolve(packageMapsRoot, id);
    const output = path.join(mapOutputRoot, 'background.jpg');
    if (!fs.existsSync(source)) throw new Error('Missing source image: ' + source);
    if (!mapOutputRoot.startsWith(packageMapsRoot + path.sep)) throw new Error('Unsafe map output path: ' + mapOutputRoot);
    if (fs.existsSync(mapOutputRoot)) fs.rmSync(mapOutputRoot, { recursive: true, force: true });
    await buildBackground(id, source, output, map);
    const foregrounds = await buildForegrounds(id, packageName, output, map);
    const bytes = fs.statSync(output).size + foregrounds.reduce((total, file) => total + fs.statSync(file).size, 0);
    report.maps.push({ id, packageName, width: map.width, height: map.height, foregrounds: foregrounds.length, bytes });
  }
  Object.keys(sceneV34.mapPackages).forEach((id) => {
    const name = sceneV34.mapPackages[id];
    report.packages[name] = (report.packages[name] || 0) + report.maps.find((item) => item.id === id).bytes;
  });
  const reportFile = path.join(ROOT, 'outputs', 'scene-v34-build-report.json');
  ensureDirectory(reportFile);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ maps: report.maps.length, packages: report.packages, report: reportFile }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
