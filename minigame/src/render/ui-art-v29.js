'use strict';

var ICON_ALIASES = {
  crisis: 'dialogue',
  mechanism: 'investigate',
  interact: 'hand',
  inn: 'door',
  counter: 'abacus',
  kitchen: 'pot',
  supply: 'basket',
  hall: 'broom',
  rooms: 'key',
  notice: 'quest',
  yard: 'hammer',
  episode: 'relationship',
  goods: 'shop',
  armory: 'weapon',
  jewelry: 'jewel',
};

function framePath(ui, kind) {
  var presentation = ui.assets.manifest.ui && ui.assets.manifest.ui.presentation || {};
  return presentation[kind];
}

function cutPath(ctx, x, y, width, height, cut) {
  var c = Math.max(3, cut || 7);
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
}

function drawPanel(ui, kind, x, y, width, height, options) {
  var config = options || {};
  var path = framePath(ui, kind);
  var image = path ? ui.assets.image(path) : null;
  var ctx = ui.ctx;
  ctx.save();
  if (config.shadow !== false) {
    cutPath(ctx, x + 4, y + 5, width, height, config.cut);
    ctx.fillStyle = config.shadowColor || '#160f0ca8';
    ctx.fill();
  }
  if (image) {
    ctx.globalAlpha = config.alpha == null ? 1 : config.alpha;
    ctx.drawImage(image, x, y, width, height);
  } else {
    cutPath(ctx, x, y, width, height, config.cut);
    ctx.fillStyle = config.fill || '#f2e2b9f5';
    ctx.fill();
    ctx.strokeStyle = config.stroke || '#76543a';
    ctx.lineWidth = config.lineWidth || 1.5;
    ctx.stroke();
    cutPath(ctx, x + 7, y + 7, width - 14, height - 14, Math.max(3, (config.cut || 7) - 2));
    ctx.strokeStyle = config.innerStroke || '#b39765';
    ctx.globalAlpha = 0.42;
    ctx.stroke();
  }
  ctx.restore();
  return { x: x, y: y, width: width, height: height, ready: !!image };
}

