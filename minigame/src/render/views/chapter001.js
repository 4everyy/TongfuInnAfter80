const chapterData = require('../../../data/chapter001');
const clamp = require('../../core/math-utils').clamp;

function drawScene(ui, chapter) {
  const paper = ui.theme.colors.paper;
  const wood = ui.theme.colors.wood;
  const ink = ui.theme.colors.ink;
  const h = ui.height;
  ui.rect(0, 0, ui.width, h, '#d8b67a');
  ui.rect(0, 72, ui.width, h - 72, '#9b6b43');
  ui.rect(0, 220, ui.width, h - 220, '#654229');
  ui.rect(0, 78, ui.width, 9, '#4c301f');
  ui.rect(220, 87, 12, 150, '#54351f');
  ui.rect(616, 87, 12, 150, '#54351f');
  ui.roundedRect(536, 112, 122, 104, 4, '#ead19a', wood);
  ui.label('长风客栈', 597, 137, 22, ink, 'center', ui.theme.fonts.title);
  ui.label('账本', 597, 171, 15, wood, 'center', ui.theme.fonts.title);
  ui.roundedRect(258, 196, 136, 44, 4, '#70462b', '#3d2619');
  ui.roundedRect(442, 205, 50, 72, 3, '#805033', '#3d2619');
  ui.label('破桌', 326, 217, 13, paper, 'center');
  ui.label('倒椅', 467, 239, 12, paper, 'center');
  ui.roundedRect(704, 130, 78, 118, 2, '#4f3925', '#2e1f15');
  ui.label('后厨', 743, 162, 17, paper, 'center', ui.theme.fonts.title);
  ui.label('热气腾腾', 743, 193, 11, '#e7c77d', 'center');
  ui.portrait('jingzhi', 510, 184, 62);
  ui.label('霍惊枝', 541, 258, 12, paper, 'center', ui.theme.fonts.title);
  ui.portrait('xiaoman', 134, 184, 58);
  ui.label('叶小满', 163, 253, 12, paper, 'center', ui.theme.fonts.title);
  if (chapter.act === 'act1_misunderstanding') {
    ui.label('门前一阵鸡飞狗跳，茶客都不敢进来了。', ui.width / 2, 48, 18, ink, 'center', ui.theme.fonts.title);
  } else if (chapter.act === 'act2_accounting') {
    ui.label('乱子止住了，先把客栈的损失清楚。', ui.width / 2, 48, 18, ink, 'center', ui.theme.fonts.title);
  } else {
    ui.label('人留下可以，总得拿出点真本事。', ui.width / 2, 48, 18, ink, 'center', ui.theme.fonts.title);
  }
}

function drawTop(ui, chapter) {
  const actName = chapter.act === 'act1_misunderstanding' ? '第一幕·门口误会' : chapter.act === 'act2_accounting' ? '第二幕·损失清单' : '第三幕·杂役试工';
  ui.roundedRect(16, 14, 250, 34, 6, '#f4e4bb', ui.theme.colors.wood);
  ui.label('第一回·江湖不散场', 30, 30, 16, ui.theme.colors.ink, 'left', ui.theme.fonts.title);
  ui.label(actName, 280, 30, 13, ui.theme.colors.paper, 'left', ui.theme.fonts.body);
  ui.roundedRect(ui.width - 180, 14, 164, 34, 6, '#4d3527', ui.theme.colors.gold);
  ui.label('客信 ' + chapter.guestTrust + '   损失 ' + chapter.damageLevel, ui.width - 98, 30, 12, ui.theme.colors.paper, 'center');
}

function drawHotspots(ui, state, chapter) {
  chapterData.activeHotspots(state).forEach((spot) => {
    const selected = chapter.selectedHotspotId === spot.id;
    ui.ctx.save();
    ui.ctx.globalAlpha = selected ? 0.34 : 0.18;
    ui.roundedRect(spot.x, spot.y, spot.w, spot.h, 8, selected ? ui.theme.colors.cinnabar : ui.theme.colors.gold);
    ui.ctx.restore();
    ui.roundedRect(spot.x + 8, spot.y + 8, Math.min(82, spot.w - 16), 25, 5, selected ? ui.theme.colors.cinnabar : '#4d3527');
    ui.label(spot.label, spot.x + 16, spot.y + 20, 11, ui.theme.colors.paper, 'left');
    ui.hitArea({ type: 'chapterHotspot', id: spot.id }, spot.x, spot.y, spot.w, spot.h);
  });
}

function actionButton(ui, action, x, y, width, title, impact) {
  ui.addButton(action, x, y, width, 42, title, ui.theme.colors.gold);
  ui.label(impact, x + width / 2, y + 56, 11, ui.theme.colors.paper, 'center');
}

