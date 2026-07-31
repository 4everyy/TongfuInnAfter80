function floor(width, backY, frontY) {
  return [[28, backY], [width - 28, backY - 8], [width - 16, frontY], [16, frontY]];
}

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

const maps = [
  {
    id: 'grain_market', name: '雁回粮市', width: 1280, height: 348,
    walkable: [floor(1280, 194, 334)],
    obstacles: [
      { id: 'left-stall', polygon: rect(90, 198, 238, 74) },
      { id: 'grain-scale', polygon: rect(535, 206, 176, 62) },
      { id: 'right-stall', polygon: rect(905, 196, 250, 78) },
    ],
    spawns: {
      main: { x: 76, y: 292, facing: 'right' },
      street: { x: 76, y: 292, facing: 'right' },
      officeReturn: { x: 1190, y: 290, facing: 'left' },
    },
    exits: [
      { id: 'to-street', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'street', spawn: 'grainReturn' },
      { id: 'to-guild-office', zone: { x: 1228, y: 220, width: 52, height: 114 }, target: 'guild_office', spawn: 'market', requires: ['c05-crates-marked'] },
    ],
    hotspots: [
      {
        id: 'c05-price-sample', x: 270, y: 298, radius: 76, label: '三家粮价',
        type: 'investigate', requires: ['c05-started'], unless: ['c05-price-sampled'],
        effects: { flag: 'c05-price-sampled' },
        toast: '三家摊位的进价相同，商会账册却多出了一成“转运耗损”。',
      },
      {
        id: 'c05-mark-crates', x: 980, y: 298, radius: 78, label: '赈济粮袋',
        type: 'collect', requires: ['c05-price-sampled'], unless: ['c05-crates-marked'],
        effects: { flag: 'c05-crates-marked' },
        toast: '粮袋内层藏着客栈住客货单上的同批编号。',
      },
      {
        id: 'c05-grain-witness', x: 760, y: 294, radius: 82, label: '粮行小吏',
        type: 'dialogue', dialogue: 'c05-witness',
        requires: ['c05-price-sampled'], unless: ['c05-witness-protected'],
      },
    ],
    npcs: [
      { id: 'grain-clerk', artId: 'merchant', name: '粮行小吏', x: 760, y: 270, facing: 'left', requires: ['c05-price-sampled'], unless: ['c05-witness-protected'] },
      { id: 'caravan-foreman', artId: 'townsman_old', name: '商队领车', x: 430, y: 276, facing: 'right', showName: false },
    ],
  },
  {
    id: 'guild_office', name: '商会账房', width: 1160, height: 348,
    walkable: [floor(1160, 188, 332)],
    obstacles: [
      { id: 'ledger-desk', polygon: rect(390, 206, 350, 68) },
      { id: 'seal-cabinet', polygon: rect(830, 180, 190, 86) },
      { id: 'scroll-shelf', polygon: rect(80, 178, 205, 86) },
    ],
    spawns: { main: { x: 72, y: 288, facing: 'right' }, market: { x: 72, y: 288, facing: 'right' } },
    exits: [{ id: 'to-grain-market', zone: { x: 0, y: 220, width: 52, height: 112 }, target: 'grain_market', spawn: 'officeReturn' }],
    hotspots: [
      {
        id: 'c05-double-ledger', x: 590, y: 294, radius: 82, label: '两本账册',
        type: 'investigate', requires: ['c05-crates-marked', 'c05-witness-protected'], unless: ['c05-ledger-found'],
        effects: { flag: 'c05-ledger-found' },
        toast: '明账记录商粮，暗账记录赈济粮；同一批货被结算了两次。',
      },
      {
        id: 'c05-repair-seal', x: 930, y: 292, radius: 76, label: '破损封匣',
        type: 'repair', requires: ['c05-ledger-found'], unless: ['c05-seal-repaired'],
        effects: { flag: 'c05-seal-repaired' },
        toast: '封匣重新扣好，证据在查账宴前不会被人替换。',
      },
      {
        id: 'c05-audit-ambush', x: 340, y: 294, radius: 84, label: '夺账打手',
        type: 'battle', battle: 'c05-audit-ambush',
        requires: ['c05-seal-repaired'], unless: ['c05-audit-won'],
      },
      {
        id: 'c05-finale', x: 590, y: 294, radius: 82, label: '公开双账',
        type: 'dialogue', dialogue: 'c05-finale',
        requires: ['c05-audit-won'], unless: ['c05-complete'],
      },
    ],
    npcs: [
      { id: 'guild-auditor', artId: 'guard', name: '商会核账人', x: 790, y: 268, facing: 'left', unless: ['c05-audit-won'] },
      { id: 'audit-ruffian', artId: 'ruffian_fast', name: '夺账打手', x: 350, y: 270, facing: 'right', requires: ['c05-seal-repaired'], unless: ['c05-audit-won'] },
    ],
  },
  {
    id: 'charity_granary', name: '城南义仓', width: 1300, height: 348,
    walkable: [[[205, 118], [1268, 118], [1284, 334], [210, 334]]],
    obstacles: [
      { id: 'left-foreground', polygon: rect(205, 118, 82, 128) },
      { id: 'grain-stack-left', polygon: rect(315, 104, 330, 62) },
      { id: 'right-foreground', polygon: rect(960, 190, 340, 158) },
    ],
    spawns: {
      main: { x: 300, y: 292, facing: 'right' },
      warehouse: { x: 300, y: 292, facing: 'right' },
      checkpointReturn: { x: 900, y: 292, facing: 'left' },
    },
    exits: [
      { id: 'to-guild-warehouse', zone: { x: 205, y: 270, width: 72, height: 64 }, target: 'guild_warehouse', spawn: 'charityReturn' },
      { id: 'to-canal-checkpoint', zone: { x: 860, y: 270, width: 88, height: 64 }, target: 'canal_checkpoint', spawn: 'granary', requires: ['c06-route-proven'] },
    ],
    hotspots: [
      {
        id: 'c06-empty-bays', x: 760, y: 178, radius: 80, label: '空仓格',
        type: 'investigate', requires: ['c06-started'], unless: ['c06-shortage-proven'],
        effects: { flag: 'c06-shortage-proven' },
        toast: '账上写着满仓，木架上的旧压痕却证明粮食三日前就被搬空。',
      },
      {
        id: 'c06-false-seal', x: 560, y: 178, radius: 76, label: '反扣封条',
        type: 'collect', requires: ['c06-shortage-proven'], unless: ['c06-false-seal'],
        effects: { flag: 'c06-false-seal' },
        toast: '封条纹路与第五章的暗账印章一致，但日期被倒盖了。',
      },
      {
        id: 'c06-hidden-route', x: 900, y: 175, radius: 82, label: '转运暗门',
        type: 'mechanism', requires: ['c06-false-seal'], unless: ['c06-route-proven'],
        effects: { flag: 'c06-route-proven' },
        toast: '暗门外的车辙直通河渠关卡，粮车并未离开雁回镇。',
      },
    ],
    npcs: [
      { id: 'relief-mother', artId: 'townswoman_young', name: '等粮的妇人', x: 820, y: 278, facing: 'left' },
    ],
  },
  {
    id: 'canal_checkpoint', name: '河渠关卡', width: 1380, height: 348,
    walkable: [[[390, 128], [1350, 128], [1364, 334], [390, 334]]],
    obstacles: [
      { id: 'canal-water', polygon: rect(0, 0, 390, 348) },
      { id: 'chain-barrier', polygon: rect(640, 215, 190, 45), requires: ['c06-route-proven'], unless: ['c06-barrier-open'] },
      { id: 'checkpoint-booth', polygon: rect(800, 110, 235, 92) },
      { id: 'gate-wall', polygon: rect(1130, 88, 250, 108) },
    ],
    spawns: { main: { x: 470, y: 292, facing: 'right' }, granary: { x: 470, y: 292, facing: 'right' } },
    exits: [{ id: 'to-charity-granary', zone: { x: 390, y: 270, width: 90, height: 64 }, target: 'charity_granary', spawn: 'checkpointReturn' }],
    hotspots: [
      {
        id: 'c06-chain-barrier', x: 730, y: 294, radius: 80, label: '锁链路障',
        type: 'repair', requires: ['c06-route-proven'], unless: ['c06-barrier-open'],
        effects: { flag: 'c06-barrier-open' },
        toast: '郭芙蓉稳住锁链，粮车获得一条可以撤回的通道。',
      },
      {
        id: 'c06-checkpoint-fight', x: 1020, y: 294, radius: 90, label: '扣粮护卫',
        type: 'battle', battle: 'c06-checkpoint-fight',
        requires: ['c06-barrier-open'], unless: ['c06-checkpoint-won'],
      },
      {
        id: 'c06-finale', x: 930, y: 294, radius: 86, label: '护送粮车返店',
        type: 'dialogue', dialogue: 'c06-finale',
        requires: ['c06-checkpoint-won'], unless: ['c06-complete'],
      },
    ],
    npcs: [
      { id: 'escort-captain', artId: 'guard', name: '押运头领', x: 1020, y: 270, facing: 'left', requires: ['c06-route-proven'], unless: ['c06-checkpoint-won'] },
      { id: 'checkpoint-heavy', artId: 'ruffian_heavy', name: '扣粮护卫', x: 1120, y: 276, facing: 'left', requires: ['c06-barrier-open'], unless: ['c06-checkpoint-won'] },
    ],
  },
];

