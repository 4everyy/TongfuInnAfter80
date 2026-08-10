'use strict';

var ACTIONS = {
  counter: { id: 'counter', label: '查看账目', icon: 'abacus', kind: 'page', page: 'counter', phases: ['morning', 'evening'] },
  settle: { id: 'settle', label: '打烊结算', icon: 'complete', kind: 'dispatch', action: { type: 'settle' }, phases: ['evening'], primary: true },
  open: { id: 'open', label: '开门迎客', icon: 'door', kind: 'dispatch', action: { type: 'startShift' }, phases: ['morning'], primary: true },
  promote: { id: 'promote', label: '街口揽客', icon: 'dialogue', kind: 'micro', microGame: 'promote', phases: ['morning'] },
  sign: { id: 'sign', label: '修整招牌', icon: 'hammer', kind: 'page', page: 'door', phases: ['evening'] },
  kitchen: { id: 'kitchen', label: '菜单与定价', icon: 'pot', kind: 'page', page: 'kitchen', phases: ['morning', 'evening'] },
  prepare: { id: 'prepare', label: '提前备菜', icon: 'pot', kind: 'micro', microGame: 'prepare', phases: ['morning'] },
  recipe: { id: 'recipe', label: '研究菜谱', icon: 'quest', kind: 'page', page: 'kitchen', phases: ['evening'] },
  supply: { id: 'supply', label: '查看库存', icon: 'basket', kind: 'page', page: 'supply', phases: ['morning', 'evening'] },
  purchase: { id: 'purchase', label: '采购食材', icon: 'basket', kind: 'micro', microGame: 'purchase', phases: ['morning'] },
  transport: { id: 'transport', label: '运输订单', icon: 'exit', kind: 'page', page: 'supply', phases: ['morning', 'evening'] },
  hall: { id: 'hall', label: '大堂状态', icon: 'quest', kind: 'page', page: 'hall', phases: ['morning', 'evening'] },
  clean: { id: 'clean', label: '清扫大堂', icon: 'broom', kind: 'micro', microGame: 'clean', phases: ['morning'] },
  rooms: { id: 'rooms', label: '客房与住客', icon: 'key', kind: 'page', page: 'rooms', phases: ['morning', 'evening'] },
  notice: { id: 'notice', label: '委托与证据', icon: 'quest', kind: 'page', page: 'notice', phases: ['morning', 'evening'] },
  yard: { id: 'yard', label: '修缮与休息', icon: 'hammer', kind: 'page', page: 'yard', phases: ['evening'] },
  service: { id: 'service', label: '处理当前事务', icon: 'warning', kind: 'service', phases: ['noon'], primary: true },
};

var OBJECTS = {
  inn: [
    {
      id: 'changfeng-stove', role: 'kitchen', label: '灶台与菜单牌',
      anchor: { x: 245, y: 250 }, hit: { x: 205, y: 218, width: 86, height: 78 },
      actions: ['kitchen', 'prepare', 'recipe'], linkedObstacleId: 'counter',
    },
    {
      id: 'changfeng-pantry', role: 'supply', label: '食材货架',
      anchor: { x: 330, y: 214 }, hit: { x: 292, y: 178, width: 86, height: 86 },
      actions: ['supply', 'purchase', 'transport'], linkedObstacleId: 'counter',
    },
    {
      id: 'changfeng-counter', role: 'counter', label: '柜台算盘',
      anchor: { x: 520, y: 252 }, hit: { x: 430, y: 220, width: 180, height: 76 },
      actions: ['counter', 'settle'], linkedObstacleId: 'counter',
    },
    {
      id: 'changfeng-notice', role: 'notice', label: '江湖告示板',
      anchor: { x: 610, y: 190 }, hit: { x: 568, y: 142, width: 86, height: 96 },
      actions: ['notice'],
    },
    {
      id: 'changfeng-hall', role: 'hall', label: '大堂桌席',
      anchor: { x: 120, y: 306 }, hit: { x: 34, y: 270, width: 156, height: 70 },
      actions: ['hall', 'clean'], linkedObstacleId: 'left-table',
    },
    {
      id: 'changfeng-rooms', role: 'rooms', label: '客房房牌',
      anchor: { x: 795, y: 218 }, hit: { x: 716, y: 164, width: 166, height: 126 },
      actions: ['rooms'], linkedObstacleId: 'stairs',
    },
    {
      id: 'changfeng-door', role: 'door', label: '大门与招牌',
      anchor: { x: 947, y: 267 }, hit: { x: 914, y: 208, width: 78, height: 128 },
      actions: ['open', 'promote', 'sign'],
    },
  ],
  yard: [
    {
      id: 'changfeng-yard-bench', role: 'yard', label: '后院工作台',
      anchor: { x: 665, y: 276 }, hit: { x: 600, y: 226, width: 134, height: 92 },
      actions: ['yard'],
    },
  ],
  jiangnan_branch: [
    {
      id: 'jiangnan-counter', role: 'counter', label: '临水柜台',
      anchor: { x: 385, y: 210 }, hit: { x: 270, y: 150, width: 246, height: 92 },
      actions: ['counter', 'settle'], linkedObstacleId: 'branch-counter',
    },
    {
      id: 'jiangnan-stove', role: 'kitchen', label: '水巷灶台',
      anchor: { x: 574, y: 224 }, hit: { x: 530, y: 178, width: 92, height: 100 },
      actions: ['kitchen', 'prepare', 'recipe'],
    },
    {
      id: 'jiangnan-pantry', role: 'supply', label: '码头货箱',
      anchor: { x: 878, y: 272 }, hit: { x: 824, y: 222, width: 118, height: 96 },
      actions: ['supply', 'purchase', 'transport'],
    },
    {
      id: 'jiangnan-hall', role: 'hall', label: '临水桌席',
      anchor: { x: 160, y: 300 }, hit: { x: 68, y: 268, width: 190, height: 72 },
      actions: ['hall', 'clean'], linkedObstacleId: 'canal-table',
    },
    {
      id: 'jiangnan-rooms', role: 'rooms', label: '分店房牌',
      anchor: { x: 730, y: 184 }, hit: { x: 660, y: 120, width: 150, height: 118 },
      actions: ['rooms'], linkedObstacleId: 'guest-stairs',
    },
    {
      id: 'jiangnan-notice', role: 'notice', label: '水巷告示',
      anchor: { x: 470, y: 132 }, hit: { x: 428, y: 86, width: 86, height: 92 },
      actions: ['notice'],
    },
    {
      id: 'jiangnan-door', role: 'door', label: '临水门面',
      anchor: { x: 45, y: 250 }, hit: { x: 0, y: 198, width: 84, height: 136 },
      actions: ['open', 'promote', 'sign'],
    },
    {
      id: 'jiangnan-workbench', role: 'yard', label: '装卸工作台',
      anchor: { x: 930, y: 170 }, hit: { x: 884, y: 126, width: 96, height: 94 },
      actions: ['yard'],
    },
  ],
};

function action(id) {
  return ACTIONS[id] || null;
}

function objectsForMap(mapId) {
  return (OBJECTS[mapId] || []).slice();
}

module.exports = {
  ACTIONS: ACTIONS,
  OBJECTS: OBJECTS,
  action: action,
  objectsForMap: objectsForMap,
};
