const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const randomEvents = require(path.join(root, 'minigame/src/core/random-events'));
const content = require(path.join(root, 'minigame/data/content'));

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

const state = store.freshState();
state.flags['chapter-late-letter-complete'] = true;
campaign.ensure(state);

dialogue.open(state, 'c03-briefing');
dialogue.choose(state, 0);
assert(state.campaign.chapter === 3, '第三章没有启动');
assert(state.characters.wuchen.recruitmentStage === 'cooperating', '白展堂没有按相遇到合作顺序推进');

state.flags['c03-watermark-sample'] = true;
state.flags['c03-ink-trail'] = true;
dialogue.open(state, 'c03-old-letter');
dialogue.choose(state, 0);
assert(state.characters.wuchen.recruitmentStage === 'quest', '白展堂信任与专属任务阶段未完成');
assert(!state.characters.wuchen.recruited, '白展堂在专属任务前被提前招募');

dialogue.open(state, 'c03-finale');
dialogue.choose(state, 0);
assert(!state.flags['c03-complete'], '未赢得货栈战斗却完成了第三章');

state.flags['c03-sting-won'] = true;
dialogue.open(state, 'c03-finale');
dialogue.choose(state, 0);
assert(state.flags['c03-complete'], '第三章完成旗标缺失');
assert(state.characters.wuchen.recruited, '白展堂没有在第三章结尾正式加入');
assert(state.campaign.chapter === 4, '第三章后没有进入第四章');

dialogue.open(state, 'c04-briefing');
dialogue.choose(state, 0);
assert(state.characters.jingzhi.recruitmentStage === 'encountered', '郭芙蓉初遇阶段错误');
state.flags['c04-river-won'] = true;
dialogue.open(state, 'c04-cooperate');
dialogue.choose(state, 0);
assert(state.flags['c04-complete'], '第四章完成旗标缺失');
assert(state.characters.jingzhi.temporary, '郭芙蓉没有成为临时伙伴');
assert(!state.characters.jingzhi.recruited, '郭芙蓉在第四章被提前永久招募');
assert(state.characters.wenyan.recruitmentStage === 'cooperating', '吕秀才没有在第四章进入合作阶段');

dialogue.open(state, 'c05-briefing');
dialogue.choose(state, 0);
assert(state.campaign.chapter === 5, '第五章没有启动');
assert(state.characters.jingzhi.recruitmentStage === 'cooperating', '郭芙蓉第五章开始阶段错误');
state.flags['c05-audit-won'] = true;
dialogue.open(state, 'c05-finale');
dialogue.choose(state, 0);
assert(state.flags['c05-complete'], '第五章完成旗标缺失');
assert(state.characters.jingzhi.recruitmentStage === 'trusted', '郭芙蓉没有通过第五章信任考验');
assert(!state.characters.jingzhi.recruited, '郭芙蓉在第五章被提前招募');

dialogue.open(state, 'c06-briefing');
dialogue.choose(state, 0);
state.flags['c06-checkpoint-won'] = true;
dialogue.open(state, 'c06-finale');
dialogue.choose(state, 0);
assert(state.flags['c06-complete'], '第六章完成旗标缺失');
assert(state.characters.jingzhi.recruited, '郭芙蓉没有在第六章正式加入');
assert(state.characters.wenyan.recruitmentStage === 'trusted', '吕秀才没有在第六章达到信任阶段');
assert(!state.characters.wenyan.recruited, '吕秀才在第八章前被提前招募');

const randomA = store.freshState();
randomA.flags['c03-started'] = true;
randomA.campaign.chapter = 3;
const first = randomEvents.select(randomA, content.deepOperationEvents, 2, 3);
const second = randomEvents.select(randomA, content.deepOperationEvents, 2, 3);
assert(first.join(',') === second.join(','), '相同日期的随机事件不稳定');
assert(new Set(first).size === first.length, '同一营业日抽到重复事件');

content.maps.forEach((map) => {
  map.exits.forEach((exit) => {
    const target = content.maps.find((candidate) => candidate.id === exit.target);
    assert(target && target.spawns[exit.spawn], `${map.id}.${exit.id} 出口配对无效`);
  });
});

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}
console.log('Deep chapters validation passed: chapters 3-6 recruitment gates, deterministic events, 17-map exits.');
