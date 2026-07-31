function floor(width, backY, frontY) {
  return [[28, backY], [width - 28, backY - 8], [width - 16, frontY], [16, frontY]];
}

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

const maps = [
  {
    id: 'money_house', name: '雁回票号', width: 1260, height: 348,
    walkable: [floor(1260, 266, 334)],
    obstacles: [
      { id: 'exchange-counter', polygon: rect(80, 224, 525, 64) },
      { id: 'counter-safe', polygon: rect(590, 228, 92, 64) },
      { id: 'cash-cage', polygon: rect(1160, 205, 100, 105) },
    ],
    spawns: {
      main: { x: 48, y: 310, facing: 'right' },
      market: { x: 48, y: 310, facing: 'right' },
      laneReturn: { x: 1130, y: 320, facing: 'left' },
    },
    exits: [
      { id: 'to-grain-market', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'grain_market', spawn: 'moneyReturn' },
      { id: 'to-scale-lane', zone: { x: 1208, y: 220, width: 52, height: 114 }, target: 'scale_contract_lane', spawn: 'moneyHouse', requires: ['c07-ticket-dated'] },
    ],
    hotspots: [
      {
        id: 'c07-ticket-ledger', x: 480, y: 292, radius: 82, label: '兑票簿',
        type: 'investigate', eventId: 'deep78-explore-ticket-date', requires: ['c07-price-board'], unless: ['c07-ticket-dated'],
        effects: {
          flag: 'c07-ticket-dated',
          evidence: { id: 'ticket-date', title: '提前三日兑付的货票', sourceMap: 'money_house', weight: 3 },
        },
        toast: '粮价上涨前三日，商会已经集中兑付同一批货票。',
      },
      {
        id: 'c07-guarantee-seal', x: 890, y: 290, radius: 78, label: '担保印墙',
        type: 'collect', eventId: 'deep78-explore-guarantee-seal', requires: ['c07-ticket-dated'], unless: ['c07-guarantee-seal'],
        effects: {
          flag: 'c07-guarantee-seal',
          evidence: { id: 'guarantee-seal', title: '重复使用的担保印', sourceMap: 'money_house', weight: 3 },
        },
        toast: '三家看似无关的粮行，都使用了同一枚磨损担保印。',
      },
    ],
    npcs: [
      { id: 'ticket-clerk', artId: 'merchant', name: '票号柜员', x: 710, y: 270, facing: 'left', showName: false },
    ],
  },
  {
    id: 'scale_contract_lane', name: '秤契巷', width: 1380, height: 348,
    walkable: [floor(1380, 190, 334)],
    obstacles: [
      { id: 'left-scale', polygon: rect(0, 112, 245, 120) },
      { id: 'right-scale', polygon: rect(835, 105, 250, 136) },
      { id: 'contract-stall', polygon: rect(1080, 100, 300, 160) },
    ],
    spawns: { main: { x: 70, y: 292, facing: 'right' }, moneyHouse: { x: 70, y: 292, facing: 'right' } },
    exits: [{ id: 'to-money-house', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'money_house', spawn: 'laneReturn' }],
    hotspots: [
      {
        id: 'c07-hollow-weight', x: 270, y: 294, radius: 78, label: '空心秤砣',
        type: 'investigate', eventId: 'deep78-explore-hollow-weight', requires: ['c07-guarantee-seal'], unless: ['c07-weight-proof'],
        effects: {
          flag: 'c07-weight-proof',
          evidence: { id: 'hollow-weight', title: '灌蜡空心秤砣', sourceMap: 'scale_contract_lane', weight: 3 },
          contradiction: { id: 'posted-vs-weighed', title: '价牌重量与实际过秤不符' },
        },
        toast: '秤砣被灌蜡减重，同样一袋粮被人为算得更贵。',
      },
      {
        id: 'c07-contract-copy', x: 650, y: 292, radius: 78, label: '统一契纸',
        type: 'collect', requires: ['c07-weight-proof'], unless: ['c07-contract-proof'],
        effects: {
          flag: 'c07-contract-proof',
          evidence: { id: 'uniform-contract', title: '同版同墨的定价契纸', sourceMap: 'scale_contract_lane', weight: 3 },
        },
        toast: '所谓各店自定的价格，实际抄自同一块契纸雕版。',
      },
      {
        id: 'c07-price-witness', x: 930, y: 294, radius: 82, label: '作证商贩',
        type: 'dialogue', dialogue: 'c07-witness', eventId: 'deep78-explore-protect-witness',
        requires: ['c07-contract-proof'], unless: ['c07-witness-safe'],
      },
      {
        id: 'c07-public-audit', x: 720, y: 294, radius: 86, label: '公开核价桌',
        type: 'mechanism', requires: ['c07-witness-safe'], unless: ['c07-audit-ready'],
        effects: {
          flag: 'c07-audit-ready',
          conclusion: {
            id: 'price-ring', title: '商盟通过票号、假秤和统一契纸操纵粮价',
            weight: 5, resolves: ['posted-vs-weighed', 'quote-vs-sale'],
          },
          market: { multipliers: { staple: -0.18, vegetable: -0.08 }, pressure: -24, reason: '公开核价' },
        },
        toast: '证据链已经完整，闻砚把票号、秤砣和契纸串成同一条线。',
      },
      {
        id: 'c07-ticket-fire', x: 1140, y: 292, radius: 90, label: '焚票打手',
        type: 'battle', battle: 'c07-ticket-fire',
        requires: ['c07-audit-ready'], unless: ['c07-tickets-saved'],
      },
      {
        id: 'c07-finale', x: 720, y: 294, radius: 86, label: '核价结果',
        type: 'dialogue', dialogue: 'c07-finale',
        requires: ['c07-tickets-saved'], unless: ['c07-complete'],
      },
    ],
    npcs: [
      { id: 'price-witness-npc', artId: 'townsman_old', name: '作证商贩', x: 930, y: 272, facing: 'left', requires: ['c07-contract-proof'], unless: ['c07-witness-safe'] },
      { id: 'ticket-burner', artId: 'ruffian_fast', name: '焚票打手', x: 1140, y: 270, facing: 'left', requires: ['c07-audit-ready'], unless: ['c07-tickets-saved'] },
    ],
  },
  {
    id: 'merchant_alliance_hall', name: '商盟会馆', width: 1420, height: 348,
    walkable: [floor(1420, 270, 334)],
    obstacles: [
      { id: 'council-table', polygon: rect(385, 160, 660, 100) },
      { id: 'right-stairs', polygon: rect(1080, 155, 150, 105) },
    ],
    spawns: {
      main: { x: 70, y: 292, facing: 'right' },
      guildOffice: { x: 70, y: 292, facing: 'right' },
      vaultReturn: { x: 1310, y: 292, facing: 'left' },
    },
    exits: [
      { id: 'to-guild-office', zone: { x: 0, y: 220, width: 52, height: 114 }, target: 'guild_office', spawn: 'hallReturn' },
      { id: 'to-old-ledger-vault', zone: { x: 1368, y: 220, width: 52, height: 114 }, target: 'old_ledger_vault', spawn: 'hall', requires: ['c08-vault-open'] },
    ],
    hotspots: [
      {
        id: 'c08-contract-wall', x: 290, y: 292, radius: 80, label: '契约墙',
        type: 'investigate', eventId: 'deep78-explore-contract-code', requires: ['c08-ledger-fragment'], unless: ['c08-contract-code'],
        effects: {
          flag: 'c08-contract-code',
          evidence: { id: 'contract-code', title: '契约墙中的旧商路代号', sourceMap: 'merchant_alliance_hall', weight: 3 },
        },
        toast: '残页上的“回雁三七”不是日期，而是被删去的赈灾商路代号。',
      },
      {
        id: 'c08-old-seal', x: 1140, y: 292, radius: 78, label: '旧盟印',
        type: 'collect', eventId: 'deep78-explore-old-seal', requires: ['c08-contract-code'], unless: ['c08-old-seal'],
        effects: {
          flag: 'c08-old-seal',
          evidence: { id: 'old-alliance-seal', title: '封存旧账库的商盟印', sourceMap: 'merchant_alliance_hall', weight: 3 },
        },
        toast: '旧盟印的缺口与第一张假路引上的黑印来自同一副母模。',
      },
      {
        id: 'c08-open-vault', x: 1240, y: 286, radius: 80, label: '屏风机关',
        type: 'mechanism', eventId: 'deep78-explore-vault-door', requires: ['c08-old-seal'], unless: ['c08-vault-open'],
        effects: { flag: 'c08-vault-open' },
        toast: '旧盟印嵌入屏风，地下账库的石门缓缓打开。',
      },
    ],
    npcs: [
      { id: 'hall-keeper', artId: 'guard', name: '会馆守契人', x: 950, y: 282, facing: 'left', unless: ['c08-vault-open'] },
    ],
  },
  {
    id: 'old_ledger_vault', name: '地下旧账库', width: 1500, height: 348,
    walkable: [[[90, 136], [1460, 136], [1482, 334], [74, 334]]],
    obstacles: [
      { id: 'burnt-cabinets', polygon: rect(0, 110, 365, 155) },
      { id: 'archive-cage', polygon: rect(760, 118, 620, 128) },
    ],
    spawns: { main: { x: 110, y: 292, facing: 'right' }, hall: { x: 110, y: 292, facing: 'right' } },
    exits: [{ id: 'to-merchant-hall', zone: { x: 74, y: 230, width: 62, height: 100 }, target: 'merchant_alliance_hall', spawn: 'vaultReturn' }],
    hotspots: [
      {
        id: 'c08-water-mark', x: 470, y: 300, radius: 78, label: '水痕账页',
        type: 'investigate', requires: ['c08-vault-open'], unless: ['c08-water-mark'],
        effects: {
          flag: 'c08-water-mark',
          evidence: { id: 'water-route-mark', title: '水痕显出的旧商路', sourceMap: 'old_ledger_vault', weight: 2 },
        },
        toast: '潮水浸出的纤维方向，显出一条从雁回镇通往江南的旧路。',
      },
      {
        id: 'c08-heat-mark', x: 830, y: 292, radius: 78, label: '火烤暗记',
        type: 'mechanism', requires: ['c08-water-mark'], unless: ['c08-heat-mark'],
        effects: {
          flag: 'c08-heat-mark',
          evidence: { id: 'heat-cargo-code', title: '火烤显出的赈灾货号', sourceMap: 'old_ledger_vault', weight: 2 },
        },
        toast: '闻砚控制火候，焦黑纸背浮出被隐藏的赈灾货号。',
      },
      {
        id: 'c08-light-mark', x: 1040, y: 292, radius: 78, label: '透光水印',
        type: 'investigate', eventId: 'deep78-explore-page-reveal', requires: ['c08-heat-mark'], unless: ['c08-light-mark'],
        effects: {
          flag: 'c08-light-mark',
          evidence: { id: 'relief-watermark', title: '官赈账册水印', sourceMap: 'old_ledger_vault', weight: 3 },
        },
        toast: '纸页迎光后出现官赈水印，旧账册记录的从来不是私人财富。',
      },
      {
        id: 'c08-first-page', x: 1260, y: 292, radius: 84, label: '账册第一页',
        type: 'collect', eventId: 'deep78-explore-first-page', requires: ['c08-light-mark'], unless: ['c08-ledger-page'],
        effects: {
          flag: 'c08-ledger-page',
          evidence: { id: 'first-ledger-page', title: '被抹除赈灾商路的第一页', sourceMap: 'old_ledger_vault', weight: 6 },
          conclusion: { id: 'erased-relief-route', title: '旧账册记录被人为抹除的赈灾商路', weight: 6 },
        },
        toast: '第一页将七章线索连在一起：有人借客栈、票号和驿路控制赈灾物资。',
      },
      {
        id: 'c08-vault-guard', x: 1110, y: 292, radius: 92, label: '守库人',
        type: 'battle', battle: 'c08-vault-guard',
        requires: ['c08-ledger-page'], unless: ['c08-vault-won'],
      },
      {
        id: 'c08-finale', x: 1260, y: 292, radius: 88, label: '带回第一页',
        type: 'dialogue', dialogue: 'c08-finale',
        requires: ['c08-vault-won'], unless: ['c08-complete'],
      },
    ],
    npcs: [
      { id: 'vault-heavy', artId: 'ruffian_heavy', name: '守库人', x: 1120, y: 270, facing: 'left', requires: ['c08-ledger-page'], unless: ['c08-vault-won'] },
    ],
  },
];

