const path = require('path');

const root = path.resolve(__dirname, '..');
const content = require(path.join(root, 'minigame/data/content'));
const store = require(path.join(root, 'minigame/src/core/store'));
const world = require(path.join(root, 'minigame/src/world/explore'));
const manifest = require(path.join(root, 'minigame/assets/art/manifest'));

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function flagsState() {
  const state = store.freshState();
  state.screen = 'explore';
  state.mode = 'explore';
  state.exitCooldown = 99;
  return state;
}

function validateAllMapAccess() {
  const state = flagsState();
  world.syncMapAccess(state);
  content.maps.forEach((map) => {
    assert(state.unlockedMaps[map.id], `Fresh save did not unlock map: ${map.id}`);
    map.exits.forEach((exit) => {
      assert(world.exitUnlocked(state, exit), `Fresh save locked exit: ${map.id}.${exit.id}`);
    });
  });
}

function validateProgressiveAccess() {
  const state = flagsState();
  world.syncMapAccess(state);
  ['inn', 'yard', 'street', 'locust_lane', 'tea_shed', 'east_gate'].forEach((id) => {
    assert(state.unlockedMaps[id], `新档没有开放公共地图 ${id}`);
  });
  assert(!state.unlockedMaps.stone_bridge, '接案前过早开放石桥');

  state.flags['mission-accepted'] = true;
  world.syncMapAccess(state);
  assert(state.unlockedMaps.stone_bridge, '接案后没有开放石桥');

  delete state.flags['mission-accepted'];
  world.syncMapAccess(state);
  assert(state.unlockedMaps.stone_bridge, '已经发现的石桥没有永久保留');
}

function pointInsideZone(point, zone) {
  return point.x >= zone.x && point.x <= zone.x + zone.width
    && point.y >= zone.y && point.y <= zone.y + zone.height;
}

function validateReachableExits() {
  content.maps.forEach((map) => {
    const points = reachablePoints(map, ['main']);
    map.exits.forEach((exit) => {
      assert(points.some((point) => pointInsideZone(point, exit.zone)), `${map.id}.${exit.id} 无法从出生点走进出口区域`);
    });
  });
}

function validateInnCounterOcclusion() {
  const inn = world.map('inn');
  const counter = inn.obstacles.find((obstacle) => obstacle.id === 'counter');
  const stairs = inn.obstacles.find((obstacle) => obstacle.id === 'stairs');
  const waiter = inn.npcs.find((npc) => npc.id === 'wuchen-inn');
  const streetSpawn = inn.spawns.streetDoor;
  const streetExit = inn.exits.find((exit) => exit.id === 'to-street');
  assert(counter && counter.occluderRise === 0, '客栈柜台遮挡层仍会覆盖柜台后人物头部');
  assert(waiter && waiter.y > counter.polygon[0][1] && waiter.y < counter.sortY, '白展堂脚底没有落在柜台后有效遮挡区');
  assert(waiter && waiter.y >= 278, '白展堂脚底仍停在柜台台面高度');
  assert(stairs && !world.isWalkable(inn, { x: 810, y: 294 }), '客栈楼梯底部台阶仍可被人物踏入');
  assert(world.isWalkable(inn, { x: 920, y: 318 }), '楼梯碰撞错误封死了通往十字街的地面通道');
  assert(streetSpawn && streetExit && !pointInsideZone(streetSpawn, streetExit.zone), '十字街返回客栈的落点仍在返程出口内');
}

function validateExitRearm() {
  const state = flagsState();
  world.spawn(state, 'inn', 'streetDoor');
  state.exitCooldown = 0;
  state.position = { x: 950, y: 304 };
  world.update(state, { move: { x: 0, y: 0 } }, 0.016);
  assert(!state.sceneTransition, '刚到达场景后仍会在出口区内立即反跳');
  state.position = { x: 900, y: 304 };
  world.update(state, { move: { x: 0, y: 0 } }, 0.016);
  assert(state.exitRearmMapId === null, '离开出口区后没有重新开启场景切换');
  state.position = { x: 950, y: 304 };
  world.update(state, { move: { x: 0, y: 0 } }, 0.016);
  assert(!!state.sceneTransition && state.sceneTransition.targetMapId === 'street', '主动重新进入出口后没有正常切换场景');
}

function validateNpcScenePlacement() {
  content.maps.forEach((map) => {
    map.npcs.forEach((npc) => {
      if (npc.behindObstacleId) {
        const obstacle = map.obstacles.find((item) => item.id === npc.behindObstacleId);
        const props = manifest.maps[map.id] && manifest.maps[map.id].props || [];
        assert(!!obstacle, `${map.id}.${npc.id} 引用不存在的遮挡物 ${npc.behindObstacleId}`);
        assert(npc.allowBlockedPlacement === true, `${map.id}.${npc.id} 设施后站位没有明确允许阻挡区`);
        assert(npc.shadowAlpha === 0, `${map.id}.${npc.id} 设施后站位仍会把脚底阴影画在家具上`);
        assert(
          !!(obstacle && obstacle.occluderPolygon) || props.some((prop) => prop.obstacleId === npc.behindObstacleId),
          `${map.id}.${npc.id} 缺少与设施对应的前景遮挡`
        );
      }
      Object.keys(map.spawns).forEach((spawnId) => {
        const spawn = map.spawns[spawnId];
        const gap = Math.hypot(spawn.x - npc.x, spawn.y - npc.y);
        assert(gap >= 36, `${map.id}.${spawnId} 与 ${npc.id} 出生时重叠`);
      });
    });
  });
}

