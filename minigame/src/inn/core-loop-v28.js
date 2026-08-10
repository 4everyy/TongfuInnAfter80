'use strict';

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function defaults() {
  return {
    version: 28,
    appliedOpeningDay: 0,
    customers: {},
    dishMastery: {},
    dailyMetrics: {},
    consequences: [],
    explorationRewards: [],
    milestones: {},
    purchaseDiscount: 0,
    lastFeedback: '',
  };
}

function ensure(state) {
  var base = defaults();
  state.coreLoopV28 = Object.assign(base, state.coreLoopV28 || {});
  state.coreLoopV28.customers = Object.assign({}, state.coreLoopV28.customers || {});
  state.coreLoopV28.dishMastery = Object.assign({}, state.coreLoopV28.dishMastery || {});
  state.coreLoopV28.dailyMetrics = Object.assign({}, state.coreLoopV28.dailyMetrics || {});
  state.coreLoopV28.consequences = Array.isArray(state.coreLoopV28.consequences) ? state.coreLoopV28.consequences : [];
  state.coreLoopV28.explorationRewards = Array.isArray(state.coreLoopV28.explorationRewards) ? state.coreLoopV28.explorationRewards : [];
  state.coreLoopV28.milestones = Object.assign({}, state.coreLoopV28.milestones || {});
  applyOpening(state);
  syncExplorationReward(state);
  return state.coreLoopV28;
}

function metric(state) {
  var loop = state.coreLoopV28;
  var day = String(state.calendar && state.calendar.day || 1);
  if (!loop.dailyMetrics[day]) {
    loop.dailyMetrics[day] = { served: 0, missed: 0, preferenceHits: 0, fairPrices: 0, income: 0, satisfaction: 0 };
  }
  return loop.dailyMetrics[day];
}

function applyOpening(state) {
  var loop = state.coreLoopV28;
  var day = state.calendar && state.calendar.day || 1;
  var stock;
  if (!loop || !state.calendar || state.calendar.phase !== 'morning' || loop.appliedOpeningDay === day) return;
  loop.appliedOpeningDay = day;
  stock = state.inventory && state.inventory.stock;
  if (day === 2 && stock && !(state.flags && state.flags['chapter-late-letter-complete'])) {
    stock.vegetable = Math.max(0, number(stock.vegetable, 0) - 2);
    stock.meat = Math.max(0, number(stock.meat, 0) - 1);
    loop.consequences.push({ day, id: 'delayed-cart-shortage', text: '货车误时：蔬菜减少 2，荤食减少 1。' });
  }
  if (day === 2 && state.flags && state.flags['v28-honest-ledger']) {
    state.inn.reputation += 1;
    loop.consequences.push({ day, id: 'honest-ledger-return', text: '熟客替客栈带来了一桌新客人。' });
  } else if (day === 2 && state.flags && state.flags['v28-loose-ledger']) {
    state.inn.order = Math.max(0, number(state.inn.order, 68) - 2);
    loop.consequences.push({ day, id: 'loose-ledger-recount', text: '昨晚账目重算，今日秩序降低 2。' });
  }
  if (day === 3 && state.dailyPlan) {
    state.dailyPlan.guestBonus = number(state.dailyPlan.guestBonus, 0) + 1;
    loop.consequences.push({ day, id: 'returning-crowd', text: '前两日口碑带来额外客流。' });
  }
  if (stock && state.inventory) {
    state.inventory.ingredient = Object.keys(stock).reduce(function (total, key) { return total + number(stock[key], 0); }, 0);
  }
}

function syncExplorationReward(state) {
  var loop = state.coreLoopV28;
  var flags = state.flags || {};
  if (!flags['chapter-late-letter-complete'] || loop.milestones.lateLetterLinked) return;
  loop.milestones.lateLetterLinked = true;
  loop.purchaseDiscount = Math.max(number(loop.purchaseDiscount, 0), 4);
  loop.explorationRewards.push({ id: 'late-letter', day: state.calendar && state.calendar.day || 1, text: '追回货物让下一次采购成本降低。' });
  loop.consequences.push({ day: state.calendar && state.calendar.day || 1, id: 'supply-route-restored', text: '东关供货路线恢复。' });
}

function decorateDayScript(state, script) {
  var result = Object.assign({}, script, { serviceEvents: (script.serviceEvents || []).slice() });
  if (result.day === 3 && state.flags && (state.flags['v28-elder-cared'] || state.flags['v28-elder-tea'])) {
    result.serviceEvents[1] = 'v28-returning-regular';
    result.objective = '应对满堂催菜，并接待第一天结识的回头客。';
  }
  return result;
}

function purchaseDiscount(state) {
  return Math.max(0, number(ensure(state).purchaseDiscount, 0));
}

