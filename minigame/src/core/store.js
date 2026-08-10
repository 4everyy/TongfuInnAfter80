const { roles, maps, chapter, campaign } = require('../../data/content');
const management = require('../inn/inn');
const chapter001 = require('../../data/chapter001');
const doorwayCrisis = require('../../data/doorway-crisis');
const worldTime = require('./time');
const caseFiles = require('./case-files');
const branchSystem = require('../inn/branches');
const transport = require('./transport');
const cookingTrials = require('../inn/cooking-trials');
const innScene = require('../inn/scene-interactions');
const commerce = require('../world/commerce');

const VERSION = 10;
const KEY = 'dengxia-rpg-save-v10';
const RECOVERY_KEY = 'dengxia-rpg-recovery-v10';
const LEGACY_KEYS = ['dengxia-rpg-save-v9', 'tongfu-rpg-save-v8', 'tongfu-rpg-save-v7', 'tongfu-rpg-save-v6', 'tongfu-rpg-save-v5', 'tongfu-rpg-save-v4', 'tongfu-rpg-save-v3'];
const LEGACY_MAP_WIDTHS = {
  inn: 1800,
  yard: 1500,
  street: 2200,
  locust_lane: 1600,
  tea_shed: 1600,
  east_gate: 1700,
  stone_bridge: 1900,
};

function mapById(id) {
  return maps.find((item) => item.id === id) || maps[0];
}

function spawnFor(mapId, spawnId) {
  const current = mapById(mapId);
  return current.spawns[spawnId] || current.spawns.main;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current];
    const b = polygon[previous];
    const crosses = ((a[1] > point.y) !== (b[1] > point.y))
      && point.x < ((b[0] - a[0]) * (point.y - a[1])) / ((b[1] - a[1]) || 0.0001) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function safePosition(mapId, candidate, fallback) {
  const current = mapById(mapId);
  const position = {
    x: Math.max(18, Math.min(current.width - 18, candidate.x)),
    y: Math.max(18, Math.min(current.height - 18, candidate.y)),
  };
  const onFloor = current.walkable.some((polygon) => pointInPolygon(position, polygon));
  const blocked = current.obstacles.some((obstacle) => pointInPolygon(position, obstacle.polygon));
  return onFloor && !blocked ? position : { x: fallback.x, y: fallback.y };
}

function freshCharacters() {
  const characters = {};
  roles.forEach((role) => {
    characters[role.id] = {
      level: 1,
      xp: 0,
      hp: role.stats[0],
      qi: role.stats[1],
      recruited: role.id === 'zhangdeng',
      inParty: role.id === 'zhangdeng',
      recruitmentStage: role.id === 'zhangdeng' ? 'recruited' : 'locked',
      temporary: false,
      affinity: 0,
      energy: 82,
      mood: 65,
      innUnlocked: role.id === 'zhangdeng',
      jobXp: {},
      episodeStep: 0,
      equipment: { weapon: null, accessory: null },
    };
  });
  return characters;
}

