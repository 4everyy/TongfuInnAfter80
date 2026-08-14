const content = require('../../data/content');
const dialogues = content.dialogues;
const world = require('../world/explore');
const innSystem = require('../inn/inn');
const worldTime = require('../core/time');
const campaign = require('../core/campaign');
const caseFiles = require('../core/case-files');
const branches = require('../inn/branches');
const transport = require('../core/transport');
const presentation = require('../../data/presentation');
const commerce = require('../world/commerce');
const boons = require('../../data/npc-signature-boon-v36');

function open(state, id) {
  const definition = dialogues[id];
  let visual;
  if (!definition) return false;
  visual = presentation.dialogue(id, definition);
  state.dialogue = Object.assign({ id }, definition, {
    speaker: definition.speakerId ? content.identity.roleName(definition.speakerId) : content.identity.resolve(definition.speaker),
    speakerId: definition.speakerId || null,
    text: content.identity.resolve(definition.text),
    openedAt: Date.now(),
    revealed: false,
    presentation: definition.presentation || visual.presentation,
    listenerId: definition.listenerId || visual.listenerId,
    expression: definition.expression || visual.expression,
    pose: definition.pose || visual.pose,
    choices: (definition.choices || []).map(function (choice) {
      return Object.assign({}, choice, { label: content.identity.resolve(choice.label) });
    }),
  });
  injectBoonChoices(state, id);
  return true;
}

function recruit(state, roleId) {
  campaign.recruit(state, roleId, '完成专属招募任务。');
}

function stageAtLeast(state, roleId, stage) {
  const character = state.characters[roleId];
  return !!character && campaign.STAGES.indexOf(character.recruitmentStage) >= campaign.STAGES.indexOf(stage);
}

function applyReward(state, reward) {
  var key;
  if (!reward) return;
  if (reward.coin) state.inventory.coin = Math.max(0, state.inventory.coin + reward.coin);
  if (reward.ingredient) innSystem.changeStock(state, { staple: reward.ingredient });
  if (reward.medicine) state.inventory.medicine = Math.max(0, state.inventory.medicine + reward.medicine);
  // v36 彩头扩展：细分类库存 / 口碑 / 长期倾向 / 角色好感（沿用既有累加先例）
  if (reward.stock) innSystem.changeStock(state, reward.stock);
  if (reward.reputation) state.inn.reputation = Math.max(0, (state.inn.reputation || 0) + reward.reputation);
  if (reward.tendency && state.campaign && state.campaign.tendencies) {
    for (key in reward.tendency) {
      if (state.campaign.tendencies[key] != null) state.campaign.tendencies[key] += reward.tendency[key];
    }
  }
  if (reward.trust && state.relationships) {
    for (key in reward.trust) {
      if (state.relationships[key]) {
        state.relationships[key].trust = Math.max(0, (state.relationships[key].trust || 0) + reward.trust[key]);
      }
    }
  }
}

// v36 彩头：在"回头再见"对话（npcv26-<id>-repeat）里，按运行期状态注入可领彩头选项。
// 彩头仅在 NPC 主线委托完成后出现，与 repeat 对话的可见条件一致；未触发时对话内容不变。
function injectBoonChoices(state, id) {
  var prefix = 'npcv26-';
  var suffix = '-repeat';
  var npcId;
  var boonChoices;
  var closeChoice;
  if (!id || id.indexOf(prefix) !== 0 || id.length <= prefix.length + suffix.length) return;
  if (id.indexOf(suffix) !== id.length - suffix.length) return;
  npcId = id.slice(prefix.length, id.length - suffix.length);
  boonChoices = boons.resolve(state, npcId);
  if (!boonChoices.length || !state.dialogue || !state.dialogue.choices) return;
  // 把彩头选项插在末尾的"回头再见/关闭"之前
  closeChoice = state.dialogue.choices.length ? state.dialogue.choices.pop() : null;
  boonChoices.forEach(function (choice) { state.dialogue.choices.push(choice); });
  if (closeChoice) state.dialogue.choices.push(closeChoice);
}

