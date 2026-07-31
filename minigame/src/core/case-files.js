var STOCK_KEYS = ['staple', 'vegetable', 'meat', 'tea'];

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function ensure(state) {
  var market = state.market || {};
  var files = state.caseFiles || {};
  market.multipliers = Object.assign({ staple: 1, vegetable: 1, meat: 1, tea: 1 }, market.multipliers || {});
  STOCK_KEYS.forEach(function (key) {
    market.multipliers[key] = clamp(number(market.multipliers[key], 1), 0.65, 2.5);
  });
  market.history = Array.isArray(market.history) ? market.history : [];
  market.pressure = clamp(number(market.pressure, 0), 0, 100);
  market.normalized = !!market.normalized;
  state.market = market;

  files.evidence = Object.assign({}, files.evidence || {});
  files.conclusions = Object.assign({}, files.conclusions || {});
  files.contradictions = Array.isArray(files.contradictions) ? files.contradictions : [];
  files.published = Array.isArray(files.published) ? files.published : [];
  files.score = Math.max(0, number(files.score, 0));
  state.caseFiles = files;
  state.campaign.seasonRatings = Object.assign({}, state.campaign.seasonRatings || {});
  return state;
}

function addEvidence(state, definition) {
  var item;
  if (!definition || !definition.id) return false;
  ensure(state);
  if (state.caseFiles.evidence[definition.id]) return false;
  item = Object.assign({
    id: definition.id,
    title: definition.id,
    sourceMap: state.mapId || 'inn',
    reliability: 1,
    weight: 1,
    collectedDay: state.calendar && state.calendar.day || 1,
  }, definition);
  state.caseFiles.evidence[item.id] = item;
  state.caseFiles.score += Math.max(1, number(item.weight, 1));
  return true;
}

function addContradiction(state, definition) {
  var item;
  if (!definition || !definition.id) return false;
  ensure(state);
  if (state.caseFiles.contradictions.some(function (entry) { return entry.id === definition.id; })) return false;
  item = Object.assign({ id: definition.id, title: definition.id, resolved: false }, definition);
  state.caseFiles.contradictions.push(item);
  return true;
}

function addConclusion(state, definition) {
  if (!definition || !definition.id) return false;
  ensure(state);
  if (state.caseFiles.conclusions[definition.id]) return false;
  state.caseFiles.conclusions[definition.id] = Object.assign({
    id: definition.id,
    title: definition.id,
    resolvedDay: state.calendar && state.calendar.day || 1,
  }, definition);
  state.caseFiles.score += Math.max(1, number(definition.weight, 2));
  (definition.resolves || []).forEach(function (id) {
    state.caseFiles.contradictions.forEach(function (entry) {
      if (entry.id === id) entry.resolved = true;
    });
  });
  return true;
}

function updateMarket(state, effect, reason) {
  var changes = effect && effect.multipliers || effect || {};
  var mode = effect && effect.mode || 'delta';
  ensure(state);
  STOCK_KEYS.forEach(function (key) {
    if (changes[key] == null) return;
    state.market.multipliers[key] = clamp(
      mode === 'set' ? number(changes[key], 1) : state.market.multipliers[key] + number(changes[key], 0),
      0.65,
      2.5
    );
  });
  if (effect && effect.pressure != null) {
    state.market.pressure = clamp(
      effect.pressureMode === 'set' ? number(effect.pressure, 0) : state.market.pressure + number(effect.pressure, 0),
      0,
      100
    );
  }
  if (effect && effect.normalized != null) state.market.normalized = !!effect.normalized;
  state.market.history.push({
    day: state.calendar && state.calendar.day || 1,
    chapter: state.campaign && state.campaign.chapter || 1,
    reason: reason || effect && effect.reason || '剧情变化',
    multipliers: Object.assign({}, state.market.multipliers),
    pressure: state.market.pressure,
  });
  if (state.market.history.length > 28) state.market.history.shift();
}

function applyEffects(state, effects) {
  var reward = effects || {};
  ensure(state);
  if (reward.evidence) {
    (Array.isArray(reward.evidence) ? reward.evidence : [reward.evidence]).forEach(function (item) { addEvidence(state, item); });
  }
  if (reward.contradiction) {
    (Array.isArray(reward.contradiction) ? reward.contradiction : [reward.contradiction]).forEach(function (item) { addContradiction(state, item); });
  }
  if (reward.conclusion) {
    (Array.isArray(reward.conclusion) ? reward.conclusion : [reward.conclusion]).forEach(function (item) { addConclusion(state, item); });
  }
  if (reward.market) updateMarket(state, reward.market, reward.market.reason);
}

function purchaseCost(state, baseCost) {
  var total = 0;
  ensure(state);
  STOCK_KEYS.forEach(function (key) { total += state.market.multipliers[key]; });
  return Math.max(1, Math.round(number(baseCost, 10) * total / STOCK_KEYS.length));
}

function seasonRating(state) {
  var tendencies;
  var score;
  var grade;
  ensure(state);
  tendencies = state.campaign.tendencies || {};
  score = Math.min(32, state.caseFiles.score)
    + Math.min(18, number(state.inn.reputation, 0) * 2)
    + Math.round(clamp(number(state.inn.order, 0), 0, 100) * 0.18)
    + Math.min(12, Math.floor(number(state.inventory.coin, 0) / 10))
    + Math.min(12, Math.floor(number(state.relationships.wenyan && state.relationships.wenyan.trust, 0) / 8))
    + Math.min(6, number(tendencies.favor, 0) + number(tendencies.rule, 0) + number(tendencies.venture, 0));
  if (state.flags['c08-vault-won']) score += 8;
  grade = score >= 82 ? 'S' : score >= 66 ? 'A' : score >= 48 ? 'B' : 'C';
  return { grade: grade, score: score, evidence: Object.keys(state.caseFiles.evidence).length };
}

function finalizeSeason(state, seasonId) {
  var id = seasonId || 'season-1';
  var result;
  ensure(state);
  if (state.campaign.seasonRatings[id]) return state.campaign.seasonRatings[id];
  result = seasonRating(state);
  result.completedDay = state.calendar && state.calendar.day || 1;
  state.campaign.seasonRatings[id] = result;
  if (state.caseFiles.published.indexOf('first-ledger-page') < 0) state.caseFiles.published.push('first-ledger-page');
  return result;
}

module.exports = {
  STOCK_KEYS: STOCK_KEYS,
  ensure: ensure,
  addEvidence: addEvidence,
  addContradiction: addContradiction,
  addConclusion: addConclusion,
  updateMarket: updateMarket,
  applyEffects: applyEffects,
  purchaseCost: purchaseCost,
  seasonRating: seasonRating,
  finalizeSeason: finalizeSeason,
};