function iconPath(ctx, name, size) {
  var half = size / 2;
  var q = size / 4;
  var type = ICON_ALIASES[name] || name;
  if (type === 'dialogue') {
    ctx.roundRect ? ctx.roundRect(-half * 0.75, -half * 0.52, size * 0.98, size * 0.68, size * 0.12) : ctx.rect(-half * 0.75, -half * 0.52, size * 0.98, size * 0.68);
    ctx.moveTo(-half * 0.18, half * 0.16); ctx.lineTo(-half * 0.38, half * 0.52); ctx.lineTo(half * 0.02, half * 0.2);
  } else if (type === 'investigate') {
    ctx.arc(-size * 0.09, -size * 0.09, size * 0.27, 0, Math.PI * 2);
    ctx.moveTo(size * 0.12, size * 0.12); ctx.lineTo(size * 0.38, size * 0.38);
  } else if (type === 'battle') {
    ctx.moveTo(-half * 0.62, -half * 0.55); ctx.lineTo(half * 0.62, half * 0.55);
    ctx.moveTo(half * 0.62, -half * 0.55); ctx.lineTo(-half * 0.62, half * 0.55);
    ctx.moveTo(-half * 0.48, half * 0.3); ctx.lineTo(-half * 0.68, half * 0.54);
    ctx.moveTo(half * 0.48, half * 0.3); ctx.lineTo(half * 0.68, half * 0.54);
  } else if (type === 'door' || type === 'exit') {
    ctx.rect(-half * 0.55, -half * 0.68, size * 0.72, size * 1.18);
    ctx.moveTo(-half * 0.05, 0); ctx.lineTo(half * 0.62, 0);
    ctx.moveTo(half * 0.35, -q); ctx.lineTo(half * 0.62, 0); ctx.lineTo(half * 0.35, q);
  } else if (type === 'quest') {
    ctx.moveTo(-half * 0.48, -half * 0.62); ctx.quadraticCurveTo(-half * 0.72, -half * 0.62, -half * 0.72, -half * 0.38);
    ctx.lineTo(-half * 0.72, half * 0.48); ctx.quadraticCurveTo(-half * 0.48, half * 0.72, -half * 0.22, half * 0.48);
    ctx.lineTo(half * 0.45, half * 0.48); ctx.lineTo(half * 0.45, -half * 0.62); ctx.closePath();
    ctx.moveTo(-half * 0.4, -q); ctx.lineTo(half * 0.18, -q);
    ctx.moveTo(-half * 0.4, q * 0.15); ctx.lineTo(half * 0.18, q * 0.15);
  } else if (type === 'lock') {
    ctx.rect(-half * 0.52, -half * 0.02, size * 1.04, size * 0.62);
    ctx.moveTo(-half * 0.34, -half * 0.02); ctx.arc(0, -half * 0.02, half * 0.34, Math.PI, 0);
  } else if (type === 'complete' || type === 'check') {
    ctx.moveTo(-half * 0.62, 0); ctx.lineTo(-half * 0.16, half * 0.48); ctx.lineTo(half * 0.68, -half * 0.52);
  } else if (type === 'warning') {
    ctx.moveTo(0, -half * 0.72); ctx.lineTo(half * 0.7, half * 0.62); ctx.lineTo(-half * 0.7, half * 0.62); ctx.closePath();
    ctx.moveTo(0, -half * 0.28); ctx.lineTo(0, half * 0.16);
    ctx.moveTo(0, half * 0.38); ctx.lineTo(0, half * 0.4);
  } else if (type === 'reward') {
    ctx.rect(-half * 0.58, -half * 0.06, size * 1.16, size * 0.66);
    ctx.rect(-half * 0.68, -half * 0.32, size * 1.36, size * 0.3);
    ctx.moveTo(0, -half * 0.34); ctx.lineTo(0, half * 0.6);
    ctx.moveTo(0, -half * 0.34); ctx.quadraticCurveTo(-half * 0.55, -half * 0.75, -half * 0.38, -half * 0.12);
    ctx.moveTo(0, -half * 0.34); ctx.quadraticCurveTo(half * 0.55, -half * 0.75, half * 0.38, -half * 0.12);
  } else if (type === 'relationship') {
    ctx.arc(-q * 0.6, 0, q * 0.66, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.moveTo(q * 0.02, -q * 0.45); ctx.arc(q * 0.6, 0, q * 0.66, -Math.PI * 0.72, Math.PI * 0.72);
  } else if (type === 'party') {
    ctx.arc(-q * 0.72, -q * 0.45, q * 0.43, 0, Math.PI * 2);
    ctx.arc(q * 0.72, -q * 0.45, q * 0.43, 0, Math.PI * 2);
    ctx.arc(-q * 0.72, q * 1.05, q * 0.72, Math.PI, 0);
    ctx.arc(q * 0.72, q * 1.05, q * 0.72, Math.PI, 0);
  } else if (type === 'energy' || type === 'flame') {
    ctx.moveTo(0, half * 0.68); ctx.bezierCurveTo(-half * 0.72, half * 0.32, -half * 0.46, -half * 0.32, 0, -half * 0.72);
    ctx.bezierCurveTo(half * 0.04, -half * 0.22, half * 0.7, -half * 0.08, half * 0.48, half * 0.42);
    ctx.quadraticCurveTo(half * 0.28, half * 0.72, 0, half * 0.68); ctx.closePath();
  } else if (type === 'mood') {
    ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2);
    ctx.moveTo(-q, -q * 0.45); ctx.lineTo(-q * 0.95, -q * 0.44);
    ctx.moveTo(q, -q * 0.45); ctx.lineTo(q * 0.95, -q * 0.44);
    ctx.moveTo(-q, q * 0.45); ctx.quadraticCurveTo(0, q * 1.2, q, q * 0.45);
  } else if (type === 'key') {
    ctx.arc(-q * 0.9, -q * 0.15, q * 0.65, 0, Math.PI * 2);
    ctx.moveTo(-q * 0.25, -q * 0.15); ctx.lineTo(half * 0.72, half * 0.64);
    ctx.moveTo(q * 0.85, q * 0.42); ctx.lineTo(q * 1.08, q * 0.12);
  } else if (type === 'abacus') {
    ctx.rect(-half * 0.68, -half * 0.55, size * 1.36, size * 1.1);
    ctx.moveTo(-half * 0.55, -q * 0.35); ctx.lineTo(half * 0.55, -q * 0.35);
    ctx.moveTo(-half * 0.55, q * 0.35); ctx.lineTo(half * 0.55, q * 0.35);
    [-0.34, 0, 0.34].forEach(function (offset) { ctx.moveTo(size * offset, -half * 0.47); ctx.lineTo(size * offset, half * 0.47); });
  } else if (type === 'pot') {
    ctx.moveTo(-half * 0.58, -q * 0.1); ctx.quadraticCurveTo(-half * 0.5, half * 0.62, 0, half * 0.62);
    ctx.quadraticCurveTo(half * 0.5, half * 0.62, half * 0.58, -q * 0.1);
    ctx.moveTo(-half * 0.7, -q * 0.1); ctx.lineTo(half * 0.7, -q * 0.1);
    ctx.moveTo(-q, -q * 0.42); ctx.quadraticCurveTo(0, -half * 0.8, q, -q * 0.42);
  } else if (type === 'basket') {
    ctx.moveTo(-half * 0.62, -q * 0.12); ctx.lineTo(-half * 0.45, half * 0.58); ctx.lineTo(half * 0.45, half * 0.58); ctx.lineTo(half * 0.62, -q * 0.12); ctx.closePath();
    ctx.moveTo(-q * 0.9, -q * 0.12); ctx.arc(0, -q * 0.12, q * 0.9, Math.PI, 0);
  } else if (type === 'hammer') {
    ctx.moveTo(-q * 0.9, -half * 0.6); ctx.lineTo(q * 0.45, -half * 0.6); ctx.lineTo(q * 0.72, -q * 0.1); ctx.lineTo(-q * 0.62, -q * 0.1); ctx.closePath();
    ctx.moveTo(0, -q * 0.1); ctx.lineTo(half * 0.55, half * 0.7);
  } else if (type === 'broom') {
    ctx.moveTo(-half * 0.5, half * 0.6); ctx.lineTo(half * 0.5, -half * 0.66);
    ctx.moveTo(-half * 0.62, half * 0.55); ctx.quadraticCurveTo(-q * 0.2, half * 0.05, q * 0.4, half * 0.62); ctx.closePath();
  } else if (type === 'hand') {
    ctx.moveTo(-half * 0.55, half * 0.5); ctx.lineTo(-half * 0.55, 0); ctx.quadraticCurveTo(-half * 0.45, -q * 0.4, -q * 0.2, 0);
    ctx.lineTo(-q * 0.2, -half * 0.65); ctx.quadraticCurveTo(0, -half * 0.84, q * 0.14, -half * 0.58);
    ctx.lineTo(q * 0.14, -q * 0.08); ctx.lineTo(half * 0.65, q * 0.12); ctx.lineTo(half * 0.42, half * 0.6); ctx.closePath();
  } else if (type === 'shop') {
    ctx.moveTo(-half * 0.72, -q * 0.12); ctx.lineTo(-half * 0.54, -half * 0.64); ctx.lineTo(half * 0.54, -half * 0.64); ctx.lineTo(half * 0.72, -q * 0.12);
    ctx.moveTo(-half * 0.66, -q * 0.12); ctx.quadraticCurveTo(-half * 0.46, q * 0.2, -q * 0.45, -q * 0.12);
    ctx.quadraticCurveTo(0, q * 0.2, q * 0.45, -q * 0.12); ctx.quadraticCurveTo(half * 0.46, q * 0.2, half * 0.66, -q * 0.12);
    ctx.rect(-half * 0.55, q * 0.12, size * 1.1, size * 0.5);
  } else if (type === 'jewel') {
    ctx.moveTo(-half * 0.62, -q * 0.18); ctx.lineTo(-q * 0.25, -half * 0.62); ctx.lineTo(q * 0.25, -half * 0.62); ctx.lineTo(half * 0.62, -q * 0.18);
    ctx.lineTo(0, half * 0.68); ctx.closePath();
    ctx.moveTo(-half * 0.62, -q * 0.18); ctx.lineTo(half * 0.62, -q * 0.18); ctx.moveTo(-q * 0.25, -half * 0.62); ctx.lineTo(0, half * 0.68); ctx.lineTo(q * 0.25, -half * 0.62);
  } else if (type === 'weapon') {
    ctx.moveTo(-half * 0.58, half * 0.6); ctx.lineTo(half * 0.34, -half * 0.52); ctx.lineTo(half * 0.68, -half * 0.7); ctx.lineTo(half * 0.52, -half * 0.34); ctx.lineTo(-half * 0.48, half * 0.54);
    ctx.moveTo(-half * 0.66, half * 0.26); ctx.lineTo(-half * 0.2, half * 0.68);
  } else if (type === 'coin') {
    ctx.arc(0, 0, half * 0.7, 0, Math.PI * 2); ctx.rect(-q * 0.38, -q * 0.38, q * 0.76, q * 0.76);
  } else if (type === 'medicine') {
    ctx.rect(-half * 0.48, -q * 0.35, size * 0.96, size * 0.96); ctx.rect(-q * 0.3, -half * 0.65, q * 0.6, q * 0.3);
    ctx.moveTo(-q * 0.3, q * 0.12); ctx.lineTo(q * 0.3, q * 0.12); ctx.moveTo(0, -q * 0.18); ctx.lineTo(0, q * 0.42);
  } else if (type === 'tea') {
    ctx.moveTo(-half * 0.58, -q * 0.12); ctx.lineTo(-half * 0.42, half * 0.5); ctx.lineTo(half * 0.35, half * 0.5); ctx.lineTo(half * 0.5, -q * 0.12); ctx.closePath();
    ctx.moveTo(half * 0.5, 0); ctx.arc(half * 0.55, q * 0.16, q * 0.34, -Math.PI / 2, Math.PI / 2);
    ctx.moveTo(-q * 0.2, -q * 0.35); ctx.quadraticCurveTo(-q * 0.45, -half * 0.72, -q * 0.1, -half * 0.76);
    ctx.moveTo(q * 0.2, -q * 0.35); ctx.quadraticCurveTo(q * 0.45, -half * 0.72, q * 0.1, -half * 0.76);
  } else if (type === 'bell') {
    ctx.moveTo(-half * 0.54, half * 0.34); ctx.quadraticCurveTo(-half * 0.35, -half * 0.5, 0, -half * 0.58);
    ctx.quadraticCurveTo(half * 0.35, -half * 0.5, half * 0.54, half * 0.34); ctx.closePath(); ctx.arc(0, half * 0.48, q * 0.18, 0, Math.PI * 2);
  } else if (type === 'back') {
    ctx.moveTo(half * 0.55, -half * 0.62); ctx.lineTo(-half * 0.36, 0); ctx.lineTo(half * 0.55, half * 0.62);
  } else if (type === 'close') {
    ctx.moveTo(-half * 0.58, -half * 0.58); ctx.lineTo(half * 0.58, half * 0.58);
    ctx.moveTo(half * 0.58, -half * 0.58); ctx.lineTo(-half * 0.58, half * 0.58);
  } else {
    ctx.moveTo(0, -half * 0.72); ctx.lineTo(half * 0.62, 0); ctx.lineTo(0, half * 0.72); ctx.lineTo(-half * 0.62, 0); ctx.closePath();
  }
}

