const BRAND = {
  title: '灯下江湖',
  innName: '长风客栈',
  homeTown: '雁回镇',
  protagonist: 'zhangdeng',
};

const legacyRoleMap = {
  xiangyu: 'zhangdeng',
  zhantang: 'wuchen',
  furong: 'jingzhi',
  xiucai: 'wenyan',
  dazui: 'shiwei',
  xiaobei: 'xiaoman',
  wushuang: 'qiubai',
  xiaoliu: 'tangyu',
  xingbutou: 'zhaochuan',
};

const roles = [
  { id: 'zhangdeng', name: '柳掌灯', role: '掌柜', color: '#a85d69', unlock: 'start', stats: [112, 44, 14], traits: ['识人', '估价', '稳场'], skills: [['灯下识人', 'heal', 13, 26], ['百账归一', 'shield', 12, 18], ['一席定心', 'weaken', 10, 2]] },
  { id: 'wuchen', name: '谢无尘', role: '驿路斥候', color: '#355f62', unlock: 's1c3', stats: [104, 40, 21], traits: ['侦察', '追踪', '疾行'], skills: [['掠影递信', 'damage', 14, 28], ['截路听风', 'stun', 18, 18], ['驿痕追踪', 'focus', 10, 12]] },
  { id: 'jingzhi', name: '霍惊枝', role: '护院', color: '#b34f3d', unlock: 's1c6', stats: [130, 31, 16], traits: ['护卫', '破局', '威慑'], skills: [['惊枝破阵', 'damage', 16, 34], ['横身护客', 'shield', 15, 24], ['喝止风波', 'taunt', 9, 12]] },
  { id: 'wenyan', name: '闻砚', role: '文书说客', color: '#78958e', unlock: 's1c8', stats: [94, 49, 12], traits: ['核账', '推理', '说服'], skills: [['砚底藏锋', 'weaken', 15, 2], ['一纸定契', 'damage', 11, 21], ['博闻强记', 'focus', 9, 16]] },
  { id: 'shiwei', name: '庞十味', role: '火工厨师', color: '#bf843d', unlock: 's2c11', stats: [140, 35, 10], traits: ['火候', '菜谱', '宴席'], skills: [['十味烈火', 'damageAll', 19, 24], ['百家药膳', 'healAll', 18, 18], ['封灶守门', 'shield', 13, 20]] },
  { id: 'xiaoman', name: '叶小满', role: '地图信使', color: '#719563', unlock: 's2c15', stats: [98, 38, 19], traits: ['绘图', '机关', '捷径'], skills: [['折路飞签', 'damage', 12, 24], ['错图迷阵', 'stun', 15, 15], ['踏瓦寻径', 'focus', 10, 14]] },
  { id: 'qiubai', name: '宁秋白', role: '药酒师', color: '#8877a5', unlock: 's3c19', stats: [112, 46, 17], traits: ['医理', '毒理', '药酒'], skills: [['秋白药引', 'damage', 15, 30], ['清酿回春', 'heal', 14, 24], ['闻香辨毒', 'focus', 12, 17]] },
  { id: 'tangyu', name: '唐榆', role: '机关木匠', color: '#77715d', unlock: 's3c23', stats: [124, 34, 14], traits: ['修复', '机关', '营造'], skills: [['榫卯飞轮', 'damage', 15, 27], ['横梁拒马', 'shield', 11, 23], ['听木寻隙', 'weaken', 12, 2]] },
  { id: 'zhaochuan', name: '裴照川', role: '商路巡检', color: '#5b6f8b', unlock: 's4c27', stats: [144, 31, 11], traits: ['审讯', '统筹', '旧案'], skills: [['照川断路', 'damage', 14, 29], ['巡检号令', 'shield', 13, 24], ['旧案回锋', 'weaken', 13, 2]] },
];

const seasonDefinitions = [
  {
    id: 'season-1', title: '灯起雁回', region: '关中商路', startChapter: 1,
    mystery: '客栈债务、假路引与被拆散的旧商路账册。',
    chapters: ['风从门前起', '迟到的驿信', '白纸黑印', '镖旗落地', '两桌不同的账', '护院不护规矩', '满镇无真价', '账册第一页'],
  },
  {
    id: 'season-2', title: '潮来百味', region: '江南水路', startChapter: 9,
    mystery: '合作分店、河运行会与被抹除的赈灾商路。',
    chapters: ['一船南下', '水巷开张', '失味的宴席', '河市浮价', '雨夜错信', '茶园无主', '地图上的空桥', '潮退见旧碑'],
  },
  {
    id: 'season-3', title: '风雪封驿', region: '北境驿路', startChapter: 17,
    mystery: '物资断流、药材异变与被人操控的商路价格。',
    chapters: ['雪线之外', '药市闭门', '一壶假药酒', '难民长桌', '会说话的木梁', '烽燧无火', '机关师的旧债', '风雪后的价签'],
  },
  {
    id: 'season-4', title: '万灯归途', region: '三路交汇', startChapter: 25,
    mystery: '商盟旧案、母亲遗账与三地客栈的共同选择。',
    chapters: ['三封急信', '商盟开席', '巡检归来', '旧仓城门', '账册密室', '总店无灯', '四海同桌', '万灯长明'],
  },
];

