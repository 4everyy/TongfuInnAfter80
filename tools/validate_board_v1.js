'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

global.wx = global.wx || {
  getStorageSync: function () { return null; },
  setStorageSync: function () {},
  removeStorageSync: function () {},
};

var definition = require('../minigame/data/board-v1');
var boardSystem = require('../minigame/src/board/board');
var store = require('../minigame/src/core/store');
var content = require('../minigame/data/content');
var artManifest = require('../minigame/assets/art/manifest');

function unique(values) {
  return values.filter(function (value, index) { return values.indexOf(value) === index; });
}

function reachable(startId) {
  var seen = {};
  var queue = [startId];
  while (queue.length) {
    var id = queue.shift();
    if (seen[id]) continue;
    seen[id] = true;
    definition.tile(id).next.forEach(function (nextId) {
      if (!seen[nextId]) queue.push(nextId);
    });
  }
  return Object.keys(seen);
}

function assignedNpcIds() {
  var ids = [];
  definition.tiles.forEach(function (tile) {
    if (tile.ownerNpcId) ids.push(tile.ownerNpcId);
    (tile.npcIds || []).forEach(function (id) { ids.push(id); });
  });
  return ids;
}

assert.strictEqual(definition.tiles.length, 288, '天下棋盘必须为 288 格');
assert(artManifest.board && artManifest.board.background, '棋盘缺少武侠背景登记');
assert(fs.existsSync(path.resolve(__dirname, '..', 'minigame', artManifest.root, artManifest.board.background)), '棋盘武侠背景资源不存在');
assert.strictEqual(definition.regions.length, 9, '天下棋盘必须包含九个区域');
definition.regions.forEach(function (region) {
  assert.strictEqual(definition.tiles.filter(function (tile) { return tile.regionId === region.id; }).length, 32, region.name + ' 必须包含 32 格');
});
assert.strictEqual(definition.tiles.filter(function (tile) { return tile.type === 'landmark'; }).length, 27, '27 张现有地图必须全部成为独立地标');

assert.strictEqual(unique(definition.tiles.map(function (tile) { return tile.id; })).length, 288, '棋格 ID 必须唯一');
definition.tiles.forEach(function (tile) {
  assert(tile.next && tile.next.length, tile.id + ' 缺少后继路线');
  tile.next.forEach(function (nextId) { assert(definition.tile(nextId).id === nextId, tile.id + ' 指向不存在的棋格 ' + nextId); });
});
assert.strictEqual(reachable('r0-0').length, 288, '288 格必须从起点全部可达');

var assigned = definition.tiles.filter(function (tile) { return tile.type === 'property'; }).map(function (tile) { return tile.ownerNpcId; });
assert.strictEqual(assigned.length, definition.allNpcs.length, '产业经营者数量不一致');
assert.strictEqual(unique(assigned).length, assigned.length, '每名 NPC 必须拥有独立产业落点');
definition.allNpcs.forEach(function (npc) {
  assert(assigned.indexOf(npc.id) >= 0, 'NPC 未接入棋盘：' + npc.id);
});

var mapIds = content.maps.map(function (map) { return map.id; });
definition.tiles.filter(function (tile) { return tile.type === 'landmark'; }).forEach(function (tile) {
  assert(mapIds.indexOf(tile.mapId) >= 0, '地标地图不存在：' + tile.mapId);
});

var state = store.freshState();
boardSystem.start(state);
assert.strictEqual(state.screen, 'board');
assert.strictEqual(state.party.length, 1, '新棋局必须由主角单人开局');
assert.strictEqual(state.party[0], 'zhangdeng');

var rollState = store.freshState();
boardSystem.start(rollState);
var rollOrigin = rollState.board.tileId;
boardSystem.dispatch(rollState, { type: 'boardRoll' });
assert(rollState.board.rollingUntil - rollState.board.rollStartedAt >= 1300, '骰子翻滚演出短于 1.3 秒');
assert(rollState.board.nextStepAt - rollState.board.rollStartedAt >= 1600, '点数揭晓前就开始移动');
boardSystem.update(rollState, rollState.board.rollStartedAt + 600);
assert.strictEqual(rollState.board.tileId, rollOrigin, '骰子尚未落定时棋子已经移动');

