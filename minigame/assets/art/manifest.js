const FRAME_SIZE = { width: 192, height: 256 };
const sceneV23 = require('./scene-v23');
const scenePopulation = require('../../data/scene-population');
const npcPopulationV26 = require('../../data/npc-population-v26');
const PIVOT = { x: 96, y: 244 };
const CLIPS = {
  idle: [0, 1, 2, 3],
  walk: [4, 5, 6, 7, 8, 9, 10, 11],
  interact: [12, 13, 14, 15],
  hit: [16, 17, 18],
};
const FPS = { idle: 6, walk: 12, interact: 10, hit: 12 };

function roleArt(extras) {
  return Object.assign({
    atlasColumns: 8,
    frameSize: FRAME_SIZE,
    pivot: PIVOT,
    clips: CLIPS,
    fps: FPS,
    displayScale: 1.08,
    shadowScale: 0.92,
    shadowAlpha: 0.13,
  }, extras || {});
}

function mapArt(id, width, props, packageName) {
  const base = packageName ? `@${packageName}/maps/${id}/` : `maps/${id}/`;
  return {
    characterScale: id === 'inn' ? 1.04 : 1,
    layers: [{
      id: 'background',
      src: id === 'inn' ? 'maps/inn/far-v9.jpg' : base + 'far.jpg',
      parallax: 1,
      worldWidth: width,
      worldHeight: 348,
      y: 0,
      order: 0,
    }],
    props: props || [],
  };
}

function bottomAlignedMapArt(id, width, height, packageName, y, props) {
  const art = mapArt(id, width, props || null, packageName);
  art.layers[0].worldHeight = height;
  art.layers[0].y = typeof y === 'number' ? y : 348 - height;
  return art;
}

function prop(src, x, y, sortY, extras) {
  return Object.assign({ src, x, y, sortY, parallax: 1 }, extras || {});
}

function directional(side, front, back) {
  return { side, front: front || side, back: back || side };
}

