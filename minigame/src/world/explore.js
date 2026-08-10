const { maps, chapter, deepChapters } = require('../../data/content');
const doorwayCrisis = require('../../data/doorway-crisis');
const presentation = require('../../data/presentation');
const branches = require('../inn/branches');

const MOVE_SPEED = 150;
const COLLISION_RADIUS = 14;
const COLLISION_RADIUS_X = 13;
const COLLISION_RADIUS_Y = 8;
const MAX_MOVE_STEP = 6;
const TRAIL_STEP = 10;
const FOLLOW_DISTANCE = 42;
const TYPE_PRIORITY = {
  battle: 90,
  dialogue: 80,
  cookingTrial: 78,
  investigate: 70,
  mechanism: 68,
  repair: 66,
  escort: 64,
  collect: 60,
  loot: 58,
  recipeSample: 56,
  inn: 50,
  crisis: 48,
};

function map(id) {
  return maps.find((item) => item.id === id) || maps[0];
}

function hasFlags(state, flags) {
  return (flags || []).every((flag) => !!state.flags[flag]);
}

function conditionsMet(item, state) {
  return hasFlags(state, item.requires) && !(item.unless || []).some((flag) => !!state.flags[flag]);
}

function ensureMapAccess(state) {
  if (!state.visitedMaps || typeof state.visitedMaps !== 'object') state.visitedMaps = {};
  if (!state.unlockedMaps || typeof state.unlockedMaps !== 'object') state.unlockedMaps = {};
  maps.forEach((item) => {
    state.unlockedMaps[item.id] = true;
  });
  return state.unlockedMaps;
}

function syncMapAccess(state) {
  const unlocked = ensureMapAccess(state);
  unlocked[state.mapId || 'inn'] = true;
  return unlocked;
}

function exitUnlocked(state, exit) {
  return !!syncMapAccess(state)[exit.target];
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current];
    const b = polygon[previous];
    const intersects = ((a[1] > point.y) !== (b[1] > point.y))
      && point.x < ((b[0] - a[0]) * (point.y - a[1])) / ((b[1] - a[1]) || 0.0001) + a[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function collisionShape(radius) {
  if (radius && typeof radius === 'object') {
    return {
      x: Math.max(2, Number(radius.x) || COLLISION_RADIUS_X),
      y: Math.max(2, Number(radius.y) || COLLISION_RADIUS_Y),
    };
  }
  if (typeof radius === 'number') {
    return { x: radius, y: Math.max(4, radius * 0.58) };
  }
  return { x: COLLISION_RADIUS_X, y: COLLISION_RADIUS_Y };
}

function collisionSamples(position, radius) {
  const shape = collisionShape(radius);
  const samples = [position];
  for (let index = 0; index < 16; index += 1) {
    const angle = Math.PI * 2 * index / 16;
    samples.push({
      x: position.x + Math.cos(angle) * shape.x,
      y: position.y + Math.sin(angle) * shape.y,
    });
  }
  return samples;
}

function ellipseContainsPoint(position, shape, point) {
  const x = (point.x - position.x) / shape.x;
  const y = (point.y - position.y) / shape.y;
  return x * x + y * y <= 1;
}

function segmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const ratio = length
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length))
    : 0;
  const x = start.x + dx * ratio - point.x;
  const y = start.y + dy * ratio - point.y;
  return x * x + y * y;
}

function ellipseIntersectsPolygon(position, radius, polygon) {
  const shape = collisionShape(radius);
  if (pointInPolygon(position, polygon)) return true;
  for (let index = 0; index < polygon.length; index += 1) {
    const point = { x: polygon[index][0], y: polygon[index][1] };
    if (ellipseContainsPoint(position, shape, point)) return true;
    const next = { x: polygon[(index + 1) % polygon.length][0], y: polygon[(index + 1) % polygon.length][1] };
    const normalizedStart = { x: (point.x - position.x) / shape.x, y: (point.y - position.y) / shape.y };
    const normalizedEnd = { x: (next.x - position.x) / shape.x, y: (next.y - position.y) / shape.y };
    if (segmentDistanceSquared({ x: 0, y: 0 }, normalizedStart, normalizedEnd) <= 1) return true;
  }
  return false;
}

