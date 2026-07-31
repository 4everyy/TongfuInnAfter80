const path = require('path');

const root = path.resolve(__dirname, '..');
const content = require(path.join(root, 'minigame/data/content'));
const store = require(path.join(root, 'minigame/src/core/store'));
const world = require(path.join(root, 'minigame/src/world/explore'));

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

function validateProgressiveAccess() {
  const state = flagsState();
  world.syncMapAccess(state);
  ['inn', 'yard', 'street'].forEach((id) => assert(state.unlockedMaps[id], `新档没有开放 ${id}`));
  ['locust_lane', 'tea_shed', 'east_gate', 'stone_bridge'].forEach((id) => {
    assert(!state.unlockedMaps[id], `新档过早开放 ${id}`);
  });

  state.flags.doorwayDisturbanceResolved = true;
  world.syncMapAccess(state);
  ['locust_lane', 'tea_shed', 'east_gate'].forEach((id) => {
    assert(state.unlockedMaps[id], `开场完成后没有开放 ${id}`);
  });
  assert(!state.unlockedMaps.stone_bridge, '接案前过早开放石桥');

  state.flags['mission-accepted'] = true;
  world.syncMapAccess(state);
  assert(state.unlockedMaps.stone_bridge, '接案后没有开放石桥');

  delete state.flags['mission-accepted'];
  world.syncMapAccess(state);
  assert(state.unlockedMaps.stone_bridge, '已经发现的石桥没有永久保留');
}

function validateChapterTwoEntrances() {
  const inn = world.map('inn');
  const briefing = inn.hotspots.find((spot) => spot.id === 'late-letter-briefing');
  const ending = inn.hotspots.find((spot) => spot.id === 'late-letter-return');
  assert(!!briefing && briefing.dialogue === 'late-letter-briefing', '第二章缺少正常接案热点');
  assert(!!ending && ending.dialogue === 'late-letter-return', '第二章缺少返店结算热点');
}

function reachablePoints(map) {
  const step = 8;
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

  Object.keys(map.spawns).forEach((spawnId) => push(map.spawns[spawnId]));
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
  const entries = ['inn', 'jiangnan_dock'];
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

validateProgressiveAccess();
validateChapterTwoEntrances();
validateInteractions();
validatePlacements();
validateRouteComponents();
validateSweptCollision();

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

console.log(`Exploration v11 validation passed: ${content.maps.length} maps, ${Object.keys(content.dialogues).length} dialogues, progressive access, reachable hotspots and swept collision.`);
