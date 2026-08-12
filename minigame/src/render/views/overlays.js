var content = require('../../../data/content');
var uiArt = require('../ui-art-v29');
var commerce = require('../../world/commerce');

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
  uiArt.drawPanel(ui, 'dialogue', x, y, width, height, { fill: '#f2e2ba', stroke: '#76543a' });
}

function drawChoice(ui, action, x, y, width, title, primary) {
  uiArt.drawSealButton(ui, action, x, y, width, 44, title, {
    primary: primary,
    icon: primary ? 'check' : 'dialogue',
    family: ui.theme.fonts.title,
  });
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
  if (dialogue.speakerArtId && ui.assets.manifest.npcs && ui.assets.manifest.npcs[dialogue.speakerArtId]) {
    var npcPortraitArt = ui.assets.manifest.npcs[dialogue.speakerArtId];
    var npcPortraitImage = ui.assets.image(npcPortraitArt.portrait || npcPortraitArt.atlas || npcPortraitArt.sprite);
    ui.roundedRect(panelX + 15, panelY + 14, portraitSize, portraitSize, 3, '#2b211d', '#b88a4d');
    if (npcPortraitImage) ui.ctx.drawImage(npcPortraitImage, panelX + 19, panelY + 18, portraitSize - 8, portraitSize - 8);
  } else if (speaker) {
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

function roleById(id) {
  var index;
  for (index = 0; index < roles.length; index += 1) {
    if (roles[index].id === id) return roles[index];
  }
  return null;
}

function dialogueImage(ui, id, expression, pose) {
  var art = ui.assets.manifest.characters[id]
    || ui.assets.manifest.npcs && ui.assets.manifest.npcs[id];
  var dialogueArt;
  var path;
  var frame;
  var size;
  if (!art) return null;
  dialogueArt = art.dialogue || {};
  if (dialogueArt.atlas) {
    frame = dialogueArt.poseFrames && dialogueArt.poseFrames[pose];
    if (typeof frame !== 'number') frame = dialogueArt.expressionFrames && dialogueArt.expressionFrames[expression];
    if (typeof frame !== 'number') frame = dialogueArt.bustFrame || 0;
    size = dialogueArt.frameSize || { width: 1, height: 1 };
    return {
      image: ui.assets.image(dialogueArt.atlas),
      sx: frame % (dialogueArt.columns || 1) * size.width,
      sy: Math.floor(frame / (dialogueArt.columns || 1)) * size.height,
      sw: size.width,
      sh: size.height,
    };
  }
  path = dialogueArt.poses && dialogueArt.poses[pose]
    || dialogueArt.expressions && dialogueArt.expressions[expression]
    || dialogueArt.bust
    || art.portrait;
  return path ? { image: ui.assets.image(path) } : null;
}

function drawBust(ui, id, x, y, width, height, active, expression, pose, enterProgress, mirror) {
  var asset = dialogueImage(ui, id, expression, pose);
  var image = asset && asset.image;
  var roleItem = roleById(id);
  var offset = (1 - enterProgress) * (mirror ? 16 : -16);
  var alpha = active ? 1 : 0.58;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha * enterProgress;
  ui.ctx.translate(x + offset, y);
  if (image) {
    if (asset.sw) ui.ctx.drawImage(image, asset.sx, asset.sy, asset.sw, asset.sh, 0, 0, width, height);
    else ui.ctx.drawImage(image, 0, 0, width, height);
  } else if (roleItem) {
    ui.portrait(id, 0, 0, Math.min(width, height));
  }
  ui.ctx.restore();
}

function drawDialoguePanel(ui, x, y, width, height, dramatic) {
  uiArt.drawPanel(ui, 'dialogue', x, y, width, height, {
    fill: dramatic ? '#ead8acfa' : '#f2e3bef5',
    stroke: dramatic ? '#a83c2d' : '#76543a',
    lineWidth: dramatic ? 2 : 1.3,
  });
}

function drawDialogueV2(ui, state) {
  var dialogue = state.dialogue;
  var style = dialogue.presentation || 'standard';
  var dramatic = style === 'dramatic';
  var compact = style === 'bubble';
  var elapsed = Math.max(0, Date.now() - (dialogue.openedAt || Date.now()));
  var enterProgress = Math.min(1, elapsed / 180);
  var ease = 1 - Math.pow(1 - enterProgress, 3);
  var visibleCount = dialogue.revealed ? dialogue.text.length : Math.floor(elapsed / 1000 * 24);
  var complete = visibleCount >= dialogue.text.length;
  var visibleText = complete ? dialogue.text : dialogue.text.slice(0, visibleCount);
  var speakerId = dialogue.speakerId || dialogue.speakerArtId;
  var listenerId = dialogue.listenerId;
  var panelX = compact ? 104 : 20;
  var panelWidth = compact ? ui.width - 208 : ui.width - 40;
  var panelHeight = compact ? 128 : 144;
  var panelY = ui.height - panelHeight - 12 + (1 - ease) * 16;
  var portraitWidth = compact ? 82 : 116;
  var textX = compact ? panelX + 96 : panelX + 140;
  var textWidth = compact ? panelWidth - 112 : panelWidth - 280;
  var lines;
  var choices;
  var columns;
  var choiceWidth;
  var gap = 8;
  var index;

  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.ctx.save();
  ui.ctx.globalAlpha = dramatic ? 0.18 * ease : 0.08 * ease;
  ui.ctx.fillStyle = '#160f0c';
  ui.ctx.fillRect(0, 42, ui.width, ui.height - 42);
  ui.ctx.restore();
  drawDialoguePanel(ui, panelX, panelY, panelWidth, panelHeight, dramatic);

  if (speakerId) {
    drawBust(ui, speakerId, panelX + 10, panelY + (compact ? 15 : 12), portraitWidth, panelHeight - (compact ? 30 : 22), true, dialogue.expression, dialogue.pose, ease, false);
  }
  if (!compact && listenerId) {
    drawBust(ui, listenerId, panelX + panelWidth - 126, panelY + 12, 116, panelHeight - 22, false, 'neutral', 'idle', ease, true);
  }

  ui.roundedRect(textX, panelY + 10, Math.min(120, Math.max(66, dialogue.speaker.length * 16 + 22)), 28, 3, '#a83c2d', '#6d2c22');
  uiArt.drawIcon(ui, 'dialogue', textX + 14, panelY + 24, 12, '#f7e9c7');
  ui.label(dialogue.speaker, textX + 18 + Math.min(102, Math.max(48, dialogue.speaker.length * 16 + 4)) / 2, panelY + 24, 14, '#f7e9c7', 'center', ui.theme.fonts.title);
  ui.ctx.font = '12px ' + ui.theme.fonts.body;
  lines = wrapLines(ui.ctx, visibleText, textWidth, compact ? 2 : 3);
  for (index = 0; index < lines.length; index += 1) {
    ui.label(lines[index], textX, panelY + 52 + index * 18, 12, '#2a211d', 'left', ui.theme.fonts.body, textWidth);
  }

  if (!complete) {
    uiArt.drawIcon(ui, 'hand', textX + textWidth - 76, panelY + panelHeight - 15, 12, '#76543a');
    ui.label('轻触继续', textX + textWidth, panelY + panelHeight - 14, 10, '#76543a', 'right');
    ui.hitArea({ type: 'dialogueReveal' }, panelX, panelY, panelWidth, panelHeight);
    return;
  }

  choices = dialogue.choices || [];
  if (!choices.length) choices = [{ label: '收起话本', action: 'close' }];
  columns = Math.min(3, choices.length);
  choiceWidth = (textWidth - gap * (columns - 1)) / columns;
  choices.forEach(function (choice, choiceIndex) {
    drawChoice(
      ui,
      choice.action === 'close' && dialogue.choices.length === 0
        ? { type: 'close' }
        : { type: 'dialogue', index: choiceIndex },
      textX + (choiceIndex % columns) * (choiceWidth + gap),
      panelY + panelHeight - 47,
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
  var y = 106 + row * 66;
  var inParty = state.party.indexOf(item.id) >= 0;
  var isActive = item.id === 'zhangdeng';
  var activeX = x + cardWidth - 98;
  var toggleX = x + cardWidth - 48;
  var character = state.characters[item.id] || {};

  uiArt.drawPanel(ui, 'card', x, y, cardWidth, 56, {
    fill: inParty ? '#ead9af' : ui.theme.colors.panel,
    stroke: isActive ? ui.theme.colors.cinnabar : ui.theme.colors.muted,
  });
  ui.roundedRect(x + 6, y + 6, 44, 44, 3, '#2b211d', isActive ? ui.theme.colors.cinnabar : ui.theme.colors.gold);
  ui.portrait(item.id, x + 9, y + 9, 38);
  ui.label(item.name, x + 56, y + 17, 13, ui.theme.colors.ink, 'left', ui.theme.fonts.title, Math.max(40, cardWidth - 162));
  uiArt.drawIcon(ui, 'energy', x + 62, y + 38, 11, ui.theme.colors.cinnabar);
  ui.label(String(character.energy == null ? 100 : character.energy), x + 72, y + 38, 9, ui.theme.colors.wood, 'left');
  uiArt.drawIcon(ui, 'mood', x + 101, y + 38, 11, ui.theme.colors.jade);
  ui.label(String(character.mood == null ? 50 : character.mood), x + 112, y + 38, 9, ui.theme.colors.wood, 'left');

  if (inParty) {
    ui.roundedRect(activeX, y + 6, 44, 44, 4, isActive ? ui.theme.colors.gold : ui.theme.colors.jade, ui.theme.colors.wood);
    uiArt.drawIcon(ui, isActive ? 'quest' : 'party', activeX + 22, y + 18, 16, isActive ? ui.theme.colors.ink : ui.theme.colors.paper);
    ui.label(isActive ? '主角' : character.temporary ? '协作' : '同行', activeX + 22, y + 39, 9, isActive ? ui.theme.colors.ink : ui.theme.colors.paper, 'center');
  } else {
    ui.roundedRect(activeX, y + 6, 44, 44, 4, '#c7b995', ui.theme.colors.muted);
    uiArt.drawIcon(ui, 'party', activeX + 22, y + 18, 16, ui.theme.colors.wood);
    ui.label('待命', activeX + 22, y + 39, 9, ui.theme.colors.wood, 'center');
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
  ui.rect(0, 0, ui.width, ui.height, '#17110eb8');
  uiArt.drawPanel(ui, 'dialogue', 40, 42, ui.width - 80, ui.height - 54, { fill: ui.theme.colors.paper });
  uiArt.drawIcon(ui, 'party', 74, 72, 22, ui.theme.colors.cinnabar);
  ui.label('队伍与战斗编成', 94, 72, 20, ui.theme.colors.ink, 'left', ui.theme.fonts.title);
  ui.label(ui.role('zhangdeng').name + '固定带队 · 上阵 ' + state.party.length + ' / 3 · 已招募 ' + roster.length, 278, 72, 11, ui.theme.colors.wood, 'left');
  roster.forEach(function (item, index) {
    drawRosterEntry(ui, state, item, index, cardWidth);
  });
  uiArt.drawSealButton(ui, { type: 'close' }, ui.width - 134, 48, 78, 44, '完成', { icon: 'check', primary: true });
}

function shopRoleTargets(ui, state, modal, store) {
  var roleIds;
  var startX;
  if (store.type === 'goods') return;
  roleIds = commerce.availableRoles(state);
  startX = 390;
  ui.label('试装对象', startX - 12, 78, 10, ui.theme.colors.wood, 'right');
  roleIds.forEach(function (roleId, index) {
    var x = startX + index * 52;
    var selected = modal.roleId === roleId;
    ui.ctx.save();
    ui.ctx.beginPath();
    ui.ctx.arc(x + 22, 78, 20, 0, Math.PI * 2);
    ui.ctx.fillStyle = selected ? ui.theme.colors.cinnabar : '#d5c399';
    ui.ctx.fill();
    ui.ctx.strokeStyle = selected ? ui.theme.colors.gold : ui.theme.colors.muted;
    ui.ctx.lineWidth = selected ? 2 : 1;
    ui.ctx.stroke();
    ui.ctx.clip();
    ui.portrait(roleId, x + 4, 60, 36);
    ui.ctx.restore();
    ui.hitArea({ type: 'shopRole', id: roleId }, x, 56, 44, 44);
  });
}

function shopButtonState(state, modal, definition, unlocked) {
  var owner = commerce.equippedBy(state, definition.id);
  var has = commerce.owned(state, definition.id) > 0;
  if (!unlocked) return { label: '尚未进货', icon: 'lock', disabled: true };
  if (definition.kind === 'supply') return { label: definition.price + ' 文', icon: 'coin', action: { type: 'shopBuy', id: definition.id } };
  if (owner === modal.roleId) return { label: '已装备', icon: 'check', disabled: true };
  if (has) return { label: owner ? '换给此人' : '装备', icon: 'hand', action: { type: 'shopEquip', id: definition.id } };
  return { label: definition.price + ' 文', icon: 'coin', action: { type: 'shopBuy', id: definition.id } };
}

function drawShopItem(ui, state, modal, definition, index) {
  var x = 38 + index * 194;
  var y = 118;
  var width = 184;
  var unlocked = commerce.chapterUnlocked(state, definition);
  var button = shopButtonState(state, modal, definition, unlocked);
  var status = definition.kind === 'equipment' ? commerce.equippedBy(state, definition.id) : null;
  uiArt.drawPanel(ui, 'card', x, y, width, 208, {
    fill: unlocked ? '#ead9aff5' : '#c9bda5ed',
    stroke: status === modal.roleId ? ui.theme.colors.cinnabar : ui.theme.colors.muted,
    shadow: false,
  });
  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.arc(x + width / 2, y + 37, 28, 0, Math.PI * 2);
  ui.ctx.fillStyle = unlocked ? '#2b211d' : '#7f7565';
  ui.ctx.fill();
  ui.ctx.strokeStyle = status === modal.roleId ? ui.theme.colors.cinnabar : ui.theme.colors.gold;
  ui.ctx.lineWidth = status === modal.roleId ? 2.2 : 1.2;
  ui.ctx.stroke();
  ui.ctx.restore();
  uiArt.drawIcon(ui, unlocked ? definition.icon : 'lock', x + width / 2, y + 37, 25, unlocked ? ui.theme.colors.gold : '#d8ccb0');
  ui.label(definition.name, x + width / 2, y + 74, 14, ui.theme.colors.ink, 'center', ui.theme.fonts.title, width - 18);
  ui.paragraph(unlocked ? definition.description : '第 ' + definition.chapter + ' 章后进货', x + width / 2, y + 94, {
    width: width - 28,
    size: 10,
    lineHeight: 15,
    maxLines: 2,
    color: unlocked ? ui.theme.colors.wood : ui.theme.colors.muted,
    align: 'center',
  });
  if (definition.kind === 'equipment' && commerce.owned(state, definition.id)) {
    uiArt.drawStatusChip(ui, status ? 'party' : 'reward', status ? '已由' + ui.role(status).name + '使用' : '已持有', x + 26, y + 134, width - 52, status ? ui.theme.colors.jade : ui.theme.colors.gold, { center: true });
  } else if (definition.kind === 'supply') {
    uiArt.drawStatusChip(ui, 'basket', '当日限购 ' + definition.dailyLimit, x + 30, y + 134, width - 60, ui.theme.colors.jade, { center: true });
  }
  uiArt.drawSealButton(
    ui,
    button.disabled ? { type: 'noop' } : button.action,
    x + 18,
    y + 158,
    width - 36,
    44,
    button.label,
    { icon: button.icon, primary: !button.disabled, disabled: button.disabled }
  );
}

function drawShop(ui, state) {
  var modal = state.modal;
  var store = commerce.data.shops[modal.shopId];
  var coin = Number(state.inventory && state.inventory.coin) || 0;
  if (!store) return;
  commerce.ensure(state);
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  ui.rect(0, 0, ui.width, ui.height, '#17110ed1');
  uiArt.drawPanel(ui, 'dialogue', 20, 28, ui.width - 40, ui.height - 42, { fill: '#f0dfb8', stroke: '#76543a' });
  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.arc(58, 70, 25, 0, Math.PI * 2);
  ui.ctx.fillStyle = '#2b211d';
  ui.ctx.fill();
  ui.ctx.restore();
  uiArt.drawIcon(ui, store.icon, 58, 70, 23, ui.theme.colors.gold);
  ui.roundedRect(86, 52, 292, 50, 3, '#f0dfb8ed');
  ui.label(store.name, 98, 67, 20, ui.theme.colors.cinnabar, 'left', ui.theme.fonts.title, 210);
  ui.label(store.greeting, 98, 90, 10, ui.theme.colors.wood, 'left', ui.theme.fonts.body, 268);
  uiArt.drawStatusChip(ui, 'coin', coin + ' 文', ui.width - 190, 43, 86, ui.theme.colors.gold, { center: true });
  shopRoleTargets(ui, state, modal, store);
  store.items.forEach(function (itemId, index) {
    drawShopItem(ui, state, modal, commerce.data.items[itemId], index);
  });
  uiArt.drawSealButton(ui, { type: 'close' }, ui.width - 90, 43, 52, 44, '', { icon: 'close' });
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
  uiArt.drawIcon(ui, 'quest', panelX + 38, panelY + 37, 14, ui.theme.colors.paper);
  ui.label('当前任务', panelX + 69, panelY + 37, 14, ui.theme.colors.paper, 'center', ui.theme.fonts.title);
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
  uiArt.drawSealButton(ui, { type: 'close' }, panelX + panelWidth - 124, panelY + panelHeight - 66, 98, 44, '收起话本', { icon: 'close' });
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
  uiArt.drawPanel(ui, 'dialogue', 48, 34, ui.width - 96, ui.height - 68, { fill: ui.theme.colors.paper, stroke: ui.theme.colors.wood });
  uiArt.drawIcon(ui, 'pot', 62, 64, 22, ui.theme.colors.cinnabar);
  ui.label(trial.title, 82, 64, 22, ui.theme.colors.cinnabar, 'left', ui.theme.fonts.title);
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
    uiArt.drawSealButton(
      ui,
      { type: 'cookingTrialChoice', index: index },
      126 + index * 202,
      222,
      180,
      52,
      option,
      { icon: 'check', primary: index === 0 }
    );
  });
  ui.label('请根据画面与线索主动判断；失误不会卡死剧情，但会影响最终增益。', ui.width / 2, 312, 11, ui.theme.colors.wood, 'center');
}

function drawOverlays(ui, state) {
  if (state.dialogue) drawDialogueV2(ui, state);
  else if (state.modal && state.modal.type === 'cookingTrial') drawCookingTrial(ui, state);
  else if (state.modal && state.modal.type === 'shop') drawShop(ui, state);
  else if (state.modal && state.modal.type === 'task') drawTask(ui, state);
  else if (state.modal && state.modal.type === 'party') drawParty(ui, state);
}

module.exports = { drawOverlays: drawOverlays };
