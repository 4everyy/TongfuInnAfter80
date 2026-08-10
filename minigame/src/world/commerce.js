'use strict';

var data = require('../../data/commerce');

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function ensure(state) {
  var base = state.commerce && typeof state.commerce === 'object' ? state.commerce : {};
  state.commerce = base;
  base.owned = base.owned && typeof base.owned === 'object' ? base.owned : {};
  base.dailyPurchases = base.dailyPurchases && typeof base.dailyPurchases === 'object' ? base.dailyPurchases : {};
  base.lastShopId = base.lastShopId || null;
  base.totalSpent = Math.max(0, number(base.totalSpent, 0));
  Object.keys(state.characters || {}).forEach(function (roleId) {
    var character = state.characters[roleId];
    if (!character.equipment || typeof character.equipment !== 'object') character.equipment = {};
    if (!Object.prototype.hasOwnProperty.call(character.equipment, 'weapon')) character.equipment.weapon = null;
    if (!Object.prototype.hasOwnProperty.call(character.equipment, 'accessory')) character.equipment.accessory = null;
  });
  return base;
}

function item(id) {
  return data.items[id] || null;
}

function shop(id) {
  return data.shops[id] || null;
}

function currentDay(state) {
  return Math.max(1, number(state.calendar && state.calendar.day, number(state.worldTime && state.worldTime.day, 1)));
}

function purchaseKey(state, shopId, itemId) {
  return currentDay(state) + ':' + shopId + ':' + itemId;
}

function chapterUnlocked(state, definition) {
  return Math.max(1, number(state.campaign && state.campaign.chapter, 1)) >= Math.max(1, number(definition.chapter, 1));
}

function owned(state, itemId) {
  ensure(state);
  return Math.max(0, number(state.commerce.owned[itemId], 0));
}

function equippedBy(state, itemId) {
  var result = null;
  Object.keys(state.characters || {}).some(function (roleId) {
    var equipment = state.characters[roleId].equipment || {};
    if (equipment.weapon === itemId || equipment.accessory === itemId) {
      result = roleId;
      return true;
    }
    return false;
  });
  return result;
}

function availableRoles(state) {
  return Object.keys(state.characters || {}).filter(function (roleId) {
    var roleState = state.characters[roleId];
    return roleId === 'zhangdeng' || roleState.recruited || roleState.temporary;
  });
}

function bonusForItem(itemId) {
  var definition = item(itemId);
  return definition && definition.bonuses || {};
}

function bonuses(state, roleId) {
  ensure(state);
  var equipment = state.characters[roleId] && state.characters[roleId].equipment || {};
  var total = { hp: 0, qi: 0, attack: 0, speed: 0 };
  ['weapon', 'accessory'].forEach(function (slot) {
    var source = bonusForItem(equipment[slot]);
    Object.keys(total).forEach(function (key) { total[key] += number(source[key], 0); });
  });
  return total;
}

function applyBonusDelta(character, previous, next) {
  character.hp = Math.max(1, number(character.hp, 1) + next.hp - previous.hp);
  character.qi = Math.max(0, number(character.qi, 0) + next.qi - previous.qi);
}

function equip(state, roleId, itemId) {
  var definition = item(itemId);
  var character;
  var previous;
  var next;
  if (!definition || definition.kind !== 'equipment' || !owned(state, itemId)) return false;
  character = state.characters[roleId];
  if (!character || availableRoles(state).indexOf(roleId) < 0) return false;
  previous = bonuses(state, roleId);
  Object.keys(state.characters).forEach(function (id) {
    var equipment = state.characters[id].equipment;
    var ownerBefore;
    var ownerAfter;
    if (id === roleId || equipment[definition.slot] !== itemId) return;
    ownerBefore = bonuses(state, id);
    equipment[definition.slot] = null;
    ownerAfter = bonuses(state, id);
    applyBonusDelta(state.characters[id], ownerBefore, ownerAfter);
  });
  character.equipment[definition.slot] = itemId;
  next = bonuses(state, roleId);
  applyBonusDelta(character, previous, next);
  state.toast = definition.name + '已交给当前选择的角色使用。';
  return true;
}

