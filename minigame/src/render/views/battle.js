var content = require('../../../data/content');
var drawHud = require('./explore').drawHud;
var clamp = require('../../core/math-utils').clamp;

var roles = content.roles;
var battles = content.battles;
var SCENE_TOP = 42;
var lastBattleLog = '';
var battleLogChangedAt = 0;

function role(id) {
  var index;
  for (index = 0; index < roles.length; index += 1) {
    if (roles[index].id === id) return roles[index];
  }
  return roles[0];
}

function unitById(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id && list[index].hp > 0) return list[index];
  }
  return null;
}

function pushPath(paths, path) {
  if (path && paths.indexOf(path) < 0) paths.push(path);
}

function pathsFromRegistration(registration) {
  var paths = [];
  var layers;
  if (!registration) return paths;
  if (typeof registration === 'string') {
    pushPath(paths, registration);
    return paths;
  }
  pushPath(paths, registration.src);
  pushPath(paths, registration.image);
  if (typeof registration.background === 'string') pushPath(paths, registration.background);
  layers = registration.layers ? registration.layers.slice() : [];
  layers.sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });
  layers.forEach(function (layer) {
    pushPath(paths, layer.src);
  });
  return paths;
}

function registeredBackgroundPaths(ui, battle) {
  var manifest = ui.assets.manifest || {};
  var definition = battles[battle.id] || {};
  var backgroundId = battle.background || definition.background;
  var registration = manifest.battles && (manifest.battles[battle.id] || manifest.battles[backgroundId]);
  var paths = pathsFromRegistration(registration);

  if (!paths.length && manifest.backgrounds) {
    paths = pathsFromRegistration(manifest.backgrounds[backgroundId]);
  }
  if (!paths.length && manifest.maps) {
    paths = pathsFromRegistration(manifest.maps[backgroundId]);
  }
  return paths;
}

function drawRegisteredBackground(ui, battle) {
  var drawn = false;
  registeredBackgroundPaths(ui, battle).forEach(function (path) {
    var image = ui.assets.image(path);
    if (!image) return;
    ui.cover(image, 0, SCENE_TOP, ui.width, ui.height - SCENE_TOP);
    drawn = true;
  });
  return drawn;
}

function drawMeter(ui, x, y, width, value, maximum, tone) {
  var ratio = maximum > 0 ? Math.max(0, Math.min(1, value / maximum)) : 0;
  ui.roundedRect(x, y, width, 5, 2.5, '#241d1abf');
  if (ratio > 0) ui.roundedRect(x + 1, y + 1, (width - 2) * ratio, 3, 1.5, tone);
}

function drawCircularPortrait(ui, id, centerX, centerY, radius) {
  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ui.ctx.clip();
  ui.portrait(id, centerX - radius, centerY - radius, radius * 2);
  ui.ctx.restore();
}

function drawPartyToken(ui, unit, index, battle) {
  var item = role(unit.id);
  var x = 42 + index * 72;
  var y = 278;
  var current = battle.turn && battle.turn.side === 'party' && battle.turn.unit === unit;
  var hpRatio = clamp(unit.hp / item.stats[0], 0, 1);
  var qiRatio = clamp(unit.qi / item.stats[1], 0, 1);
  var pulse = current ? 1 + Math.sin(Date.now() / 150) * 0.045 : 1;
  var ringRadius = 28 * pulse;
  var start = Math.PI * 0.72;
  var sweep = Math.PI * 1.56;

  ui.ctx.save();
  if (current) {
    ui.ctx.globalAlpha = 0.2 + (Math.sin(Date.now() / 170) + 1) * 0.1;
    ui.ctx.fillStyle = ui.theme.colors.gold;
    ui.ctx.beginPath();
    ui.ctx.arc(x, y, 34, 0, Math.PI * 2);
    ui.ctx.fill();
  }
  ui.ctx.restore();

  ui.ctx.save();
  ui.ctx.lineCap = 'round';
  ui.ctx.lineWidth = 4;
  ui.ctx.strokeStyle = '#211914d9';
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, ringRadius, start, start + sweep);
  ui.ctx.stroke();
  ui.ctx.strokeStyle = hpRatio > 0.35 ? '#b84b38' : '#d8a347';
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, ringRadius, start, start + sweep * hpRatio);
  ui.ctx.stroke();
  ui.ctx.lineWidth = 2;
  ui.ctx.strokeStyle = '#6ca79a';
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, ringRadius + 4, start, start + sweep * qiRatio);
  ui.ctx.stroke();
  ui.ctx.restore();

  drawCircularPortrait(ui, unit.id, x, y, 22);
  ui.ctx.save();
  ui.ctx.strokeStyle = current ? ui.theme.colors.gold : '#ead7aa';
  ui.ctx.lineWidth = current ? 2 : 1;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, 23, 0, Math.PI * 2);
  ui.ctx.stroke();
  ui.ctx.restore();

  ui.roundedRect(x - 29, y + 31, 58, 18, 3, '#2a201bd9', current ? ui.theme.colors.gold : '#7b664d');
  ui.label(item.name, x, y + 40, 10, ui.theme.colors.paper, 'center', ui.theme.fonts.title, 52);

  ui.roundedRect(x + 15, y - 30, 25, 18, 9, '#2f6f62e8', '#b8d2c7');
  ui.label(unit.qi, x + 27.5, y - 21, 9, ui.theme.colors.paper, 'center');
  if (unit.shield > 0) {
    ui.roundedRect(x - 40, y - 30, 23, 18, 9, '#b88432e8', '#f1d38b');
    drawSkillGlyph(ui, 'shield', x - 28.5, y - 21, 11, ui.theme.colors.paper);
  }
  drawStatusPips(ui, unit, x, y + 56);
  ui.hitArea({ type: 'battleInspect', side: 'party', id: unit.id }, x - 31, y - 35, 62, 82);
}

function drawParty(ui, battle) {
  battle.party.slice(0, 3).forEach(function (unit, index) {
    drawPartyToken(ui, unit, index, battle);
  });
}

