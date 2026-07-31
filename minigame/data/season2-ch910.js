'use strict';

function floor(width, backY, frontY) {
  return [[28, backY], [width - 28, backY - 8], [width - 16, frontY], [16, frontY]];
}

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

var maps = [
  {
    id: 'jiangnan_branch', name: '水巷分店', width: 1000, height: 348, weather: 'clear',
    walkable: [floor(1000, 184, 334)],
    obstacles: [
      { id: 'branch-counter', polygon: rect(250, 154, 300, 72) },
      { id: 'guest-stairs', polygon: rect(660, 122, 150, 112) },
      { id: 'canal-table', polygon: rect(70, 276, 180, 56) },
    ],
    spawns: {
      main: { x: 300, y: 286, facing: 'right' },
      dockDoor: { x: 300, y: 286, facing: 'right' },
      recovery: { x: 330, y: 286, facing: 'right' },
    },
    exits: [
      { id: 'to-jiangnan-dock', zone: { x: 0, y: 220, width: 58, height: 114 }, target: 'jiangnan_dock', spawn: 'branchDoor' },
    ],
    hotspots: [
      {
        id: 'c10-briefing', x: 350, y: 280, radius: 78, label: '停业账本',
        type: 'dialogue', dialogue: 'c10-briefing', requires: ['c09-complete'], unless: ['c10-started'],
      },
      {
        id: 'c10-room-check', x: 730, y: 270, radius: 72, label: '潮湿客房',
        type: 'investigate', requires: ['c10-started'], unless: ['c10-rooms-checked'],
        effects: { flag: 'c10-rooms-checked' },
        toast: '客房木板受潮，但梁柱仍稳，整理后可以重新接客。',
      },
      {
        id: 'c10-stove-check', x: 570, y: 270, radius: 72, label: '熄火灶台',
        type: 'investigate', requires: ['c10-rooms-checked'], unless: ['c10-stove-checked'],
        effects: { flag: 'c10-stove-checked' },
        toast: '灶膛没有坏，只是风道被水汽和旧灰堵住。',
      },
      {
        id: 'c10-repair-stove', x: 570, y: 270, radius: 76, label: '修复灶台',
        type: 'repair', requires: ['c10-shiwei-cooperating'], unless: ['c10-stove-repaired'],
        effects: { flag: 'c10-stove-repaired', coin: -4 },
        toast: '李大嘴重新理顺风道，水巷分店的灶火终于稳定。',
      },
      {
        id: 'c10-finale', x: 390, y: 280, radius: 82, label: '开张账簿',
        type: 'dialogue', dialogue: 'c10-finale',
        requires: ['c10-banquet-won', 'c10-stove-repaired'], unless: ['c10-complete'],
      },
    ],
    npcs: [],
  },
  {
    id: 'jiangnan_dock', name: '江南码头', width: 1320, height: 348, weather: 'clear',
    walkable: [floor(1320, 190, 334)],
    obstacles: [
      { id: 'ticket-booth', polygon: rect(180, 146, 210, 100) },
      { id: 'spice-crates', polygon: rect(610, 235, 230, 70) },
      { id: 'warehouse', polygon: rect(1040, 132, 280, 132) },
    ],
    spawns: {
      main: { x: 90, y: 290, facing: 'right' },
      arrival: { x: 90, y: 290, facing: 'right' },
      branchDoor: { x: 90, y: 290, facing: 'right' },
      marketReturn: { x: 900, y: 300, facing: 'left' },
      ferryReturn: { x: 1180, y: 300, facing: 'left' },
    },
    exits: [
      { id: 'to-jiangnan-branch', zone: { x: 0, y: 220, width: 58, height: 114 }, target: 'jiangnan_branch', spawn: 'dockDoor', requires: ['c09-complete'] },
      { id: 'to-river-market', zone: { x: 760, y: 206, width: 90, height: 118 }, target: 'river_market', spawn: 'dock', requires: ['c09-crates-checked'] },
      { id: 'to-rain-ferry', zone: { x: 1262, y: 220, width: 58, height: 114 }, target: 'rain_ferry', spawn: 'dock', requires: ['c09-manifest-proof'] },
    ],
    hotspots: [
      {
        id: 'c09-missing-crates', x: 700, y: 300, radius: 82, label: '散落香料箱',
        type: 'investigate', requires: ['c09-started'], unless: ['c09-crates-checked'],
        effects: { flag: 'c09-crates-checked' },
        toast: '封绳是新的，箱底却有旧河泥，货物在靠岸前就被换过。',
      },
      {
        id: 'c10-delayed-cargo', x: 1060, y: 300, radius: 82, label: '延误补货船',
        type: 'investigate', requires: ['c10-started'], unless: ['c10-delay-checked'],
        effects: { flag: 'c10-delay-checked' },
        toast: '船期被雨水推迟一日，分店必须先用现有食材开张。',
      },
      {
        id: 'c10-banquet-fight', x: 1110, y: 300, radius: 92, label: '护住开张货物',
        type: 'battle', battle: 'c10-dock-defense',
        requires: ['c10-stove-repaired'], unless: ['c10-banquet-won'],
      },
    ],
    npcs: [
      { id: 'dock-clerk', artId: 'merchant', name: '船票经手人', x: 420, y: 278, facing: 'right', showName: false },
    ],
  },
  {
    id: 'river_market', name: '江南河市', width: 1280, height: 348, weather: 'clear',
    walkable: [floor(1280, 188, 334)],
    obstacles: [
      { id: 'produce-stall', polygon: rect(90, 150, 250, 104) },
      { id: 'weighing-platform', polygon: rect(520, 236, 190, 64) },
      { id: 'temporary-kitchen', polygon: rect(930, 150, 280, 110) },
    ],
    spawns: { main: { x: 80, y: 292, facing: 'right' }, dock: { x: 80, y: 292, facing: 'right' } },
    exits: [
      { id: 'to-jiangnan-dock', zone: { x: 0, y: 220, width: 58, height: 114 }, target: 'jiangnan_dock', spawn: 'marketReturn' },
    ],
    hotspots: [
      {
        id: 'c09-market-notes', x: 580, y: 300, radius: 80, label: '河市成交簿',
        type: 'investigate', requires: ['c09-crates-checked'], unless: ['c09-market-checked'],
        effects: { flag: 'c09-market-checked' },
        toast: '被调包的香料没有公开出售，而是被拆进三张临时灶台的采购单。',
      },
      {
        id: 'c09-shiwei-meet', x: 1030, y: 294, radius: 84, label: '火工厨师',
        type: 'dialogue', dialogue: 'c09-shiwei-meet', requires: ['c09-market-checked'], unless: ['c09-shiwei-met'],
      },
      {
        id: 'c10-shiwei-cook', x: 1030, y: 294, radius: 84, label: '试灶的厨师',
        type: 'dialogue', dialogue: 'c10-shiwei-cooperate',
        requires: ['c10-delay-checked'], unless: ['c10-shiwei-cooperating'],
      },
    ],
    npcs: [
      { id: 'river-market-cook', roleId: 'shiwei', name: '火工厨师', x: 1030, y: 272, facing: 'left', requires: ['c09-market-checked'], unless: ['c10-complete'] },
      { id: 'river-vendor', artId: 'townswoman_young', name: '河市摊主', x: 420, y: 276, facing: 'right', showName: false },
    ],
  },
  {
    id: 'rain_ferry', name: '雨夜渡口', width: 1440, height: 348, weather: 'rain',
    walkable: [floor(1440, 190, 334)],
    obstacles: [
      { id: 'waiting-shelter', polygon: rect(80, 132, 280, 128) },
      { id: 'swapped-cargo', polygon: rect(620, 235, 240, 70) },
      { id: 'cargo-ferry', polygon: rect(1160, 140, 280, 124) },
    ],
    spawns: { main: { x: 90, y: 292, facing: 'right' }, dock: { x: 90, y: 292, facing: 'right' } },
    exits: [
      { id: 'to-jiangnan-dock', zone: { x: 0, y: 220, width: 58, height: 114 }, target: 'jiangnan_dock', spawn: 'ferryReturn' },
    ],
    hotspots: [
      {
        id: 'c09-manifest', x: 680, y: 300, radius: 82, label: '浸水船单',
        type: 'collect', requires: ['c09-shiwei-met'], unless: ['c09-manifest-proof'],
        effects: { flag: 'c09-manifest-proof' },
        toast: '船单上的泊位被改过，失踪香料箱被送往这座雨夜渡口。',
      },
      {
        id: 'c09-ferry-fight', x: 1040, y: 300, radius: 94, label: '调包船伙',
        type: 'battle', battle: 'c09-ferry-smugglers',
        requires: ['c09-manifest-proof'], unless: ['c09-ferry-won'],
      },
      {
        id: 'c09-finale', x: 1180, y: 300, radius: 84, label: '追回香料箱',
        type: 'dialogue', dialogue: 'c09-finale', requires: ['c09-ferry-won'], unless: ['c09-complete'],
      },
    ],
    npcs: [
      { id: 'ferry-smuggler-fast', artId: 'ruffian_fast', name: '调包船伙', x: 1010, y: 276, facing: 'left', requires: ['c09-manifest-proof'], unless: ['c09-ferry-won'] },
      { id: 'ferry-smuggler-heavy', artId: 'ruffian_heavy', name: '押货船伙', x: 1100, y: 280, facing: 'left', requires: ['c09-manifest-proof'], unless: ['c09-ferry-won'] },
    ],
  },
];