const chapters = {
  7: {
    id: 'chapter-07', title: '第七章：满镇无真价', startFlag: 'c07-started', completeFlag: 'c07-complete',
    steps: [
      { id: 'briefing', done: 'c07-started', text: '处理突然上涨的采购价，记录客栈实际成本。' },
      { id: 'market', done: 'c07-price-board', text: '到粮市核对价牌与实际成交价。' },
      { id: 'ticket', done: 'c07-ticket-dated', text: '进入雁回票号，检查集中兑付的货票。' },
      { id: 'seal', done: 'c07-guarantee-seal', text: '取得三家粮行共用担保印的证据。' },
      { id: 'weight', done: 'c07-weight-proof', text: '在秤契巷检查空心秤砣。' },
      { id: 'witness', done: 'c07-witness-safe', text: '保护商贩并完成公开核价准备。' },
      { id: 'audit', done: 'c07-audit-ready', text: '组合票号、秤砣和契纸证据。' },
      { id: 'fight', done: 'c07-tickets-saved', text: '阻止焚票，保住价格操纵证据。' },
      { id: 'complete', done: 'c07-complete', text: '完成公开核价，推进吕秀才专属任务。' },
    ],
  },
  8: {
    id: 'chapter-08', title: '第八章：账册第一页', startFlag: 'c08-started', completeFlag: 'c08-complete',
    steps: [
      { id: 'briefing', done: 'c08-started', text: '接收无名残页，核对客栈营业日期与货号。' },
      { id: 'fragment', done: 'c08-ledger-fragment', text: '从客栈旧账中解出残页的日期暗码。' },
      { id: 'contract', done: 'c08-contract-code', text: '调查商盟会馆契约墙中的旧商路代号。' },
      { id: 'seal', done: 'c08-old-seal', text: '取得开启旧账库的商盟旧印。' },
      { id: 'vault', done: 'c08-vault-open', text: '打开地下旧账库入口。' },
      { id: 'proof', done: 'c08-light-mark', text: '依次完成水痕、火烤和透光验页。' },
      { id: 'page', done: 'c08-ledger-page', text: '取得被抹除赈灾商路的账册第一页。' },
      { id: 'fight', done: 'c08-vault-won', text: '击退守库人，保护账册残页。' },
      { id: 'complete', done: 'c08-complete', text: '完成第一季结算并邀请吕秀才加入。' },
    ],
  },
};

