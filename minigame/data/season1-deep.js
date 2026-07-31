function floor(width, backY, frontY) {
  return [[28, backY], [width - 28, backY - 8], [width - 16, frontY], [16, frontY]];
}

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

const maps = [
  {
    id: 'paper_mill', name: '雁回纸坊', width: 1180, height: 348,
    walkable: [floor(1180, 188, 332)],
    obstacles: [
      { id: 'vat', polygon: rect(54, 188, 310, 70) },
      { id: 'press', polygon: rect(382, 190, 122, 68) },
      { id: 'drying-rack', polygon: rect(700, 166, 210, 92) },
      { id: 'paper-stack', polygon: rect(920, 198, 128, 62) },
    ],
    spawns: { main: { x: 90, y: 286, facing: 'right' }, street: { x: 90, y: 286, facing: 'right' }, alleyReturn: { x: 1080, y: 284, facing: 'left' } },
    exits: [
      { id: 'to-street', zone: { x: 0, y: 220, width: 52, height: 112 }, target: 'street', spawn: 'paperReturn' },
      { id: 'to-paper-alley', zone: { x: 1128, y: 220, width: 52, height: 112 }, target: 'paper_alley', spawn: 'mill', requires: ['c03-watermark-sample'] },
    ],
    hotspots: [
      { id: 'c03-paper-vat', x: 210, y: 276, radius: 82, label: '纸浆槽', type: 'investigate', requires: ['c03-started'], unless: ['c03-fiber-sample'], effects: { flag: 'c03-fiber-sample' }, toast: '纸浆里混着一种只供官契使用的蓝麻纤维。' },
      { id: 'c03-watermark-window', x: 580, y: 270, radius: 76, label: '透光验纸', type: 'investigate', requires: ['c03-fiber-sample'], unless: ['c03-watermark-sample'], effects: { flag: 'c03-watermark-sample' }, toast: '纸页迎光后显出反向水印，这批路引不是官坊所制。' },
      { id: 'c03-drying-rack', x: 810, y: 278, radius: 74, label: '晾纸架', type: 'collect', requires: ['c03-started'], unless: ['c03-paper-edge'], effects: { flag: 'c03-paper-edge' }, toast: '找到一角被故意撕去印记的废纸。' },
    ],
    npcs: [{ id: 'paper-master', artId: 'townsman_old', name: '纸坊老师傅', x: 650, y: 265, facing: 'left' }],
  },
  {
    id: 'paper_alley', name: '纸坊后巷', width: 1060, height: 348,
    walkable: [floor(1060, 195, 332)],
    obstacles: [{ id: 'paper-bales', polygon: rect(345, 205, 225, 72) }, { id: 'store-door', polygon: rect(650, 198, 165, 76) }],
    spawns: { main: { x: 80, y: 288, facing: 'right' }, mill: { x: 80, y: 288, facing: 'right' }, postReturn: { x: 970, y: 286, facing: 'left' } },
    exits: [
      { id: 'to-paper-mill', zone: { x: 0, y: 220, width: 52, height: 112 }, target: 'paper_mill', spawn: 'alleyReturn' },
      { id: 'to-old-post', zone: { x: 1008, y: 220, width: 52, height: 112 }, target: 'old_post', spawn: 'alley', requires: ['c03-ink-trail'] },
    ],
    hotspots: [
      { id: 'c03-ink-trail', x: 720, y: 300, radius: 76, label: '排水沟墨痕', type: 'investigate', requires: ['c03-watermark-sample'], unless: ['c03-ink-trail'], effects: { flag: 'c03-ink-trail' }, toast: '墨痕一路向废弃驿站延伸。' },
      { id: 'c03-hidden-bundle', x: 480, y: 292, radius: 70, label: '纸包', type: 'collect', requires: ['c03-watermark-sample'], unless: ['c03-blank-permits'], effects: { flag: 'c03-blank-permits' }, toast: '纸包里是尚未盖印的空白路引。' },
    ],
    npcs: [],
  },
  {
    id: 'old_post', name: '废弃驿站', width: 1260, height: 348,
    walkable: [floor(1260, 190, 332)],
    obstacles: [{ id: 'collapsed-desk', polygon: rect(100, 212, 330, 80) }, { id: 'mail-rack', polygon: rect(700, 170, 410, 96) }],
    spawns: { main: { x: 62, y: 286, facing: 'right' }, alley: { x: 62, y: 286, facing: 'right' } },
    exits: [{ id: 'to-paper-alley', zone: { x: 0, y: 220, width: 52, height: 112 }, target: 'paper_alley', spawn: 'postReturn' }],
    hotspots: [
      { id: 'c03-old-letter', x: 1090, y: 282, radius: 82, label: '积灰信匣', type: 'dialogue', dialogue: 'c03-old-letter', requires: ['c03-ink-trail'], unless: ['c03-letter-read'] },
      { id: 'c03-seal-press', x: 340, y: 292, radius: 74, label: '坏掉的印台', type: 'mechanism', requires: ['c03-letter-read'], unless: ['c03-seal-matched'], effects: { flag: 'c03-seal-matched' }, toast: '印台缺口与假路引上的黑印完全吻合。' },
    ],
    npcs: [{ id: 'wuchen-post', roleId: 'wuchen', x: 670, y: 280, facing: 'right', requires: ['c03-ink-trail'], hideWhenInParty: true }],
  },
  {
    id: 'north_road', name: '北坡镖道', width: 1320, height: 348,
    walkable: [floor(1320, 200, 334)],
    obstacles: [{ id: 'landslide', polygon: rect(540, 205, 235, 70) }, { id: 'broken-cart', polygon: rect(1060, 218, 190, 78) }],
    spawns: { main: { x: 90, y: 292, facing: 'right' }, gate: { x: 90, y: 292, facing: 'right' }, riverReturn: { x: 1280, y: 300, facing: 'left' } },
    exits: [
      { id: 'to-east-gate', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'east_gate', spawn: 'northReturn' },
      { id: 'to-river-yard', zone: { x: 1268, y: 220, width: 52, height: 114 }, target: 'river_yard', spawn: 'road', requires: ['c04-road-cleared'] },
    ],
    hotspots: [
      { id: 'c04-landslide', x: 620, y: 296, radius: 84, label: '塌落路障', type: 'repair', requires: ['c04-started'], unless: ['c04-road-cleared'], effects: { flag: 'c04-road-cleared' }, toast: '道路清开，石块下压着一角被撕下的镖旗。' },
      { id: 'c04-cart-marks', x: 1120, y: 300, radius: 76, label: '错位车辙', type: 'investigate', requires: ['c04-road-cleared'], unless: ['c04-cart-marks'], effects: { flag: 'c04-cart-marks' }, toast: '两辆车在这里交换过车轮和货箱。' },
    ],
    npcs: [{ id: 'jingzhi-road', roleId: 'jingzhi', x: 430, y: 276, facing: 'right', requires: ['c04-started'], unless: ['c04-jingzhi-cooperating'] }],
  },
  {
    id: 'guild_warehouse', name: '商会货栈', width: 1180, height: 348,
    walkable: [floor(1180, 188, 332)],
    obstacles: [{ id: 'crate-left', polygon: rect(180, 225, 210, 72) }, { id: 'scale-table', polygon: rect(560, 205, 180, 62) }, { id: 'crate-right', polygon: rect(870, 215, 190, 78) }],
    spawns: { main: { x: 90, y: 286, facing: 'right' }, street: { x: 90, y: 286, facing: 'right' } },
    exits: [{ id: 'to-street', zone: { x: 0, y: 220, width: 52, height: 112 }, target: 'street', spawn: 'guildReturn' }],
    hotspots: [
      { id: 'c03-decoy-ledger', x: 650, y: 290, radius: 80, label: '诱饵账册', type: 'battle', battle: 'c03-warehouse-sting', requires: ['c03-decoy-ready'], unless: ['c03-sting-won'] },
      { id: 'c04-weight-table', x: 650, y: 290, radius: 78, label: '货栈秤台', type: 'investigate', requires: ['c04-started'], unless: ['c04-weight-proof'], effects: { flag: 'c04-weight-proof' }, toast: '秤砣被灌了铅，调包后的货箱才会显得重量相同。' },
    ],
    npcs: [{ id: 'guild-clerk', artId: 'guard', name: '商会管事', x: 790, y: 270, facing: 'left' }],
  },
  {
    id: 'river_yard', name: '河滩转运场', width: 1360, height: 348,
    walkable: [floor(1360, 205, 334)],
    obstacles: [{ id: 'barge', polygon: rect(270, 176, 300, 90) }, { id: 'cargo-stack', polygon: rect(820, 215, 240, 82) }],
    spawns: { main: { x: 90, y: 292, facing: 'right' }, road: { x: 90, y: 292, facing: 'right' } },
    exits: [{ id: 'to-north-road', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'north_road', spawn: 'riverReturn' }],
    hotspots: [
      { id: 'c04-cargo-tags', x: 930, y: 304, radius: 86, label: '调包货箱', type: 'investigate', requires: ['c04-cart-marks'], unless: ['c04-cargo-proof'], effects: { flag: 'c04-cargo-proof' }, toast: '箱底的客栈房牌证明货物曾在夜里被换走。' },
      { id: 'c04-river-fight', x: 1120, y: 292, radius: 90, label: '押货打手', type: 'battle', battle: 'c04-river-guards', requires: ['c04-cargo-proof'], unless: ['c04-river-won'] },
      { id: 'c04-cooperate', x: 760, y: 292, radius: 82, label: '郭芙蓉的约定', type: 'dialogue', dialogue: 'c04-cooperate', requires: ['c04-river-won'], unless: ['c04-complete'] },
    ],
    npcs: [{ id: 'river-guard-heavy', artId: 'ruffian_heavy', name: '押货打手', x: 1080, y: 272, facing: 'left', requires: ['c04-cargo-proof'], unless: ['c04-river-won'] }],
  },
];

