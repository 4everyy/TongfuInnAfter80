var data = require('../../data/management');
var deep34 = require('../../data/season1-deep');
var deep56 = require('../../data/season1-deep-56');
var deep78 = require('../../data/season1-deep-78');
var season2 = require('../../data/season2-ch910');
var deepContent = {
  chapters: Object.assign({}, deep34.chapters, deep56.chapters, deep78.chapters, season2.chapters),
  dayPlans: deep34.dayPlans.concat(deep56.dayPlans, deep78.dayPlans, season2.dayPlans),
  operationEvents: deep34.operationEvents.concat(deep56.operationEvents, deep78.operationEvents, season2.operationEvents),
  rareEvents: deep34.rareEvents.concat(deep56.rareEvents, deep78.rareEvents, season2.rareEvents),
};
var worldTime = require('../core/time');
var campaignSystem = require('../core/campaign');
var randomEvents = require('../core/random-events');
var caseFiles = require('../core/case-files');
var branchSystem = require('./branches');
var transport = require('../core/transport');

var PHASES = ['morning', 'noon', 'evening'];
var PHASE_ACTION_LIMIT = 2;
var FIRST_CHAPTER_ROLES = ['zhangdeng'];
var STOCK_KEYS = ['staple', 'vegetable', 'meat', 'tea'];

deepContent.operationEvents.forEach(function (event) {
  data.serviceEvents[event.id] = Object.assign({}, event, {
    text: '今日营业出现“' + event.title + '”。这件事会同时影响客栈生意与章节调查。',
  });
});
deepContent.rareEvents.forEach(function (event) {
  data.serviceEvents[event.id] = Object.assign({}, event, {
    text: '少见线索“' + event.title + '”在营业间隙出现，可能连接成一条跨日证据链。',
  });
});

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function copy(source) {
  var target = {};
  Object.keys(source || {}).forEach(function (key) { target[key] = source[key]; });
  return target;
}

function deepCopy(source) {
  return JSON.parse(JSON.stringify(source));
}

function find(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id) return list[index];
  }
  return null;
}

function roleStateDefaults(character, id) {
  character.energy = clamp(number(character.energy, 82), 0, 100);
  character.mood = clamp(number(character.mood, 65), 0, 100);
  character.innUnlocked = character.innUnlocked == null
    ? FIRST_CHAPTER_ROLES.indexOf(id) >= 0
    : !!character.innUnlocked;
  character.recruited = !!character.recruited;
  character.inParty = !!character.inParty;
  character.jobXp = copy(character.jobXp);
  character.episodeStep = Math.max(0, number(character.episodeStep, 0));
}

function defaultFacilities(upgrades) {
  var result = { hall: 1, kitchen: 1, rooms: 1, sign: 1, yard: 1 };
  (upgrades || []).forEach(function (id) {
    if (result[id]) result[id] = Math.max(result[id], 2);
  });
  return result;
}

function defaultRooms(count) {
  var result = [];
  var total = Math.max(1, number(count, 1));
  var index;
  for (index = 0; index < total; index += 1) {
    result.push({
      id: 'room-' + (index + 1),
      name: index === 0 ? '天字号' : '客房 ' + (index + 1),
      cleanliness: 78,
      comfort: 1,
      guestId: null,
      daysRemaining: 0,
      eventId: null,
    });
  }
  return result;
}

function defaultAssignments() {
  return {
    counter: 'zhangdeng',
    service: 'helper',
    kitchen: 'helper',
    ledger: 'helper',
    rooms: 'helper',
    patrol: 'helper',
  };
}

function defaultPrices(menu) {
  var prices = {};
  data.dishes.forEach(function (dish) { prices[dish.id] = dish.basePrice; });
  (menu || []).forEach(function (id) {
    var dish = find(data.dishes, id);
    if (dish && prices[id] == null) prices[id] = dish.basePrice;
  });
  return prices;
}

function defaultDailyPlan(state) {
  var existingMenu = state && state.inn && Array.isArray(state.inn.menu) ? state.inn.menu.slice(0, 3) : ['noodles'];
  if (!existingMenu.length) existingMenu = ['noodles'];
  return {
    day: state && state.calendar ? state.calendar.day : 1,
    menu: existingMenu,
    prices: defaultPrices(existingMenu),
    assignments: defaultAssignments(),
    prepActions: [],
    prepBonus: 0,
    guestBonus: 0,
    locked: false,
    undo: null,
  };
}

function defaultEpisodes() {
  return { completed: [], choices: {}, pendingId: null, progress: { zhangdeng: 0, wuchen: 0, jingzhi: 0, wenyan: 0 } };
}

function defaultSideQuests(flags) {
  var complete = !!(flags && flags['chapter-late-letter-complete']);
  var unlocked = complete || !!(flags && (flags['sidequest-late-letter-unlocked'] || flags['mission-accepted']));
  return {
    activeId: null,
    outingKey: null,
    outingSerial: 0,
    chargedKeys: [],
    entries: {
      'late-letter': {
        status: complete ? 'complete' : unlocked ? 'available' : 'locked',
        mapId: 'inn',
        spawnId: 'main',
        position: null,
      },
    },
  };
}

function syncIngredient(state) {
  var stock = state.inventory.stock;
  var total = 0;
  STOCK_KEYS.forEach(function (key) { total += Math.max(0, number(stock[key], 0)); });
  state.inventory.ingredient = total;
  return total;
}

function ensureStock(state) {
  var legacy = Math.max(0, number(state.inventory.ingredient, 0));
  var stock = state.inventory.stock || { staple: legacy, vegetable: 2, meat: 1, tea: 1 };
  STOCK_KEYS.forEach(function (key) { stock[key] = Math.max(0, number(stock[key], 0)); });
  state.inventory.stock = stock;
  syncIngredient(state);
}

function mergeRooms(saved, count) {
  var rooms = defaultRooms(count);
  if (!Array.isArray(saved)) return rooms;
  saved.forEach(function (room, index) {
    if (rooms[index]) rooms[index] = Object.assign(rooms[index], room);
    else rooms.push(Object.assign(defaultRooms(index + 1)[index], room));
  });
  return rooms;
}

