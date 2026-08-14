const store = require('../minigame/src/core/store');
const world = require('../minigame/src/world/explore');
const events = require('../minigame/src/world/events');
const time = require('../minigame/src/core/time');
const crisis = require('../minigame/data/doorway-crisis');
const combat = require('../minigame/src/combat/battle');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalTimeout = global.setTimeout;
const originalRandom = Math.random;
global.setTimeout = (callback) => { callback(); return 0; };
Math.random = () => 0;

try {
  const state = store.freshState();
  assert(state.version === 11, '新档不是v11');
  assert(state.protagonist === 'zhangdeng' && state.activeId === 'zhangdeng', '柳掌灯不是固定探索主角');
  assert(state.party.length === 1 && state.party[0] === 'zhangdeng', '新档不是柳掌灯单人队伍');
  assert(!state.characters.wuchen.innUnlocked, '谢无尘在相遇前已经参与经营');
  assert(!state.characters.wuchen.recruited && !state.characters.wuchen.inParty, '谢无尘在任务前已经加入');

  state.screen = 'explore';
  state.mode = 'explore';
  world.spawn(state, 'inn', 'recovery');
  const start = { x: state.position.x, y: state.position.y };
  state.activeId = 'wuchen';
  world.update(state, { move: { x: 0.7, y: 0.7 } }, 1 / 30);
  assert(state.activeId === 'zhangdeng', '探索更新后主控角色被替换');
  assert(state.position.x !== start.x || state.position.y !== start.y, '八向移动没有推进角色位置');
  assert(Object.keys(state.followers).length === 0, '单人开局出现了跟随角色');

  crisis.interact(state, 'rumor-board');
  assert(!state.characters.wuchen.temporary, '一条线索就错误解锁谢无尘');
  crisis.interact(state, 'ledger');
  assert(state.flags['doorway-clues-ready'], '两条线索后没有开放门口事件');
  assert(combat.start(state, 'doorway_troublemaker'), '单人开场战斗无法开始');
  assert(state.battle.party.length === 1 && state.battle.party[0].id === 'zhangdeng', '单人战斗错误加入其他角色');
  let turns = 0;
  while (state.battle && turns < 20) {
    if (state.battle.result) {
      combat.finish(state);
      break;
    }
    if (state.battle.turn && state.battle.turn.side === 'party') combat.action(state, 'attack', 0);
    turns += 1;
  }
  assert(!state.battle && state.flags['doorway-troublemaker-stopped'], '单人开场战斗没有正常结算');

  crisis.interact(state, 'promise');
  assert(state.characters.wuchen.temporary && !state.characters.wuchen.recruited, '门前危机后谢无尘没有进入协作阶段');
  assert(state.party.length === 2 && state.party[0] === 'zhangdeng', '临时伙伴加入后队伍顺序错误');
  world.update(state, { move: { x: 1, y: 0 } }, 1 / 30);
  assert(state.followers.wuchen, '谢无尘协作后没有创建跟随状态');

  const beforePhase = state.worldTime.phase;
  time.advance(state, 'test-return');
  assert(beforePhase === 'morning' && state.worldTime.phase === 'noon', '探索时段没有按节点推进');

  events.interact(state, {
    id: 'test-repair', type: 'repair', effects: { flag: 'test-repaired', coin: 2 }, toast: '修好。',
  }, { changeStock() {}, syncQuest() {} });
  assert(state.flags['test-repaired'] && state.explorationEvents['test-repair'].status === 'complete', '探索事件动作没有记录结果');

  const migrated = store.normalize({
    version: 7,
    mapId: 'street',
    spawnId: 'innDoor',
    party: ['furong', 'xiangyu'],
    activeId: 'furong',
    characters: state.characters,
    flags: {},
    inventory: state.inventory,
    inn: state.inn,
  });
  assert(migrated.activeId === 'zhangdeng' && migrated.protagonist === 'zhangdeng', '旧存档没有迁移原创固定主角');
  assert(migrated.party.length === 1 && migrated.party[0] === 'zhangdeng', '旧队伍不应映射到原创人物');
  assert(migrated.legacyArchive && migrated.legacyArchive.party.length === 2, '旧队伍没有写入只读档案');

  console.log('Exploration v10 validation passed: original solo start, cooperation, battle, time, migration.');
} finally {
  global.setTimeout = originalTimeout;
  Math.random = originalRandom;
}
