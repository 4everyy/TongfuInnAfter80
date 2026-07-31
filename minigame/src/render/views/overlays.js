var content = require('../../../data/content');

var roles = content.roles;

function wrapLines(ctx, value, width, maximumLines) {
  var chars = String(value || '').split('');
  var lines = [];
  var line = '';
  var index;
  for (index = 0; index < chars.length; index += 1) {
    if (ctx.measureText(line + chars[index]).width > width && line) {
      lines.push(line);
      line = chars[index];
      if (lines.length >= maximumLines - 1) break;
    } else line += chars[index];
  }
  if (line && lines.length < maximumLines) lines.push(line);
  if (index < chars.length - 1 && lines.length) {
    while (ctx.measureText(lines[lines.length - 1] + '…').width > width && lines[lines.length - 1]) {
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    }
    lines[lines.length - 1] += '…';
  }
  return lines;
}

function drawBookFrame(ui, x, y, width, height) {
  ui.ctx.save();
  ui.roundedRect(x + 4, y + 5, width, height, 6, '#1b1512b8');
  ui.roundedRect(x, y, width, height, 6, '#5b3928', '#2b211d');
  ui.roundedRect(x + 7, y + 7, width - 14, height - 14, 3, '#f2e2ba', '#9d8055');
  ui.ctx.fillStyle = '#d8bd84';
  ui.ctx.fillRect(x + 14, y + 4, 3, height - 8);
  ui.ctx.fillRect(x + width - 17, y + 4, 3, height - 8);
  ui.ctx.strokeStyle = '#8c6a43';
  ui.ctx.globalAlpha = 0.28;
  ui.ctx.beginPath();
  ui.ctx.moveTo(x + 26, y + 22);
  ui.ctx.quadraticCurveTo(x + width * 0.55, y + 8, x + width - 28, y + 24);
  ui.ctx.moveTo(x + 26, y + height - 20);
  ui.ctx.quadraticCurveTo(x + width * 0.45, y + height - 7, x + width - 28, y + height - 22);
  ui.ctx.stroke();
  ui.ctx.restore();
}

function drawChoice(ui, action, x, y, width, title, primary) {
  var pressed = ui.pressed && ui.pressed(action);
  var offset = pressed ? 2 : 0;
  var fill = primary ? '#d4a349' : '#e8d4a4';
  var stroke = primary ? '#7b3a2c' : '#725037';
  ui.ctx.save();
  ui.roundedRect(x, y + 3, width, 44, 3, '#5e3d2a');
  ui.roundedRect(x, y + offset, width, 44, 3, fill, stroke);
  ui.ctx.fillStyle = stroke;
  ui.ctx.fillRect(x + 7, y + 5 + offset, 2, 34);
  ui.ctx.fillRect(x + width - 9, y + 5 + offset, 2, 34);
  ui.label(title, x + width / 2, y + 22 + offset, 12, '#2a211d', 'center', ui.theme.fonts.title, width - 24);
  ui.ctx.restore();
  ui.hitArea(action, x, y, Math.max(44, width), 44);
}

function drawDialogue(ui, state) {
  var dialogue = state.dialogue;
  var speaker = null;
  var panelX = 28;
  var panelY = ui.height - 156;
  var panelWidth = ui.width - 56;
  var panelHeight = 142;
  var portraitSize = 112;
  var contentX = panelX + 138;
  var contentWidth = panelWidth - 156;
  var elapsed = Math.max(0, Date.now() - (dialogue.openedAt || Date.now()));
  var visibleCount = dialogue.revealed ? dialogue.text.length : Math.floor(elapsed / 1000 * 24);
  var complete = visibleCount >= dialogue.text.length;
  var visibleText = complete ? dialogue.text : dialogue.text.slice(0, visibleCount);
  var lines;
  var choices;
  var columns;
  var gap = 8;
  var choiceWidth;
  var index;
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  drawBookFrame(ui, panelX, panelY, panelWidth, panelHeight);
  for (index = 0; index < roles.length; index += 1) {
    if (roles[index].id === dialogue.speakerId || roles[index].name === dialogue.speaker) {
      speaker = roles[index];
      break;
    }
  }
  if (speaker) {
    ui.roundedRect(panelX + 15, panelY + 14, portraitSize, portraitSize, 3, '#2b211d', '#b88a4d');
    ui.portrait(speaker.id, panelX + 19, panelY + 18, portraitSize - 8);
  } else {
    ui.roundedRect(panelX + 15, panelY + 14, portraitSize, portraitSize, 3, '#cfb98a', '#76543a');
    ui.label('江湖', panelX + 71, panelY + 70, 22, '#76543a', 'center', ui.theme.fonts.title);
  }
  ui.roundedRect(contentX, panelY + 12, Math.min(116, Math.max(64, dialogue.speaker.length * 19 + 20)), 30, 3, '#a83c2d', '#6d2c22');
  ui.label(dialogue.speaker, contentX + Math.min(116, Math.max(64, dialogue.speaker.length * 19 + 20)) / 2, panelY + 27, 15, '#f7e9c7', 'center', ui.theme.fonts.title);

  ui.ctx.font = '13px ' + ui.theme.fonts.body;
  lines = wrapLines(ui.ctx, visibleText, contentWidth, 3);
  for (index = 0; index < lines.length; index += 1) {
    ui.label(lines[index], contentX, panelY + 54 + index * 19, 13, '#2a211d', 'left', ui.theme.fonts.body, contentWidth);
  }

  if (!complete) {
    ui.label('轻触展开全文', panelX + panelWidth - 26, panelY + panelHeight - 17, 10, '#76543a', 'right');
    ui.hitArea({ type: 'dialogueReveal' }, panelX, panelY, panelWidth, panelHeight);
    return;
  }

  choices = dialogue.choices || [];
  if (!choices.length) choices = [{ label: '收起话本', action: 'close' }];
  columns = Math.min(3, choices.length);
  choiceWidth = (contentWidth - gap * (columns - 1)) / columns;
  choices.forEach(function (choice, choiceIndex) {
    drawChoice(
      ui,
      choice.action === 'close' && dialogue.choices.length === 0
        ? { type: 'close' }
        : { type: 'dialogue', index: choiceIndex },
      contentX + (choiceIndex % columns) * (choiceWidth + gap),
      panelY + 91 + Math.floor(choiceIndex / columns) * 48,
      choiceWidth,
      choice.label,
      choiceIndex === 0
    );
  });
}

