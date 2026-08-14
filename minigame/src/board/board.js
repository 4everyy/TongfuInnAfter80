'use strict';

var definition = require('../../data/board-v1');
var campaign = require('../core/campaign');

var PHASES = ['morning', 'noon', 'noon', 'evening'];
var ROLL_DURATION = 1320;
var ROLL_REVEAL_DURATION = 300;
var EVENT_POOL = [
  { title: '茶客传名', text: '一桌远客把长风客栈的名声带去了下一站。', reputation: 1 },
  { title: '路桥修缮', text: '商路临时募钱修桥，客栈也出了一份力。', coin: -4, order: 1 },
  { title: '行商赠礼', text: '熟客送来一篮能入菜的新鲜食材。', ingredient: 2 },
  { title: '街面争执', text: '两拨车夫争道，客栈的巡查人手被临时借走。', order: -2 },
  { title: '旧客还账', text: '一笔险些忘掉的旧账终于送回柜台。', coin: 8 },
];

function baseState() {
  return {
    version: 1,
    boardId: definition.id,
    started: false,
    tileId: 'r0-0',
    lastTileId: null,
    dice: null,
    rollStartedAt: 0,
    rollingUntil: 0,
    rollDuration: ROLL_DURATION,
    rollBonus: 0,
    stepsRemaining: 0,
    moving: false,
    nextStepAt: 0,
    routeChoices: null,
    encounter: null,
    external: null,
    inLandmark: null,
    day: 1,
    turn: 1,
    turnInDay: 0,
    phase: 'morning',
    seed: 92821,
    visits: {},
    discovered: { 'r0-0': true },
    owned: {},
    npcRelations: {},
    metrics: { properties: 0, npcMeetings: 0, landmarks: 0, battles: 0, laps: 0 },
    rivals: [
      { id: 'rival-a', name: '药商队', artId: 'herbalist-qiu', tileId: 'r1-0', coin: 66, color: '#2f6f62' },
      { id: 'rival-b', name: '水路客商', artId: 'mazhuozi', tileId: 'r3-0', coin: 66, color: '#a83c2d' },
    ],
    log: ['长风客栈的第一张商路棋盘铺开了。'],
    chapterComplete: false,
  };
}

function ensure(state) {
  var base = baseState();
  if (!state.board || typeof state.board !== 'object') state.board = base;
  Object.keys(base).forEach(function (key) {
    if (state.board[key] === undefined) state.board[key] = base[key];
  });
  state.board.visits = Object.assign({}, base.visits, state.board.visits || {});
  state.board.discovered = Object.assign({}, base.discovered, state.board.discovered || {});
  state.board.owned = Object.assign({}, base.owned, state.board.owned || {});
  state.board.npcRelations = Object.assign({}, base.npcRelations, state.board.npcRelations || {});
  state.board.metrics = Object.assign({}, base.metrics, state.board.metrics || {});
  state.board.rivals = Array.isArray(state.board.rivals) ? state.board.rivals : base.rivals;
  state.board.log = Array.isArray(state.board.log) ? state.board.log : base.log;
  state.board.boardId = definition.id;
  if (!definition.tiles.some(function (tile) { return tile.id === state.board.tileId; })) state.board.tileId = 'r0-0';
  return state.board;
}

function random(board) {
  board.seed = (board.seed * 1664525 + 1013904223) >>> 0;
  return board.seed / 4294967296;
}

function pushLog(board, message) {
  board.log.unshift(message);
  if (board.log.length > 8) board.log.length = 8;
}

function recruitRole(state, id, message) {
  var character = state.characters && state.characters[id];
  if (!character || character.recruited) return false;
  campaign.recruit(state, id, message);
  pushLog(state.board, message);
  state.toast = message;
  return true;
}

function unlockBoardRoles(state, tile) {
  var board = ensure(state);
  if (board.metrics.landmarks >= 1) recruitRole(state, 'wuchen', '白展堂熟悉商路，正式加入棋局。');
  if (board.metrics.battles >= 1) recruitRole(state, 'jingzhi', '郭芙蓉认可这趟生意，成为护路伙伴。');
  if (board.metrics.npcMeetings >= 3) recruitRole(state, 'wenyan', '吕秀才整理完沿途见闻，加入经营队伍。');
  if (tile && tile.regionIndex >= 7) recruitRole(state, 'shiwei', '李大嘴在江南寻到新菜路，加入长风客栈。');
}

