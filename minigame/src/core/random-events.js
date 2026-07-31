function ensure(state) {
  state.randomEvents = state.randomEvents || {};
  state.randomEvents.seed = Number(state.randomEvents.seed) || 7301;
  state.randomEvents.recent = Array.isArray(state.randomEvents.recent) ? state.randomEvents.recent : [];
  state.randomEvents.resolved = Array.isArray(state.randomEvents.resolved) ? state.randomEvents.resolved : [];
  state.randomEvents.chains = state.randomEvents.chains || {};
  state.randomEvents.daily = state.randomEvents.daily || {};
  return state.randomEvents;
}

function hash(seed, text) {
  var value = seed >>> 0;
  var index;
  for (index = 0; index < String(text).length; index += 1) {
    value = Math.imul(value ^ String(text).charCodeAt(index), 16777619) >>> 0;
  }
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function eligible(state, event, chapter) {
  var recent = ensure(state).recent;
  var last = recent.filter(function (entry) { return entry.id === event.id; }).pop();
  if (event.chapters && event.chapters.indexOf(chapter) < 0) return false;
  if (event.previous && state.randomEvents.resolved.indexOf(event.previous) < 0) return false;
  if (last && state.calendar.day - last.day < (event.cooldownDays || 3)) return false;
  return true;
}

function weightedOrder(state, events, key) {
  return events.map(function (event) {
    var roll = hash(state.randomEvents.seed, key + ':' + event.id) / 4294967295;
    return { event: event, score: roll * Math.max(1, Number(event.weight) || 1) };
  }).sort(function (a, b) { return b.score - a.score; }).map(function (entry) { return entry.event; });
}

function select(state, events, count, chapter, scope) {
  var runtime = ensure(state);
  var key = (scope || 'default') + ':c' + chapter + '-d' + state.calendar.day;
  var chosen;
  if (runtime.daily[key]) return runtime.daily[key].slice(0, count);
  chosen = weightedOrder(state, events.filter(function (event) { return eligible(state, event, chapter); }), key)
    .slice(0, count)
    .map(function (event) { return event.id; });
  runtime.daily[key] = chosen;
  chosen.forEach(function (id) { runtime.recent.push({ id: id, day: state.calendar.day }); });
  runtime.recent = runtime.recent.filter(function (entry) { return state.calendar.day - entry.day <= 14; });
  return chosen;
}

function resolve(state, id, choice) {
  var runtime = ensure(state);
  if (runtime.resolved.indexOf(id) < 0) runtime.resolved.push(id);
  runtime.lastChoice = { id: id, choice: choice, day: state.calendar.day };
}

module.exports = { ensure: ensure, hash: hash, eligible: eligible, select: select, resolve: resolve };