function ensure(state) {
  var legacyRooms;
  if (!state.inventory) state.inventory = { coin: 60, ingredient: 6, medicine: 2 };
  if (!state.inn) state.inn = { day: 1, reputation: 3, rooms: 1, menu: ['noodles'], upgrades: [], guests: 0 };
  legacyRooms = Array.isArray(state.inn.rooms) ? state.inn.rooms.length : number(state.inn.rooms, 1);
  if (!state.calendar) {
    state.calendar = { day: Math.max(1, number(state.inn.day, 1)), phase: 'morning', actionsUsed: 0, actionLimit: PHASE_ACTION_LIMIT, seed: 7103 };
  }
  worldTime.ensure(state);
  caseFiles.ensure(state);
  state.calendar.day = Math.max(1, number(state.calendar.day, number(state.inn.day, 1)));
  if (PHASES.indexOf(state.calendar.phase) < 0) state.calendar.phase = 'morning';
  state.calendar.actionsUsed = clamp(number(state.calendar.actionsUsed, 0), 0, PHASE_ACTION_LIMIT);
  state.calendar.actionLimit = PHASE_ACTION_LIMIT;
  state.inn.day = state.calendar.day;
  state.inn.reputation = Math.max(0, number(state.inn.reputation, 3));
  state.inn.order = clamp(number(state.inn.order, 68), 0, 100);
  state.inn.risk = clamp(number(state.inn.risk, 2), 0, 20);
  state.inn.upgrades = Array.isArray(state.inn.upgrades) ? state.inn.upgrades : [];
  state.inn.facilities = Object.assign(defaultFacilities(state.inn.upgrades), state.inn.facilities || {});
  state.inn.roomState = mergeRooms(state.inn.roomState, legacyRooms);
  state.inn.rooms = state.inn.roomState.length;
  state.inn.history = Array.isArray(state.inn.history) ? state.inn.history : [];
  state.inn.unlockedRecipes = Array.isArray(state.inn.unlockedRecipes)
    ? state.inn.unlockedRecipes
    : ['noodles', 'fish', 'soup', 'cabbage', 'lion_head', 'tea_egg'];
  ensureStock(state);
  Object.keys(state.characters || {}).forEach(function (id) { roleStateDefaults(state.characters[id], id); });
  state.dailyPlan = state.dailyPlan && state.dailyPlan.day === state.calendar.day
    ? Object.assign(defaultDailyPlan(state), state.dailyPlan)
    : defaultDailyPlan(state);
  state.dailyPlan.prices = Object.assign(defaultPrices(state.dailyPlan.menu), state.dailyPlan.prices || {});
  state.dailyPlan.assignments = Object.assign(defaultAssignments(), state.dailyPlan.assignments || {});
  state.dailyPlan.prepActions = Array.isArray(state.dailyPlan.prepActions) ? state.dailyPlan.prepActions : [];
  state.service = state.service || { day: state.calendar.day, index: 0, wave: 0, queue: [], income: 0, satisfaction: 0, completed: false, miniGame: null, log: '' };
  state.episodes = Object.assign(defaultEpisodes(), state.episodes || {});
  state.episodes.completed = Array.isArray(state.episodes.completed) ? state.episodes.completed : [];
  state.episodes.choices = state.episodes.choices || {};
  state.episodes.progress = Object.assign(defaultEpisodes().progress, state.episodes.progress || {});
  state.sideQuests = Object.assign(defaultSideQuests(state.flags), state.sideQuests || {});
  state.sideQuests.entries = Object.assign(defaultSideQuests(state.flags).entries, state.sideQuests.entries || {});
  state.sideQuests.chargedKeys = Array.isArray(state.sideQuests.chargedKeys) ? state.sideQuests.chargedKeys : [];
  state.sideQuests.outingSerial = Math.max(0, number(state.sideQuests.outingSerial, 0));
  state.managementPage = state.managementPage || 'today';
  state.managementView = state.managementView || 'scene';
  state.managementRoleId = state.managementRoleId || 'zhangdeng';
  state.managementSeenObjects = Array.isArray(state.managementSeenObjects) ? state.managementSeenObjects : [];
  state.managementNavOpen = !!state.managementNavOpen;
  syncQuestStatus(state);
  syncPendingEpisode(state);
  return state;
}

function dayScript(state) {
  var day = Math.max(1, number(state.calendar && state.calendar.day, 1));
  var chapterNumber = state.campaign && state.campaign.chapter;
  var chapterDay = Math.max(1, Math.min(7, number(state.campaign && state.campaign.chapterDay, 1)));
  var deepPlan;
  var selected;
  var rare;
  var eventIds;
  var offset;
  var games;
  if (deepContent.chapters[chapterNumber]
    && state.flags['c' + String(chapterNumber).padStart(2, '0') + '-started']
    && !state.flags['c' + String(chapterNumber).padStart(2, '0') + '-complete']) {
    deepPlan = deepContent.dayPlans.filter(function (plan) { return plan.chapter === chapterNumber && plan.day === chapterDay; })[0];
    selected = randomEvents.select(state, deepContent.operationEvents, 2, chapterNumber);
    if (chapterDay % 2 === 0) {
      rare = randomEvents.select(state, deepContent.rareEvents, 1, chapterNumber, 'rare');
      if (rare.length) selected[1] = rare[0];
    }
    return {
      day: day,
      title: deepPlan ? deepPlan.title : '章节经营',
      objective: deepPlan ? deepPlan.objective : '完成今日经营，为下一段调查做好准备。',
      morningEpisode: null,
      eveningEpisode: null,
      serviceEvents: selected.length === 2 ? selected : ['d5-secret-visitor', 'd5-patrol-check'],
      miniGame: chapterDay % 3 === 0 ? 'rooms' : chapterDay % 2 === 0 ? 'ledger' : 'order',
      deepChapter: chapterNumber,
    };
  }
  if (day <= data.dayScripts.length) return data.dayScripts[day - 1];
  eventIds = Object.keys(data.serviceEvents);
  offset = ((day - data.dayScripts.length - 1) * 2) % eventIds.length;
  games = ['order', 'ledger', 'rooms'];
  return {
    day: day,
    title: '自由经营',
    objective: '按自己的节奏经营客栈，并从委托板选择外出故事。',
    morningEpisode: null,
    eveningEpisode: null,
    serviceEvents: [eventIds[offset], eventIds[(offset + 5) % eventIds.length]],
    miniGame: games[day % games.length],
    freeMode: true,
  };
}

