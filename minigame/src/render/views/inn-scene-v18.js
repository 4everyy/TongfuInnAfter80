'use strict';

var innScene = require('../../inn/scene-interactions');
var management = require('../../inn/inn');

var SCENE_Y = 42;
var ROLE_TONES = {
  counter: '#c08b42',
  door: '#a84b3e',
  kitchen: '#b85f3e',
  supply: '#66835f',
  hall: '#527a70',
  rooms: '#5c7187',
  notice: '#a64235',
  yard: '#75664f',
};

var ROLE_GLYPHS = {
  counter: '账',
  door: '门',
  kitchen: '灶',
  supply: '仓',
  hall: '席',
  rooms: '房',
  notice: '示',
  yard: '修',
};

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function find(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id) return list[index];
  }
  return null;
}

function cutPanel(ui, x, y, width, height, fill, stroke, cut) {
  var c = cut || 6;
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

function drawCornerFocus(ui, x, y, width, height, color, alpha) {
  var ctx = ui.ctx;
  var length = Math.min(12, width * 0.22, height * 0.22);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + length); ctx.lineTo(x, y); ctx.lineTo(x + length, y);
  ctx.moveTo(x + width - length, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + length);
  ctx.moveTo(x + width, y + height - length); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - length, y + height);
  ctx.moveTo(x + length, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - length);
  ctx.stroke();
  ctx.restore();
}

function drawObjectHint(ui, state, object, camera) {
  var scene = innScene.ensure(state);
  var status = innScene.attention(state, object);
  var selected = scene.selectedObjectId === object.id;
  var seen = scene.seenObjects.indexOf(object.id) >= 0;
  var pulse = status === 'urgent' || status === 'ready'
    ? 0.75 + (Math.sin(Date.now() / 900 * Math.PI * 2) + 1) * 0.125
    : 0.42;
  var x = object.hit.x - camera;
  var y = SCENE_Y + object.hit.y;
  var width = Math.max(44, object.hit.width);
  var height = Math.max(44, object.hit.height);
  var tone = ROLE_TONES[object.role] || '#b68a4f';
  var iconX = object.anchor.x - camera;
  var iconY = SCENE_Y + object.anchor.y;
  var showLabel = selected || !seen || status !== 'idle';
  if (x + width < 0 || x > ui.width) return;
  drawCornerFocus(ui, x, y, width, height, tone, selected ? 1 : pulse);
  if (showLabel) {
    ui.ctx.save();
    ui.ctx.globalAlpha = selected ? 1 : clamp(pulse, 0.55, 0.9);
    ui.roundedRect(iconX - 15, iconY - 15, 30, 30, 4, '#f1dfbddd', tone);
    ui.label(ROLE_GLYPHS[object.role] || '物', iconX, iconY, 12, '#2c211d', 'center', ui.theme.fonts.title);
    ui.ctx.restore();
    if (selected || !seen) {
      cutPanel(ui, iconX - 42, iconY + 19, 84, 20, '#241a16d9', tone, 4);
      ui.label(object.label, iconX, iconY + 29, 10, '#f4e5c5', 'center', ui.theme.fonts.body, 76);
    }
  }
  ui.hitArea({ type: 'innObjectSelect', id: object.id }, x, y, width, height);
}

function drawObjectLayer(ui, state, camera) {
  if (!innScene.isBusinessMap(state)) return;
  innScene.objects(state).forEach(function (object) {
    drawObjectHint(ui, state, object, camera);
  });
}

function actionButton(ui, action, x, y, width, primary) {
  var pressed = ui.pressed && ui.pressed({ type: 'innObjectAction', id: action.id });
  var drawY = y + (pressed ? 2 : 0);
  var locked = !!action.lockedReason;
  var fill = locked ? '#b7aa90' : primary ? '#a74435' : '#ead8ad';
  var text = locked ? '#736a5a' : primary ? '#fff0cf' : '#30241e';
  cutPanel(ui, x, drawY, width, 44, fill, locked ? '#8f8471' : primary ? '#6d2b22' : '#745a3e', 5);
  ui.label(action.label, x + width / 2, drawY + 22, 11, text, 'center', ui.theme.fonts.body, width - 12);
  ui.hitArea({ type: 'innObjectAction', id: action.id }, x, y, width, 44);
}