function changeStock(state, changes) {
  var stock = state.inventory.stock || (state.inventory.stock = { staple: 0, vegetable: 0, meat: 0, tea: 0 });
  Object.keys(changes || {}).forEach(function (key) {
    stock[key] = Math.max(0, number(stock[key], 0) + number(changes[key], 0));
  });
  state.inventory.ingredient = Object.keys(stock).reduce(function (total, key) { return total + number(stock[key], 0); }, 0);
}

function applySupply(state, definition) {
  var effects = definition.effects || {};
  if (effects.medicine) state.inventory.medicine = Math.max(0, number(state.inventory.medicine, 0) + effects.medicine);
  if (effects.stock) changeStock(state, effects.stock);
}

function canBuy(state, shopId, itemId) {
  var definition = item(itemId);
  var store = shop(shopId);
  var count;
  if (!definition || !store || store.items.indexOf(itemId) < 0) return { ok: false, reason: '这件货物不在当前店铺。' };
  if (!chapterUnlocked(state, definition)) return { ok: false, reason: '第 ' + definition.chapter + ' 章后才会进货。' };
  if (definition.kind === 'equipment' && owned(state, itemId)) return { ok: false, reason: '这件装备已经买过了。' };
  count = number(ensure(state).dailyPurchases[purchaseKey(state, shopId, itemId)], 0);
  if (definition.dailyLimit && count >= definition.dailyLimit) return { ok: false, reason: '今日已经售罄。' };
  if (number(state.inventory && state.inventory.coin, 0) < definition.price) {
    return { ok: false, reason: '银两不足，还差 ' + (definition.price - number(state.inventory && state.inventory.coin, 0)) + ' 文。' };
  }
  return { ok: true };
}

function buy(state, shopId, itemId, roleId) {
  var status = canBuy(state, shopId, itemId);
  var definition = item(itemId);
  var key;
  if (!status.ok) {
    state.toast = status.reason;
    return false;
  }
  ensure(state);
  state.inventory.coin -= definition.price;
  state.commerce.totalSpent += definition.price;
  key = purchaseKey(state, shopId, itemId);
  state.commerce.dailyPurchases[key] = number(state.commerce.dailyPurchases[key], 0) + 1;
  if (definition.kind === 'supply') {
    applySupply(state, definition);
    state.toast = '买下' + definition.name + '，已经归入客栈物资。';
  } else {
    state.commerce.owned[itemId] = 1;
    equip(state, roleId || 'zhangdeng', itemId);
  }
  return true;
}

function open(state, shopId) {
  var store = shop(shopId);
  var roles;
  if (!store) return false;
  ensure(state);
  roles = availableRoles(state);
  state.commerce.lastShopId = shopId;
  state.modal = { type: 'shop', shopId: shopId, roleId: roles.indexOf('zhangdeng') >= 0 ? 'zhangdeng' : roles[0] };
  return true;
}

function dispatch(state, action) {
  var modal = state.modal;
  if (!action) return false;
  if (action.type === 'shopOpen') return open(state, action.id);
  if (!modal || modal.type !== 'shop') return false;
  if (action.type === 'shopRole' && availableRoles(state).indexOf(action.id) >= 0) {
    modal.roleId = action.id;
    return true;
  }
  if (action.type === 'shopBuy') return buy(state, modal.shopId, action.id, modal.roleId);
  if (action.type === 'shopEquip') return equip(state, modal.roleId, action.id);
  return false;
}

module.exports = {
  data: data,
  ensure: ensure,
  open: open,
  dispatch: dispatch,
  buy: buy,
  equip: equip,
  owned: owned,
  equippedBy: equippedBy,
  availableRoles: availableRoles,
  bonuses: bonuses,
  chapterUnlocked: chapterUnlocked,
  canBuy: canBuy,
};
