'use strict';

var content = require('../../data/content');

var MAP_PACKAGES = {
  inn: 'scene-core-v23',
  yard: 'scene-core-v23',
  street: 'scene-core-v23',
  paper_mill: 'scene-s1-v23',
  old_post: 'scene-s1-v23',
  grain_market: 'scene-s1-v23',
  merchant_alliance_hall: 'scene-s1-v23',
  old_ledger_vault: 'scene-s1-v23',
  jiangnan_branch: 'scene-s2-v23',
  jiangnan_dock: 'scene-s2-v23',
  river_market: 'scene-s2-v23',
  jiangnan_spice_workshop: 'scene-s2-v23',
  old_banquet_kitchen: 'scene-s2-v23'
};

var TASK_PROPS = {
  inn: [
    placed(task('core/ledger', 'ledger', 500, 310, 0.16), { x: 500, y: 246, sortY: 294 }),
    placed(task('core/notice-scroll', 'notice', 540, 304, 0.20), { x: 540, y: 218, sortY: 294 })
  ],
  yard: [
    task('core/broken-rope', 'broken-rope', 390, 270, 0.32, ['mission-accepted'], ['yard-trail'])
  ],
  street: [
    task('core/spice-crate', 'street-cargo', 300, 275, 0.34, ['yard-trail'], ['jingzhi-cooperating']),
    task('core/road-plaque', 'street-sign', 670, 266, 0.28, null, null, true)
  ],
  paper_mill: [
    placed(task('s1/fiber-basket', 'fiber-sample', 210, 276, 0.22, ['c03-started'], ['c03-fiber-sample']), { y: 258, sortY: 258 }),
    placed(task('s1/watermark-paper', 'watermark-paper', 580, 270, 0.20, ['c03-fiber-sample'], ['c03-watermark-sample']), { y: 258, sortY: 258 }),
    placed(task('s1/paper-edge', 'paper-edge', 810, 278, 0.18, ['c03-started'], ['c03-paper-edge']), { y: 258, sortY: 258 })
  ],
  old_post: [
    placed(task('s1/old-letter', 'old-letter', 1090, 282, 0.20, ['c03-ink-trail'], ['c03-letter-read']), { y: 266, sortY: 266 }),
    task('s1/seal-press', 'seal-press', 340, 292, 0.32, ['c03-letter-read'], ['c03-seal-matched'])
  ],
  grain_market: [
    task('s1/marked-grain-crate', 'marked-grain', 980, 298, 0.34, ['c05-price-sampled'], ['c05-crates-marked'])
  ],
  merchant_alliance_hall: [
    placed(task('s1/old-bronze-seal', 'old-alliance-seal', 1140, 292, 0.18, ['c08-contract-code'], ['c08-old-seal']), { y: 260, sortY: 260 })
  ],
  old_ledger_vault: [
    task('s2/inspection-lantern', 'inspection-lantern', 1040, 292, 0.18, ['c08-heat-mark'], ['c08-light-mark']),
    task('s1/burnt-ledger-page', 'first-ledger-page', 1260, 292, 0.18, ['c08-light-mark'], ['c08-ledger-page'])
  ],
  jiangnan_branch: [
    placed(task('core/returned-dishes', 'returned-dishes', 570, 280, 0.16, ['c11-started'], ['c11-returns-checked']), { x: 520, y: 210, sortY: 226 }),
    placed(task('s2/seasoning-bowl', 'seasoning-bowl', 520, 280, 0.16, ['c11-shiwei-quest', 'c11-recipe-fragment'], ['c11-seasoning-complete']), { x: 560, y: 210, sortY: 226 })
  ],
  jiangnan_dock: [
    task('core/spice-crate', 'dock-spice-crate', 700, 300, 0.36, ['c09-started'], ['c09-crates-checked'])
  ],
  river_market: [
    task('s2/spice-record', 'spice-record', 580, 300, 0.25, ['c11-identify-complete'], ['c11-market-traced'])
  ],
  jiangnan_spice_workshop: [
    task('s2/sealed-spice-sack', 'sealed-spice-sack', 1010, 292, 0.22, ['c11-market-traced'], ['c11-seal-rope-collected']),
    placed(task('s2/broken-seal-rope', 'broken-seal-rope', 1010, 292, 0.18, ['c11-seal-rope-collected'], ['c11-workshop-proof']), { x: 985 }),
    placed(task('s2/workshop-ledger', 'workshop-ledger', 1080, 292, 0.18, ['c11-identify-complete', 'c11-seal-rope-collected'], ['c11-workshop-proof']), { x: 1100 })
  ],
  old_banquet_kitchen: [
    placed(task('s2/charred-recipe', 'charred-recipe', 1040, 292, 0.20, ['c11-workshop-proof'], ['c11-recipe-fragment']), { y: 258, sortY: 258 }),
    task('s2/banquet-cauldron', 'banquet-cauldron', 650, 300, 0.40, ['c11-seasoning-complete', 'c11-shiwei-quest'], ['c11-fire-complete'])
  ]
};