const chapters = {
  3: {
    id: 'chapter-03', title: '第三章：白纸黑印', startFlag: 'c03-started', completeFlag: 'c03-complete',
    steps: [
      { id: 'briefing', done: 'c03-started', text: '在客栈账本旁查看重复出现的黑印路引。' },
      { id: 'paper', done: 'c03-watermark-sample', text: '前往雁回纸坊，检查纸浆与水印。' },
      { id: 'alley', done: 'c03-ink-trail', text: '进入纸坊后巷，追查墨痕流向。' },
      { id: 'letter', done: 'c03-letter-read', text: '到废弃驿站，与白展堂面对那封送错的旧信。' },
      { id: 'trust', done: 'c03-wuchen-trusted', text: '决定如何处置旧信，并完成白展堂的信任考验。' },
      { id: 'decoy', done: 'c03-decoy-ready', text: '返回客栈完成诱饵账册和当日经营准备。' },
      { id: 'sting', done: 'c03-sting-won', text: '前往商会货栈，完成诱捕行动。' },
      { id: 'complete', done: 'c03-complete', text: '回客栈复盘黑印来源，正式邀请白展堂加入。' },
    ],
  },
  4: {
    id: 'chapter-04', title: '第四章：镖旗落地', startFlag: 'c04-started', completeFlag: 'c04-complete',
    steps: [
      { id: 'briefing', done: 'c04-started', text: '处理客栈门前两拨镖客的客房与菜单争议。' },
      { id: 'road', done: 'c04-road-cleared', text: '前往北坡镖道，清理路障并寻找镖旗。' },
      { id: 'marks', done: 'c04-cart-marks', text: '检查错位车辙，确认货车曾被调换。' },
      { id: 'warehouse', done: 'c04-weight-proof', text: '调查商会货栈的秤台和货物记录。' },
      { id: 'cargo', done: 'c04-cargo-proof', text: '前往河滩转运场，找出真正被调包的货箱。' },
      { id: 'fight', done: 'c04-river-won', text: '击退押货打手，保护客栈住客的货物。' },
      { id: 'cooperate', done: 'c04-jingzhi-cooperating', text: '与郭芙蓉约定临时合作，但不仓促招募。' },
      { id: 'complete', done: 'c04-complete', text: '返回客栈结算镖旗事件和跨章后果。' },
    ],
  },
};

