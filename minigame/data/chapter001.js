const ACTS = ['act1_misunderstanding', 'act2_accounting', 'act3_work_trial'];

const hotspots = [
  { id: 'entrance', act: ACTS[0], title: '客栈门口', label: '处理误会', x: 42, y: 112, w: 170, h: 164, description: '霍惊枝闯下的乱子还堵在门前，得先让客人安心。' },
  { id: 'broken-table', act: ACTS[1], title: '破桌残碗', label: '清点损失', x: 242, y: 178, w: 148, h: 108, description: '把能赔、该修的物件一一记到账上。' },
  { id: 'ledger', act: ACTS[1], title: '柜台账本', label: '查看账目', x: 570, y: 118, w: 126, h: 170, description: '闻砚已经摊开账本，等你把损失说清楚。' },
  { id: 'kitchen', act: ACTS[1], title: '后厨门', label: '安抚后厨', x: 690, y: 142, w: 112, h: 146, description: '十味在后厨探头，热气和催菜声混在一起。' },
  { id: 'xiaoman', act: ACTS[2], title: '小满的位置', label: '看看小满', x: 114, y: 112, w: 136, h: 174, description: '小满抱着木剑，正好奇地打量新来的杂役。' },
  { id: 'jingzhi', act: ACTS[2], title: '霍惊枝', label: '安排试工', x: 470, y: 104, w: 160, h: 190, description: '留下可以，但得先让她用一份实在的活证明自己。' },
];

const accountingItems = [
  { id: 'table', name: '破桌', x: 258, y: 202, w: 72, h: 48 },
  { id: 'bowl', name: '裂碗', x: 370, y: 238, w: 54, h: 38 },
  { id: 'chair', name: '倒椅', x: 446, y: 194, w: 58, h: 80 },
];

function freshChapter() {
  return {
    id: 'chapter-001',
    status: 'ready',
    act: ACTS[0],
    selectedHotspotId: null,
    guestTrust: 50,
    damageLevel: 60,
    jingzhiGuilt: 35,
    zhangdengStress: 35,
    rumorLevel: 0,
    morale: 50,
    order: 50,
    accountingFound: [],
    accountingMistakes: 0,
    choices: {},
    summary: [],
    jingzhiTag: '',
    rating: '',
  };
}

function ensure(state) {
  state.chapter001 = Object.assign(freshChapter(), state.chapter001 || {});
  if (ACTS.indexOf(state.chapter001.act) < 0 && state.chapter001.status !== 'complete') state.chapter001.act = ACTS[0];
  if (!Array.isArray(state.chapter001.accountingFound)) state.chapter001.accountingFound = [];
  if (!Array.isArray(state.chapter001.summary)) state.chapter001.summary = [];
  if (!state.chapter001.choices) state.chapter001.choices = {};
  return state.chapter001;
}

function activeHotspots(state) {
  const chapter = ensure(state);
  return hotspots.filter((item) => item.act === chapter.act);
}

function chooseAct1(state, choice) {
  const chapter = ensure(state);
  if (chapter.act !== ACTS[0]) return;
  const outcomes = {
    wuchen: { trust: 2, order: 18, guilt: 7, rumor: 2, text: '老白一招制住闹事者，门口终于安静下来。' },
    zhangdeng: { trust: 14, order: 4, stress: 10, text: '掌灯好言好语地赔礼，茶客们暂时稳住了。' },
    xiaoman: { trust: 5, morale: 15, rumor: 8, text: '小满插科打诨，客人笑了，传言也跟着飘了出去。' },
  };
  const result = outcomes[choice];
  if (!result) return;
  chapter.guestTrust += result.trust || 0;
  chapter.order += result.order || 0;
  chapter.jingzhiGuilt += result.guilt || 0;
  chapter.zhangdengStress += result.stress || 0;
  chapter.rumorLevel += result.rumor || 0;
  chapter.morale += result.morale || 0;
  chapter.choices.entrance = choice;
  chapter.summary.push(result.text);
  chapter.act = ACTS[1];
  chapter.selectedHotspotId = null;
  state.toast = '第一幕完成：' + result.text;
}