function phaseLabel(phase) {
  return phase === 'morning' ? '早上' : phase === 'noon' ? '中午' : '晚上';
}

function totalStock(state) {
  ensureStock(state);
  return syncIngredient(state);
}

function changeStock(state, changes) {
  Object.keys(changes || {}).forEach(function (key) {
    state.inventory.stock[key] = Math.max(0, number(state.inventory.stock[key], 0) + number(changes[key], 0));
  });
  syncIngredient(state);
}

function canApply(state, effects) {
  var affordable = number(state.inventory.coin, 0) + number(effects && effects.coin, 0) >= 0;
  Object.keys(effects && effects.stock || {}).forEach(function (key) {
    if (number(state.inventory.stock[key], 0) + number(effects.stock[key], 0) < 0) affordable = false;
  });
  return affordable;
}

function applyRoleValues(state, values, key) {
  Object.keys(values || {}).forEach(function (id) {
    var character = state.characters[id];
    if (!character) return;
    character[key] = clamp(number(character[key], key === 'energy' ? 82 : 65) + number(values[id], 0), 0, 100);
  });
}

function applyEffects(state, effects, options) {
  var rooms;
  var room;
  var context = options || {};
  effects = effects || {};
  if (effects.coin) {
    if (context.deferCoin && state.service) state.service.income += effects.coin;
    else state.inventory.coin = Math.max(0, number(state.inventory.coin, 0) + effects.coin);
  }
  if (effects.stock) changeStock(state, effects.stock);
  if (effects.reputation) state.inn.reputation = Math.max(0, state.inn.reputation + effects.reputation);
  if (effects.order) state.inn.order = clamp(state.inn.order + effects.order, 0, 100);
  if (effects.risk) state.inn.risk = clamp(state.inn.risk + effects.risk, 0, 20);
  if (effects.satisfaction && state.service) state.service.satisfaction += effects.satisfaction;
  if (effects.prep) state.dailyPlan.prepBonus += effects.prep;
  if (effects.guestBonus) state.dailyPlan.guestBonus += effects.guestBonus;
  if (effects.roomCleanliness) {
    state.inn.roomState.forEach(function (item) { item.cleanliness = clamp(item.cleanliness + effects.roomCleanliness, 0, 100); });
  }
  if (effects.roomComfort) {
    state.inn.roomState.forEach(function (item) { item.comfort = clamp(item.comfort + effects.roomComfort, 1, 5); });
  }
  if (effects.roomBooking) {
    rooms = state.inn.roomState.filter(function (item) { return !item.guestId; });
    room = rooms[0] || state.inn.roomState[0];
    room.guestId = effects.roomBooking.guestId;
    room.daysRemaining = Math.max(1, effects.roomBooking.days || 1);
    room.eventId = effects.roomBooking.eventId || null;
  }
  applyRoleValues(state, effects.energy, 'energy');
  applyRoleValues(state, effects.mood, 'mood');
  Object.keys(effects.affinity || {}).forEach(function (id) {
    if (state.characters[id]) state.characters[id].affinity = number(state.characters[id].affinity, 0) + effects.affinity[id];
  });
  if (effects.moodAll) {
    Object.keys(state.characters).forEach(function (id) {
      if (state.characters[id].innUnlocked) state.characters[id].mood = clamp(state.characters[id].mood + effects.moodAll, 0, 100);
    });
  }
  (effects.flags || []).forEach(function (flag) { state.flags[flag] = true; });
  if (effects.recipe && state.inn.unlockedRecipes.indexOf(effects.recipe) < 0) state.inn.unlockedRecipes.push(effects.recipe);
  caseFiles.applyEffects(state, effects);
}

function syncQuestStatus(state) {
  var entry = state.sideQuests && state.sideQuests.entries && state.sideQuests.entries['late-letter'];
  if (!entry) return;
  if (state.flags['chapter-late-letter-complete']) entry.status = 'complete';
  else if (state.flags['mission-accepted']) entry.status = 'active';
  else if (state.flags['sidequest-late-letter-unlocked'] || state.calendar.day >= 2) entry.status = 'available';
}

function syncPendingEpisode(state) {
  var script;
  var id;
  if (!state.calendar || state.calendar.phase === 'noon') {
    if (state.episodes) state.episodes.pendingId = null;
    return null;
  }
  script = dayScript(state);
  id = state.calendar.phase === 'morning' ? script.morningEpisode : script.eveningEpisode;
  if (id && state.episodes.completed.indexOf(id) < 0) state.episodes.pendingId = id;
  else state.episodes.pendingId = null;
  return state.episodes.pendingId;
}

function openPendingEpisode(state) {
  ensure(state);
  if (!state.episodes.pendingId) {
    state.toast = '这个时段没有新的角色剧情。';
    return false;
  }
  state.managementEvent = { kind: 'episode', id: state.episodes.pendingId };
  return true;
}

function resolveEpisode(state, choiceIndex) {
  var event = state.managementEvent;
  var episode = event && event.kind === 'episode' ? data.characterEpisodes[event.id] : null;
  var choice = episode && episode.choices[choiceIndex];
  if (!choice) return false;
  applyEffects(state, choice.effects);
  if (state.episodes.completed.indexOf(episode.id) < 0) state.episodes.completed.push(episode.id);
  state.episodes.choices[episode.id] = choiceIndex;
  state.episodes.progress[episode.roleId] = Math.min(3, number(state.episodes.progress[episode.roleId], 0) + 1);
  if (state.characters[episode.roleId]) state.characters[episode.roleId].episodeStep = state.episodes.progress[episode.roleId];
  if (state.calendar.phase === 'evening') state.calendar.actionsUsed = Math.min(PHASE_ACTION_LIMIT, state.calendar.actionsUsed + 1);
  state.episodes.pendingId = null;
  state.managementEvent = { kind: 'result', title: episode.title, text: choice.result };
  state.toast = episode.title + '：已记录。';
  return true;
}

