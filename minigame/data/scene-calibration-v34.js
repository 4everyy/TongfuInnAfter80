'use strict';

// Geometry for the bright v34 scene set. All coordinates are expressed in
// logical world units so collision, depth sorting and generated foreground
// masks share one source of truth.

var MAP_SPECS = {
  inn: spec(272, [box('counter', .18, 206, .58, 76, 294, 0), box('stairs', .78, 184, .12, 126, 310, 116), box('left-table', 0, 286, .09, 62, 338, 58), box('right-table', .96, 286, .04, 62, 338, 58)], { floorBottom: 338, main: [.54, 320], npcAnchors: { 'wuchen-inn': [.47, 280] } }),
  yard: spec(218, [box('well', .43, 182, .15, 82, 264, 68), box('wood-rack', .64, 170, .20, 94, 264, 82), box('training-posts', 0, 284, .16, 64, 340, 62)]),
  street: spec(196, [box('left-stalls', 0, 172, .18, 106, 278, 88), box('right-shopfront', .82, 164, .18, 118, 282, 96)], { npcAnchors: { 'npcv37-louzhi': [.30, 304, 'right'] }, npcDepths: { 'street-merchant': 232, 'street-townsman': 280, 'npcv26-noodle-vendor-ma': 288, 'npcv26-map-seller-ye': 304 } }),
  locust_lane: spec(208, [box('left-shop', 0, 172, .19, 106, 278, 92), box('right-wall', .82, 168, .18, 112, 280, 94), box('center-planter', .48, 222, .10, 52, 274, 42)]),
  tea_shed: spec(214, [box('old-tree', 0, 106, .20, 154, 260, 138), box('tea-shed', .19, 154, .39, 104, 258, 96), box('right-jars', .84, 258, .16, 90, 340, 70)], { npcAnchors: { 'tea-owner-npc': [.43, 244] } }),
  east_gate: spec(198, [box('guard-table', 0, 142, .25, 124, 266, 110), box('front-fence', 0, 290, .21, 58, 340, 50), box('right-wall', .82, 170, .18, 106, 276, 96)], { npcAnchors: { 'gate-guard': [.16, 252] } }),
  stone_bridge: spec(222, [box('left-cargo', 0, 210, .19, 84, 294, 72), box('river-edge', .76, 186, .24, 86, 272, 74)]),
  paper_mill: spec(220, [box('pulp-pool', 0, 194, .25, 98, 292, 86), box('press-table', .32, 188, .22, 82, 270, 74), box('drying-rack', .66, 164, .34, 110, 274, 96)]),
  paper_alley: spec(226, [box('left-paper-stack', 0, 192, .22, 88, 280, 78), box('drain-channel', .42, 258, .16, 90, 340, 0, false), box('right-paper-stack', .78, 192, .22, 90, 282, 80)], { walk: [[.03, 226, .44, 326], [.56, 226, .97, 326], [.39, 226, .61, 266]] }),
  old_post: spec(218, [box('left-wreckage', 0, 190, .25, 104, 294, 92), box('mail-rack', .48, 170, .25, 92, 262, 84), box('right-cart', .82, 192, .18, 92, 284, 80)]),
  north_road: spec(214, [box('left-cliff', 0, 154, .22, 120, 274, 106), box('pond', .30, 218, .22, 80, 298, 0, false), box('right-rocks', .78, 192, .22, 96, 288, 84)]),
  guild_warehouse: spec(220, [box('left-crates', 0, 224, .25, 90, 314, 78), box('scale-platform', .40, 212, .17, 62, 274, 56), box('right-crates', .74, 210, .26, 104, 314, 92)], { npcAnchors: { 'npcv26-warehouse-foreman-dou': [.771, 244, 'left'], 'npcv37-xiezhongda': [.36, 304, 'right'] }, npcDepths: { 'guild-clerk': 256, 'npcv26-warehouse-foreman-dou': 244 } }),
  river_yard: spec(222, [box('left-shed', 0, 164, .20, 112, 276, 98), box('waterline', .28, 188, .38, 76, 264, 0, false), box('boat', .61, 210, .23, 70, 280, 64), box('right-cargo', .86, 218, .14, 92, 310, 80)]),
  grain_market: spec(220, [box('left-grain', 0, 180, .30, 106, 286, 94), box('scale-table', .43, 214, .14, 60, 274, 54), box('right-grain', .72, 178, .28, 108, 286, 96)]),
  guild_office: spec(230, [box('left-counter', 0, 170, .24, 112, 282, 100), box('center-table', .42, 222, .19, 72, 294, 62), box('right-cabinets', .77, 158, .23, 124, 282, 110)]),
  charity_granary: spec(222, [box('front-left-grain', 0, 298, .25, 50, 340, 42), box('left-hut', .17, 178, .20, 92, 270, 82), box('right-hut', .54, 176, .20, 94, 270, 84), box('front-right-grain', .75, 298, .25, 50, 340, 42)]),
  canal_checkpoint: spec(202, [box('left-barrier', 0, 222, .18, 74, 296, 64), box('canal', .31, 258, .23, 68, 326, 0, false), box('checkpoint-rail', .58, 250, .07, 68, 318, 60), box('right-water', .70, 258, .13, 68, 326, 0, false), box('right-watch', .84, 170, .16, 112, 282, 96)], { floorBottom: 318, hotspotAnchors: { 'c06-chain-barrier': [.50, 250], 'c06-checkpoint-fight': [.50, 250], 'c06-finale': [.50, 286] }, npcAnchors: { 'npcv37-budazhe': [.27, 238, 'right'] } }),
  money_house: spec(228, [box('left-counter', 0, 164, .28, 126, 290, 112), box('queue-rails', .35, 224, .25, 66, 290, 58), box('center-desk', .61, 218, .17, 74, 292, 64), box('right-counter', .82, 164, .18, 126, 290, 112)]),
  scale_contract_lane: spec(218, [box('left-scale-shop', 0, 168, .27, 112, 280, 100), box('center-tables', .38, 208, .22, 66, 274, 58), box('right-stall', .70, 174, .30, 108, 282, 96)]),
  merchant_alliance_hall: spec(224, [box('left-seats', 0, 190, .24, 90, 280, 80), box('right-seats', .76, 190, .24, 90, 280, 80), box('dais', .39, 158, .22, 78, 236, 70)]),
  old_ledger_vault: spec(224, [box('left-water', 0, 184, .25, 110, 294, 0, false), box('center-plinth', .41, 216, .18, 72, 288, 64), box('right-cabinets', .76, 174, .24, 116, 290, 104)]),
  jiangnan_branch: spec(236, [box('canal-table', 0, 258, .24, 90, 340, 76), box('center-counter', .34, 220, .34, 72, 292, 66), box('right-kitchen', .76, 176, .24, 118, 294, 104)]),
  jiangnan_dock: spec(194, [box('left-water', 0, 186, .18, 118, 304, 0, false), box('left-cargo', .18, 224, .18, 62, 286, 56), box('crane-cart', .45, 206, .15, 66, 272, 58), box('right-water', .82, 186, .18, 118, 304, 0, false), box('right-cargo', .68, 224, .14, 62, 286, 56), box('front-water', .18, 304, .64, 44, 348, 0, false)], { floorBottom: 304, walk: [[.18, 194, .82, 304]], hotspotAnchors: { 'c10-delayed-cargo': [.64, 294], 'c10-banquet-fight': [.64, 294] }, npcAnchors: { 'npcv26-porter-alu': [.622, 294, 'left'], 'npcv26-boatwoman-he': [.697, 300, 'left'], 'npcv37-mazhuozi': [.27, 220, 'right'], 'npcv37-yinshisan': [.72, 220, 'left'] }, npcSlots: { 'dock-clerk': [.46, 294] } }),
  river_market: spec(208, [box('left-water-stalls', 0, 178, .25, 128, 306, 112), box('center-well', .46, 210, .15, 72, 282, 64), box('right-produce', .80, 184, .20, 122, 306, 108)], { floorBottom: 306, walk: [[.24, 208, .82, 306]], npcAnchors: { 'river-market-cook': [.36, 294, 'right'], 'river-vendor': [.58, 294, 'left'], 'npcv26-salt-merchant-xu': [.66, 294, 'left'], 'npcv26-fisherman-jiang': [.72, 294, 'left'] } }),
  rain_ferry: spec(232, [box('left-water', 0, 184, .20, 124, 308, 0, false), box('center-boat', .40, 206, .20, 76, 282, 68), box('right-water', .80, 184, .20, 126, 310, 0, false)], { walk: [[.20, 232, .80, 326]], npcAnchors: { 'npcv26-umbrella-maker-luo': [.64, 254, 'left'], 'npcv26-ferryman-wu': [.36, 314, 'right'] } }),
  jiangnan_spice_workshop: spec(232, [box('left-racks', 0, 168, .23, 128, 296, 112), box('center-worktable', .36, 226, .25, 70, 296, 62), box('right-jars', .74, 180, .26, 118, 298, 104)]),
  old_banquet_kitchen: spec(224, [box('left-stoves', 0, 176, .28, 116, 292, 104), box('banquet-cauldron', .43, 220, .18, 76, 296, 68), box('right-kitchen', .76, 174, .24, 120, 294, 108)])
};

