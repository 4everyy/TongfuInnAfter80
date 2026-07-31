const store = require('../minigame/src/core/store');
const management = require('../minigame/src/inn/inn');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function closeResult(state) {
  if (state.managementEvent && state.managementEvent.kind !== 'episode') {
    management.dispatch(state, { type: 'managementEventClose' });
  }
}

function resolveEpisode(state, choiceIndex) {
  if (!state.episodes.pendingId) return;
  assert(management.dispatch(state, { type: 'episodeOpen' }), '人物剧情无法打开：' + state.episodes.pendingId);
  assert(management.dispatch(state, { type: 'episodeChoice', index: choiceIndex || 0 }), '人物剧情无法结算');
  closeResult(state);
}

function resolveNoon(state) {
  let steps = 0;
  while (state.calendar.phase === 'noon' && steps < 20) {
    const current = management.currentServiceStep(state);
    assert(current, '午市缺少当前步骤');
    if (current.kind === 'event') {
      assert(management.dispatch(state, { type: 'serviceChoice', index: 0 }), '营业事件无法结算：' + current.id);
    } else {
      const game = state.service.miniGame;
      const round = game && game.rounds[game.round];
      assert(round, '短玩法缺少题目');
      assert(management.dispatch(state, { type: 'miniGameChoice', index: round.correct }), '短玩法无法提交');
    }
    if (state.managementEvent) {
      assert(state.managementEvent.kind === 'result', '营业反馈没有使用结果弹层');
      assert(Boolean(state.managementEvent.text), '营业反馈缺少结果说明');
      closeResult(state);
    }
    steps += 1;
  }
  assert(steps < 20, '午市状态机未能结束');
  assert(state.calendar.phase === 'evening', '三轮营业后没有进入晚上');
}

function runDay(state) {
  const currentDay = state.calendar.day;
  resolveEpisode(state, 0);
  management.dispatch(state, { type: 'prep', id: 'purchase' });
  management.dispatch(state, { type: 'prep', id: 'clean' });
  assert(management.dispatch(state, { type: 'startShift' }), '第 ' + currentDay + ' 日无法开门：' + state.toast);
  resolveNoon(state);
  resolveEpisode(state, 0);
  assert(management.dispatch(state, { type: 'settle' }), '第 ' + currentDay + ' 日无法结算：' + state.toast);
  assert(!management.dispatch(state, { type: 'settle' }), '同一天发生了重复结算');
  assert(state.inn.history[state.inn.history.length - 1].day === currentDay, '日结历史日期错误');
  closeResult(state);
}

function validateSevenDays() {
  const state = store.freshState();
  state.screen = 'inn';
  for (let day = 1; day <= 7; day += 1) runDay(state);
  assert(state.calendar.day === 8, '七日循环没有推进到第八日');
  assert(state.inn.history.length === 7, '七日结算记录不完整');
  assert(state.episodes.completed.length === 12, '十二段人物剧情没有全部完成');
  assert(state.flags['chapter-seven-days-complete'], '七日主线完成旗标缺失');
  assert(state.freeMode === true, '自由经营没有解锁');
  assert(management.dayScript(state).title === '自由经营', '第八日没有切换到自由经营内容池');
  Object.keys(state.inventory.stock).forEach((key) => assert(state.inventory.stock[key] >= 0, '食材库存出现负数：' + key));
  return state;
}

function validatePlanningImpact() {
  const prepared = store.freshState();
  const plain = store.freshState();
  resolveEpisode(prepared, 0);
  resolveEpisode(plain, 0);
  management.dispatch(prepared, { type: 'prep', id: 'prepare' });
  management.dispatch(prepared, { type: 'prep', id: 'clean' });
  management.dispatch(prepared, { type: 'startShift' });
  management.dispatch(plain, { type: 'startShift' });
  assert(prepared.service.satisfaction > plain.service.satisfaction, '早晨备菜没有影响午市满意度');
  assert(prepared.inn.order > plain.inn.order, '早晨清洁没有影响客栈秩序');
  management.dispatch(prepared, { type: 'serviceChoice', index: 1 });
  assert(prepared.service.outcomes[0].bonus === true, '角色与岗位匹配没有触发专长奖励');
  assert(prepared.managementEvent && prepared.managementEvent.text, '经营选择完成后没有可见反馈');
  closeResult(prepared);
}

