'use strict';

// NPC 站位与显示大小适配检查（纯几何，无需 node_modules / 图片）
// 复刻 explore.js 渲染层的深度缩放与显示高度公式，对 27 张地图的全部 NPC 做体检：
//   1. 脚底 Y 是否落在地板带 [floorTop, floorBottom]
//   2. 脚底点是否可行走（区分 allowBlockedPlacement 故意站柜台后的 NPC）
//   3. 精灵显示高度 = NPC_HEIGHT(104) * depthScale * displayScale * characterScale 是否合理
//   4. 精灵头顶是否会顶入顶部 HUD 区域（SCENE_Y=42）
//   5. NPC 两两是否过近（视觉叠人）
//   6. NPC 是否踩进实体遮挡物多边形（家具内部）
//   7. NPC 是否落在出口触发区（切图风险）

const content = require('../minigame/data/content');
const manifest = require('../minigame/assets/art/manifest');
const world = require('../minigame/src/world/explore');

const SCENE_Y = 42;
const NPC_HEIGHT = 104;
const MIN_DEPTH_SCALE = 0.88;
const MAX_DEPTH_SCALE = 1.04;
const MIN_DEPTH_DELTA = MAX_DEPTH_SCALE - MIN_DEPTH_SCALE;

// 体验阈值（px）
const TOO_TALL = 132;          // 单个 NPC 显示高度上限
const TOO_SHORT = 64;          // 过矮
const HEAD_HUD_MARGIN = 0;     // 头顶进入 HUD 多少 px 才报警
const NPC_OVERLAP = 30;        // 两 NPC 圆心距小于此视为视觉叠人

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function depthBounds(map) {
  var minimum = Infinity;
  var maximum = -Infinity;
  var found = false;
  var poly, point, pi, pp;
  for (pi = 0; pi < (map.walkable || []).length; pi += 1) {
    poly = map.walkable[pi];
    for (pp = 0; pp < poly.length; pp += 1) {
      point = poly[pp];
      if (!found) { minimum = point[1]; maximum = point[1]; found = true; }
      else { minimum = Math.min(minimum, point[1]); maximum = Math.max(maximum, point[1]); }
    }
  }
  if (!found || maximum - minimum < 1) { maximum = (minimum = minimum || 0) + 1; }
  return { minimum: minimum, maximum: maximum };
}

function depthScaleAt(bounds, sortY) {
  var progress = clamp((sortY - bounds.minimum) / (bounds.maximum - bounds.minimum), 0, 1);
  return MIN_DEPTH_SCALE + MIN_DEPTH_DELTA * progress;
}

function pointInPoly(point, polygon) {
  var inside = false;
  var x = point[0], y = point[1];
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1];
    var xj = polygon[j][0], yj = polygon[j][1];
    var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function resolveDisplayScale(npc) {
  if (typeof npc.displayScale === 'number' && isFinite(npc.displayScale)) return npc.displayScale;
  if (npc.roleId && manifest.characters[npc.roleId]) return Number(manifest.characters[npc.roleId].displayScale) || 1;
  if (npc.artId && manifest.npcs && manifest.npcs[npc.artId]) return Number(manifest.npcs[npc.artId].displayScale) || 1;
  return 1;
}

function artLabel(npc) {
  if (npc.roleId) return 'role:' + npc.roleId;
  if (npc.artId) return 'art:' + npc.artId;
  return 'fallback';
}

function isInsideExitZone(npc, map) {
  var exits = map.exits || [];
  var i, z;
  for (i = 0; i < exits.length; i += 1) {
    z = exits[i].zone;
    if (!z) continue;
    if (npc.x >= z.x && npc.x <= z.x + z.width && npc.y >= z.y && npc.y <= z.y + z.height) {
      return exits[i].id || exits[i].target || '?';
    }
  }
  return null;
}