var EXIT_LAYOUT = {
  inn: { 'to-yard': top(.11), 'to-street': top(.90) },
  yard: { 'to-inn': left() },
  street: { 'to-inn': left(), 'to-paper-mill': top(.24), 'to-locust': top(.50), 'to-grain-market': top(.72), 'to-guild-warehouse': right() },
  locust_lane: { 'to-street': left(), 'to-tea': right() },
  tea_shed: { 'to-locust': left(), 'to-gate': right() },
  east_gate: { 'to-tea': left(), 'to-bridge': top(.52), 'to-north-road': right() },
  stone_bridge: { 'to-gate': left(), 'to-jiangnan-dock': right() },
  paper_mill: { 'to-street': left(), 'to-paper-alley': right() },
  paper_alley: { 'to-paper-mill': top(.28), 'to-old-post': top(.72) },
  old_post: { 'to-paper-alley': left() },
  north_road: { 'to-east-gate': left(), 'to-river-yard': right() },
  guild_warehouse: { 'to-street': top(.32), 'to-charity-granary': top(.68) },
  river_yard: { 'to-north-road': left() },
  grain_market: { 'to-street': left(), 'to-guild-office': top(.64), 'to-money-house': right() },
  guild_office: { 'to-grain-market': left(), 'to-merchant-hall': right() },
  charity_granary: { 'to-guild-warehouse': top(.40), 'to-canal-checkpoint': top(.48) },
  canal_checkpoint: { 'to-charity-granary': left() },
  money_house: { 'to-grain-market': left(), 'to-scale-lane': right() },
  scale_contract_lane: { 'to-money-house': left() },
  merchant_alliance_hall: { 'to-guild-office': left(), 'to-old-ledger-vault': right() },
  old_ledger_vault: { 'to-merchant-hall': left() },
  jiangnan_branch: { 'to-jiangnan-dock': right() },
  jiangnan_dock: { 'to-jiangnan-branch': top(.30), 'to-guanzhong-route': top(.40), 'to-river-market': top(.68), 'to-rain-ferry': top(.76) },
  river_market: { 'to-jiangnan-dock': top(.30), 'to-spice-workshop': top(.76) },
  rain_ferry: { 'to-jiangnan-dock': top(.30) },
  jiangnan_spice_workshop: { 'to-river-market': left(), 'to-old-banquet-kitchen': right() },
  old_banquet_kitchen: { 'to-spice-workshop': left() }
};