function npcPresent(npc, state) {
  const party = state && Array.isArray(state.party) ? state.party : [];
  if (!state || !conditionsMet(npc, state)) return false;
  if (npc.hideWhenInParty && party.indexOf(npc.roleId) >= 0) return false;
  if (npc.roleId && party.indexOf(npc.roleId) >= 0) return false;
  return true;
}

function ellipseIntersectsNpc(position, radius, npc) {
  const shape = collisionShape(radius);
  const combinedX = shape.x + Math.max(8, Number(npc.collisionRadiusX) || 14);
  const combinedY = shape.y + Math.max(5, Number(npc.collisionRadiusY) || 7);
  const x = (position.x - npc.x) / combinedX;
  const y = (position.y - npc.y) / combinedY;
  return x * x + y * y <= 1;
}

function isWalkable(current, position, radius, state) {
  const samples = collisionSamples(position, radius);
  const insideFloor = samples.every((sample) => current.walkable.some((polygon) => pointInPolygon(sample, polygon)));
  if (!insideFloor) return false;
  const blockedByObstacle = current.obstacles.some((obstacle) => {
    if (state && !conditionsMet(obstacle, state)) return false;
    return ellipseIntersectsPolygon(position, radius, obstacle.polygon);
  });
  if (blockedByObstacle) return false;
  if (!state) return true;
  return !(current.npcs || []).some((npc) => {
    return npc.blocksMovement !== false && npcPresent(npc, state) && ellipseIntersectsNpc(position, radius, npc);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function visibleHotspots(state) {
  return map(state.mapId).hotspots.filter((spot) => conditionsMet(spot, state));
}

function hotspotPriority(spot) {
  return Number(spot.priority) || TYPE_PRIORITY[spot.type] || 40;
}

function interactionState(state, spot) {
  if (!conditionsMet(spot, state)) return 'hidden';
  const event = state.explorationEvents && state.explorationEvents[spot.id];
  if (event && event.status === 'complete' && spot.persistAfterComplete) return 'complete';
  const gap = distance(state.position, spot);
  if (gap <= (spot.radius || 72)) return 'active';
  if (gap <= (spot.discoverRadius || (spot.radius || 72) + 96)) return 'near';
  return 'discovered';
}

function discoverableHotspots(state) {
  return visibleHotspots(state)
    .filter((spot) => !spot.linkedObjectId)
    .map((spot) => ({
      spot,
      status: interactionState(state, spot),
      distance: distance(state.position, spot),
      priority: hotspotPriority(spot),
    }))
    .filter((entry) => entry.status === 'near' || entry.status === 'active' || entry.status === 'complete')
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return b.priority - a.priority || a.distance - b.distance;
    })
    .slice(0, 3)
    .map((entry) => entry.spot);
}

function visibleNpcs(state) {
  var phase = state.worldTime && state.worldTime.phase;
  return map(state.mapId).npcs
    .filter((npc) => npcPresent(npc, state))
    .map((npc) => {
      // B4 时段站位：若配置 schedule[phase]，返回视觉坐标覆盖版（不修改原数据，不影响碰撞）
      if (npc.schedule && phase && npc.schedule[phase]) {
        var slot = npc.schedule[phase];
        return Object.assign({}, npc, {
          x: typeof slot.x === 'number' ? slot.x : npc.x,
          y: typeof slot.y === 'number' ? slot.y : npc.y,
          facing: slot.facing || npc.facing,
        });
      }
      return npc;
    });
}

function activeHotspot(state) {
  const origin = state.position;
  const candidates = visibleHotspots(state)
    .map((spot) => ({ spot, distance: distance(origin, spot), priority: hotspotPriority(spot) }))
    .filter((entry) => interactionState(state, entry.spot) === 'active')
    .sort((a, b) => b.priority - a.priority || a.distance - b.distance);
  return candidates.length ? candidates[0].spot : null;
}

function questStep(state) {
  var active = activeDeepChapter(state);
  return (active || chapter).steps.find((step) => !state.flags[step.done]) || null;
}

function activeDeepChapter(state) {
  var numbers = Object.keys(deepChapters).map(Number).sort(function (a, b) { return b - a; });
  var number = numbers.find(function (chapterNumber) {
    return state.flags['c' + String(chapterNumber).padStart(2, '0') + '-started']
      && !state.flags['c' + String(chapterNumber).padStart(2, '0') + '-complete'];
  });
  return number ? deepChapters[number] : null;
}

function syncQuest(state) {
  const crisis = doorwayCrisis.ensure(state);
  if (!crisis.resolved) {
    let text = '在客栈内自由走动，靠近账本、传闻板或茶桌后主动调查。';
    if (crisis.clues.length === 1) text = '已经发现一条线索，再调查一处异常。';
    if (crisis.clues.length >= 2) text = '线索已经足够，选择人情、查账或承诺来平息门前风波。';
    state.quest = { title: '掌柜的第一步', text, stepId: 'doorway-disturbance' };
    return;
  }
  const step = questStep(state);
  const active = activeDeepChapter(state);
  state.quest = step
    ? { title: active ? active.title : chapter.title, text: step.text, stepId: step.id }
    : { title: active ? active.title : chapter.title, text: active ? '本章线索已经齐全，返回客栈完成结算。' : '迟到的驿信已经查清。回客栈经营，等待下一页线索。', stepId: 'complete' };
}

function applySpawn(state, mapId, spawnId, toast) {
  const target = map(mapId);
  const point = target.spawns[spawnId] || target.spawns.main;
  ensureMapAccess(state);
  state.mapId = target.id;
  state.unlockedMaps[target.id] = true;
  state.visitedMaps[target.id] = true;
  if (state.mapVariants) state.mapVariants.weather = target.weather || 'clear';
  state.spawnId = spawnId || 'main';
  state.position = { x: point.x, y: point.y };
  state.velocity = { x: 0, y: 0 };
  state.facing = point.facing || 'right';
  state.moving = false;
  state.protagonist = 'zhangdeng';
  state.activeId = 'zhangdeng';
  state.trail = [];
  state.followers = {};
  state.exitCooldown = 0.55;
  state.exitRearmMapId = target.id;
  if (toast) state.toast = toast;
}

function spawn(state, mapId, spawnId, toast) {
  state.sceneTransition = null;
  state.lastSceneRoute = null;
  applySpawn(state, mapId, spawnId, toast);
}

function beginTransition(state, exit) {
  var visual;
  var current;
  if (!exit || state.sceneTransition) return false;
  current = map(state.mapId);
  visual = presentation.transition(current.id, exit.target);
  state.sceneTransition = {
    kind: exit.transition && exit.transition.kind || visual.kind,
    duration: exit.transition && exit.transition.duration || visual.duration,
    switchAt: exit.transition && exit.transition.switchAt || visual.switchAt,
    startedAt: Date.now(),
    switched: false,
    direction: exit.zone.x + exit.zone.width / 2 < current.width / 2 ? 'left' : 'right',
    from: {
      mapId: state.mapId,
      spawnId: state.spawnId,
      position: { x: state.position.x, y: state.position.y },
      facing: state.facing,
    },
    targetMapId: exit.target,
    targetSpawnId: exit.spawn,
    targetBranchId: exit.branchId || null,
    toast: `来到${map(exit.target).name}`,
  };
  state.lastSceneRoute = state.sceneTransition;
  state.moving = false;
  state.velocity = { x: 0, y: 0 };
  return true;
}

function updateTransition(state) {
  var active = state.sceneTransition;
  var progress;
  if (!active) return false;
  progress = Math.max(0, (Date.now() - active.startedAt) / active.duration);
  if (!active.switched && progress >= active.switchAt) {
    active.switched = true;
    if (active.targetBranchId) {
      branches.unlock(state, active.targetBranchId);
      branches.switchTo(state, active.targetBranchId);
    }
    applySpawn(state, active.targetMapId, active.targetSpawnId, active.toast);
  }
  if (progress >= 1) state.sceneTransition = null;
  return true;
}

function rollbackTransition(state) {
  var active = state.sceneTransition || state.lastSceneRoute;
  if (!active || !active.from) return false;
  applySpawn(state, active.from.mapId, active.from.spawnId, '目标场景暂未加载，已返回原处。');
  state.position = { x: active.from.position.x, y: active.from.position.y };
  state.facing = active.from.facing;
  state.sceneTransition = null;
  state.lastSceneRoute = null;
  return true;
}

function resetTrail(state) {
  state.trail = [];
  state.followers = {};
}

function pushTrail(state) {
  const trail = state.trail || (state.trail = []);
  const last = trail[trail.length - 1];
  if (!last || last.mapId !== state.mapId || distance(last, state.position) >= TRAIL_STEP) {
    trail.push({ x: state.position.x, y: state.position.y, facing: state.facing, mapId: state.mapId });
  }
  if (trail.length > 80) trail.splice(0, trail.length - 80);
}

function trailPoint(trail, followDistance) {
  if (!trail.length) return null;
  let covered = 0;
  for (let index = trail.length - 1; index > 0; index -= 1) {
    const current = trail[index];
    const previous = trail[index - 1];
    covered += distance(current, previous);
    if (covered >= followDistance) return previous;
  }
  return trail[0];
}

function updateFollowers(state) {
  const leaderId = state.protagonist || 'zhangdeng';
  const followerIds = state.party.filter((id) => id !== leaderId).slice(0, 2);
  const next = {};
  followerIds.forEach((id, index) => {
    const target = trailPoint(state.trail || [], FOLLOW_DISTANCE * (index + 1));
    const previous = state.followers && state.followers[id];
    const fallback = {
      x: state.position.x - (state.facing === 'right' ? FOLLOW_DISTANCE * (index + 1) : 0),
      y: state.position.y + (index % 2 ? 18 : -18),
      facing: state.facing,
      moving: false,
    };
    const point = target || previous || fallback;
    next[id] = {
      x: point.x,
      y: point.y,
      facing: point.facing || state.facing,
      moving: !!target && state.moving,
    };
  });
  state.followers = next;
}

function inZone(position, zone) {
  return position.x >= zone.x && position.x <= zone.x + zone.width
    && position.y >= zone.y && position.y <= zone.y + zone.height;
}

function blockedExitMessage(state, exit) {
  if (exit.mapGate === 'town-core') return '先处理客栈门前的异常，再去镇上继续调查。';
  if (exit.mapGate === 'late-letter') return '先在客栈接下“迟到的驿信”委托。';
  const missing = (exit.requires || []).find((flag) => !state.flags[flag]);
  const messages = {
    'mission-accepted': '先找柳掌柜接下委托。',
    'jingzhi-cooperating': '先处理十字街的争执，与霍惊枝暂时同行。',
    'notice-decoded': '假告示还没查清，去老槐树附近看看。',
    'tea-clue': '先向茶棚老板打听货车去向。',
    'gate-cleared': '先让巡街差役查验路引。',
    'c03-started': '先回客栈查看三张黑印路引。',
    'c03-watermark-sample': '先在纸坊取得水印样本。',
    'c03-fiber-sample': '先检查纸坊左侧的纸浆槽。',
    'c03-ink-trail': '先沿纸坊后巷追查墨痕。',
    'c03-decoy-ready': '先回客栈制作诱饵账册。',
    'c04-started': '先回客栈处理落地镖旗。',
    'c04-road-cleared': '先清理北坡镖道的路障。',
    'c05-started': '先回客栈接下双账调查。',
    'c05-crates-marked': '先在粮市采价并标记赈济粮袋。',
    'c06-started': '先回客栈处理被扣的赈济粮车。',
    'c06-route-proven': '先在义仓找到隐藏转运路线。',
  };
  return messages[missing] || `完成当前任务目标后，通往${map(exit.target).name}的道路才会开放。`;
}

function checkExits(state, current) {
  const exit = current.exits.find((item) => inZone(state.position, item.zone));
  if (state.exitRearmMapId === current.id) {
    if (exit) {
      state.blockedExitId = null;
      return;
    }
    state.exitRearmMapId = null;
  }
  if (state.exitCooldown > 0 || state.sceneTransition) return;
  if (!exit) {
    state.blockedExitId = null;
    return;
  }
  if (!exitUnlocked(state, exit)) {
    if (state.blockedExitId !== exit.id) state.toast = blockedExitMessage(state, exit);
    state.blockedExitId = exit.id;
    return;
  }
  state.blockedExitId = null;
  beginTransition(state, exit);
}

function moveWithCollision(current, position, delta, state) {
  const length = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(length / MAX_MOVE_STEP));
  const step = { x: delta.x / steps, y: delta.y / steps };
  let result = { x: position.x, y: position.y };
  for (let index = 0; index < steps; index += 1) {
    const combined = { x: result.x + step.x, y: result.y + step.y };
    if (isWalkable(current, combined, null, state)) {
      result = combined;
      continue;
    }
    const horizontal = { x: result.x + step.x, y: result.y };
    const vertical = { x: result.x, y: result.y + step.y };
    if (Math.abs(step.x) >= Math.abs(step.y)) {
      if (isWalkable(current, horizontal, null, state)) result = horizontal;
      else if (isWalkable(current, vertical, null, state)) result = vertical;
    } else if (isWalkable(current, vertical, null, state)) result = vertical;
    else if (isWalkable(current, horizontal, null, state)) result = horizontal;
  }
  return result;
}

