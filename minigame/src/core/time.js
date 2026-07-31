var PHASES = ['morning', 'noon', 'evening'];

function ensure(state) {
  if (!state.worldTime || typeof state.worldTime !== 'object') {
    state.worldTime = { day: 1, phase: 'morning', lastAdvanceReason: 'new-game', advances: 0 };
  }
  if (PHASES.indexOf(state.worldTime.phase) < 0) state.worldTime.phase = 'morning';
  state.worldTime.day = Math.max(1, Number(state.worldTime.day) || 1);
  state.worldTime.advances = Math.max(0, Number(state.worldTime.advances) || 0);
  return state.worldTime;
}

function advance(state, reason) {
  var time = ensure(state);
  var index = PHASES.indexOf(time.phase);
  if (index === PHASES.length - 1) {
    time.phase = PHASES[0];
    time.day += 1;
  } else {
    time.phase = PHASES[index + 1];
  }
  time.lastAdvanceReason = reason || 'story';
  time.advances += 1;
  return time;
}

function label(phase) {
  return phase === 'morning' ? '早上' : phase === 'noon' ? '中午' : '晚上';
}

module.exports = { PHASES: PHASES, ensure: ensure, advance: advance, label: label };