function freshState() {
  const spawn = spawnFor('inn', 'main');
  const state = {
    version: VERSION,
    screen: 'title',
    mode: 'manage',
    mapId: 'inn',
    spawnId: 'main',
    position: { x: spawn.x, y: spawn.y },
    velocity: { x: 0, y: 0 },
    facing: spawn.facing || 'right',
    moving: false,
    protagonist: 'zhangdeng',
    activeId: 'zhangdeng',
    party: ['zhangdeng'],
    followers: {},
    trail: [],
    exitRearmMapId: null,
    characters: freshCharacters(),
    flags: {},
    inventory: {
      coin: 60,
      ingredient: 10,
      medicine: 2,
      trophies: {},
      stock: { staple: 4, vegetable: 3, meat: 2, tea: 1 },
    },
    calendar: { day: 1, phase: 'morning', actionsUsed: 0, actionLimit: 2, seed: 7103 },
    worldTime: { day: 1, phase: 'morning', lastAdvanceReason: 'new-game', advances: 0 },
    explorationContext: { source: 'title', purpose: 'free', returnMapId: 'inn', advancesTimeOnReturn: true },
    explorationEvents: {},
    visitedMaps: { inn: true },
    unlockedMaps: {
      inn: true,
      yard: true,
      street: true,
      locust_lane: true,
      tea_shed: true,
      east_gate: true,
    },
    campaign: { season: 1, chapter: 1, chapterDay: 1, gameDay: 1, step: 'prologue', tendencies: { favor: 0, rule: 0, venture: 0 }, completed: [], seasonRatings: {} },
    relationships: {},
    randomEvents: { seed: 7301, recent: [], currentId: null, chains: {}, resolved: [] },
    market: { multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 }, history: [], pressure: 0, normalized: false },
    caseFiles: { evidence: {}, conclusions: {}, contradictions: [], published: [], score: 0 },
    activeBranchId: 'changfeng',
    branches: {
      changfeng: { id: 'changfeng', name: '长风客栈', region: '关中商路', unlocked: true, level: 1 },
      jiangnan: { id: 'jiangnan', name: '水巷分店', region: '江南水路', unlocked: false, level: 0 },
      frontier: { id: 'frontier', name: '北境驿站', region: '北境驿路', unlocked: false, level: 0 },
    },
    mapVariants: { weather: 'clear', phase: 'morning', states: {} },
    regionalMarkets: {
      guanzhong: { multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 }, history: [], pressure: 0, normalized: false },
      jiangnan: { multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 }, history: [], pressure: 0, normalized: false },
      frontier: { multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 }, history: [], pressure: 0, normalized: false },
    },
    transport: { nextId: 1, orders: [], routeCondition: 'clear' },
    recipeResearch: { samples: {}, hypotheses: {}, fragments: [], results: {}, unlockedRecipes: [] },
    coreLoopV28: { version: 28, appliedOpeningDay: 0, customers: {}, dishMastery: {}, dailyMetrics: {}, consequences: [], explorationRewards: [], milestones: {}, purchaseDiscount: 0, lastFeedback: '' },
    commerce: { owned: {}, dailyPurchases: {}, lastShopId: null, totalSpent: 0 },
    cookingTrial: null,
    legacyArchive: null,
    inn: { day: 1, reputation: 3, order: 68, risk: 2, rooms: 1, menu: ['noodles'], upgrades: [], guests: 0 },
    chapterId: chapter.id,
    quest: { title: chapter.title, text: chapter.steps[0].text, stepId: chapter.steps[0].id },
    modal: null,
    dialogue: null,
    battle: null,
    managementEvent: null,
    managementPage: 'today',
    managementView: 'scene',
    managementRoleId: 'zhangdeng',
    managementSeenObjects: [],
    innScene: {
      selectedObjectId: null,
      activePage: null,
      microGame: null,
      serviceOpen: false,
      seenObjects: [],
      mastery: { purchase: 0, prepare: 0, clean: 0, promote: 0, ledger: 0 },
      guestFocus: 'regular',
      lastObjectId: null,
    },
    chapter001: chapter001.freshChapter(),
    doorwayCrisis: doorwayCrisis.fresh(),
    toast: '《灯下江湖》序章：风从门前起。',
  };
  maps.forEach((sourceMap) => { state.unlockedMaps[sourceMap.id] = true; });
  management.ensure(state);
  chapter001.ensure(state);
  doorwayCrisis.ensure(state);
  worldTime.ensure(state);
  caseFiles.ensure(state);
  branchSystem.ensure(state, true);
  transport.ensure(state);
  cookingTrials.ensure(state);
  innScene.ensure(state);
  commerce.ensure(state);
  return state;
}

function copyCharacterState(target, source) {
  Object.keys(target).forEach((id) => {
    if (source && source[id]) target[id] = Object.assign(target[id], source[id]);
  });
  return target;
}

