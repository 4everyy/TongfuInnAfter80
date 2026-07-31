'use strict';

var branches = require('../inn/branches');

function copyCargo(cargo) {
  var result = {};
  branches.STOCK_KEYS.forEach(function (key) {
    result[key] = Math.max(0, Number(cargo && cargo[key]) || 0);
  });
  return result;
}

function ensure(state) {
  state.transport = Object.assign({ nextId: 1, orders: [], routeCondition: 'clear' }, state.transport || {});
  state.transport.nextId = Math.max(1, Number(state.transport.nextId) || 1);
  state.transport.orders = Array.isArray(state.transport.orders) ? state.transport.orders : [];
  return state.transport;
}

function create(state, definition) {
  var runtime = ensure(state);
  var origin = definition.origin || state.activeBranchId || 'changfeng';
  var destination = definition.destination || 'jiangnan';
  var cargo = copyCargo(definition.cargo);
  var originBranch;
  var id;
  branches.capture(state);
  originBranch = state.branches[origin];
  if (!originBranch || !state.branches[destination] || origin === destination) return null;
  if (runtime.orders.some(function (item) { return item.key === definition.key; })) return null;
  if (branches.STOCK_KEYS.some(function (key) { return cargo[key] > (originBranch.stock[key] || 0); })) return null;
  branches.STOCK_KEYS.forEach(function (key) {
    originBranch.stock[key] -= cargo[key];
    if (state.activeBranchId === origin) state.inventory.stock[key] = originBranch.stock[key];
  });
  id = 'transport-' + runtime.nextId;
  runtime.nextId += 1;
  runtime.orders.push({
    id: id,
    key: definition.key || id,
    origin: origin,
    destination: destination,
    cargo: cargo,
    dispatchedDay: state.calendar.day,
    arrivalDay: state.calendar.day + Math.max(1, Number(definition.days) || 1),
    status: 'in_transit',
    weatherDelay: 0,
    deliveredDay: null,
  });
  return runtime.orders[runtime.orders.length - 1];
}

function advance(state) {
  var runtime = ensure(state);
  var rainy = state.mapVariants && state.mapVariants.weather === 'rain';
  runtime.orders.forEach(function (order) {
    var target;
    if (order.status !== 'in_transit') return;
    if (rainy && !order.weatherDelay && state.calendar.day >= order.arrivalDay) {
      order.weatherDelay = 1;
      order.arrivalDay += 1;
      return;
    }
    if (state.calendar.day < order.arrivalDay) return;
    target = state.branches[order.destination];
    if (!target) {
      order.status = 'failed';
      return;
    }
    branches.STOCK_KEYS.forEach(function (key) {
      target.stock[key] = Math.max(0, Number(target.stock[key]) || 0) + (order.cargo[key] || 0);
    });
    order.status = 'delivered';
    order.deliveredDay = state.calendar.day;
  });
  return runtime.orders;
}

module.exports = { ensure: ensure, create: create, advance: advance };
