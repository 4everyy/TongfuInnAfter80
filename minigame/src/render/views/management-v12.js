var management = require('../../inn/inn');
var caseFiles = require('../../core/case-files');
var uiArt = require('../ui-art-v29');

var TOP = 38;
var FONT = { title: 20, section: 16, body: 12, caption: 10 };
var COLOR = {
  ink: '#29211d',
  paper: '#f3e5bf',
  paperLight: '#fff4d6',
  paperMuted: '#dfcea3',
  wood: '#5d4030',
  woodDark: '#2b211d',
  cinnabar: '#a64132',
  jade: '#2f6f62',
  gold: '#d5a74a',
  smoke: '#17110ed9',
};

var OBJECTS = [
  { id: 'kitchen', view: 'kitchen', x: 92, y: 176, icon: '灶', label: '后厨' },
  { id: 'hall', view: 'hall', x: 145, y: 284, icon: '堂', label: '大堂' },
  { id: 'counter', view: 'counter', x: 338, y: 228, icon: '账', label: '柜台' },
  { id: 'notice', view: 'notice', x: 470, y: 132, icon: '示', label: '告示' },
  { id: 'rooms', view: 'rooms', x: 638, y: 142, icon: '房', label: '客房' },
  { id: 'yard', view: 'yard', x: 684, y: 270, icon: '院', label: '后院' },
  { id: 'door', view: 'door', x: 786, y: 188, icon: '门', label: '门面' },
];

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function find(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id) return list[index];
  }
  return null;
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  var source = String(text || '');
  var lines = [];
  var line = '';
  var index;
  var candidate;
  for (index = 0; index < source.length; index += 1) {
    candidate = line + source[index];
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = source[index];
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (index < source.length && lines.length) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
  return lines;
}

function paragraph(ui, text, x, y, width, maxLines, color) {
  var lines;
  var index;
  ui.ctx.font = FONT.body + 'px ' + ui.theme.fonts.body;
  lines = wrapLines(ui.ctx, text, width, maxLines || 3);
  for (index = 0; index < lines.length; index += 1) {
    ui.label(lines[index], x, y + index * 19, FONT.body, color || COLOR.ink, 'left', ui.theme.fonts.body, width);
  }
}