function drawEnemies(ui, battle) {
  battle.enemies.forEach(function (enemy, index) {
    var x = ui.width - 226;
    var y = 84 + index * 54;
    var current = battle.turn && battle.turn.side === 'enemy' && battle.turn.unit === enemy;
    var selecting = battle.pendingAction && enemy.hp > 0;
    var warningTarget = battle.warning && battle.warning.targetIds && battle.warning.targetIds.indexOf(enemy.id) >= 0;
    var pulse = current ? 0.75 + (Math.sin(Date.now() / 170) + 1) * 0.125 : 0.78;
    ui.ctx.save();
    ui.ctx.globalAlpha = pulse;
    ui.roundedRect(x + 2, y + 3, 204, 46, 5, '#17110ed9');
    ui.roundedRect(
      x,
      y,
      204,
      46,
      5,
      current ? '#52332ce8' : '#2b211dcc',
      selecting ? ui.theme.colors.cinnabar : current ? ui.theme.colors.gold : '#75624f'
    );
    ui.ctx.restore();
    ui.ctx.save();
    ui.ctx.fillStyle = current ? ui.theme.colors.gold : '#a76a4d';
    ui.ctx.beginPath();
    ui.ctx.arc(x + 22, y + 22, 13, 0, Math.PI * 2);
    ui.ctx.fill();
    ui.ctx.restore();
    drawSkillGlyph(ui, 'damage', x + 22, y + 22, 14, '#2b211d');
    ui.label(enemy.name, x + 43, y + 15, 12, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 104);
    ui.label(enemy.hp + '/' + (enemy.maxHp || enemy.hp), x + 192, y + 15, 10, '#ead7aa', 'right');
    drawMeter(ui, x + 43, y + 29, 149, enemy.hp, enemy.maxHp || enemy.hp, ui.theme.colors.cinnabar);
    drawStatusPips(ui, enemy, x + 192, y + 39);
    if (selecting) {
      ui.label('点选', x + 22, y + 41, 8, '#f0c78e', 'center', ui.theme.fonts.body);
      ui.hitArea({ type: 'battleTarget', id: enemy.id }, x - 4, y - 4, 212, 54);
    } else {
      ui.hitArea({ type: 'battleInspect', side: 'enemy', id: enemy.id }, x - 4, y - 4, 212, 54);
    }
  });
}

function statusEntries(unit) {
  var entries = [];
  if (!unit) return entries;
  if (unit.shield > 0) entries.push({ type: 'shield', label: '护盾 ' + unit.shield });
  if (unit.stun > 0) entries.push({ type: 'stun', label: '眩晕 ' + unit.stun + ' 回合' });
  if (unit.weak > 0) entries.push({ type: 'weaken', label: '削弱 ' + unit.weak });
  if (unit.focus > 0) entries.push({ type: 'focus', label: '蓄势 +' + unit.focus });
  if (unit.taunt > 0) entries.push({ type: 'taunt', label: '护卫 ' + unit.taunt + ' 回合' });
  return entries;
}

function drawStatusPips(ui, unit, x, y) {
  var entries = statusEntries(unit).slice(0, 3);
  entries.forEach(function (entry, index) {
    var px = x + index * 12;
    ui.ctx.save();
    ui.ctx.fillStyle = entry.type === 'stun' ? '#b84939' : entry.type === 'weaken' ? '#755b7a' : '#2f7468';
    ui.ctx.beginPath();
    ui.ctx.arc(px, y, 5, 0, Math.PI * 2);
    ui.ctx.fill();
    ui.ctx.restore();
    drawSkillGlyph(ui, entry.type, px, y, 6, ui.theme.colors.paper);
  });
}

function drawActiveArt(ui, battle) {
  var characters = ui.assets.manifest.characters || {};
  var activeId = battle.turn && battle.turn.side === 'party'
    ? battle.turn.unit.id
    : battle.leaderId || battle.party[0] && battle.party[0].id;
  var art = activeId && characters[activeId];
  var battleImage = art && ui.assets.image(art.battle);
  var height;
  var width;
  if (!battleImage) return;
  height = 236;
  width = battleImage.height ? battleImage.width * height / battleImage.height : 176;
  width = Math.min(208, width);
  ui.ctx.save();
  ui.ctx.globalAlpha = 0.46;
  ui.ctx.translate(356, 74 + Math.sin(Date.now() / 420) * 2);
  ui.ctx.drawImage(battleImage, -width / 2, 0, width, height);
  ui.ctx.restore();
}

function recentEnemyHit(battle, enemyId) {
  var now = Date.now();
  var effects = battle.effects || [];
  var index;
  for (index = effects.length - 1; index >= 0; index -= 1) {
    if (effects[index].targetSide === 'enemy'
      && effects[index].targetId === enemyId
      && effects[index].kind === 'damage'
      && now - effects[index].startedAt < 130) return effects[index];
  }
  return null;
}

function drawEnemyArt(ui, battle) {
  battle.enemies.slice(0, 3).forEach(function (enemy, index) {
    var x;
    var y;
    var height;
    var current;
    var flash;
    var sprite;
    var selecting;
    if (!enemy.artId || enemy.hp <= 0) return;
    x = 466 + index * 70;
    y = 292;
    height = enemy.artId === 'ruffian_heavy' ? 144 : 134;
    current = battle.turn && battle.turn.side === 'enemy' && battle.turn.unit === enemy;
    selecting = battle.pendingAction && enemy.hp > 0;
    flash = recentEnemyHit(battle, enemy.id);
    sprite = {
      id: 'battle-enemy-' + index,
      artId: enemy.artId,
      facing: 'left'
    };
    ui.heroShadow(x, y, height, 1);
    ui.artNpc(sprite, x, y, height, x, y);
    if (flash) {
      ui.ctx.save();
      if ('filter' in ui.ctx) ui.ctx.filter = 'brightness(3.2) saturate(0)';
      ui.ctx.globalCompositeOperation = 'screen';
      ui.ctx.globalAlpha = clamp(1 - (Date.now() - flash.startedAt) / 130, 0, 1);
      ui.artNpc(sprite, x, y, height, x, y);
      ui.ctx.restore();
      ui.ctx.save();
      ui.ctx.globalAlpha = clamp(1 - (Date.now() - flash.startedAt) / 130, 0, 1) * 0.7;
      ui.ctx.strokeStyle = '#fff9df';
      ui.ctx.lineWidth = 3;
      ui.ctx.beginPath();
      ui.ctx.arc(x, y - height * 0.42, height * 0.33, 0, Math.PI * 2);
      ui.ctx.stroke();
      ui.ctx.restore();
    }
    if (current) {
      ui.ctx.save();
      ui.ctx.strokeStyle = ui.theme.colors.gold;
      ui.ctx.lineWidth = 2;
      ui.ctx.beginPath();
      ui.ctx.arc(x, y + 1, 22, 0, Math.PI * 2);
      ui.ctx.stroke();
      ui.ctx.restore();
    }
    if (selecting) {
      ui.ctx.save();
      ui.ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 110) * 0.18;
      ui.ctx.strokeStyle = ui.theme.colors.cinnabar;
      ui.ctx.lineWidth = 2;
      ui.ctx.beginPath();
      ui.ctx.arc(x, y + 1, 29, 0, Math.PI * 2);
      ui.ctx.stroke();
      ui.ctx.restore();
    }
  });
}