function change(state, key, amount) {
  if (key === 'coin' || key === 'ingredient') {
    state.inventory[key] = Math.max(0, (Number(state.inventory[key]) || 0) + amount);
  } else if (key === 'reputation' || key === 'order') {
    state.inn[key] = Math.max(0, (Number(state.inn[key]) || 0) + amount);
  }
}

function applyEffects(state, source) {
  ['coin', 'ingredient', 'reputation', 'order'].forEach(function (key) {
    if (source[key]) change(state, key, source[key]);
  });
}

function propertyToll(tile, property) {
  return Math.max(2, Math.round(tile.price * 0.24 * (property.level || 1)));
}

function npcForTile(board, tile) {
  var ids = tile.npcIds || (tile.ownerNpcId ? [tile.ownerNpcId] : []);
  var visits = Number(board.visits[tile.id]) || 0;
  return ids.length ? definition.npc(ids[visits % ids.length]) : null;
}

function resolveProperty(state, tile) {
  var board = ensure(state);
  var property = board.owned[tile.id];
  var npc = definition.npc(tile.ownerNpcId);
  if (!property) {
    board.encounter = { type: 'property', tileId: tile.id, npcId: npc.id, title: tile.label, text: npc.name + '愿意让客栈参与经营，合作需要 ' + tile.price + ' 文。', mode: 'partner' };
    return;
  }
  if (property.owner === 'player') {
    board.encounter = { type: 'property', tileId: tile.id, npcId: npc.id, title: tile.label, text: '这处产业目前为 ' + (property.level || 1) + ' 级，可继续升级经营。', mode: 'upgrade' };
    return;
  }
  var toll = propertyToll(tile, property);
  change(state, 'coin', -toll);
  var rival = board.rivals.find(function (entry) { return entry.id === property.owner; });
  if (rival) rival.coin += toll;
  board.encounter = { type: 'message', title: tile.label, text: '经过同行商队的合作产业，支付往来费用 ' + toll + ' 文。' };
}

function resolveTile(state) {
  var board = ensure(state);
  var tile = definition.tile(board.tileId);
  var event;
  var npc;
  board.moving = false;
  board.rollStartedAt = 0;
  board.rollingUntil = 0;
  board.stepsRemaining = 0;
  board.routeChoices = null;
  board.visits[tile.id] = (Number(board.visits[tile.id]) || 0) + 1;
  board.discovered[tile.id] = true;
  if (tile.type === 'property') return resolveProperty(state, tile);
  if (tile.type === 'npc') {
    npc = npcForTile(board, tile);
    board.encounter = { type: 'npc', title: npc.name, npcId: npc.id, text: npc.dialogue || '路上消息不少，掌柜不妨坐下听听。', role: npc.role };
    return;
  }
  if (tile.type === 'landmark') {
    npc = npcForTile(board, tile);
    board.encounter = { type: 'landmark', title: tile.label, tileId: tile.id, mapId: tile.mapId, npcId: npc && npc.id, text: '这里可以进入原场景自由调查，也可以继续赶路。' };
    return;
  }
  if (tile.type === 'battle') {
    board.encounter = { type: 'battle', title: tile.label, battleId: tile.regionIndex >= 2 ? 'bridge_ruffians' : 'training', text: '商路被人拦住，准备队伍后可以迎战。' };
    return;
  }
  if (tile.type === 'supply') {
    change(state, 'ingredient', 2);
    board.encounter = { type: 'message', title: '沿途补给', text: '找到两份可用食材，已经送入客栈库存。' };
    return;
  }
  if (tile.type === 'chance') {
    board.rollBonus = Math.min(4, (board.rollBonus || 0) + 2);
    board.encounter = { type: 'message', title: '驿马捷报', text: '下一次掷骰额外前进 2 格。' };
    return;
  }
  if (tile.type === 'rest') {
    Object.keys(state.characters || {}).forEach(function (id) {
      var role = state.characters[id];
      if (role && role.recruited) role.energy = Math.min(100, (Number(role.energy) || 0) + 8);
    });
    board.encounter = { type: 'message', title: '茶棚歇脚', text: '队伍恢复了精力，下一程可以走得更稳。' };
    return;
  }
  event = EVENT_POOL[Math.floor(random(board) * EVENT_POOL.length)];
  applyEffects(state, event);
  board.encounter = { type: 'message', title: event.title, text: event.text };
}

function moveOne(board, targetId) {
  board.lastTileId = board.tileId;
  board.tileId = targetId;
  board.discovered[targetId] = true;
  board.stepsRemaining = Math.max(0, board.stepsRemaining - 1);
  if (targetId.slice(0, 2) === 'r0' && board.lastTileId && board.lastTileId.slice(0, 2) !== 'r0') board.metrics.laps += 1;
}

