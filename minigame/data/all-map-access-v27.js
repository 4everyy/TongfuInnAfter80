'use strict';

function byId(maps, id) {
  return maps.find(function (item) { return item.id === id; });
}

function upsertSpawn(map, id, value) {
  map.spawns = map.spawns || {};
  map.spawns[id] = Object.assign({}, map.spawns[id] || {}, value);
}

function upsertExit(map, definition) {
  map.exits = Array.isArray(map.exits) ? map.exits : [];
  var index = map.exits.findIndex(function (item) { return item.id === definition.id; });
  if (index >= 0) map.exits[index] = Object.assign({}, map.exits[index], definition);
  else map.exits.push(definition);
}

function apply(maps) {
  var bridge = byId(maps, 'stone_bridge');
  var dock = byId(maps, 'jiangnan_dock');
  if (!bridge || !dock) throw new Error('Long-distance route maps are missing');

  upsertSpawn(bridge, 'jiangnanReturn', { x: 982, y: 292, facing: 'left' });
  upsertExit(bridge, {
    id: 'to-jiangnan-dock',
    zone: { x: 998, y: 228, width: 50, height: 102 },
    target: 'jiangnan_dock',
    spawn: 'guanzhongReturn',
    branchId: 'jiangnan',
    transition: { kind: 'route', duration: 700, switchAt: 0.56 },
  });

  upsertSpawn(dock, 'guanzhongReturn', { x: 560, y: 300, facing: 'left' });
  upsertExit(dock, {
    id: 'to-guanzhong-route',
    zone: { x: 520, y: 242, width: 80, height: 88 },
    target: 'stone_bridge',
    spawn: 'jiangnanReturn',
    branchId: 'changfeng',
    transition: { kind: 'route', duration: 700, switchAt: 0.56 },
  });

  return maps;
}

module.exports = { apply: apply };
