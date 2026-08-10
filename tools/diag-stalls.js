#!/usr/bin/env node
'use strict';

// 诊断：测试不同排斥阈值下能否找到合法点
const ms = require('../minigame/data/merchant-stalls');
const realApply = ms.apply;
ms.apply = function (maps) { return maps; };
let content;
try { content = require('../minigame/data/content'); } finally { ms.apply = realApply; }

function pointInPolygon(point, polygon) {
  var inside = false; var i; var j;
  for (i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    if (((polygon[i][1] > point.y) !== (polygon[j][1] > point.y))
      && point.x < (polygon[j][0] - polygon[i][0]) * (point.y - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]) inside = !inside;
  }
  return inside;
}
function distanceToSegment(point, start, end) {
  var dx = end[0] - start[0]; var dy = end[1] - start[1]; var length = dx * dx + dy * dy;
  var t = length ? ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / length : 0;
  t = Math.max(0, Math.min(1, t)); var x = start[0] + t * dx; var y = start[1] + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}
function polygonDistance(point, polygon) {
  var r = Infinity; var i;
  for (i = 0; i < polygon.length; i += 1) r = Math.min(r, distanceToSegment(point, polygon[i], polygon[(i + 1) % polygon.length]));
  return r;
}
function insideExit(point, exit) {
  var z = exit.zone || exit;
  return point.x >= z.x - 46 && point.x <= z.x + z.width + 46
    && point.y >= z.y - 30 && point.y <= z.y + z.height + 30;
}

function makeValid(cfg) {
  return function (map, point) {
    var floor = (map.walkable || []).some(function (poly) {
      return pointInPolygon(point, poly) && polygonDistance(point, poly) >= cfg.edge;
    });
    if (!floor) return false;
    if ((map.obstacles || []).some(function (ob) {
      return pointInPolygon(point, ob.polygon) || polygonDistance(point, ob.polygon) < cfg.obstacle;
    })) return false;
    if (Object.keys(map.spawns || {}).some(function (id) {
      return Math.hypot(point.x - map.spawns[id].x, point.y - map.spawns[id].y) < cfg.spawn;
    })) return false;
    if ((map.npcs || []).some(function (npc) {
      return Math.hypot(point.x - npc.x, point.y - npc.y) < cfg.npc;
    })) return false;
    if ((map.hotspots || []).some(function (h) {
      return Math.hypot(point.x - h.x, point.y - h.y) < cfg.hotspot;
    })) return false;
    if ((map.exits || []).some(function (ex) { return insideExit(point, ex); })) return false;
    return true;
  };
}

var configs = {
  strict: { edge: 14, obstacle: 24, spawn: 62, npc: 70, hotspot: 44 }, // 现状
  medium: { edge: 12, obstacle: 20, spawn: 40, npc: 44, hotspot: 30 },
  loose: { edge: 10, obstacle: 18, spawn: 32, npc: 34, hotspot: 24 },
};

var mapIds = ms.stalls.map(function (s) { return s.mapId; });
var unique = mapIds.filter(function (id, i) { return mapIds.indexOf(id) === i; });

console.log('map'.padEnd(26), 'strict', 'medium', 'loose');
unique.forEach(function (id) {
  var map = content.maps.find(function (m) { return m.id === id; });
  if (!map) { console.log(id, 'NOT FOUND'); return; }
  var row = [id];
  Object.keys(configs).forEach(function (ck) {
    var valid = makeValid(configs[ck]);
    var found = 0;
    for (var gx = 40; gx < map.width; gx += 60) {
      for (var gy = 120; gy < 340; gy += 14) {
        if (valid(map, { x: gx, y: gy })) found += 1;
      }
    }
    row.push(found);
  });
  console.log(row[0].padEnd(26), String(row[1]).padStart(6), String(row[2]).padStart(6), String(row[3]).padStart(6));
});