const dayPlans = [
  ['c03d1', 3, 1, '黑印入账', '接待持相同路引的三批客人', 'guest'],
  ['c03d2', 3, 2, '纸价忽涨', '调整菜单与采购，控制纸价带来的成本', 'route'],
  ['c03d3', 3, 3, '蓝麻水印', '经营结束后前往纸坊取样', 'mystery'],
  ['c03d4', 3, 4, '旧信回声', '在废弃驿站完成白展堂信任选择', 'staff'],
  ['c03d5', 3, 5, '真假客券', '识别假券，同时保住真正困难的住客', 'room'],
  ['c03d6', 3, 6, '诱饵开席', '排班并制作诱饵账册', 'security'],
  ['c03d7', 3, 7, '货栈收网', '完成营业后实施货栈诱捕', 'mystery'],
  ['c04d1', 4, 1, '两拨镖客', '安排冲突客人的菜单和房间', 'guest'],
  ['c04d2', 4, 2, '落地镖旗', '稳定客栈秩序并调查镖旗来历', 'security'],
  ['c04d3', 4, 3, '北坡断路', '准备修路工具并前往北坡', 'route'],
  ['c04d4', 4, 4, '轻重两箱', '核对货栈秤台和客房登记', 'room'],
  ['c04d5', 4, 5, '规矩与人', '处理郭芙蓉与商会的正面冲突', 'staff'],
  ['c04d6', 4, 6, '护货开门', '配置护店岗位和次日菜单', 'dish'],
  ['c04d7', 4, 7, '河滩对证', '完成转运场对证和章节结算', 'mystery'],
].map(function (row, index) {
  return { id: row[0], chapter: row[1], day: row[2], title: row[3], objective: row[4], category: row[5], seed: 9031 + index * 17 };
});