const dayPlans = [
  ['c07d1', 7, 1, '一夜同涨', '重新核算进货成本，稳住今日菜单', 'dish'],
  ['c07d2', 7, 2, '价牌不算数', '完成营业后去粮市记录真实成交价', 'route'],
  ['c07d3', 7, 3, '票先于价', '调查票号集中兑付的货票日期', 'mystery'],
  ['c07d4', 7, 4, '一印担三家', '取得担保印与空心秤砣证据', 'security'],
  ['c07d5', 7, 5, '敢说真价的人', '安排巡查保护作证商贩', 'staff'],
  ['c07d6', 7, 6, '公开核价宴', '用营业与证据簿准备公开核价', 'guest'],
  ['c07d7', 7, 7, '满镇再有真价', '阻止焚票并公布操纵价格的证据链', 'mystery'],
  ['c08d1', 8, 1, '无名残页', '从客栈营业记录中找出日期暗码', 'ledger'],
  ['c08d2', 8, 2, '货号不是货号', '核对残页上的旧商路代号', 'mystery'],
  ['c08d3', 8, 3, '契约墙后', '调查商盟会馆和封存旧印', 'route'],
  ['c08d4', 8, 4, '水火见字', '完成水痕、火烤和透光验页', 'mystery'],
  ['c08d5', 8, 5, '地下旧账库', '准备补给并进入旧账库', 'security'],
  ['c08d6', 8, 6, '万灯前夜', '安排季末营业、队伍与返店路线', 'staff'],
  ['c08d7', 8, 7, '账册第一页', '保护残页并完成第一季结算', 'guest'],
].map(function (row, index) {
  return { id: row[0], chapter: row[1], day: row[2], title: row[3], objective: row[4], category: row[5], seed: 9801 + index * 23 };
});