const manifest = {
  root: 'assets/art/',
  ui: {
    presentation: {
      dialogue: 'ui/presentation/dialogue-frame-v29.webp',
      portrait: 'ui/presentation/portrait-frame-v29.webp',
      prompt: 'ui/presentation/prompt-frame-v29.webp',
    },
    resources: {
      coin: 'ui/hud-coin.png',
      ingredient: 'ui/hud-food.png',
      reputation: 'ui/hud-reputation.png',
      order: 'ui/hud-order.png',
    },
    battle: {
      wheel: 'ui/battle/wheel-v16.webp',
      ledger: 'ui/battle/victory-ledger-v16.webp',
      iconAtlas: 'ui/battle/action-icons-v16.webp',
      iconFrameSize: { width: 96, height: 96 },
      iconColumns: 5,
      commonIcons: { attack: 0, defend: 1 },
    },
  },
  maps: {
    inn: mapArt('inn', 1000, [
      prop('maps/inn/occluder_left_table.png', 0, 273, 326, { obstacleId: 'left-table' }),
      prop('maps/inn/occluder_right_table.png', 681, 316, 340, { obstacleId: 'right-table' }),
    ]),
    yard: mapArt('yard', 900, [
      prop('maps/yard/occluder_training_dummy.png', 766, 202, 330, { obstacleId: 'training-posts' }),
    ]),
    street: mapArt('street', 1200, [
      prop('maps/street/occluder_right_shopfront.png', 1076, 117, 346, { obstacleId: 'right-shopfront' }),
    ]),
    locust_lane: mapArt('locust_lane', 1000, [
      prop('maps/locust_lane/occluder_right_wall.png', 904, 54, 346, { obstacleId: 'right-wall' }),
    ]),
    tea_shed: mapArt('tea_shed', 950),
    east_gate: mapArt('east_gate', 950, [
      prop('maps/east_gate/occluder_left_guard_table.png', 60, 225, 329, { obstacleId: 'guard-table' }),
    ]),
    stone_bridge: mapArt('stone_bridge', 1050, [
      prop('maps/stone_bridge/supply-cart.png', 890, 318, 318, {
        scale: 0.55,
        pivot: { x: 160, y: 207 },
        obstacleId: 'supply-cart',
      }),
    ]),
    paper_mill: mapArt('paper_mill', 1180, null, 'ch34'),
    paper_alley: mapArt('paper_alley', 1060, null, 'ch34'),
    old_post: mapArt('old_post', 1260, null, 'ch34'),
    north_road: mapArt('north_road', 1320, null, 'ch34'),
    guild_warehouse: mapArt('guild_warehouse', 1180, null, 'ch34'),
    river_yard: mapArt('river_yard', 1360, null, 'ch34'),
    grain_market: mapArt('grain_market', 1280, null, 'ch56'),
    guild_office: mapArt('guild_office', 1160, null, 'ch56'),
    charity_granary: mapArt('charity_granary', 1300, null, 'ch56'),
    canal_checkpoint: mapArt('canal_checkpoint', 1380, [
      prop('@ch56/props/chain-barrier.png', 730, 270, 270, {
        scale: 0.42,
        pivot: { x: 260, y: 202 },
        requires: ['c06-route-proven'],
        unless: ['c06-barrier-open'],
        obstacleId: 'chain-barrier',
      }),
      prop('@ch56/props/relief-cart.png', 930, 308, 308, {
        scale: 0.48,
        pivot: { x: 160, y: 207 },
        requires: ['c06-started'],
        obstacleId: 'relief-cart',
      }),
    ], 'ch56'),
    money_house: mapArt('money_house', 1260, null, 'ch78'),
    scale_contract_lane: mapArt('scale_contract_lane', 1380, null, 'ch78'),
    merchant_alliance_hall: mapArt('merchant_alliance_hall', 1420, null, 'ch78'),
    old_ledger_vault: mapArt('old_ledger_vault', 1500, null, 'ch78'),
    jiangnan_branch: bottomAlignedMapArt('jiangnan_branch', 1000, 444, 's2ch910'),
    jiangnan_dock: bottomAlignedMapArt('jiangnan_dock', 1320, 660, 's2ch910', -210),
    river_market: bottomAlignedMapArt('river_market', 1280, 607, 's2ch910'),
    rain_ferry: bottomAlignedMapArt('rain_ferry', 1440, 631, 's2ch910', -145),
    jiangnan_spice_workshop: Object.assign(bottomAlignedMapArt('jiangnan_spice_workshop', 1260, 560, 's2ch11', null, [
      prop('@s2ch11/props/problem-spice-sack.png', 1010, 292, 292, {
        scale: 0.42,
        pivot: { x: 110, y: 210 },
        requires: ['c11-market-traced'],
        unless: ['c11-workshop-proof'],
      }),
    ]), { characterScale: 1.08 }),
    old_banquet_kitchen: Object.assign(bottomAlignedMapArt('old_banquet_kitchen', 1320, 560, 's2ch11', null, [
      prop('@s2ch11/props/charred-recipe.png', 1040, 292, 292, {
        scale: 0.42,
        pivot: { x: 110, y: 210 },
        requires: ['c11-workshop-proof'],
        unless: ['c11-shiwei-quest'],
      }),
    ]), { characterScale: 1.08 }),
  },
  characters: {
    zhangdeng: roleArt({
      portrait: 'characters/xiangyu/portrait-v9.webp',
      dialogue: {
        bust: 'characters/xiangyu/portrait-v9.webp',
        atlas: 'characters/xiangyu/dialogue-sheet-v20.webp',
        frameSize: { width: 418, height: 418 },
        columns: 3,
        bustFrame: 0,
        expressionFrames: {
          neutral: 0,
          happy: 1,
          relieved: 1,
          questioning: 2,
          focused: 2,
          tense: 3,
          angry: 4,
          sad: 5,
          thoughtful: 7,
        },
        poseFrames: { idle: 0, explain: 6, think: 7, emotion: 8 },
        expressions: {},
        poses: {},
      },
      battle: 'characters/xiangyu/battle-v19.webp',
      battlePortrait: 'characters/xiangyu/battle-v19.webp',
      skillCutIn: 'characters/xiangyu/battle-v19.webp',
      skillIcons: [2, 3, 4],
      atlases: directional(
        'characters/xiangyu/explore-v3.png',
        'characters/xiangyu/explore-front-v4.png',
        'characters/xiangyu/explore-back-v4.png'
      ),
    }),
    wuchen: roleArt({
      portrait: 'characters/zhantang/portrait-v9.webp',
      dialogue: {
        bust: 'characters/zhantang/portrait-v9.webp',
        atlas: '@ch34/characters/zhantang/dialogue-sheet-v20.webp',
        frameSize: { width: 418, height: 418 },
        columns: 3,
        bustFrame: 0,
        expressionFrames: {
          neutral: 0,
          happy: 1,
          relieved: 1,
          questioning: 2,
          focused: 2,
          tense: 3,
          angry: 4,
          sad: 5,
          thoughtful: 7,
        },
        poseFrames: { idle: 0, explain: 6, think: 7, emotion: 8 },
        expressions: {},
        poses: {},
      },
      battlePortrait: 'characters/zhantang/battle.webp',
      skillCutIn: 'characters/zhantang/battle.webp',
      skillIcons: [5, 6, 7],
      atlases: directional(
        'characters/zhantang/explore-v3.png',
        'characters/zhantang/explore-front-v4.png',
        'characters/zhantang/explore-back-v4.png'
      ),
      battle: 'characters/zhantang/battle.webp',
    }),
    jingzhi: roleArt({
      portrait: 'characters/furong/portrait.webp',
      dialogue: {
        bust: 'characters/furong/portrait.webp',
        atlas: '@ch34/characters/furong/dialogue-sheet-v20.webp',
        frameSize: { width: 512, height: 341 },
        columns: 3,
        bustFrame: 0,
        expressionFrames: {
          neutral: 0,
          happy: 1,
          relieved: 1,
          questioning: 2,
          focused: 2,
          tense: 3,
          angry: 4,
          sad: 5,
          thoughtful: 7,
        },
        poseFrames: { idle: 0, explain: 6, think: 7, emotion: 8 },
        expressions: {},
        poses: {},
      },
      battlePortrait: 'characters/furong/battle.webp',
      skillCutIn: 'characters/furong/battle.webp',
      skillIcons: [8, 9, 10],
      atlases: directional(
        'characters/furong/explore-v3.png',
        'characters/furong/explore-front-v4.png',
        'characters/furong/explore-back-v4.png'
      ),
      battle: 'characters/furong/battle.webp',
    }),
    wenyan: roleArt({
      portrait: 'characters/xiucai/portrait.webp',
      dialogue: {
        bust: 'characters/xiucai/portrait.webp',
        atlas: '@ch34/characters/xiucai/dialogue-sheet-v20.webp',
        frameSize: { width: 418, height: 418 },
        columns: 3,
        bustFrame: 0,
        expressionFrames: {
          neutral: 0,
          happy: 1,
          relieved: 1,
          questioning: 2,
          focused: 2,
          tense: 3,
          angry: 4,
          sad: 5,
          thoughtful: 7,
        },
        poseFrames: { idle: 0, explain: 6, think: 7, emotion: 8 },
        expressions: {},
        poses: {},
      },
      battlePortrait: 'characters/xiucai/battle.webp',
      skillCutIn: 'characters/xiucai/battle.webp',
      skillIcons: [11, 12, 13],
      atlases: directional(
        'characters/xiucai/explore-v3.png',
        'characters/xiucai/explore-front-v4.png',
        'characters/xiucai/explore-back-v4.png'
      ),
      battle: 'characters/xiucai/battle.webp',
    }),
    shiwei: roleArt({
      portrait: '@s2ch910/characters/shiwei/portrait.webp',
      dialogue: {
        bust: '@s2ch910/characters/shiwei/portrait.webp',
        atlas: '@s2ch910/characters/shiwei/dialogue-sheet-v20.webp',
        frameSize: { width: 418, height: 418 },
        columns: 3,
        bustFrame: 0,
        expressionFrames: {
          neutral: 0,
          happy: 1,
          relieved: 1,
          questioning: 2,
          focused: 2,
          tense: 3,
          angry: 4,
          sad: 5,
          thoughtful: 7,
        },
        poseFrames: { idle: 0, explain: 6, think: 7, emotion: 8 },
        expressions: {},
        poses: {},
      },
      battlePortrait: '@s2ch910/characters/shiwei/battle.webp',
      skillCutIn: '@s2ch910/characters/shiwei/battle.webp',
      skillIcons: [14, 15, 16],
      atlases: directional(
        '@s2ch910/characters/shiwei/explore-side.png',
        '@s2ch910/characters/shiwei/explore-front.png',
        '@s2ch910/characters/shiwei/explore-back.png'
      ),
      battle: '@s2ch910/characters/shiwei/battle.webp',
      chapterActions: '@s2ch11/characters/shiwei/chapter11-actions.png',
      displayScale: 1.12,
      shadowScale: 1.04,
    }),
  },
  npcs: {
    tea_owner: { sprite: 'npcs/tea_owner.png', displayScale: 1.06, shadowScale: 0.96, shadowAlpha: 0.12 },
    merchant: { sprite: 'npcs/merchant.png', displayScale: 1.04, shadowScale: 0.92, shadowAlpha: 0.12 },
    guard: { sprite: 'npcs/guard.png', displayScale: 1.07, shadowScale: 0.94, shadowAlpha: 0.12 },
    townsman_old: { sprite: 'npcs/townsman_old.png', displayScale: 1.03, shadowScale: 0.94, shadowAlpha: 0.11 },
    townswoman_young: { sprite: 'npcs/townswoman_young.png', displayScale: 1.03, shadowScale: 0.90, shadowAlpha: 0.11 },
    ruffian_heavy: { sprite: 'npcs/ruffian_heavy.png', displayScale: 1.10, shadowScale: 1.08, shadowAlpha: 0.15 },
    ruffian_fast: { sprite: 'npcs/ruffian_fast.png', displayScale: 1.06, shadowScale: 0.96, shadowAlpha: 0.13 },
  },
};

sceneV23.apply(manifest.maps);
scenePopulation.applyArt(manifest.maps);
npcPopulationV26.applyArt(manifest.npcs, manifest.maps);

module.exports = manifest;