function box(id, x, y, width, height, sortY, rise, occludes) {
  return { id: id, x: x, y: y, width: width, height: height, sortY: sortY, rise: rise, occludes: occludes !== false, v34: true };
}

function spec(floorTop, obstacles, options) {
  return Object.assign({ floorTop: floorTop, floorBottom: 326, obstacles: obstacles || [] }, options || {});
}

function left() { return { side: 'left' }; }
function right() { return { side: 'right' }; }
function top(ratio) { return { side: 'top', ratio: ratio }; }

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

function scaledRect(definition, width) {
  return rect(Math.round(definition.x * width), definition.y, Math.round(definition.width * width), definition.height);
}

function walkablePolygons(map, scene) {
  if (scene.walk) {
    return scene.walk.map(function (entry) {
      return rect(Math.round(entry[0] * map.width), entry[1], Math.round((entry[2] - entry[0]) * map.width), entry[3] - entry[1]);
    });
  }
  return [rect(18, scene.floorTop, map.width - 36, scene.floorBottom - scene.floorTop)];
}

function obstacleDefinitions(map, scene, previous) {
  var dynamic = (previous || []).filter(function (item) { return item.requires || item.unless; });
  var staticItems = scene.obstacles.map(function (item) {
    var polygon = scaledRect(item, map.width);
    var result = {
      id: item.id,
      polygon: polygon,
      sortY: item.sortY,
      occluderRise: item.rise,
      occludes: item.occludes,
      v34: true
    };
    return result;
  });
  return staticItems.concat(dynamic);
}