function toggleDish(state, id) {
  var dish;
  var index;
  ensure(state);
  if (state.dailyPlan.locked || state.calendar.phase !== 'morning') {
    state.toast = '菜单只能在早上开门前调整。';
    return false;
  }
  dish = find(data.dishes, id);
  if (!dish || state.inn.unlockedRecipes.indexOf(id) < 0) return false;
  index = state.dailyPlan.menu.indexOf(id);
  if (index >= 0) {
    if (state.dailyPlan.menu.length <= 1) {
      state.toast = '今日菜单至少保留一道菜。';
      return false;
    }
    rememberMorningPlan(state, '菜单调整');
    state.dailyPlan.menu.splice(index, 1);
  } else {
    if (state.dailyPlan.menu.length >= 3) {
      state.toast = '今日菜单最多选择三道菜。';
      return false;
    }
    rememberMorningPlan(state, '菜单调整');
    state.dailyPlan.menu.push(id);
  }
  state.inn.menu = state.dailyPlan.menu.slice();
  return true;
}

function adjustPrice(state, id, delta) {
  var dish = find(data.dishes, id);
  var current;
  var next;
  if (!dish || state.calendar.phase !== 'morning' || state.dailyPlan.locked) return false;
  current = number(state.dailyPlan.prices[id], dish.basePrice);
  next = clamp(current + delta, Math.round(dish.basePrice * 0.8), Math.round(dish.basePrice * 1.3));
  if (next === current) return false;
  rememberMorningPlan(state, '价格调整');
  state.dailyPlan.prices[id] = next;
  return true;
}

function availableStaff(state) {
  return Object.keys(state.characters || {}).filter(function (id) {
    return state.characters[id] && state.characters[id].innUnlocked;
  });
}

function cycleAssignment(state, jobId) {
  var job = find(data.jobs, jobId);
  var current;
  var candidates;
  var start;
  var index;
  var candidate;
  var used = state.dailyPlan.assignments;
  if (!job || state.calendar.phase !== 'morning' || state.dailyPlan.locked) return false;
  candidates = availableStaff(state).concat(['helper', null]);
  current = used[jobId];
  start = candidates.indexOf(current);
  for (index = 1; index <= candidates.length; index += 1) {
    candidate = candidates[(start + index + candidates.length) % candidates.length];
    if (!candidate || candidate === 'helper' || Object.keys(used).every(function (key) { return key === jobId || used[key] !== candidate; })) {
      rememberMorningPlan(state, '排班调整');
      used[jobId] = candidate;
      return true;
    }
  }
  return false;
}

function purchaseVariant(state, variant) {
  var definitions = {
    balanced: { baseCost: 10, stock: { staple: 3, vegetable: 3, meat: 2, tea: 2 }, label: '均衡食材' },
    fresh: { baseCost: 9, stock: { staple: 1, vegetable: 5, meat: 0, tea: 2 }, label: '时蔬茶饮' },
    hearty: { baseCost: 14, stock: { staple: 2, vegetable: 1, meat: 4, tea: 0 }, label: '荤食主料' },
  };
  return definitions[variant] || definitions.balanced;
}

function performPrep(state, id, variant) {
  var action = find(data.prepActions, id);
  var effects;
  var purchaseCost;
  var purchase;
  ensure(state);
  if (!action || state.calendar.phase !== 'morning') return false;
  if (state.calendar.actionsUsed >= PHASE_ACTION_LIMIT) {
    state.toast = '早上的筹备行动已经用完。';
    return false;
  }
  if (state.dailyPlan.prepActions.indexOf(id) >= 0) {
    state.toast = '这项筹备今天已经做过。';
    return false;
  }
  effects = action.effects;
  if (id === 'purchase') {
    purchase = purchaseVariant(state, variant);
    purchaseCost = caseFiles.purchaseCost(state, purchase.baseCost);
    effects = Object.assign({}, action.effects, { coin: -purchaseCost, stock: purchase.stock });
  }
  if (!canApply(state, effects)) {
    state.toast = '银两或食材不足，无法执行这项筹备。';
    return false;
  }
  rememberMorningPlan(state, action.name);
  applyEffects(state, effects);
  state.dailyPlan.prepActions.push(id);
  state.calendar.actionsUsed += 1;
  state.toast = action.name + '完成。' + (id === 'purchase'
    ? (purchase ? purchase.label + '，' : '') + '本次进货 ' + purchaseCost + ' 文。'
    : '');
  return true;
}

function rememberMorningPlan(state, label) {
  var plan = deepCopy(state.dailyPlan);
  plan.undo = null;
  state.dailyPlan.undo = {
    label: label,
    plan: plan,
    inventory: deepCopy(state.inventory),
    inn: {
      menu: (state.inn.menu || []).slice(),
      reputation: state.inn.reputation,
      order: state.inn.order,
      risk: state.inn.risk,
      roomState: deepCopy(state.inn.roomState),
    },
    actionsUsed: state.calendar.actionsUsed,
  };
}

function undoMorningPlan(state) {
  var snapshot;
  ensure(state);
  snapshot = state.dailyPlan.undo;
  if (state.calendar.phase !== 'morning' || state.dailyPlan.locked || !snapshot) {
    state.toast = '当前没有可以撤销的晨间安排。';
    return false;
  }
  state.dailyPlan = snapshot.plan;
  state.dailyPlan.undo = null;
  state.inventory = snapshot.inventory;
  state.inn.menu = snapshot.inn.menu;
  state.inn.reputation = snapshot.inn.reputation;
  state.inn.order = snapshot.inn.order;
  state.inn.risk = snapshot.inn.risk;
  state.inn.roomState = snapshot.inn.roomState;
  state.inn.rooms = state.inn.roomState.length;
  state.calendar.actionsUsed = snapshot.actionsUsed;
  syncIngredient(state);
  state.toast = '已撤销：' + snapshot.label + '。';
  return true;
}