const operationTitles = [
  ['guest', '三张同号路引'], ['route', '纸价一夜翻番'], ['room', '无印客券'], ['dish', '油纸包菜'],
  ['staff', '跑堂拒认旧信'], ['security', '窗外试印人'], ['mystery', '墨迹未干'], ['guest', '替人住店'],
  ['route', '失踪的纸车'], ['security', '落地镖旗'], ['room', '两队同房'], ['dish', '护镖忌口'],
  ['staff', '护院不护规矩'], ['route', '被换的车轮'], ['mystery', '铅心秤砣'], ['guest', '哑口货主'],
  ['security', '夜半抬箱'], ['room', '房牌在河滩'],
];

const operationEvents = operationTitles.map(function (entry, index) {
  return {
    id: 'deep-operation-' + String(index + 1).padStart(2, '0'), category: entry[0], title: entry[1],
    chapters: index < 9 ? [3] : [4], cooldownDays: 3, weight: index % 5 === 0 ? 7 : 5,
    choices: [
      { id: 'favor', label: '先安顿客人', tendency: 'favor', result: '客人记住了这份照应。', effects: { reputation: 2, coin: -2 } },
      { id: 'rule', label: '按账册核验', tendency: 'rule', result: '手续清楚，客栈秩序稳定。', effects: { order: 3 } },
      { id: 'venture', label: '顺线追查', tendency: 'venture', result: '多找到一条线索，也承担了风险。', effects: { coin: 3, risk: 1 } },
    ],
  };
});

const explorationEvents = [
  ['watermark', 'investigate', '辨认蓝麻水印'], ['ink-drain', 'track', '沿排水沟追墨'],
  ['blank-permit', 'collect', '寻找空白路引'], ['seal-press', 'mechanism', '复原缺口印台'],
  ['decoy-ledger', 'repair', '制作诱饵账册'], ['fallen-flag', 'collect', '拾回镖旗碎角'],
  ['road-block', 'repair', '清理北坡路障'], ['cart-track', 'track', '比对错位车辙'],
  ['weight-proof', 'investigate', '检查铅心秤砣'], ['cargo-escort', 'escort', '护送真货返店'],
].map(function (entry, index) {
  return { id: 'deep-explore-' + entry[0], type: entry[1], title: entry[2], chapter: index < 5 ? 3 : 4, cooldownDays: 3, requiresMovement: true };
});