const chapters = {
  5: {
    id: 'chapter-05', title: '第五章：两桌不同的账', startFlag: 'c05-started', completeFlag: 'c05-complete',
    steps: [
      { id: 'briefing', done: 'c05-started', text: '在客栈接待持有两套货单的商队与赈济客人。' },
      { id: 'prices', done: 'c05-price-sampled', text: '前往雁回粮市，实际采集三家粮价。' },
      { id: 'cargo', done: 'c05-crates-marked', text: '检查赈济粮袋，标记可追查的批次。' },
      { id: 'witness', done: 'c05-witness-protected', text: '保护愿意作证的粮行小吏。' },
      { id: 'ledger', done: 'c05-ledger-found', text: '进入商会账房，比对明账与暗账。' },
      { id: 'seal', done: 'c05-seal-repaired', text: '修复证据封匣，为查账宴做好准备。' },
      { id: 'fight', done: 'c05-audit-won', text: '阻止夺账打手，保住双重账册。' },
      { id: 'complete', done: 'c05-complete', text: '公开双账，完成郭芙蓉的信任考验。' },
    ],
  },
  6: {
    id: 'chapter-06', title: '第六章：护院不护规矩', startFlag: 'c06-started', completeFlag: 'c06-complete',
    steps: [
      { id: 'briefing', done: 'c06-started', text: '处理赈济粮车被扣后造成的食材短缺。' },
      { id: 'shortage', done: 'c06-shortage-proven', text: '调查城南义仓，确认账实不符。' },
      { id: 'seal', done: 'c06-false-seal', text: '取得倒盖封条，证明扣粮手续造假。' },
      { id: 'route', done: 'c06-route-proven', text: '打开转运暗门，追踪粮车去向。' },
      { id: 'barrier', done: 'c06-barrier-open', text: '在河渠关卡为粮车打开撤离通道。' },
      { id: 'fight', done: 'c06-checkpoint-won', text: '击退扣粮护卫，保护证人与粮车。' },
      { id: 'complete', done: 'c06-complete', text: '返回客栈结算，正式邀请郭芙蓉加入。' },
    ],
  },
};

