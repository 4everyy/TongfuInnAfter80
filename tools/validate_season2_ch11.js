'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const campaign = require(path.join(root, 'minigame/src/core/campaign'));
const cookingTrials = require(path.join(root, 'minigame/src/inn/cooking-trials'));
const content = require(path.join(root, 'minigame/data/content'));

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(content.maps.length === 27, '第11章接入后应有27张地图');
assert(content.deepDayPlans.filter((item) => item.chapter === 11).length === 7, '第11章必须包含7个日程节点');
assert(Object.keys(content.cookingTrials).length === 3, '辨料、调味、控火三个试炼必须登记');
assert(content.maps.some((map) => map.id === 'jiangnan_spice_workshop'), '缺少江南香料作坊');
assert(content.maps.some((map) => map.id === 'old_banquet_kitchen'), '缺少百味旧灶院');

const titleSource = fs.readFileSync(path.join(root, 'minigame/src/render/views/title.js'), 'utf8');
assert((titleSource.match(/ui\.addButton/g) || []).length === 1, '首页必须只有一个可点击主入口');
assert(titleSource.includes('开始棋局') && titleSource.includes("type: 'startAdventure'"), '首页缺少“开始棋局”主入口');
assert(!titleSource.includes('客栈经营') && !titleSource.includes('开发档案'), '首页仍包含旧入口文案');

const state = store.freshState();
state.flags['c10-complete'] = true;
state.campaign.season = 2;
state.campaign.chapter = 11;
campaign.setStage(state, 'shiwei', 'cooperating', 'test');

dialogue.open(state, 'c11-briefing');
dialogue.choose(state, 0);
assert(state.flags['c11-started'], '第11章没有正确启动');
assert(state.mapId === 'jiangnan_branch', '第11章应从水巷分店开始');
assert(state.protagonist === 'zhangdeng', '探索主角必须保持佟湘玉');

cookingTrials.registerSample(state, { id: 'returned-banquet-dishes', name: '退回菜品' });
state.flags['c11-returns-checked'] = true;
cookingTrials.start(state, 'c11-identify-spice');
[1, 2, 2].forEach((choice) => cookingTrials.choose(state, choice));
assert(state.flags['c11-identify-complete'] && state.flags['c11-identify-mastered'], '辨料试炼没有完成');

state.flags['c11-market-traced'] = true;
dialogue.open(state, 'c11-shiwei-trust');
dialogue.choose(state, 0);
assert(state.characters.shiwei.recruitmentStage === 'trusted', '李大嘴没有进入信任阶段');
assert(!state.characters.shiwei.recruited, '李大嘴在专属任务前被提前招募');

state.flags['c11-recipe-fragment'] = true;
dialogue.open(state, 'c11-shiwei-quest');
dialogue.choose(state, 0);
assert(state.characters.shiwei.recruitmentStage === 'quest', '李大嘴没有进入专属任务阶段');

cookingTrials.start(state, 'c11-seasoning-balance');
[1, 2, 0].forEach((choice) => cookingTrials.choose(state, choice));
cookingTrials.start(state, 'c11-fire-control');
[1, 0, 1].forEach((choice) => cookingTrials.choose(state, choice));
assert(state.flags['c11-seasoning-complete'] && state.flags['c11-fire-complete'], '调味或控火试炼没有完成');

state.flags['c11-saboteurs-won'] = true;
dialogue.open(state, 'c11-finale');
dialogue.choose(state, 2);
assert(state.flags['c11-complete'], '第11章没有完成');
assert(state.characters.shiwei.recruited, '李大嘴没有在专属任务完成后正式加入');
assert(state.campaign.chapter === 12, '第11章完成后没有进入第12章');
assert(state.protagonist === 'zhangdeng', '李大嘴加入后改变了探索主角');
assert(state.recipeResearch.unlockedRecipes.includes('醒香三鲜羹'), '章节奖励菜谱没有解锁');
assert(state.campaign.tendencies.venture >= 2, '章末选择没有写入长期倾向');

const saved = JSON.parse(JSON.stringify(state));
const restored = store.normalize(saved);
assert(restored.recipeResearch.results['c11-fire-control'].status === 'complete', '烹饪试炼结果没有随存档恢复');
assert(restored.characters.shiwei.recruited, '李大嘴招募状态没有随存档恢复');

const blocked = store.freshState();
blocked.flags['c10-complete'] = true;
campaign.setStage(blocked, 'shiwei', 'cooperating', 'test');
dialogue.open(blocked, 'c11-finale');
dialogue.choose(blocked, 0);
assert(!blocked.characters.shiwei.recruited, '缺少试炼与护证时仍可提前招募李大嘴');

if (errors.length) {
  errors.forEach((error) => console.error('ERROR:', error));
  process.exit(1);
}

console.log('Season 2 chapter 11 validation passed: single-entry title, 7-day flow, three cooking trials and gated Shiwei recruitment.');