for (var turn = 0; turn < 24; turn += 1) {
  if (state.board.chapterComplete) break;
  if (state.board.encounter) {
    var encounter = state.board.encounter;
    var action = 'continue';
    if (encounter.type === 'property') action = state.inventory.coin >= definition.tile(encounter.tileId).price ? 'partner' : 'skip';
    if (encounter.type === 'npc') action = 'talk';
    if (encounter.type === 'landmark') action = 'landmark';
    if (encounter.type === 'battle') action = 'battle';
    var external = boardSystem.dispatch(state, { type: 'boardResolve', id: action });
    if (external && external.kind === 'landmark') boardSystem.completeExternal(state, 'landmark', true);
    if (external && external.kind === 'battle') boardSystem.completeExternal(state, 'battle', true);
    continue;
  }
  if (state.board.routeChoices) {
    boardSystem.dispatch(state, { type: 'boardRoute', tileId: state.board.routeChoices[0] });
    continue;
  }
  if (!state.board.moving) boardSystem.dispatch(state, { type: 'boardRoll' });
  state.board.nextStepAt = 0;
  boardSystem.update(state, Date.now() + turn * 1000);
}
assert(state.board.turn > 1, '棋盘回合没有推进');
assert(state.inventory.coin >= 0, '银两不得为负数');
assert(state.inventory.ingredient >= 0, '食材不得为负数');

var legacy = store.freshState();
legacy.version = 10;
legacy.screen = 'explore';
legacy.mapId = 'jiangnan_dock';
delete legacy.board;
var migrated = store.normalize(legacy);
assert.strictEqual(migrated.version, 11);
assert.strictEqual(migrated.screen, 'board');
assert.strictEqual(migrated.board.tileId, definition.mapToTile.jiangnan_dock);
assert.strictEqual(migrated.inventory.coin, legacy.inventory.coin);

var recruitState = store.freshState();
boardSystem.start(recruitState);
recruitState.board.external = { type: 'landmark', tileId: 'r0-0', mapId: 'inn' };
boardSystem.completeExternal(recruitState, 'landmark', true);
assert(recruitState.characters.wuchen.recruited, '首次地标后未解锁白展堂');
recruitState.board.external = { type: 'battle', tileId: 'r0-8', battleId: 'training' };
boardSystem.completeExternal(recruitState, 'battle', true);
assert(recruitState.characters.jingzhi.recruited, '首次护路战后未解锁郭芙蓉');
recruitState.board.metrics.npcMeetings = 2;
recruitState.board.tileId = 'r0-2';
recruitState.board.encounter = { type: 'npc', tileId: 'r0-2', npcId: definition.tile('r0-2').npcIds[0], title: '来客' };
boardSystem.dispatch(recruitState, { type: 'boardResolve', id: 'talk' });
assert(recruitState.characters.wenyan.recruited, '结识三名 NPC 后未解锁吕秀才');
recruitState.board.external = { type: 'landmark', tileId: 'r7-0', mapId: 'jiangnan_branch' };
boardSystem.completeExternal(recruitState, 'landmark', true);
assert(recruitState.characters.shiwei.recruited, '抵达江南后未解锁李大嘴');

var interrupted = store.freshState();
boardSystem.start(interrupted);
interrupted.board.external = { type: 'battle', tileId: 'r0-8', battleId: 'training' };
var resumed = store.normalize(interrupted);
assert.strictEqual(resumed.screen, 'board');
assert.strictEqual(resumed.board.external, null);
assert.strictEqual(resumed.board.encounter.type, 'battle', '中断战斗没有恢复为可重新选择的棋格事件');

console.log('Board v1 validation passed: 288 tiles, 9 regions, ' + assigned.length + ' NPC owners, 27 landmark scenes.');
