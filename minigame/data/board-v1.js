'use strict';

var npcV26 = require('./npc-population-v26');
var npcV37 = require('./npc-population-v37');

var WORLD = { width: 5100, height: 3100 };
var REGION_SIZE = { width: 1400, height: 720 };
var REGIONS = [
  {
    id: 'inn-ring', name: '长风客栈与镇心', shortName: '客栈镇心', center: { x: 850, y: 600 }, color: '#a9683f',
    maps: ['inn', 'yard', 'street'], landmarks: ['长风客栈', '客栈后院', '七侠镇十字街'],
    properties: ['客栈柜台', '灯市摊位', '布庄', '茶铺', '杂货行', '酒坊', '脚店', '车马棚'],
  },
  {
    id: 'east-gate-ring', name: '老槐巷与东关', shortName: '老槐东关', center: { x: 2550, y: 600 }, color: '#b27a46',
    maps: ['locust_lane', 'tea_shed', 'east_gate'], landmarks: ['老槐树巷', '东关旧茶棚', '雁回东关'],
    properties: ['告示摊', '旧茶铺', '路引所', '行囊店', '驴马行', '关口货棚', '干粮铺', '灯笼坊'],
  },
  {
    id: 'outer-road-ring', name: '镇外桥驿商道', shortName: '桥驿商道', center: { x: 4250, y: 600 }, color: '#6f7e55',
    maps: ['stone_bridge', 'old_post', 'north_road'], landmarks: ['镇外石桥', '废弃驿站', '北坡镖道'],
    properties: ['桥头茶铺', '驿站马厩', '镖道补给', '修车棚', '草料场', '脚夫营', '路桥作坊', '护送行'],
  },
  {
    id: 'paper-ring', name: '纸墨与转运工坊', shortName: '纸墨转运', center: { x: 850, y: 1550 }, color: '#82705b',
    maps: ['paper_mill', 'paper_alley', 'river_yard'], landmarks: ['雁回纸坊', '纸坊后巷', '河滩转运场'],
    properties: ['纸浆坊', '晾纸院', '墨料铺', '印章店', '契纸摊', '木箱坊', '河滩货位', '转运车队'],
  },
  {
    id: 'guild-ring', name: '商会粮仓区', shortName: '商会粮仓', center: { x: 2550, y: 1550 }, color: '#b38a3d',
    maps: ['guild_warehouse', 'grain_market', 'guild_office'], landmarks: ['商会货栈', '雁回粮市', '商会账房'],
    properties: ['货栈仓位', '粮行', '秤铺', '账房席位', '封条铺', '麻袋坊', '车队行', '议价亭'],
  },
  {
    id: 'canal-ring', name: '义仓票契水路', shortName: '义仓票契', center: { x: 4250, y: 1550 }, color: '#55785f',
    maps: ['charity_granary', 'canal_checkpoint', 'money_house'], landmarks: ['城南义仓', '河渠关卡', '雁回票号'],
    properties: ['义仓粮垛', '河渠泊位', '票号柜台', '兑票窗口', '船工行', '水闸铺', '赈粮车队', '契约亭'],
  },
  {
    id: 'alliance-ring', name: '秤契与商盟旧案', shortName: '商盟旧案', center: { x: 850, y: 2500 }, color: '#755a70',
    maps: ['scale_contract_lane', 'merchant_alliance_hall', 'old_ledger_vault'], landmarks: ['秤契巷', '商盟会馆', '地下旧账库'],
    properties: ['秤砣铺', '契书摊', '公证桌', '商盟席位', '旧印库', '账柜行', '鉴纸铺', '护库班'],
  },
  {
    id: 'jiangnan-ring', name: '江南水巷商区', shortName: '江南水巷', center: { x: 2550, y: 2500 }, color: '#3f7b76',
    maps: ['jiangnan_branch', 'jiangnan_dock', 'river_market'], landmarks: ['水巷分店', '江南码头', '江南河市'],
    properties: ['临水客房', '码头泊位', '河市摊位', '船票亭', '水产行', '茶舟', '装卸队', '雨具铺'],
  },
  {
    id: 'spice-ring', name: '雨渡与百味香路', shortName: '百味香路', center: { x: 4250, y: 2500 }, color: '#8e5947',
    maps: ['rain_ferry', 'jiangnan_spice_workshop', 'old_banquet_kitchen'], landmarks: ['雨夜渡口', '香料作坊', '百味旧灶院'],
    properties: ['渡船契位', '香料货架', '研磨坊', '晒料场', '宴席灶位', '锅具铺', '菜谱阁', '酒水行'],
  },
];

var ALL_NPCS = npcV26.roster.concat(npcV37.roster).map(function (entry) {
  return { id: entry.id, name: entry.name, dialogue: entry.dialogue, role: entry.role || entry.mode || '江湖来客' };
});
var NPC_LOOKUP = {};
ALL_NPCS.forEach(function (entry) { NPC_LOOKUP[entry.id] = entry; });

function loopPoints(center) {
  var left = center.x - REGION_SIZE.width / 2;
  var right = center.x + REGION_SIZE.width / 2;
  var top = center.y - REGION_SIZE.height / 2;
  var bottom = center.y + REGION_SIZE.height / 2;
  var points = [];
  var index;
  for (index = 0; index <= 8; index += 1) points.push({ x: left + REGION_SIZE.width * index / 8, y: top });
  for (index = 1; index <= 7; index += 1) points.push({ x: right, y: top + REGION_SIZE.height * index / 8 });
  for (index = 0; index <= 8; index += 1) points.push({ x: right - REGION_SIZE.width * index / 8, y: bottom });
  for (index = 1; index <= 7; index += 1) points.push({ x: left, y: bottom - REGION_SIZE.height * index / 8 });
  return points;
}