function drawIcon(ui, name, x, y, size, color, options) {
  var config = options || {};
  var ctx = ui.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  iconPath(ctx, name, size);
  ctx.strokeStyle = color || ui.theme.colors.ink;
  ctx.fillStyle = config.fill || 'transparent';
  ctx.lineWidth = config.lineWidth || Math.max(1.4, size * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (config.fill && config.fill !== 'transparent') ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSealButton(ui, action, x, y, width, height, label, options) {
  var config = options || {};
  var pressed = ui.pressed && ui.pressed(action);
  var offset = pressed ? 2 : 0;
  var primary = !!config.primary;
  var disabled = !!config.disabled;
  var fill = disabled ? '#c8bda4' : primary ? '#a83c2d' : '#ead7aa';
  var stroke = disabled ? '#978c75' : primary ? '#6d2c22' : '#76543a';
  var text = disabled ? '#766e60' : primary ? '#f7e9c7' : '#2a211d';
  var iconSize = Math.min(18, height * 0.36);
  var hitWidth = Math.max(44, width);
  var hitHeight = Math.max(44, height);
  var textX = x + width / 2;
  var textWidth = width - 18;
  if (!pressed) {
    cutPath(ui.ctx, x, y + 3, width, height, 6);
    ui.ctx.fillStyle = '#4b33266b';
    ui.ctx.fill();
  }
  cutPath(ui.ctx, x, y + offset, width, height, 6);
  ui.ctx.fillStyle = fill;
  ui.ctx.fill();
  ui.ctx.strokeStyle = stroke;
  ui.ctx.lineWidth = 1.2;
  ui.ctx.stroke();
  if (config.icon) {
    drawIcon(ui, config.icon, x + 18, y + height / 2 + offset, iconSize, text);
    textX += 9;
    textWidth -= 30;
  }
  ui.label(label, textX, y + height / 2 + offset, config.size || 12, text, 'center', config.family || ui.theme.fonts.body, textWidth);
  ui.hitArea(action, x - (hitWidth - width) / 2, y - (hitHeight - height) / 2, hitWidth, hitHeight);
}

function drawStatusChip(ui, icon, label, x, y, width, tone, options) {
  var config = options || {};
  var iconX = x + 16;
  var labelX = x + 30;
  ui.roundedRect(x, y, width, 28, 4, '#2b211de8', tone || ui.theme.colors.gold);
  if (config.center) {
    ui.ctx.font = '10px ' + ui.theme.fonts.body;
    var textWidth = Math.min(width - 38, ui.ctx.measureText(String(label)).width);
    var groupWidth = 14 + 8 + textWidth;
    iconX = x + (width - groupWidth) / 2 + 7;
    labelX = iconX + 15;
  }
  drawIcon(ui, icon, iconX, y + 14, 14, tone || ui.theme.colors.gold);
  ui.label(label, labelX, y + 14, 10, ui.theme.colors.paper, 'left', ui.theme.fonts.body, width - (labelX - x) - 8);
}

function drawPortraitFrame(ui, roleId, x, y, width, height, options) {
  var config = options || {};
  drawPanel(ui, 'portrait', x, y, width, height, { shadow: config.shadow !== false, fill: '#ead9af' });
  ui.portrait(roleId, x + width * 0.13, y + height * 0.1, Math.min(width * 0.74, height * 0.68));
  if (config.label) {
    ui.label(config.label, x + width / 2, y + height * 0.88, config.labelSize || 11, '#f7e9c7', 'center', ui.theme.fonts.title, width * 0.68);
  }
}

module.exports = {
  drawPanel: drawPanel,
  drawIcon: drawIcon,
  drawSealButton: drawSealButton,
  drawStatusChip: drawStatusChip,
  drawPortraitFrame: drawPortraitFrame,
  aliases: ICON_ALIASES,
};
