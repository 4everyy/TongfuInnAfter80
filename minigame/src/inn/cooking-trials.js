'use strict';

var content = require('../../data/content');

function ensure(state) {
  if (!state.recipeResearch || typeof state.recipeResearch !== 'object') {
    state.recipeResearch = {};
  }
  state.recipeResearch.samples = Object.assign({}, state.recipeResearch.samples || {});
  state.recipeResearch.hypotheses = Object.assign({}, state.recipeResearch.hypotheses || {});
  state.recipeResearch.fragments = Array.isArray(state.recipeResearch.fragments)
    ? state.recipeResearch.fragments
    : [];
  state.recipeResearch.results = Object.assign({}, state.recipeResearch.results || {});
  state.recipeResearch.unlockedRecipes = Array.isArray(state.recipeResearch.unlockedRecipes)
    ? state.recipeResearch.unlockedRecipes
    : [];
  return state.recipeResearch;
}

function definition(id) {
  return content.cookingTrials && content.cookingTrials[id] || null;
}

function registerSample(state, sample) {
  var research = ensure(state);
  if (!sample || !sample.id) return false;
  research.samples[sample.id] = Object.assign({
    foundAt: state.mapId,
    foundDay: state.calendar && state.calendar.day || 1,
  }, sample);
  if (research.fragments.indexOf(sample.id) < 0) research.fragments.push(sample.id);
  return true;
}

function start(state, id) {
  var trial = definition(id);
  var research = ensure(state);
  if (!trial) return false;
  if (state.flags[trial.completionFlag]) {
    state.toast = '这项烹饪试验已经完成。';
    return false;
  }
  state.cookingTrial = {
    id: id,
    round: 0,
    score: 0,
    mistakes: 0,
    choices: [],
    completed: false,
  };
  research.results[id] = Object.assign({}, research.results[id], {
    status: 'active',
    startedAt: Date.now(),
  });
  state.modal = { type: 'cookingTrial' };
  return true;
}

function applyReward(state, reward) {
  if (!reward) return;
  if (reward.coin) state.inventory.coin = Math.max(0, state.inventory.coin + reward.coin);
  if (reward.reputation) state.inn.reputation = Math.max(0, state.inn.reputation + reward.reputation);
  if (reward.order) state.inn.order = Math.max(0, Math.min(100, state.inn.order + reward.order));
}

function choose(state, optionIndex) {
  var active = state.cookingTrial;
  var trial = active && definition(active.id);
  var round;
  var correct;
  var research;
  if (!active || !trial || active.completed) return false;
  round = trial.rounds[active.round];
  if (!round || !round.options[optionIndex]) return false;
  correct = Number(optionIndex) === Number(round.correct);
  active.choices.push(Number(optionIndex));
  if (correct) active.score += 1;
  else active.mistakes += 1;
  active.round += 1;

  if (active.round < trial.rounds.length) {
    state.toast = correct ? '判断正确，继续下一步。' : '味道有些偏差，继续观察下一步。';
    return true;
  }

  active.completed = true;
  state.flags[trial.completionFlag] = true;
  if (active.score >= Math.ceil(trial.rounds.length * 2 / 3)) {
    state.flags[trial.bonusFlag] = true;
    applyReward(state, trial.reward);
  }
  research = ensure(state);
  research.results[active.id] = {
    status: 'complete',
    score: active.score,
    mistakes: active.mistakes,
    choices: active.choices.slice(),
    completedAt: Date.now(),
  };
  research.hypotheses[active.id] = active.score >= 2 ? 'confirmed' : 'partial';
  state.toast = active.score >= 2
    ? trial.title + '完成，获得完整经营增益。'
    : trial.title + '完成；结论可用，但最终行动难度会上升。';
  state.cookingTrial = null;
  state.modal = null;
  return true;
}

function activeDefinition(state) {
  return state.cookingTrial ? definition(state.cookingTrial.id) : null;
}

module.exports = {
  ensure: ensure,
  definition: definition,
  registerSample: registerSample,
  start: start,
  choose: choose,
  activeDefinition: activeDefinition,
};