function facingFor(vector, previous) {
  if (Math.abs(vector.x) >= Math.abs(vector.y)) return vector.x >= 0 ? 'right' : 'left';
  if (Math.abs(vector.y) > 0) return vector.y >= 0 ? 'down' : 'up';
  return previous || 'right';
}

function update(state, controls, delta) {
  if (!state.position) spawn(state, state.mapId || 'inn', state.spawnId || 'main');
  state.protagonist = 'zhangdeng';
  state.activeId = 'zhangdeng';
  state.exitCooldown = Math.max(0, (state.exitCooldown || 0) - delta);

  if (updateTransition(state)) {
    state.moving = false;
    state.velocity = { x: 0, y: 0 };
    updateFollowers(state);
    return;
  }

  if (state.mode !== 'explore'
    || state.modal
    || state.dialogue
    || state.battle
    || state.visualTransition && Date.now() < state.visualTransition.startedAt + state.visualTransition.duration) {
    state.moving = false;
    state.velocity = { x: 0, y: 0 };
    updateFollowers(state);
    return;
  }

  const current = map(state.mapId);
  syncMapAccess(state);
  const input = controls.move || { x: controls.axis || 0, y: 0 };
  const rawMagnitude = Math.hypot(input.x || 0, input.y || 0);
  const magnitude = Math.min(1, rawMagnitude);
  const deadZone = 0.12;
  state.moving = magnitude > deadZone;

  if (state.moving) {
    const normal = { x: input.x / rawMagnitude, y: input.y / rawMagnitude };
    const velocity = { x: normal.x * MOVE_SPEED * magnitude, y: normal.y * MOVE_SPEED * magnitude };
    const previous = { x: state.position.x, y: state.position.y };
    state.facing = facingFor(normal, state.facing);
    state.position = moveWithCollision(current, state.position, { x: velocity.x * delta, y: velocity.y * delta }, state);
    state.moving = distance(previous, state.position) > 0.01;
    state.velocity = state.moving ? velocity : { x: 0, y: 0 };
    if (state.moving) pushTrail(state);
  } else {
    state.velocity = { x: 0, y: 0 };
  }

  updateFollowers(state);
  checkExits(state, current);
  syncQuest(state);
}

module.exports = {
  MOVE_SPEED,
  COLLISION_RADIUS,
  COLLISION_RADIUS_X,
  COLLISION_RADIUS_Y,
  MAX_MOVE_STEP,
  map,
  conditionsMet,
  ensureMapAccess,
  syncMapAccess,
  exitUnlocked,
  blockedExitMessage,
  pointInPolygon,
  isWalkable,
  visibleHotspots,
  discoverableHotspots,
  interactionState,
  visibleNpcs,
  activeHotspot,
  syncQuest,
  spawn,
  beginTransition,
  rollbackTransition,
  resetTrail,
  moveWithCollision,
  update,
};