function choose(state, index) {
  const dialogue = state.dialogue;
  if (!dialogue) return;
  const choice = dialogue.choices[index];
  if (!choice) return;

  if (choice.flag
    && ['completeDeepChapter', 'startSeason2', 'meetShiwei', 'cooperateShiwei', 'trustShiwei', 'questShiwei', 'completeSeason2Chapter'].indexOf(choice.action) < 0) {
    state.flags[choice.flag] = true;
  }
  if (choice.reward) applyReward(state, choice.reward);

  if (choice.action === 'inn') innSystem.enterManagement(state, !!(state.sideQuests && state.sideQuests.activeId));
  if (choice.action === 'party') state.modal = { type: 'party' };
  if (choice.action === 'shop') commerce.open(state, choice.shopId);
  if (choice.action === 'flag') state.toast = '任务状态已更新。';
  if (choice.action === 'reward') state.toast = choice.reward && choice.reward.coin < 0 ? '喝过热茶，精神好多了。' : '获得了一份补给。';
  if (choice.action === 'boon') state.toast = choice.toast || '收下了一份彩头。';
  if (choice.action === 'caseEvidence') {
    if (choice.evidence) caseFiles.addEvidence(state, choice.evidence);
    state.toast = '线索已经记入证据簿。';
  }

  if (choice.action === 'recruit') {
    recruit(state, choice.roleId);
    state.toast = `${choice.roleId === 'jingzhi' ? '霍惊枝' : '新伙伴'}加入队伍！`;
    world.resetTrail(state);
  }

  if (choice.action === 'cooperate') {
    campaign.addTemporaryFollower(state, choice.roleId, choice.note || '因当前事件临时同行。');
    state.toast = choice.label + '：对方将作为临时伙伴同行。';
    world.resetTrail(state);
  }

  if (choice.action === 'startChapter') {
    if (choice.chapter === 10) {
      branches.unlock(state, 'jiangnan');
      branches.switchTo(state, 'jiangnan');
      state.campaign.season = 2;
      state.mapVariants.weather = 'clear';
      world.spawn(state, 'jiangnan_branch', 'recovery', '水巷分店重新点灯，先检查客房、灶台和停业账目。');
    }
    state.campaign.chapter = choice.chapter;
    state.campaign.chapterDay = 1;
    state.campaign.step = 'briefing';
    if (choice.chapter === 3) {
      campaign.advanceStage(state, 'wuchen', 'encountered', '黑印路引牵出旧信。');
      campaign.advanceStage(state, 'wuchen', 'cooperating', '共同追查伪造路引。');
    }
    if (choice.chapter === 4) campaign.advanceStage(state, 'jingzhi', 'encountered', '镖旗事件中再次相遇。');
    if (choice.chapter === 5) {
      campaign.setStage(state, 'jingzhi', 'cooperating', '以临时护院身份协助查双账。');
      campaign.setStage(state, 'wenyan', 'cooperating', '协助比对商会契纸与客栈货单。');
    }
    if (choice.chapter === 6) {
      campaign.setStage(state, 'jingzhi', 'trusted', '双账事件后愿意继续保护证人与客栈。');
      campaign.setStage(state, 'wenyan', 'cooperating', '继续协助调查义仓账目。');
    }
    if (choice.chapter === 7) {
      campaign.setStage(state, 'wenyan', 'trusted', '完成双账与义仓核验后，愿意公开调查异常价格。');
      caseFiles.updateMarket(state, {
        mode: 'set',
        multipliers: { staple: 1.55, vegetable: 1.35, meat: 1.28, tea: 1.18 },
        pressure: 72,
        pressureMode: 'set',
        normalized: false,
      }, '商盟统一抬价');
    }
    if (choice.chapter === 8) {
      campaign.setStage(state, 'wenyan', 'quest', '公开核价后追查旧账册残页。');
    }
    if (choice.chapter === 11) {
      branches.unlock(state, 'jiangnan');
      branches.switchTo(state, 'jiangnan');
      state.campaign.season = 2;
      state.mapVariants.weather = 'clear';
      campaign.setStage(state, 'shiwei', 'cooperating', '继续协助调查水巷分店的失味宴席。');
      world.spawn(state, 'jiangnan_branch', 'recovery', '开张宴出现集中退菜，先检查样菜与食材批次。');
    }
    state.toast = '新章节已经开始，经营与探索线索会跨日保存。';
  }

  if (choice.action === 'startSeason2') {
    if (!state.flags['season-2-prologue-unlocked'] && !state.flags['season-1-complete']) {
      state.toast = '完成第一季结算后，才能启程前往江南。';
      state.dialogue = null;
      world.syncQuest(state);
      return;
    }
    state.campaign.season = 2;
    state.campaign.chapter = 9;
    state.campaign.chapterDay = 1;
    state.campaign.step = 'briefing';
    state.flags['c09-started'] = true;
    transport.create(state, {
      key: 'c09-jiangnan-provisions',
      origin: 'changfeng',
      destination: 'jiangnan',
      cargo: { staple: 1, vegetable: 1, meat: 0, tea: 1 },
      days: 2,
    });
    state.mapVariants.weather = 'clear';
    world.spawn(state, 'jiangnan_dock', 'arrival', '船抵江南，先调查码头上失踪的香料箱。');
  }

  if (choice.action === 'meetShiwei') {
    campaign.setStage(state, 'shiwei', 'encountered', '在河市临时灶台旁确认香料调包线索。');
    state.relationships.shiwei.trust += 4;
    state.flags['c09-shiwei-met'] = true;
    state.toast = '李大嘴记下了这份人情，但还没有答应同行。';
  }

  if (choice.action === 'cooperateShiwei') {
    campaign.addTemporaryFollower(state, choice.roleId || 'shiwei', '协助修复水巷分店灶台并筹备开张宴。');
    state.relationships.shiwei.trust += 8;
    state.flags['c10-shiwei-cooperating'] = true;
    state.toast = '李大嘴成为临时伙伴；完成专属任务前不能永久编队。';
    world.resetTrail(state);
  }

  if (choice.action === 'trustShiwei') {
    if (!state.flags['c11-market-traced'] || !stageAtLeast(state, 'shiwei', 'cooperating')) {
      state.toast = '同批香料的采购记录还没有查清。';
      state.dialogue = null;
      world.syncQuest(state);
      return;
    }
    campaign.advanceStage(state, choice.roleId || 'shiwei', 'trusted', '主动说明旧厨房封记与失味宴席的关系。');
    state.relationships.shiwei.trust += 14;
    state.flags['c11-shiwei-trusted'] = true;
    state.toast = '李大嘴进入信任阶段，旧宴灶院的线索已经开放。';
  }

  if (choice.action === 'questShiwei') {
    if (!state.flags['c11-recipe-fragment'] || !stageAtLeast(state, 'shiwei', 'trusted')) {
      state.toast = '烧损菜谱和旧厨房的来历还没有查清。';
      state.dialogue = null;
      world.syncQuest(state);
      return;
    }
    campaign.advanceStage(state, choice.roleId || 'shiwei', 'quest', '决定重燃宴锅、保护菜谱并公开复宴。');
    state.flags['c11-shiwei-quest'] = true;
    state.toast = '李大嘴的专属任务已经开始：完成调味、控火与护证。';
  }

  if (choice.action === 'completeSeason2Chapter') {
    if (choice.chapter === 9) {
      if (!state.flags['c09-ferry-won'] || !state.flags['c09-shiwei-met']) {
        state.toast = '香料箱、船单和渡口冲突还没有查清。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.completeChapter(state, 9);
      state.flags['c09-complete'] = true;
      state.campaign.chapter = 10;
      state.campaign.chapterDay = 1;
      branches.unlock(state, 'jiangnan');
      branches.switchTo(state, 'jiangnan');
      state.mapVariants.weather = 'clear';
      world.spawn(state, 'jiangnan_branch', 'recovery', '水巷分店已经接管，开张前先检查停业留下的问题。');
      state.toast = '第九章完成：水巷分店已解锁，李大嘴仍处于相遇阶段。';
    }
    if (choice.chapter === 10) {
      if (!state.flags['c10-banquet-won'] || !state.flags['c10-stove-repaired']
        || !stageAtLeast(state, 'shiwei', 'cooperating')) {
        state.toast = '灶台、开张货物或李大嘴的临时合作尚未完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.completeChapter(state, 10);
      state.flags['c10-complete'] = true;
      state.campaign.chapter = 11;
      state.campaign.chapterDay = 1;
      branches.capture(state);
      state.toast = '第十章完成：水巷分店正式开张，李大嘴保持临时伙伴状态。';
    }
    if (choice.chapter === 11) {
      if (!state.flags['c11-seasoning-complete'] || !state.flags['c11-fire-complete']
        || !state.flags['c11-saboteurs-won'] || !stageAtLeast(state, 'shiwei', 'quest')) {
        state.toast = '调味、控火、护证或李大嘴的专属任务还没有完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      if (choice.tendency && state.campaign.tendencies[choice.tendency] != null) {
        state.campaign.tendencies[choice.tendency] += 2;
      }
      campaign.recruit(state, choice.recruit || 'shiwei', '完成失味宴席调查并重开百味旧灶院。');
      state.relationships.shiwei.trust += 18;
      state.flags['c11-complete'] = true;
      campaign.completeChapter(state, 11);
      state.campaign.chapter = 12;
      state.campaign.chapterDay = 1;
      if (state.recipeResearch && state.recipeResearch.unlockedRecipes.indexOf('醒香三鲜羹') < 0) {
        state.recipeResearch.unlockedRecipes.push('醒香三鲜羹');
      }
      branches.capture(state);
      state.toast = '第十一章完成：李大嘴正式加入，解锁菜谱“醒香三鲜羹”。';
      world.resetTrail(state);
    }
    worldTime.advance(state, 'story-complete');
  }

  if (choice.action === 'trust') {
    if (choice.tendency && state.campaign.tendencies[choice.tendency] != null) state.campaign.tendencies[choice.tendency] += 1;
    state.relationships[choice.roleId].trust += 12;
    campaign.advanceStage(state, choice.roleId, 'trusted', '共同面对旧信的责任。');
    campaign.advanceStage(state, choice.roleId, 'quest', '以诱饵账册完成专属任务。');
    state.flags['c03-wuchen-trusted'] = true;
    state.toast = '信任考验完成，新的行动方案已经出现。';
  }

  if (choice.action === 'returnInn') {
    world.spawn(state, 'inn', 'recovery', '货物已经带回长风客栈。');
  }

  if (choice.action === 'completeChapter') {
    if (choice.recruit) recruit(state, choice.recruit);
    campaign.completeChapter(state, choice.chapter || 2);
    innSystem.markSideQuestComplete(state, 'late-letter');
    state.inventory.coin += 30;
    state.inn.reputation += 2;
    state.toast = '“迟到的驿信”完成：旧账册的线索指向雁回镇外。';
    state.modal = { type: 'party' };
    worldTime.advance(state, 'story-complete');
    if (state.explorationContext) state.explorationContext.advancesTimeOnReturn = false;
  }


  if (choice.action === 'completeDeepChapter') {
    if (choice.chapter === 3) {
      if (!state.flags['c03-sting-won'] || state.characters.wuchen.recruitmentStage !== 'quest') {
        state.toast = '白展堂的专属任务尚未完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      recruit(state, choice.recruit);
    }
    if (choice.chapter === 4) {
      if (!state.flags['c04-river-won']) {
        state.toast = '河滩的货物证据尚未保住。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.advanceStage(state, choice.cooperate, 'cooperating', '镖旗事件后约定继续合作。');
      campaign.addTemporaryFollower(state, choice.cooperate, '查清调包货物后继续同行。');
      campaign.setStage(state, 'wenyan', 'cooperating', '镖旗事件后开始协助核对货单。');
    }
    if (choice.chapter === 5) {
      if (!state.flags['c05-audit-won'] || state.characters.jingzhi.recruitmentStage !== 'cooperating') {
        state.toast = '双重账册或证人尚未保住。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.advanceStage(state, choice.trust, 'trusted', '护送证人并保住双重账册。');
      state.relationships.jingzhi.trust += 15;
    }
    if (choice.chapter === 6) {
      if (!state.flags['c06-checkpoint-won'] || state.characters.jingzhi.recruitmentStage !== 'trusted') {
        state.toast = '河渠关卡尚未打通，郭芙蓉的专属任务没有完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.advanceStage(state, 'jingzhi', 'quest', '选择保护证人与赈济粮车。');
      recruit(state, choice.recruit);
      if (choice.trust) {
        campaign.setStage(state, choice.trust, 'trusted', '在双账与义仓事件中完成账务判断。');
        state.relationships[choice.trust].trust += 12;
      }
    }
    if (choice.chapter === 7) {
      if (!state.flags['c07-tickets-saved'] || !stageAtLeast(state, 'wenyan', 'trusted')) {
        state.toast = '原始货票或吕秀才的信任考验尚未完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      campaign.advanceStage(state, choice.quest || 'wenyan', 'quest', '完成公开核价，决定追查账册第一页。');
      state.relationships.wenyan.trust += 15;
    }
    if (choice.chapter === 8) {
      if (!state.flags['c08-vault-won'] || !state.flags['c08-ledger-page']
        || !stageAtLeast(state, 'wenyan', 'quest')) {
        state.toast = '账册第一页、守库战斗或吕秀才专属任务尚未完成。';
        state.dialogue = null;
        world.syncQuest(state);
        return;
      }
      recruit(state, choice.recruit);
    }
    if (choice.flag) state.flags[choice.flag] = true;
    campaign.completeChapter(state, choice.chapter);
    state.campaign.chapter = Math.min(32, choice.chapter + 1);
    state.campaign.chapterDay = 1;
    state.inventory.coin += choice.chapter === 3 ? 36 : choice.chapter === 6 ? 42 : 30;
    state.inn.reputation += choice.chapter >= 5 ? 3 : 2;
    if (choice.chapter === 8) {
      const rating = caseFiles.finalizeSeason(state, 'season-1');
      state.flags['season-1-complete'] = true;
      state.flags['season-2-prologue-unlocked'] = true;
      state.campaign.season = 2;
      state.toast = '第一季完成：评级 ' + rating.grade + '，吕秀才正式加入。';
    }
    state.toast = {
      3: '第三章完成：白展堂正式加入。',
      4: '第四章完成：郭芙蓉成为临时伙伴。',
      5: '第五章完成：郭芙蓉通过信任考验。',
      6: '第六章完成：郭芙蓉正式加入，吕秀才达到信任阶段。',
      7: '第七章完成：吕秀才开启专属任务。',
      8: state.toast,
    }[choice.chapter] || '章节完成。';
    worldTime.advance(state, 'story-complete');
  }

  state.dialogue = null;
  world.syncQuest(state);
}

module.exports = { open, choose };
