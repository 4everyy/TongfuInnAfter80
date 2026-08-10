'use strict';

function floor(width, backY, frontY) {
  return [[28, backY], [width - 28, backY - 8], [width - 16, frontY], [16, frontY]];
}

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

var maps = [
  {
    id: 'jiangnan_spice_workshop',
    name: '江南香料作坊',
    width: 1260,
    height: 348,
    weather: 'clear',
    walkable: [floor(1260, 188, 334)],
    obstacles: [
      { id: 'drying-racks', polygon: rect(120, 146, 260, 104) },
      { id: 'grinding-table', polygon: rect(500, 232, 210, 72) },
      { id: 'sealed-store', polygon: rect(930, 142, 260, 116) },
    ],
    spawns: {
      main: { x: 78, y: 292, facing: 'right' },
      market: { x: 78, y: 292, facing: 'right' },
      kitchenReturn: { x: 1130, y: 294, facing: 'left' },
    },
    exits: [
      {
        id: 'to-river-market',
        zone: { x: 0, y: 220, width: 58, height: 114 },
        target: 'river_market',
        spawn: 'workshopReturn',
      },
      {
        id: 'to-old-banquet-kitchen',
        zone: { x: 1202, y: 220, width: 58, height: 114 },
        target: 'old_banquet_kitchen',
        spawn: 'workshop',
        requires: ['c11-workshop-proof'],
      },
    ],
    hotspots: [
      {
        id: 'c11-seal-rope',
        x: 1010,
        y: 292,
        radius: 76,
        label: '异常封绳',
        type: 'recipeSample',
        sample: {
          id: 'abnormal-seal-rope',
          name: '异常封绳',
          note: '绳结与李大嘴旧厨房的封记一致，绳芯却混有河市新染料。',
        },
        requires: ['c11-market-traced'],
        unless: ['c11-seal-rope-collected'],
        effects: { flag: 'c11-seal-rope-collected' },
      },
      {
        id: 'c11-workshop-ledger',
        x: 1080,
        y: 292,
        radius: 76,
        label: '调包记录',
        type: 'collect',
        requires: ['c11-identify-complete', 'c11-seal-rope-collected'],
        unless: ['c11-workshop-proof'],
        effects: {
          flag: 'c11-workshop-proof',
          evidence: {
            id: 'spice-workshop-transfer',
            title: '香料作坊调包记录',
            sourceMap: 'jiangnan_spice_workshop',
            weight: 3,
          },
        },
        toast: '封绳仓的出入记录指向一座停用多年的旧宴灶院。',
      },
    ],
    npcs: [
      {
        id: 'workshop-shiwei',
        roleId: 'shiwei',
        name: '李大嘴',
        x: 760,
        y: 278,
        facing: 'left',
        requires: ['c11-seal-rope-collected'],
        unless: ['c11-workshop-proof'],
      },
    ],
  },
  {
    id: 'old_banquet_kitchen',
    name: '百味旧灶院',
    width: 1320,
    height: 348,
    weather: 'clear',
    walkable: [floor(1320, 190, 334)],
    obstacles: [
      { id: 'collapsed-stoves', polygon: rect(110, 150, 300, 108) },
      { id: 'banquet-cauldron', polygon: rect(560, 226, 230, 82) },
      { id: 'burned-cabinet', polygon: rect(940, 140, 250, 118) },
    ],
    spawns: {
      main: { x: 80, y: 292, facing: 'right' },
      workshop: { x: 80, y: 292, facing: 'right' },
      recovery: { x: 160, y: 292, facing: 'right' },
    },
    exits: [
      {
        id: 'to-spice-workshop',
        zone: { x: 0, y: 220, width: 58, height: 114 },
        target: 'jiangnan_spice_workshop',
        spawn: 'kitchenReturn',
      },
    ],
    hotspots: [
      {
        id: 'c11-charred-recipe',
        x: 1040,
        y: 292,
        radius: 78,
        label: '烧损菜谱',
        type: 'recipeSample',
        sample: {
          id: 'charred-banquet-recipe',
          name: '烧损菜谱',
          note: '残页记着“先醒香、后入锅”，边角留有旧宴灶院的火印。',
        },
        requires: ['c11-workshop-proof'],
        unless: ['c11-recipe-fragment'],
        effects: { flag: 'c11-recipe-fragment' },
      },
      {
        id: 'c11-old-kitchen-memory',
        x: 860,
        y: 288,
        radius: 78,
        label: '旧厨房往事',
        type: 'dialogue',
        dialogue: 'c11-shiwei-quest',
        requires: ['c11-recipe-fragment'],
        unless: ['c11-shiwei-quest'],
      },
      {
        id: 'c11-fire-trial',
        x: 650,
        y: 300,
        radius: 86,
        label: '重燃宴锅',
        type: 'cookingTrial',
        trial: 'c11-fire-control',
        requires: ['c11-seasoning-complete', 'c11-shiwei-quest'],
        unless: ['c11-fire-complete'],
      },
      {
        id: 'c11-destroy-evidence',
        x: 1000,
        y: 294,
        radius: 92,
        label: '阻止毁证',
        type: 'battle',
        battle: 'c11-kitchen-saboteurs',
        requires: ['c11-fire-complete'],
        unless: ['c11-saboteurs-won'],
      },
      {
        id: 'c11-finale',
        x: 720,
        y: 292,
        radius: 88,
        label: '公开复宴',
        type: 'dialogue',
        dialogue: 'c11-finale',
        requires: ['c11-saboteurs-won', 'c11-fire-complete'],
        unless: ['c11-complete'],
      },
    ],
    npcs: [
      {
        id: 'old-kitchen-shiwei',
        roleId: 'shiwei',
        name: '李大嘴',
        x: 825,
        y: 278,
        facing: 'left',
        requires: ['c11-workshop-proof'],
        unless: ['c11-complete'],
      },
      {
        id: 'kitchen-saboteur',
        artId: 'ruffian_fast',
        name: '毁证伙计',
        x: 1120,
        y: 278,
        facing: 'left',
        requires: ['c11-fire-complete'],
        unless: ['c11-saboteurs-won'],
      },
    ],
  },
];