const dayPlans = [
  ['c05d1', 5, 1, '两单投店', '安顿立场相反的两批客人，保住客栈秩序', 'guest'],
  ['c05d2', 5, 2, '房价两难', '调整房价与菜单，避免证人提前离店', 'room'],
  ['c05d3', 5, 3, '三家粮价', '完成营业后前往粮市采价', 'route'],
  ['c05d4', 5, 4, '明暗双账', '保护小吏并进入商会账房核账', 'mystery'],
  ['c05d5', 5, 5, '夜护证人', '安排巡查岗位，完成郭芙蓉信任考验', 'security'],
  ['c05d6', 5, 6, '查账开席', '筹备查账宴并封存关键证据', 'dish'],
  ['c05d7', 5, 7, '白账见光', '保住双账并公开赈济粮去向', 'staff'],
  ['c06d1', 6, 1, '粮车被扣', '用有限食材稳定住店客人', 'route'],
  ['c06d2', 6, 2, '缺粮菜单', '调整售价与菜品，避免口碑崩落', 'dish'],
  ['c06d3', 6, 3, '义仓空响', '调查义仓账实不符', 'mystery'],
  ['c06d4', 6, 4, '倒扣封条', '检查伪造手续和隐藏转运门', 'security'],
  ['c06d5', 6, 5, '护人护粮', '护送证人与粮车，决定是否正面冲突', 'staff'],
  ['c06d6', 6, 6, '应急住店', '安排巡查、客房和应急菜单', 'room'],
  ['c06d7', 6, 7, '关卡开链', '突破河渠关卡并完成招募', 'security'],
].map(function (row, index) {
  return { id: row[0], chapter: row[1], day: row[2], title: row[3], objective: row[4], category: row[5], seed: 9501 + index * 19 };
});