function drawEnemyWarning(ui, battle) {
  var warning = battle.warning;
  var source;
  var target;
  var x;
  var width = 264;
  var y = 84;
  var pulse;
  if (!warning || battle.result) return;
  source = unitById(battle.enemies, warning.sourceId);
  target = unitById(battle.party, warning.targetIds && warning.targetIds[0]);
  if (!source || !target) return;
  x = ui.width / 2 - width / 2;
  pulse = 0.78 + (Math.sin(Date.now() / 130) + 1) * 0.11;
  ui.ctx.save();
  ui.ctx.globalAlpha = pulse;
  cutCardPath(ui.ctx, x, y, width, 36, 6);
  ui.ctx.fillStyle = '#341b1ae8';
  ui.ctx.fill();
  ui.ctx.strokeStyle = ui.theme.colors.cinnabar;
  ui.ctx.lineWidth = 1.6;
  ui.ctx.stroke();
  ui.ctx.restore();
  ui.ctx.save();
  ui.ctx.fillStyle = ui.theme.colors.cinnabar;
  ui.ctx.beginPath();
  ui.ctx.arc(x + 17, y + 18, 8, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.restore();
  drawSkillGlyph(ui, warning.style === 'quick' ? 'damageAll' : 'damage', x + 17, y + 18, 10, ui.theme.colors.paper);
  ui.label(source.name + ' · ' + warning.name, x + 32, y + 13, 11, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 145);
  ui.label('锁定 ' + role(target.id).name + ' · 约 ' + warning.estimated, x + 32, y + 27, 9, '#efb89e', 'left', ui.theme.fonts.body, 164);
  ui.label('!', x + width - 17, y + 18, 15, ui.theme.colors.gold, 'center', ui.theme.fonts.title);
}

function drawTargetPrompt(ui, battle) {
  var pending = battle.pendingAction;
  var x;
  var y = 246;
  var width = 210;
  var title;
  if (!pending || battle.result) return;
  title = pending.type === 'attack' ? '选择普通攻击目标' : '选择招式目标';
  x = ui.width / 2 - width / 2;
  cutCardPath(ui.ctx, x, y, width, 32, 5);
  ui.ctx.fillStyle = '#2d1c18e8';
  ui.ctx.fill();
  ui.ctx.strokeStyle = ui.theme.colors.cinnabar;
  ui.ctx.lineWidth = 1.3;
  ui.ctx.stroke();
  ui.label(title, x + 18, y + 16, 11, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 135);
  ui.label('收回', x + 174, y + 16, 10, '#efc983', 'center', ui.theme.fonts.title);
  ui.hitArea({ type: 'battleCancelTarget' }, x + 150, y - 6, 54, 44);
}

function drawStatusDetails(ui, battle) {
  var inspect = battle.inspect;
  var unit;
  var definition;
  var entries;
  var x;
  var y = 94;
  var width = 308;
  var height = 126;
  var warning;
  if (!inspect || battle.result) return;
  unit = unitById(inspect.side === 'enemy' ? battle.enemies : battle.party, inspect.id);
  if (!unit) return;
  definition = inspect.side === 'party' ? role(unit.id) : unit;
  entries = statusEntries(unit);
  warning = battle.warning && battle.warning.targetIds && battle.warning.targetIds.indexOf(unit.id) >= 0 ? battle.warning : null;
  x = ui.width / 2 - width / 2;
  ui.ctx.save();
  ui.ctx.globalAlpha = 0.97;
  cutCardPath(ui.ctx, x, y, width, height, 8);
  ui.ctx.fillStyle = '#241914ed';
  ui.ctx.fill();
  ui.ctx.strokeStyle = inspect.side === 'enemy' ? ui.theme.colors.cinnabar : ui.theme.colors.gold;
  ui.ctx.lineWidth = 1.5;
  ui.ctx.stroke();
  ui.ctx.restore();
  ui.label(definition.name, x + 18, y + 20, 15, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 160);
  ui.label(inspect.side === 'enemy' ? '对手状态' : '队伍状态', x + 18, y + 39, 10, '#c9b996', 'left', ui.theme.fonts.body, 160);
  ui.label('体 ' + unit.hp + '/' + (unit.maxHp || unit.hp), x + 18, y + 63, 11, '#efd7ae', 'left', ui.theme.fonts.body, 100);
  if (inspect.side === 'party') ui.label('气 ' + unit.qi + '/' + role(unit.id).stats[1], x + 118, y + 63, 11, '#9bcabf', 'left', ui.theme.fonts.body, 100);
  else ui.label('攻 ' + unit.atk + ' · 速 ' + unit.speed, x + 118, y + 63, 11, '#e6b17e', 'left', ui.theme.fonts.body, 126);
  ui.label(entries.length ? entries.map(function (entry) { return entry.label; }).join('  ·  ') : '当前没有异常状态', x + 18, y + 87, 10, entries.length ? '#e4c998' : '#aa9a83', 'left', ui.theme.fonts.body, 246);
  if (warning) ui.label('预警：' + warning.name + '，约 ' + warning.estimated + ' 伤害', x + 18, y + 108, 10, '#efad95', 'left', ui.theme.fonts.body, 250);
  else ui.label('点击其他角色可切换查看', x + 18, y + 108, 10, '#9d8b73', 'left', ui.theme.fonts.body, 250);
  ui.roundedRect(x + width - 38, y + 10, 28, 28, 14, '#553228', ui.theme.colors.cinnabar);
  ui.label('×', x + width - 24, y + 24, 18, ui.theme.colors.paper, 'center', ui.theme.fonts.title);
  ui.hitArea({ type: 'battleInspectClose' }, x + width - 46, y + 2, 44, 44);
  ui.hitArea({ type: 'noop' }, x, y, width - 48, height);
}

function drawSkillGlyph(ui, type, x, y, size, color) {
  var ctx = ui.ctx;
  var half = size / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'heal' || type === 'healAll') {
    ctx.beginPath();
    ctx.moveTo(x - half * 0.62, y);
    ctx.lineTo(x + half * 0.62, y);
    ctx.moveTo(x, y - half * 0.62);
    ctx.lineTo(x, y + half * 0.62);
    ctx.stroke();
    if (type === 'healAll') {
      ctx.beginPath();
      ctx.arc(x, y, half * 0.88, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === 'shield' || type === 'taunt' || type === 'defend') {
    ctx.beginPath();
    ctx.moveTo(x, y - half * 0.76);
    ctx.lineTo(x + half * 0.62, y - half * 0.46);
    ctx.lineTo(x + half * 0.48, y + half * 0.35);
    ctx.quadraticCurveTo(x, y + half * 0.82, x - half * 0.48, y + half * 0.35);
    ctx.lineTo(x - half * 0.62, y - half * 0.46);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'focus') {
    ctx.beginPath();
    ctx.arc(x, y, half * 0.7, 0, Math.PI * 2);
    ctx.arc(x, y, half * 0.28, 0, Math.PI * 2);
    ctx.moveTo(x - half, y);
    ctx.lineTo(x - half * 0.55, y);
    ctx.moveTo(x + half * 0.55, y);
    ctx.lineTo(x + half, y);
    ctx.stroke();
  } else if (type === 'stun') {
    ctx.beginPath();
    ctx.moveTo(x, y - half * 0.85);
    ctx.lineTo(x + half * 0.24, y - half * 0.22);
    ctx.lineTo(x + half * 0.82, y);
    ctx.lineTo(x + half * 0.24, y + half * 0.22);
    ctx.lineTo(x, y + half * 0.85);
    ctx.lineTo(x - half * 0.24, y + half * 0.22);
    ctx.lineTo(x - half * 0.82, y);
    ctx.lineTo(x - half * 0.24, y - half * 0.22);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'weaken') {
    ctx.beginPath();
    ctx.arc(x, y - half * 0.08, half * 0.64, Math.PI * 0.12, Math.PI * 1.58);
    ctx.moveTo(x - half * 0.05, y + half * 0.18);
    ctx.lineTo(x + half * 0.54, y + half * 0.78);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - half * 0.72, y + half * 0.65);
    ctx.lineTo(x + half * 0.56, y - half * 0.62);
    ctx.moveTo(x + half * 0.25, y - half * 0.72);
    ctx.lineTo(x + half * 0.68, y - half * 0.3);
    ctx.moveTo(x - half * 0.72, y + half * 0.65);
    ctx.lineTo(x - half * 0.28, y + half * 0.58);
    ctx.stroke();
    if (type === 'damageAll') {
      ctx.beginPath();
      ctx.arc(x, y, half * 0.94, -0.7, 0.72);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function cutCardPath(ctx, x, y, width, height, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function battleArt(ui) {
  return ui.assets.manifest.ui && ui.assets.manifest.ui.battle || {};
}

function drawAtlasSkillIcon(ui, frame, x, y, size, fallbackType, color) {
  var art = battleArt(ui);
  var image = art.iconAtlas && ui.assets.image(art.iconAtlas);
  var frameSize = art.iconFrameSize || { width: 96, height: 96 };
  var columns = art.iconColumns || 5;
  var sourceX;
  var sourceY;
  if (!image || typeof frame !== 'number') {
    drawSkillGlyph(ui, fallbackType, x, y, size * 0.58, color);
    return false;
  }
  sourceX = frame % columns * frameSize.width;
  sourceY = Math.floor(frame / columns) * frameSize.height;
  ui.ctx.drawImage(
    image,
    sourceX,
    sourceY,
    frameSize.width,
    frameSize.height,
    x - size / 2,
    y - size / 2,
    size,
    size
  );
  return true;
}

function drawWheelBackdrop(ui, x, y, width, height) {
  var art = battleArt(ui);
  var image = art.wheel && ui.assets.image(art.wheel);
  var ctx = ui.ctx;
  if (image) {
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.strokeStyle = '#b58a49a8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + width - 62, y + height - 32, 77, Math.PI, Math.PI * 1.72);
  ctx.arc(x + width - 62, y + height - 32, 108, Math.PI, Math.PI * 1.72);
  ctx.stroke();
  ctx.fillStyle = '#241a16a6';
  ctx.beginPath();
  ctx.moveTo(x + 16, y + height);
  ctx.quadraticCurveTo(x + width * 0.62, y - 8, x + width, y + 18);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function effectName(type) {
  var names = {
    damage: '单体伤害',
    damageAll: '群体伤害',
    heal: '单体疗愈',
    healAll: '群体疗愈',
    shield: '护盾',
    taunt: '护卫',
    stun: '控制',
    focus: '蓄势',
    weaken: '削弱',
    defend: '防守回气',
  };
  return names[type] || '战斗招式';
}

function drawActionMedallion(ui, config) {
  var ctx = ui.ctx;
  var action = config.action;
  var pressed = ui.pressed && ui.pressed(action);
  var breath = config.primary ? 1 + Math.sin(Date.now() / 900 * Math.PI * 2) * 0.018 : 1;
  var scale = (pressed ? 0.92 : 1) * breath;
  var radius = config.size / 2;
  var tone = config.tone || ui.theme.colors.gold;
  var iconColor = config.enabled === false ? '#c9c0ae' : ui.theme.colors.paper;
  var common = battleArt(ui).commonIcons || {};
  var frame = typeof config.frame === 'number' ? config.frame : common[config.fallback];

  ctx.save();
  ctx.translate(config.x, config.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = config.enabled === false ? 0.68 : 1;
  ctx.fillStyle = '#17100dd4';
  ctx.beginPath();
  ctx.arc(0, 3, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = config.enabled === false ? '#514c43' : '#2e211a';
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = config.enabled === false ? '#8b8170' : tone;
  ctx.lineWidth = config.primary ? 3 : 2;
  ctx.stroke();
  ctx.strokeStyle = config.enabled === false ? '#71695d' : '#ead49a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
  ctx.stroke();
  drawAtlasSkillIcon(ui, frame, 0, 0, config.size - 13, config.icon, iconColor);
  if (config.enabled === false) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#211a17c2';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ui.theme.colors.cinnabar;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, -Math.PI / 2, Math.PI * 0.55);
    ctx.stroke();
    ctx.fillStyle = ui.theme.colors.cinnabar;
    ctx.beginPath();
    ctx.arc(radius - 5, -radius + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ui.label('!', radius - 5, -radius + 6, 9, ui.theme.colors.paper, 'center', ui.theme.fonts.body);
  }
  if (typeof config.qiCost === 'number') {
    ctx.fillStyle = config.enabled === false ? '#5d2722' : '#1d4742';
    ctx.beginPath();
    ctx.arc(radius - 4, radius - 4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ead49a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ui.label(String(config.qiCost), radius - 4, radius - 4, 9, ui.theme.colors.paper, 'center', ui.theme.fonts.body);
  }
  ctx.restore();
  ui.hitArea(action, config.x - config.hitSize / 2, config.y - config.hitSize / 2, config.hitSize, config.hitSize);
  return pressed;
}

function drawActionTooltip(ui, selected, actor) {
  var width = 248;
  var height = 44;
  var x = ui.width - width - 20;
  var y = 214;
  var detail;
  if (!selected) return;
  detail = selected.qiCost == null
    ? (selected.action.type === 'defend' ? '回气并获得护盾' : '不消耗真气')
    : effectName(selected.icon) + ' · 真气 ' + selected.qiCost + ' / ' + actor.qi;
  ui.ctx.save();
  ui.ctx.globalAlpha = 0.96;
  cutCardPath(ui.ctx, x, y, width, height, 6);
  ui.ctx.fillStyle = '#251b17e8';
  ui.ctx.fill();
  ui.ctx.strokeStyle = selected.enabled === false ? ui.theme.colors.cinnabar : ui.theme.colors.gold;
  ui.ctx.lineWidth = 1.4;
  ui.ctx.stroke();
  ui.ctx.restore();
  ui.label(selected.title, x + 16, y + 15, 13, ui.theme.colors.paper, 'left', ui.theme.fonts.title, width - 30);
  ui.label(detail, x + 16, y + 32, 10, selected.enabled === false ? '#e69b86' : '#c9b996', 'left', ui.theme.fonts.body, width - 30);
}

function drawActions(ui, battle) {
  var actor;
  var item;
  var art;
  var selected = null;
  var attackX;
  var attackY;
  var configs;
  if (battle.result || !battle.turn || battle.turn.side !== 'party') return;
  if (battle.visualLockUntil && Date.now() < battle.visualLockUntil) return;
  actor = battle.turn.unit;
  item = role(actor.id);
  art = ui.assets.manifest.characters[actor.id] || {};
  attackX = ui.width - 64;
  attackY = ui.height - 38;
  drawWheelBackdrop(ui, ui.width - 286, ui.height - 148, 282, 145);
  configs = [{
    action: { type: 'attack' },
    title: '普通攻击',
    icon: 'damage',
    fallback: 'attack',
    frame: battleArt(ui).commonIcons && battleArt(ui).commonIcons.attack,
    x: attackX,
    y: attackY,
    size: 64,
    hitSize: 64,
    primary: true,
    tone: ui.theme.colors.gold,
    enabled: true,
  }];
  item.skills.slice(0, 3).forEach(function (skill, index) {
    var positions = [
      { x: attackX - 192, y: attackY - 4 },
      { x: attackX - 136, y: attackY - 58 },
      { x: attackX - 76, y: attackY - 82 },
    ];
    configs.push({
      action: { type: 'skill', index: index },
      title: skill[0],
      icon: skill[1],
      frame: art.skillIcons && art.skillIcons[index],
      x: positions[index].x,
      y: positions[index].y,
      size: 52,
      hitSize: 56,
      primary: false,
      tone: actor.qi >= skill[2] ? ui.theme.colors.gold : '#847a68',
      enabled: actor.qi >= skill[2],
      qiCost: skill[2],
    });
  });
  configs.push({
    action: { type: 'defend' },
    title: '防守',
    icon: 'defend',
    fallback: 'defend',
    frame: battleArt(ui).commonIcons && battleArt(ui).commonIcons.defend,
    x: ui.width - 30,
    y: attackY - 66,
    size: 52,
    hitSize: 56,
    primary: false,
    tone: ui.theme.colors.jade,
    enabled: true,
  });
  configs.forEach(function (config) {
    if (drawActionMedallion(ui, config)) selected = config;
  });
  drawActionTooltip(ui, selected, actor);
}

function drawTurnSeal(ui, battle) {
  var turn = battle.turn;
  if (battle.result) return;
  var title = turn && turn.side === 'party' ? role(turn.unit.id).name + '行动' : '对手行动';
  var tone = turn && turn.side === 'party' ? ui.theme.colors.gold : ui.theme.colors.cinnabar;
  var width = 98;
  var x = ui.width / 2 - width / 2;
  ui.roundedRect(x, 52, width, 26, 3, '#251b17db', tone);
  ui.ctx.save();
  ui.ctx.fillStyle = tone;
  ui.ctx.beginPath();
  ui.ctx.arc(x + 15, 65, 8, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.restore();
  drawSkillGlyph(ui, turn && turn.side === 'party' ? 'focus' : 'damage', x + 15, 65, 10, '#2b211d');
  ui.label(title, x + 58, 65, 10, ui.theme.colors.paper, 'center', ui.theme.fonts.title, 70);
}

function drawBattleLog(ui, battle) {
  var now = Date.now();
  var progress;
  var offset;
  var alpha;
  var width = 356;
  var x = ui.width / 2 - width / 2;
  if (battle.log !== lastBattleLog) {
    lastBattleLog = battle.log;
    battleLogChangedAt = now;
  }
  progress = clamp((now - battleLogChangedAt) / 240, 0, 1);
  offset = (1 - progress) * 12;
  alpha = 0.72 + progress * 0.28;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  cutCardPath(ui.ctx, x + offset, 294, width, 32, 5);
  ui.ctx.fillStyle = '#251b17d9';
  ui.ctx.fill();
  ui.ctx.strokeStyle = '#8f7557';
  ui.ctx.lineWidth = 1;
  ui.ctx.stroke();
  ui.ctx.restore();
  ui.roundedRect(x + 10 + offset, 301, 19, 19, 9.5, ui.theme.colors.cinnabar);
  drawSkillGlyph(ui, 'damage', x + 19.5 + offset, 310.5, 10, ui.theme.colors.paper);
  ui.label(battle.log, x + 38 + offset, 310, 11, ui.theme.colors.paper, 'left', null, width - 50);
}

function partyEffectPosition(battle, id) {
  var index;
  for (index = 0; index < battle.party.length; index += 1) {
    if (battle.party[index].id === id) return { x: 42 + index * 72, y: 238 };
  }
  return { x: 42, y: 238 };
}

function enemyEffectPosition(battle, id) {
  var index;
  for (index = 0; index < battle.enemies.length; index += 1) {
    if (battle.enemies[index].id === id) return { x: 466 + index * 70, y: 216 };
  }
  return { x: 466, y: 216 };
}

function effectPosition(battle, effect) {
  return effect.targetSide === 'enemy'
    ? enemyEffectPosition(battle, effect.targetId)
    : partyEffectPosition(battle, effect.targetId);
}

function drawSlashEffect(ui, x, y, progress, alpha, allTargets) {
  var sweep = 26 + progress * 28;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.strokeStyle = '#fff1c4';
  ui.ctx.lineWidth = 5 - progress * 2.5;
  ui.ctx.lineCap = 'round';
  ui.ctx.beginPath();
  ui.ctx.moveTo(x - sweep * 0.72, y + sweep * 0.42);
  ui.ctx.lineTo(x + sweep * 0.72, y - sweep * 0.42);
  ui.ctx.stroke();
  ui.ctx.strokeStyle = '#c64f3c';
  ui.ctx.lineWidth = 2;
  ui.ctx.beginPath();
  ui.ctx.moveTo(x - sweep * 0.84, y + sweep * 0.58);
  ui.ctx.lineTo(x + sweep * 0.48, y - sweep * 0.68);
  ui.ctx.stroke();
  if (allTargets) {
    ui.ctx.strokeStyle = '#d7a84a';
    ui.ctx.beginPath();
    ui.ctx.arc(x, y, 20 + progress * 34, -1.2, 1.1);
    ui.ctx.stroke();
  }
  ui.ctx.restore();
}

function drawHealingEffect(ui, x, y, progress, alpha, allTargets) {
  var radius = 12 + progress * 30;
  var index;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.strokeStyle = '#78bda2';
  ui.ctx.lineWidth = 2.5;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, radius, 0, Math.PI * 2);
  ui.ctx.stroke();
  drawSkillGlyph(ui, 'heal', x, y - progress * 12, allTargets ? 24 : 19, '#dff6df');
  for (index = 0; index < 4; index += 1) {
    ui.ctx.fillStyle = '#c9e7b7';
    ui.ctx.beginPath();
    ui.ctx.arc(
      x + Math.cos(index * Math.PI / 2 + progress * 2) * radius,
      y + Math.sin(index * Math.PI / 2 + progress * 2) * radius * 0.55,
      2.5,
      0,
      Math.PI * 2
    );
    ui.ctx.fill();
  }
  ui.ctx.restore();
}

function drawShieldEffect(ui, x, y, progress, alpha) {
  var radius = 19 + Math.sin(progress * Math.PI) * 14;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.strokeStyle = '#8bc7b6';
  ui.ctx.lineWidth = 3;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, radius, Math.PI * 0.82, Math.PI * 2.18);
  ui.ctx.stroke();
  drawSkillGlyph(ui, 'shield', x, y, 22, '#e6f5dc');
  ui.ctx.restore();
}

function drawStatusEffect(ui, type, x, y, progress, alpha) {
  var radius = 10 + progress * 28;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.strokeStyle = type === 'weaken' ? '#bd8bca' : '#e6d06f';
  ui.ctx.lineWidth = 2;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y, radius, 0, Math.PI * 2);
  ui.ctx.stroke();
  drawSkillGlyph(ui, type, x, y - progress * 8, 21, type === 'weaken' ? '#e4bce7' : '#fff0a9');
  ui.ctx.restore();
}

function drawFloatingValue(ui, effect, x, y, progress, alpha) {
  var prefix;
  var tone;
  var value;
  var bounce;
  if (typeof effect.amount !== 'number' || effect.amount <= 0) return;
  prefix = effect.kind === 'heal' ? '+' : '-';
  tone = effect.kind === 'heal' ? '#9fd99c' : '#fff0c5';
  value = prefix + effect.amount;
  bounce = Math.sin(Math.min(1, progress * 2) * Math.PI) * 6;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.translate(x, y - 24 - progress * 34 - bounce);
  ui.ctx.scale(1 + (1 - Math.min(1, progress * 3)) * 0.24, 1 + (1 - Math.min(1, progress * 3)) * 0.24);
  ui.ctx.font = '700 18px ' + ui.theme.fonts.body;
  ui.ctx.textAlign = 'center';
  ui.ctx.textBaseline = 'middle';
  ui.ctx.lineWidth = 3;
  ui.ctx.strokeStyle = '#2a1b17';
  ui.ctx.strokeText(value, 0, 0);
  ui.ctx.fillStyle = tone;
  ui.ctx.fillText(value, 0, 0);
  ui.ctx.restore();
}

function drawMotif(ui, performance, x, y, progress, alpha) {
  var ctx = ui.ctx;
  var motif = performance.motif;
  var palette = performance.palette || ['#fff1c4', '#d7a84a', '#a83c2d'];
  var radius = 16 + progress * 42;
  var index;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = palette[0];
  ctx.fillStyle = palette[1];
  ctx.lineWidth = Math.max(1, 4 - progress * 2);

  if (motif === 'lantern' || motif === 'fire') {
    for (index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.arc(x, y, radius * (0.45 + index * 0.25), Math.PI + progress, Math.PI * 2.2 + progress);
      ctx.stroke();
    }
    for (index = 0; index < 7; index += 1) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(index * 0.9) * radius, y + Math.sin(index * 0.9) * radius * 0.55 - progress * 18, 2.5 + index % 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (motif === 'ledger' || motif === 'contract') {
    ctx.translate(x, y);
    ctx.rotate((progress - 0.5) * 0.18);
    for (index = 0; index < 3; index += 1) {
      ctx.globalAlpha = alpha * (0.78 - index * 0.16);
      ctx.strokeRect(-24 + index * 7, -17 - index * 5, 48, 34);
      ctx.beginPath();
      ctx.moveTo(-17 + index * 7, -7 - index * 5);
      ctx.lineTo(15 + index * 7, -7 - index * 5);
      ctx.moveTo(-17 + index * 7, 2 - index * 5);
      ctx.lineTo(9 + index * 7, 2 - index * 5);
      ctx.stroke();
    }
  } else if (motif === 'abacus') {
    for (index = -1; index <= 1; index += 1) {
      ctx.beginPath();
      ctx.moveTo(x - radius, y + index * 10);
      ctx.lineTo(x + radius, y + index * 10);
      ctx.stroke();
    }
    for (index = 0; index < 7; index += 1) {
      ctx.beginPath();
      ctx.ellipse(x - radius + progress * radius * 2 + index * 8 - 24, y + (index % 3 - 1) * 10, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (motif === 'wind' || motif === 'footwork' || motif === 'acupoint') {
    for (index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(x - 12 + index * 7, y, radius + index * 5, -2.5 + progress, -0.35 + progress);
      ctx.stroke();
    }
    if (motif === 'acupoint') {
      for (index = 0; index < 5; index += 1) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(index * 1.7) * 22, y + Math.sin(index * 1.7) * 30, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (motif === 'palm' || motif === 'impact' || motif === 'guard') {
    ctx.beginPath();
    ctx.arc(x, y, radius, -2.55, 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.68, -2.35, 0.25);
    ctx.stroke();
    for (index = 0; index < 7; index += 1) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(index * 0.9) * radius * 0.65, y + Math.sin(index * 0.9) * radius * 0.45);
      ctx.lineTo(x + Math.cos(index * 0.9) * radius * 1.15, y + Math.sin(index * 0.9) * radius * 0.8);
      ctx.stroke();
    }
  } else if (motif === 'ink' || motif === 'seal') {
    ctx.strokeStyle = palette[2];
    ctx.lineWidth = 5 - progress * 2;
    ctx.beginPath();
    ctx.moveTo(x - radius, y + radius * 0.35);
    ctx.quadraticCurveTo(x - 5, y - radius, x + radius, y - radius * 0.2);
    ctx.stroke();
    if (motif === 'seal') {
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 18, y - 18, 36, 36);
      ctx.strokeRect(x - 11, y - 11, 22, 22);
    }
  } else if (motif === 'steam' || motif === 'spice') {
    for (index = 0; index < 6; index += 1) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(index * 1.3 + progress * 3) * radius * 0.7, y + Math.sin(index * 1.3) * 16 - progress * 34, 3 + index % 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y + 13, radius * 0.72, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAtlasVfx(ui, performance, x, y, elapsed, alpha) {
  var image;
  var frameSize = performance.frameSize;
  var phases = [
    { id: 'anticipation', end: performance.anticipation },
    { id: 'active', end: performance.anticipation + performance.active },
    { id: 'impact', end: performance.anticipation + performance.active + performance.impact },
    { id: 'recovery', end: performance.duration },
  ];
  var previousEnd = 0;
  var phase;
  var frames;
  var localProgress;
  var frame;
  var index;
  var columns;
  var displayScale;
  if (!performance.atlas || !frameSize) return false;
  image = ui.assets.image(performance.atlas);
  if (!image) return false;
  for (index = 0; index < phases.length; index += 1) {
    if (elapsed <= phases[index].end) {
      phase = phases[index];
      break;
    }
    previousEnd = phases[index].end;
  }
  if (!phase) return false;
  frames = performance.frames && performance.frames[phase.id] || [];
  if (!frames.length) return false;
  localProgress = clamp((elapsed - previousEnd) / Math.max(1, phase.end - previousEnd), 0, 0.999);
  frame = frames[Math.floor(localProgress * frames.length)];
  columns = performance.atlasColumns || 1;
  displayScale = performance.displayScale || 1;
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.drawImage(
    image,
    frame % columns * frameSize.width,
    Math.floor(frame / columns) * frameSize.height,
    frameSize.width,
    frameSize.height,
    x - frameSize.width * displayScale / 2,
    y - frameSize.height * displayScale / 2,
    frameSize.width * displayScale,
    frameSize.height * displayScale
  );
  ui.ctx.restore();
  return true;
}

function drawSkillCutIn(ui, performance, elapsed) {
  var art;
  var image;
  var progress;
  var alpha;
  var x;
  if (!performance.cutIn || elapsed < 0 || elapsed > 420) return;
  progress = clamp(elapsed / 420, 0, 1);
  alpha = progress < 0.2 ? progress / 0.2 : clamp((1 - progress) / 0.22, 0, 1);
  art = ui.assets.manifest.characters[performance.roleId] || {};
  image = ui.assets.image(art.skillCutIn || art.battlePortrait || art.battle || art.portrait);
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.fillStyle = '#17110ee8';
  ui.ctx.fillRect(0, 94, ui.width, 116);
  ui.ctx.fillStyle = performance.palette[2];
  ui.ctx.fillRect(0, 94, 7, 116);
  ui.ctx.fillRect(ui.width - 7, 94, 7, 116);
  x = 50 - (1 - Math.min(1, progress * 4)) * 28;
  if (image) ui.ctx.drawImage(image, x, 87, 132, 132);
  ui.label(performance.skillName, 208, 139, 22, '#f7e9c7', 'left', ui.theme.fonts.title, 360);
  ui.label('绝技 · 气势展开', 210, 172, 11, performance.palette[0], 'left', ui.theme.fonts.body);
  ui.ctx.restore();
}

function drawSkillPerformance(ui, battle) {
  var performance = battle.performance;
  var elapsed;
  var progress;
  var alpha;
  var position;
  if (!performance) return;
  elapsed = Date.now() - performance.startedAt;
  if (elapsed < 0 || elapsed > performance.duration) return;
  progress = clamp(elapsed / performance.duration, 0, 1);
  alpha = progress < 0.12 ? progress / 0.12 : clamp((1 - progress) / 0.2, 0, 1);
  position = performance.targetId
    ? enemyEffectPosition(battle, performance.targetId)
    : partyEffectPosition(battle, performance.roleId);
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha * 0.12;
  ui.ctx.fillStyle = performance.screenTint;
  ui.ctx.fillRect(0, SCENE_TOP, ui.width, ui.height - SCENE_TOP);
  ui.ctx.restore();
  if (!drawAtlasVfx(ui, performance, position.x, position.y, elapsed, alpha)) {
    drawMotif(ui, performance, position.x, position.y, progress, alpha);
  }
  drawSkillCutIn(ui, performance, elapsed);
}

function battleShake(battle) {
  var performance = battle.performance;
  var distance;
  var strength;
  if (!performance || !performance.cameraShake) return { x: 0, y: 0 };
  distance = Math.abs(Date.now() - performance.impactAt);
  if (distance > 110) return { x: 0, y: 0 };
  strength = performance.cameraShake * (1 - distance / 110);
  return {
    x: Math.sin(Date.now() * 0.31) * strength,
    y: Math.cos(Date.now() * 0.27) * strength * 0.55,
  };
}

function drawBattleEffects(ui, battle) {
  var now = Date.now();
  var effects = battle.effects || [];
  var index;
  var effect;
  var elapsed;
  var progress;
  var alpha;
  var floatProgress;
  var floatAlpha;
  var position;
  for (index = 0; index < effects.length; index += 1) {
    effect = effects[index];
    elapsed = now - effect.startedAt;
    if (elapsed < 0 || elapsed > effect.duration) continue;
    progress = clamp(elapsed / effect.duration, 0, 1);
    alpha = progress < 0.15 ? progress / 0.15 : clamp((1 - progress) / 0.28, 0, 1);
    position = effectPosition(battle, effect);
    if (effect.kind === 'damage') {
      drawSlashEffect(ui, position.x, position.y, progress, alpha, effect.skillType === 'damageAll');
    } else if (effect.kind === 'heal') {
      drawHealingEffect(ui, position.x, position.y, progress, alpha, effect.skillType === 'healAll');
    } else if (effect.kind === 'shield') {
      drawShieldEffect(ui, position.x, position.y, progress, alpha);
    } else {
      drawStatusEffect(ui, effect.skillType, position.x, position.y, progress, alpha);
    }
    floatProgress = clamp(elapsed / (effect.floatDuration || 480), 0, 1);
    floatAlpha = floatProgress < 0.12 ? floatProgress / 0.12 : clamp((1 - floatProgress) / 0.32, 0, 1);
    drawFloatingValue(ui, effect, position.x, position.y, floatProgress, floatAlpha);
  }
}

function rewardItems(result) {
  var reward = result.reward || {};
  var items = [];
  if (reward.coin) items.push({ type: 'coin', name: '银两', value: reward.coin });
  if (reward.ingredient) items.push({ type: 'ingredient', name: '食材', value: reward.ingredient });
  if (reward.medicine) items.push({ type: 'medicine', name: '药材', value: reward.medicine });
  if (reward.reputation) items.push({ type: 'reputation', name: '口碑', value: reward.reputation });
  return items;
}

function drawRewardGlyph(ui, type, x, y, color) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  if (type === 'coin') {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'ingredient') {
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.quadraticCurveTo(x - 8, y, x - 3, y - 7);
    ctx.quadraticCurveTo(x + 7, y - 4, x, y + 7);
    ctx.stroke();
  } else if (type === 'medicine') {
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
  } else {
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function battleGrade(battle) {
  var maximum = 0;
  var current = 0;
  if (battle.result && battle.result.grade) return battle.result.grade;
  (battle.party || []).forEach(function (unit) {
    maximum += unit.maxHp || 1;
    current += Math.max(0, unit.hp || 0);
  });
  if (!maximum || current / maximum >= 0.9) return { grade: 'S', label: '全员平安' };
  if (current / maximum >= 0.68) return { grade: 'A', label: '稳胜归店' };
  if (current / maximum >= 0.42) return { grade: 'B', label: '有惊无险' };
  return { grade: 'C', label: '险守此程' };
}

function drawLedgerFallback(ui, x, y, width, height) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.fillStyle = '#4b3021';
  cutCardPath(ctx, x - 5, y + 7, width + 10, height, 11);
  ctx.fill();
  ctx.fillStyle = '#efe0ba';
  cutCardPath(ctx, x, y, width / 2 - 3, height - 8, 9);
  ctx.fill();
  cutCardPath(ctx, x + width / 2 + 3, y, width / 2 - 3, height - 8, 9);
  ctx.fill();
  ctx.strokeStyle = '#8c6946';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#6a432b';
  ctx.fillRect(x + width / 2 - 4, y + 4, 8, height - 8);
  ctx.fillStyle = '#7b5538';
  ctx.fillRect(x + 16, y + height - 28, width - 32, 18);
  ctx.strokeStyle = '#c49b55';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 28, y + height - 19);
  ctx.lineTo(x + width - 28, y + height - 19);
  ctx.stroke();
  ctx.restore();
}

function drawVictoryButton(ui, x, y, progress) {
  var action = { type: 'battleContinue' };
  var pressed = ui.pressed && ui.pressed(action);
  var scale = pressed ? 0.92 : 1;
  ui.ctx.save();
  ui.ctx.globalAlpha = progress;
  ui.ctx.translate(x, y);
  ui.ctx.scale(scale, scale);
  ui.ctx.fillStyle = '#43281f';
  ui.ctx.beginPath();
  ui.ctx.arc(0, 3, 28, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.fillStyle = ui.theme.colors.cinnabar;
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.strokeStyle = '#f0d18c';
  ui.ctx.lineWidth = 2;
  ui.ctx.stroke();
  ui.ctx.strokeRect(-19, -19, 38, 38);
  ui.label('归账', 0, 0, 13, ui.theme.colors.paper, 'center', ui.theme.fonts.title);
  ui.ctx.restore();
  if (progress >= 0.95) ui.hitArea(action, x - 30, y - 30, 60, 60);
}

function drawVictoryOverlay(ui, battle) {
  var result = battle.result;
  var elapsed = Date.now() - result.startedAt;
  var dimProgress = clamp(elapsed / 160, 0, 1);
  var bookProgress = clamp((elapsed - 120) / 360, 0, 1);
  var stampProgress = clamp((elapsed - 430) / 180, 0, 1);
  var rewardProgress = clamp((elapsed - 560) / 480, 0, 1);
  var buttonProgress = clamp((elapsed - 900) / 120, 0, 1);
  var bookEase = 1 - Math.pow(1 - bookProgress, 3);
  var stampEase = 1 - Math.pow(1 - stampProgress, 3);
  var art = battleArt(ui);
  var ledger = art.ledger && ui.assets.image(art.ledger);
  var width = 470;
  var height = 224;
  var x = ui.width / 2 - width / 2;
  var y = 82;
  var grade = battleGrade(battle);
  var links = result.links || {};
  var items = rewardItems(result);
  var rewardSlots = [x + 265, x + 312, x + 359, x + 406];
  var rewardOffset = Math.max(0, Math.floor((4 - items.length) / 2));
  var index;
  var value;

  ui.ctx.save();
  ui.ctx.globalAlpha = 0.76 * dimProgress;
  ui.ctx.fillStyle = '#130d0b';
  ui.ctx.fillRect(0, SCENE_TOP, ui.width, ui.height - SCENE_TOP);
  ui.ctx.restore();

  if (elapsed < 900) {
    ui.hitArea({ type: 'battleSkipSettlement' }, 0, SCENE_TOP, ui.width, ui.height - SCENE_TOP);
  }

  ui.ctx.save();
  ui.ctx.translate(ui.width / 2, y + height / 2);
  ui.ctx.scale(0.82 + bookEase * 0.18, 0.1 + bookEase * 0.9);
  ui.ctx.translate(-ui.width / 2, -(y + height / 2));
  ui.ctx.globalAlpha = bookProgress;
  if (ledger) ui.ctx.drawImage(ledger, x, y, width, height);
  else drawLedgerFallback(ui, x, y, width, height);
  ui.ctx.restore();

  if (bookProgress < 0.72) return;

  ui.label('战果入账', x + 121, y + 34, 18, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title);
  ui.label('长风客栈 · 江湖行记', x + 349, y + 32, 11, '#6c563f', 'center', ui.theme.fonts.title);

  ui.ctx.save();
  ui.ctx.globalAlpha = stampProgress;
  ui.ctx.translate(x + 90, y + 145);
  ui.ctx.scale(0.68 + stampEase * 0.32, 0.68 + stampEase * 0.32);
  ui.ctx.rotate((1 - stampEase) * -0.12);
  ui.ctx.strokeStyle = ui.theme.colors.cinnabar;
  ui.ctx.fillStyle = '#b4433420';
  ui.ctx.lineWidth = 3;
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.stroke();
  ui.label(grade.grade, 0, -2, 28, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title);
  ui.ctx.restore();
  ui.label(grade.label, x + 162, y + 132, 12, '#4f3a2b', 'center', ui.theme.fonts.title, 92);
  ui.label('第 ' + (links.chapter || 1) + ' 章 · 战绩 ' + grade.score, x + 162, y + 153, 9, '#7b654e', 'center', ui.theme.fonts.body, 106);
  if (links.relationships && links.relationships.length) {
    ui.label(
      '同行默契 ' + links.relationships.map(function (entry) { return role(entry.id).name + '+' + entry.gain; }).join(' '),
      x + 162,
      y + 171,
      9,
      '#8a5f39',
      'center',
      ui.theme.fonts.body,
      120
    );
  }

  for (index = 0; index < items.length; index += 1) {
    value = Math.round(items[index].value * rewardProgress);
    ui.ctx.save();
    ui.ctx.globalAlpha = rewardProgress;
    drawRewardGlyph(
      ui,
      items[index].type,
      rewardSlots[index + rewardOffset],
      y + 158,
      '#7c5230'
    );
    ui.label(
      items[index].name,
      rewardSlots[index + rewardOffset],
      y + 92,
      9,
      '#765a3e',
      'center',
      ui.theme.fonts.body
    );
    ui.label(
      '+' + value,
      rewardSlots[index + rewardOffset],
      y + 111,
      13,
      ui.theme.colors.cinnabar,
      'center',
      ui.theme.fonts.title
    );
    ui.ctx.restore();
  }

  ui.label('拨珠归账', x + 349, y + 128, 10, '#765a3e', 'center', ui.theme.fonts.body);
  if (links.rareDrop) {
    drawRewardGlyph(ui, 'rare', x + 253, y + 57, '#a94d39');
    ui.label('稀有：' + links.rareDrop.name, x + 348, y + 57, 10, '#8a4d35', 'center', ui.theme.fonts.title, 182);
  }
  drawVictoryButton(ui, x + width / 2, y + height - 28, buttonProgress);
}

function drawBattle(ui, state) {
  var battle = state.battle;
  var hasBackground;
  var shake;
  if (!battle) return;

  ui.rect(0, 0, ui.width, ui.height, '#243136');
  hasBackground = drawRegisteredBackground(ui, battle);
  if (hasBackground) ui.rect(0, SCENE_TOP, ui.width, ui.height - SCENE_TOP, '#18202252');
  drawHud(ui, state);
  ui.label(battle.title, 18, 64, 16, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 230);
  drawTurnSeal(ui, battle);
  shake = battleShake(battle);
  ui.ctx.save();
  ui.ctx.translate(shake.x, shake.y);
  drawActiveArt(ui, battle);
  drawEnemyArt(ui, battle);
  drawParty(ui, battle);
  drawEnemies(ui, battle);
  ui.ctx.restore();
  drawEnemyWarning(ui, battle);
  drawSkillPerformance(ui, battle);
  drawBattleEffects(ui, battle);
  drawBattleLog(ui, battle);
  drawActions(ui, battle);
  drawTargetPrompt(ui, battle);
  drawStatusDetails(ui, battle);
  if (battle.result && battle.result.status === 'victory') drawVictoryOverlay(ui, battle);
}

module.exports = { drawBattle: drawBattle };