function validateV4Migration() {
  const base = store.freshState();
  const legacy = {
    version: 4,
    screen: 'explore',
    mode: 'explore',
    mapId: 'street',
    spawnId: 'innDoor',
    position: { x: 440, y: 280 },
    facing: 'right',
    activeId: 'zhantang',
    party: ['zhantang', 'xiangyu'],
    characters: base.characters,
    flags: { 'mission-accepted': true, 'yard-trail': true },
    inventory: { coin: 99, ingredient: 8, medicine: 3 },
    inn: { day: 3, reputation: 7, rooms: 2, menu: ['noodles', 'fish'], upgrades: ['hall'], guests: 4 },
    chapterId: 'east-wind',
  };
  const migrated = store.normalize(legacy);
  assert(migrated.version === store.VERSION, '存档版本没有升级到当前版本');
  assert(migrated.protagonist === 'zhangdeng' && migrated.activeId === 'zhangdeng', '探索主角没有迁移为柳掌灯');
  assert(migrated.mapId === 'street', '旧地图位置没有保留');
  assert(migrated.inventory.coin === 99, '旧银两没有保留');
  assert(migrated.inventory.stock.staple === 8 && migrated.inventory.ingredient === 8, '通用食材没有迁移为主食');
  assert(migrated.calendar.day === 3 && migrated.inn.day === 3, '经营日期没有迁移');
  assert(migrated.inn.roomState.length === 2, '旧客房数量没有迁移');
  assert(!migrated.flags['yard-trail'], '旧剧情旗标不应进入原创主线');
  assert(migrated.legacyArchive.flags['yard-trail'], '旧章节旗标没有写入只读档案');
  assert(migrated.sideQuests.entries['late-letter'].status === 'available', '迁移后的第三日没有按原创日程开放第二章');
}

function validateOutingCost() {
  const state = store.freshState();
  state.calendar.day = 2;
  state.inn.day = 2;
  management.ensure(state);
  state.flags['sidequest-late-letter-unlocked'] = true;
  management.ensure(state);
  state.sideQuests.entries['late-letter'].status = 'available';
  assert(management.startOuting(state, 'late-letter'), '已解锁支线无法开始');
  management.returnFromOuting(state);
  assert(state.calendar.actionsUsed === 1, '首次外出没有消耗行动');
  assert(management.startOuting(state, 'late-letter'), '第二次外出无法开始');
  management.returnFromOuting(state);
  assert(state.calendar.actionsUsed === 2, '第二次外出没有独立消耗行动');
  assert(!management.startOuting(state, 'late-letter'), '行动耗尽后仍能继续外出');
}

function validateEveningReservation() {
  const state = store.freshState();
  resolveEpisode(state, 0);
  management.dispatch(state, { type: 'startShift' });
  resolveNoon(state);
  assert(state.episodes.pendingId, '晚上没有待处理人物剧情');
  assert(management.dispatch(state, { type: 'roomClean', id: 'room-1' }), '人物剧情前无法执行一次可选安排');
  assert(!management.dispatch(state, { type: 'upgrade', id: 'hall' }), '人物剧情前占用了两个可选行动');
  resolveEpisode(state, 0);
  assert(state.calendar.actionsUsed === 2, '晚间人物剧情没有占用保留行动');
}

function validateUpgradeConfirmation() {
  const state = store.freshState();
  state.calendar.phase = 'evening';
  state.episodes.pendingId = null;
  const before = state.inventory.coin;
  assert(management.dispatch(state, { type: 'upgrade', id: 'hall' }), '装修确认弹层无法打开');
  assert(state.managementEvent && state.managementEvent.kind === 'confirm', '装修没有要求二次确认');
  assert(state.inventory.coin === before, '确认前已经扣除银两');
  assert(management.dispatch(state, { type: 'upgradeConfirm', id: 'hall' }), '确认后装修失败');
  assert(state.inventory.coin === before - 40, '装修扣款金额错误');
  assert(state.inn.facilities.hall === 2, '装修等级没有提升');
}

function validateMorningUndo() {
  const state = store.freshState();
  const coin = state.inventory.coin;
  const stock = JSON.stringify(state.inventory.stock);
  assert(management.dispatch(state, { type: 'prep', id: 'purchase' }), '晨间采购无法执行');
  assert(state.inventory.coin === coin - 10 && state.calendar.actionsUsed === 1, '采购没有改变资源');
  assert(management.dispatch(state, { type: 'planUndo' }), '晨间采购无法撤销');
  assert(state.inventory.coin === coin && JSON.stringify(state.inventory.stock) === stock, '撤销没有恢复银两与食材');
  assert(state.calendar.actionsUsed === 0 && state.dailyPlan.prepActions.length === 0, '撤销没有恢复行动次数');
  assert(management.dispatch(state, { type: 'dish', id: 'fish' }), '菜单无法调整');
  assert(state.dailyPlan.menu.indexOf('fish') >= 0, '菜品没有加入菜单');
  assert(management.dispatch(state, { type: 'planUndo' }), '菜单调整无法撤销');
  assert(state.dailyPlan.menu.indexOf('fish') < 0, '撤销没有恢复菜单');
}

const state = validateSevenDays();
validatePlanningImpact();
validateV4Migration();
validateOutingCost();
validateEveningReservation();
validateUpgradeConfirmation();
validateMorningUndo();

console.log(JSON.stringify({
  result: 'passed',
  day: state.calendar.day,
  history: state.inn.history.length,
  episodes: state.episodes.completed.length,
  freeMode: state.freeMode,
  coin: state.inventory.coin,
  stock: state.inventory.stock,
}, null, 2));
