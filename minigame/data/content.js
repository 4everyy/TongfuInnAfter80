const management = require('./management');
const campaign = require('./campaign');
const identity = require('./identity');
const deep = require('./season1-deep');
const deep56 = require('./season1-deep-56');
const deep78 = require('./season1-deep-78');
const season2 = require('./season2-ch910');
const season2ch11 = require('./season2-ch11');
const npcPopulationV26 = require('./npc-population-v26');
const npcPopulationV37 = require('./npc-population-v37');
const allMapAccessV27 = require('./all-map-access-v27');
const sceneCalibrationV34 = require('./scene-calibration-v34');

const roles = campaign.roles.map((role) => Object.assign({}, role, {
  originalName: role.name,
  name: identity.roleName(role.id),
}));

function floorPolygon(width, backY, frontY) {
  return [[32, backY + 20], [width - 32, backY], [width - 18, frontY], [18, frontY]];
}

function rectPolygon(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

const maps = [
  {
    id: 'inn', name: '长风客栈大堂', width: 1800, height: 348,
    walkable: [floorPolygon(1800, 182, 326)],
    obstacles: [
      { id: 'stairs', polygon: rectPolygon(70, 168, 330, 94) },
      { id: 'counter', polygon: rectPolygon(620, 166, 510, 72) },
      { id: 'left-table', polygon: rectPolygon(250, 270, 190, 58) },
      { id: 'right-table', polygon: rectPolygon(1380, 272, 220, 56) },
    ],
    spawns: {
      main: { x: 470, y: 280, facing: 'right' },
      streetDoor: { x: 1640, y: 278, facing: 'left' },
      yardDoor: { x: 1230, y: 245, facing: 'down' },
      recovery: { x: 520, y: 286, facing: 'right' },
    },
    exits: [
      { id: 'to-street', zone: { x: 1738, y: 220, width: 62, height: 108 }, target: 'street', spawn: 'innDoor' },
      { id: 'to-yard', zone: { x: 1182, y: 186, width: 112, height: 70 }, target: 'yard', spawn: 'innDoor' },
    ],
    hotspots: [
      { id: 'rumor-board', x: 470, y: 260, radius: 68, label: '传闻板', type: 'crisis', crisisId: 'rumor-board' },
      { id: 'inn-ledger', x: 540, y: 244, radius: 70, label: '客栈账本', type: 'crisis', crisisId: 'ledger' },
      { id: 'tea-table', x: 350, y: 280, radius: 72, label: '茶客的桌子', type: 'crisis', crisisId: 'tea-table' },
      { id: 'stove', x: 820, y: 245, radius: 72, label: '后厨火候', type: 'crisis', crisisId: 'stove' },
      { id: 'bai-watch', x: 700, y: 260, radius: 72, label: '谢无尘', type: 'crisis', crisisId: 'bai' },
      { id: 'guest-stairs', x: 395, y: 228, radius: 66, label: '客房楼梯', type: 'inn' },
      { id: 'doorway-troublemaker', x: 1540, y: 286, radius: 72, label: '门口闹事者', type: 'battle', battle: 'doorway_troublemaker', requires: ['doorway-clues-ready'], unless: ['doorway-troublemaker-stopped', 'doorwayDisturbanceResolved'] },
    ],
    npcs: [
      { id: 'wuchen-inn', roleId: 'wuchen', x: 700, y: 250, facing: 'left', hideWhenInParty: true, allowBlockedPlacement: true, behindObstacleId: 'counter', shadowAlpha: 0 },
      { id: 'doorway-troublemaker-npc', artId: 'ruffian_fast', name: '闹事者', x: 1540, y: 286, facing: 'left', blocksMovement: false, requires: ['doorway-clues-ready'], unless: ['doorway-troublemaker-stopped', 'doorwayDisturbanceResolved'] },
    ],
  },
  {
    id: 'yard', name: '长风客栈后院', width: 1500, height: 348,
    walkable: [floorPolygon(1500, 176, 326)],
    obstacles: [
      { id: 'well', polygon: rectPolygon(430, 208, 150, 86) },
      { id: 'woodpile', polygon: rectPolygon(910, 190, 190, 72) },
      { id: 'training-posts', polygon: rectPolygon(1180, 205, 150, 58) },
    ],
    spawns: { main: { x: 140, y: 278, facing: 'right' }, innDoor: { x: 120, y: 278, facing: 'right' } },
    exits: [{ id: 'to-inn', zone: { x: 0, y: 218, width: 62, height: 110 }, target: 'inn', spawn: 'yardDoor' }],
    hotspots: [
      { id: 'broken-rope', x: 710, y: 274, radius: 70, label: '断裂的货绳', type: 'loot', requires: ['mission-accepted'], unless: ['yard-trail'], reward: { coin: 0, ingredient: 1, flag: 'yard-trail', toast: '货绳沾着东门外的红泥，线索指向十字街。' } },
      { id: 'training', x: 1250, y: 278, radius: 70, label: '练功木桩', type: 'battle', battle: 'training' },
    ],
    npcs: [],
  },
  {
    id: 'street', name: '雁回镇十字街', width: 2200, height: 348,
    walkable: [floorPolygon(2200, 174, 328)],
    obstacles: [
      { id: 'vegetable-stall', polygon: rectPolygon(510, 190, 210, 76) },
      { id: 'cloth-stall', polygon: rectPolygon(1450, 188, 220, 78) },
      { id: 'water-trough', polygon: rectPolygon(1840, 260, 160, 48) },
    ],
    spawns: { main: { x: 130, y: 278, facing: 'right' }, innDoor: { x: 110, y: 278, facing: 'right' }, locustReturn: { x: 1170, y: 274, facing: 'left' } },
    exits: [
      { id: 'to-inn', zone: { x: 0, y: 218, width: 62, height: 110 }, target: 'inn', spawn: 'streetDoor' },
      { id: 'to-locust', zone: { x: 1100, y: 176, width: 126, height: 72 }, target: 'locust_lane', spawn: 'street', mapGate: 'town-core' },
    ],
    hotspots: [
      { id: 'jingzhi-encounter', x: 900, y: 274, radius: 84, label: '街头争执', type: 'dialogue', dialogue: 'jingzhi-encounter', requires: ['yard-trail'], unless: ['jingzhi-cooperating'] },
      { id: 'merchant', x: 520, y: 272, radius: 70, label: '焦急的行商', type: 'dialogue', dialogue: 'street-merchant', requires: ['yard-trail'] },
    ],
    npcs: [
      { id: 'jingzhi-street', roleId: 'jingzhi', x: 900, y: 252, facing: 'left', unless: ['jingzhi-cooperating'], blocksMovement: false },
      { id: 'street-merchant', artId: 'merchant', name: '行商', color: '#8b6a47', x: 620, y: 254, facing: 'right', blocksMovement: false },
      { id: 'street-townsman', artId: 'townsman_old', name: '买菜老伯', x: 1320, y: 300, facing: 'left', showName: false, blocksMovement: false },
    ],
  },
  {
    id: 'locust_lane', name: '老槐树告示巷', width: 1600, height: 348,
    walkable: [floorPolygon(1600, 178, 326)],
    obstacles: [
      { id: 'locust-tree', polygon: rectPolygon(480, 170, 210, 94) },
      { id: 'notice-board', polygon: rectPolygon(860, 190, 150, 62) },
      { id: 'crates', polygon: rectPolygon(1220, 260, 170, 52) },
    ],
    spawns: { main: { x: 120, y: 278, facing: 'right' }, street: { x: 110, y: 278, facing: 'right' }, teaReturn: { x: 1460, y: 278, facing: 'left' } },
    exits: [
      { id: 'to-street', zone: { x: 0, y: 218, width: 62, height: 110 }, target: 'street', spawn: 'locustReturn' },
      { id: 'to-tea', zone: { x: 1538, y: 218, width: 62, height: 110 }, target: 'tea_shed', spawn: 'locust', mapGate: 'town-core' },
    ],
    hotspots: [{ id: 'forged-notice', x: 930, y: 268, radius: 80, label: '被改过的告示', type: 'dialogue', dialogue: 'notice-wenyan', requires: ['jingzhi-cooperating'], unless: ['notice-decoded'] }],
    npcs: [
      { id: 'wenyan-notice', roleId: 'wenyan', x: 790, y: 260, facing: 'right', unless: ['notice-decoded'] },
      { id: 'lane-townswoman', artId: 'townswoman_young', name: '过路姑娘', x: 1248, y: 295, facing: 'right', showName: false },
    ],
  },
  {
    id: 'tea_shed', name: '东关旧茶棚', width: 1600, height: 348,
    walkable: [floorPolygon(1600, 180, 326)],
    obstacles: [
      { id: 'tea-shed', polygon: rectPolygon(540, 166, 390, 90) },
      { id: 'hitching-post', polygon: rectPolygon(1120, 230, 170, 44) },
    ],
    spawns: { main: { x: 120, y: 280, facing: 'right' }, locust: { x: 110, y: 280, facing: 'right' }, gateReturn: { x: 1460, y: 280, facing: 'left' } },
    exits: [
      { id: 'to-locust', zone: { x: 0, y: 220, width: 62, height: 108 }, target: 'locust_lane', spawn: 'teaReturn' },
      { id: 'to-gate', zone: { x: 1538, y: 220, width: 62, height: 108 }, target: 'east_gate', spawn: 'tea', mapGate: 'town-core' },
    ],
    hotspots: [{ id: 'tea-owner', x: 740, y: 272, radius: 84, label: '茶棚老板', type: 'dialogue', dialogue: 'tea-owner', requires: ['notice-decoded'], unless: ['tea-clue'] }],
    npcs: [{ id: 'tea-owner-npc', artId: 'tea_owner', name: '茶棚老板', color: '#6f5b45', x: 700, y: 246, facing: 'down', allowBlockedPlacement: true, behindObstacleId: 'tea-shed', shadowAlpha: 0 }],
  },
  {
    id: 'east_gate', name: '雁回镇雁回东关关', width: 1700, height: 348,
    walkable: [floorPolygon(1700, 176, 326)],
    obstacles: [
      { id: 'guard-desk', polygon: rectPolygon(520, 212, 200, 58) },
      { id: 'road-block', polygon: rectPolygon(1160, 210, 180, 48) },
    ],
    spawns: { main: { x: 120, y: 278, facing: 'right' }, tea: { x: 110, y: 278, facing: 'right' }, bridgeReturn: { x: 1560, y: 278, facing: 'left' } },
    exits: [
      { id: 'to-tea', zone: { x: 0, y: 218, width: 62, height: 110 }, target: 'tea_shed', spawn: 'gateReturn' },
      { id: 'to-bridge', zone: { x: 1638, y: 218, width: 62, height: 110 }, target: 'stone_bridge', spawn: 'gate', mapGate: 'late-letter' },
    ],
    hotspots: [{ id: 'gate-check', x: 630, y: 278, radius: 82, label: '巡街差役', type: 'dialogue', dialogue: 'gate-check', requires: ['tea-clue'], unless: ['gate-cleared'] }],
    npcs: [{ id: 'gate-guard', artId: 'guard', name: '巡街差役', color: '#53677b', x: 610, y: 252, facing: 'down', allowBlockedPlacement: true, behindObstacleId: 'guard-table', shadowAlpha: 0 }],
  },
  {
    id: 'stone_bridge', name: '镇外石桥', width: 1900, height: 348,
    walkable: [floorPolygon(1900, 180, 326)],
    obstacles: [
      { id: 'bridge-rail-left', polygon: rectPolygon(470, 178, 300, 34) },
      { id: 'bridge-rail-right', polygon: rectPolygon(1130, 178, 300, 34) },
      { id: 'supply-cart', polygon: rectPolygon(1500, 244, 210, 66) },
    ],
    spawns: { main: { x: 120, y: 280, facing: 'right' }, gate: { x: 110, y: 280, facing: 'right' } },
    exits: [{ id: 'to-gate', zone: { x: 0, y: 220, width: 62, height: 108 }, target: 'east_gate', spawn: 'bridgeReturn' }],
    hotspots: [
      { id: 'bridge-ruffians', x: 1120, y: 274, radius: 94, label: '拦路匪徒', type: 'battle', battle: 'bridge_ruffians', requires: ['gate-cleared'], unless: ['supplies-recovered'] },
      { id: 'supply-cart', x: 1540, y: 274, radius: 90, label: '失踪的货车', type: 'dialogue', dialogue: 'bridge-cart', requires: ['supplies-recovered'], unless: ['cargo-loaded'] },
    ],
    npcs: [
      { id: 'ruffian-heavy', artId: 'ruffian_heavy', name: '灰衣匪徒', color: '#594b43', x: 1060, y: 252, facing: 'left', unless: ['supplies-recovered'] },
      { id: 'ruffian-fast', artId: 'ruffian_fast', name: '瘦高匪徒', color: '#665a49', x: 1180, y: 266, facing: 'left', unless: ['supplies-recovered'] },
    ],
  },
].concat(deep.maps, deep56.maps, deep78.maps, season2.maps, season2ch11.maps);

function mapDefinition(id) {
  return maps.find((item) => item.id === id);
}

const runtimeMapWidths = {
  inn: 1000,
  yard: 900,
  street: 1200,
  locust_lane: 1000,
  tea_shed: 950,
  east_gate: 950,
  stone_bridge: 1050,
  paper_mill: 1180,
  paper_alley: 1060,
  old_post: 1260,
  north_road: 1320,
  guild_warehouse: 1180,
  river_yard: 1360,
  grain_market: 1280,
  guild_office: 1160,
  charity_granary: 1300,
  canal_checkpoint: 1380,
  money_house: 1260,
  scale_contract_lane: 1380,
  merchant_alliance_hall: 1420,
  old_ledger_vault: 1500,
  jiangnan_branch: 1000,
  jiangnan_dock: 1320,
  river_market: 1280,
  rain_ferry: 1440,
  jiangnan_spice_workshop: 1260,
  old_banquet_kitchen: 1320,
};

function scalePolygonX(polygon, scale) {
  return polygon.map((point) => [Math.round(point[0] * scale), point[1]]);
}

maps.forEach((mapDef) => {
  const sourceWidth = mapDef.width;
  const targetWidth = runtimeMapWidths[mapDef.id] || sourceWidth;
  const scale = targetWidth / sourceWidth;
  mapDef.width = targetWidth;
  mapDef.walkable = mapDef.walkable.map((polygon) => scalePolygonX(polygon, scale));
  mapDef.obstacles.forEach((obstacle) => {
    obstacle.polygon = scalePolygonX(obstacle.polygon, scale);
  });
  Object.keys(mapDef.spawns).forEach((spawnId) => {
    mapDef.spawns[spawnId].x = Math.round(mapDef.spawns[spawnId].x * scale);
  });
  mapDef.exits.forEach((exit) => {
    exit.zone.x = Math.round(exit.zone.x * scale);
    exit.zone.width = Math.max(44, Math.round(exit.zone.width * scale));
  });
  mapDef.hotspots.forEach((hotspot) => {
    hotspot.x = Math.round(hotspot.x * scale);
  });
  mapDef.npcs.forEach((npc) => {
    npc.x = Math.round(npc.x * scale);
  });
});

// Runtime coordinates are calibrated against the final 2.5D scene crops.
const runtimeGeometry = {
  inn: {
    walkable: [floorPolygon(1000, 218, 336)],
    obstacles: [
      { id: 'counter', polygon: rectPolygon(258, 220, 420, 74), sortY: 294, occluderRise: 0 },
      {
        id: 'stairs',
        polygon: [[650, 164], [808, 164], [898, 296], [898, 306], [720, 306]],
        sortY: 306,
      },
      { id: 'left-table', polygon: rectPolygon(0, 286, 172, 62), sortY: 336 },
      { id: 'right-table', polygon: rectPolygon(680, 336, 240, 12), sortY: 340 },
    ],
    spawns: {
      main: { x: 520, y: 318, facing: 'right' },
      streetDoor: { x: 920, y: 318, facing: 'left' },
      yardDoor: { x: 205, y: 316, facing: 'right' },
      recovery: { x: 520, y: 318, facing: 'right' },
    },
    exits: {
      'to-street': { x: 930, y: 240, width: 60, height: 96 },
      'to-yard': { x: 174, y: 240, width: 58, height: 96 },
    },
    points: {
      briefing: [540, 316], 'return-report': [540, 316], 'inn-ledger': [500, 310], 'guest-stairs': [890, 300],
      'zhangdeng-inn': [520, 318], 'wuchen-inn': [430, 286],
      'rumor-board': [540, 304], 'tea-table': [196, 320], stove: [245, 314], 'bai-watch': [430, 304],
      'doorway-troublemaker': [860, 318], 'doorway-troublemaker-npc': [860, 318],
    },
  },
  yard: {
    walkable: [floorPolygon(900, 225, 332)],
    obstacles: [
      { id: 'well', polygon: rectPolygon(425, 155, 115, 100) },
      { id: 'woodpile', polygon: rectPolygon(560, 145, 180, 115) },
      { id: 'training-posts', polygon: rectPolygon(760, 190, 130, 158) },
    ],
    spawns: { main: { x: 330, y: 275, facing: 'right' }, innDoor: { x: 330, y: 270, facing: 'right' } },
    exits: { 'to-inn': { x: 205, y: 175, width: 120, height: 95 } },
    points: { 'broken-rope': [390, 270], training: [750, 285] },
  },
  street: {
    walkable: [floorPolygon(1200, 185, 332)],
    obstacles: [
      { id: 'left-stall', polygon: rectPolygon(0, 175, 170, 85) },
      { id: 'green-stall', polygon: rectPolygon(335, 165, 235, 95) },
      { id: 'right-stalls', polygon: rectPolygon(805, 160, 285, 100) },
      { id: 'right-shopfront', polygon: rectPolygon(1070, 115, 130, 233) },
    ],
    spawns: {
      main: { x: 200, y: 310, facing: 'right' }, innDoor: { x: 200, y: 310, facing: 'right' },
      locustReturn: { x: 760, y: 250, facing: 'down' },
    },
    exits: {
      'to-inn': { x: 0, y: 220, width: 50, height: 112 },
      'to-locust': { x: 710, y: 150, width: 105, height: 95 },
    },
    points: {
      'jingzhi-encounter': [560, 280], merchant: [300, 275], 'jingzhi-street': [590, 280],
      'street-merchant': [300, 280], 'street-townsman': [720, 300],
    },
  },
  locust_lane: {
    walkable: [floorPolygon(1000, 215, 330)],
    obstacles: [
      { id: 'left-doorway', polygon: rectPolygon(0, 150, 175, 120) },
      { id: 'crates', polygon: rectPolygon(215, 185, 125, 80) },
      { id: 'notice-board', polygon: rectPolygon(360, 120, 155, 115) },
      { id: 'locust-tree', polygon: rectPolygon(495, 70, 200, 170) },
      { id: 'right-wall', polygon: rectPolygon(904, 50, 96, 170) },
    ],
    spawns: {
      main: { x: 70, y: 285, facing: 'right' }, street: { x: 70, y: 285, facing: 'right' },
      teaReturn: { x: 890, y: 280, facing: 'left' },
    },
    exits: {
      'to-street': { x: 0, y: 220, width: 50, height: 112 },
      'to-tea': { x: 950, y: 220, width: 50, height: 112 },
    },
    points: { 'forged-notice': [440, 255], 'wenyan-notice': [530, 260], 'lane-townswoman': [780, 295] },
  },
  tea_shed: {
    walkable: [floorPolygon(950, 205, 332)],
    obstacles: [
      { id: 'left-jars', polygon: rectPolygon(80, 145, 115, 105) },
      {
        id: 'tea-shed',
        polygon: rectPolygon(340, 100, 380, 130),
        sortY: 252,
        occluderPolygon: rectPolygon(430, 166, 230, 70),
      },
      { id: 'right-table', polygon: rectPolygon(720, 150, 210, 100) },
    ],
    spawns: {
      main: { x: 70, y: 280, facing: 'right' }, locust: { x: 70, y: 280, facing: 'right' },
      gateReturn: { x: 875, y: 280, facing: 'left' },
    },
    exits: {
      'to-locust': { x: 0, y: 220, width: 50, height: 112 },
      'to-gate': { x: 900, y: 220, width: 50, height: 112 },
    },
    points: { 'tea-owner': [520, 260], 'tea-owner-npc': [520, 235] },
  },
  east_gate: {
    walkable: [floorPolygon(950, 220, 332)],
    obstacles: [
      { id: 'guard-table', polygon: rectPolygon(60, 215, 170, 70) },
      { id: 'road-block', polygon: rectPolygon(760, 220, 190, 115) },
    ],
    spawns: {
      main: { x: 260, y: 305, facing: 'right' }, tea: { x: 260, y: 305, facing: 'right' },
      bridgeReturn: { x: 650, y: 280, facing: 'left' },
    },
    exits: {
      'to-tea': { x: 0, y: 220, width: 50, height: 112 },
      'to-bridge': { x: 430, y: 210, width: 170, height: 65 },
    },
    points: { 'gate-check': [190, 278], 'gate-guard': [145, 280] },
  },
  stone_bridge: {
    walkable: [floorPolygon(1050, 215, 332)],
    obstacles: [
      { id: 'bridge-steps', polygon: rectPolygon(0, 150, 240, 85) },
      { id: 'supply-cart', polygon: rectPolygon(825, 240, 130, 78) },
    ],
    spawns: { main: { x: 70, y: 285, facing: 'right' }, gate: { x: 70, y: 285, facing: 'right' } },
    exits: { 'to-gate': { x: 0, y: 235, width: 50, height: 97 } },
    points: {
      'bridge-ruffians': [620, 275], 'supply-cart': [855, 275],
      'ruffian-heavy': [585, 252], 'ruffian-fast': [655, 266],
    },
  },
};

maps.forEach((mapDef) => {
  const geometry = runtimeGeometry[mapDef.id];
  if (!geometry) return;
  mapDef.walkable = geometry.walkable;
  mapDef.obstacles = geometry.obstacles;
  mapDef.spawns = geometry.spawns;
  mapDef.exits.forEach((exit) => {
    if (geometry.exits[exit.id]) exit.zone = geometry.exits[exit.id];
  });
  mapDef.hotspots.concat(mapDef.npcs).forEach((item) => {
    const point = geometry.points[item.id];
    if (point) { item.x = point[0]; item.y = point[1]; }
  });
});

const innMap = mapDefinition('inn');
const streetMap = mapDefinition('street');
const eastGateMap = mapDefinition('east_gate');
const guildWarehouseMap = mapDefinition('guild_warehouse');
const grainMarketMap = mapDefinition('grain_market');
const guildOfficeMap = mapDefinition('guild_office');

streetMap.spawns.grainReturn = { x: 950, y: 300, facing: 'left' };
streetMap.exits.push({
  id: 'to-grain-market',
  zone: { x: 900, y: 270, width: 120, height: 62 },
  target: 'grain_market',
  spawn: 'street',
  requires: ['c05-started'],
});
guildWarehouseMap.spawns.charityReturn = { x: 1080, y: 286, facing: 'left' };
guildWarehouseMap.exits.push({
  id: 'to-charity-granary',
  zone: { x: 1088, y: 220, width: 92, height: 112 },
  target: 'charity_granary',
  spawn: 'warehouse',
  requires: ['c06-started'],
});
grainMarketMap.spawns.moneyReturn = { x: 1120, y: 292, facing: 'left' };
grainMarketMap.hotspots.push({
  id: 'c07-market-survey', x: 760, y: 294, radius: 82, label: '真实成交价',
  type: 'investigate', eventId: 'deep78-explore-market-price', requires: ['c07-cost-recorded'], unless: ['c07-price-board'],
  effects: {
    flag: 'c07-price-board',
    evidence: { id: 'market-sale-notes', title: '三家摊位真实成交价', sourceMap: 'grain_market', weight: 3 },
    contradiction: { id: 'quote-vs-sale', title: '粮行价牌与实际成交价不符' },
    market: { multipliers: { staple: -0.08, vegetable: -0.04 }, pressure: -8, reason: '记录真实成交价' }
  },
  toast: '价牌写着各店自定，三家实际成交价却分毫不差。'
});
grainMarketMap.exits.push({
  id: 'to-money-house',
  zone: { x: 1080, y: 270, width: 120, height: 62 },
  target: 'money_house',
  spawn: 'market',
  requires: ['c07-price-board'],
});
guildOfficeMap.spawns.hallReturn = { x: 1080, y: 288, facing: 'left' };
guildOfficeMap.exits.push({
  id: 'to-merchant-hall',
  zone: { x: 1060, y: 220, width: 100, height: 112 },
  target: 'merchant_alliance_hall',
  spawn: 'guildOffice',
  requires: ['c08-ledger-fragment'],
});

innMap.hotspots.push({
  id: 'c09-briefing',
  x: 750,
  y: 268,
  radius: 74,
  label: '江南分店求助信',
  type: 'dialogue',
  dialogue: 'c09-briefing',
  requires: ['season-2-prologue-unlocked'],
  unless: ['c09-started'],
});

innMap.hotspots.push(
  { id: 'late-letter-briefing', x: 760, y: 264, radius: 72, discoverRadius: 142, priority: 90, label: '迟到的驿信', type: 'dialogue', dialogue: 'late-letter-briefing', requires: ['doorwayDisturbanceResolved'], unless: ['mission-accepted', 'chapter-late-letter-complete'] },
  { id: 'late-letter-return', x: 760, y: 264, radius: 72, discoverRadius: 142, priority: 95, label: '复盘假路引', type: 'dialogue', dialogue: 'late-letter-return', requires: ['cargo-loaded'], unless: ['chapter-late-letter-complete'] },
  { id: 'c03-briefing', x: 620, y: 264, radius: 66, label: '三张黑印路引', type: 'dialogue', dialogue: 'c03-briefing', requires: ['chapter-late-letter-complete'], unless: ['c03-started'] },
  { id: 'c03-decoy', x: 620, y: 264, radius: 66, label: '制作诱饵账册', type: 'repair', requires: ['c03-letter-read', 'c03-seal-matched'], unless: ['c03-decoy-ready'], effects: { flag: 'c03-decoy-ready' }, toast: '诱饵账册已经装订好，货栈收网行动可以开始。' },
  { id: 'c03-finale', x: 700, y: 260, radius: 76, label: '白展堂的决定', type: 'dialogue', dialogue: 'c03-finale', requires: ['c03-sting-won'], unless: ['c03-complete'] },
  { id: 'c04-briefing', x: 830, y: 270, radius: 68, label: '落地的镖旗', type: 'dialogue', dialogue: 'c04-briefing', requires: ['c03-complete'], unless: ['c04-started'] },
  { id: 'c05-briefing', x: 500, y: 264, radius: 72, label: '两桌不同的货单', type: 'dialogue', dialogue: 'c05-briefing', requires: ['c04-complete'], unless: ['c05-started'] },
  { id: 'c06-briefing', x: 830, y: 270, radius: 72, label: '被扣的赈济粮车', type: 'dialogue', dialogue: 'c06-briefing', requires: ['c05-complete'], unless: ['c06-started'] },
  { id: 'c07-briefing', x: 500, y: 264, radius: 72, label: '一夜同涨的进价', type: 'dialogue', dialogue: 'c07-briefing', requires: ['c06-complete'], unless: ['c07-started'] },
  {
    id: 'c07-market-ledger', x: 540, y: 244, radius: 70, label: '今日采购账',
    type: 'investigate', requires: ['c07-started'], unless: ['c07-cost-recorded'],
    effects: {
      flag: 'c07-cost-recorded',
      evidence: { id: 'inn-purchase-ledger', title: '客栈实际采购价记录', sourceMap: 'inn', weight: 2 }
    },
    toast: '账本显示四类食材同夜上涨，涨幅却与各店价牌不一致。'
  },
  { id: 'c08-briefing', x: 830, y: 270, radius: 72, label: '没有署名的残页', type: 'dialogue', dialogue: 'c08-briefing', requires: ['c07-complete'], unless: ['c08-started'] },
  { id: 'c08-fragment', x: 620, y: 264, radius: 72, label: '无名残页', type: 'dialogue', dialogue: 'c08-fragment', requires: ['c08-started'], unless: ['c08-ledger-fragment'] }
);

const innChapterPoints = {
  'c09-briefing': [620, 318],
  'late-letter-briefing': [690, 318],
  'late-letter-return': [690, 318],
  'c03-briefing': [540, 318],
  'c03-decoy': [540, 318],
  'c03-finale': [650, 318],
  'c04-briefing': [950, 318],
  'c05-briefing': [500, 318],
  'c06-briefing': [950, 318],
  'c07-briefing': [500, 318],
  'c07-market-ledger': [540, 304],
  'c08-briefing': [950, 318],
  'c08-fragment': [620, 318],
};
innMap.hotspots.forEach((hotspot) => {
  const point = innChapterPoints[hotspot.id];
  if (point) {
    hotspot.x = point[0];
    hotspot.y = point[1];
  }
});

streetMap.spawns.paperReturn = { x: 180, y: 292, facing: 'right' };
streetMap.spawns.guildReturn = { x: 680, y: 292, facing: 'left' };
streetMap.exits.push(
  { id: 'to-paper-mill', zone: { x: 200, y: 190, width: 90, height: 76 }, target: 'paper_mill', spawn: 'street', requires: ['c03-started'] },
  { id: 'to-guild-warehouse', zone: { x: 585, y: 190, width: 90, height: 76 }, target: 'guild_warehouse', spawn: 'street', requires: ['c03-decoy-ready'] }
);
eastGateMap.spawns.northReturn = { x: 650, y: 280, facing: 'left' };
eastGateMap.exits.push({ id: 'to-north-road', zone: { x: 690, y: 210, width: 120, height: 70 }, target: 'north_road', spawn: 'gate', requires: ['c04-started'] });

const jiangnanBranchMap = mapDefinition('jiangnan_branch');
const riverMarketMap = mapDefinition('river_market');

jiangnanBranchMap.hotspots.push(
  {
    id: 'c11-briefing',
    x: 350,
    y: 280,
    radius: 80,
    label: '集中退菜',
    type: 'dialogue',
    dialogue: 'c11-briefing',
    requires: ['c10-complete'],
    unless: ['c11-started'],
  },
  {
    id: 'c11-returned-dishes',
    x: 570,
    y: 280,
    radius: 76,
    label: '退回菜品',
    type: 'recipeSample',
    sample: {
      id: 'returned-banquet-dishes',
      name: '退回菜品',
      note: '三道菜火候不同，却都缺少同一种尾香，问题更像来自同批香料。',
    },
    requires: ['c11-started'],
    unless: ['c11-returns-checked'],
    effects: { flag: 'c11-returns-checked' },
  },
  {
    id: 'c11-identify-spice',
    x: 610,
    y: 280,
    radius: 78,
    label: '辨料台',
    type: 'cookingTrial',
    trial: 'c11-identify-spice',
    requires: ['c11-returns-checked'],
    unless: ['c11-identify-complete'],
  },
  {
    id: 'c11-seasoning-trial',
    x: 520,
    y: 280,
    radius: 82,
    label: '试菜宴',
    type: 'cookingTrial',
    trial: 'c11-seasoning-balance',
    requires: ['c11-shiwei-quest', 'c11-recipe-fragment'],
    unless: ['c11-seasoning-complete'],
  }
);

riverMarketMap.spawns.workshopReturn = { x: 1150, y: 292, facing: 'left' };
riverMarketMap.exits.push({
  id: 'to-spice-workshop',
  zone: { x: 1208, y: 220, width: 72, height: 114 },
  target: 'jiangnan_spice_workshop',
  spawn: 'market',
  requires: ['c11-market-traced'],
});
riverMarketMap.hotspots.push(
  {
    id: 'c11-market-spice-records',
    x: 580,
    y: 300,
    radius: 82,
    label: '同批香料记录',
    type: 'recipeSample',
    sample: {
      id: 'river-market-spice-record',
      name: '河市香料记录',
      note: '采购日期与开张宴一致，封绳却来自一座已经停用的旧作坊。',
    },
    requires: ['c11-identify-complete'],
    unless: ['c11-market-traced'],
    effects: { flag: 'c11-market-traced' },
  },
  {
    id: 'c11-shiwei-trust',
    x: 1030,
    y: 294,
    radius: 84,
    label: '旧封记',
    type: 'dialogue',
    dialogue: 'c11-shiwei-trust',
    requires: ['c11-market-traced'],
    unless: ['c11-shiwei-trusted'],
  }
);

// Story interactions attached to physical inn props share the prop's single
// visual marker and hit area. Character and loose-world interactions remain
// independent hotspots.
const linkedInnHotspots = {
  inn: {
    'rumor-board': 'changfeng-notice',
    'inn-ledger': 'changfeng-counter',
    'tea-table': 'changfeng-hall',
    stove: 'changfeng-stove',
    'guest-stairs': 'changfeng-rooms',
    'doorway-troublemaker': 'changfeng-door',
    'c09-briefing': 'changfeng-notice',
    'late-letter-briefing': 'changfeng-notice',
    'late-letter-return': 'changfeng-notice',
    'c03-briefing': 'changfeng-counter',
    'c03-decoy': 'changfeng-counter',
    'c04-briefing': 'changfeng-door',
    'c05-briefing': 'changfeng-counter',
    'c06-briefing': 'changfeng-door',
    'c07-briefing': 'changfeng-counter',
    'c07-market-ledger': 'changfeng-counter',
    'c08-briefing': 'changfeng-door',
    'c08-fragment': 'changfeng-counter',
  },
  jiangnan_branch: {
    'c10-briefing': 'jiangnan-counter',
    'c10-room-check': 'jiangnan-rooms',
    'c10-stove-check': 'jiangnan-stove',
    'c10-repair-stove': 'jiangnan-stove',
    'c10-finale': 'jiangnan-counter',
    'c11-briefing': 'jiangnan-counter',
    'c11-returned-dishes': 'jiangnan-stove',
    'c11-identify-spice': 'jiangnan-stove',
    'c11-seasoning-trial': 'jiangnan-stove',
  },
};

Object.keys(linkedInnHotspots).forEach((mapId) => {
  const current = mapDefinition(mapId);
  const links = linkedInnHotspots[mapId];
  current.hotspots.forEach((hotspot) => {
    if (links[hotspot.id]) hotspot.linkedObjectId = links[hotspot.id];
  });
});

const dialogues = {
  'late-letter-briefing': {
    speakerId: 'zhangdeng',
    text: '给客栈送茶叶和面粉的货车过了时辰还没到。先去后院看看车辙，别让今晚的客人饿肚子。',
    choices: [{ label: '去后院查线索', action: 'flag', flag: 'mission-accepted' }, { label: '先看看账本', action: 'inn' }],
  },
  'street-merchant': {
    speaker: '行商',
    text: '今早有辆货车往东去了，车夫像是被一张盖错印的告示骗走的。霍姑娘正跟人理论呢。',
    choices: [{ label: '记下这条线索', action: 'flag', flag: 'merchant-heard' }, { label: '告辞', action: 'close' }],
  },
  'jingzhi-encounter': {
    speakerId: 'jingzhi',
    text: '那伙人拿假路引吓唬行商，我也在追他们。先说好，我只是与你们同行查路，不算进了客栈。',
    choices: [{ label: '与{role:jingzhi}临时合作', action: 'cooperate', roleId: 'jingzhi', flag: 'jingzhi-cooperating', note: '在十字街共同追查假路引。' }, { label: '再问问行商', action: 'close' }],
  },
  'notice-wenyan': {
    speakerId: 'wenyan',
    text: '这张告示的日期和印泥都不对。“东桥验货”四字，是后来补上去的。真正的线索在东关茶棚。',
    choices: [{ label: '前往东关茶棚', action: 'flag', flag: 'notice-decoded' }, { label: '再检查一遍', action: 'close' }],
  },
  'tea-owner': {
    speaker: '茶棚老板',
    text: '两名生面孔借喝茶换了车夫的路引，随后押着货车往东门去了。一个沉稳，一个脚步很快。',
    choices: [{ label: '追向雁回东关关', action: 'flag', flag: 'tea-clue' }, { label: '买碗热茶', action: 'reward', reward: { coin: -2 }, flag: 'tea-bought' }],
  },
  'gate-check': {
    speaker: '巡街差役',
    text: '确有一辆货车出镇，路引上的印章是倒着盖的。你们去石桥看看，我替你们守住退路。',
    choices: [{ label: '出镇追货车', action: 'flag', flag: 'gate-cleared' }, { label: '先整顿队伍', action: 'party' }],
  },
  'bridge-cart': {
    speakerId: 'wuchen',
    text: '货物齐全，车轴只是卡住了。把车推回客栈，剩下的账让掌柜和闻先生慢慢算。',
    choices: [{ label: '带货返回客栈', action: 'returnInn', flag: 'cargo-loaded' }],
  },
  'late-letter-return': {
    speakerId: 'zhangdeng',
    text: '人平安，货也没少。{role:wenyan}却说这张假告示只是一角，真正的契纸还藏在{town}里。他答应有消息再来。',
    choices: [{ label: '完成迟到的驿信', action: 'completeChapter', chapter: 2, flag: 'chapter-late-letter-complete' }, { label: '稍后再结算', action: 'close' }],
  },
};

Object.keys(deep.dialogues).forEach((id) => { dialogues[id] = deep.dialogues[id]; });
Object.keys(deep56.dialogues).forEach((id) => { dialogues[id] = deep56.dialogues[id]; });
Object.keys(deep78.dialogues).forEach((id) => { dialogues[id] = deep78.dialogues[id]; });
Object.keys(season2.dialogues).forEach((id) => { dialogues[id] = season2.dialogues[id]; });
Object.keys(season2ch11.dialogues).forEach((id) => { dialogues[id] = season2ch11.dialogues[id]; });
allMapAccessV27.apply(maps);
npcPopulationV26.apply(maps, dialogues);
npcPopulationV37.apply(maps, dialogues);
sceneCalibrationV34.apply(maps);

const battles = {
  doorway_troublemaker: {
    id: 'doorway_troublemaker', title: '门前试探', background: 'inn',
    enemies: [{ name: '虚张声势的闹事者', artId: 'ruffian_fast', hp: 38, atk: 7, speed: 7 }],
    reward: { coin: 6, reputation: 1, flag: 'doorway-troublemaker-stopped' },
  },
  bridge_ruffians: {
    id: 'bridge_ruffians', title: '石桥夺货', background: 'stone_bridge',
    enemies: [{ name: '灰衣匪徒', artId: 'ruffian_heavy', hp: 92, atk: 14, speed: 9 }, { name: '瘦高匪徒', artId: 'ruffian_fast', hp: 72, atk: 16, speed: 14 }],
    reward: { coin: 36, ingredient: 4, flag: 'supplies-recovered' },
  },
  training: {
    id: 'training', title: '后院试炼', background: 'yard',
    enemies: [{ name: '练功木人', hp: 90, atk: 11, speed: 7 }],
    reward: { coin: 12, ingredient: 1 },
  },
};

Object.keys(deep.battles).forEach((id) => { battles[id] = deep.battles[id]; });
Object.keys(deep56.battles).forEach((id) => { battles[id] = deep56.battles[id]; });
Object.keys(deep78.battles).forEach((id) => { battles[id] = deep78.battles[id]; });
Object.keys(season2.battles).forEach((id) => { battles[id] = season2.battles[id]; });
Object.keys(season2ch11.battles).forEach((id) => { battles[id] = season2ch11.battles[id]; });

const chapter = {
  id: 'late-letter',
  title: '第二章：迟到的驿信',
  steps: [
    { id: 'briefing', done: 'mission-accepted', text: '在大堂找柳掌柜，接下失踪货车的委托。' },
    { id: 'yard', done: 'yard-trail', text: '前往客栈后院，检查货车留下的痕迹。' },
    { id: 'jingzhi', done: 'jingzhi-cooperating', text: '到雁回镇十字街解围，与霍惊枝临时合作。' },
    { id: 'notice', done: 'notice-decoded', text: '去老槐树告示巷，让闻砚辨认假告示。' },
    { id: 'tea', done: 'tea-clue', text: '到东关旧茶棚打听货车去向。' },
    { id: 'gate', done: 'gate-cleared', text: '前往雁回东关关，查验出镇路引。' },
    { id: 'battle', done: 'supplies-recovered', text: '在镇外石桥击退匪徒，夺回客栈物资。' },
    { id: 'cargo', done: 'cargo-loaded', text: '检查货车并带货返回长风客栈。' },
    { id: 'complete', done: 'chapter-late-letter-complete', text: '回长风客栈复盘假路引，完成第二章结算。' },
  ],
};

const inn = { upgrades: management.facilities, dishes: management.dishes };

module.exports = {
  roles, maps, dialogues, battles, chapter, inn, management, campaign, identity,
  cookingTrials: Object.assign({}, season2ch11.cookingTrials),
  deepChapters: Object.assign({}, deep.chapters, deep56.chapters, deep78.chapters, season2.chapters, season2ch11.chapters),
  deepDayPlans: deep.dayPlans.concat(deep56.dayPlans, deep78.dayPlans, season2.dayPlans, season2ch11.dayPlans),
  deepOperationEvents: deep.operationEvents.concat(deep56.operationEvents, deep78.operationEvents, season2.operationEvents, season2ch11.operationEvents),
  deepExplorationEvents: deep.explorationEvents.concat(deep56.explorationEvents, deep78.explorationEvents, season2.explorationEvents, season2ch11.explorationEvents),
  deepRareEvents: deep.rareEvents.concat(deep56.rareEvents, deep78.rareEvents, season2.rareEvents, season2ch11.rareEvents),
};
