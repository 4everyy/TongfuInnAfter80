const campaign = require('../minigame/data/campaign');
const store = require('../minigame/src/core/store');
const campaignSystem = require('../minigame/src/core/campaign');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(campaign.BRAND.title === '灯下江湖', '品牌名不正确');
assert(campaign.roles.length === 9, '原创核心角色不是9人');
assert(campaign.seasons.length === 4, '主线不是4季');
assert(campaign.chapters.length === 32, '主线不是32章');
assert(campaign.days.length === 224, '日程不是224日');
assert(campaign.operationEvents.length === 96, '经营事件池不是96条');
assert(campaign.explorationEvents.length === 48, '探索事件池不是48条');
assert(campaign.rareEvents.length === 24, '稀有连续事件池不是24条');

campaign.chapters.forEach((chapter, index) => {
  assert(chapter.number === index + 1, `章节序号断裂：${chapter.id}`);
  assert(chapter.endDay - chapter.startDay === 6, `章节不是7日：${chapter.id}`);
  assert(campaign.days.filter((day) => day.chapterId === chapter.id).length === 7, `章节日程缺失：${chapter.id}`);
});

Object.keys(campaign.recruitment).forEach((roleId) => {
  const route = campaign.recruitment[roleId];
  assert(route.encounter <= route.cooperate && route.cooperate <= route.trust, `招募阶段乱序：${roleId}`);
  assert(route.trust <= route.quest && route.quest <= route.recruit && route.recruit <= route.finale, `招募任务乱序：${roleId}`);
});

const state = store.freshState();
campaignSystem.ensure(state);
assert(state.party.length === 1 && state.party[0] === campaign.BRAND.protagonist, '原创新档不是单人开局');
campaignSystem.addTemporaryFollower(state, 'wuchen', '验证临时协作');
assert(state.characters.wuchen.temporary && !state.characters.wuchen.recruited, '临时协作被错误视为正式招募');
campaignSystem.recruit(state, 'wuchen', '验证正式招募');
assert(state.characters.wuchen.recruited && !state.characters.wuchen.temporary, '正式招募状态错误');

console.log('Campaign v9 validation passed: 4 seasons, 32 chapters, 224 days, 9 original roles.');