function consumePurchaseDiscount(state) {
  ensure(state).purchaseDiscount = 0;
}

function find(list, id) {
  return (list || []).find(function (item) { return item.id === id; }) || null;
}

function hasIngredients(state, dish) {
  return Object.keys(dish.ingredients || {}).every(function (key) {
    return number(state.inventory && state.inventory.stock && state.inventory.stock[key], 0) >= dish.ingredients[key];
  });
}

function servicePlan(state, event, management) {
  var guest = find(management.guests, event && event.guestId) || management.guests[0];
  var menu = state.dailyPlan && state.dailyPlan.menu || [];
  var candidates = menu.map(function (id) { return find(management.dishes, id); }).filter(Boolean);
  var best = null;
  var bestScore = -999;
  candidates.forEach(function (dish) {
    var matches = dish.tags.filter(function (tag) { return guest.prefers.indexOf(tag) >= 0; }).length;
    var price = number(state.dailyPlan.prices[dish.id], dish.basePrice);
    var score = matches * 4 - Math.max(0, price - guest.budget) / 3 + (hasIngredients(state, dish) ? 2 : -20);
    score += Math.min(2, number(state.coreLoopV28.dishMastery[dish.id], 0));
    if (score > bestScore) {
      best = dish;
      bestScore = score;
    }
  });
  return { guest, dish: best || candidates[0] || management.dishes[0] };
}

function serviceFeedback(state, plan, served, price) {
  var guest = plan.guest;
  var dish = plan.dish;
  var matches = dish.tags.filter(function (tag) { return guest.prefers.indexOf(tag) >= 0; }).length;
  var priceRatio = price / Math.max(1, dish.basePrice);
  var satisfaction = 0;
  var parts = [];
  if (!served) {
    satisfaction = -2;
    parts.push('食材不足，未能按菜单出菜');
  } else {
    satisfaction += matches > 0 ? 2 : -1;
    parts.push(matches > 0 ? '口味命中' : '口味不合');
    if (priceRatio > 1.15 && price > guest.budget) {
      satisfaction -= 1;
      parts.push('价格超出预算');
    } else if (priceRatio <= 1) {
      satisfaction += 1;
      parts.push('价格公道');
    }
    if ((state.dailyPlan.prepActions || []).indexOf('prepare') >= 0) {
      satisfaction += 1;
      parts.push('提前备菜生效');
    }
  }
  return { satisfaction, matches, fair: priceRatio <= 1, text: guest.name + ' · ' + dish.name + '：' + parts.join('，') + '。' };
}

function recordService(state, plan, served, price, feedback) {
  var loop = ensure(state);
  var current = metric(state);
  var dishId = plan.dish.id;
  current.served += served ? 1 : 0;
  current.missed += served ? 0 : 1;
  current.preferenceHits += feedback.matches > 0 ? 1 : 0;
  current.fairPrices += feedback.fair ? 1 : 0;
  current.income += served ? price : 0;
  current.satisfaction += feedback.satisfaction;
  loop.lastFeedback = feedback.text;
  if (served && feedback.satisfaction >= 2) {
    loop.dishMastery[dishId] = Math.min(3, number(loop.dishMastery[dishId], 0) + 1);
  }
  return feedback;
}

function recordChoice(state, event, choice, choiceIndex) {
  var loop = ensure(state);
  var guestId = event && event.guestId || 'unknown';
  var memory = loop.customers[guestId] || { visits: 0, goodwill: 0, memories: [] };
  memory.visits += 1;
  memory.goodwill += number(choice && choice.effects && choice.effects.satisfaction, 0);
  if (choice && choice.memory && memory.memories.indexOf(choice.memory) < 0) memory.memories.push(choice.memory);
  memory.lastEventId = event && event.id;
  memory.lastChoice = choiceIndex;
  loop.customers[guestId] = memory;
}

function recordSettlement(state, result) {
  var loop = ensure(state);
  var day = Number(result.day) || 1;
  result.playSummary = loop.dailyMetrics[String(day)] || null;
  result.consequences = loop.consequences.filter(function (item) { return item.day === day; });
  if (day === 3 && !loop.milestones.firstThreeDays) {
    loop.milestones.firstThreeDays = {
      grade: result.grade,
      text: result.grade === 'S' || result.grade === 'A'
        ? '长风客栈形成了稳定的三日经营节奏。'
        : '三日经营已经跑通，但菜单与排班仍有提升空间。',
    };
    result.milestone = loop.milestones.firstThreeDays.text;
  }
  return result;
}

module.exports = {
  ensure,
  servicePlan,
  serviceFeedback,
  recordService,
  recordChoice,
  recordSettlement,
  decorateDayScript,
  purchaseDiscount,
  consumePurchaseDiscount,
};