const operationTitles = [
  ['dish', '一夜同涨的面粉'], ['guest', '不认价牌的熟客'], ['route', '提前兑付的货票'],
  ['mystery', '三家同一枚印'], ['security', '窗外盯梢的人'], ['staff', '谁去护证人'],
  ['guest', '公开核价宴'], ['dish', '高价肉还是平价面'], ['mystery', '票号烧纸味'],
  ['ledger', '残页上的空格'], ['guest', '来问旧路的客人'], ['route', '会馆拒客帖'],
  ['mystery', '水痕里的路线'], ['security', '账库门外脚印'], ['staff', '谁来守第一页'],
  ['dish', '季末最后一桌'], ['guest', '不署名的旧商人'], ['mystery', '被抹掉的赈灾字样'],
];

const operationEvents = operationTitles.map(function (entry, index) {
  var chapter = index < 9 ? 7 : 8;
  return {
    id: 'deep78-operation-' + String(index + 1).padStart(2, '0'),
    category: entry[0],
    title: entry[1],
    chapters: [chapter],
    cooldownDays: 3,
    weight: index % 4 === 0 ? 7 : 5,
    choices: [
      {
        id: 'favor', label: '先稳住客人', tendency: 'favor',
        result: '街坊愿意提供更多真实成交信息。',
        effects: { reputation: 2, coin: -2, market: { pressure: -1, reason: '街坊互证' } },
      },
      {
        id: 'rule', label: '逐笔留凭', tendency: 'rule',
        result: '每一笔货价都有来源可查。',
        effects: { order: 3, evidence: { id: 'operation-proof-' + (index + 1), title: entry[1] + '营业凭证', sourceMap: 'inn', weight: 1 } },
      },
      {
        id: 'venture', label: '顺线试探', tendency: 'venture',
        result: '客栈找到更快的调查路径，也承担少量风险。',
        effects: { coin: 3, risk: 1, market: { pressure: -1, reason: '主动试价' } },
      },
    ],
  };
});

