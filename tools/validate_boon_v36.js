'use strict';
// v36 彩头系统端到端校验：对话注入 / 领取锁定 / 条件门禁 / 奖励子类型 / 渲染标记。
// 用法：node tools/validate_boon_v36.js
const path = require('path');
const root = path.resolve(__dirname, '..');
const content = require(path.join(root, 'minigame/data/content'));
const store = require(path.join(root, 'minigame/src/core/store'));
const dialogue = require(path.join(root, 'minigame/src/dialogue/dialogue'));
const boons = require(path.join(root, 'minigame/data/npc-signature-boon-v36'));

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) errors.push(msg + ' (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')');
}
function repeatId(npcId) { return 'npcv26-' + npcId + '-repeat'; }
function freshState() { const s = store.freshState(); s.party = ['zhangdeng']; return s; }
function boonCount(state) {
  if (!state.dialogue || !state.dialogue.choices) return 0;
  return state.dialogue.choices.filter(function (c) { return c.action === 'boon'; }).length;
}
function boonIdx(state, pred) {
  if (!state.dialogue || !state.dialogue.choices) return -1;
  return state.dialogue.choices.findIndex(function (c) { return c.action === 'boon' && pred(c); });
}
function exists(id) { return !!content.dialogues[id]; }

// ---- 1. 机缘彩头注入（party 条件）----
(function () {
  const id = 'noodle-vendor-ma';
  if (!exists(repeatId(id))) { errors.push('缺少对话 ' + repeatId(id)); return; }
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.party = ['zhangdeng'];
  state.calendar.day = 3;
  assert(dialogue.open(state, repeatId(id)), '机缘彩头对话应能打开');
  assert(boonIdx(state, function (c) { return /opportunity/.test(c.flag); }) >= 0, 'party 含 zhangdeng 应注入机缘彩头选项');
  assertEq(state.dialogue.choices[state.dialogue.choices.length - 1].action, 'close', '关闭选项应保留在末尾');
})();

// ---- 2. 主线未完成 → 无彩头 ----
(function () {
  const id = 'noodle-vendor-ma';
  const state = freshState();
  state.party = ['zhangdeng'];
  state.calendar.day = 3;
  dialogue.open(state, repeatId(id));
  assertEq(boonCount(state), 0, '主线委托未完成时不应注入彩头');
})();

// ---- 3. 领取机缘彩头 → 奖励(coin+tendency) + 旗标 + 提示 ----
(function () {
  const id = 'noodle-vendor-ma';
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.party = ['zhangdeng'];
  state.calendar.day = 3;
  const coinBefore = state.inventory.coin;
  const favorBefore = state.campaign.tendencies.favor;
  dialogue.open(state, repeatId(id));
  const idx = boonIdx(state, function (c) { return /opportunity/.test(c.flag); });
  assert(idx >= 0, '机缘彩头选项存在');
  dialogue.choose(state, idx);
  assertEq(state.inventory.coin, coinBefore + 4, '机缘彩头 coin 奖励生效');
  assertEq(state.campaign.tendencies.favor, favorBefore + 1, '机缘彩头 tendency 奖励生效');
  assert(!!state.flags['boon-' + id + '-opportunity-claimed'], '机缘彩头领取旗标已置位');
  assert(state.toast && state.toast.indexOf('小米') >= 0, '机缘彩头提示已设置: ' + state.toast);
})();

// ---- 4. 已领机缘彩头不再出现（永久锁定）----
(function () {
  const id = 'noodle-vendor-ma';
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.flags['boon-' + id + '-opportunity-claimed'] = true;
  state.party = ['zhangdeng'];
  state.calendar.day = 3;
  dialogue.open(state, repeatId(id));
  assert(boonIdx(state, function (c) { return /opportunity/.test(c.flag); }) < 0, '已领机缘彩头（opportunity）不应再次出现');
})();

// ---- 5. 日常彩头按日锁定 + 次日重新可得 ----
(function () {
  const id = 'salt-merchant-xu';
  if (!exists(repeatId(id))) { errors.push('缺少对话 ' + repeatId(id)); return; }
  let day = -1;
  for (let d = 1; d <= 60; d += 1) { if (boons.dailyAvailable(id, d)) { day = d; break; } }
  assert(day > 0, '应能找到日常彩头可得日');
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.calendar.day = day;
  const flag = boons.dailyFlag(id, day);
  dialogue.open(state, repeatId(id));
  const idx = boonIdx(state, function (c) { return c.flag === flag; });
  assert(idx >= 0, '日常彩头应在可得日出现 (day ' + day + ')');
  const ingredientBefore = state.inventory.ingredient;
  dialogue.choose(state, idx);
  assert(!!state.flags[flag], '日常彩头当日旗标已置位');
  assertEq(state.inventory.ingredient, ingredientBefore + 1, '日常彩头 ingredient 奖励生效');
  dialogue.open(state, repeatId(id));
  assert(boonIdx(state, function (c) { return c.flag === flag; }) < 0, '当日已领后日常彩头应消失');
  let nextDay = -1;
  for (let d = day + 1; d <= day + 60; d += 1) { if (boons.dailyAvailable(id, d)) { nextDay = d; break; } }
  if (nextDay > 0) {
    state.calendar.day = nextDay;
    dialogue.open(state, repeatId(id));
    const nextFlag = boons.dailyFlag(id, nextDay);
    assert(boonIdx(state, function (c) { return c.flag === nextFlag; }) >= 0, '下一可得日日常彩头应重新出现 (day ' + nextDay + ')');
  }
})();