function validateNpcFootCollision() {
  const map = {
    id: 'npc-collision-test',
    walkable: [[[0, 0], [180, 0], [180, 120], [0, 120]]],
    obstacles: [],
    npcs: [{ id: 'clerk', x: 90, y: 60 }],
  };
  const state = { flags: {}, party: [] };
  assert(!world.isWalkable(map, { x: 90, y: 60 }, null, state), '主角仍可从 NPC 脚底直接穿过');
  assert(world.isWalkable(map, { x: 130, y: 60 }, null, state), 'NPC 碰撞范围过大，阻塞了正常绕行空间');
  map.npcs[0].blocksMovement = false;
  assert(world.isWalkable(map, { x: 90, y: 60 }, null, state), '明确的非阻挡 NPC 没有放行');
}

function validateChapterTwoEntrances() {
  const inn = world.map('inn');
  const briefing = inn.hotspots.find((spot) => spot.id === 'late-letter-briefing');
  const ending = inn.hotspots.find((spot) => spot.id === 'late-letter-return');
  assert(!!briefing && briefing.dialogue === 'late-letter-briefing', '第二章缺少正常接案热点');
  assert(!!ending && ending.dialogue === 'late-letter-return', '第二章缺少返店结算热点');
}

function reachablePoints(map, spawnIds) {
  const step = 4;
  const queue = [];
  const visited = {};
  const result = [];
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  function key(point) {
    return `${Math.round(point.x / step)}:${Math.round(point.y / step)}`;
  }

  function push(point) {
    const id = key(point);
    if (visited[id] || !world.isWalkable(map, point)) return;
    visited[id] = true;
    queue.push(point);
    result.push(point);
  }

  (spawnIds || Object.keys(map.spawns)).forEach((spawnId) => push(map.spawns[spawnId]));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    directions.forEach((direction) => {
      push({ x: current.x + direction[0] * step, y: current.y + direction[1] * step });
    });
  }
  return result;
}

function nearReachable(points, target, radius) {
  const limit = Math.max(24, Number(radius) || 72);
  return points.some((point) => Math.hypot(point.x - target.x, point.y - target.y) <= limit);
}

function validateInteractions() {
  const supported = new Set([
    'battle', 'collect', 'cookingTrial', 'crisis', 'dialogue', 'inn',
    'investigate', 'loot', 'mechanism', 'recipeSample', 'repair',
  ]);
  const ids = {};
  content.maps.forEach((map) => {
    const points = reachablePoints(map);
    assert(points.length > 0, `${map.id} 没有可探索路径`);
    map.hotspots.forEach((spot) => {
      assert(!ids[spot.id], `热点ID重复: ${spot.id}`);
      ids[spot.id] = map.id;
      assert(supported.has(spot.type), `${map.id}.${spot.id} 使用未处理类型 ${spot.type}`);
      assert(nearReachable(points, spot, spot.radius), `${map.id}.${spot.id} 无法从出生点走到交互范围`);
      if (spot.type === 'dialogue') assert(!!content.dialogues[spot.dialogue], `${map.id}.${spot.id} 对话不存在`);
      if (spot.type === 'battle') assert(!!content.battles[spot.battle], `${map.id}.${spot.id} 战斗不存在`);
      if (spot.type === 'cookingTrial') {
        assert(!!content.cookingTrials[spot.trial], `${map.id}.${spot.id} 烹饪试炼不存在`);
      }
    });
  });
}

function validatePlacements() {
  content.maps.forEach((map) => {
    Object.keys(map.spawns).forEach((spawnId) => {
      assert(world.isWalkable(map, map.spawns[spawnId]), `${map.id}.${spawnId} 出生点落在障碍或行走区外`);
    });
    map.npcs.forEach((npc) => {
      if (npc.allowBlockedPlacement) return;
      assert(world.isWalkable(map, npc), `${map.id}.${npc.id} NPC站位落在障碍或行走区外`);
    });
  });
}

function validateRouteComponents() {
  const entries = ['inn'];
  const reached = {};
  const queue = entries.slice();
  queue.forEach((id) => { reached[id] = true; });
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = world.map(queue[cursor]);
    current.exits.forEach((exit) => {
      if (reached[exit.target]) return;
      reached[exit.target] = true;
      queue.push(exit.target);
    });
  }
  content.maps.forEach((map) => assert(reached[map.id], `${map.id} 不属于总店或江南探索路线`));
}

function validateSweptCollision() {
  const testMap = {
    id: 'collision-test',
    walkable: [[[0, 0], [180, 0], [180, 120], [0, 120]]],
    obstacles: [{ id: 'thin-wall', polygon: [[76, 0], [80, 0], [80, 120], [76, 120]] }],
  };
  const state = { flags: {} };
  const start = { x: 30, y: 60 };
  const result = world.moveWithCollision(testMap, start, { x: 110, y: 0 }, state);
  assert(result.x < 76 - world.COLLISION_RADIUS_X + 1, '大步长移动穿过了薄墙');

  const slideMap = {
    id: 'slide-test',
    walkable: testMap.walkable,
    obstacles: [{ id: 'block', polygon: [[70, 45], [110, 45], [110, 85], [70, 85]] }],
  };
  const slide = world.moveWithCollision(slideMap, { x: 52, y: 94 }, { x: 42, y: -20 }, state);
  assert(slide.x > 52 || slide.y !== 94, '碰到障碍后没有产生贴边滑动');
  assert(world.isWalkable(slideMap, slide), '滑动结果落入了碰撞区');
}

validateAllMapAccess();
validateChapterTwoEntrances();
validateInteractions();
validatePlacements();
validateRouteComponents();
validateReachableExits();
validateInnCounterOcclusion();
validateExitRearm();
validateNpcScenePlacement();
validateNpcFootCollision();
validateSweptCollision();

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

console.log(`Exploration v11 validation passed: ${content.maps.length} maps, ${Object.keys(content.dialogues).length} dialogues, all-map access, reachable hotspots and swept collision.`);
