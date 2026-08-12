var clamp = require('../../core/math-utils').clamp;

function progressOf(active) {
  return clamp((Date.now() - active.startedAt) / Math.max(1, active.duration), 0, 1);
}

function drawDoor(ui, active, progress) {
  var peak = progress < active.switchAt
    ? progress / active.switchAt
    : (1 - progress) / (1 - active.switchAt);
  var width = ui.width * 0.52 * clamp(peak, 0, 1);
  ui.ctx.save();
  ui.ctx.fillStyle = '#211611';
  ui.ctx.fillRect(0, 0, width, ui.height);
  ui.ctx.fillRect(ui.width - width, 0, width, ui.height);
  ui.ctx.strokeStyle = '#a7773e';
  ui.ctx.lineWidth = 2;
  ui.ctx.beginPath();
  ui.ctx.moveTo(width, 0);
  ui.ctx.lineTo(width, ui.height);
  ui.ctx.moveTo(ui.width - width, 0);
  ui.ctx.lineTo(ui.width - width, ui.height);
  ui.ctx.stroke();
  ui.ctx.restore();
}

function drawInkPan(ui, active, progress) {
  var peak = progress < active.switchAt
    ? progress / active.switchAt
    : (1 - progress) / (1 - active.switchAt);
  var direction = active.direction === 'left' ? -1 : 1;
  var edge = direction > 0 ? ui.width * peak : ui.width * (1 - peak);
  var index;
  ui.ctx.save();
  ui.ctx.fillStyle = '#17110e';
  if (direction > 0) ui.ctx.fillRect(0, 0, edge, ui.height);
  else ui.ctx.fillRect(edge, 0, ui.width - edge, ui.height);
  ui.ctx.globalAlpha = 0.58;
  for (index = 0; index < 7; index += 1) {
    ui.ctx.fillRect(edge - direction * (8 + index * 7), index * 61 - 18, direction * 42, 48 + index % 2 * 18);
  }
  ui.ctx.restore();
}

function drawRoute(ui, active, progress) {
  var peak = progress < active.switchAt
    ? progress / active.switchAt
    : (1 - progress) / (1 - active.switchAt);
  var alpha = clamp(peak, 0, 1);
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.fillStyle = '#211711';
  ui.ctx.fillRect(0, 0, ui.width, ui.height);
  ui.roundedRect(186, 92, 472, 206, 6, '#ead8ac', '#8a6541');
  ui.ctx.strokeStyle = '#a83c2d';
  ui.ctx.lineWidth = 3;
  ui.ctx.beginPath();
  ui.ctx.moveTo(246, 222);
  ui.ctx.bezierCurveTo(340, 126, 468, 270, 598, 156);
  ui.ctx.stroke();
  ui.ctx.fillStyle = '#a83c2d';
  [246, 392, 598].forEach(function (x, index) {
    ui.ctx.beginPath();
    ui.ctx.arc(x, index === 0 ? 222 : index === 1 ? 194 : 156, 8, 0, Math.PI * 2);
    ui.ctx.fill();
  });
  ui.label('商路行程', ui.width / 2, 126, 20, '#2a211d', 'center', ui.theme.fonts.title);
  ui.ctx.restore();
}

function drawBattleBrush(ui, active, progress) {
  var entering = active.kind === 'battle-enter';
  var peak = entering ? 1 - progress : progress;
  var width = ui.width * clamp(peak, 0, 1);
  ui.ctx.save();
  ui.ctx.fillStyle = '#17110e';
  ui.ctx.fillRect(0, 0, width, ui.height);
  ui.ctx.fillStyle = '#a83c2d';
  ui.ctx.globalAlpha = 0.82;
  ui.ctx.fillRect(Math.max(0, width - 18), 0, 12, ui.height);
  ui.ctx.restore();
}

function drawTransitions(ui, state) {
  var active = state.sceneTransition || state.visualTransition;
  var progress;
  if (!active) return;
  progress = progressOf(active);
  if (active.kind === 'door') drawDoor(ui, active, progress);
  else if (active.kind === 'ink-pan') drawInkPan(ui, active, progress);
  else if (active.kind === 'route') drawRoute(ui, active, progress);
  else drawBattleBrush(ui, active, progress);
  ui.hitArea({ type: 'noop' }, 0, 0, ui.width, ui.height);
  if (progress >= 1 && state.visualTransition === active) state.visualTransition = null;
}

module.exports = { drawTransitions: drawTransitions };
