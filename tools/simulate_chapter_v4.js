const { freshState } = require('../minigame/src/core/store');
const world = require('../minigame/src/world/explore');
const dialogue = require('../minigame/src/dialogue/dialogue');
const combat = require('../minigame/src/combat/battle');
const doorwayCrisis = require('../minigame/data/doorway-crisis');

const originalTimeout = global.setTimeout;
const originalRandom = Math.random;
global.setTimeout = (callback) => { callback(); return 0; };
Math.random = () => 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function choose(state, id, index) {
  assert(dialogue.open(state, id), `无法打开对话 ${id}`);
  dialogue.choose(state, index || 0);
}

try {
  const state = freshState();
  state.screen = 'explore';
  const initialCoin = state.inventory.coin;
  const initialIngredients = state.inventory.ingredient;

  assert(state.party.length === 1 && state.party[0] === 'zhangdeng', '新章节没有以柳掌灯单人开局');
  doorwayCrisis.interact(state, 'rumor-board');
  doorwayCrisis.interact(state, 'ledger');
  doorwayCrisis.interact(state, 'promise');
  assert(state.party.length === 2 && state.party.indexOf('wuchen') >= 0, '门前危机后谢无尘没有临时同行');

  choose(state, 'late-letter-briefing');
  assert(state.flags['mission-accepted'], '接案旗标未写入');

  world.spawn(state, 'yard', 'innDoor');
  state.flags['yard-trail'] = true;
  world.syncQuest(state);

  world.spawn(state, 'street', 'innDoor');
  choose(state, 'jingzhi-encounter');
  assert(state.party.length === 3 && state.party.indexOf('jingzhi') >= 0, '霍惊枝未组成临时调查队');

  world.spawn(state, 'locust_lane', 'street');
  choose(state, 'notice-wenyan');
  world.spawn(state, 'tea_shed', 'locust');
  choose(state, 'tea-owner');
  world.spawn(state, 'east_gate', 'tea');
  choose(state, 'gate-check');

  world.spawn(state, 'stone_bridge', 'gate');
  assert(combat.start(state, 'bridge_ruffians'), '石桥战斗未开始');
  let actions = 0;
  while (state.battle && actions < 100) {
    if (state.battle.result) {
      combat.finish(state);
      break;
    }
    if (state.battle.turn && state.battle.turn.side === 'party') combat.action(state, 'attack', 0);
    actions += 1;
  }
  assert(!state.battle, '石桥战斗未在动作上限内结束');
  assert(state.flags['supplies-recovered'], '战斗胜利未写入追回物资旗标');

  choose(state, 'bridge-cart');
  assert(state.mapId === 'inn' && state.flags['cargo-loaded'], '货物没有带回客栈');
  choose(state, 'late-letter-return');

  assert(state.flags['chapter-late-letter-complete'], '章节完成旗标未写入');
  assert(!state.characters.wenyan.recruited, '闻砚不应在一次对话后直接加入');
  assert(state.campaign.completed.indexOf('chapter-02') >= 0, '第二章未写入长篇主线进度');
  assert(state.calendar.day === 1, '支线不应直接推进经营日期');
  assert(state.inventory.coin > initialCoin, '支线银两奖励没有生效');
  assert(state.inventory.ingredient > initialIngredients, '支线稀有食材奖励没有写入库存');
  assert(state.sideQuests.entries['late-letter'].status === 'complete', '迟到的驿信没有登记为已完成任务');
  assert(state.modal && state.modal.type === 'party', '章末没有打开三人编成界面');

  console.log(JSON.stringify({
    result: 'passed',
    map: state.mapId,
    party: state.party,
    recruited: Object.keys(state.characters).filter((id) => state.characters[id].recruited),
    day: state.calendar.day,
    coin: state.inventory.coin,
    battleActions: actions,
  }, null, 2));
} finally {
  global.setTimeout = originalTimeout;
  Math.random = originalRandom;
}