function dishPrice(state, id) {
  var dish = find(data.dishes, id);
  return dish ? number(state.dailyPlan.prices[id], dish.basePrice) : 0;
}

function consumeDish(state, id) {
  var dish = find(data.dishes, id);
  var enough = true;
  if (!dish) return false;
  Object.keys(dish.ingredients).forEach(function (key) {
    if (number(state.inventory.stock[key], 0) < dish.ingredients[key]) enough = false;
  });
  if (!enough) return false;
  changeStock(state, Object.keys(dish.ingredients).reduce(function (result, key) {
    result[key] = -dish.ingredients[key];
    return result;
  }, {}));
  return true;
}

function buildOrderRounds(state) {
  var menu = state.dailyPlan.menu.slice();
  var candidates = menu.slice();
  var rounds = [];
  var roundIndex;
  var guest;
  var correct;
  while (candidates.length < 3) {
    data.dishes.some(function (dish) {
      if (candidates.indexOf(dish.id) < 0 && state.inn.unlockedRecipes.indexOf(dish.id) >= 0) {
        candidates.push(dish.id);
        return true;
      }
      return false;
    });
  }
  candidates = candidates.slice(0, 3);
  for (roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    guest = data.guests[(state.calendar.day + roundIndex) % data.guests.length];
    correct = 0;
    candidates.some(function (id, index) {
      var dish = find(data.dishes, id);
      if (dish.tags.some(function (tag) { return guest.prefers.indexOf(tag) >= 0; })) {
        correct = index;
        return true;
      }
      return false;
    });
    rounds.push({
      prompt: guest.name + '偏爱“' + guest.prefers[0] + '”口味',
      options: candidates.map(function (id) { return find(data.dishes, id).name; }),
      correct: correct,
    });
  }
  return rounds;
}

function createMiniGame(state, id) {
  var definition = data.miniGames[id] || data.miniGames.order;
  return {
    id: definition.id,
    name: definition.name,
    round: 0,
    score: 0,
    rounds: definition.id === 'order' ? buildOrderRounds(state) : definition.rounds.map(function (round) { return copy(round); }),
  };
}

function startShift(state) {
  var script;
  ensure(state);
  if (state.calendar.phase !== 'morning') return false;
  if (state.episodes.pendingId) {
    openPendingEpisode(state);
    state.toast = '先处理今天早上的人物剧情。';
    return false;
  }
  if (!state.dailyPlan.menu.length) {
    state.toast = '请先选择今日菜单。';
    return false;
  }
  script = dayScript(state);
  state.calendar.phase = 'noon';
  state.worldTime.phase = 'noon';
  if (state.mapVariants) state.mapVariants.phase = 'noon';
  state.calendar.actionsUsed = 0;
  state.dailyPlan.locked = true;
  state.dailyPlan.undo = null;
  state.service = {
    day: state.calendar.day,
    index: 0,
    wave: 1,
    queue: [
      { kind: 'event', id: script.serviceEvents[0] },
      { kind: 'minigame', id: script.miniGame },
      { kind: 'event', id: script.serviceEvents[1] },
    ],
    income: 0,
    satisfaction: Math.max(0, state.dailyPlan.prepBonus + state.dailyPlan.guestBonus),
    completed: false,
    miniGame: createMiniGame(state, script.miniGame),
    outcomes: [],
    log: '午市开门，第一拨客人进店。',
  };
  state.managementPage = 'today';
  state.toast = '开门迎客：午市第一轮开始。';
  return true;
}

function currentServiceStep(state) {
  ensure(state);
  return state.calendar.phase === 'noon' ? state.service.queue[state.service.index] || null : null;
}

function assignmentBonus(state, choice) {
  var assigned = choice.job && state.dailyPlan.assignments[choice.job];
  if (assigned && assigned === choice.specialist) {
    state.service.satisfaction += 1;
    state.inn.order = clamp(state.inn.order + 1, 0, 100);
    state.characters[assigned].jobXp[choice.job] = number(state.characters[assigned].jobXp[choice.job], 0) + 1;
    return true;
  }
  return false;
}

function addWaveIncomeAndFood(state) {
  var menu = state.dailyPlan.menu;
  var id = menu[state.service.index % menu.length];
  var served = consumeDish(state, id);
  var price = dishPrice(state, id);
  if (served) state.service.income += price + Math.max(0, state.dailyPlan.guestBonus * 2);
  else {
    state.service.satisfaction -= 2;
    state.inn.order = clamp(state.inn.order - 3, 0, 100);
    state.service.log = '食材不足，这一轮只能临时换菜。';
  }
}

function finishServiceStep(state, outcome) {
  if (outcome) state.service.outcomes.push(outcome);
  state.service.index += 1;
  state.service.wave = state.service.index + 1;
  if (state.service.index >= state.service.queue.length) {
    state.service.completed = true;
    state.calendar.phase = 'evening';
    state.worldTime.phase = 'evening';
    if (state.mapVariants) state.mapVariants.phase = 'evening';
    state.calendar.actionsUsed = 0;
    state.dailyPlan.locked = false;
    state.inn.guests = Math.max(1, 3 + state.dailyPlan.guestBonus);
    syncPendingEpisode(state);
    state.toast = '午市结束，客栈进入晚间安排。';
  }
}

function resolveServiceEvent(state, choiceIndex) {
  var step = currentServiceStep(state);
  var event = step && step.kind === 'event' ? data.serviceEvents[step.id] : null;
  var choice = event && event.choices[choiceIndex];
  var bonus;
  if (!choice) return false;
  addWaveIncomeAndFood(state);
  applyEffects(state, choice.effects, { deferCoin: true });
  if (choice.tendency && state.campaign && state.campaign.tendencies[choice.tendency] != null) {
    state.campaign.tendencies[choice.tendency] += 1;
  }
  if (/^(deep(?:56|78)?-operation-|rare-)/.test(event.id)) {
    randomEvents.resolve(state, event.id, choice.id || choiceIndex);
  }
  bonus = assignmentBonus(state, choice);
  state.service.log = choice.result + (bonus ? ' 岗位专长生效。' : '');
  finishServiceStep(state, { id: event.id, choice: choiceIndex, bonus: bonus });
  state.managementEvent = {
    kind: 'result',
    title: event.title,
    text: state.service.log,
  };
  return true;
}