function task(asset, id, x, y, scale, requires, unless, decorative) {
  return {
    asset: asset,
    id: id,
    x: x,
    y: y,
    interactionAnchor: { x: x, y: y },
    sortY: y,
    scale: scale * (256 / 192),
    pivot: { x: 96, y: 183 },
    requires: requires || null,
    unless: unless || null,
    decorative: !!decorative
  };
}

function placed(item, visual) {
  item.x = typeof visual.x === 'number' ? visual.x : item.x;
  item.y = typeof visual.y === 'number' ? visual.y : item.y;
  item.sortY = typeof visual.sortY === 'number' ? visual.sortY : item.sortY;
  return item;
}

function mapDef(id) {
  var index;
  for (index = 0; index < content.maps.length; index += 1) {
    if (content.maps[index].id === id) return content.maps[index];
  }
  return null;
}

function polygonBounds(polygon) {
  var left = Infinity;
  var top = Infinity;
  var right = -Infinity;
  var bottom = -Infinity;
  var index;
  for (index = 0; index < polygon.length; index += 1) {
    left = Math.min(left, polygon[index][0]);
    top = Math.min(top, polygon[index][1]);
    right = Math.max(right, polygon[index][0]);
    bottom = Math.max(bottom, polygon[index][1]);
  }
  return { left: left, top: top, right: right, bottom: bottom };
}

function occluderProp(packageName, mapId, obstacle) {
  var bounds = polygonBounds(obstacle.polygon);
  var rise = typeof obstacle.occluderRise === 'number'
    ? obstacle.occluderRise
    : Math.min(86, Math.max(34, (bounds.bottom - bounds.top) * 0.9));
  var top = Math.max(0, Math.floor(bounds.top - rise));
  return {
    id: 'v23-occluder-' + obstacle.id,
    src: '@' + packageName + '/maps/' + mapId + '/props/occluder-' + obstacle.id + '.png',
    x: Math.floor(bounds.left),
    y: top,
    width: Math.ceil(bounds.right - bounds.left),
    height: Math.ceil(bounds.bottom - top),
    sortY: typeof obstacle.sortY === 'number' ? obstacle.sortY : bounds.bottom,
    obstacleId: obstacle.id,
    parallax: 1,
    optional: true,
    v23: true
  };
}

function lightingLayers(packageName, mapId, baseLayer) {
  return ['morning', 'noon', 'evening'].map(function (phase) {
    return {
      id: 'v23-light-' + phase,
      src: '@' + packageName + '/maps/' + mapId + '/light-' + phase + '.webp',
      kind: 'lighting',
      phase: phase,
      blend: 'source-over',
      alpha: 1,
      parallax: typeof baseLayer.parallax === 'number' ? baseLayer.parallax : 1,
      worldWidth: baseLayer.worldWidth,
      worldHeight: baseLayer.worldHeight,
      x: baseLayer.x || 0,
      y: baseLayer.y || 0,
      order: 5,
      optional: true,
      v23: true
    };
  });
}

function runtimeTaskProp(packageName, item) {
  return {
    id: 'v23-task-' + item.id,
    src: '@' + packageName + '/props/' + item.asset + '.png',
    x: item.x,
    y: item.y,
    sortY: item.sortY,
    scale: item.scale,
    pivot: item.pivot,
    requires: item.requires,
    unless: item.unless,
    decorative: item.decorative,
    interactionAnchor: item.interactionAnchor,
    optional: true,
    v23: true
  };
}

function apply(maps) {
  Object.keys(MAP_PACKAGES).forEach(function (mapId) {
    var art = maps[mapId];
    var map = mapDef(mapId);
    var packageName = MAP_PACKAGES[mapId];
    var baseLayer;
    var existing;
    var replacements = {};
    var additions = [];
    if (!art || !map || !art.layers || !art.layers.length) return;
    baseLayer = art.layers[0];
    art.layers = art.layers.filter(function (layer) { return !layer.v23; });
    art.layers = art.layers.concat(lightingLayers(packageName, mapId, baseLayer));

    (map.obstacles || []).forEach(function (obstacle) {
      if (obstacle.occludes === false) return;
      replacements[obstacle.id] = true;
      additions.push(occluderProp(packageName, mapId, obstacle));
    });
    (TASK_PROPS[mapId] || []).forEach(function (item) {
      additions.push(runtimeTaskProp(packageName, item));
    });
    existing = (art.props || []).filter(function (item) {
      if (item.v23) return false;
      if (item.obstacleId && replacements[item.obstacleId]) return false;
      if (mapId === 'jiangnan_spice_workshop' && /problem-spice-sack/.test(item.src || '')) return false;
      if (mapId === 'old_banquet_kitchen' && /charred-recipe/.test(item.src || '')) return false;
      return true;
    });
    art.props = existing.concat(additions);
    art.scenePackage = packageName;
    art.hasPhaseLighting = true;
  });
  return maps;
}

module.exports = {
  mapPackages: MAP_PACKAGES,
  taskProps: TASK_PROPS,
  apply: apply
};