const dayBeats = [
  { id: 'hook', label: '事件引子', phase: 'morning' },
  { id: 'pressure', label: '经营压力', phase: 'noon' },
  { id: 'investigate', label: '空间调查', phase: 'evening' },
  { id: 'reversal', label: '认知反转', phase: 'noon' },
  { id: 'consequence', label: '跨日后果', phase: 'evening' },
  { id: 'prepare', label: '决战准备', phase: 'morning' },
  { id: 'finale', label: '章节结局', phase: 'noon' },
];

const chapters = [];
const days = [];
seasonDefinitions.forEach(function (season, seasonIndex) {
  season.chapters.forEach(function (title, chapterOffset) {
    const number = season.startChapter + chapterOffset;
    const chapter = {
      id: 'chapter-' + String(number).padStart(2, '0'),
      number: number,
      seasonId: season.id,
      title: title,
      region: season.region,
      startDay: (number - 1) * 7 + 1,
      endDay: number * 7,
      mystery: season.mystery,
      convergence: chapterOffset === 7,
    };
    chapters.push(chapter);
    dayBeats.forEach(function (beat, dayOffset) {
      days.push({
        id: chapter.id + '-day-' + (dayOffset + 1),
        gameDay: chapter.startDay + dayOffset,
        chapterId: chapter.id,
        seasonId: season.id,
        beat: beat.id,
        phase: beat.phase,
        title: title + '·' + beat.label,
        objective: '围绕“' + title + '”完成' + beat.label + '，并记录经营与人物选择。',
        requiredShift: true,
        freeAction: dayOffset !== 6,
        seed: 7301 + seasonIndex * 1000 + chapterOffset * 70 + dayOffset,
      });
    });
  });
});

const recruitment = {
  zhangdeng: { encounter: 1, cooperate: 1, trust: 1, quest: 1, recruit: 1, finale: 32 },
  wuchen: { encounter: 1, cooperate: 2, trust: 2, quest: 3, recruit: 3, finale: 29 },
  jingzhi: { encounter: 4, cooperate: 4, trust: 5, quest: 6, recruit: 6, finale: 30 },
  wenyan: { encounter: 2, cooperate: 4, trust: 6, quest: 7, recruit: 8, finale: 31 },
  shiwei: { encounter: 9, cooperate: 10, trust: 10, quest: 11, recruit: 11, finale: 30 },
  xiaoman: { encounter: 12, cooperate: 13, trust: 14, quest: 15, recruit: 15, finale: 31 },
  qiubai: { encounter: 17, cooperate: 18, trust: 18, quest: 19, recruit: 19, finale: 31 },
  tangyu: { encounter: 20, cooperate: 21, trust: 22, quest: 23, recruit: 23, finale: 30 },
  zhaochuan: { encounter: 24, cooperate: 25, trust: 26, quest: 27, recruit: 27, finale: 32 },
};

const eventCategories = ['guest', 'staff', 'dish', 'room', 'route', 'security', 'weather', 'mystery'];
const categoryNames = ['客人', '伙计', '菜品', '客房', '商路', '治安', '天气', '秘密来客'];
const operationEvents = [];
eventCategories.forEach(function (category, categoryIndex) {
  for (let index = 1; index <= 12; index += 1) {
    operationEvents.push({
      id: 'operation-' + category + '-' + index,
      category: category,
      title: categoryNames[categoryIndex] + '异闻·' + index,
      cooldownDays: 3,
      weight: index > 9 ? 2 : 5,
      choices: [
        { id: 'favor', label: '先顾人情', tendency: 'favor', effects: { reputation: 2, coin: -1 } },
        { id: 'rule', label: '照规矩办', tendency: 'rule', effects: { order: 2 } },
        { id: 'venture', label: '借机开拓', tendency: 'venture', effects: { coin: 3, risk: 1 } },
      ],
    });
  }
});

const explorationTypes = ['investigate', 'collect', 'repair', 'escort', 'mechanism', 'timed'];
const explorationEvents = [];
explorationTypes.forEach(function (type) {
  for (let index = 1; index <= 8; index += 1) {
    explorationEvents.push({
      id: 'explore-' + type + '-' + index,
      type: type,
      title: '商路线索·' + type + '·' + index,
      cooldownDays: 3,
      requiresMovement: true,
      reward: { coin: index % 3, ingredient: index % 2, flag: 'explore-' + type + '-' + index + '-done' },
    });
  }
});

const rareEvents = [];
eventCategories.forEach(function (category) {
  for (let stage = 1; stage <= 3; stage += 1) {
    rareEvents.push({
      id: 'rare-' + category + '-' + stage,
      category: category,
      stage: stage,
      previous: stage > 1 ? 'rare-' + category + '-' + (stage - 1) : null,
      title: '长线异闻·' + category + '·' + stage,
      cooldownDays: 7,
      persistent: true,
    });
  }
});

module.exports = {
  BRAND: BRAND,
  legacyRoleMap: legacyRoleMap,
  roles: roles,
  seasons: seasonDefinitions,
  chapters: chapters,
  days: days,
  dayBeats: dayBeats,
  recruitment: recruitment,
  operationEvents: operationEvents,
  explorationEvents: explorationEvents,
  rareEvents: rareEvents,
};
