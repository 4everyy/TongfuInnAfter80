'use strict';

var content = require('../../data/content');

var MAP_PACKAGES = {
  inn: 'scene-core-v34', yard: 'scene-core-v34', street: 'scene-core-v34', locust_lane: 'scene-core-v34', tea_shed: 'scene-core-v34', east_gate: 'scene-core-v34', stone_bridge: 'scene-core-v34',
  paper_mill: 'scene-s1a-v34', paper_alley: 'scene-s1a-v34', old_post: 'scene-s1a-v34', north_road: 'scene-s1a-v34', guild_warehouse: 'scene-s1a-v34', river_yard: 'scene-s1a-v34',
  grain_market: 'scene-s1b-v34', guild_office: 'scene-s1b-v34', charity_granary: 'scene-s1b-v34', canal_checkpoint: 'scene-s1b-v34', money_house: 'scene-s1b-v34', scale_contract_lane: 'scene-s1b-v34', merchant_alliance_hall: 'scene-s1b-v34', old_ledger_vault: 'scene-s1b-v34',
  jiangnan_branch: 'scene-s2-v34', jiangnan_dock: 'scene-s2-v34', river_market: 'scene-s2-v34', rain_ferry: 'scene-s2-v34', jiangnan_spice_workshop: 'scene-s2-v34', old_banquet_kitchen: 'scene-s2-v34'
};

function mapDef(id) {
  return content.maps.find(function (item) { return item.id === id; });
}

function bounds(polygon) {
  var xs = polygon.map(function (point) { return point[0]; });
  var ys = polygon.map(function (point) { return point[1]; });
  return { left: Math.min.apply(Math, xs), top: Math.min.apply(Math, ys), right: Math.max.apply(Math, xs), bottom: Math.max.apply(Math, ys) };
}

function foregroundProp(packageName, mapId, obstacle) {
  var box = bounds(obstacle.occluderPolygon || obstacle.polygon);
  var rise = typeof obstacle.occluderRise === 'number' ? obstacle.occluderRise : 64;
  var top = Math.max(0, Math.min(box.top, box.bottom - rise));
  return {
    id: 'v34-foreground-' + obstacle.id,
    src: '@' + packageName + '/maps/' + mapId + '/foreground/' + obstacle.id + '.png',
    x: Math.floor(box.left), y: Math.floor(top),
    width: Math.ceil(box.right - box.left), height: Math.ceil(box.bottom - top),
    sortY: typeof obstacle.sortY === 'number' ? obstacle.sortY : box.bottom,
    obstacleId: obstacle.id, parallax: 1, optional: true, v34: true
  };
}

function apply(maps) {
  Object.keys(MAP_PACKAGES).forEach(function (mapId) {
    var art = maps[mapId];
    var map = mapDef(mapId);
    var packageName = MAP_PACKAGES[mapId];
    var preserved;
    var staticIds = {};
    if (!art || !map) return;
    (map.obstacles || []).forEach(function (obstacle) { if (obstacle.v34) staticIds[obstacle.id] = true; });
    preserved = (art.props || []).filter(function (prop) {
      if (prop.v34) return false;
      if (prop.v23 && prop.obstacleId) return false;
      if (prop.obstacleId && staticIds[prop.obstacleId]) return false;
      return true;
    });
    art.layers = [{
      id: 'v34-background', src: '@' + packageName + '/maps/' + mapId + '/background.jpg',
      kind: 'background', parallax: 1, worldWidth: map.width, worldHeight: map.height,
      x: 0, y: 0, order: 0, v34: true
    }];
    (map.obstacles || []).forEach(function (obstacle) {
      if (!obstacle.v34 || obstacle.occludes === false) return;
      preserved.push(foregroundProp(packageName, mapId, obstacle));
    });
    art.props = preserved;
    art.props.forEach(function (prop) {
      var target = null;
      if (/^npcv26-prop-/.test(prop.id || '')) {
        var npcId = prop.id.replace(/^npcv26-prop-/, '');
        target = (map.hotspots || []).find(function (spot) {
          return spot.id === 'npcv26-task-' + npcId || spot.id === 'npcv26-job-' + npcId;
        });
      }
      if (target) {
        prop.x = target.x;
        prop.y = target.y;
        prop.sortY = target.y;
      }
    });
    art.scenePackage = packageName;
    // 客栈与江南分号作为枢纽内景，人物略大（1.04）；其余地图保留 manifest 显式声明的
    // characterScale（如江淮香料工作坊、旧宴厨房的 1.08），缺省回退到 1。
    // 注意：早期此处无条件覆盖为 1，导致 manifest 里为两张工作坊图写的 1.08 被静默丢弃。
    art.characterScale = mapId === 'inn' || mapId === 'jiangnan_branch'
      ? 1.04
      : (Number(art.characterScale) > 1 ? Number(art.characterScale) : 1);
    art.hasPhaseLighting = false;
    art.v34 = true;
  });
  return maps;
}

module.exports = { mapPackages: MAP_PACKAGES, apply: apply };