function inspectDamage(state, itemId) {
  const chapter = ensure(state);
  if (chapter.act !== ACTS[1]) return;
  const item = accountingItems.find((candidate) => candidate.id === itemId);
  if (!item || chapter.accountingFound.indexOf(itemId) >= 0) return;
  chapter.accountingFound.push(itemId);
  if (chapter.accountingFound.length >= accountingItems.length) {
    chapter.damageLevel = Math.max(0, chapter.damageLevel - 25);
    chapter.guestTrust += 5;
    chapter.summary.push('闻砚把三样损失逐一记清，损失总算有了着落。');
    chapter.act = ACTS[2];
    chapter.selectedHotspotId = null;
    state.toast = '损失清单完成，霍惊枝该开始试工了。';
  } else state.toast = '已记下：' + item.name + '（' + chapter.accountingFound.length + '/3）';
}

function chooseWork(state, choice) {
  const chapter = ensure(state);
  if (chapter.act !== ACTS[2]) return;
  const outcomes = {
    sweep: { tag: '勤快杂役', opening: 18, text: '霍惊枝抄起扫帚，客栈很快有了重新开张的样子。' },
    repair: { tag: '修缮能手', damage: 20, text: '霍惊枝卷起袖子修桌补椅，把赔出去的银子省回来一些。' },
    serve: { tag: '赔礼茶倌', trust: 18, text: '霍惊枝端茶赔礼，茶客们终于肯留下来再坐一会儿。' },
  };
  const result = outcomes[choice];
  if (!result) return;
  chapter.guestTrust += result.trust || 0;
  chapter.damageLevel = Math.max(0, chapter.damageLevel - (result.damage || 0));
  chapter.choices.work = choice;
  chapter.jingzhiTag = result.tag;
  chapter.summary.push(result.text);
  chapter.status = 'complete';
  chapter.act = 'settlement';
  chapter.selectedHotspotId = null;
  state.characters.jingzhi.recruited = true;
  state.characters.jingzhi.innUnlocked = true;
  state.flags.jingzhiJoined = true;
  state.toast = '第一回完成：霍惊枝以“' + result.tag + '”加入客栈。';
}

function rating(chapter) {
  const score = chapter.guestTrust + chapter.order + chapter.morale - chapter.damageLevel * 0.45 - chapter.rumorLevel * 0.35 - chapter.zhangdengStress * 0.2;
  if (score >= 120) return 'S';
  if (score >= 94) return 'A';
  if (score >= 68) return 'B';
  return 'C';
}

function dispatch(state, action) {
  const chapter = ensure(state);
  if (action.type === 'chapterStart') {
    state.chapter001 = freshChapter();
    state.screen = 'chapter001';
    state.mode = 'story';
    state.toast = '第一回：江湖不散场。点击发亮处开始处理。';
  } else if (action.type === 'chapterRestart') {
    state.chapter001 = freshChapter();
    state.screen = 'chapter001';
    state.mode = 'story';
  } else if (action.type === 'chapterHotspot') {
    if (activeHotspots(state).some((item) => item.id === action.id)) chapter.selectedHotspotId = action.id;
  } else if (action.type === 'chapterAct1') chooseAct1(state, action.choice);
  else if (action.type === 'chapterDamage') inspectDamage(state, action.id);
  else if (action.type === 'chapterWork') chooseWork(state, action.choice);
  else if (action.type === 'chapterClosePanel') chapter.selectedHotspotId = null;
  else if (action.type === 'chapterReturnInn') {
    state.screen = 'inn';
    state.mode = 'manage';
    state.managementPage = 'today';
  }
  if (state.chapter001.status === 'complete') state.chapter001.rating = rating(state.chapter001);
}

module.exports = { freshChapter, ensure, activeHotspots, accountingItems, dispatch, rating };