function update(state, now) {
  var board = ensure(state);
  var tile;
  var next;
  if (!board.moving || board.encounter || board.external || board.routeChoices) return false;
  if ((now || Date.now()) < board.nextStepAt) return false;
  if (board.stepsRemaining <= 0) {
    resolveTile(state);
    return true;
  }
  tile = definition.tile(board.tileId);
  next = tile.next || [];
  if (next.length > 1) {
    board.routeChoices = next.slice();
    board.moving = false;
    return true;
  }
  board.rollStartedAt = 0;
  board.rollingUntil = 0;
  moveOne(board, next[0]);
  board.nextStepAt = (now || Date.now()) + 180;
  if (board.stepsRemaining <= 0) resolveTile(state);
  return true;
}

function roll(state) {
  var board = ensure(state);
  var now = Date.now();
  if (board.moving || board.encounter || board.external || board.routeChoices || board.chapterComplete) return false;
  board.dice = 1 + Math.floor(random(board) * 6);
  board.stepsRemaining = board.dice + (board.rollBonus || 0);
  board.rollBonus = 0;
  board.moving = true;
  board.rollStartedAt = now;
  board.rollDuration = ROLL_DURATION;
  board.rollingUntil = now + ROLL_DURATION;
  board.nextStepAt = board.rollingUntil + ROLL_REVEAL_DURATION;
  pushLog(board, '佟湘玉掷出 ' + board.dice + ' 点，开始沿商路前进。');
  return true;
}

function chooseRoute(state, tileId) {
  var board = ensure(state);
  if (!board.routeChoices || board.routeChoices.indexOf(tileId) < 0) return false;
  moveOne(board, tileId);
  board.routeChoices = null;
  board.moving = true;
  board.nextStepAt = Date.now() + 180;
  if (board.stepsRemaining <= 0) resolveTile(state);
  return true;
}

function moveRival(state, rival) {
  var board = ensure(state);
  var steps = 1 + Math.floor(random(board) * 6);
  var tile;
  var property;
  var toll;
  while (steps > 0) {
    tile = definition.tile(rival.tileId);
    rival.tileId = tile.next[Math.floor(random(board) * tile.next.length)];
    steps -= 1;
  }
  tile = definition.tile(rival.tileId);
  if (tile.type !== 'property') return;
  property = board.owned[tile.id];
  if (!property && rival.coin >= tile.price) {
    rival.coin -= tile.price;
    board.owned[tile.id] = { owner: rival.id, level: 1 };
    pushLog(board, rival.name + '与' + tile.label + '达成了合作。');
  } else if (property && property.owner === 'player') {
    toll = Math.min(rival.coin, propertyToll(tile, property));
    rival.coin -= toll;
    change(state, 'coin', toll);
    pushLog(board, rival.name + '经过你的' + tile.label + '，客栈入账 ' + toll + ' 文。');
  }
}

function settleDay(state) {
  var board = ensure(state);
  var income = Object.keys(board.owned).filter(function (id) { return board.owned[id].owner === 'player'; }).reduce(function (sum, id) {
    return sum + 2 * (board.owned[id].level || 1);
  }, 0);
  income += Math.max(0, Math.floor((Number(state.inn.reputation) || 0) / 3));
  change(state, 'coin', income);
  state.inn.day = board.day;
  state.calendar.day = board.day;
  pushLog(board, '第 ' + (board.day - 1) + ' 日结算，合作产业带来 ' + income + ' 文。');
}

function checkChapter(state) {
  var board = ensure(state);
  if (board.chapterComplete) return;
  if (board.day >= 3 && board.metrics.properties >= 3 && board.metrics.npcMeetings >= 3 && board.metrics.landmarks >= 2) {
    board.chapterComplete = true;
    board.encounter = { type: 'complete', title: '商路初成', text: '客栈已经在四条商路上站稳脚跟。96格序章棋盘完成，天下商路即将继续展开。' };
  }
}

function endTurn(state) {
  var board = ensure(state);
  board.rivals.forEach(function (rival) { moveRival(state, rival); });
  board.turn += 1;
  board.turnInDay += 1;
  if (board.turnInDay >= PHASES.length) {
    board.turnInDay = 0;
    board.day += 1;
    settleDay(state);
  }
  board.phase = PHASES[board.turnInDay];
  state.worldTime.day = board.day;
  state.worldTime.phase = board.phase === 'noon' ? 'noon' : board.phase;
  state.calendar.day = board.day;
  state.calendar.phase = state.worldTime.phase;
  board.dice = null;
  board.encounter = null;
  checkChapter(state);
}

