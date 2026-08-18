/** 角色、菜品、剧情文案等静态数据定义 */

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  colors: {
    skin: string;
    hair: string;
    top: string;
    bottom: string;
    accent: string;
    feat?: import('@core/art').CharFeat;
  };
  intro: string;
}

/** 六位主角 + 常驻配角 */
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'tongxy',
    name: '佟湘玉',
    title: '掌柜的',
    colors: {
      skin: '#f2c9a0',
      hair: '#241a10',
      top: '#b03040',
      bottom: '#5a2030',
      accent: '#e8b53a',
      feat: { hairStyle: 'bun' },
    },
    intro: '龙门镖局千金，同福客栈掌柜。抠门又仗义，一句"额滴神啊"走天下。',
  },
  {
    id: 'baizt',
    name: '白展堂',
    title: '跑堂',
    colors: {
      skin: '#e8b98c',
      hair: '#2a2018',
      top: '#c8b090',
      bottom: '#3a3430',
      accent: '#7a5a30',
      feat: { hairStyle: 'ponytail' },
    },
    intro: '传说中的盗圣，如今甘当跑堂。一手葵花点穴手，天下无敌。',
  },
  {
    id: 'lvc',
    name: '吕秀才',
    title: '账房',
    colors: {
      skin: '#f0d0a8',
      hair: '#181410',
      top: '#7a9a6a',
      bottom: '#4a4a3a',
      accent: '#b8a050',
      feat: { hairStyle: 'scholar' },
    },
    intro: '前朝知府孙儿，熟读诗书。子曾经曰过：知识就是力量。',
  },
  {
    id: 'guofr',
    name: '郭芙蓉',
    title: '杂役',
    colors: {
      skin: '#f4cfa8',
      hair: '#3a2a1a',
      top: '#4a7ab0',
      bottom: '#2a3a5a',
      accent: '#d05050',
      feat: { hairStyle: 'doubleBun' },
    },
    intro: '名门之女，离家出走闯江湖。一记排山倒海，砸了同福客栈。',
  },
  {
    id: 'lidz',
    name: '李大嘴',
    title: '厨子',
    colors: { skin: '#eab88a', hair: '#20180f', top: '#d8d0c0', bottom: '#6a5a4a', accent: '#a05030' },
    intro: '客栈厨子，钱夫人侄子。做菜水平忽高忽低，吹牛水平稳定发挥。',
  },
  {
    id: 'moxb',
    name: '莫小贝',
    title: '掌门',
    colors: { skin: '#f6d8b2', hair: '#30241a', top: '#d06868', bottom: '#804040', accent: '#e8c060' },
    intro: '佟湘玉小姑子，衡山派掌门。糖葫芦十级学者。',
  },
  {
    id: 'xingbt',
    name: '邢捕头',
    title: '捕头',
    colors: { skin: '#d8a878', hair: '#28201a', top: '#4a5a6a', bottom: '#2e3844', accent: '#8898a8' },
    intro: '七侠镇捕头，好大喜功但心地不坏。我看好你哟。',
  },
  {
    id: 'moody',
    name: '神秘客',
    title: '？',
    colors: { skin: '#c8a888', hair: '#181818', top: '#383838', bottom: '#222222', accent: '#585858' },
    intro: '江湖匆匆过客，来同福客栈必有好戏。',
  },
];

export const CHAR_MAP: Record<string, CharacterDef> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);

/** 菜品：炖菜系（大嘴拿手） */
export interface DishDef {
  id: string;
  name: string;
  color: string;
  price: number;
  cookSec: number;
  unlockChapter: number;
}

export const DISHES: DishDef[] = [
  { id: 'peanut', name: '茴香豆', color: '#d8c060', price: 8, cookSec: 2.5, unlockChapter: 0 },
  { id: 'tofu', name: '麻辣豆腐', color: '#e8e0d0', price: 15, cookSec: 4, unlockChapter: 1 },
  { id: 'chicken', name: '叫花鸡', color: '#c87830', price: 36, cookSec: 7, unlockChapter: 4 },
  { id: 'fish', name: '西湖醋鱼', color: '#68a8b8', price: 52, cookSec: 9, unlockChapter: 8 },
  { id: 'shrimp', name: '油爆河虾', color: '#e06858', price: 68, cookSec: 11, unlockChapter: 14 },
  { id: 'duck', name: '北京烤鸭', color: '#b85028', price: 96, cookSec: 14, unlockChapter: 22 },
  { id: 'banquet', name: '满汉全席', color: '#e8a830', price: 288, cookSec: 20, unlockChapter: 32 },
];

export const DISH_MAP: Record<string, DishDef> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

/** 新掌故（轶事）解锁所需累计营收门槛：已听越多，门槛越高 */
export const STORY_GATE_MONEY = (heardCount: number): number => {
  if (heardCount <= 0) return 0;
  const base = heardCount <= 10 ? 60 : heardCount <= 30 ? 220 : heardCount <= 50 ? 600 : 1500;
  return Math.round(base * (1 + heardCount * 0.35));
};

/* ---------------- 四季 ---------------- */

export const SEASONS = ['春', '夏', '秋', '冬'] as const;
export type Season = (typeof SEASONS)[number];
/** 每季时长（秒） */
export const SEASON_SEC = 120;

/** 季节画面色调（multiply 叠加）与飘落粒子色 */
export const SEASON_FX: Record<Season, { tint: string; alpha: number; particles: string[] }> = {
  春: { tint: '#c8e8c0', alpha: 0.16, particles: ['#f5b8c8', '#f8d0d8', '#efc0d0'] },
  夏: { tint: '#a8dcb0', alpha: 0.18, particles: ['#a8e8a0', '#c8f0b8', '#e8f8d0'] },
  秋: { tint: '#e8cc9a', alpha: 0.2, particles: ['#e8a040', '#d88030', '#e8c060'] },
  冬: { tint: '#c8d4e4', alpha: 0.2, particles: ['#ffffff', '#e8f0f8', '#d8e4f0'] },
};

/** 换季提示文案 */
export const SEASON_TRANSITION: Record<Season, string> = {
  春: '冬去春来 · 燕子回廊',
  夏: '春去夏来 · 蝉鸣渐起',
  秋: '夏去秋来 · 桂香满巷',
  冬: '秋去冬来 · 瑞雪临门',
};