function exitZone(map, layout, scene) {
  var y = Math.max(scene.floorTop, 232);
  if (layout.side === 'left') return { x: 0, y: y, width: 54, height: scene.floorBottom - y };
  if (layout.side === 'right') return { x: map.width - 54, y: y, width: 54, height: scene.floorBottom - y };
  return { x: Math.round(map.width * layout.ratio) - 45, y: scene.floorTop, width: 90, height: 54 };
}

function pointInPolygon(point, polygon) {
  var inside = false;
  var i;
  var j;
  for (i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    if (((polygon[i][1] > point.y) !== (polygon[j][1] > point.y))
      && point.x < (polygon[j][0] - polygon[i][0]) * (point.y - polygon[i][1]) / ((polygon[j][1] - polygon[i][1]) || 0.0001) + polygon[i][0]) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  var dx = end[0] - start[0];
  var dy = end[1] - start[1];
  var length = dx * dx + dy * dy;
  var ratio = length ? ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / length : 0;
  ratio = Math.max(0, Math.min(1, ratio));
  return Math.hypot(point.x - (start[0] + ratio * dx), point.y - (start[1] + ratio * dy));
}

function polygonDistance(point, polygon) {
  var result = Infinity;
  var index;
  for (index = 0; index < polygon.length; index += 1) {
    result = Math.min(result, distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]));
  }
  return result;
}

function validPoint(map, point, ignoreNpcs) {
  if (!(map.walkable || []).some(function (polygon) { return pointInPolygon(point, polygon); })) return false;
  if ((map.obstacles || []).some(function (obstacle) { return pointInPolygon(point, obstacle.polygon); })) return false;
  if ((map.exits || []).some(function (exit) {
    var zone = exit.zone;
    return point.x >= zone.x - 46 && point.x <= zone.x + zone.width + 46 && point.y >= zone.y - 30 && point.y <= zone.y + zone.height + 30;
  })) return false;
  if (!ignoreNpcs && (map.npcs || []).some(function (npc) { return Math.hypot(npc.x - point.x, npc.y - point.y) < 52; })) return false;
  return true;
}