const explorationEvents = [
  ['market-price', 'investigate', '记录实际成交价', 7],
  ['ticket-date', 'investigate', '检查兑票日期', 7],
  ['guarantee-seal', 'collect', '取得担保印拓样', 7],
  ['hollow-weight', 'investigate', '检查空心秤砣', 7],
  ['protect-witness', 'escort', '保护作证商贩', 7],
  ['contract-code', 'investigate', '辨认旧商路代号', 8],
  ['old-seal', 'collect', '取得商盟旧印', 8],
  ['vault-door', 'mechanism', '打开地下账库', 8],
  ['page-reveal', 'investigate', '完成三步验页', 8],
  ['first-page', 'collect', '取得账册第一页', 8],
].map(function (entry) {
  return { id: 'deep78-explore-' + entry[0], type: entry[1], title: entry[2], chapter: entry[3], cooldownDays: 3, requiresMovement: true };
});

const rareEvents = [
  { id: 'rare-price-ring-1', chain: 'price-ring', stage: 1, title: '只差半钱的价牌', previous: null },
  { id: 'rare-price-ring-2', chain: 'price-ring', stage: 2, title: '同日兑出的货票', previous: 'rare-price-ring-1' },
  { id: 'rare-price-ring-3', chain: 'price-ring', stage: 3, title: '秤砣里的蜂蜡', previous: 'rare-price-ring-2' },
  { id: 'rare-first-page-1', chain: 'first-page', stage: 1, title: '残页边缘的水线', previous: null },
  { id: 'rare-first-page-2', chain: 'first-page', stage: 2, title: '火烤后出现的货号', previous: 'rare-first-page-1' },
  { id: 'rare-first-page-3', chain: 'first-page', stage: 3, title: '通往江南的旧商路', previous: 'rare-first-page-2' },
].map(function (item) {
  var chapter = item.chain === 'price-ring' ? 7 : 8;
  return Object.assign({
    chapters: [chapter],
    cooldownDays: 7,
    persistent: true,
    choices: [
      {
        id: 'record', label: '收进证据簿', tendency: 'rule',
        result: '这条少见线索被单独编号，等待下一段相互印证。',
        effects: { evidence: { id: item.id, title: item.title, sourceMap: 'inn', weight: 2 } },
      },
      {
        id: 'follow', label: '顺线追查', tendency: 'venture',
        result: '客栈沿着线索找到了下一处调查方向。',
        effects: { risk: 1, market: { pressure: -2, reason: item.title } },
      },
    ],
  }, item);
});