const operationTitles = [
  ['guest', '同货不同单'], ['room', '证人换房'], ['dish', '赈济客的清汤'], ['route', '粮价少一成'],
  ['staff', '护院守哪桌'], ['security', '窗外递来的封口钱'], ['mystery', '账页少半张'], ['guest', '不肯留名的车夫'],
  ['room', '夜半查房'], ['route', '扣下的粮车'], ['dish', '只剩两袋主食'], ['guest', '等粮的母子'],
  ['staff', '规矩写给谁'], ['security', '倒盖的封条'], ['mystery', '空仓里的满账'], ['room', '受伤的证人'],
  ['route', '河渠换道'], ['security', '关卡索粮'],
];

const operationEvents = operationTitles.map(function (entry, index) {
  return {
    id: 'deep56-operation-' + String(index + 1).padStart(2, '0'),
    category: entry[0],
    title: entry[1],
    chapters: index < 9 ? [5] : [6],
    cooldownDays: 3,
    weight: index % 4 === 0 ? 7 : 5,
    choices: [
      { id: 'favor', label: '先保住人', tendency: 'favor', result: '客人愿意留下作证。', effects: { reputation: 2, coin: -2 } },
      { id: 'rule', label: '封存凭证', tendency: 'rule', result: '手续完整，秩序得到控制。', effects: { order: 3 } },
      { id: 'venture', label: '顺货追查', tendency: 'venture', result: '找到了新去向，也增加了经营风险。', effects: { coin: 3, risk: 1 } },
    ],
  };
});

const explorationEvents = [
  ['price-sample', 'investigate', '记录三家粮价', 5],
  ['mark-crates', 'collect', '标记赈济粮袋', 5],
  ['escort-witness', 'escort', '护送粮行小吏', 5],
  ['compare-ledgers', 'investigate', '比对明暗双账', 5],
  ['repair-seal', 'repair', '修复证据封匣', 5],
  ['empty-bays', 'investigate', '检查义仓空格', 6],
  ['false-seal', 'collect', '取得倒扣封条', 6],
  ['hidden-route', 'mechanism', '打开转运暗门', 6],
  ['escort-cart', 'escort', '护送赈济粮车', 6],
  ['open-barrier', 'repair', '解除关卡锁链', 6],
].map(function (entry) {
  return { id: 'deep56-explore-' + entry[0], type: entry[1], title: entry[2], chapter: entry[3], cooldownDays: 3, requiresMovement: true };
});

