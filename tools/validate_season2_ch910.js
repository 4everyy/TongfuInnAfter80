'use strict';

const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const branches = require(path.join(root, 'minigame/src/inn/branches'));
const transport = require(path.join(root, 'minigame/src/core/transport'));
const content = require(path.join(root, 'minigame/data/content'));

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(content.maps.length === 27, '第二季第11章接入后应有27张地图');
assert(content.deepDayPlans.filter((item) => item.chapter === 9 || item.chapter === 10).length === 14,
  '第9、10章必须包含14个日程节点');

content.maps.forEach((map) => {
  map.exits.forEach((exit) => {
    const target = content.maps.find((candidate) => candidate.id === exit.target);
    assert(target && target.spawns[exit.spawn], `${map.id}.${exit.id} 出口配对无效`);
  });
});

const state = store.freshState();
campaign.ensure(state);
state.flags['season-1-complete'] = true;
state.flags['season-2-prologue-unlocked'] = true;
state.inventory.stock = { staple: 4, vegetable: 3, meat: 2, tea: 2 };
branches.capture(state);

dialogue.open(state, 'c09-briefing');
dialogue.choose(state, 0);
assert(state.campaign.chapter === 9 && state.mapId === 'jiangnan_dock', '第9章没有从总店正确启程');
assert(state.activeBranchId === 'changfeng', '抵达码头前不应切换经营分店');
assert(state.transport.orders.filter((item) => item.key === 'c09-jiangnan-provisions').length === 1,
  '启程补给订单必须且只能创建一次');

dialogue.open(state, 'c09-shiwei-meet');
dialogue.choose(state, 0);
assert(state.characters.shiwei.recruitmentStage === 'encountered', '李大嘴第9章应只推进至相遇');
assert(!state.characters.shiwei.recruited, '李大嘴在第9章被提前招募');

state.flags['c09-ferry-won'] = true;
dialogue.open(state, 'c09-finale');
dialogue.choose(state, 0);
assert(state.flags['c09-complete'] && state.campaign.chapter === 10, '第9章未正确完成');
assert(state.activeBranchId === 'jiangnan' && state.branches.jiangnan.unlocked, '水巷分店未解锁或未切换');
assert(state.mapId === 'jiangnan_branch', '第9章结束后没有抵达水巷分店');

dialogue.open(state, 'c10-briefing');
dialogue.choose(state, 0);
dialogue.open(state, 'c10-shiwei-cooperate');
dialogue.choose(state, 0);
assert(state.characters.shiwei.recruitmentStage === 'cooperating', '李大嘴第10章未进入合作阶段');
assert(state.characters.shiwei.temporary && !state.characters.shiwei.recruited,
  '李大嘴临时伙伴状态不正确');

state.flags['c10-stove-repaired'] = true;
state.flags['c10-banquet-won'] = true;
dialogue.open(state, 'c10-finale');
dialogue.choose(state, 0);
assert(state.flags['c10-complete'] && state.campaign.chapter === 11, '第10章未正确完成');
assert(!state.characters.shiwei.recruited, '李大嘴在第11章专属任务前被提前永久招募');

const delivered = state.transport.orders[0];
state.calendar.day = delivered.arrivalDay;
state.mapVariants.weather = 'clear';
transport.advance(state);
const stockAfter = state.branches.jiangnan.stock.staple;
transport.advance(state);
assert(delivered.status === 'delivered', '跨店运输没有抵达');
assert(state.branches.jiangnan.stock.staple === stockAfter, '同一运输订单被重复入库');

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}

console.log('Season 2 chapters 9-10 validation passed: 14 days, branch switch, transport and temporary partner gates.');