function ensureMiniGame(state) {
  var step = currentServiceStep(state);
  if (!step || step.kind !== 'minigame') return null;
  if (!state.service.miniGame) state.service.miniGame = createMiniGame(state, step.id);
  return state.service.miniGame;
}

function miniGameChoice(state, choiceIndex) {
  var game = ensureMiniGame(state);
  var round = game && game.rounds[game.round];
  if (!round) return false;
  if (choiceIndex === round.correct) game.score += 1;
  game.round += 1;
  if (game.round >= game.rounds.length) {
    addWaveIncomeAndFood(state);
    state.service.satisfaction += game.score + 1;
    state.service.log = game.name + '完成：' + game.score + '/' + game.rounds.length + '。';
    finishServiceStep(state, { id: game.id, score: game.score });
    state.managementEvent = {
      kind: 'result',
      title: game.name,
      text: state.service.log,
    };
  }
  return true;
}

function helperCost(state) {
  var cost = 0;
  data.jobs.forEach(function (job) {
    if (state.dailyPlan.assignments[job.id] === 'helper') cost += job.helperCost;
  });
  return cost;
}

function optionalActionLimit(state) {
  if (state.calendar.phase === 'evening' && state.episodes.pendingId) return PHASE_ACTION_LIMIT - 1;
  return PHASE_ACTION_LIMIT;
}

function gradeFor(state, income) {
  var score = state.service.satisfaction + Math.floor(state.inn.order / 20) + Math.floor(state.inn.reputation / 5) + (income >= 45 ? 2 : 0);
  if (score >= 17) return 'S';
  if (score >= 13) return 'A';
  if (score >= 9) return 'B';
  return 'C';
}

function settleDay(state) {
  var day;
  var facilityBonus;
  var roomsIncome = 0;
  var costs;
  var income;
  var grade;
  var result;
  ensure(state);
  if (state.calendar.phase !== 'evening') {
    state.toast = '只有晚上才能打烊结算。';
    return false;
  }
  if (state.episodes.pendingId) {
    openPendingEpisode(state);
    state.toast = '先完成今晚的人物交流。';
    return false;
  }
  day = state.calendar.day;
  if (state.inn.lastSettledDay === day) return false;
  state.inn.roomState.forEach(function (room) {
    if (room.guestId && room.daysRemaining > 0) roomsIncome += 8 + room.comfort * 2 + state.inn.facilities.rooms * 2;
    room.cleanliness = clamp(room.cleanliness - (room.guestId ? 9 : 3), 0, 100);
    if (room.daysRemaining > 0) room.daysRemaining -= 1;
    if (room.daysRemaining <= 0) { room.guestId = null; room.eventId = null; }
  });
  facilityBonus = Math.max(0, state.inn.facilities.hall - 1) * 3 + Math.max(0, state.inn.facilities.sign - 1) * 2;
  costs = helperCost(state);
  income = Math.max(0, state.service.income + roomsIncome + facilityBonus - costs);
  state.inventory.coin += income;
  if (state.service.satisfaction >= 8) state.inn.reputation += 2;
  else if (state.service.satisfaction >= 5) state.inn.reputation += 1;
  else if (state.service.satisfaction < 2) state.inn.reputation = Math.max(0, state.inn.reputation - 1);
  state.inn.order = clamp(state.inn.order + (state.service.satisfaction >= 5 ? 2 : -3), 0, 100);
  Object.keys(state.characters).forEach(function (id) {
    var character = state.characters[id];
    if (!character.innUnlocked) return;
    character.energy = clamp(character.energy + 16 + Math.max(0, state.inn.facilities.yard - 1) * 2, 0, 100);
    character.mood = clamp(character.mood + (state.service.satisfaction >= 5 ? 2 : -2), 0, 100);
  });
  grade = gradeFor(state, income);
  result = {
    day: day,
    title: dayScript(state).title,
    income: income,
    helperCost: costs,
    roomIncome: roomsIncome,
    satisfaction: state.service.satisfaction,
    reputation: state.inn.reputation,
    order: state.inn.order,
    grade: grade,
  };
  state.inn.history.push(result);
  if (state.inn.history.length > 14) state.inn.history.splice(0, state.inn.history.length - 14);
  state.inn.lastSettledDay = day;
  if (day >= 7) {
    state.flags['chapter-seven-days-complete'] = true;
    state.freeMode = true;
  }
  state.calendar.day += 1;
  state.calendar.phase = 'morning';
  state.calendar.actionsUsed = 0;
  state.inn.day = state.calendar.day;
  state.worldTime.day = Math.max(state.worldTime.day, state.calendar.day);
  state.worldTime.phase = 'morning';
  state.worldTime.lastAdvanceReason = 'inn-closing';
  state.worldTime.advances += 1;
  branchSystem.capture(state);
  transport.advance(state);
  campaignSystem.ensure(state);
  state.campaign.gameDay = state.calendar.day;
  if (deepContent.chapters[state.campaign.chapter]
    && !state.flags['c' + String(state.campaign.chapter).padStart(2, '0') + '-complete']) {
    state.campaign.chapterDay = Math.min(7, Math.max(1, number(state.campaign.chapterDay, 1) + 1));
  } else {
    state.campaign.chapter = Math.min(32, Math.max(state.campaign.chapter, Math.ceil(state.calendar.day / 7)));
  }
  state.campaign.season = Math.min(4, Math.floor((state.campaign.chapter - 1) / 8) + 1);
  state.dailyPlan = defaultDailyPlan(state);
  state.service = { day: state.calendar.day, index: 0, wave: 0, queue: [], income: 0, satisfaction: 0, completed: false, miniGame: null, log: '' };
  syncPendingEpisode(state);
  state.managementEvent = { kind: 'settlement', result: result };
  state.toast = '第 ' + day + ' 日结算完成，评级 ' + grade + '。';
  return true;
}