function resolveAction(state, id) {
  var board = ensure(state);
  var encounter = board.encounter;
  var tile;
  var property;
  var cost;
  if (!encounter) return null;
  tile = encounter.tileId ? definition.tile(encounter.tileId) : definition.tile(board.tileId);
  if (id === 'partner' && encounter.type === 'property' && !board.owned[tile.id]) {
    if (state.inventory.coin < tile.price) {
      state.toast = '银两不足，还差 ' + (tile.price - state.inventory.coin) + ' 文。';
      return null;
    }
    change(state, 'coin', -tile.price);
    board.owned[tile.id] = { owner: 'player', level: 1 };
    board.metrics.properties += 1;
    pushLog(board, '长风客栈与' + tile.label + '达成合作。');
    endTurn(state);
    return null;
  }
  if (id === 'upgrade' && encounter.type === 'property') {
    property = board.owned[tile.id];
    cost = tile.price + (property.level || 1) * 8;
    if (state.inventory.coin < cost) {
      state.toast = '升级需要 ' + cost + ' 文。';
      return null;
    }
    change(state, 'coin', -cost);
    property.level = Math.min(3, (property.level || 1) + 1);
    pushLog(board, tile.label + '提升到 ' + property.level + ' 级。');
    endTurn(state);
    return null;
  }
  if (id === 'talk' && encounter.type === 'npc') {
    board.npcRelations[encounter.npcId] = (board.npcRelations[encounter.npcId] || 0) + 1;
    board.metrics.npcMeetings += 1;
    change(state, 'reputation', 1);
    pushLog(board, '结识了' + encounter.title + '，客栈口碑有所提升。');
    unlockBoardRoles(state, tile);
    endTurn(state);
    return null;
  }
  if (id === 'trade' && encounter.type === 'npc') {
    if (state.inventory.coin < 3) {
      state.toast = '至少需要 3 文才能交换物资。';
      return null;
    }
    change(state, 'coin', -3);
    change(state, 'ingredient', 2);
    board.metrics.npcMeetings += 1;
    endTurn(state);
    return null;
  }
  if (id === 'landmark' && encounter.type === 'landmark') {
    board.external = { type: 'landmark', tileId: tile.id, mapId: encounter.mapId };
    board.inLandmark = { tileId: tile.id, mapId: encounter.mapId };
    board.encounter = null;
    return { kind: 'landmark', mapId: encounter.mapId };
  }
  if (id === 'battle' && encounter.type === 'battle') {
    board.external = { type: 'battle', tileId: tile.id, battleId: encounter.battleId };
    board.encounter = null;
    return { kind: 'battle', battleId: encounter.battleId };
  }
  if (id === 'continue' || id === 'skip') {
    endTurn(state);
    return null;
  }
  return null;
}

function completeExternal(state, type, success) {
  var board = ensure(state);
  var tile;
  if (!board.external || board.external.type !== type) return false;
  tile = definition.tile(board.external.tileId);
  if (type === 'landmark') board.metrics.landmarks += 1;
  if (type === 'battle' && success !== false) board.metrics.battles += 1;
  unlockBoardRoles(state, tile);
  board.external = null;
  board.inLandmark = null;
  state.screen = 'board';
  state.mode = 'board';
  endTurn(state);
  return true;
}

function placeFromMap(state, mapId) {
  var board = ensure(state);
  if (definition.mapToTile[mapId]) board.tileId = definition.mapToTile[mapId];
  board.discovered[board.tileId] = true;
}

function start(state) {
  var board = ensure(state);
  board.started = true;
  board.boardId = definition.id;
  state.screen = 'board';
  state.mode = 'board';
  state.protagonist = 'zhangdeng';
  state.activeId = 'zhangdeng';
  state.toast = '掷骰启程，在商路上经营长风客栈。';
  return board;
}

function dispatch(state, action) {
  if (!action) return null;
  if (action.type === 'boardRoll') return roll(state);
  if (action.type === 'boardRoute') return chooseRoute(state, action.tileId);
  if (action.type === 'boardResolve') return resolveAction(state, action.id);
  if (action.type === 'boardReturn') return { kind: 'return-board' };
  return null;
}

module.exports = {
  definition: definition,
  fresh: baseState,
  ensure: ensure,
  start: start,
  update: update,
  dispatch: dispatch,
  completeExternal: completeExternal,
  placeFromMap: placeFromMap,
  currentTile: function (state) { return definition.tile(ensure(state).tileId); },
};