function collisionSafe(map, point) {
  var radiusX = 14;
  var radiusY = 8;
  var samples = [{ x: point.x, y: point.y }];
  var index;
  for (index = 0; index < 16; index += 1) {
    var angle = Math.PI * 2 * index / 16;
    samples.push({ x: point.x + Math.cos(angle) * radiusX, y: point.y + Math.sin(angle) * radiusY });
  }
  if (!samples.every(function (sample) {
    return (map.walkable || []).some(function (polygon) {
      return pointInPolygon(sample, polygon) && polygonDistance(sample, polygon) >= .4;
    });
  })) return false;
  if ((map.obstacles || []).some(function (obstacle) {
    return samples.some(function (sample) {
      return pointInPolygon(sample, obstacle.polygon) || polygonDistance(sample, obstacle.polygon) < 1;
    });
  })) return false;
  return true;
}

function isSafeFoot(map, point, ignoreNpcs) {
  return collisionSafe(map, point) && validPoint(map, point, ignoreNpcs);
}

function nearestSafe(map, source, preferredY, ignoreNpcs) {
  var offsets = [0, 48, -48, 96, -96, 144, -144, 216, -216, 288, -288];
  var ys = [preferredY, preferredY + 22, preferredY - 22, preferredY + 44, preferredY - 44, 316, 292, 268, 330];
  var i;
  var j;
  for (i = 0; i < ys.length; i += 1) {
    for (j = 0; j < offsets.length; j += 1) {
      var point = {
        x: Math.max(34, Math.min(map.width - 34, Math.round(source.x + offsets[j]))),
        y: Math.max(20, Math.min(map.height - 14, Math.round(ys[i])))
      };
      if (isSafeFoot(map, point, ignoreNpcs)) return point;
    }
  }
  return { x: Math.round(map.width / 2), y: Math.min(map.height - 16, preferredY) };
}

function nearestWalkable(map, source, preferredY) {
  var offsets = [0, 48, -48, 96, -96, 144, -144, 216, -216, 288, -288, 360, -360];
  var ys = [preferredY, preferredY + 20, preferredY - 20, preferredY + 40, preferredY - 40, map.height - 18, 276, 252, 300, 316];
  for (var yIndex = 0; yIndex < ys.length; yIndex += 1) {
    for (var xIndex = 0; xIndex < offsets.length; xIndex += 1) {
      var point = {
        x: Math.max(24, Math.min(map.width - 24, Math.round(source.x + offsets[xIndex]))),
        y: Math.max(16, Math.min(map.height - 14, Math.round(ys[yIndex])))
      };
      if (collisionSafe(map, point)) return point;
    }
  }
  for (var y = 216; y <= map.height - 18; y += 16) {
    for (var x = 28; x <= map.width - 28; x += 32) {
      var fallback = { x: x, y: y };
      if (collisionSafe(map, fallback)) return fallback;
    }
  }
  return { x: Math.round(map.width / 2), y: Math.round(map.height * .8) };
}

function npcSafePoint(map, source, preferredY, occupied) {
  var xOffsets = [0, 62, -62, 124, -124, 186, -186, 248, -248, 310, -310, 372, -372];
  var yOffsets = [0, 24, 48, -20, 70, -38];
  var i;
  var j;
  function clear(point) {
    if (!isSafeFoot(map, point, true)) return false;
    if (Object.keys(map.spawns || {}).some(function (id) {
      var spawn = map.spawns[id];
      return Math.hypot(spawn.x - point.x, spawn.y - point.y) < 44;
    })) return false;
    return !occupied.some(function (used) { return Math.hypot(used.x - point.x, used.y - point.y) < 44; });
  }
  for (i = 0; i < yOffsets.length; i += 1) {
    for (j = 0; j < xOffsets.length; j += 1) {
      var point = {
        x: Math.max(34, Math.min(map.width - 34, Math.round(source.x + xOffsets[j]))),
        y: Math.max(20, Math.min(map.height - 16, Math.round(preferredY + yOffsets[i])))
      };
      if (clear(point)) return point;
    }
  }
  for (var y = 238; y <= map.height - 18; y += 22) {
    for (var x = 42; x <= map.width - 42; x += 46) {
      var fallback = { x: x, y: y };
      if (clear(fallback)) return fallback;
    }
  }
  return nearestSafe(map, source, preferredY, true);
}