function purchaseUpgrade(state, id) {
  var facility = find(data.facilities, id);
  var level;
  var cost;
  ensure(state);
  if (!facility) return false;
  if (state.calendar.phase !== 'evening') {
    state.toast = '装修安排放在晚上处理。';
    return false;
  }
  if (state.calendar.actionsUsed >= optionalActionLimit(state)) {
    state.toast = '今晚的安排已经用完。';
    return false;
  }
  level = number(state.inn.facilities[id], 1);
  if (level >= facility.costs.length + 1) {
    state.toast = facility.name + '已经升到当前最高等级。';
    return false;
  }
  cost = facility.costs[level - 1];
  if (state.inventory.coin < cost) {
    state.toast = '银两不足，还差 ' + (cost - state.inventory.coin) + ' 文。';
    return false;
  }
  state.inventory.coin -= cost;
  state.inn.facilities[id] = level + 1;
  if (state.inn.upgrades.indexOf(id) < 0) state.inn.upgrades.push(id);
  if (id === 'rooms' && state.inn.roomState.length < 3) {
    state.inn.roomState.push(defaultRooms(state.inn.roomState.length + 1)[state.inn.roomState.length]);
    state.inn.rooms = state.inn.roomState.length;
  }
  state.calendar.actionsUsed += 1;
  state.toast = facility.name + '提升到 ' + (level + 1) + ' 级。';
  return true;
}

function requestUpgrade(state, id) {
  var facility = find(data.facilities, id);
  var level;
  var cost;
  ensure(state);
  if (!facility) return false;
  if (state.calendar.phase !== 'evening') {
    state.toast = '装修安排放在晚上处理。';
    return false;
  }
  if (state.calendar.actionsUsed >= optionalActionLimit(state)) {
    state.toast = '今晚的安排已经用完。';
    return false;
  }
  level = number(state.inn.facilities[id], 1);
  if (level >= facility.costs.length + 1) {
    state.toast = facility.name + '已经升到当前最高等级。';
    return false;
  }
  cost = facility.costs[level - 1];
  if (state.inventory.coin < cost) {
    state.toast = '银两不足，还差 ' + (cost - state.inventory.coin) + ' 文。';
    return false;
  }
  state.managementEvent = {
    kind: 'confirm',
    title: '确认装修 ' + facility.name,
    text: '花费 ' + cost + ' 文，提升到 Lv.' + (level + 1) + '。' + facility.effect + '。此操作会占用一次晚间安排。',
    confirmLabel: '确认花费 ' + cost + ' 文',
    confirmAction: { type: 'upgradeConfirm', id: id },
  };
  return true;
}

function cleanRoom(state, roomId) {
  var room;
  ensure(state);
  if (state.calendar.phase !== 'evening' || state.calendar.actionsUsed >= optionalActionLimit(state)) return false;
  room = find(state.inn.roomState, roomId);
  if (!room) return false;
  room.cleanliness = clamp(room.cleanliness + 25, 0, 100);
  state.calendar.actionsUsed += 1;
  state.toast = room.name + '已经收拾妥当。';
  return true;
}

function startOuting(state, questId) {
  var id = questId || 'late-letter';
  var entry;
  var key;
  ensure(state);
  if (state.calendar.phase === 'noon') {
    state.toast = '午市正在营业，暂时不能外出。';
    return null;
  }
  if (state.calendar.actionsUsed >= optionalActionLimit(state)) {
    state.toast = '这个时段的行动已经用完。';
    return null;
  }
  if (id === 'late-letter') {
    entry = state.sideQuests.entries[id];
    if (entry.status === 'locked') {
      state.toast = '货车线索尚未出现，先推进第二日剧情。';
      return null;
    }
    if (entry.status === 'complete') id = 'free';
  }
  state.sideQuests.outingSerial += 1;
  key = state.calendar.day + ':' + state.calendar.phase + ':' + state.sideQuests.outingSerial;
  state.sideQuests.activeId = id;
  state.sideQuests.outingKey = key;
  state.returnContext = { screen: 'inn', phase: state.calendar.phase, page: state.managementPage };
  state.explorationContext = { source: 'inn', purpose: id, returnMapId: 'inn', advancesTimeOnReturn: true };
  state.screen = 'explore';
  state.mode = 'explore';
  state.modal = null;
  if (id === 'late-letter') {
    entry = state.sideQuests.entries[id];
    if (entry.status === 'available') entry.status = 'active';
    return { mapId: entry.mapId || 'inn', spawnId: entry.spawnId || 'main', position: entry.position };
  }
  return { mapId: state.mapId || 'inn', spawnId: state.spawnId || 'main', position: state.position };
}

function returnFromOuting(state) {
  var id;
  var key;
  var entry;
  ensure(state);
  id = state.sideQuests.activeId;
  key = state.sideQuests.outingKey;
  if (id === 'late-letter') {
    entry = state.sideQuests.entries[id];
    entry.mapId = state.mapId;
    entry.spawnId = state.spawnId;
    entry.position = state.position ? { x: state.position.x, y: state.position.y } : null;
  }
  if (key && state.sideQuests.chargedKeys.indexOf(key) < 0) {
    state.sideQuests.chargedKeys.push(key);
    state.calendar.actionsUsed = Math.min(PHASE_ACTION_LIMIT, state.calendar.actionsUsed + 1);
  }
  state.sideQuests.activeId = null;
  state.sideQuests.outingKey = null;
  state.screen = 'explore';
  state.mode = 'explore';
  state.managementPage = state.returnContext && state.returnContext.page || 'today';
  state.returnContext = null;
  if (!state.explorationContext || state.explorationContext.advancesTimeOnReturn !== false) {
    worldTime.advance(state, 'return-from-outing');
  }
  state.explorationContext = null;
  state.modal = null;
  state.dialogue = null;
  moveToBusinessMap(state, true);
  if (state.innScene) {
    state.innScene.activePage = null;
    state.innScene.selectedObjectId = null;
  }
  state.toast = '已回到客栈，时间推进到' + worldTime.label(state.worldTime.phase) + '。';
  syncQuestStatus(state);
  return true;
}

