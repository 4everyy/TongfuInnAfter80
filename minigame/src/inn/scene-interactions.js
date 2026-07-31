'use strict';

var definitions = require('../../data/inn-interactions');
var management = require('./inn');
var content = require('../../data/content');

var MICRO_PREP_IDS = {
  purchase: 'purchase',
  prepare: 'prepare',
  clean: 'clean',
  promote: 'promote',
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function find(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id) return list[index];
  }
  return null;
}

function branchMapId(state) {
  return state.activeBranchId === 'jiangnan' ? 'jiangnan_branch' : 'inn';
}

function map(id) {
  return find(content.maps, id) || content.maps[0];
}

function ensureScenePosition(state, mapId) {
  var current = map(mapId);
  var spawn = current.spawns.recovery || current.spawns.main;
  if (state.mapId !== mapId || !state.position) {
    state.mapId = mapId;
    state.spawnId = current.spawns.recovery ? 'recovery' : 'main';
    state.position = { x: spawn.x, y: spawn.y };
    state.velocity = { x: 0, y: 0 };
    state.facing = spawn.facing || 'right';
    state.moving = false;
  }
}

function defaultState() {
  return {
    selectedObjectId: null,
    activePage: null,
    microGame: null,
    serviceOpen: false,
    seenObjects: [],
    mastery: { purchase: 0, prepare: 0, clean: 0, promote: 0, ledger: 0 },
    guestFocus: 'regular',
    lastObjectId: null,
  };
}

function ensure(state) {
  var base = defaultState();
  state.innScene = Object.assign(base, state.innScene || {});
  state.innScene.seenObjects = Array.isArray(state.innScene.seenObjects)
    ? state.innScene.seenObjects
    : [];
  state.innScene.mastery = Object.assign(base.mastery, state.innScene.mastery || {});
  if (state.screen === 'inn') {
    state.screen = 'explore';
    state.mode = 'explore';
    ensureScenePosition(state, branchMapId(state));
    if (state.managementView && state.managementView !== 'scene') {
      state.innScene.activePage = state.managementView;
    }
  }
  return state.innScene;
}

function isBusinessMap(state) {
  return state.mapId === 'inn' || state.mapId === 'yard' || state.mapId === 'jiangnan_branch';
}

function objects(state) {
  ensure(state);
  return definitions.objectsForMap(state.mapId);
}

function serviceObjectRole(state) {
  var step = management.currentServiceStep(state);
  var event;
  var jobs = [];
  if (!step) return null;
  if (step.kind === 'minigame') {
    if (step.id === 'ledger') return 'counter';
    if (step.id === 'rooms') return 'rooms';
    if (step.id === 'order') return 'hall';
    return 'kitchen';
  }
  event = management.data.serviceEvents[step.id];
  (event && event.choices || []).forEach(function (choice) {
    if (choice.job && jobs.indexOf(choice.job) < 0) jobs.push(choice.job);
  });
  if (jobs.indexOf('kitchen') >= 0) return 'kitchen';
  if (jobs.indexOf('rooms') >= 0) return 'rooms';
  if (jobs.indexOf('patrol') >= 0) return 'door';
  if (jobs.indexOf('ledger') >= 0 || jobs.indexOf('counter') >= 0) return 'counter';
  return 'hall';
}

function actionLockedReason(state, action) {
  var phase = state.calendar && state.calendar.phase || 'morning';
  if (action.phases && action.phases.indexOf(phase) < 0) {
    if (phase === 'noon') return '午市进行中，请先处理场景里的客人事务。';
    if (phase === 'evening') return '这项安排需要等到次日早晨。';
    return '这项安排要在其他时段处理。';
  }
  if (action.id === 'settle' && state.service && !state.service.completed) return '三轮客流尚未处理完。';
  if (action.id === 'open' && state.dailyPlan && !state.dailyPlan.menu.length) return '请先在灶台选择今日菜单。';
  return '';
}

function actionsForObject(state, object) {
  var phase = state.calendar && state.calendar.phase || 'morning';
  var result = [];
  var serviceRole = serviceObjectRole(state);
  if (phase === 'noon') {
    if (serviceRole === object.role) result.push(copy(definitions.action('service')));
    return result;
  }
  object.actions.forEach(function (id) {
    var action = definitions.action(id);
    if (!action) return;
    action = copy(action);
    action.lockedReason = actionLockedReason(state, action);
    if (!action.phases || action.phases.indexOf(phase) >= 0 || action.lockedReason) result.push(action);
  });
  return result;
}

function attention(state, object) {
  var phase = state.calendar && state.calendar.phase || 'morning';
  if (phase === 'noon') return serviceObjectRole(state) === object.role ? 'urgent' : 'idle';
  if (object.role === 'door' && phase === 'morning') return 'ready';
  if (object.role === 'counter' && phase === 'evening') return 'ready';
  if (object.role === 'notice' && state.sideQuests && state.sideQuests.activeId) return 'urgent';
  if (object.role === 'rooms' && state.inn.roomState && state.inn.roomState.some(function (room) {
    return room.cleanliness < 55 || room.eventId;
  })) return 'urgent';
  if (object.role === 'supply' && state.inventory && state.inventory.ingredient < 6) return 'urgent';
  return 'idle';
}

function selectObject(state, id) {
  var scene = ensure(state);
  var object = find(objects(state), id);
  if (!object) return false;
  scene.selectedObjectId = id;
  scene.lastObjectId = id;
  if (scene.seenObjects.indexOf(id) < 0) scene.seenObjects.push(id);
  return true;
}