function edgeManagedNpc(npc) {
  return /^npcv(?:26|37)-/.test(npc.id || '')
    || (!npc.roleId && !npc.requires && !npc.unless);
}

function edgeSafePoint(map, scene, source, occupied) {
  var leftFirst = source.x <= map.width / 2;
  var leftRatios = [.10, .16, .22, .28, .34];
  var rightRatios = [.90, .84, .78, .72, .66];
  var ratios = leftFirst ? leftRatios.concat(rightRatios) : rightRatios.concat(leftRatios);
  var ys = [scene.floorTop + 22, scene.floorTop + 46, scene.floorBottom - 22, scene.floorBottom - 46];
  var xIndex;
  var yIndex;
  var candidates = [];

  function clear(point) {
    if (!isSafeFoot(map, point, true)) return false;
    if (Object.keys(map.spawns || {}).some(function (id) {
      var spawn = map.spawns[id];
      return Math.hypot(spawn.x - point.x, spawn.y - point.y) < 54;
    })) return false;
    return !occupied.some(function (used) { return Math.hypot(used.x - point.x, used.y - point.y) < 58; });
  }

  function stageScore(point) {
    var sourceSide = source.x <= map.width / 2 ? -1 : 1;
    var pointSide = point.x <= map.width / 2 ? -1 : 1;
    var score = pointSide === sourceSide ? 0 : 90;
    score += Math.abs(point.x - source.x) * .025;
    score += Math.abs(point.y - source.y) * .08;
    occupied.forEach(function (used) {
      var depthGap = Math.abs(point.y - used.y);
      var sideGap = Math.abs(point.x - used.x);
      if (depthGap < 24) score += (24 - depthGap) * 7;
      if (sideGap < 120) score += (120 - sideGap) * .45;
    });
    return score;
  }

  for (xIndex = 0; xIndex < ratios.length; xIndex += 1) {
    for (yIndex = 0; yIndex < ys.length; yIndex += 1) {
      var point = {
        x: Math.max(34, Math.min(map.width - 34, Math.round(map.width * ratios[xIndex]))),
        y: Math.max(scene.floorTop + 12, Math.min(scene.floorBottom - 12, Math.round(ys[yIndex])))
      };
      if (clear(point)) candidates.push({ point: point, score: stageScore(point) });
    }
  }
  if (candidates.length) {
    candidates.sort(function (a, b) { return a.score - b.score; });
    return candidates[0].point;
  }
  return npcSafePoint(map, source, scene.floorTop + 34, occupied);
}

function harmonizeNpcPose(npc, map, point, anchor) {
  npc.facing = anchor && anchor[2] ? anchor[2] : (point.x < map.width / 2 ? 'right' : 'left');
  npc.stance = npc.merchant ? 'working' : (/ruffian|guard|captain|auditor/.test(npc.id || '') ? 'guarded' : 'relaxed');
  npc.idleClip = npc.roleId === 'shiwei' || npc.roleId === 'wenyan' ? 'interact' : 'idle';
}

function nearSafeFoot(map, point, radius) {
  var gaps = [28, 42, radius || 60];
  var gapIndex;
  var angleIndex;
  if (collisionSafe(map, point)) return true;
  for (gapIndex = 0; gapIndex < gaps.length; gapIndex += 1) {
    for (angleIndex = 0; angleIndex < 16; angleIndex += 1) {
      var angle = Math.PI * 2 * angleIndex / 16;
      if (collisionSafe(map, {
        x: point.x + Math.cos(angle) * gaps[gapIndex],
        y: point.y + Math.sin(angle) * gaps[gapIndex]
      })) return true;
    }
  }
  return false;
}