function cutPanel(ui, x, y, width, height, fill, stroke, cut) {
  var c = cut || 7;
  var ctx = ui.ctx;
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + width - c, y);
  ctx.lineTo(x + width, y + c);
  ctx.lineTo(x + width, y + height - c);
  ctx.lineTo(x + width - c, y + height);
  ctx.lineTo(x + c, y + height);
  ctx.lineTo(x, y + height - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function tagButton(ui, action, x, y, width, height, title, style) {
  uiArt.drawSealButton(ui, action, x, y, width, height, title, {
    primary: style === 'primary' || style === 'jade',
    disabled: style === 'muted',
    icon: style === 'selected' ? 'check' : style === 'primary' ? 'hand' : null,
    size: FONT.body,
  });
}

function iconButton(ui, action, x, y, glyph, tone) {
  var pressed = ui.pressed && ui.pressed(action);
  var drawY = y + (pressed ? 2 : 0);
  ui.roundedRect(x, drawY, 44, 44, 22, tone || COLOR.paperLight, '#80664d');
  uiArt.drawIcon(ui, glyph === '‹' ? 'back' : glyph, x + 22, drawY + 22, 17, COLOR.ink);
  ui.hitArea(action, x, y, 44, 44);
}

function phaseLabel(state) {
  return management.phaseLabel(state.calendar.phase);
}

function branchName(state) {
  return state.activeBranchId === 'jiangnan' ? '水巷分店' : '长风客栈';
}

function drawHud(ui, state) {
  var right = ui.width - (ui.safe ? ui.safe.capsuleRight : 14);
  ui.rect(0, 0, ui.width, TOP, '#2b211df2');
  ui.label(branchName(state), 14, 19, FONT.section, COLOR.paper, 'left', ui.theme.fonts.title);
  ui.label('第 ' + state.calendar.day + ' 日 · ' + phaseLabel(state), 132, 19, FONT.body, COLOR.gold, 'left', ui.theme.fonts.body);
  ui.label(
    '银 ' + state.inventory.coin + '   食 ' + state.inventory.ingredient + '   口碑 ' + state.inn.reputation + '   秩序 ' + state.inn.order,
    right,
    19,
    FONT.body,
    COLOR.paper,
    'right',
    ui.theme.fonts.body
  );
}

function phaseTint(ui, state) {
  if (ui.timeTint) ui.timeTint(0, TOP, ui.width, ui.height - TOP);
}

function sceneImage(ui, state) {
  var mapId = state.activeBranchId === 'jiangnan' ? 'jiangnan_branch' : 'inn';
  var art = ui.assets.manifest.maps[mapId];
  var layer = art && art.layers && art.layers[0];
  return layer && ui.assets.image(layer.src);
}

function drawCharacters(ui, state) {
  var ids = ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'];
  var positions = [
    { x: 250, y: 288, facing: 'down' },
    { x: 365, y: 294, facing: 'down' },
    { x: 484, y: 298, facing: 'right' },
    { x: 586, y: 294, facing: 'left' },
    { x: 704, y: 298, facing: 'left' },
  ];
  ids.forEach(function (id, index) {
    var character = state.characters[id];
    var point = positions[index];
    var drawn;
    if (!character || !character.innUnlocked) return;
    ui.heroShadow(point.x, point.y, 94, 0.86, 0.13);
    drawn = ui.artHero(id, point.x, point.y, 94, point.facing, false, point.x, point.y, null, 'inn-v12:' + id);
    if (!drawn) ui.fallbackHero(id, point.x, point.y, 94, point.facing);
    ui.hitArea({ type: 'managementObjectOpen', view: 'character', roleId: id }, point.x - 28, point.y - 94, 56, 102);
    ui.roundedRect(point.x - 28, point.y + 4, 56, 19, 4, '#211814cc', '#bc9457');
    ui.label(ui.role(id).name, point.x, point.y + 13, FONT.caption, COLOR.paperLight, 'center', ui.theme.fonts.body, 50);
  });
}

function markerAttention(state, object) {
  if (object.id === 'counter' && state.calendar.phase === 'noon') return true;
  if (object.id === 'door' && state.calendar.phase === 'morning') return true;
  if (object.id === 'notice' && state.sideQuests && state.sideQuests.activeId) return true;
  if (object.id === 'rooms' && state.inn.roomState.some(function (room) { return room.cleanliness < 55; })) return true;
  return false;
}

function drawObjectMarker(ui, state, object) {
  var pulse = 1;
  var attention = markerAttention(state, object);
  var radius;
  var ctx = ui.ctx;
  var showLabel = attention || state.managementSeenObjects.indexOf(object.id) < 0;
  if (attention) pulse = 0.96 + ((Math.sin(Date.now() / 900 * Math.PI * 2) + 1) / 2) * 0.08;
  radius = 18 * pulse;
  ctx.save();
  ctx.globalAlpha = attention ? 0.96 : 0.78;
  ctx.beginPath();
  ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = attention ? '#f0d38d' : '#f5e8c4';
  ctx.fill();
  ctx.strokeStyle = attention ? COLOR.cinnabar : '#765d45';
  ctx.lineWidth = attention ? 2 : 1;
  ctx.stroke();
  ctx.restore();
  ui.label(object.icon, object.x, object.y, FONT.body, COLOR.ink, 'center', ui.theme.fonts.title);
  if (showLabel) {
    ui.roundedRect(object.x - 25, object.y + 22, 50, 18, 4, '#211814cc');
    ui.label(object.label, object.x, object.y + 31, FONT.caption, COLOR.paperLight, 'center', ui.theme.fonts.body);
  }
  ui.hitArea({ type: 'managementObjectOpen', view: object.view, objectId: object.id }, object.x - 26, object.y - 26, 52, showLabel ? 70 : 52);
}

function drawObjective(ui, state) {
  var script = management.dayScript(state);
  cutPanel(ui, 14, 49, 302, 58, '#f6e9cce8', '#9a784b', 7);
  ui.rect(14, 49, 4, 58, COLOR.cinnabar);
  ui.label(script.title, 28, 67, FONT.section, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  ui.label(script.objective, 28, 91, FONT.caption, COLOR.ink, 'left', ui.theme.fonts.body, 274);
}

function drawToast(ui, state) {
  if (!state.toast) return;
  cutPanel(ui, 236, 334, 372, 32, '#211814dc', '#bc9457', 5);
  ui.label(state.toast, 422, 350, FONT.body, COLOR.paperLight, 'center', ui.theme.fonts.body, 350);
}

function drawScene(ui, state) {
  var image = sceneImage(ui, state);
  if (image) ui.cover(image, 0, TOP, ui.width, ui.height - TOP);
  else ui.rect(0, TOP, ui.width, ui.height - TOP, '#856448');
  phaseTint(ui, state);
  drawObjective(ui, state);
  OBJECTS.forEach(function (object) { drawObjectMarker(ui, state, object); });
  drawCharacters(ui, state);
  drawToast(ui, state);
}

function drawPageBackground(ui, tone) {
  var colors = {
    counter: '#5a4030',
    kitchen: '#49352c',
    rooms: '#46564d',
    notice: '#4c3528',
    character: '#66503b',
    hall: '#58473a',
    door: '#4d4032',
    yard: '#4a5545',
  };
  var index;
  ui.rect(0, TOP, ui.width, ui.height - TOP, colors[tone] || colors.counter);
  for (index = 0; index < 10; index += 1) {
    ui.rect(0, TOP + 34 + index * 34, ui.width, 1, '#fff4d610');
  }
}

function drawPageHeader(ui, state, title, subtitle) {
  iconButton(ui, { type: 'managementSceneBack' }, 14, 48, '‹', COLOR.paperLight);
  ui.label(title, 72, 64, FONT.title, COLOR.paperLight, 'left', ui.theme.fonts.title);
  ui.label(subtitle || '', 72, 86, FONT.caption, '#dbcda9', 'left', ui.theme.fonts.body, 560);
  ui.label(branchName(state) + ' · ' + phaseLabel(state), 810, 68, FONT.body, COLOR.paperLight, 'right', ui.theme.fonts.body);
}

function drawResourceStrip(ui, state, x, y, width) {
  var stock = state.inventory.stock || { staple: 0, vegetable: 0, meat: 0, tea: 0 };
  cutPanel(ui, x, y, width, 34, '#eadbb5', '#9a784b', 5);
  ui.label(
    '银 ' + state.inventory.coin + '　主食 ' + stock.staple + '　蔬菜 ' + stock.vegetable +
      '　荤食 ' + stock.meat + '　茶饮 ' + stock.tea,
    x + width / 2,
    y + 17,
    FONT.body,
    COLOR.ink,
    'center',
    ui.theme.fonts.body,
    width - 20
  );
}

function drawService(ui, state) {
  var step = management.currentServiceStep(state);
  var event;
  var game;
  var round;
  var index;
  cutPanel(ui, 106, 106, 632, 226, COLOR.paper, '#9a784b', 9);
  if (!step) {
    ui.label('午市正在收尾', 422, 172, FONT.title, COLOR.cinnabar, 'center', ui.theme.fonts.title);
    return;
  }
  if (step.kind === 'event') {
    event = management.data.serviceEvents[step.id];
    ui.label('午市第 ' + state.service.wave + ' 轮 · ' + event.title, 142, 135, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
    paragraph(ui, event.text, 142, 172, 560, 2, COLOR.ink);
    for (index = 0; index < event.choices.length; index += 1) {
      tagButton(ui, { type: 'serviceChoice', index: index }, 142 + index * 286, 242, 268, 52, event.choices[index].label, index === 0 ? 'primary' : 'flat');
    }
    return;
  }
  game = state.service.miniGame;
  round = game && game.rounds[game.round];
  if (!game || !round) return;
  ui.label(game.name + ' · ' + (game.round + 1) + '/' + game.rounds.length, 142, 135, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  paragraph(ui, round.prompt, 142, 174, 560, 2, COLOR.ink);
  for (index = 0; index < round.options.length; index += 1) {
    tagButton(ui, { type: 'miniGameChoice', index: index }, 142 + index * 188, 242, 172, 52, round.options[index], index === 0 ? 'selected' : 'flat');
  }
}

function drawCounter(ui, state) {
  var script = management.dayScript(state);
  var menuText;
  drawPageBackground(ui, 'counter');
  drawPageHeader(ui, state, '掌柜柜台', '今日目标、营业预测与开店结算');
  if (state.calendar.phase === 'noon') {
    drawService(ui, state);
    return;
  }
  cutPanel(ui, 58, 106, 346, 214, COLOR.paper, '#9a784b', 9);
  ui.label('今日目标', 84, 132, FONT.section, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  ui.label(script.title, 84, 161, FONT.title, COLOR.ink, 'left', ui.theme.fonts.title);
  paragraph(ui, script.objective, 84, 194, 292, 3, COLOR.ink);
  ui.label('行动 ' + state.calendar.actionsUsed + '/' + state.calendar.actionLimit, 84, 262, FONT.body, COLOR.jade, 'left');
  ui.label('预计收入 ' + number(state.service.income, 0) + ' 文', 220, 262, FONT.body, COLOR.jade, 'left');
  menuText = state.dailyPlan.menu.map(function (id) {
    var dish = find(management.data.dishes, id);
    return dish ? dish.name : id;
  }).join('、');
  ui.label('菜单：' + (menuText || '尚未选择'), 84, 292, FONT.body, COLOR.wood, 'left', null, 292);

  cutPanel(ui, 430, 106, 356, 214, '#eadbb5', '#9a784b', 9);
  ui.label('柜台动作', 456, 132, FONT.section, COLOR.ink, 'left', ui.theme.fonts.title);
  ui.label('口碑 ' + state.inn.reputation + '　秩序 ' + state.inn.order, 456, 164, FONT.body, COLOR.jade, 'left');
  if (state.calendar.phase === 'morning') {
    paragraph(ui, '开门迎客只从客栈大门执行。柜台用于核对目标、预测收入与撤销最近一次筹备。', 456, 198, 304, 3, COLOR.ink);
    if (state.dailyPlan.undo) tagButton(ui, { type: 'planUndo' }, 456, 266, 304, 44, '撤销最近一次筹备', 'flat');
  } else {
    tagButton(ui, { type: 'settle' }, 456, 194, 304, 56, '打烊结算', 'primary');
    if (state.episodes.pendingId) tagButton(ui, { type: 'episodeOpen' }, 456, 266, 304, 44, '完成今晚的人物交流', 'flat');
  }
}

function drawKitchen(ui, state) {
  var index;
  var dish;
  var selected;
  var column;
  var row;
  var x;
  var y;
  drawPageBackground(ui, 'kitchen');
  drawPageHeader(ui, state, '后厨案台', '选择最多三道菜，并调整今日售价');
  drawResourceStrip(ui, state, 72, 98, 700);
  for (index = 0; index < management.data.dishes.length; index += 1) {
    dish = management.data.dishes[index];
    selected = state.dailyPlan.menu.indexOf(dish.id) >= 0;
    column = index % 2;
    row = Math.floor(index / 2);
    x = 72 + column * 356;
    y = 146 + row * 57;
    cutPanel(ui, x, y, 332, 48, '#f0dfb8', selected ? COLOR.cinnabar : '#927555', 6);
    tagButton(ui, { type: 'dish', id: dish.id }, x + 8, y + 5, 154, 38, dish.name, selected ? 'selected' : 'flat');
    tagButton(ui, { type: 'price', id: dish.id, delta: -1 }, x + 176, y + 4, 44, 40, '−', 'flat');
    ui.label(state.dailyPlan.prices[dish.id] + ' 文', x + 248, y + 24, FONT.body, COLOR.ink, 'center');
    tagButton(ui, { type: 'price', id: dish.id, delta: 1 }, x + 280, y + 4, 44, 40, '+', 'flat');
  }
  tagButton(ui, { type: 'innMicroStart', id: 'prepare' }, 236, 326, 172, 48, '开始备菜', 'primary');
  tagButton(ui, { type: 'managementSceneBack' }, 436, 326, 172, 48, '返回灶台', 'flat');
}

function drawSupply(ui, state) {
  var stock = state.inventory.stock || {};
  var orders = state.transport && state.transport.orders || [];
  var activeOrders = orders.filter(function (order) { return order.status !== 'arrived' && order.status !== 'cancelled'; });
  var labels = [
    { name: '主食', value: stock.staple || 0, tone: '#b68b4e' },
    { name: '蔬菜', value: stock.vegetable || 0, tone: '#4f8066' },
    { name: '荤食', value: stock.meat || 0, tone: '#a44f42' },
    { name: '茶饮', value: stock.tea || 0, tone: '#527868' },
  ];
  drawPageBackground(ui, 'kitchen');
  drawPageHeader(ui, state, '食材货架', '采购、库存与跨店运输');
  labels.forEach(function (item, index) {
    var x = 116 + index * 154;
    cutPanel(ui, x, 118, 132, 92, COLOR.paper, '#8b7153', 7);
    ui.label(item.name, x + 18, 145, FONT.body, COLOR.wood, 'left', ui.theme.fonts.body);
    ui.label(item.value, x + 66, 180, FONT.title, item.tone, 'center', ui.theme.fonts.title);
  });
  cutPanel(ui, 116, 226, 594, 54, '#eadbb5', '#9a784b', 6);
  ui.label(
    activeOrders.length ? '运输途中 ' + activeOrders.length + ' 单，抵达后只入当前分店库存。' : '当前没有在途运输订单。',
    136, 253, FONT.body, COLOR.ink, 'left', ui.theme.fonts.body, 554
  );
  tagButton(ui, { type: 'innMicroStart', id: 'purchase' }, 214, 306, 188, 50, '选择采购组合', 'primary');
  tagButton(ui, { type: 'managementSceneBack' }, 442, 306, 188, 50, '返回客栈场景', 'flat');
}

function guestName(id) {
  var guest = find(management.data.guests, id);
  return guest ? guest.name : '空房';
}

function facilityButton(ui, state, id, x, y, width) {
  var facility = find(management.data.facilities, id);
  var level = state.inn.facilities[id] || 1;
  var cost = level <= facility.costs.length ? facility.costs[level - 1] + ' 文' : '已满级';
  tagButton(ui, { type: 'upgrade', id: id }, x, y, width, 44, facility.name + ' Lv.' + level + ' · ' + cost, level <= facility.costs.length ? 'flat' : 'muted');
}

function drawRooms(ui, state) {
  var index;
  var room;
  var x;
  var gap = 26;
  var totalWidth = state.inn.roomState.length * 226 + Math.max(0, state.inn.roomState.length - 1) * gap;
  var startX = Math.round((ui.width - totalWidth) / 2);
  drawPageBackground(ui, 'rooms');
  drawPageHeader(ui, state, '客房房牌墙', '整洁与舒适影响房费、住客和夜间事件');
  for (index = 0; index < state.inn.roomState.length; index += 1) {
    room = state.inn.roomState[index];
    x = startX + index * (226 + gap);
    cutPanel(ui, x, 112, 226, 176, COLOR.paper, '#8b7153', 10);
    ui.rect(x + 14, 112, 5, 176, room.cleanliness < 55 ? COLOR.cinnabar : COLOR.jade);
    ui.label(room.name, x + 34, 140, FONT.section, COLOR.ink, 'left', ui.theme.fonts.title);
    ui.label(guestName(room.guestId), x + 34, 171, FONT.body, COLOR.wood, 'left');
    ui.label('剩余 ' + room.daysRemaining + ' 晚', x + 34, 198, FONT.caption, COLOR.wood, 'left');
    ui.label('整洁 ' + room.cleanliness, x + 34, 226, FONT.body, COLOR.jade, 'left');
    ui.label('舒适 ' + room.comfort, x + 130, 226, FONT.body, COLOR.jade, 'left');
    tagButton(ui, { type: 'roomClean', id: room.id }, x + 34, 244, 158, 44, '整理客房', 'flat');
  }
  facilityButton(ui, state, 'rooms', 286, 320, 272);
}

function outingLabel(state) {
  var entry = state.sideQuests.entries['late-letter'];
  if (entry.status === 'complete') return '自由探索';
  if (entry.status === 'active') return '继续调查';
  if (entry.status === 'available') return '接取东关委托';
  return '委托尚未开放';
}

function drawNotice(ui, state) {
  var evidence;
  var latest;
  var entry = state.sideQuests.entries['late-letter'];
  var definition = find(management.data.sideQuests, 'late-letter') || { title: '迟到的驿信', description: '追查失踪货车，找回客栈物资。' };
  caseFiles.ensure(state);
  evidence = Object.keys(state.caseFiles.evidence).map(function (id) { return state.caseFiles.evidence[id]; });
  latest = evidence.length ? evidence[evidence.length - 1] : null;
  drawPageBackground(ui, 'notice');
  drawPageHeader(ui, state, '江湖告示板', '委托、证据和街面消息都在这里汇总');
  cutPanel(ui, 58, 104, 348, 216, '#d8bf8b', '#83613f', 6);
  ui.label('当前委托', 84, 132, FONT.section, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  ui.label(definition.title, 84, 163, FONT.title, COLOR.ink, 'left', ui.theme.fonts.title);
  paragraph(ui, definition.description, 84, 197, 294, 3, COLOR.ink);
  tagButton(ui, { type: 'startOuting', id: 'late-letter' }, 84, 252, 294, 52, outingLabel(state), entry.status === 'locked' ? 'muted' : 'primary');

  cutPanel(ui, 430, 104, 356, 216, COLOR.paper, '#8b7153', 8);
  ui.label('证据与传闻', 456, 132, FONT.section, COLOR.ink, 'left', ui.theme.fonts.title);
  ui.label('证据分 ' + state.caseFiles.score + '　市场压力 ' + state.market.pressure, 456, 163, FONT.body, COLOR.jade, 'left');
  if (latest) {
    ui.label('最近取得', 456, 198, FONT.caption, COLOR.wood, 'left');
    paragraph(ui, latest.title, 456, 222, 300, 2, COLOR.ink);
  } else {
    paragraph(ui, '尚未取得可核验的证据。外出调查后，线索会自动钉在这里。', 456, 198, 300, 3, COLOR.wood);
  }
  tagButton(ui, { type: 'managementSceneBack' }, 535, 260, 142, 44, '返回告示板', 'flat');
}

function drawHall(ui, state) {
  drawPageBackground(ui, 'hall');
  drawPageHeader(ui, state, '大堂桌席', '清扫、秩序和大堂设施');
  cutPanel(ui, 156, 110, 532, 194, COLOR.paper, '#8b7153', 10);
  ui.label('今日大堂', 190, 140, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  ui.label('秩序 ' + state.inn.order, 190, 180, FONT.section, COLOR.jade, 'left');
  ui.label('客人口碑 ' + state.inn.reputation, 338, 180, FONT.section, COLOR.jade, 'left');
  ui.label('午市满意 ' + number(state.service.satisfaction, 0), 520, 180, FONT.section, COLOR.jade, 'left');
  paragraph(ui, '清扫会占用一次筹备行动，并同步改善客房整洁。大堂升级会增加日结口碑与客流。', 190, 218, 466, 2, COLOR.ink);
  tagButton(ui, { type: 'innMicroStart', id: 'clean' }, 190, 258, 206, 48, '清扫客栈', 'jade');
  facilityButton(ui, state, 'hall', 418, 260, 238);
}

function drawDoor(ui, state) {
  drawPageBackground(ui, 'door');
  drawPageHeader(ui, state, '客栈门面', '开门迎客、街口揽客与招牌');
  cutPanel(ui, 136, 104, 572, 222, COLOR.paper, '#8b7153', 10);
  ui.label('门前安排', 170, 136, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  paragraph(ui, '门面只负责开店、揽客和招牌。采购请点击食材货架，委托请查看告示板。', 170, 172, 500, 2, COLOR.ink);
  if (state.calendar.phase === 'morning') {
    tagButton(ui, { type: 'innMicroStart', id: 'promote' }, 170, 218, 224, 56, '街口揽客', 'primary');
  } else {
    tagButton(ui, { type: 'managementSceneBack' }, 170, 218, 224, 56, '返回门面', 'flat');
  }
  facilityButton(ui, state, 'sign', 286, 290, 272);
}

function drawYard(ui, state) {
  drawPageBackground(ui, 'yard');
  drawPageHeader(ui, state, '后院杂务', '物资整理、休息与院落修缮');
  cutPanel(ui, 166, 112, 512, 190, COLOR.paper, '#8b7153', 10);
  ui.label('今日后院', 198, 142, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
  paragraph(ui, '后院等级会提升每日筹备和角色休息效果。准备不足时，也可以在这里补做备菜。', 198, 181, 448, 3, COLOR.ink);
  tagButton(ui, { type: 'managementSceneBack' }, 198, 238, 198, 48, '返回后院', 'flat');
  facilityButton(ui, state, 'yard', 418, 240, 228);
}

function currentJob(state, roleId) {
  var assignments = state.dailyPlan.assignments;
  var keys = Object.keys(assignments);
  var index;
  for (index = 0; index < keys.length; index += 1) {
    if (assignments[keys[index]] === roleId) return keys[index];
  }
  return null;
}

var JOB_ICONS = {
  counter: 'dialogue',
  service: 'hand',
  kitchen: 'pot',
  ledger: 'abacus',
  rooms: 'key',
  patrol: 'battle',
};

var CHARACTER_LAYOUT = {
  portrait: { x: 158, y: 190 },
  jobColumns: [360, 490, 620],
  jobRows: [164, 248],
  jobHeadingCenter: 490,
  dividerX: 664,
  actions: [690, 758],
};

function traitIcon(label) {
  var icons = {
    '识人': 'relationship', '估价': 'abacus', '稳场': 'complete',
    '侦察': 'investigate', '追踪': 'quest', '疾行': 'exit',
    '护卫': 'battle', '破局': 'hammer', '威慑': 'warning',
    '核账': 'abacus', '推理': 'investigate', '说服': 'dialogue',
    '火候': 'flame', '菜谱': 'quest', '宴席': 'pot',
  };
  return icons[label] || 'complete';
}

function drawCharacterPortrait(ui, id, character, role, centerX, centerY) {
  var radius = 72;
  var energy = Math.max(0, Math.min(1, Number(character.energy || 0) / 100));
  var mood = Math.max(0, Math.min(1, Number(character.mood || 0) / 100));
  var leftStart = Math.PI * 0.62;
  var leftSpan = Math.PI * 0.76;
  var rightStart = -Math.PI * 0.38;
  var rightSpan = Math.PI * 0.76;
  var ctx = ui.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#e8d8b4';
  ctx.fill();
  ctx.clip();
  ui.portrait(id, centerX - radius, centerY - radius, radius * 2);
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#120d0a99';
  ctx.beginPath(); ctx.arc(centerX, centerY, radius + 7, leftStart, leftStart + leftSpan); ctx.stroke();
  ctx.beginPath(); ctx.arc(centerX, centerY, radius + 7, rightStart, rightStart + rightSpan); ctx.stroke();
  ctx.strokeStyle = '#c96a55';
  ctx.beginPath(); ctx.arc(centerX, centerY, radius + 7, leftStart, leftStart + leftSpan * energy); ctx.stroke();
  ctx.strokeStyle = '#70a69a';
  ctx.beginPath(); ctx.arc(centerX, centerY, radius + 7, rightStart, rightStart + rightSpan * mood); ctx.stroke();
  ctx.restore();
  ui.roundedRect(centerX - 78, centerY + 51, 156, 46, 4, '#17100dde');
  ui.label(role.name, centerX, centerY + 65, 17, COLOR.paperLight, 'center', ui.theme.fonts.title, 144);
  ui.label(role.role, centerX, centerY + 84, 9, '#cbb994', 'center', ui.theme.fonts.body, 144);
  uiArt.drawIcon(ui, 'energy', centerX - 58, centerY + 108, 13, '#d9765d');
  ui.label(String(character.energy), centerX - 44, centerY + 108, 10, COLOR.paperLight, 'left');
  uiArt.drawIcon(ui, 'mood', centerX + 22, centerY + 108, 13, '#7cb5a8');
  ui.label(String(character.mood), centerX + 36, centerY + 108, 10, COLOR.paperLight, 'left');
}

function drawTraitSeal(ui, label, centerX, centerY) {
  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
  ui.ctx.fillStyle = '#2b211de6';
  ui.ctx.fill();
  ui.ctx.strokeStyle = '#b99558';
  ui.ctx.lineWidth = 1.2;
  ui.ctx.stroke();
  ui.ctx.restore();
  uiArt.drawIcon(ui, traitIcon(label), centerX, centerY, 16, '#e8c979');
  ui.label(label, centerX, centerY + 28, 9, '#ead9b4', 'center', ui.theme.fonts.body, 58);
}

function drawJobPlaque(ui, roleId, job, centerX, centerY, selected) {
  var action = { type: 'assignRole', id: job.id, roleId: roleId };
  var pressed = ui.pressed && ui.pressed(action);
  var drawY = centerY + (pressed ? 2 : 0);
  var radius = selected ? 30 : 27;
  var pulse = selected ? 1 + Math.sin(Date.now() / 450) * 0.035 : 1;
  ui.ctx.save();
  ui.ctx.globalAlpha = selected ? 0.25 : 0.16;
  ui.ctx.beginPath();
  ui.ctx.arc(centerX, drawY + 3, radius + 7, 0, Math.PI * 2);
  ui.ctx.fillStyle = selected ? COLOR.gold : '#120d0a';
  ui.ctx.fill();
  ui.ctx.restore();
  ui.ctx.save();
  ui.ctx.translate(centerX, drawY);
  ui.ctx.scale(pulse, pulse);
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ui.ctx.fillStyle = selected ? COLOR.jade : '#ead7aa';
  ui.ctx.fill();
  ui.ctx.strokeStyle = selected ? '#e9c675' : '#896746';
  ui.ctx.lineWidth = selected ? 2.5 : 1.2;
  ui.ctx.stroke();
  ui.ctx.restore();
  uiArt.drawIcon(ui, JOB_ICONS[job.id] || 'party', centerX, drawY, 23, selected ? '#f7e7bd' : COLOR.cinnabar);
  if (selected) {
    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.arc(centerX + 22, drawY - 21, 8, 0, Math.PI * 2);
    ui.ctx.fillStyle = COLOR.cinnabar;
    ui.ctx.fill();
    ui.ctx.restore();
    uiArt.drawIcon(ui, 'check', centerX + 22, drawY - 21, 8, COLOR.paperLight);
  }
  ui.label(job.name, centerX, centerY + 39, 11, COLOR.paperLight, 'center', ui.theme.fonts.title, 78);
  ui.label(job.trait, centerX, centerY + 54, 8, '#c8b791', 'center', ui.theme.fonts.body, 72);
  ui.hitArea(action, centerX - 35, centerY - 34, 70, 82);
}

function drawRoleCommand(ui, action, icon, label, centerX, centerY, primary, disabled) {
  var pressed = !disabled && ui.pressed && ui.pressed(action);
  var drawY = centerY + (pressed ? 2 : 0);
  var tone = disabled ? '#71675a' : primary ? COLOR.cinnabar : COLOR.jade;
  ui.ctx.save();
  ui.ctx.globalAlpha = disabled ? 0.55 : 1;
  ui.ctx.beginPath();
  ui.ctx.arc(centerX, drawY, 25, 0, Math.PI * 2);
  ui.ctx.fillStyle = tone;
  ui.ctx.fill();
  ui.ctx.strokeStyle = disabled ? '#948875' : '#e0be70';
  ui.ctx.lineWidth = 1.5;
  ui.ctx.stroke();
  ui.ctx.restore();
  uiArt.drawIcon(ui, disabled ? 'lock' : icon, centerX, drawY, 21, COLOR.paperLight);
  ui.label(label, centerX, centerY + 36, 9, disabled ? '#a99b84' : '#ead9b4', 'center', ui.theme.fonts.body, 66);
  if (!disabled) ui.hitArea(action, centerX - 30, centerY - 30, 60, 74);
}

function drawCharacter(ui, state) {
  var id = state.managementRoleId || 'zhangdeng';
  var character = state.characters[id] || state.characters.zhangdeng;
  var role = ui.role(id);
  var assigned = currentJob(state, id);
  var index;
  var job;
  var x;
  var y;
  var background = sceneImage(ui, state);
  var gradient;
  var traits = role.traits || [];
  if (background) ui.cover(background, 0, TOP, ui.width, ui.height - TOP);
  else drawPageBackground(ui, 'character');
  phaseTint(ui, state);
  ui.rect(0, TOP, ui.width, ui.height - TOP, '#160f0caa');
  gradient = ui.ctx.createLinearGradient(250, 0, 810, 0);
  gradient.addColorStop(0, '#160f0c20');
  gradient.addColorStop(0.25, '#160f0c9c');
  gradient.addColorStop(1, '#160f0ce8');
  ui.ctx.fillStyle = gradient;
  ui.ctx.fillRect(250, TOP, 594, ui.height - TOP);
  drawPageHeader(ui, state, '人物名帖', '查看状态、安排岗位与人物行动');
  drawCharacterPortrait(ui, id, character, role, CHARACTER_LAYOUT.portrait.x, CHARACTER_LAYOUT.portrait.y);
  for (index = 0; index < Math.min(3, traits.length); index += 1) {
    drawTraitSeal(ui, traits[index], 92 + index * 66, 334);
  }

  uiArt.drawIcon(ui, 'party', CHARACTER_LAYOUT.jobHeadingCenter - 39, 112, 20, COLOR.gold);
  ui.label('岗位印章', CHARACTER_LAYOUT.jobHeadingCenter + 16, 112, FONT.section, COLOR.paperLight, 'center', ui.theme.fonts.title, 74);
  if (assigned) {
    uiArt.drawStatusChip(ui, JOB_ICONS[assigned] || 'check', find(management.data.jobs, assigned).name, 674, 99, 100, COLOR.jade, { center: true });
  } else {
    uiArt.drawStatusChip(ui, 'warning', '尚未安排', 666, 99, 108, COLOR.cinnabar, { center: true });
  }
  ui.rect(312, 135, 344, 1, '#e3cf9b42');
  ui.rect(CHARACTER_LAYOUT.dividerX, 143, 1, 150, '#e3cf9b30');
  for (index = 0; index < management.data.jobs.length; index += 1) {
    job = management.data.jobs[index];
    x = CHARACTER_LAYOUT.jobColumns[index % 3];
    y = CHARACTER_LAYOUT.jobRows[Math.floor(index / 3)];
    drawJobPlaque(ui, id, job, x, y, assigned === job.id);
  }
  var hasEpisode = state.episodes.pendingId && management.data.characterEpisodes[state.episodes.pendingId].roleId === id;
  drawRoleCommand(ui, { type: 'episodeOpen' }, 'relationship', hasEpisode ? '人物剧情' : '暂无剧情', CHARACTER_LAYOUT.actions[0], 332, true, !hasEpisode);
  drawRoleCommand(
    ui,
    { type: 'partyToggle', id: id },
    'party',
    character.recruited ? (character.inParty ? '移出队伍' : '加入队伍') : '尚未招募',
    CHARACTER_LAYOUT.actions[1],
    332,
    false,
    !character.recruited
  );
}

function drawPage(ui, state) {
  var view = state.managementView || 'scene';
  if (view === 'counter') drawCounter(ui, state);
  else if (view === 'kitchen') drawKitchen(ui, state);
  else if (view === 'supply') drawSupply(ui, state);
  else if (view === 'rooms') drawRooms(ui, state);
  else if (view === 'notice') drawNotice(ui, state);
  else if (view === 'hall') drawHall(ui, state);
  else if (view === 'door') drawDoor(ui, state);
  else if (view === 'yard') drawYard(ui, state);
  else if (view === 'character') drawCharacter(ui, state);
  else drawScene(ui, state);
}

function drawEventModal(ui, state) {
  var modal = state.managementEvent;
  var episode;
  var role;
  var result;
  var index;
  if (!modal) return;
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.rect(0, 0, ui.width, ui.height, '#17110ec7');
  uiArt.drawPanel(ui, 'dialogue', 82, 64, 680, 262, { fill: COLOR.paperLight, stroke: '#8b7153' });
  if (modal.kind === 'episode') {
    episode = management.data.characterEpisodes[modal.id];
    role = ui.role(episode.roleId);
    uiArt.drawPortraitFrame(ui, episode.roleId, 104, 82, 128, 156, { label: role.name, labelSize: 10 });
    uiArt.drawIcon(ui, 'relationship', 250, 105, 20, COLOR.cinnabar);
    ui.label(episode.title, 270, 105, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
    paragraph(ui, episode.text, 246, 146, 480, 3, COLOR.ink);
    for (index = 0; index < episode.choices.length; index += 1) {
      tagButton(ui, { type: 'episodeChoice', index: index }, 246 + index * 236, 242, 218, 48, episode.choices[index].label, index === 0 ? 'primary' : 'flat');
    }
  } else if (modal.kind === 'settlement') {
    result = modal.result;
    uiArt.drawIcon(ui, 'reward', 116, 104, 22, COLOR.cinnabar);
    ui.label('第 ' + result.day + ' 日结算 · ' + result.grade + ' 级', 142, 104, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
    ui.label(result.title, 116, 142, FONT.section, COLOR.ink, 'left', ui.theme.fonts.title);
    ui.label('营业与客房收入 ' + result.income + ' 文', 116, 184, FONT.body, COLOR.jade, 'left');
    ui.label('帮工支出 ' + result.helperCost + ' 文　满意 ' + result.satisfaction, 116, 214, FONT.body, COLOR.wood, 'left');
    ui.label('口碑 ' + result.reputation + '　秩序 ' + result.order, 116, 244, FONT.body, COLOR.ink, 'left');
    tagButton(ui, { type: 'managementEventClose' }, 548, 248, 176, 52, '开始新一天', 'primary');
  } else if (modal.kind === 'confirm') {
    uiArt.drawIcon(ui, 'warning', 118, 112, 22, COLOR.cinnabar);
    ui.label(modal.title, 144, 112, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
    paragraph(ui, modal.text, 116, 158, 590, 4, COLOR.ink);
    tagButton(ui, { type: 'managementEventClose' }, 390, 248, 150, 48, '再想想', 'flat');
    tagButton(ui, modal.confirmAction, 560, 248, 164, 48, modal.confirmLabel || '确认', 'primary');
  } else {
    uiArt.drawIcon(ui, 'complete', 118, 112, 22, COLOR.jade);
    ui.label(modal.title || '事件结果', 144, 112, FONT.title, COLOR.cinnabar, 'left', ui.theme.fonts.title);
    paragraph(ui, modal.text || '', 116, 158, 590, 4, COLOR.ink);
    tagButton(ui, { type: 'managementEventClose' }, 548, 248, 176, 52, '记下结果', 'primary');
  }
}

function drawManagement(ui, state) {
  var view;
  var progress;
  var scale;
  management.ensure(state);
  view = state.managementView || 'scene';
  drawHud(ui, state);
  if (view === 'scene') {
    drawScene(ui, state);
  } else {
    progress = ui.pageProgress ? ui.pageProgress() : 1;
    scale = 0.98 + progress * 0.02;
    ui.ctx.save();
    ui.ctx.globalAlpha = 0.55 + progress * 0.45;
    ui.ctx.translate(ui.width / 2, (ui.height + TOP) / 2);
    ui.ctx.scale(scale, scale);
    ui.ctx.translate(-ui.width / 2, -(ui.height + TOP) / 2);
    drawPage(ui, state);
    ui.ctx.restore();
    if (progress < 1) ui.hitArea({ type: 'noop' }, 0, TOP, ui.width, ui.height - TOP);
  }
  drawEventModal(ui, state);
}

function drawManagementOverlay(ui, state) {
  var scene = state.innScene || {};
  var view = scene.activePage || (state.managementView !== 'scene' ? state.managementView : null);
  var progress;
  var scale;
  management.ensure(state);
  if (view) {
    state.managementView = view;
    progress = ui.pageProgress ? ui.pageProgress() : 1;
    scale = 0.98 + progress * 0.02;
    ui.ctx.save();
    ui.ctx.globalAlpha = 0.55 + progress * 0.45;
    ui.ctx.translate(ui.width / 2, (ui.height + TOP) / 2);
    ui.ctx.scale(scale, scale);
    ui.ctx.translate(-ui.width / 2, -(ui.height + TOP) / 2);
    drawPage(ui, state);
    ui.ctx.restore();
    if (progress < 1) ui.hitArea({ type: 'noop' }, 0, TOP, ui.width, ui.height - TOP);
  }
  drawEventModal(ui, state);
}

module.exports = {
  drawManagement: drawManagement,
  drawManagementOverlay: drawManagementOverlay,
  OBJECTS: OBJECTS,
};