function closeSceneUi(state) {
  var scene = ensure(state);
  scene.selectedObjectId = null;
  scene.activePage = null;
  scene.microGame = null;
  scene.serviceOpen = false;
  state.managementView = 'scene';
  return true;
}

function startMicroGame(state, id) {
  var scene = ensure(state);
  var mastery = Number(scene.mastery[id]) || 0;
  if (mastery >= 3 && id !== 'purchase') {
    if (management.dispatch(state, { type: 'prep', id: MICRO_PREP_IDS[id] })) {
      state.toast = '熟练完成：' + definitions.action(id).label + '。';
      return true;
    }
    return false;
  }
  scene.microGame = {
    id: id,
    startedAt: Date.now(),
    step: 0,
    mistakes: 0,
    cleared: [],
    sequence: id === 'prepare' ? ['staple', 'vegetable', 'meat'] : [],
  };
  scene.selectedObjectId = null;
  return true;
}

function finishMicroGame(state, variant) {
  var scene = ensure(state);
  var game = scene.microGame;
  var elapsed;
  var perfect;
  var succeeded;
  if (!game) return false;
  elapsed = Date.now() - game.startedAt;
  perfect = game.mistakes === 0 && elapsed <= 7000;
  succeeded = management.dispatch(state, {
    type: 'prep',
    id: MICRO_PREP_IDS[game.id],
    variant: variant || null,
  });
  if (succeeded) {
    if (perfect) scene.mastery[game.id] = Math.min(3, (Number(scene.mastery[game.id]) || 0) + 1);
    state.toast = (perfect ? '利落完成：' : '完成：') + definitions.action(game.id).label
      + (perfect && scene.mastery[game.id] >= 3 ? '，以后可快速处理。' : '。');
  }
  scene.microGame = null;
  return succeeded;
}

function microChoice(state, action) {
  var scene = ensure(state);
  var game = scene.microGame;
  var expected;
  if (!game) return false;
  if (game.id === 'purchase') return finishMicroGame(state, action.choice || 'balanced');
  if (game.id === 'prepare') {
    expected = game.sequence[game.step];
    if (action.choice !== expected) {
      game.mistakes += 1;
      state.toast = '顺序不对，先看案板上的备菜次序。';
      return false;
    }
    game.step += 1;
    if (game.step >= game.sequence.length) return finishMicroGame(state);
    return true;
  }
  if (game.id === 'clean') {
    if (game.cleared.indexOf(action.choice) >= 0) return false;
    game.cleared.push(action.choice);
    if (game.cleared.length >= 3) return finishMicroGame(state);
    return true;
  }
  if (game.id === 'promote') {
    if (action.kind === 'beat') {
      game.step += 1;
      if (game.step >= 3) game.awaitingFocus = true;
      return true;
    }
    if (game.awaitingFocus && action.kind === 'focus') {
      scene.guestFocus = action.choice || 'regular';
      state.dailyPlan.guestFocus = scene.guestFocus;
      return finishMicroGame(state);
    }
  }
  return false;
}

function openPage(state, page) {
  var scene = ensure(state);
  scene.activePage = page;
  scene.selectedObjectId = null;
  state.managementView = page;
  return true;
}

function runObjectAction(state, id) {
  var scene = ensure(state);
  var object = find(objects(state), scene.selectedObjectId);
  var action = definitions.action(id);
  var available;
  if (!object || !action) return false;
  available = actionsForObject(state, object).some(function (item) { return item.id === id; });
  if (!available) return false;
  if (actionLockedReason(state, action)) {
    state.toast = actionLockedReason(state, action);
    return false;
  }
  if (action.kind === 'page') return openPage(state, action.page);
  if (action.kind === 'micro') return startMicroGame(state, action.microGame);
  if (action.kind === 'service') {
    scene.serviceOpen = true;
    scene.selectedObjectId = null;
    return true;
  }
  if (action.kind === 'dispatch') {
    if (!management.dispatch(state, action.action)) return false;
    scene.selectedObjectId = null;
    if (id === 'open') scene.activePage = null;
    return true;
  }
  return false;
}

function dispatch(state, action) {
  var scene = ensure(state);
  if (!action) return false;
  if (action.type === 'innObjectSelect') return selectObject(state, action.id);
  if (action.type === 'innSceneDismiss') {
    scene.selectedObjectId = null;
    scene.serviceOpen = false;
    return true;
  }
  if (action.type === 'innObjectAction') return runObjectAction(state, action.id);
  if (action.type === 'innMicroStart') return startMicroGame(state, action.id);
  if (action.type === 'innPageClose' || action.type === 'managementSceneBack') return closeSceneUi(state);
  if (action.type === 'innMicroCancel') {
    scene.microGame = null;
    return true;
  }
  if (action.type === 'innMicroChoice') return microChoice(state, action);
  if (action.type === 'innServiceClose') {
    scene.serviceOpen = false;
    return true;
  }
  if (action.type === 'innServiceChoice') {
    if (action.kind === 'minigame') management.dispatch(state, { type: 'miniGameChoice', index: action.index });
    else management.dispatch(state, { type: 'serviceChoice', index: action.index });
    scene.serviceOpen = false;
    return true;
  }
  if (action.type === 'innCharacterSelect') {
    state.managementRoleId = action.id;
    return openPage(state, 'character');
  }
  return false;
}

module.exports = {
  ensure: ensure,
  isBusinessMap: isBusinessMap,
  branchMapId: branchMapId,
  objects: objects,
  actionsForObject: actionsForObject,
  serviceObjectRole: serviceObjectRole,
  attention: attention,
  dispatch: dispatch,
  closeSceneUi: closeSceneUi,
};