const rareEvents = [
  { id: 'rare-black-mark-1', chain: 'black-mark', stage: 1, title: '灯下无影印', previous: null },
  { id: 'rare-black-mark-2', chain: 'black-mark', stage: 2, title: '纸背第二层', previous: 'rare-black-mark-1' },
  { id: 'rare-black-mark-3', chain: 'black-mark', stage: 3, title: '无人认领的印章', previous: 'rare-black-mark-2' },
  { id: 'rare-fallen-flag-1', chain: 'fallen-flag', stage: 1, title: '旗杆里的纸条', previous: null },
  { id: 'rare-fallen-flag-2', chain: 'fallen-flag', stage: 2, title: '没有镖号的货箱', previous: 'rare-fallen-flag-1' },
  { id: 'rare-fallen-flag-3', chain: 'fallen-flag', stage: 3, title: '河水退后的脚印', previous: 'rare-fallen-flag-2' },
].map(function (item) { return Object.assign({ cooldownDays: 7, persistent: true }, item); });

const dialogues = {
  'c03-briefing': { speakerId: 'zhangdeng', text: '三张路引，纸纹、号码、黑印一模一样。先把今天的客人安顿好，再去纸坊问清这批纸从哪儿来。', choices: [{ label: '开始调查黑印', action: 'startChapter', chapter: 3, flag: 'c03-started' }] },
  'c03-old-letter': { speakerId: 'wuchen', text: '这封信当年是我送错的。有人借那个错处做出了第一张假路引。掌柜若要交官，我不拦。', choices: [
    { label: '错误要认，人也要护', action: 'trust', roleId: 'wuchen', tendency: 'favor', flag: 'c03-letter-read' },
    { label: '先封存证物，查清全链', action: 'trust', roleId: 'wuchen', tendency: 'rule', flag: 'c03-letter-read' },
    { label: '用旧信反做诱饵', action: 'trust', roleId: 'wuchen', tendency: 'venture', flag: 'c03-letter-read' },
  ] },
  'c03-finale': { speakerId: 'wuchen', text: '这回不是临时搭把手。假路引的账没查完，我愿留下来，把欠下的路一段段走正。', choices: [{ label: '正式加入客栈', action: 'completeDeepChapter', chapter: 3, recruit: 'wuchen', flag: 'c03-complete' }] },
  'c04-briefing': { speakerId: 'jingzhi', text: '镖旗掉在你们门口，两拨人却都说货是自己的。先把客人分开，我去北坡看车辙。', choices: [{ label: '接下镖旗事件', action: 'startChapter', chapter: 4, flag: 'c04-started' }] },
  'c04-cooperate': { speakerId: 'jingzhi', text: '规矩若只护着会写规矩的人，我不认。但你这掌柜肯让两边都把话说完，我愿先留下查到第六章。', choices: [{ label: '临时合作', action: 'completeDeepChapter', chapter: 4, cooperate: 'jingzhi', flag: 'c04-complete' }] },
};

const battles = {
  'c03-warehouse-sting': { id: 'c03-warehouse-sting', title: '黑印收网', background: 'guild_warehouse', enemies: [{ name: '刻印匠', artId: 'ruffian_fast', hp: 86, atk: 14, speed: 15 }, { name: '护印打手', artId: 'ruffian_heavy', hp: 118, atk: 17, speed: 8 }], reward: { coin: 28, reputation: 2, flag: 'c03-sting-won' } },
  'c04-river-guards': { id: 'c04-river-guards', title: '河滩护货', background: 'river_yard', enemies: [{ name: '押货头目', artId: 'ruffian_heavy', hp: 132, atk: 18, speed: 9 }, { name: '换箱脚夫', artId: 'ruffian_fast', hp: 82, atk: 15, speed: 14 }], reward: { coin: 32, ingredient: 3, flag: 'c04-river-won' } },
};

module.exports = { maps: maps, chapters: chapters, dayPlans: dayPlans, operationEvents: operationEvents, explorationEvents: explorationEvents, rareEvents: rareEvents, dialogues: dialogues, battles: battles };
