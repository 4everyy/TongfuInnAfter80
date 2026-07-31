var caseFiles = require('../core/case-files');

function ensure(state) {
  if (!state.explorationEvents || typeof state.explorationEvents !== 'object') state.explorationEvents = {};
  return state.explorationEvents;
}

function record(state, spot, status) {
  var events = ensure(state);
  var entry = events[spot.id] || { interactions: 0 };
  var linked;
  entry.interactions += 1;
  entry.status = status || entry.status || 'active';
  entry.mapId = state.mapId;
  entry.updatedAt = Date.now();
  events[spot.id] = entry;
  if (spot.eventId) {
    linked = events[spot.eventId] || { interactions: 0 };
    linked.interactions += 1;
    linked.status = entry.status;
    linked.mapId = entry.mapId;
    linked.updatedAt = entry.updatedAt;
    linked.hotspotId = spot.id;
    events[spot.eventId] = linked;
  }
  return entry;
}

function applyEffects(state, effects, helpers) {
  var reward = effects || {};
  var key;
  if (reward.coin) state.inventory.coin = Math.max(0, state.inventory.coin + reward.coin);
  if (reward.ingredient && helpers.changeStock) helpers.changeStock({ staple: reward.ingredient });
  if (reward.medicine) state.inventory.medicine = Math.max(0, state.inventory.medicine + reward.medicine);
  if (reward.flag) state.flags[reward.flag] = true;
  if (Array.isArray(reward.flags)) reward.flags.forEach(function (flag) { state.flags[flag] = true; });
  else if (reward.flags && typeof reward.flags === 'object') {
    Object.keys(reward.flags).forEach(function (flag) { state.flags[flag] = !!reward.flags[flag]; });
  }
  if (reward.objectState) {
    for (key in reward.objectState) {
      if (Object.prototype.hasOwnProperty.call(reward.objectState, key)) record(state, { id: key }, reward.objectState[key]);
    }
  }
  caseFiles.applyEffects(state, reward);
}

function interact(state, spot, handlers) {
  var entry;
  if (!spot) return false;
  ensure(state);
  if (spot.type === 'crisis') return handlers.crisis(spot);
  if (spot.type === 'dialogue') {
    if (spot.eventId) record(state, spot, 'complete');
    return handlers.dialogue(spot);
  }
  if (spot.type === 'battle') return handlers.battle(spot);
  if (spot.type === 'inn') return handlers.inn(spot);
  if (spot.type === 'cookingTrial') {
    record(state, spot, 'active');
    return handlers.cookingTrial && handlers.cookingTrial(spot);
  }

  entry = record(state, spot, 'complete');
  if (spot.type === 'recipeSample' && handlers.recipeSample) handlers.recipeSample(spot);
  if (spot.type === 'timed') {
    entry.status = 'active';
    entry.startedAt = Date.now();
    entry.duration = Math.max(1000, Number(spot.duration) || 30000);
  }
  if (spot.type === 'escort') {
    entry.status = 'active';
    entry.targetMapId = spot.targetMapId || state.mapId;
    entry.targetHotspotId = spot.targetHotspotId || null;
  }
  applyEffects(state, spot.effects || spot.reward, handlers);
  state.toast = spot.toast || ({
    loot: '找到了一份补给。',
    collect: '已收集线索。',
    investigate: '调查结果已经记入账本。',
    recipeSample: '样本已经记入试菜簿。',
    repair: '物件已经修好。',
    mechanism: '机关发生了变化。',
    escort: '护送任务已经开始。',
    timed: '限时行动已经开始。',
  }[spot.type] || '互动完成。');
  if (handlers.syncQuest) handlers.syncQuest();
  return true;
}

module.exports = { ensure: ensure, record: record, applyEffects: applyEffects, interact: interact };