var chapters = {
  11: {
    id: 'chapter-11',
    title: '第十一章：失味的宴席',
    startFlag: 'c11-started',
    completeFlag: 'c11-complete',
    steps: [
      { id: 'returns', done: 'c11-returns-checked', text: '检查开张宴退回的菜品与食材批次。' },
      { id: 'identify', done: 'c11-identify-complete', text: '完成辨料试验，排除水源、肉类和火候问题。' },
      { id: 'market', done: 'c11-market-traced', text: '到河市核对同批香料的封绳与采购记录。' },
      { id: 'trust', done: 'c11-shiwei-trusted', text: '听李大嘴说明旧厨房封记的来历。' },
      { id: 'workshop', done: 'c11-workshop-proof', text: '调查香料作坊，找到调包记录。' },
      { id: 'recipe', done: 'c11-shiwei-quest', text: '在百味旧灶院找到烧损菜谱并开启专属任务。' },
      { id: 'seasoning', done: 'c11-seasoning-complete', text: '安排补货与试菜，完成调味试验。' },
      { id: 'fire', done: 'c11-fire-complete', text: '重燃宴锅，完成控火试验。' },
      { id: 'battle', done: 'c11-saboteurs-won', text: '阻止毁证并保护复宴现场。' },
      { id: 'complete', done: 'c11-complete', text: '公开复宴，完成李大嘴的专属招募任务。' },
    ],
  },
};

var dayPlans = [
  ['c11d1', 11, 1, '一桌退菜', '检查退回菜品与食材批次', 'dish'],
  ['c11d2', 11, 2, '味道从哪丢的', '完成辨料试验并记录样本', 'mystery'],
  ['c11d3', 11, 3, '同一批封绳', '到河市追查异常香料', 'route'],
  ['c11d4', 11, 4, '旧厨房的火印', '听李大嘴说明封记来历', 'guest'],
  ['c11d5', 11, 5, '烧损的宴谱', '调查香料作坊与百味旧灶院', 'mystery'],
  ['c11d6', 11, 6, '试菜不试运气', '安排岗位、补货并完成调味试验', 'staff'],
  ['c11d7', 11, 7, '把味道端回来', '控火、护证并完成公开复宴', 'security'],
].map(function (row, index) {
  return {
    id: row[0],
    chapter: row[1],
    day: row[2],
    title: row[3],
    objective: row[4],
    category: row[5],
    seed: 11101 + index * 31,
  };
});