var chapters = {
  9: {
    id: 'chapter-09', title: '第九章：一船南下', startFlag: 'c09-started', completeFlag: 'c09-complete',
    steps: [
      { id: 'letter', done: 'c09-started', text: '带上总店物资，乘船前往江南。' },
      { id: 'crates', done: 'c09-crates-checked', text: '在码头检查失踪的香料箱。' },
      { id: 'market', done: 'c09-market-checked', text: '到河市核对船票、货价和采购记录。' },
      { id: 'cook', done: 'c09-shiwei-met', text: '找到知道香料去向的火工厨师。' },
      { id: 'manifest', done: 'c09-manifest-proof', text: '前往雨夜渡口取得被改过的船单。' },
      { id: 'fight', done: 'c09-ferry-won', text: '击退调包船伙，追回分店物资。' },
      { id: 'complete', done: 'c09-complete', text: '接管停业的水巷分店。' },
    ],
  },
  10: {
    id: 'chapter-10', title: '第十章：水巷开张', startFlag: 'c10-started', completeFlag: 'c10-complete',
    steps: [
      { id: 'inspect', done: 'c10-started', text: '检查停业分店的客房、灶台和账目。' },
      { id: 'rooms', done: 'c10-rooms-checked', text: '确认客房仍可修整开放。' },
      { id: 'stove', done: 'c10-stove-checked', text: '检查熄火灶台和堵塞风道。' },
      { id: 'delay', done: 'c10-delay-checked', text: '处理补货船延误，调整开张菜单。' },
      { id: 'cook', done: 'c10-shiwei-cooperating', text: '邀请李大嘴临时协助后厨。' },
      { id: 'repair', done: 'c10-stove-repaired', text: '修复灶台并准备水巷开张宴。' },
      { id: 'fight', done: 'c10-banquet-won', text: '在码头护住开张货物。' },
      { id: 'complete', done: 'c10-complete', text: '完成分店首次营业结算。' },
    ],
  },
};

