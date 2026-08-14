'use strict';

var assert = require('assert');
var store = require('../minigame/src/core/store');
var branches = require('../minigame/src/inn/branches');
var transport = require('../minigame/src/core/transport');

var state = store.freshState();
assert.strictEqual(state.version, 11);
assert.strictEqual(state.activeBranchId, 'changfeng');
state.flags['season-1-complete'] = true;
state.characters.wuchen.recruited = true;
state.party = ['zhangdeng', 'wuchen'];
state.inventory.coin = 222;
state.inn.reputation = 17;
state.inventory.stock.staple = 12;
branches.capture(state);
branches.unlock(state, 'jiangnan');

var order = transport.create(state, {
  key: 'chapter-09-provisions',
  origin: 'changfeng',
  destination: 'jiangnan',
  cargo: { staple: 3, vegetable: 1, meat: 0, tea: 1 },
  days: 1,
});
assert(order, '运输订单未创建');
assert.strictEqual(state.branches.changfeng.stock.staple, 9, '发货未扣除总店库存');
assert.strictEqual(transport.create(state, {
  key: 'chapter-09-provisions',
  origin: 'changfeng',
  destination: 'jiangnan',
  cargo: { staple: 1 },
}), null, '相同运输订单重复创建');

state.calendar.day = order.arrivalDay;
state.mapVariants.weather = 'rain';
transport.advance(state);
assert.strictEqual(order.status, 'in_transit', '雨天没有延误运输');
transport.advance(state);
assert.strictEqual(order.status, 'in_transit', '同一天不应绕过雨天延误');
state.calendar.day += 1;
transport.advance(state);
assert.strictEqual(order.status, 'delivered', '运输没有到达分店');
var delivered = state.branches.jiangnan.stock.staple;
transport.advance(state);
assert.strictEqual(state.branches.jiangnan.stock.staple, delivered, '运输重复交付');

assert(branches.switchTo(state, 'jiangnan'), '无法切换至已解锁分店');
state.inn.reputation = 6;
state.inventory.stock.tea = 8;
branches.capture(state);
assert(branches.switchTo(state, 'changfeng'), '无法返回总店');
assert.strictEqual(state.inn.reputation, 17, '分店口碑串写到总店');
assert.strictEqual(state.inventory.coin, 222, '切换分店改变了全局银两');
assert.strictEqual(state.inventory.stock.staple, 9, '总店库存恢复错误');
assert(branches.switchTo(state, 'jiangnan'));
assert.strictEqual(state.inn.reputation, 6, '分店口碑未保存');
assert.strictEqual(state.inventory.stock.tea, 8, '分店库存未保存');

var v9 = store.normalize({
  version: 9,
  screen: 'explore',
  mapId: 'inn',
  spawnId: 'main',
  position: { x: 330, y: 280 },
  activeId: 'zhangdeng',
  protagonist: 'zhangdeng',
  party: ['zhangdeng', 'wuchen'],
  characters: state.characters,
  flags: { 'season-1-complete': true },
  inventory: { coin: 99, ingredient: 10, medicine: 2, stock: { staple: 5, vegetable: 2, meat: 2, tea: 1 } },
  inn: { day: 57, reputation: 21, order: 77, menu: ['noodles'], upgrades: [] },
  campaign: { season: 2, chapter: 9, chapterDay: 1, gameDay: 57, completed: ['chapter-08'], tendencies: {}, seasonRatings: { 'season-1': { grade: 'A' } } },
});
assert.strictEqual(v9.version, 11, 'v9未迁移至v11');
assert(v9.flags['season-1-complete'], 'v9迁移丢失第一季旗标');
assert(v9.characters.wuchen.recruited, 'v9迁移丢失角色状态');
assert.strictEqual(v9.inventory.coin, 99, 'v9迁移丢失银两');
assert.strictEqual(v9.branches.changfeng.inn.reputation, 21, 'v9客栈未迁入总店');
assert.strictEqual(v9.branches.changfeng.stock.staple, 5, 'v9库存未迁入总店');

console.log('Branch compatibility validation passed: v11 migration, isolation, transport and weather delay.');