function recruitedRoles(state) {
  return roles.filter(function (item) {
    return state.characters[item.id] && (state.characters[item.id].recruited || state.characters[item.id].temporary);
  });
}

function drawRosterEntry(ui, state, item, index, cardWidth) {
  var column = index % 3;
  var row = Math.floor(index / 3);
  var x = 56 + column * (cardWidth + 8);
  var y = 94 + row * 66;
  var inParty = state.party.indexOf(item.id) >= 0;
  var isActive = item.id === 'zhangdeng';
  var activeX = x + cardWidth - 98;
  var toggleX = x + cardWidth - 48;
  var cardTone = inParty ? '#ead9af' : ui.theme.colors.panel;

  ui.rect(x, y, cardWidth, 56, cardTone, isActive ? ui.theme.colors.cinnabar : ui.theme.colors.muted);
  ui.portrait(item.id, x + 6, y + 6, 44);
  ui.label(item.name, x + 56, y + 19, 13, ui.theme.colors.ink, 'left', ui.theme.fonts.title);
  ui.label(item.role, x + 56, y + 39, 10, ui.theme.colors.wood, 'left');

  if (inParty) {
    ui.rect(activeX, y + 6, 44, 44, isActive ? ui.theme.colors.gold : ui.theme.colors.jade, ui.theme.colors.wood);
    ui.label(isActive ? '主角' : state.characters[item.id].temporary ? '协作' : '同行', activeX + 22, y + 28, 11, isActive ? ui.theme.colors.ink : ui.theme.colors.paper, 'center');
  } else {
    ui.rect(activeX, y + 6, 44, 44, '#c7b995', ui.theme.colors.muted);
    ui.label('待命', activeX + 22, y + 28, 11, ui.theme.colors.wood, 'center');
  }

  ui.addButton(
    { type: 'partyToggle', id: item.id },
    toggleX,
    y + 6,
    44,
    44,
    isActive ? '固定' : inParty ? '下阵' : '上阵',
    inParty ? ui.theme.colors.panel : ui.theme.colors.gold
  );
}

function drawParty(ui, state) {
  var roster = recruitedRoles(state);
  var cardWidth = Math.floor((ui.width - 128) / 3);
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.rect(40, 28, ui.width - 80, ui.height - 56, ui.theme.colors.paper, ui.theme.colors.wood);
  ui.label('队伍与战斗编成', 60, 56, 20, ui.theme.colors.ink, 'left', ui.theme.fonts.title);
  ui.label('柳掌灯固定带队 · 上阵 ' + state.party.length + ' / 3 · 已招募 ' + roster.length, 258, 56, 11, ui.theme.colors.wood, 'left');
  roster.forEach(function (item, index) {
    drawRosterEntry(ui, state, item, index, cardWidth);
  });
  ui.addButton({ type: 'close' }, ui.width - 134, 38, 78, 44, '完成', ui.theme.colors.panel);
}