const rareEvents = [
  { id: 'rare-double-ledger-1', chain: 'double-ledger', stage: 1, title: '被撕走的行号', previous: null },
  { id: 'rare-double-ledger-2', chain: 'double-ledger', stage: 2, title: '同日两枚印', previous: 'rare-double-ledger-1' },
  { id: 'rare-double-ledger-3', chain: 'double-ledger', stage: 3, title: '账外第三桌', previous: 'rare-double-ledger-2' },
  { id: 'rare-relief-cart-1', chain: 'relief-cart', stage: 1, title: '车轴里的米粒', previous: null },
  { id: 'rare-relief-cart-2', chain: 'relief-cart', stage: 2, title: '义仓后的水路', previous: 'rare-relief-cart-1' },
  { id: 'rare-relief-cart-3', chain: 'relief-cart', stage: 3, title: '不属于商会的令牌', previous: 'rare-relief-cart-2' },
].map(function (item) { return Object.assign({ cooldownDays: 7, persistent: true }, item); });

const dialogues = {
  'c05-briefing': {
    speakerId: 'zhangdeng',
    text: '两桌客人拿着同一批粮的货单，一桌说是商粮，一桌说是赈济粮。先把人安顿好，再去粮市看真正的进价。',
    choices: [{ label: '开始查两本账', action: 'startChapter', chapter: 5, flag: 'c05-started' }],
  },
  'c05-witness': {
    speaker: '粮行小吏',
    text: '我见过他们把赈济粮记进商账。郭姑娘若能护我走到账房，我愿把藏下的批次号交出来。',
    choices: [
      { label: '由郭芙蓉护送', action: 'flag', flag: 'c05-witness-protected' },
      { label: '先标记撤退路线', action: 'flag', flag: 'c05-witness-protected', tendency: 'rule' },
    ],
  },
  'c05-finale': {
    speakerId: 'jingzhi',
    text: '以前我只想着把坏规矩一掌拍碎。今天才明白，护住肯说真话的人，证据才有机会站到桌面上。',
    choices: [{ label: '完成信任考验', action: 'completeDeepChapter', chapter: 5, trust: 'jingzhi', flag: 'c05-complete' }],
  },
  'c06-briefing': {
    speakerId: 'jingzhi',
    text: '他们拿旧规矩扣了赈济粮车，客栈今天已经缺粮。先稳住三轮营业，晚上去义仓看所谓的“满仓”。',
    choices: [{ label: '追查被扣粮车', action: 'startChapter', chapter: 6, flag: 'c06-started' }],
  },
  'c06-finale': {
    speakerId: 'jingzhi',
    text: '我不护那些只让弱者吃亏的规矩。但我愿护这间客栈、护肯作证的人，也护你把每一笔账查到底。',
    choices: [{ label: '邀请郭芙蓉正式加入', action: 'completeDeepChapter', chapter: 6, recruit: 'jingzhi', trust: 'wenyan', flag: 'c06-complete' }],
  },
};

const battles = {
  'c05-audit-ambush': {
    id: 'c05-audit-ambush', title: '账房护证', background: 'guild_office',
    enemies: [
      { name: '夺账快手', artId: 'ruffian_fast', hp: 98, atk: 16, speed: 15 },
      { name: '封门打手', artId: 'ruffian_heavy', hp: 126, atk: 18, speed: 8 },
    ],
    reward: { coin: 34, reputation: 2, flag: 'c05-audit-won' },
  },
  'c06-checkpoint-fight': {
    id: 'c06-checkpoint-fight', title: '河渠开链', background: 'canal_checkpoint',
    enemies: [
      { name: '押运头领', artId: 'guard', hp: 142, atk: 19, speed: 10 },
      { name: '扣粮护卫', artId: 'ruffian_heavy', hp: 132, atk: 18, speed: 8 },
      { name: '截路快手', artId: 'ruffian_fast', hp: 86, atk: 15, speed: 15 },
    ],
    reward: { coin: 38, ingredient: 5, reputation: 3, flag: 'c06-checkpoint-won' },
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