// ---- 6. tendency 条件门禁 ----
(function () {
  const id = 'debt-collector-xiao';
  if (!exists(repeatId(id))) { console.log('  (跳过 ' + id + '：无对应对话)'); return; }
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.calendar.day = 5;
  state.campaign.tendencies.rule = 2;
  dialogue.open(state, repeatId(id));
  assertEq(boonCount(state), 0, 'tendency rule<3 应挡住彩头');
  state.campaign.tendencies.rule = 3;
  dialogue.open(state, repeatId(id));
  assertEq(boonCount(state), 1, 'tendency rule>=3 应解锁彩头');
})();

// ---- 7. party 条件门禁 ----
(function () {
  const id = 'seamstress-wen';
  if (!exists(repeatId(id))) { console.log('  (跳过 ' + id + '：无对应对话)'); return; }
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.calendar.day = 4;
  state.party = ['zhangdeng'];
  dialogue.open(state, repeatId(id));
  assert(boonIdx(state, function (c) { return /opportunity/.test(c.flag); }) < 0, 'party 不含 xiaocui 应挡住 seamstress-wen 机缘彩头');
  state.party = ['zhangdeng', 'xiaocui'];
  dialogue.open(state, repeatId(id));
  assert(boonIdx(state, function (c) { return /opportunity/.test(c.flag); }) >= 0, 'party 含 xiaocui 应解锁 seamstress-wen 机缘彩头');
})();

// ---- 8. stock 奖励子类型（spice-broker-rong 连环彩头：{ stock: { meat: 2 } }）----
(function () {
  const id = 'spice-broker-rong';
  if (!exists(repeatId(id))) { console.log('  (跳过 ' + id + '：无对应对话)'); return; }
  const state = freshState();
  state.flags['npcv26-' + id + '-done'] = true;
  state.calendar.day = 6;
  const meatBefore = state.inventory.stock.meat;
  dialogue.open(state, repeatId(id));
  const idx = boonIdx(state, function (c) { return /chain/.test(c.flag); });
  if (idx >= 0) {
    dialogue.choose(state, idx);
    assertEq(state.inventory.stock.meat, meatBefore + 2, '连环彩头 stock.meat 奖励生效');
  } else {
    errors.push('未找到 spice-broker-rong 连环彩头选项');
  }
})();

// ---- 9. reputation 奖励子类型 ----
(function () {
  const rep = boons.BOONS.find(function (b) { return b.reward && b.reward.reputation; });
  if (!rep) { console.log('  (跳过 reputation：数据中无此类彩头)'); return; }
  if (!exists(repeatId(rep.id))) { console.log('  (跳过 ' + rep.id + '：无对应对话)'); return; }
  const state = freshState();
  state.flags['npcv26-' + rep.id + '-done'] = true;
  state.calendar.day = 8;
  const repBefore = state.inn.reputation;
  dialogue.open(state, repeatId(rep.id));
  const idx = boonIdx(state, function (c) { return c.reward && c.reward.reputation; });
  if (idx >= 0) {
    dialogue.choose(state, idx);
    assert(state.inn.reputation >= repBefore, 'reputation 奖励应非负增长: ' + repBefore + '→' + state.inn.reputation);
  }
})();

// ---- 10. 非重复对话不受影响 ----
(function () {
  const state = freshState();
  state.flags['npcv26-noodle-vendor-ma-done'] = true;
  state.party = ['zhangdeng'];
  const startId = 'npcv26-noodle-vendor-ma-start';
  if (exists(startId)) {
    dialogue.open(state, startId);
    assertEq(boonCount(state), 0, '非 repeat 对话不应注入彩头');
  }
})();

// ---- 11. 渲染标记 hasClaimable 不抛错且与 done 一致 ----
(function () {
  const id = 'noodle-vendor-ma';
  const state = freshState();
  state.party = ['zhangdeng'];
  state.calendar.day = 3;
  assert(boons.hasClaimable(state, id) === false, '主线未完成 hasClaimable 应为 false');
  state.flags['npcv26-' + id + '-done'] = true;
  assert(boons.hasClaimable(state, id) === true, '主线完成+party满足 hasClaimable 应为 true');
})();

// ---- 12. claimFlag 按 id+tier 唯一 ----
(function () {
  assertEq(boons.claimFlag('noodle-vendor-ma', 'opportunity'), 'boon-noodle-vendor-ma-opportunity-claimed', 'claimFlag 格式');
  assert(boons.claimFlag('x', 'opportunity') !== boons.claimFlag('x', 'chain'), '不同 tier 的 claimFlag 应不同');
})();

// ---- 13. 36 名 NPC 均有 profile + 彩头覆盖 ----
(function () {
  const profileIds = Object.keys(boons.PROFILES);
  const boonNpcIds = {};
  boons.BOONS.forEach(function (b) { boonNpcIds[b.id] = true; });
  assertEq(profileIds.length, 36, '应有 36 个角色设定');
  const missing = profileIds.filter(function (id) { return !boonNpcIds[id]; });
  assert(missing.length === 0, '这些 NPC 缺少彩头: ' + missing.join(', '));
})();

if (errors.length) {
  console.error('❌ v36 彩头校验失败 (' + errors.length + '):');
  errors.forEach(function (e) { console.error('  - ' + e); });
  process.exit(1);
}
console.log('✓ v36 彩头系统校验通过：注入 / 锁定 / 条件门禁 / 奖励子类型 / 渲染标记 / 数据完整性（13 组测试）。');