function drawPanel(ui, state, chapter) {
  const selected = chapterData.activeHotspots(state).find((spot) => spot.id === chapter.selectedHotspotId);
  if (!selected) return;
  const panelY = ui.height - 128;
  ui.roundedRect(18, panelY, ui.width - 36, 110, 10, '#34251ddd', ui.theme.colors.gold);
  ui.label(selected.title, 38, panelY + 25, 17, ui.theme.colors.gold, 'left', ui.theme.fonts.title);
  ui.label(selected.description, 38, panelY + 48, 12, ui.theme.colors.paper, 'left', null, ui.width - 300);
  ui.addButton({ type: 'chapterClosePanel' }, ui.width - 66, panelY + 12, 30, 30, '×', ui.theme.colors.cinnabar);
  if (selected.id === 'entrance') {
    actionButton(ui, { type: 'chapterAct1', choice: 'wuchen' }, 332, panelY + 22, 128, '老白点穴', '秩序↑ 身份风险↑');
    actionButton(ui, { type: 'chapterAct1', choice: 'zhangdeng' }, 476, panelY + 22, 128, '掌灯讲理', '客信↑ 压力↑');
    actionButton(ui, { type: 'chapterAct1', choice: 'xiaoman' }, 620, panelY + 22, 128, '小满插话', '士气↑ 传言↑');
  } else if (selected.id === 'broken-table' || selected.id === 'ledger') {
    ui.label('找出三件损坏物：' + chapter.accountingFound.length + '/3', 400, panelY + 78, 13, ui.theme.colors.gold, 'left');
    chapterData.accountingItems.forEach((item, index) => {
      const found = chapter.accountingFound.indexOf(item.id) >= 0;
      ui.addButton({ type: 'chapterDamage', id: item.id }, 530 + index * 88, panelY + 62, 78, 34, found ? '已记' : item.name, found ? ui.theme.colors.jade : ui.theme.colors.gold);
    });
  } else if (selected.id === 'jingzhi') {
    actionButton(ui, { type: 'chapterWork', choice: 'sweep' }, 332, panelY + 22, 128, '扫地收拾', '开张状态↑');
    actionButton(ui, { type: 'chapterWork', choice: 'repair' }, 476, panelY + 22, 128, '修桌补椅', '损失控制↑');
    actionButton(ui, { type: 'chapterWork', choice: 'serve' }, 620, panelY + 22, 128, '端茶赔礼', '客人安抚↑');
  } else {
    ui.label('这是当前幕的环境线索，先完成主要事件再继续。', 360, panelY + 77, 13, ui.theme.colors.paper, 'left');
  }
}

function drawSettlement(ui, state, chapter) {
  const scores = [
    ['损失控制', 100 - chapter.damageLevel],
    ['客人安抚', chapter.guestTrust],
    ['角色关系', clamp(100 - chapter.zhangdengStress + chapter.jingzhiGuilt * 0.35, 0, 100)],
    ['开张状态', clamp(chapter.order + chapter.morale * 0.45, 0, 100)],
  ];
  ui.rect(0, 0, ui.width, ui.height, '#2d211ccc');
  ui.roundedRect(124, 36, ui.width - 248, ui.height - 72, 14, '#f0dbab', ui.theme.colors.wood);
  ui.label('第一回结算', ui.width / 2, 74, 28, ui.theme.colors.ink, 'center', ui.theme.fonts.title);
  ui.label(chapter.rating + ' 级', ui.width / 2, 116, 34, chapter.rating === 'S' ? ui.theme.colors.cinnabar : ui.theme.colors.wood, 'center', ui.theme.fonts.title);
  scores.forEach((score, index) => {
    const y = 154 + index * 27;
    ui.label(score[0], 178, y, 14, ui.theme.colors.ink, 'left');
    ui.rect(274, y - 7, 230, 14, '#c5a77d');
    ui.rect(274, y - 7, 230 * score[1] / 100, 14, ui.theme.colors.jade);
    ui.label(Math.round(score[1]), 522, y, 13, ui.theme.colors.ink, 'right');
  });
  ui.label('霍惊枝加入：' + chapter.jingzhiTag, ui.width / 2, 274, 15, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title);
  ui.label(chapter.summary.slice(-2).join('  '), ui.width / 2, 302, 12, ui.theme.colors.wood, 'center', null, ui.width - 300);
  ui.addButton({ type: 'chapterRestart' }, 246, 326, 140, 42, '重玩第一回', ui.theme.colors.gold);
  ui.addButton({ type: 'chapterReturnInn' }, 458, 326, 140, 42, '回到客栈', ui.theme.colors.jade);
}

function drawChapter001(ui, state) {
  const chapter = chapterData.ensure(state);
  if (chapter.status === 'complete') {
    drawSettlement(ui, state, chapter);
    return;
  }
  drawScene(ui, chapter);
  drawTop(ui, chapter);
  drawHotspots(ui, state, chapter);
  drawPanel(ui, state, chapter);
}

module.exports = { drawChapter001 };