function drawActionTray(ui, state) {
  var scene = innScene.ensure(state);
  var object = find(innScene.objects(state), scene.selectedObjectId);
  var actions;
  var width;
  var x;
  var index;
  var buttonWidth;
  if (!object || scene.microGame || scene.serviceOpen || scene.activePage) return;
  actions = innScene.actionsForObject(state, object);
  width = clamp(164 + actions.length * 112, 280, 604);
  x = (ui.width - width) / 2;
  cutPanel(ui, x, ui.height - 70, width, 60, '#211814e8', '#b98a4c', 7);
  ui.label(object.label, x + 16, ui.height - 52, 10, '#d8ba78', 'left', ui.theme.fonts.title, 126);
  if (!actions.length) {
    ui.label('当前时段没有需要处理的事务', x + 154, ui.height - 40, 11, '#f0dfbd', 'left', ui.theme.fonts.body);
  } else {
    buttonWidth = Math.min(118, Math.floor((width - 166) / actions.length) - 8);
    for (index = 0; index < actions.length; index += 1) {
      actionButton(
        ui,
        actions[index],
        x + 152 + index * (buttonWidth + 8),
        ui.height - 62,
        buttonWidth,
        !!actions[index].primary
      );
    }
  }
  ui.hitArea({ type: 'innSceneDismiss' }, x + width - 42, ui.height - 68, 40, 40);
  ui.label('×', x + width - 22, ui.height - 49, 16, '#d9c9a5', 'center', ui.theme.fonts.title);
}

function modalFrame(ui, title, subtitle) {
  var x = 132;
  var y = 72;
  var width = ui.width - 264;
  var height = 246;
  ui.rect(0, SCENE_Y, ui.width, ui.height - SCENE_Y, '#18110dcc');
  cutPanel(ui, x + 4, y + 5, width, height, '#120d0ac2', null, 10);
  cutPanel(ui, x, y, width, height, '#f2e2b9', '#7d5a3d', 10);
  ui.rect(x + 14, y + 14, 4, height - 28, '#a74335');
  ui.label(title, x + 32, y + 34, 18, '#a74335', 'left', ui.theme.fonts.title, width - 80);
  ui.label(subtitle || '', x + 32, y + 58, 10, '#6d5848', 'left', ui.theme.fonts.body, width - 64);
  ui.hitArea({ type: 'noop' }, 0, SCENE_Y, ui.width, ui.height - SCENE_Y);
  return { x: x, y: y, width: width, height: height };
}

function modalChoice(ui, action, x, y, width, title, tone) {
  var pressed = ui.pressed && ui.pressed(action);
  cutPanel(ui, x, y + (pressed ? 2 : 0), width, 44, tone || '#ead5a5', '#76583d', 5);
  ui.label(title, x + width / 2, y + 22 + (pressed ? 2 : 0), 11, '#30231c', 'center', ui.theme.fonts.body, width - 12);
  ui.hitArea(action, x, y, width, 44);
}