const dialogues = {
  'c07-briefing': {
    speakerId: 'zhangdeng',
    text: '四类食材一夜同涨，偏偏三家粮行的价牌连墨迹都一样。先把今天的采购账留清楚，再去粮市问真正成交了多少。',
    choices: [{ label: '开始追查假价格', action: 'startChapter', chapter: 7, flag: 'c07-started' }],
  },
  'c07-witness': {
    speaker: '作证商贩',
    text: '他们逼我照契纸报同一个价。只要客栈能护我走到核价桌，我愿把收下的原始货票交出来。',
    choices: [
      { label: '安排郭芙蓉护送', action: 'flag', flag: 'c07-witness-safe' },
      { label: '由白展堂暗中探路', action: 'flag', flag: 'c07-witness-safe', tendency: 'venture' },
    ],
  },
  'c07-finale': {
    speakerId: 'wenyan',
    text: '价牌可以改，秤砣可以换，兑票日期却会留下先后。掌柜愿意让我继续查下去，我便把这条旧账查到最底下一页。',
    choices: [{ label: '开启吕秀才专属任务', action: 'completeDeepChapter', chapter: 7, quest: 'wenyan', flag: 'c07-complete' }],
  },
  'c08-briefing': {
    speakerId: 'wenyan',
    text: '这张残页没有署名，却把客栈七日营业写成一串货号。它不是来讨账的，是在告诉我们旧账库仍然存在。',
    choices: [{ label: '开始追查账册第一页', action: 'startChapter', chapter: 8, flag: 'c08-started' }],
  },
  'c08-fragment': {
    speakerId: 'wenyan',
    text: '空格对应客栈打烊的时辰，连起来正是会馆旧契约墙的位置。我把残页收好，接下来必须亲自进会馆。',
    choices: [{
      label: '记入证据簿', action: 'caseEvidence', flag: 'c08-ledger-fragment',
      evidence: { id: 'anonymous-fragment', title: '用营业日期编码的无名残页', sourceMap: 'inn', weight: 3 },
    }],
  },
  'c08-finale': {
    speakerId: 'wenyan',
    text: '第一页写的不是宝藏，而是一条救过许多人的赈灾商路。既然有人把它抹掉，我愿留在客栈，把后面的每一页重新找回来。',
    choices: [{ label: '邀请吕秀才正式加入', action: 'completeDeepChapter', chapter: 8, recruit: 'wenyan', flag: 'c08-complete', season: 1 }],
  },
};

const battles = {
  'c07-ticket-fire': {
    id: 'c07-ticket-fire', title: '秤契巷护票', background: 'scale_contract_lane',
    enemies: [
      { name: '焚票快手', artId: 'ruffian_fast', hp: 108, atk: 17, speed: 16 },
      { name: '封巷打手', artId: 'ruffian_heavy', hp: 146, atk: 20, speed: 8 },
    ],
    reward: {
      coin: 36, reputation: 3, flag: 'c07-tickets-saved',
      evidence: { id: 'saved-original-tickets', title: '从火中保住的原始货票', sourceMap: 'scale_contract_lane', weight: 4 },
      market: { multipliers: { staple: -0.14, vegetable: -0.08, meat: -0.06, tea: -0.04 }, pressure: -22, reason: '原始货票公开' },
    },
  },
  'c08-vault-guard': {
    id: 'c08-vault-guard', title: '旧账库守页', background: 'old_ledger_vault',
    enemies: [
      { name: '守库执事', artId: 'guard', hp: 156, atk: 21, speed: 11 },
      { name: '夺页快手', artId: 'ruffian_fast', hp: 102, atk: 18, speed: 16 },
      { name: '封门力士', artId: 'ruffian_heavy', hp: 152, atk: 20, speed: 8 },
    ],
    reward: {
      coin: 48, medicine: 2, reputation: 4, flag: 'c08-vault-won',
      market: {
        mode: 'set', multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 },
        pressure: 0, pressureMode: 'set', normalized: true, reason: '商盟操价链瓦解',
      },
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
  dialogues: dialogues,
  battles: battles,
};