function audit() {
  var maps = content.maps;
  var errors = [];
  var warnings = [];
  var info = [];
  var totalNpc = 0;

  maps.forEach(function (map) {
    var bounds = depthBounds(map);
    var sceneScale = Number(manifest.maps[map.id] && manifest.maps[map.id].characterScale) || 1;
    var npcs = map.npcs || [];
    totalNpc += npcs.length;

    npcs.forEach(function (npc) {
      var sortY = (typeof npc.sortY === 'number' ? npc.sortY : npc.y);
      var scale = depthScaleAt(bounds, sortY);
      var displayScale = resolveDisplayScale(npc);
      var height = NPC_HEIGHT * scale * displayScale * sceneScale;
      var headScreenY = SCENE_Y + npc.y - height;
      var label = '[' + map.id + '] ' + (npc.id || artLabel(npc));
      var pt = [npc.x, npc.y];

      // 1. 地板带
      if (npc.y < bounds.minimum - 4 || npc.y > bounds.maximum + 4) {
        warnings.push(label + ' 脚底 Y=' + npc.y + ' 超出地板带 [' + bounds.minimum + ',' + bounds.maximum + ']');
      }
      // 2. 可行走
      var walkable = (map.walkable || []).some(function (poly) { return pointInPoly(pt, poly); });
      if (!walkable && !npc.allowBlockedPlacement) {
        warnings.push(label + ' 脚底不可行走 (x=' + npc.x + ',y=' + npc.y + ') 且未声明 allowBlockedPlacement');
      }
      // 3. 显示高度
      if (height > TOO_TALL) {
        warnings.push(label + ' 显示高度 ' + height.toFixed(1) + 'px 偏大(>' + TOO_TALL + ')：depthScale=' + scale.toFixed(3) + ' displayScale=' + displayScale + ' sceneScale=' + sceneScale);
      } else if (height < TOO_SHORT) {
        warnings.push(label + ' 显示高度 ' + height.toFixed(1) + 'px 偏小(<' + TOO_SHORT + ')：depthScale=' + scale.toFixed(3) + ' displayScale=' + displayScale + ' sceneScale=' + sceneScale);
      }
      // 4. 头顶进入 HUD
      if (headScreenY < SCENE_Y - HEAD_HUD_MARGIN) {
        warnings.push(label + ' 头顶 screenY=' + headScreenY.toFixed(1) + ' 进入/越过顶部 HUD(42)，显示高度 ' + height.toFixed(1) + 'px');
      }
      // 5. 踩进实体遮挡物（家具内部）
      (map.obstacles || []).forEach(function (obs) {
        if (obs.occludes === false || !obs.polygon) return;
        if (npc.allowBlockedPlacement && npc.behindObstacleId === obs.id) return; // 显式声明站某家具后
        // 设计意图：allowBlockedPlacement + sortY < obstacle.sortY = 站在家具后方被前景遮挡（柜台后站位）
        if (npc.allowBlockedPlacement && sortY <= obs.sortY) return;
        if (pointInPoly(pt, obs.polygon)) {
          warnings.push(label + ' 脚底落在遮挡物 "' + (obs.id || '?') + '" 内部 (sortY=' + obs.sortY + ')');
        }
      });
      // 6. 出口区
      var inExit = isInsideExitZone(npc, map);
      if (inExit) warnings.push(label + ' 脚底落在出口区 "' + inExit + '" 内（可能干扰切图）');

      info.push({ map: map.id, npc: npc.id || artLabel(npc), height: height, sceneScale: sceneScale });
    });

    // 7. NPC 两两过近
    for (var a = 0; a < npcs.length; a += 1) {
      for (var b = a + 1; b < npcs.length; b += 1) {
        var d = Math.hypot(npcs[a].x - npcs[b].x, npcs[a].y - npcs[b].y);
        if (d < NPC_OVERLAP) {
          warnings.push('[' + map.id + '] ' + (npcs[a].id || artLabel(npcs[a])) + ' 与 ' + (npcs[b].id || artLabel(npcs[b])) + ' 相距仅 ' + d.toFixed(0) + 'px（视觉叠人）');
        }
      }
    }
  });

  // 汇总
  var byMap = {};
  info.forEach(function (r) { (byMap[r.map] = byMap[r.map] || []).push(r); });

  console.log('==== NPC 站位 / 显示大小适配检查 ====');
  console.log('地图数: ' + maps.length + '   NPC 总数: ' + totalNpc);
  console.log('错误: ' + errors.length + '   警告: ' + warnings.length);
  console.log('');
  console.log('--- 逐地图 NPC 显示高度概览 (px) ---');
  Object.keys(byMap).forEach(function (id) {
    var rows = byMap[id];
    var hs = rows.map(function (r) { return r.height; });
    var min = Math.min.apply(null, hs);
    var max = Math.max.apply(null, hs);
    var avg = hs.reduce(function (s, v) { return s + v; }, 0) / hs.length;
    var tag = rows[0].sceneScale !== 1 ? ' (characterScale=' + rows[0].sceneScale + ')' : '';
    var pad = id.length < 26 ? id + '                       '.slice(0, 26 - id.length) : id + ' ';
    console.log(pad + 'NPC=' + rows.length + '  高度 ' + min.toFixed(0) + '~' + max.toFixed(0) + ' (均' + avg.toFixed(0) + ')' + tag);
  });

  if (warnings.length) {
    console.log('');
    console.log('--- 警告明细 (' + warnings.length + ') ---');
    warnings.forEach(function (w) { console.log('  • ' + w); });
  }
  if (errors.length) {
    console.log('');
    console.log('--- 错误明细 (' + errors.length + ') ---');
    errors.forEach(function (e) { console.log('  x ' + e); });
  }

  if (errors.length) process.exitCode = 1;
}

audit();
