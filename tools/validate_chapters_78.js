const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const inn = require(path.join(root, 'minigame/src/inn/inn'));
const randomEvents = require(path.join(root, 'minigame/src/core/random-events'));
const caseFiles = require(path.join(root, 'minigame/src/core/case-files'));
const content = require(path.join(root, 'minigame/data/content'));

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

function openAndChoose(state, id) {
  assert(dialogue.open(state, id), `无法打开对话 ${id}`);
  dialogue.choose(state, 0);
}

function simulateSevenDays(state, chapterNumber) {
  const titles = [];
  for (let day = 1; day <= 7; day += 1) {
    const plan = inn.dayScript(state);
    const first = randomEvents.select(state, content.deepOperationEvents, 2, chapterNumber);
    const second = randomEvents.select(state, content.deepOperationEvents, 2, chapterNumber);
    assert(plan.deepChapter === chapterNumber, `第${chapterNumber}章第${day}日未使用深度日程`);
    assert(titles.indexOf(plan.title) < 0, `第${chapterNumber}章日程标题重复`);
    assert(first.join(',') === second.join(','), `第${chapterNumber}章随机事件顺序不稳定`);
    if (day % 2 === 0) {
      assert(plan.serviceEvents.some((id) => id.indexOf('rare-') === 0), `第${chapterNumber}章第${day}日未接入稀有连续事件`);
    }
    titles.push(plan.title);
    state.calendar.phase = 'evening';
    state.worldTime.phase = 'evening';
    state.episodes.pendingId = null;
    state.service.income = 14 + day;
    state.service.satisfaction = 6;
    const before = state.calendar.day;
    assert(inn.settleDay(state), `第${chapterNumber}章第${day}日无法结算`);
    assert(state.calendar.day === before + 1, `第${chapterNumber}章第${day}日日期未推进`);
    assert(!inn.settleDay(state), `第${chapterNumber}章第${day}日重复结算`);
  }
}

function validateStepProviders(chapterNumber) {
  const provided = {};
  content.maps.forEach((map) => {
    map.hotspots.forEach((spot) => {
      const effects = spot.effects || spot.reward || {};
      if (effects.flag) provided[effects.flag] = `${map.id}.${spot.id}`;
      if (spot.battle && content.battles[spot.battle] && content.battles[spot.battle].reward.flag) {
        provided[content.battles[spot.battle].reward.flag] = `${map.id}.${spot.id}`;
      }
      if (spot.dialogue && content.dialogues[spot.dialogue]) {
        content.dialogues[spot.dialogue].choices.forEach((choice) => {
          if (choice.flag) provided[choice.flag] = `${map.id}.${spot.id}`;
        });
      }
    });
  });
  content.deepChapters[chapterNumber].steps.forEach((step) => {
    if (step.id === 'briefing' || step.id === 'complete') return;
    assert(provided[step.done], `第${chapterNumber}章步骤 ${step.id} 缺少空间交互来源`);
  });
}

const state = store.freshState();
campaign.ensure(state);
state.flags['c06-complete'] = true;
campaign.setStage(state, 'wenyan', 'trusted', '第六章测试前置');

const normalCost = caseFiles.purchaseCost(state, 10);
openAndChoose(state, 'c07-briefing');
const raisedCost = caseFiles.purchaseCost(state, 10);
assert(raisedCost > normalCost, '第七章开始后采购价没有上涨');
assert(state.characters.wenyan.recruitmentStage === 'trusted', '第七章开始时吕秀才阶段错误');
simulateSevenDays(state, 7);

caseFiles.addEvidence(state, { id: 'test-ticket', title: '测试票据', weight: 3 });
const evidenceScore = state.caseFiles.score;
caseFiles.addEvidence(state, { id: 'test-ticket', title: '重复票据', weight: 3 });
assert(state.caseFiles.score === evidenceScore, '重复证据被重复计分');
state.flags['c07-tickets-saved'] = true;
openAndChoose(state, 'c07-finale');
assert(state.flags['c07-complete'], '第七章未完成');
assert(state.characters.wenyan.recruitmentStage === 'quest', '吕秀才第七章后未进入专属任务');
assert(!state.characters.wenyan.recruited, '吕秀才在第七章提前加入');

openAndChoose(state, 'c08-briefing');
openAndChoose(state, 'c08-fragment');
simulateSevenDays(state, 8);
state.flags['c08-ledger-page'] = true;
state.flags['c08-vault-won'] = true;
caseFiles.applyEffects(state, content.battles['c08-vault-guard'].reward);
openAndChoose(state, 'c08-finale');
assert(state.flags['c08-complete'], '第八章未完成');
assert(state.characters.wenyan.recruited, '吕秀才未在第八章加入');
assert(state.flags['season-1-complete'], '第一季完成旗标缺失');
assert(state.campaign.seasonRatings['season-1'], '第一季评级缺失');
assert(state.market.normalized, '第一季结束后市场未恢复');

const rating = JSON.stringify(state.campaign.seasonRatings['season-1']);
caseFiles.finalizeSeason(state, 'season-1');
assert(JSON.stringify(state.campaign.seasonRatings['season-1']) === rating, '第一季评级重复结算');
assert(state.inn.history.length === 14, '第7、8章经营历史不是14日');

validateStepProviders(7);
validateStepProviders(8);
content.deepExplorationEvents.filter((event) => event.chapter === 7 || event.chapter === 8).forEach((event) => {
  assert(content.maps.some((map) => map.hotspots.some((spot) => spot.eventId === event.id)), `探索事件 ${event.id} 没有运行时热点`);
});

const migrated = store.normalize(JSON.parse(JSON.stringify(state)));
assert(migrated.caseFiles.evidence['test-ticket'], 'v9兼容存档丢失证据');
assert(migrated.market.normalized, 'v9兼容存档丢失市场状态');
assert(migrated.protagonist === 'zhangdeng', '迁移后主角不再固定为佟湘玉');

const advanced = store.freshState();
campaign.ensure(advanced);
advanced.flags['c06-complete'] = true;
campaign.setStage(advanced, 'wenyan', 'recruited', '测试较新存档');
openAndChoose(advanced, 'c07-briefing');
advanced.flags['c07-tickets-saved'] = true;
openAndChoose(advanced, 'c07-finale');
assert(advanced.flags['c07-complete'], '已越过信任阶段的存档无法完成第七章');
openAndChoose(advanced, 'c08-briefing');
advanced.flags['c08-ledger-page'] = true;
advanced.flags['c08-vault-won'] = true;
openAndChoose(advanced, 'c08-finale');
assert(advanced.flags['c08-complete'], '已招募吕秀才的兼容存档无法完成第八章');

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}
console.log('Chapters 7-8 validation passed: market, evidence, 14 settlements, recruitment gate and season rating.');