function normalize(saved) {
  if (typeof saved === 'string') saved = JSON.parse(saved);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('存档根节点格式无效');
  const base = freshState();
  const next = Object.assign(base, saved || {});
  const migratingLegacy = !saved.version || saved.version < 9;
  const migratingV9 = Number(saved.version) === 9;
  next.version = VERSION;
  next.mapId = mapById(next.mapId).id;
  next.characters = migratingLegacy ? freshCharacters() : copyCharacterState(freshCharacters(), saved && saved.characters);
  next.flags = migratingLegacy ? {} : Object.assign({}, saved.flags && typeof saved.flags === 'object' ? saved.flags : {});
  next.inventory = Object.assign({}, base.inventory, saved && saved.inventory);
  next.inventory.stock = Object.assign({}, base.inventory.stock, saved.inventory && saved.inventory.stock);
  next.inventory.trophies = Object.assign({}, base.inventory.trophies, saved.inventory && saved.inventory.trophies);
  if (saved && saved.version < VERSION && saved.inventory && !saved.inventory.stock) {
    next.inventory.stock = {
      staple: Math.max(0, Number(saved.inventory.ingredient) || 0),
      vegetable: 0,
      meat: 0,
      tea: 0,
    };
  }
  next.inn = Object.assign({}, base.inn, saved && saved.inn);
  next.calendar = Object.assign({}, base.calendar, saved && saved.calendar);
  next.worldTime = Object.assign({}, base.worldTime, saved && saved.worldTime);
  next.explorationContext = Object.assign({}, base.explorationContext, saved && saved.explorationContext);
  next.explorationEvents = Object.assign({}, saved && saved.explorationEvents);
  next.visitedMaps = Object.assign({}, base.visitedMaps, saved && saved.visitedMaps);
  next.unlockedMaps = Object.assign({}, base.unlockedMaps, saved && saved.unlockedMaps);
  next.campaign = Object.assign({}, base.campaign, migratingLegacy ? null : saved && saved.campaign);
  next.campaign.tendencies = Object.assign({}, base.campaign.tendencies, next.campaign.tendencies);
  next.campaign.completed = Array.isArray(next.campaign.completed) ? next.campaign.completed : [];
  next.campaign.seasonRatings = Object.assign({}, next.campaign.seasonRatings || {});
  next.relationships = Object.assign({}, migratingLegacy ? null : saved && saved.relationships);
  next.randomEvents = Object.assign({}, base.randomEvents, migratingLegacy ? null : saved && saved.randomEvents);
  next.randomEvents.recent = Array.isArray(next.randomEvents.recent) ? next.randomEvents.recent : [];
  next.randomEvents.resolved = Array.isArray(next.randomEvents.resolved) ? next.randomEvents.resolved : [];
  next.randomEvents.chains = Object.assign({}, next.randomEvents.chains);
  next.market = Object.assign({}, base.market, saved && saved.market);
  next.market.multipliers = Object.assign({}, base.market.multipliers, next.market.multipliers || {});
  next.market.history = Array.isArray(next.market.history) ? next.market.history : [];
  next.caseFiles = Object.assign({}, base.caseFiles, saved && saved.caseFiles);
  next.caseFiles.evidence = Object.assign({}, next.caseFiles.evidence || {});
  next.caseFiles.conclusions = Object.assign({}, next.caseFiles.conclusions || {});
  next.caseFiles.contradictions = Array.isArray(next.caseFiles.contradictions) ? next.caseFiles.contradictions : [];
  next.caseFiles.published = Array.isArray(next.caseFiles.published) ? next.caseFiles.published : [];
  next.branches = Object.assign({}, base.branches, saved && saved.branches);
  Object.keys(base.branches).forEach((id) => { next.branches[id] = Object.assign({}, base.branches[id], next.branches[id]); });
  next.mapVariants = Object.assign({}, base.mapVariants, saved && saved.mapVariants);
  next.mapVariants.states = Object.assign({}, next.mapVariants.states);
  next.activeBranchId = saved && saved.activeBranchId || 'changfeng';
  next.regionalMarkets = Object.assign({}, base.regionalMarkets, saved && saved.regionalMarkets);
  next.transport = Object.assign({}, base.transport, saved && saved.transport);
  next.recipeResearch = Object.assign({}, base.recipeResearch, saved && saved.recipeResearch);
  next.coreLoopV28 = Object.assign({}, base.coreLoopV28, saved && saved.coreLoopV28);
  next.coreLoopV28.customers = Object.assign({}, next.coreLoopV28.customers || {});
  next.coreLoopV28.dishMastery = Object.assign({}, next.coreLoopV28.dishMastery || {});
  next.coreLoopV28.dailyMetrics = Object.assign({}, next.coreLoopV28.dailyMetrics || {});
  next.coreLoopV28.consequences = Array.isArray(next.coreLoopV28.consequences) ? next.coreLoopV28.consequences : [];
  next.coreLoopV28.explorationRewards = Array.isArray(next.coreLoopV28.explorationRewards) ? next.coreLoopV28.explorationRewards : [];
  next.coreLoopV28.milestones = Object.assign({}, next.coreLoopV28.milestones || {});
  next.commerce = Object.assign({}, base.commerce, saved && saved.commerce);
  next.commerce.owned = Object.assign({}, base.commerce.owned, next.commerce.owned || {});
  next.commerce.dailyPurchases = Object.assign({}, base.commerce.dailyPurchases, next.commerce.dailyPurchases || {});
  next.cookingTrial = saved && saved.cookingTrial && typeof saved.cookingTrial === 'object'
    ? Object.assign({}, saved.cookingTrial)
    : null;
  next.legacyArchive = migratingLegacy ? {
    sourceVersion: Number(saved.version) || 3,
    capturedAt: Date.now(),
    flags: Object.assign({}, saved.flags || {}),
    party: Array.isArray(saved.party) ? saved.party.slice() : [],
    chapterId: saved.chapterId || null,
    mapId: saved.mapId || 'inn',
  } : saved.legacyArchive || null;
  if (saved && !saved.calendar) {
    next.calendar.day = Math.max(1, Number(next.inn.day) || 1);
    next.calendar.phase = 'morning';
    next.calendar.actionsUsed = 0;
  }

  const fallbackSpawn = spawnFor(next.mapId, next.spawnId || 'main');
  const oldX = saved && Number.isFinite(saved.x) ? saved.x : fallbackSpawn.x;
  const oldY = saved && saved.position && Number.isFinite(saved.position.y) ? saved.position.y : fallbackSpawn.y;
  let migratedX = saved && saved.position && Number.isFinite(saved.position.x) ? saved.position.x : oldX;
  if (saved && saved.version < 4 && LEGACY_MAP_WIDTHS[next.mapId]) {
    migratedX *= mapById(next.mapId).width / LEGACY_MAP_WIDTHS[next.mapId];
  }
  next.position = safePosition(next.mapId, { x: migratedX, y: oldY }, fallbackSpawn);
  next.visitedMaps[next.mapId] = true;
  maps.forEach((sourceMap) => { next.unlockedMaps[sourceMap.id] = true; });
  next.velocity = { x: 0, y: 0 };
  next.facing = typeof next.facing === 'string' ? next.facing : next.facing < 0 ? 'left' : 'right';
  next.party = (migratingLegacy ? base.party : Array.isArray(saved.party) ? saved.party : base.party)
    .filter((id, index, list) => roles.some((role) => role.id === id) && list.indexOf(id) === index)
    .slice(0, 3);
  next.protagonist = 'zhangdeng';
  next.activeId = 'zhangdeng';
  if (next.party.indexOf('zhangdeng') < 0) next.party.unshift('zhangdeng');
  next.party = next.party.filter((id, index, list) => list.indexOf(id) === index).slice(0, 3);
  if (!next.party.length) next.party = base.party.slice();
  next.party.forEach((id) => { next.characters[id].recruited = true; });
  next.characters.zhangdeng.recruited = true;
  Object.keys(next.characters).forEach((id) => {
    next.characters[id].inParty = next.party.indexOf(id) >= 0;
  });
  next.followers = {};
  next.trail = [];
  next.moving = false;
  next.modal = null;
  next.dialogue = null;
  next.battle = null;
  next.managementEvent = saved && saved.managementEvent || null;
  delete next.x;
  management.ensure(next);
  innScene.ensure(next);
  chapter001.ensure(next);
  doorwayCrisis.ensure(next);
  worldTime.ensure(next);
  caseFiles.ensure(next);
  branchSystem.ensure(next, migratingV9 || migratingLegacy);
  if (!migratingV9 && !migratingLegacy) {
    next.inn = Object.assign({}, base.inn, saved && saved.inn);
    next.inventory.stock = Object.assign({}, base.inventory.stock, saved.inventory && saved.inventory.stock);
    next.market = Object.assign({}, base.market, saved && saved.market);
    next.market.multipliers = Object.assign({}, base.market.multipliers, next.market.multipliers || {});
    next.market.history = Array.isArray(next.market.history) ? next.market.history : [];
    branchSystem.capture(next);
  }
  management.ensure(next);
  transport.ensure(next);
  cookingTrials.ensure(next);
  commerce.ensure(next);
  if (next.cookingTrial && !next.cookingTrial.completed) next.modal = { type: 'cookingTrial' };
  next.mapVariants.phase = next.worldTime.phase;
  return next;
}

function readStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (error) {
    return null;
  }
}

function load() {
  const keys = [KEY].concat(LEGACY_KEYS);
  for (let index = 0; index < keys.length; index += 1) {
    const value = readStorage(keys[index]);
    if (!value) continue;
    try {
      return normalize(value);
    } catch (error) {
      try {
        wx.setStorageSync(RECOVERY_KEY, {
          sourceKey: keys[index],
          capturedAt: Date.now(),
          message: error && error.message || String(error),
          value: value,
        });
      } catch (backupError) {}
      if (typeof console !== 'undefined' && console.error) console.error('Tongfu save recovery:', error);
      const recovered = freshState();
      recovered.toast = '检测到异常存档，已安全恢复新进度。';
      recovered.recovery = { sourceKey: keys[index], message: error && error.message || String(error) };
      return recovered;
    }
  }
  return freshState();
}

function save(state) {
  try {
    branchSystem.capture(state);
    const value = Object.assign({}, state, {
      version: VERSION,
      modal: null,
      dialogue: null,
      battle: null,
      followers: {},
      trail: [],
      velocity: { x: 0, y: 0 },
      moving: false,
    });
    wx.setStorageSync(KEY, value);
    return true;
  } catch (error) {
    if (typeof console !== 'undefined' && console.error) console.error('Tongfu save failure:', error);
    return false;
  }
}

function clear() {
  [KEY].concat(LEGACY_KEYS).forEach((key) => {
    try { wx.removeStorageSync(key); } catch (error) {}
  });
}

module.exports = { VERSION, KEY, RECOVERY_KEY, freshState, normalize, load, save, clear };