var dayPlans = [
  ['c09d1', 9, 1, '南来的求助信', '确定出行物资和留守岗位', 'route'],
  ['c09d2', 9, 2, '一船南下', '发出总店补给并安排船程菜单', 'staff'],
  ['c09d3', 9, 3, '少了三箱香料', '调查码头散落的香料箱', 'mystery'],
  ['c09d4', 9, 4, '河市没有这笔货', '核对成交簿与临时灶台采购单', 'ledger'],
  ['c09d5', 9, 5, '火工厨师', '找到知道香料去向的李大嘴', 'guest'],
  ['c09d6', 9, 6, '雨夜改泊', '追踪被修改的船单与泊位', 'weather'],
  ['c09d7', 9, 7, '渡口追回', '击退调包船伙并接管水巷分店', 'security'],
  ['c10d1', 10, 1, '停业的分店', '检查客房、灶台和停业账目', 'room'],
  ['c10d2', 10, 2, '先开哪一桌', '确定分店菜单、价格和岗位', 'dish'],
  ['c10d3', 10, 3, '水巷第一轮客人', '完成分店首次三轮营业', 'guest'],
  ['c10d4', 10, 4, '船期晚一日', '使用现有库存调整菜单并等待补货', 'route'],
  ['c10d5', 10, 5, '借你一灶火', '与李大嘴完成临时合作', 'staff'],
  ['c10d6', 10, 6, '风道重新起火', '修复灶台并筹备开张宴', 'dish'],
  ['c10d7', 10, 7, '水巷开张', '护住货物并完成分店营业挑战', 'security'],
].map(function (row, index) {
  return { id: row[0], chapter: row[1], day: row[2], title: row[3], objective: row[4], category: row[5], seed: 10901 + index * 29 };
});

var operationEvents = dayPlans.map(function (plan, index) {
  return {
    id: 's2-operation-' + String(index + 1).padStart(2, '0'),
    category: plan.category,
    title: plan.title,
    chapters: [plan.chapter],
    cooldownDays: 3,
    weight: index % 4 === 0 ? 7 : 5,
    choices: [
      { id: 'favor', label: '先稳住客人', tendency: 'favor', result: '客人愿意等分店把事情查清。', effects: { reputation: 2, coin: -1 } },
      { id: 'rule', label: '逐笔留单', tendency: 'rule', result: '货物与船期都有凭据可查。', effects: { order: 2 } },
      { id: 'venture', label: '主动试新路', tendency: 'venture', result: '找到更快的水路，也承担少量风险。', effects: { coin: 2, risk: 1 } },
    ],
  };
});