function businessMapId(state) {
  return state.activeBranchId === 'jiangnan' ? 'jiangnan_branch' : 'inn';
}

function moveToBusinessMap(state, preservePosition) {
  var content = require('../../data/content');
  var mapId = businessMapId(state);
  var current = find(content.maps, mapId);
  var point = current && (current.spawns.recovery || current.spawns.main);
  if (!current || !point) return false;
  if (!preservePosition || state.mapId !== mapId || !state.position) {
    state.mapId = mapId;
    state.spawnId = current.spawns.recovery ? 'recovery' : 'main';
    state.position = { x: point.x, y: point.y };
    state.velocity = { x: 0, y: 0 };
    state.facing = point.facing || 'right';
    state.moving = false;
    state.followers = {};
    state.trail = [];
  }
  return true;
}

function markSideQuestComplete(state, id) {
  var definition = find(data.sideQuests, id);
  var entry;
  if (!definition) return false;
  ensure(state);
  entry = state.sideQuests.entries[id];
  entry.status = 'complete';
  applyEffects(state, definition.rewards);
  return true;
}

function enterManagement(state, fromOuting) {
  ensure(state);
  if (fromOuting && state.sideQuests.activeId) return returnFromOuting(state);
  state.screen = 'explore';
  state.mode = 'explore';
  state.modal = null;
  state.dialogue = null;
  state.managementPage = state.managementPage || 'today';
  state.managementView = 'scene';
  state.managementRoleId = state.managementRoleId || 'zhangdeng';
  state.managementNavOpen = false;
  moveToBusinessMap(state, true);
  if (state.innScene) {
    state.innScene.activePage = null;
    state.innScene.selectedObjectId = null;
    state.innScene.microGame = null;
    state.innScene.serviceOpen = false;
  }
  syncPendingEpisode(state);
  return true;
}

function dispatch(state, action) {
  if (!action) return false;
  ensure(state);
  if (action.type === 'managementObjectOpen') {
    state.managementView = action.view || 'scene';
    if (state.innScene) state.innScene.activePage = action.view === 'scene' ? null : action.view;
    if (action.roleId) state.managementRoleId = action.roleId;
    if (action.objectId && state.managementSeenObjects.indexOf(action.objectId) < 0) {
      state.managementSeenObjects.push(action.objectId);
    }
    return true;
  }
  if (action.type === 'managementSceneBack') {
    state.managementView = 'scene';
    if (state.innScene) state.innScene.activePage = null;
    return true;
  }
  if (action.type === 'managementTab') {
    state.managementPage = action.page;
    state.managementNavOpen = false;
    return true;
  }
  if (action.type === 'managementNavToggle') {
    state.managementNavOpen = !state.managementNavOpen;
    return true;
  }
  if (action.type === 'managementSummary') {
    state.managementPage = 'today';
    state.managementNavOpen = false;
    return true;
  }
  if (action.type === 'dish') return toggleDish(state, action.id);
  if (action.type === 'price') return adjustPrice(state, action.id, action.delta);
  if (action.type === 'assign') return cycleAssignment(state, action.id);
  if (action.type === 'assignRole') {
    var role = state.characters[action.roleId];
    var job = find(data.jobs, action.id);
    if (state.calendar.phase !== 'morning') {
      state.toast = '营业开始后，今日排班已经锁定。';
      return false;
    }
    if (!role || !role.innUnlocked || !job) return false;
    Object.keys(state.dailyPlan.assignments).forEach(function (jobId) {
      if (state.dailyPlan.assignments[jobId] === action.roleId) state.dailyPlan.assignments[jobId] = 'helper';
    });
    state.dailyPlan.assignments[action.id] = action.roleId;
    state.toast = '已经安排到' + job.name + '。';
    return true;
  }
  if (action.type === 'prep') return performPrep(state, action.id, action.variant);
  if (action.type === 'planUndo') return undoMorningPlan(state);
  if (action.type === 'episodeOpen') return openPendingEpisode(state);
  if (action.type === 'episodeChoice') return resolveEpisode(state, action.index);
  if (action.type === 'startShift') {
    var started = startShift(state);
    if (started) {
      state.managementView = 'scene';
      if (state.innScene) state.innScene.activePage = null;
    }
    return started;
  }
  if (action.type === 'serviceChoice') return resolveServiceEvent(state, action.index);
  if (action.type === 'miniGameChoice') return miniGameChoice(state, action.index);
  if (action.type === 'upgrade') return requestUpgrade(state, action.id);
  if (action.type === 'upgradeConfirm') {
    var upgraded = purchaseUpgrade(state, action.id);
    if (upgraded) state.managementEvent = null;
    return upgraded;
  }
  if (action.type === 'roomClean') return cleanRoom(state, action.id);
  if (action.type === 'settle') return settleDay(state);
  if (action.type === 'managementEventClose') {
    var wasSettlement = state.managementEvent && state.managementEvent.kind === 'settlement';
    state.managementEvent = null;
    if (wasSettlement) {
      state.managementView = 'scene';
      if (state.innScene) state.innScene.activePage = null;
    }
    return true;
  }
  return false;
}

module.exports = {
  inn: { dishes: data.dishes, upgrades: data.facilities },
  data: data,
  PHASES: PHASES,
  PHASE_ACTION_LIMIT: PHASE_ACTION_LIMIT,
  ensure: ensure,
  phaseLabel: phaseLabel,
  dayScript: dayScript,
  totalStock: totalStock,
  syncIngredient: syncIngredient,
  changeStock: changeStock,
  applyEffects: applyEffects,
  currentServiceStep: currentServiceStep,
  ensureMiniGame: ensureMiniGame,
  openPendingEpisode: openPendingEpisode,
  toggleDish: toggleDish,
  purchaseUpgrade: purchaseUpgrade,
  settle: settleDay,
  settleDay: settleDay,
  startOuting: startOuting,
  returnFromOuting: returnFromOuting,
  markSideQuestComplete: markSideQuestComplete,
  enterManagement: enterManagement,
  dispatch: dispatch,
};