var LANDMARK_POSITIONS = [0, 10, 21];
var PROPERTY_POSITIONS = [1, 5, 9, 13, 17, 20, 25, 29];
var NPC_POSITIONS = [2, 7, 12, 18, 24, 30];
var EVENT_POSITIONS = [3, 6, 11, 16, 27];
var SUPPLY_POSITIONS = [4, 14, 26];
var BATTLE_POSITIONS = [8, 19, 28];
var CHANCE_POSITIONS = [15, 22];

function tileType(index) {
  if (LANDMARK_POSITIONS.indexOf(index) >= 0) return 'landmark';
  if (PROPERTY_POSITIONS.indexOf(index) >= 0) return 'property';
  if (NPC_POSITIONS.indexOf(index) >= 0) return 'npc';
  if (EVENT_POSITIONS.indexOf(index) >= 0) return 'event';
  if (SUPPLY_POSITIONS.indexOf(index) >= 0) return 'supply';
  if (BATTLE_POSITIONS.indexOf(index) >= 0) return 'battle';
  if (CHANCE_POSITIONS.indexOf(index) >= 0) return 'chance';
  return 'rest';
}

function tileLabel(type, region, index) {
  if (type === 'landmark') return region.landmarks[LANDMARK_POSITIONS.indexOf(index)];
  if (type === 'property') return region.properties[PROPERTY_POSITIONS.indexOf(index)];
  if (type === 'npc') return '江湖来客';
  if (type === 'event') return '风波';
  if (type === 'supply') return '补给';
  if (type === 'battle') return '护路';
  if (type === 'chance') return '驿马';
  return '歇脚';
}

var TILES = [];
REGIONS.forEach(function (region, regionIndex) {
  var points = loopPoints(region.center);
  points.forEach(function (point, index) {
    var type = tileType(index);
    var landmarkIndex = LANDMARK_POSITIONS.indexOf(index);
    var propertyIndex = PROPERTY_POSITIONS.indexOf(index);
    TILES.push({
      id: 'r' + regionIndex + '-' + index,
      regionId: region.id,
      regionIndex: regionIndex,
      index: index,
      x: Math.round(point.x),
      y: Math.round(point.y),
      type: type,
      label: tileLabel(type, region, index),
      mapId: landmarkIndex >= 0 ? region.maps[landmarkIndex] : null,
      price: propertyIndex >= 0 ? 18 + regionIndex * 3 + propertyIndex * 3 : 0,
      next: ['r' + regionIndex + '-' + ((index + 1) % 32)],
    });
  });
});

var TILE_LOOKUP = {};
TILES.forEach(function (tile) { TILE_LOOKUP[tile.id] = tile; });

function connect(leftId, rightId) {
  if (TILE_LOOKUP[leftId].next.indexOf(rightId) < 0) TILE_LOOKUP[leftId].next.push(rightId);
  if (TILE_LOOKUP[rightId].next.indexOf(leftId) < 0) TILE_LOOKUP[rightId].next.push(leftId);
}

[[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8]].forEach(function (pair) {
  connect('r' + pair[0] + '-12', 'r' + pair[1] + '-28');
});
[[0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 8]].forEach(function (pair) {
  connect('r' + pair[0] + '-20', 'r' + pair[1] + '-4');
});

REGIONS.forEach(function (region, regionIndex) {
  var owners = ALL_NPCS.slice(regionIndex * 8, regionIndex * 8 + 8);
  PROPERTY_POSITIONS.forEach(function (position, index) {
    TILE_LOOKUP['r' + regionIndex + '-' + position].ownerNpcId = owners[index].id;
  });
  NPC_POSITIONS.forEach(function (position, index) {
    TILE_LOOKUP['r' + regionIndex + '-' + position].npcIds = [owners[index % owners.length].id, owners[(index + 3) % owners.length].id];
  });
  LANDMARK_POSITIONS.forEach(function (position, index) {
    TILE_LOOKUP['r' + regionIndex + '-' + position].npcIds = [owners[(index * 2 + 1) % owners.length].id];
  });
});

var MAP_TO_TILE = {};
TILES.filter(function (tile) { return tile.type === 'landmark'; }).forEach(function (tile) {
  if (tile.mapId) MAP_TO_TILE[tile.mapId] = tile.id;
});

function tile(id) { return TILE_LOOKUP[id] || TILE_LOOKUP['r0-0']; }
function npc(id) { return NPC_LOOKUP[id] || { id: id, name: '江湖来客', dialogue: '路上风大，掌柜慢行。', role: '旅人' }; }
function region(id) { return REGIONS.find(function (entry) { return entry.id === id; }) || REGIONS[0]; }

module.exports = {
  id: 'grand-board-288',
  title: '九域商路 · 天下棋盘',
  world: WORLD,
  regionSize: REGION_SIZE,
  regions: REGIONS,
  tiles: TILES,
  allNpcs: ALL_NPCS,
  tile: tile,
  npc: npc,
  region: region,
  mapToTile: MAP_TO_TILE,
};
