const { freshState, load, save } = require('./core/store');
const world = require('./world/explore');
const dialogue = require('./dialogue/dialogue');
const combat = require('./combat/battle');
const inn = require('./inn/inn');
const chapter001 = require('../data/chapter001');
const doorwayCrisis = require('../data/doorway-crisis');
const { createRenderer } = require('./render/canvas');
const worldTime = require('./core/time');
const explorationEvents = require('./world/events');
const campaign = require('./core/campaign');
const identity = require('../data/identity');
const cookingTrials = require('./inn/cooking-trials');
const innScene = require('./inn/scene-interactions');
const commerce = require('./world/commerce');

function createGame(screenCanvas) {
  const canvas = screenCanvas || wx.createCanvas();
  const renderer = createRenderer(canvas);
  let state = load();
  const controls = { move: { x: 0, y: 0 } };
  let lastActionKey = '';
  let lastActionAt = 0;
  inn.ensure(state);
  innScene.ensure(state);
  campaign.ensure(state);
  world.syncQuest(state);

  function interact(targetId) {
    renderer.playAction(state.protagonist || 'zhangdeng', 'interact', 420);
    const spot = targetId
      ? world.visibleHotspots(state).find((item) => item.id === targetId && world.interactionState(state, item) === 'active')
      : world.activeHotspot(state);
    if (!spot) {
      state.toast = '附近没有可以互动的目标。';
      return;
    }
    explorationEvents.interact(state, spot, {
      crisis: (target) => doorwayCrisis.interact(state, target.crisisId),
      dialogue: (target) => dialogue.open(state, target.dialogue),
      battle: (target) => combat.start(state, target.battle),
      cookingTrial: (target) => cookingTrials.start(state, target.trial),
      recipeSample: (target) => cookingTrials.registerSample(state, target.sample),
      inn: () => {
        if (state.sideQuests.activeId) return inn.enterManagement(state, true);
        if (!state.explorationContext || state.explorationContext.advancesTimeOnReturn !== false) {
          worldTime.advance(state, 'return-to-inn');
        }
        inn.enterManagement(state, false);
        state.explorationContext = null;
        state.toast = '已返回' + identity.profile().innName + '，时间推进到' + worldTime.label(state.worldTime.phase) + '。';
        return true;
      },
      changeStock: (delta) => inn.changeStock(state, delta),
      syncQuest: () => world.syncQuest(state),
    });
  }

  function togglePartyMember(id) {
    const character = state.characters[id];
    if (!character || !campaign.canTravel(state, id)) return;
    const index = state.party.indexOf(id);
    if (index >= 0) {
      if (id === 'zhangdeng' || state.party.length <= 1) {
        state.toast = identity.roleName('zhangdeng') + '是探索主角，不能离开队伍。';
        return;
      }
      state.party.splice(index, 1);
    } else if (state.party.length >= 3) {
      state.toast = '上阵队伍最多三人，请先换下一名队员。';
      return;
    } else {
      state.party.push(id);
    }
    Object.keys(state.characters).forEach((roleId) => {
      state.characters[roleId].inParty = state.party.indexOf(roleId) >= 0;
    });
    world.resetTrail(state);
  }

  function dispatch(action) {
    let outing;
    const now = Date.now();
    const actionKey = action ? Object.keys(action).sort().map((key) => key + ':' + String(action[key])).join('|') : '';
    if (!action) return;
    if (actionKey === lastActionKey && now - lastActionAt < 220) return;
    lastActionKey = actionKey;
    lastActionAt = now;
    if (action.type === 'startAdventure') {
      state = freshState();
      campaign.ensure(state);
      state.screen = 'explore';
      state.mode = 'explore';
      state.protagonist = 'zhangdeng';
      state.activeId = 'zhangdeng';
      state.explorationContext = { source: 'title', purpose: 'free', returnMapId: 'inn', advancesTimeOnReturn: true };
      world.spawn(state, 'inn', 'recovery', identity.roleName('zhangdeng') + '决定亲自看看，客栈内外都可能藏着新故事。');
    }
    chapter001.dispatch(state, action);
    if (action.type === 'crisisAction') doorwayCrisis.interact(state, action.id);
    if (action.type === 'interact') interact();
    if (action.type === 'dialogueReveal' && state.dialogue) state.dialogue.revealed = true;
    if (action.type === 'dialogue') dialogue.choose(state, action.index);
    if (action.type === 'cookingTrialChoice') {
      cookingTrials.choose(state, action.index);
      world.syncQuest(state);
    }
    if (action.type === 'inn') inn.enterManagement(state, state.screen === 'explore' && !!state.sideQuests.activeId);
    if (action.type === 'startOuting') {
      outing = inn.startOuting(state, action.id);
      if (outing) {
        world.spawn(state, outing.mapId, outing.spawnId, action.id === 'late-letter' ? '开始调查东关货车。' : '出门自由探索。');
        if (outing.position) state.position = { x: outing.position.x, y: outing.position.y };
      }
    }
    if (action.type === 'returnManagement') inn.returnFromOuting(state);
    if (action.type === 'party') state.modal = { type: 'party' };
    if (action.type === 'task') state.modal = { type: 'task' };
    if (action.type === 'hudHelp') {
      state.toast = {
        coin: '银两：用于采购、装修和支付临时帮工。',
        ingredient: '食材：决定菜单供应与营业承载能力。',
        reputation: '口碑：影响客流、特殊来客和任务机会。',
        order: '秩序：影响纠纷、客房安全与营业效率。',
      }[action.id] || '';
    }
    innScene.dispatch(state, action);
    const pendingStoryHotspotId = innScene.consumePendingStory(state);
    if (pendingStoryHotspotId) interact(pendingStoryHotspotId);
    inn.dispatch(state, action);
    commerce.dispatch(state, action);
    if (action.type === 'partyToggle') togglePartyMember(action.id);
    if (action.type === 'partyActive' && state.party.indexOf(action.id) >= 0) {
      state.toast = action.id === 'zhangdeng'
        ? '柳掌灯当前是探索队长。'
        : renderer.role(action.id).name + '已加入战斗编成；探索仍由柳掌灯带队。';
    }
    if (action.type === 'retryAssets') renderer.retryAssets(state);
    if (action.type === 'transitionReturn') world.rollbackTransition(state);
    if (action.type === 'retryRuntime') renderer.render(state);
    if (action.type === 'returnInn') {
      if (state.activeBranchId === 'jiangnan') {
        state.screen = 'explore';
        state.mode = 'explore';
        state.modal = null;
        state.dialogue = null;
        worldTime.advance(state, 'battle-failure');
        state.protagonist = 'zhangdeng';
        state.activeId = 'zhangdeng';
        world.spawn(state, 'jiangnan_branch', 'recovery', '已返回水巷分店。');
        world.syncQuest(state);
        save(state);
        renderer.render(state);
        return;
      }
      state.screen = 'explore';
      state.mode = 'explore';
      state.modal = null;
      state.dialogue = null;
      worldTime.advance(state, 'battle-failure');
      state.protagonist = 'zhangdeng';
      state.activeId = 'zhangdeng';
      world.spawn(state, 'inn', 'recovery', '已返回' + identity.profile().innName + '。');
      world.syncQuest(state);
    }
    if (action.type === 'close') state.modal = null;
    if (action.type === 'attack' || action.type === 'skill' || action.type === 'defend') {
      combat.action(state, action.type, action.index, action.targetId);
    }
    if (action.type === 'battleTarget') combat.selectTarget(state, action.id);
    if (action.type === 'battleCancelTarget') combat.cancelTarget(state);
    if (action.type === 'battleInspect') combat.inspect(state, action.side, action.id);
    if (action.type === 'battleInspectClose') combat.closeInspect(state);
    if (action.type === 'battleSkipSettlement' && state.battle && state.battle.result) {
      state.battle.result.startedAt = Date.now() - 1200;
    }
    if (action.type === 'battleContinue') combat.finish(state);
    save(state);
    renderer.render(state);
  }

  function touchId(touch, fallback) {
    return touch.identifier == null ? fallback : touch.identifier;
  }

  function eachChanged(event, callback) {
    const touches = event.changedTouches || [];
    for (let index = 0; index < touches.length; index += 1) callback(touches[index], touchId(touches[index], index));
  }

  wx.onTouchStart((event) => {
    eachChanged(event, (point, id) => renderer.begin(id, point.clientX, point.clientY));
  });

  wx.onTouchMove((event) => {
    eachChanged(event, (point, id) => renderer.move(id, point.clientX, point.clientY));
  });

  wx.onTouchEnd((event) => {
    eachChanged(event, (point, id) => {
      const gesture = renderer.end(id, point.clientX, point.clientY);
      if (!gesture.wasJoystick && !gesture.moved) {
        const button = renderer.hit(point.clientX, point.clientY);
        if (button) dispatch(button.action);
      }
    });
  });

  if (wx.onTouchCancel) {
    wx.onTouchCancel((event) => eachChanged(event, (point, id) => renderer.end(id, point.clientX, point.clientY)));
  }

  setInterval(() => {
    try {
      controls.move = renderer.vector();
      if (
        state.screen === 'explore'
        && renderer.readyFor(state)
        && !state.modal
        && !state.dialogue
        && !state.battle
        && !(state.innScene && (state.innScene.activePage || state.innScene.microGame || state.innScene.serviceOpen))
        && !state.managementEvent
      ) world.update(state, controls, 1 / 30);
      else state.moving = false;
      renderer.render(state);
    } catch (error) {
      state.moving = false;
      state.toast = '运行出现异常，已暂停移动。';
      if (typeof console !== 'undefined' && console.error) console.error('Tongfu game loop failure:', error);
      renderer.render(state);
    }
  }, 33);

  renderer.render(state);

  return {
    redraw: function () {
      renderer.render(state);
    },
    runtimeError: function () {
      return renderer.runtimeError();
    },
  };
}

module.exports = { createGame };