function drawTask(ui, state) {
  var quest = state.quest || {};
  var chapter = state.campaign && state.campaign.chapter || 1;
  var chapterDay = state.campaign && state.campaign.chapterDay || 1;
  var worldTime = state.worldTime || {};
  var phaseLabel = { morning: '早上', noon: '中午', evening: '晚上' }[worldTime.phase] || '早上';
  var panelX = 72;
  var panelY = 46;
  var panelWidth = ui.width - 144;
  var panelHeight = ui.height - 92;
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.rect(0, 0, ui.width, ui.height, '#17110ec2');
  drawBookFrame(ui, panelX, panelY, panelWidth, panelHeight);
  ui.roundedRect(panelX + 24, panelY + 22, 76, 30, 3, ui.theme.colors.cinnabar, '#6d2c22');
  ui.label('当前任务', panelX + 62, panelY + 37, 14, ui.theme.colors.paper, 'center', ui.theme.fonts.title);
  ui.label(
    quest.title || '江湖暂歇',
    panelX + 122,
    panelY + 37,
    ui.theme.type.title.size,
    ui.theme.colors.ink,
    'left',
    ui.theme.fonts.title,
    panelWidth - 250
  );
  ui.label(
    '第' + chapter + '章 · 第' + chapterDay + '日 · ' + phaseLabel,
    panelX + 26,
    panelY + 78,
    ui.theme.type.caption.size,
    ui.theme.colors.cinnabar,
    'left'
  );
  ui.label('眼下要做的事', panelX + 26, panelY + 112, ui.theme.type.section.size, ui.theme.colors.ink, 'left', ui.theme.fonts.title);
  ui.paragraph(quest.text || '暂时没有紧迫任务，可以继续在场景中调查和经营客栈。', panelX + 26, panelY + 137, {
    width: panelWidth - 52,
    size: ui.theme.type.body.size,
    lineHeight: ui.theme.type.body.lineHeight,
    maxLines: 4,
    color: ui.theme.colors.wood,
  });
  ui.rect(panelX + 26, panelY + panelHeight - 73, panelWidth - 164, 1, '#9d805566');
  ui.label('关闭后立即恢复自由移动', panelX + 26, panelY + panelHeight - 46, ui.theme.type.caption.size, ui.theme.colors.muted, 'left');
  ui.addButton({ type: 'close' }, panelX + panelWidth - 112, panelY + panelHeight - 66, 86, 44, '收起话本', ui.theme.colors.gold);
}

function drawCookingTrial(ui, state) {
  var active = state.cookingTrial;
  var trial = active && content.cookingTrials && content.cookingTrials[active.id];
  var roleArt = ui.assets.manifest.characters.shiwei;
  var actionImage = roleArt && roleArt.chapterActions ? ui.assets.image(roleArt.chapterActions) : null;
  var actionFrame = active && active.id === 'c11-identify-spice' ? 0 : 1;
  var round;
  if (!active || !trial) return;
  round = trial.rounds[active.round];
  if (!round) return;

  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.rect(48, 34, ui.width - 96, ui.height - 68, ui.theme.colors.paper, ui.theme.colors.wood);
  ui.label(trial.title, 72, 64, 22, ui.theme.colors.cinnabar, 'left', ui.theme.fonts.title);
  ui.label('步骤 ' + (active.round + 1) + ' / ' + trial.rounds.length + ' · 已判断正确 ' + active.score, ui.width - 72, 64, 12, ui.theme.colors.wood, 'right');
  ui.label(trial.description, 72, 96, 13, ui.theme.colors.ink, 'left', null, ui.width - 144);
  ui.rect(72, 118, ui.width - 292, 78, '#ead9af', ui.theme.colors.muted);
  ui.label(round.prompt, 336, 157, 18, ui.theme.colors.ink, 'center', ui.theme.fonts.title, ui.width - 340);
  if (actionImage) {
    ui.ctx.drawImage(actionImage, actionFrame * 240, 0, 240, 320, ui.width - 170, 92, 96, 128);
  } else {
    ui.portrait('shiwei', ui.width - 184, 108, 120);
  }
  round.options.forEach(function (option, index) {
    ui.addButton(
      { type: 'cookingTrialChoice', index: index },
      126 + index * 202,
      222,
      180,
      52,
      option,
      ui.theme.colors.panel
    );
  });
  ui.label('请根据画面与线索主动判断；失误不会卡死剧情，但会影响最终增益。', ui.width / 2, 312, 11, ui.theme.colors.wood, 'center');
}

function drawOverlays(ui, state) {
  if (state.dialogue) drawDialogue(ui, state);
  else if (state.modal && state.modal.type === 'cookingTrial') drawCookingTrial(ui, state);
  else if (state.modal && state.modal.type === 'task') drawTask(ui, state);
  else if (state.modal && state.modal.type === 'party') drawParty(ui, state);
}

module.exports = { drawOverlays: drawOverlays };