function drawPurchase(ui, game, frame) {
  var choices = [
    { id: 'balanced', title: '均衡食材 · 10文', detail: '主食3 蔬菜3 荤食2 茶饮2' },
    { id: 'fresh', title: '时蔬茶饮 · 9文', detail: '主食1 蔬菜5 茶饮2' },
    { id: 'hearty', title: '荤食主料 · 14文', detail: '主食2 蔬菜1 荤食4' },
  ];
  choices.forEach(function (choice, index) {
    var x = frame.x + 32 + index * 168;
    cutPanel(ui, x, frame.y + 88, 150, 86, '#e4d0a1', '#836344', 6);
    ui.label(choice.title, x + 75, frame.y + 112, 12, '#8d3e32', 'center', ui.theme.fonts.title, 138);
    ui.label(choice.detail, x + 75, frame.y + 139, 9, '#59483a', 'center', ui.theme.fonts.body, 138);
    ui.hitArea({ type: 'innMicroChoice', choice: choice.id }, x, frame.y + 88, 150, 86);
  });
}

function drawPrepare(ui, game, frame) {
  var ingredients = [
    { id: 'staple', title: '主食', glyph: '米' },
    { id: 'vegetable', title: '蔬菜', glyph: '蔬' },
    { id: 'meat', title: '荤食', glyph: '肉' },
  ];
  ui.label('依次处理：主食 → 蔬菜 → 荤食', frame.x + frame.width / 2, frame.y + 88, 12, '#5d493a', 'center', ui.theme.fonts.body);
  ingredients.forEach(function (item, index) {
    var x = frame.x + 88 + index * 150;
    var done = index < game.step;
    ui.roundedRect(x, frame.y + 112, 70, 70, 35, done ? '#71866a' : '#e3c98f', '#76583d');
    ui.label(done ? '✓' : item.glyph, x + 35, frame.y + 143, 18, done ? '#f7ebcf' : '#49372b', 'center', ui.theme.fonts.title);
    ui.label(item.title, x + 35, frame.y + 174, 10, '#49372b', 'center', ui.theme.fonts.body);
    ui.hitArea({ type: 'innMicroChoice', choice: item.id }, x - 2, frame.y + 110, 74, 84);
  });
}

function drawClean(ui, game, frame) {
  var spots = [
    { id: 'left', x: frame.x + 116, y: frame.y + 132 },
    { id: 'center', x: frame.x + 278, y: frame.y + 108 },
    { id: 'right', x: frame.x + 430, y: frame.y + 150 },
  ];
  ui.label('依次擦净三处积灰，完成今日大堂清扫', frame.x + frame.width / 2, frame.y + 84, 12, '#5d493a', 'center');
  spots.forEach(function (spot) {
    var done = game.cleared.indexOf(spot.id) >= 0;
    ui.ctx.save();
    ui.ctx.globalAlpha = done ? 0.25 : 0.85;
    ui.ctx.beginPath();
    ui.ctx.arc(spot.x, spot.y, 27, 0, Math.PI * 2);
    ui.ctx.fillStyle = done ? '#769071' : '#8b7b68';
    ui.ctx.fill();
    ui.ctx.restore();
    ui.label(done ? '净' : '灰', spot.x, spot.y, 12, '#f4e6c8', 'center', ui.theme.fonts.title);
    ui.hitArea({ type: 'innMicroChoice', choice: spot.id }, spot.x - 30, spot.y - 30, 60, 60);
  });
}

function drawPromote(ui, game, frame) {
  var index;
  if (!game.awaitingFocus) {
    ui.label('看准招牌摆动，连续敲响三次', frame.x + frame.width / 2, frame.y + 86, 12, '#5d493a', 'center');
    for (index = 0; index < 3; index += 1) {
      ui.roundedRect(frame.x + 176 + index * 76, frame.y + 112, 52, 52, 26, index < game.step ? '#9c4436' : '#d6b56e', '#76583d');
      ui.label(index < game.step ? '响' : String(index + 1), frame.x + 202 + index * 76, frame.y + 138, 12, index < game.step ? '#f8e8c8' : '#392a22', 'center');
    }
    modalChoice(ui, { type: 'innMicroChoice', kind: 'beat' }, frame.x + 206, frame.y + 182, 160, '敲响招牌', '#d6aa4a');
  } else {
    ui.label('今天重点招揽哪类客人？', frame.x + frame.width / 2, frame.y + 92, 12, '#5d493a', 'center');
    modalChoice(ui, { type: 'innMicroChoice', kind: 'focus', choice: 'regular' }, frame.x + 72, frame.y + 132, 132, '街坊熟客');
    modalChoice(ui, { type: 'innMicroChoice', kind: 'focus', choice: 'merchant' }, frame.x + 222, frame.y + 132, 132, '过路行商');
    modalChoice(ui, { type: 'innMicroChoice', kind: 'focus', choice: 'traveler' }, frame.x + 372, frame.y + 132, 132, '江湖旅人');
  }
}

