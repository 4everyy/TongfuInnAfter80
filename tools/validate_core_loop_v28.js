'use strict';

const store = require('../minigame/src/core/store');
const inn = require('../minigame/src/inn/inn');
const innScene = require('../minigame/src/inn/scene-interactions');

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function completeMorning(state, day) {
  if (state.episodes.pendingId) {
    assert(inn.dispatch(state, { type: 'episodeOpen' }), `Day ${day}: morning episode did not open`);
    assert(inn.dispatch(state, { type: 'episodeChoice', index: 0 }), `Day ${day}: morning episode choice failed`);
  }
  assert(inn.dispatch(state, { type: 'prep', id: 'purchase', variant: day === 3 ? 'hearty' : 'balanced' }), `Day ${day}: purchase failed`);
  assert(inn.dispatch(state, { type: 'prep', id: 'prepare' }), `Day ${day}: preparation failed`);
  assert(state.calendar.actionsUsed === 2, `Day ${day}: morning actions were not consumed`);
  assert(inn.dispatch(state, { type: 'startShift' }), `Day ${day}: shift did not start`);
}

function completeService(state, day) {
  let guard = 0;
  while (state.calendar.phase === 'noon' && guard < 20) {
    const step = inn.currentServiceStep(state);
    assert(!!step, `Day ${day}: missing service step`);
    if (!step) break;
    if (step.kind === 'event') {
      const event = inn.data.serviceEvents[step.id];
      assert(!!event && !!event.objectRole, `Day ${day}: service event is not tied to a scene object`);
      assert(inn.dispatch(state, { type: 'serviceChoice', index: 0 }), `Day ${day}: event choice failed`);
    } else {
      const game = inn.ensureMiniGame(state);
      while (game && game.round < game.rounds.length) {
        const round = game.rounds[game.round];
        assert(inn.dispatch(state, { type: 'miniGameChoice', index: round.correct }), `Day ${day}: minigame choice failed`);
      }
    }
    guard += 1;
  }
  assert(state.calendar.phase === 'evening', `Day ${day}: service did not reach evening`);
  assert(state.service.completed && state.service.outcomes.length === 3, `Day ${day}: three service rounds were not completed`);
}

function completeEvening(state, day) {
  if (state.episodes.pendingId) {
    assert(inn.dispatch(state, { type: 'episodeOpen' }), `Day ${day}: evening episode did not open`);
    assert(inn.dispatch(state, { type: 'episodeChoice', index: 0 }), `Day ${day}: evening episode choice failed`);
  }
  assert(inn.dispatch(state, { type: 'settle' }), `Day ${day}: settlement failed`);
  assert(state.inn.lastSettledDay === day, `Day ${day}: settlement marker missing`);
  assert(!inn.dispatch(state, { type: 'settle' }), `Day ${day}: settlement could be claimed twice`);
}

function validateThreeDays() {
  const state = store.freshState();
  state.screen = 'explore';
  state.mode = 'explore';
  inn.ensure(state);
  for (let day = 1; day <= 3; day += 1) {
    assert(inn.dayScript(state).title === ['新账开门', '货车误时', '满堂催菜'][day - 1], `Day ${day}: wrong vertical-slice script`);
    completeMorning(state, day);
    completeService(state, day);
    completeEvening(state, day);
    inn.ensure(state);
  }
  assert(state.calendar.day === 4, 'Three-day loop did not advance to day four');
  assert(state.inn.history.length === 3, 'Three-day loop did not produce three settlements');
  assert(!!state.coreLoopV28.milestones.firstThreeDays, 'Three-day milestone was not recorded');
  assert(Object.keys(state.coreLoopV28.customers).length >= 4, 'Customer memories were not retained');
  assert(Object.keys(state.coreLoopV28.dishMastery).length >= 1, 'Dish mastery did not grow');
  assert(state.coreLoopV28.consequences.some((item) => item.id === 'delayed-cart-shortage'), 'Day-two shortage consequence did not occur');
  Object.keys(state.inventory.stock).forEach((key) => assert(state.inventory.stock[key] >= 0, `Negative stock after three days: ${key}`));

  const saved = store.normalize(JSON.parse(JSON.stringify(state)));
  assert(saved.coreLoopV28.customers.regular, 'Customer memory was lost during save normalization');
  assert(saved.coreLoopV28.milestones.firstThreeDays, 'Milestone was lost during save normalization');
}

function validateMeaningfulChoices() {
  const fair = store.freshState();
  const expensive = store.freshState();
  inn.ensure(fair);
  inn.ensure(expensive);
  fair.dailyPlan.menu = ['noodles'];
  expensive.dailyPlan.menu = ['noodles'];
  fair.dailyPlan.prices.noodles = 12;
  expensive.dailyPlan.prices.noodles = 16;
  const loop = require('../minigame/src/inn/core-loop-v28');
  const event = inn.data.serviceEvents['v28-first-ledger'];
  const fairPlan = loop.servicePlan(fair, event, inn.data);
  const costlyPlan = loop.servicePlan(expensive, event, inn.data);
  const fairFeedback = loop.serviceFeedback(fair, fairPlan, true, 12);
  const costlyFeedback = loop.serviceFeedback(expensive, costlyPlan, true, 16);
  assert(fairFeedback.satisfaction > costlyFeedback.satisfaction, 'Pricing does not affect guest satisfaction');

  fair.flags['chapter-late-letter-complete'] = true;
  loop.ensure(fair);
  assert(fair.coreLoopV28.milestones.lateLetterLinked, 'Exploration completion did not link back to inn progression');
  assert(fair.coreLoopV28.explorationRewards.length === 1, 'Exploration reward was not recorded exactly once');
  loop.ensure(fair);
  assert(fair.coreLoopV28.explorationRewards.length === 1, 'Exploration reward could be claimed repeatedly');
  const coinBeforePurchase = fair.inventory.coin;
  assert(inn.dispatch(fair, { type: 'prep', id: 'purchase', variant: 'balanced' }), 'Discounted post-exploration purchase failed');
  assert(coinBeforePurchase - fair.inventory.coin === 6, 'Exploration reward did not reduce the next purchase by four coins');
  assert(fair.coreLoopV28.purchaseDiscount === 0, 'Purchase discount was not consumed after use');
}

function validateSceneRouting() {
  const state = store.freshState();
  inn.ensure(state);
  if (state.episodes.pendingId) {
    inn.dispatch(state, { type: 'episodeOpen' });
    inn.dispatch(state, { type: 'episodeChoice', index: 0 });
  }
  inn.dispatch(state, { type: 'prep', id: 'purchase', variant: 'balanced' });
  inn.dispatch(state, { type: 'prep', id: 'prepare' });
  inn.dispatch(state, { type: 'startShift' });
  const event = inn.data.serviceEvents[inn.currentServiceStep(state).id];
  assert(innScene.serviceObjectRole(state) === event.objectRole, 'Current service task is highlighted on the wrong scene object');
}

assert(inn.data.serviceEvents && Object.keys(inn.data.serviceEvents).filter((id) => id.indexOf('v28-') === 0).length >= 20, 'Fewer than 20 v28 service events are registered');
validateThreeDays();
validateMeaningfulChoices();
validateSceneRouting();

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

console.log('Core loop v28 passed: three playable days, meaningful pricing, customer memory, exploration linkage and scene routing.');