var explorationEvents = [
  ['crates', 'investigate', '检查香料箱', 9],
  ['market', 'investigate', '核对河市成交簿', 9],
  ['cook', 'dialogue', '询问火工厨师', 9],
  ['manifest', 'collect', '取得浸水船单', 9],
  ['rooms', 'investigate', '检查潮湿客房', 10],
  ['stove', 'investigate', '检查灶台风道', 10],
  ['delay', 'investigate', '确认补货延误', 10],
  ['repair', 'repair', '修复分店灶台', 10],
].map(function (entry) {
  return { id: 's2-explore-' + entry[0], type: entry[1], title: entry[2], chapter: entry[3], cooldownDays: 3, requiresMovement: true };
});

var rareEvents = [
  { id: 'rare-spice-boat-1', chain: 'spice-boat', stage: 1, title: '箱底的旧河泥', previous: null },
  { id: 'rare-spice-boat-2', chain: 'spice-boat', stage: 2, title: '临时灶台采购单', previous: 'rare-spice-boat-1' },
  { id: 'rare-spice-boat-3', chain: 'spice-boat', stage: 3, title: '被改过的泊位', previous: 'rare-spice-boat-2' },
].map(function (item) {
  return Object.assign({
    chapters: [9, 10], cooldownDays: 7, persistent: true,
    choices: [
      { id: 'record', label: '记入水路账', tendency: 'rule', result: '线索被单独编号。', effects: { order: 2 } },
      { id: 'follow', label: '顺水追查', tendency: 'venture', result: '找到下一处水路方向。', effects: { risk: 1 } },
    ],
  }, item);
});

var dialogues = {
  'c09-briefing': {
    speakerId: 'zhangdeng',
    text: '江南水巷分店停业三日，求助信却夹着账册第一页同样的水印。总店先发一批补给，我亲自坐船去看。',
    choices: [{ label: '带上物资，一船南下', action: 'startSeason2', chapter: 9, flag: 'c09-started' }],
  },
  'c09-shiwei-meet': {
    speakerId: 'shiwei',
    text: '这批香料火气不对，我没收。有人把真货换去了雨夜渡口，还拿我的临时灶台当幌子。',
    choices: [{ label: '请他指出改泊位置', action: 'meetShiwei', flag: 'c09-shiwei-met' }],
  },
  'c09-finale': {
    speakerId: 'zhangdeng',
    text: '香料追回来了，水巷分店却没人敢重新开门。既然旧商路把我们带到这里，这盏灯就由客栈重新点起来。',
    choices: [{ label: '接管水巷分店', action: 'completeSeason2Chapter', chapter: 9, flag: 'c09-complete' }],
  },
  'c10-briefing': {
    speakerId: 'zhangdeng',
    text: '客房能修，灶台能通，账上也没有坏债。今天开始，水巷分店按自己的库存和口碑重新经营。',
    choices: [{ label: '开始分店整备', action: 'startChapter', chapter: 10, flag: 'c10-started' }],
  },
  'c10-shiwei-cooperate': {
    speakerId: 'shiwei',
    text: '风道堵了不是砸灶，是得顺着烟气找。你让我试一天火，我帮你把开张宴撑起来。',
    choices: [{ label: '请李大嘴临时协助', action: 'cooperateShiwei', roleId: 'shiwei', flag: 'c10-shiwei-cooperating' }],
  },
  'c10-finale': {
    speakerId: 'shiwei',
    text: '这灶火能用了，分店也开起来了。不过百家宴谱的事还没查完，我先跟你们合作，等下一回再谈留下。',
    choices: [{ label: '完成水巷开张', action: 'completeSeason2Chapter', chapter: 10, flag: 'c10-complete' }],
  },
};

var battles = {
  'c09-ferry-smugglers': {
    id: 'c09-ferry-smugglers', title: '雨夜渡口追回香料', background: 'rain_ferry',
    enemies: [
      { name: '调包船伙', artId: 'ruffian_fast', hp: 118, atk: 18, speed: 16 },
      { name: '押货船伙', artId: 'ruffian_heavy', hp: 152, atk: 20, speed: 8 },
    ],
    reward: { coin: 32, reputation: 2, flag: 'c09-ferry-won', toast: '追回香料箱，水巷分店的停业线索已经完整。' },
  },
  'c10-dock-defense': {
    id: 'c10-dock-defense', title: '码头护住开张货物', background: 'jiangnan_dock',
    enemies: [
      { name: '抢货水手', artId: 'ruffian_fast', hp: 126, atk: 19, speed: 15 },
      { name: '堵船力士', artId: 'ruffian_heavy', hp: 164, atk: 21, speed: 8 },
    ],
    reward: { coin: 38, reputation: 3, flag: 'c10-banquet-won', toast: '开张货物安全送入水巷分店。' },
  },
};

module.exports = {
  maps: maps,
  chapters: chapters,
  dayPlans: dayPlans,
  operationEvents: operationEvents,
  explorationEvents: explorationEvents,
  rareEvents: rareEvents,
  dialogues: dialogues,
  battles: battles,
};