function staggeredStagePoint(map, scene, npc, point, occupied) {
  if (npc.ambient || npc.roleId || npc.requires || npc.unless) return point;
  var lanes = [scene.floorTop + 24, scene.floorBottom - 18, scene.floorTop + 54, scene.floorBottom - 48];
  var candidates = [];
  lanes.forEach(function (lane) {
    var candidate = {
      x: point.x,
      y: Math.max(scene.floorTop + 10, Math.min(scene.floorBottom - 10, Math.round(lane)))
    };
    var blocksExit = (map.exits || []).some(function (exit) {
      var zone = exit.zone;
      return candidate.x >= zone.x - 30 && candidate.x <= zone.x + zone.width + 30
        && candidate.y >= zone.y - 30 && candidate.y <= zone.y + zone.height + 30;
    });
    var blocksSpawn = Object.keys(map.spawns || {}).some(function (id) {
      var spawn = map.spawns[id];
      return Math.hypot(spawn.x - candidate.x, spawn.y - candidate.y) < 46;
    });
    var overlaps = occupied.some(function (used) {
      return Math.hypot(used.x - candidate.x, used.y - candidate.y) < 46;
    });
    if (blocksExit || blocksSpawn || overlaps || !nearSafeFoot(map, candidate, 60)) return;
    var closestDepth = occupied.reduce(function (gap, used) {
      return Math.min(gap, Math.abs(candidate.y - used.y));
    }, 999);
    candidates.push({
      point: candidate,
      dressed: !collisionSafe(map, candidate),
      score: Math.abs(candidate.y - point.y) * .06 - Math.min(closestDepth, 64) * 5
    });
  });
  if (!candidates.length) return point;
  candidates.sort(function (a, b) { return a.score - b.score; });
  npc.allowBlockedPlacement = true;
  npc.blocksMovement = false;
  return candidates[0].point;
}

function inwardPoint(map, zone, scene) {
  var source = { x: zone.x + zone.width / 2, y: zone.y + zone.height * .7 };
  if (zone.x < 60) source.x = zone.x + zone.width + 34;
  else if (zone.x + zone.width > map.width - 60) source.x = zone.x - 34;
  else source.y = zone.y + zone.height + 30;
  return nearestWalkable(map, source, Math.max(scene.floorTop + 28, source.y));
}

function matchingReverseExit(target, sourceMapId) {
  return (target.exits || []).find(function (exit) { return exit.target === sourceMapId; });
}