function drawMicroGame(ui, state) {
  var game = state.innScene && state.innScene.microGame;
  var titles = { purchase: '货架采购', prepare: '案台备菜', clean: '大堂清扫', promote: '招牌揽客' };
  var frame;
  if (!game) return;
  frame = modalFrame(ui, titles[game.id] || '经营行动', '完成后才会消耗今日筹备次数；中途退出不会结算。');
  if (game.id === 'purchase') drawPurchase(ui, game, frame);
  else if (game.id === 'prepare') drawPrepare(ui, game, frame);
  else if (game.id === 'clean') drawClean(ui, game, frame);
  else if (game.id === 'promote') drawPromote(ui, game, frame);
  modalChoice(ui, { type: 'innMicroCancel' }, frame.x + frame.width - 116, frame.y + frame.height - 52, 88, '暂不处理', '#d7c6a1');
}

function drawService(ui, state) {
  var scene = state.innScene || {};
  var step = management.currentServiceStep(state);
  var event;
  var game;
  var round;
  var frame;
  var choices;
  if (!scene.serviceOpen || !step) return;
  if (step.kind === 'event') {
    event = management.data.serviceEvents[step.id];
    if (!event) return;
    frame = modalFrame(ui, event.title, '第 ' + state.service.wave + ' 轮客流 · 选择处理方式');
    ui.paragraph(event.text, frame.x + 32, frame.y + 82, {
      width: frame.width - 64,
      size: 12,
      lineHeight: 19,
      maxLines: 3,
      color: '#3a2c24',
    });
    choices = event.choices || [];
    choices.slice(0, 3).forEach(function (choice, index) {
      var width = Math.floor((frame.width - 80 - Math.max(0, choices.length - 1) * 12) / Math.min(3, choices.length));
      modalChoice(
        ui,
        { type: 'innServiceChoice', kind: 'event', index: index },
        frame.x + 32 + index * (width + 12),
        frame.y + 172,
        width,
        choice.label
      );
    });
  } else {
    game = management.ensureMiniGame(state);
    round = game && game.rounds[game.round];
    if (!round) return;
    frame = modalFrame(ui, game.name, '第 ' + state.service.wave + ' 轮客流 · ' + (game.round + 1) + '/' + game.rounds.length);
    ui.label(round.prompt, frame.x + frame.width / 2, frame.y + 100, 13, '#3a2c24', 'center', ui.theme.fonts.title, frame.width - 64);
    round.options.forEach(function (option, index) {
      var width = Math.floor((frame.width - 80 - Math.max(0, round.options.length - 1) * 12) / round.options.length);
      modalChoice(
        ui,
        { type: 'innServiceChoice', kind: 'minigame', index: index },
        frame.x + 32 + index * (width + 12),
        frame.y + 152,
        width,
        option
      );
    });
  }
  modalChoice(ui, { type: 'innServiceClose' }, frame.x + frame.width - 104, frame.y + frame.height - 48, 76, '稍后处理', '#d7c6a1');
}

function drawScreenUi(ui, state) {
  if (!innScene.isBusinessMap(state)) return;
  drawActionTray(ui, state);
  drawMicroGame(ui, state);
  drawService(ui, state);
}

module.exports = {
  drawObjectLayer: drawObjectLayer,
  drawScreenUi: drawScreenUi,
};