var operationEvents = dayPlans.map(function (plan, index) {
  return {
    id: 'c11-operation-' + String(index + 1).padStart(2, '0'),
    category: plan.category,
    title: plan.title,
    chapters: [11],
    cooldownDays: 3,
    weight: index % 3 === 0 ? 7 : 5,
    choices: [
      {
        id: 'favor',
        label: '先给客人换菜',
        tendency: 'favor',
        result: '客人愿意留下样菜和真实评价。',
        effects: { reputation: 2, coin: -1 },
      },
      {
        id: 'rule',
        label: '封存同批食材',
        tendency: 'rule',
        result: '问题批次被完整隔离，调查更有凭据。',
        effects: { order: 2 },
      },
      {
        id: 'venture',
        label: '试配替代香料',
        tendency: 'venture',
        result: '临时菜谱撑住了营业，也带来一次试错。',
        effects: { coin: 2, risk: 1 },
      },
    ],
  };
});

var explorationEvents = [
  { id: 'c11-explore-returns', type: 'investigate', title: '检查退回菜品', chapter: 11, cooldownDays: 3, requiresMovement: true },
  { id: 'c11-explore-market', type: 'investigate', title: '追查同批香料', chapter: 11, cooldownDays: 3, requiresMovement: true },
  { id: 'c11-explore-workshop', type: 'recipeSample', title: '采集封绳样本', chapter: 11, cooldownDays: 3, requiresMovement: true },
  { id: 'c11-explore-recipe', type: 'recipeSample', title: '取得烧损菜谱', chapter: 11, cooldownDays: 3, requiresMovement: true },
  { id: 'c11-explore-fire', type: 'cookingTrial', title: '重燃宴锅', chapter: 11, cooldownDays: 3, requiresMovement: true },
];

var rareEvents = [
  {
    id: 'rare-lost-flavor-1',
    chain: 'lost-flavor',
    stage: 1,
    title: '不肯散去的焦香',
    previous: null,
  },
  {
    id: 'rare-lost-flavor-2',
    chain: 'lost-flavor',
    stage: 2,
    title: '旧宴灶院的火印',
    previous: 'rare-lost-flavor-1',
  },
  {
    id: 'rare-lost-flavor-3',
    chain: 'lost-flavor',
    stage: 3,
    title: '百家宴谱的空页',
    previous: 'rare-lost-flavor-2',
  },
].map(function (item) {
  return Object.assign({
    chapters: [11],
    cooldownDays: 7,
    persistent: true,
    choices: [
      { id: 'record', label: '记入试菜簿', tendency: 'rule', result: '每次火候与调味都有了记录。', effects: { order: 2 } },
      { id: 'taste', label: '再试一小锅', tendency: 'venture', result: '多一次试错，也多一条新菜思路。', effects: { risk: 1 } },
    ],
  }, item);
});

