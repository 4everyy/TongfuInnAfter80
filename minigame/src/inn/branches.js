'use strict';

var STOCK_KEYS = ['staple', 'vegetable', 'meat', 'tea'];
var BRANCHES = {
  changfeng: { id: 'changfeng', name: '长风客栈', region: 'guanzhong', regionName: '关中商路' },
  jiangnan: { id: 'jiangnan', name: '水巷分店', region: 'jiangnan', regionName: '江南水路' },
  frontier: { id: 'frontier', name: '北境驿站', region: 'frontier', regionName: '北境驿路' },
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function stock(value, fallback) {
  var result = {};
  STOCK_KEYS.forEach(function (key) {
    result[key] = Math.max(0, Number(value && value[key]) || Number(fallback && fallback[key]) || 0);
  });
  return result;
}

function defaultInn(id) {
  return {
    day: 1,
    reputation: id === 'changfeng' ? 3 : 0,
    order: id === 'changfeng' ? 68 : 52,
    risk: id === 'changfeng' ? 2 : 8,
    rooms: 1,
    menu: ['noodles'],
    upgrades: [],
    guests: 0,
  };
}

function defaultStock(id) {
  return id === 'changfeng'
    ? { staple: 4, vegetable: 3, meat: 2, tea: 1 }
    : { staple: 2, vegetable: 1, meat: 0, tea: id === 'jiangnan' ? 2 : 0 };
}

function defaultMarket() {
  return { multipliers: { staple: 1, vegetable: 1, meat: 1, tea: 1 }, history: [], pressure: 0, normalized: false };
}

function normalizeBranch(current, id) {
  var definition = BRANCHES[id];
  var branch = Object.assign({
    id: id,
    name: definition.name,
    region: definition.regionName,
    unlocked: id === 'changfeng',
    level: id === 'changfeng' ? 1 : 0,
    inn: defaultInn(id),
    stock: defaultStock(id),
  }, current || {});
  branch.inn = Object.assign(defaultInn(id), branch.inn || {});
  branch.stock = stock(branch.stock, defaultStock(id));
  return branch;
}

function ingredientTotal(state) {
  var current = state.inventory && state.inventory.stock || {};
  return STOCK_KEYS.reduce(function (total, key) { return total + (Number(current[key]) || 0); }, 0);
}

function ensure(state, migrateCurrent) {
  var id;
  state.activeBranchId = BRANCHES[state.activeBranchId] ? state.activeBranchId : 'changfeng';
  state.branches = state.branches && typeof state.branches === 'object' ? state.branches : {};
  Object.keys(BRANCHES).forEach(function (branchId) {
    state.branches[branchId] = normalizeBranch(state.branches[branchId], branchId);
  });
  state.regionalMarkets = Object.assign({
    guanzhong: defaultMarket(),
    jiangnan: defaultMarket(),
    frontier: defaultMarket(),
  }, state.regionalMarkets || {});
  Object.keys(state.regionalMarkets).forEach(function (region) {
    var market = state.regionalMarkets[region] || {};
    market.multipliers = Object.assign(defaultMarket().multipliers, market.multipliers || {});
    market.history = Array.isArray(market.history) ? market.history : [];
    market.pressure = Math.max(0, Number(market.pressure) || 0);
    market.normalized = !!market.normalized;
    state.regionalMarkets[region] = market;
  });
  id = state.activeBranchId;
  if (migrateCurrent) {
    state.branches.changfeng.inn = copy(state.inn || defaultInn('changfeng'));
    state.branches.changfeng.stock = stock(state.inventory && state.inventory.stock, defaultStock('changfeng'));
    state.regionalMarkets.guanzhong = copy(state.market || defaultMarket());
    id = state.activeBranchId = 'changfeng';
  } else {
    state.inn = copy(state.branches[id].inn);
    state.inventory.stock = stock(state.branches[id].stock, defaultStock(id));
    state.market = copy(state.regionalMarkets[BRANCHES[id].region] || defaultMarket());
  }
  state.inventory.ingredient = ingredientTotal(state);
  return state.branches[id];
}

function capture(state) {
  var id = BRANCHES[state.activeBranchId] ? state.activeBranchId : 'changfeng';
  var branch = state.branches[id] = normalizeBranch(state.branches[id], id);
  branch.inn = copy(state.inn || defaultInn(id));
  branch.stock = stock(state.inventory && state.inventory.stock, defaultStock(id));
  state.regionalMarkets[BRANCHES[id].region] = copy(state.market || defaultMarket());
  state.inventory.ingredient = ingredientTotal(state);
  return branch;
}

function switchTo(state, id) {
  if (!BRANCHES[id] || !state.branches[id] || !state.branches[id].unlocked) return false;
  capture(state);
  state.activeBranchId = id;
  state.inn = copy(state.branches[id].inn);
  state.inventory.stock = stock(state.branches[id].stock, defaultStock(id));
  state.market = copy(state.regionalMarkets[BRANCHES[id].region] || defaultMarket());
  state.inventory.ingredient = ingredientTotal(state);
  state.dailyPlan = null;
  state.service = null;
  state.managementPage = 'today';
  return true;
}

function unlock(state, id) {
  ensure(state, false);
  if (!BRANCHES[id]) return false;
  state.branches[id].unlocked = true;
  state.branches[id].level = Math.max(1, Number(state.branches[id].level) || 0);
  return true;
}

function regionForBranch(id) {
  return BRANCHES[id] ? BRANCHES[id].region : 'guanzhong';
}

module.exports = {
  DEFINITIONS: BRANCHES,
  STOCK_KEYS: STOCK_KEYS,
  ensure: ensure,
  capture: capture,
  switchTo: switchTo,
  unlock: unlock,
  regionForBranch: regionForBranch,
};
