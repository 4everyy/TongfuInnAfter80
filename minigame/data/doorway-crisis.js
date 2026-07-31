const ACTIONS = {
  favor: { name: '人情周旋', field: 'rapport', amount: 14, note: '掌灯把客人安顿下来，也记下一份人情。' },
  ledger: { name: '查清账目', field: 'evidence', amount: 1, note: '账本里多出一笔不该有的赊账。' },
  promise: { name: '掌柜承诺', field: 'order', amount: 16, note: '掌灯担下招牌，门前的乱象暂时压住。' },
};

function fresh() {
  return {
    id: 'doorway-disturbance',
    active: true,
    resolved: false,
    rapport: 38,
    order: 42,
    evidence: 0,
    guests: 'restless',
    baiTrust: 0,
    visited: {},
    clues: [],
    speech: null,
    history: [],
  };
}

function ensure(state) {
  state.doorwayCrisis = Object.assign(fresh(), state.doorwayCrisis || {});
  const crisis = state.doorwayCrisis;
  if (!crisis.visited) crisis.visited = {};
  if (!Array.isArray(crisis.clues)) crisis.clues = [];
  if (!Array.isArray(crisis.history)) crisis.history = [];
  return crisis;
}

function say(state, speaker, text) {
  ensure(state).speech = { speaker, text, at: Date.now() };
}

function addClue(crisis, id, text) {
  if (crisis.clues.indexOf(id) >= 0) return false;
  crisis.clues.push(id);
  crisis.history.push(text);
  return true;
}

function unlockWuchenCooperation(state) {
  const character = state.characters && state.characters.wuchen;
  if (!character) return;
  character.recruitmentStage = 'cooperating';
  character.temporary = true;
  character.innUnlocked = true;
  if (state.party.indexOf('wuchen') < 0 && state.party.length < 3) state.party.push('wuchen');
  character.inParty = state.party.indexOf('wuchen') >= 0;
}

function tryResolve(state) {
  const crisis = ensure(state);
  if (crisis.resolved || crisis.evidence < 1 || crisis.clues.length < 2 || (crisis.rapport < 52 && crisis.order < 58)) return false;
  crisis.resolved = true;
  crisis.guests = 'calm';
  crisis.baiTrust += 16;
  state.flags.doorwayDisturbanceResolved = true;
  state.flags['wuchen-cooperating'] = true;
  state.inn.reputation += 1;
  unlockWuchenCooperation(state);
  state.toast = '门前重新安静下来，谢无尘暂时与柳掌灯同行。';
  say(state, 'wuchen', '掌柜的，这回您撑住场面了。街上那点风声，我去替您听听。');
  return true;
}

function interact(state, id) {
  const crisis = ensure(state);
  if (id === 'rumor-board') {
    crisis.visited[id] = true;
    addClue(crisis, 'rumor-slip', '传闻板上有人匿名贴了“长风欠债”的纸条。');
    say(state, 'zhangdeng', '这纸条写得急，墨还没干透。');
  } else if (id === 'ledger') {
    crisis.visited[id] = true;
    if (crisis.evidence < 1) crisis.evidence += 1;
    addClue(crisis, 'ledger-gap', '账本夹页少了一角，赊账署名却像是伪造的。');
    say(state, 'zhangdeng', '账可以慢慢算，假账可不能留在柜上。');
  } else if (id === 'tea-table') {
    crisis.visited[id] = true;
    if (crisis.rapport < 52) crisis.rapport += 6;
    addClue(crisis, 'guest-whisper', '茶客听见闹事者提过“东街的纸铺”。');
    say(state, 'guest', '掌柜的，俺也去坐会儿。那闹事的不像本地人。');
  } else if (id === 'stove') {
    crisis.visited[id] = true;
    crisis.order += 5;
    say(state, 'shiwei', '火候一起来，客人的心就没那么慌咧。');
  } else if (id === 'bai') {
    crisis.visited[id] = true;
    crisis.baiTrust += crisis.evidence ? 8 : 3;
    if (crisis.evidence >= 1) addClue(crisis, 'bai-observation', '谢无尘说闹事者鞋底沾着纸铺后巷的白浆。');
    say(state, 'wuchen', crisis.evidence >= 1 ? '这事儿有蹊跷，我看见他鞋底的白浆了。' : '掌柜的，先别急着撵人，俺也去瞅瞅门外。');
  } else if (ACTIONS[id]) {
    const action = ACTIONS[id];
    crisis[action.field] += action.amount;
    crisis.history.push(action.note);
    say(state, 'zhangdeng', action.note);
  }
  if (crisis.clues.length >= 2) state.flags['doorway-clues-ready'] = true;
  tryResolve(state);
}

function nearby(state) {
  if (state.mapId !== 'inn') return [];
  return [
    { id: 'rumor-board', x: 470, y: 260, label: '传闻板', speaker: 'zhangdeng' },
    { id: 'ledger', x: 540, y: 244, label: '账本', speaker: 'zhangdeng' },
    { id: 'tea-table', x: 350, y: 280, label: '茶桌', speaker: 'guest' },
    { id: 'stove', x: 1210, y: 250, label: '后厨火候', speaker: 'shiwei' },
    { id: 'bai', x: 700, y: 260, label: '谢无尘', speaker: 'wuchen' },
  ];
}

module.exports = { fresh, ensure, interact, nearby, say, ACTIONS };