var cookingTrials = {
  'c11-identify-spice': {
    id: 'c11-identify-spice',
    title: '辨料：找出失味源头',
    description: '依次闻香、验色、试溶，找出被换过的香料。',
    completionFlag: 'c11-identify-complete',
    bonusFlag: 'c11-identify-mastered',
    rounds: [
      { prompt: '先闻香气，哪一份最可疑？', options: ['清甜回甘', '香气发闷', '辛香清亮'], correct: 1 },
      { prompt: '再看粉末颜色，哪一份被染过？', options: ['色泽均匀', '边缘结块', '遇水浮出青色'], correct: 2 },
      { prompt: '最后试溶，真正的调包证据是？', options: ['沉底缓慢', '油星散开', '杯底留有砂粒'], correct: 2 },
    ],
    reward: { reputation: 1 },
  },
  'c11-seasoning-balance': {
    id: 'c11-seasoning-balance',
    title: '调味：让香气重新站住',
    description: '根据残谱调整入料次序，让替代香料不抢主味。',
    completionFlag: 'c11-seasoning-complete',
    bonusFlag: 'c11-seasoning-mastered',
    rounds: [
      { prompt: '第一步先处理什么？', options: ['先下重盐', '温油醒香', '冷水冲香'], correct: 1 },
      { prompt: '主料入锅后怎样稳味？', options: ['急火翻炒', '立刻勾芡', '分次添汤'], correct: 2 },
      { prompt: '起锅前怎样收尾？', options: ['补一味鲜香', '再加一把糖', '关火久焖'], correct: 0 },
    ],
    reward: { coin: 4 },
  },
  'c11-fire-control': {
    id: 'c11-fire-control',
    title: '控火：重燃百味宴锅',
    description: '观察锅气，在三个关键节点控制火力。',
    completionFlag: 'c11-fire-complete',
    bonusFlag: 'c11-fire-mastered',
    rounds: [
      { prompt: '锅底刚热，先怎样起火？', options: ['猛添湿柴', '小火预热', '封住风门'], correct: 1 },
      { prompt: '香气升起，怎样保持锅气？', options: ['添干柴提火', '撤掉全部柴火', '浇水降温'], correct: 0 },
      { prompt: '汤汁将收，最后一步是？', options: ['继续猛烧', '压火收汁', '掀锅离灶'], correct: 1 },
    ],
    reward: { reputation: 2 },
  },
};

var dialogues = {
  'c11-briefing': {
    speakerId: 'zhangdeng',
    text: '开张宴的菜同时被退回来，不像一个厨子突然失手。先封存同批食材，再从味道、香料和火候一项项查。',
    choices: [
      { label: '开始调查失味宴席', action: 'startChapter', chapter: 11, flag: 'c11-started' },
    ],
  },
  'c11-shiwei-trust': {
    speakerId: 'shiwei',
    text: '这道封绳我认得。以前那座旧宴灶院就这么封香料。我离开以后一直不敢回去，怕那场坏宴真是我做坏的。',
    choices: [
      { label: '一起把旧账查清', action: 'trustShiwei', roleId: 'shiwei', flag: 'c11-shiwei-trusted' },
    ],
  },
  'c11-shiwei-quest': {
    speakerId: 'shiwei',
    text: '残谱不是让我背锅的证据，是师傅留下的醒香次序。有人烧掉菜谱，又拿旧封记调包香料。我要把这桌菜重新端出去。',
    choices: [
      { label: '重开宴锅，完成专属任务', action: 'questShiwei', roleId: 'shiwei', flag: 'c11-shiwei-quest' },
    ],
  },
  'c11-finale': {
    speakerId: 'shiwei',
    text: '味道回来了，旧厨房的事也算说清了。往后我不只借一灶火，我想在长风客栈和水巷分店都留一口自己的锅。',
    choices: [
      { label: '先照顾受影响的客人', action: 'completeSeason2Chapter', chapter: 11, tendency: 'favor', recruit: 'shiwei', flag: 'c11-complete' },
      { label: '公开封绳与采购记录', action: 'completeSeason2Chapter', chapter: 11, tendency: 'rule', recruit: 'shiwei', flag: 'c11-complete' },
      { label: '把醒香法做成新菜', action: 'completeSeason2Chapter', chapter: 11, tendency: 'venture', recruit: 'shiwei', flag: 'c11-complete' },
    ],
  },
};

var battles = {
  'c11-kitchen-saboteurs': {
    id: 'c11-kitchen-saboteurs',
    title: '百味旧灶院护证',
    background: 'old_banquet_kitchen',
    enemies: [
      { name: '纵火伙计', artId: 'ruffian_fast', hp: 138, atk: 20, speed: 16 },
      { name: '封仓打手', artId: 'ruffian_heavy', hp: 178, atk: 23, speed: 8 },
    ],
    reward: {
      coin: 42,
      reputation: 3,
      flag: 'c11-saboteurs-won',
      toast: '毁证者被击退，烧损菜谱和调包记录都保住了。',
    },
  },
};

module.exports = {
  maps: maps,
  chapters: chapters,
  dayPlans: dayPlans,
  operationEvents: operationEvents,
  explorationEvents: explorationEvents,
  rareEvents: rareEvents,
  cookingTrials: cookingTrials,
  dialogues: dialogues,
  battles: battles,
};