function repositionNpcsAndHotspots(map, scene) {
  var anchors = scene.npcAnchors || {};
  var slots = scene.npcSlots || {};
  var occupied = [];
  (map.npcs || []).forEach(function (npc, index) {
    var old = { x: npc.x, y: npc.y };
    var anchor = anchors[npc.id];
    var point;
    if (anchor) {
      point = { x: Math.round(map.width * anchor[0]), y: anchor[1] };
      npc.allowBlockedPlacement = true;
      npc.blocksMovement = false;
    } else if (edgeManagedNpc(npc)) {
      point = edgeSafePoint(map, scene, old, occupied);
    } else if (slots[npc.id]) {
      point = npcSafePoint(map, { x: Math.round(map.width * slots[npc.id][0]), y: slots[npc.id][1] }, slots[npc.id][1], occupied);
    } else {
      point = npcSafePoint(map, old, scene.floorTop + 34 + index % 3 * 24, occupied);
    }
    if (edgeManagedNpc(npc)) point = staggeredStagePoint(map, scene, npc, point, occupied);
    if (scene.npcDepths && scene.npcDepths[npc.id] != null) {
      point.y = scene.npcDepths[npc.id];
      npc.allowBlockedPlacement = true;
      npc.blocksMovement = false;
    }
    npc.x = point.x;
    npc.y = point.y;
    npc.sortY = point.y;
    harmonizeNpcPose(npc, map, point, anchor);
    occupied.push(point);
    (map.hotspots || []).forEach(function (spot) {
      var belongsToNpc = spot.id.indexOf(npc.id + '-') === 0;
      if (belongsToNpc || (Math.hypot(spot.x - old.x, spot.y - old.y) <= 28 && (spot.type === 'dialogue' || spot.type === 'crisis'))) {
        spot.x = point.x;
        spot.y = point.y;
      }
    });
  });
  (map.hotspots || []).forEach(function (spot) {
    var attachedNpc = (map.npcs || []).find(function (npc) {
      return spot.id.indexOf(npc.id + '-') === 0;
    });
    if (attachedNpc && (spot.type === 'dialogue' || spot.type === 'crisis')) {
      spot.x = attachedNpc.x;
      spot.y = attachedNpc.y;
      return;
    }
    var hotspotAnchor = scene.hotspotAnchors && scene.hotspotAnchors[spot.id];
    if (hotspotAnchor) {
      spot.x = Math.round(map.width * hotspotAnchor[0]);
      spot.y = hotspotAnchor[1];
      return;
    }
    if (spot.linkedObjectId) return;
    var point = nearestSafe(map, spot, scene.floorTop + 54, true);
    if (!isSafeFoot(map, spot, true)) {
      spot.x = point.x;
      spot.y = point.y;
    }
  });
}

function apply(maps) {
  var byId = {};
  maps.forEach(function (map) { byId[map.id] = map; });
  maps.forEach(function (map) {
    var scene = MAP_SPECS[map.id];
    var layout = EXIT_LAYOUT[map.id] || {};
    if (!scene) return;
    map.walkable = walkablePolygons(map, scene);
    map.obstacles = obstacleDefinitions(map, scene, map.obstacles);
    (map.exits || []).forEach(function (exit) {
      if (layout[exit.id]) exit.zone = exitZone(map, layout[exit.id], scene);
    });
    map.spawns.main = nearestWalkable(map, { x: map.width * (scene.main ? scene.main[0] : .5), y: scene.main ? scene.main[1] : scene.floorTop + 58 }, scene.main ? scene.main[1] : scene.floorTop + 58);
  });
  maps.forEach(function (map) {
    (map.exits || []).forEach(function (exit) {
      var target = byId[exit.target];
      var targetScene = target && MAP_SPECS[target.id];
      var reverse = target && matchingReverseExit(target, map.id);
      if (!target || !targetScene) return;
      target.spawns[exit.spawn] = reverse
        ? inwardPoint(target, reverse.zone, targetScene)
        : Object.assign({}, target.spawns.main);
      target.spawns[exit.spawn].facing = reverse && reverse.zone.x < 60 ? 'right' : 'left';
    });
  });
  maps.forEach(function (map) {
    var scene = MAP_SPECS[map.id];
    if (!scene) return;
    Object.keys(map.spawns || {}).forEach(function (id) {
      var point = map.spawns[id];
      if (!collisionSafe(map, point)) map.spawns[id] = Object.assign(nearestWalkable(map, point, scene.floorTop + 52), { facing: point.facing || 'right' });
    });
    if (map.id === 'inn') {
      map.spawns.streetDoor = { x: 917, y: 329, facing: 'left' };
      map.spawns.yardDoor = { x: 110, y: 329, facing: 'right' };
    }
    if (map.id === 'jiangnan_dock') {
      map.spawns.marketReturn = { x: 874, y: 278, facing: 'left' };
    }
    repositionNpcsAndHotspots(map, scene);
    map.sceneCalibration = 'v34';
  });
  return maps;
}

module.exports = { specs: MAP_SPECS, exitLayout: EXIT_LAYOUT, apply: apply, pointInPolygon: pointInPolygon, validPoint: validPoint, isSafeFoot: isSafeFoot, collisionSafe: collisionSafe };
