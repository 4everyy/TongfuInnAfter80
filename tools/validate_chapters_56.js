const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const inn = require(path.join(root, 'minigame/src/inn/inn'));
const randomEvents = require(path.join(root, 'minigame/src/core/random-events'));
const content = require(path.join(root, 'minigame/data/content'));

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

function openAndChoose(state, id) {
  assert(dialogue.open(state, id), `无法打开对话 ${id}`);
  dialogue.choose(state, 0);
}

function simulateSevenDays(state, chapterNumber) {
  const seenTitles = [];
  for (let day = 1; day <= 7; day += 1) {
    const plan = inn.dayScript(state);
    const firstOrder = randomEvents.select(state, content.deepOperationEvents, 2, chapterNumber);
    const secondOrder = randomEvents.select(state, content.deepOperationEvents, 2, chapterNumber);
    assert(plan.deepChapter === chapterNumber, `第${chapterNumber}章第${day}日没有使用深度日程`);
    assert(plan.title && seenTitles.indexOf(plan.title) < 0, `第${chapterNumber}章出现重复日程标题 ${plan.title}`);
    assert(firstOrder.join(',') === secondOrder.join(','), `第${chapterNumber}章第${day}日随机事件不稳定`);
    assert(new Set(firstOrder).size === firstOrder.length, `第${chapterNumber}章第${day}日抽到重复事件`);
    seenTitles.push(plan.title);

    state.calendar.phase = 'evening';
    state.worldTime.phase = 'evening';
    state.episodes.pendingId = null;
    state.service.income = 12 + day;
    state.service.satisfaction = 5 + day % 3;
    const beforeDay = state.calendar.day;
    assert(inn.settleDay(state), `第${chapterNumber}章第${day}日无法结算`);
    assert(state.calendar.day === beforeDay + 1, `第${chapterNumber}章第${day}日没有正确推进日期`);
    assert(!inn.settleDay(state), `第${chapterNumber}章第${day}日发生重复结算`);
    assert(state.inventory.coin >= 0, `第${chapterNumber}章第${day}日银两为负`);
    Object.keys(state.inventory.stock).forEach((key) => {
      assert(state.inventory.stock[key] >= 0, `第${chapterNumber}章第${day}日库存 ${key} 为负`);
    });
  }
}

function validateStepProviders(chapterNumber) {
  const chapter = content.deepChapters[chapterNumber];
  const providedFlags = {};
  content.maps.forEach((map) => {
    map.hotspots.forEach((spot) => {
      const effects = spot.effects || spot.reward || {};
      if (effects.flag) providedFlags[effects.flag] = `${map.id}.${spot.id}`;
      if (spot.battle && content.battles[spot.battle] && content.battles[spot.battle].reward.flag) {
        providedFlags[content.battles[spot.battle].reward.flag] = `${map.id}.${spot.id}`;
      }
      if (spot.dialogue && content.dialogues[spot.dialogue]) {
        content.dialogues[spot.dialogue].choices.forEach((choice) => {
          if (choice.flag) providedFlags[choice.flag] = `${map.id}.${spot.id}`;
        });
      }
    });
  });
  chapter.steps.forEach((step) => {
    if (step.id === 'briefing' || step.id === 'complete') return;
    assert(providedFlags[step.done], `第${chapterNumber}章步骤 ${step.id} 缺少空间交互来源`);
  });
}

const state = store.freshState();
campaign.ensure(state);
state.flags['c04-complete'] = true;
campaign.setStage(state, 'jingzhi', 'cooperating', '测试前置合作');
campaign.setStage(state, 'wenyan', 'cooperating', '测试前置合作');

openAndChoose(state, 'c05-briefing');
assert(state.campaign.chapter === 5, '第五章没有启动');
simulateSevenDays(state, 5);
state.flags['c05-audit-won'] = true;
openAndChoose(state, 'c05-finale');
assert(state.flags['c05-complete'], '第五章没有完成');
assert(state.characters.jingzhi.recruitmentStage === 'trusted', '郭芙蓉第五章后不是信任阶段');
assert(!state.characters.jingzhi.recruited, '郭芙蓉在第五章提前加入');

openAndChoose(state, 'c06-briefing');
simulateSevenDays(state, 6);
state.flags['c06-checkpoint-won'] = true;
openAndChoose(state, 'c06-finale');
assert(state.flags['c06-complete'], '第六章没有完成');
assert(state.characters.jingzhi.recruited, '郭芙蓉没有在第六章加入');
assert(state.characters.wenyan.recruitmentStage === 'trusted', '吕秀才第六章后不是信任阶段');
assert(!state.characters.wenyan.recruited, '吕秀才在第八章前提前加入');
assert(state.inn.history.length === 14, '十四日经营历史数量错误');

validateStepProviders(5);
validateStepProviders(6);

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}
console.log('Chapters 5-6 validation passed: 14 settlements, deterministic events, spatial objectives, recruitment gates.');
