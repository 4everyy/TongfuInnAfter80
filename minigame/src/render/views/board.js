'use strict';

var definition = require('../../../data/board-v1');

var TYPE_COLORS = {
  landmark: '#c7963f',
  property: '#e4cf9f',
  npc: '#a94b38',
  event: '#8b6b50',
  supply: '#4e8064',
  battle: '#873a30',
  chance: '#3f7780',
  rest: '#74677a',
};

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function phaseLabel(phase) {
  return phase === 'morning' ? '早上' : phase === 'evening' ? '晚上' : '中午';
}

function easeOut(value) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function boardPosition(board) {
  var current = definition.tile(board.tileId);
  var previous;
  var progress;
  if (!board.moving || board.rollingUntil || !board.lastTileId || board.lastTileId === board.tileId) return { x: current.x, y: current.y };
  previous = definition.tile(board.lastTileId);
  progress = clamp(1 - (Number(board.nextStepAt) - Date.now()) / 180, 0, 1);
  return {
    x: previous.x + (current.x - previous.x) * progress,
    y: previous.y + (current.y - previous.y) * progress,
  };
}

function camera(ui, board) {
  var point = boardPosition(board);
  return {
    x: clamp(point.x - ui.width * 0.50, 0, Math.max(0, definition.world.width - ui.width)),
    y: clamp(point.y - 205, 0, Math.max(0, definition.world.height - ui.height + 34)),
  };
}

function screenPoint(tile, view) {
  return { x: tile.x - view.x, y: tile.y - view.y + 24 };
}

function visible(point, ui, padding) {
  var gap = padding || 60;
  return point.x >= -gap && point.x <= ui.width + gap && point.y >= 38 - gap && point.y <= ui.height + gap;
}

function roundedPath(ctx, x, y, width, height, radius) {
  var r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawParchment(ui, view) {
  var ctx = ui.ctx;
  var gradient = ctx.createLinearGradient(0, 44, 0, ui.height);
  gradient.addColorStop(0, '#e5d8b1');
  gradient.addColorStop(0.55, '#d8c89b');
  gradient.addColorStop(1, '#bba978');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 44, ui.width, ui.height - 44);
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#735d43';
  ctx.lineWidth = 0.7;
  for (var row = -1; row < 14; row += 1) {
    var y = 54 + row * 29 - (view.y % 29);
    ctx.beginPath();
    for (var x = -20; x <= ui.width + 20; x += 24) {
      var waveY = y + Math.sin((x + view.x) * 0.018 + row) * 2;
      if (x === -20) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWuxiaBackdrop(ui, view) {
  var ctx = ui.ctx;
  var boardArt = ui.assets.manifest.board || {};
  var image = boardArt.background && ui.assets.image(boardArt.background);
  var top = 46;
  var height = ui.height - top;
  var targetRatio = ui.width / height;
  var sourceWidth;
  var sourceHeight;
  var maximumX;
  var maximumY;
  var cameraX;
  var cameraY;
  var wash;
  if (!image || !image.width || !image.height) {
    drawParchment(ui, view);
    return;
  }

  sourceWidth = image.width * 0.89;
  sourceHeight = sourceWidth / targetRatio;
  if (sourceHeight > image.height) {
    sourceHeight = image.height;
    sourceWidth = sourceHeight * targetRatio;
  }
  maximumX = Math.max(0, image.width - sourceWidth);
  maximumY = Math.max(0, image.height - sourceHeight);
  cameraX = maximumX * clamp(view.x / Math.max(1, definition.world.width - ui.width), 0, 1);
  cameraY = maximumY * clamp(view.y / Math.max(1, definition.world.height - ui.height), 0, 1);

  ctx.drawImage(image, cameraX, cameraY, sourceWidth, sourceHeight, 0, top, ui.width, height);

  // A mineral-pigment wash preserves route readability without hiding the landscape.
  wash = ctx.createLinearGradient(0, top, 0, ui.height);
  wash.addColorStop(0, '#f4e3b94a');
  wash.addColorStop(0.48, '#e8d39b24');
  wash.addColorStop(1, '#49342154');
  ctx.fillStyle = wash;
  ctx.fillRect(0, top, ui.width, height);

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#f8e8b8';
  ctx.lineWidth = 1;
  for (var band = 0; band < 4; band += 1) {
    var y = top + 64 + band * 82 - (view.y % 36) * 0.12;
    ctx.beginPath();
    for (var x = -40; x <= ui.width + 40; x += 28) {
      var mistY = y + Math.sin((x + view.x * 0.08) * 0.018 + band) * 7;
      if (x === -40) ctx.moveTo(x, mistY);
      else ctx.lineTo(x, mistY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function regionPath(ctx, x, y, width, height, seed) {
  var points = [];
  var count = 16;
  var index;
  for (index = 0; index < count; index += 1) {
    var angle = Math.PI * 2 * index / count;
    var wobble = 1 + Math.sin(index * 2.71 + seed * 1.37) * 0.045;
    points.push({
      x: x + width / 2 + Math.cos(angle) * width / 2 * wobble,
      y: y + height / 2 + Math.sin(angle) * height / 2 * wobble,
    });
  }
  ctx.beginPath();
  points.forEach(function (point, pointIndex) {
    var next = points[(pointIndex + 1) % points.length];
    var middleX = (point.x + next.x) / 2;
    var middleY = (point.y + next.y) / 2;
    if (pointIndex === 0) ctx.moveTo(middleX, middleY);
    ctx.quadraticCurveTo(next.x, next.y, middleX, middleY);
  });
  ctx.closePath();
}

function drawRoof(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ead8ad';
  ctx.fillRect(-18 * scale, -2 * scale, 36 * scale, 23 * scale);
  ctx.fillStyle = color || '#5e4333';
  ctx.beginPath();
  ctx.moveTo(-25 * scale, 0);
  ctx.quadraticCurveTo(0, -15 * scale, 25 * scale, 0);
  ctx.lineTo(19 * scale, 5 * scale);
  ctx.quadraticCurveTo(0, -5 * scale, -19 * scale, 5 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9d3f2f';
  ctx.fillRect(-4 * scale, 8 * scale, 8 * scale, 13 * scale);
  ctx.restore();
}

function drawMountain(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-42 * scale, 22 * scale);
  ctx.lineTo(-8 * scale, -30 * scale);
  ctx.lineTo(10 * scale, -5 * scale);
  ctx.lineTo(29 * scale, -24 * scale);
  ctx.lineTo(52 * scale, 22 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#3f4639';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawWater(ctx, x, y, width, color) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = color || '#386f73';
  ctx.lineWidth = 2;
  for (var line = 0; line < 4; line += 1) {
    ctx.beginPath();
    for (var step = 0; step <= width; step += 18) {
      var py = y + line * 10 + Math.sin(step * 0.08 + line) * 3;
      if (step === 0) ctx.moveTo(x + step, py);
      else ctx.lineTo(x + step, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTree(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#76563a99';
  ctx.fillRect(-2 * scale, 0, 4 * scale, 15 * scale);
  ctx.fillStyle = '#55705aaa';
  [-9, 0, 9].forEach(function (offset, index) {
    ctx.beginPath();
    ctx.arc(offset * scale, (-5 - Math.abs(index - 1) * 2) * scale, (10 - Math.abs(index - 1)) * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawRegionMotif(ui, region, x, y, width, height) {
  var ctx = ui.ctx;
  var id = region.id;
  if (id === 'outer-road-ring' || id === 'paper-ring') {
    drawMountain(ctx, x + width * 0.32, y + height * 0.08, 1.05, region.color);
    drawMountain(ctx, x + width * 0.68, y + height * 0.13, 0.78, region.color);
  }
  if (id === 'canal-ring' || id === 'jiangnan-ring' || id === 'spice-ring') {
    drawWater(ctx, x + width * 0.14, y + height * 0.10, width * 0.70, region.color);
  }
  if (id === 'inn-ring' || id === 'east-gate-ring' || id === 'guild-ring' || id === 'alliance-ring') {
    drawRoof(ctx, x + width * 0.34, y + height * 0.08, 1.04, region.color);
    drawRoof(ctx, x + width * 0.66, y + height * 0.13, 0.76, region.color);
  }
  drawTree(ctx, x + width * 0.20, y + height * 0.11, 0.88);
  drawTree(ctx, x + width * 0.79, y + height * 0.08, 0.76);
}

function drawRegion(ui, region, view, index) {
  var ctx = ui.ctx;
  var width = definition.regionSize.width + 128;
  var height = definition.regionSize.height + 128;
  var x = region.center.x - width / 2 - view.x;
  var y = region.center.y - height / 2 - view.y + 24;
  var gradient;
  if (x > ui.width + 60 || x + width < -60 || y > ui.height + 60 || y + height < -20) return;
  ctx.save();
  regionPath(ctx, x, y, width, height, index + 1);
  gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, region.color + '34');
  gradient.addColorStop(0.52, '#f0e1b628');
  gradient.addColorStop(1, region.color + '18');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = '#efe0b3';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  drawRegionMotif(ui, region, x, y, width, height);

  ctx.save();
  ctx.translate(x + 238, y + 20);
  ctx.fillStyle = '#392a23c9';
  ctx.fillRect(4, 4, 152, 30);
  ctx.fillStyle = region.color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(160, 0);
  ctx.lineTo(151, 30);
  ctx.lineTo(0, 30);
  ctx.closePath();
  ctx.fill();
  ui.label(region.name, 78, 15, 13, '#fff1cc', 'center', ui.theme.fonts.title, 142);
  ctx.restore();
}

function drawRoads(ui, view) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  definition.tiles.forEach(function (tile) {
    var from = screenPoint(tile, view);
    if (!visible(from, ui, 240)) return;
    (tile.next || []).forEach(function (targetId, index) {
      var to = screenPoint(definition.tile(targetId), view);
      if (!visible(to, ui, 240)) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = index === 0 ? '#241812d9' : '#6e2f29d0';
      ctx.lineWidth = index === 0 ? 13 : 9;
      if (ctx.setLineDash) ctx.setLineDash(index === 0 ? [] : [7, 7]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = index === 0 ? '#d8bc79' : '#d39a4f';
      ctx.lineWidth = index === 0 ? 7 : 4;
      ctx.stroke();
      if (index === 0) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#62492f99';
        ctx.lineWidth = 1.2;
        if (ctx.setLineDash) ctx.setLineDash([2, 9]);
        ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
      }
    });
  });
  if (ctx.setLineDash) ctx.setLineDash([]);
  ctx.restore();
}

function drawTileIcon(ctx, type, x, y, scale, light) {
  var color = light ? '#fff2ce' : '#392b25';
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, scale * 1.4);
  ctx.lineCap = 'round';
  if (type === 'landmark') {
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -2 * scale);
    ctx.quadraticCurveTo(0, -10 * scale, 10 * scale, -2 * scale);
    ctx.lineTo(7 * scale, 1 * scale);
    ctx.lineTo(-7 * scale, 1 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeRect(-6 * scale, 1 * scale, 12 * scale, 9 * scale);
  } else if (type === 'property') {
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -4 * scale);
    ctx.lineTo(8 * scale, -4 * scale);
    ctx.lineTo(6 * scale, 0);
    ctx.lineTo(-6 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeRect(-6 * scale, 0, 12 * scale, 8 * scale);
  } else if (type === 'npc') {
    ctx.beginPath();
    ctx.arc(0, -4 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 6 * scale, 7 * scale, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'event') {
    ctx.strokeRect(-7 * scale, -8 * scale, 14 * scale, 16 * scale);
    ctx.beginPath();
    ctx.moveTo(-4 * scale, -3 * scale);
    ctx.lineTo(4 * scale, -3 * scale);
    ctx.moveTo(-4 * scale, 2 * scale);
    ctx.lineTo(3 * scale, 2 * scale);
    ctx.stroke();
  } else if (type === 'supply') {
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -1 * scale);
    ctx.lineTo(-6 * scale, 8 * scale);
    ctx.lineTo(6 * scale, 8 * scale);
    ctx.lineTo(8 * scale, -1 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 6 * scale, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'battle') {
    ctx.beginPath();
    ctx.moveTo(-7 * scale, -8 * scale);
    ctx.lineTo(7 * scale, 8 * scale);
    ctx.moveTo(7 * scale, -8 * scale);
    ctx.lineTo(-7 * scale, 8 * scale);
    ctx.stroke();
  } else if (type === 'chance') {
    ctx.beginPath();
    ctx.arc(0, 1 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 1 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-7 * scale, 1 * scale);
    ctx.quadraticCurveTo(0, 7 * scale, 7 * scale, 1 * scale);
    ctx.moveTo(8 * scale, -4 * scale);
    ctx.lineTo(11 * scale, -1 * scale);
    ctx.lineTo(8 * scale, 2 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTile(ui, board, tile, view, current) {
  var ctx = ui.ctx;
  var point = screenPoint(tile, view);
  var property = board.owned[tile.id];
  var discovered = !!board.discovered[tile.id];
  var active = current.id === tile.id;
  var radius = tile.type === 'landmark' ? 23 : 17;
  var fill = discovered ? TYPE_COLORS[tile.type] : '#8f8778';
  var pulse;
  if (!visible(point, ui, 54)) return;
  if (property) fill = property.owner === 'player' ? '#3f7860' : property.owner === 'rival-a' ? '#4e756c' : '#a44e3e';
  ctx.save();
  if (tile.type === 'landmark') drawRoof(ctx, point.x, point.y - 19, 0.56, discovered ? definition.region(tile.regionId).color : '#746c61');
  if (active) {
    pulse = 0.5 + Math.sin(Date.now() / 190) * 0.5;
    ctx.globalAlpha = 0.18 + pulse * 0.12;
    ctx.fillStyle = '#ffd875';
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = '#36271f';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + radius * 0.52, radius * 0.92, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = discovered ? 1 : 0.62;
  ctx.fillStyle = '#d9b766';
  ctx.beginPath();
  for (var side = 0; side < 8; side += 1) {
    var angle = -Math.PI / 8 + side * Math.PI / 4;
    var px = point.x + Math.cos(angle) * (radius + 3);
    var py = point.y + Math.sin(angle) * (radius + 3);
    if (side === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? '#fff0b8' : '#4b382c';
  ctx.lineWidth = active ? 2.6 : 1.4;
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#fff4d0';
  ctx.beginPath();
  ctx.arc(point.x - 2, point.y - 2, radius - 4, Math.PI * 1.05, Math.PI * 1.82);
  ctx.stroke();
  ctx.globalAlpha = 1;
  drawTileIcon(ctx, tile.type, point.x, point.y, tile.type === 'landmark' ? 1 : 0.78, tile.type !== 'property' || !!property);
  if (property && property.level > 1) {
    ctx.fillStyle = '#f7e7bd';
    ctx.beginPath();
    ctx.arc(point.x + radius - 1, point.y - radius + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ui.label(String(property.level), point.x + radius - 1, point.y - radius + 2, 8, '#4a3327', 'center', ui.theme.fonts.body);
  }
  ctx.restore();
  if (tile.type === 'landmark' && discovered) {
    ctx.save();
    ctx.fillStyle = '#2d211bc7';
    roundedPath(ctx, point.x - 46, point.y + 29, 92, 18, 2);
    ctx.fill();
    ctx.restore();
    ui.label(tile.label, point.x, point.y + 38, 9, '#f9eac5', 'center', ui.theme.fonts.title, 84);
  }
}

function drawWorld(ui, state, view) {
  var board = state.board;
  var current = definition.tile(board.tileId);
  drawWuxiaBackdrop(ui, view);
  definition.regions.forEach(function (region, index) { drawRegion(ui, region, view, index); });
  drawRoads(ui, view);
  definition.tiles.forEach(function (tile) { drawTile(ui, board, tile, view, current); });
}

function drawActors(ui, state, view) {
  var board = state.board;
  var heroPoint = boardPosition(board);
  var previousTile = board.lastTileId && definition.tile(board.lastTileId);
  var currentTile = definition.tile(board.tileId);
  var heroFacing = previousTile && board.moving && !board.rollingUntil
    ? Math.abs(currentTile.y - previousTile.y) > Math.abs(currentTile.x - previousTile.x)
      ? currentTile.y < previousTile.y ? 'up' : 'down'
      : currentTile.x < previousTile.x ? 'left' : 'right'
    : 'right';
  var actors = board.rivals.map(function (rival) {
    return { type: 'npc', id: rival.id, artId: rival.artId, point: screenPoint(definition.tile(rival.tileId), view), color: rival.color, name: rival.name };
  });
  actors.push({ type: 'hero', id: 'player', roleId: 'zhangdeng', point: { x: heroPoint.x - view.x, y: heroPoint.y - view.y + 24 }, facing: heroFacing, name: '佟湘玉' });
  actors.sort(function (left, right) { return left.point.y - right.point.y; });
  actors.forEach(function (actor) {
    var x = actor.point.x;
    var y = actor.point.y - 12;
    if (!visible(actor.point, ui, 90)) return;
    ui.heroShadow(x, y, actor.type === 'hero' ? 78 : 62, 0.72, 0.14);
    if (actor.type === 'hero') {
      if (!ui.artHero(actor.roleId, x, y, 84, actor.facing, !!board.moving && !board.rollingUntil, heroPoint.x, heroPoint.y, board.moving && !board.rollingUntil ? 'walk' : 'idle', 'board:' + actor.id)) {
        ui.fallbackHero(actor.roleId, x, y, 84, actor.facing);
      }
    } else if (!ui.artNpc({ id: actor.id, artId: actor.artId, name: actor.name, facing: 'right' }, x, y, 64, x, y)) {
      ui.fallbackNpc({ name: actor.name, color: actor.color }, x, y, 64);
    }
    ctxTag(ui, actor.name, x, y + 13, actor.type === 'hero' ? '#a83c2d' : actor.color);
  });
}

function ctxTag(ui, text, x, y, color) {
  ui.ctx.save();
  ui.ctx.fillStyle = '#2c211bd9';
  roundedPath(ui.ctx, x - 33, y - 8, 66, 17, 2);
  ui.ctx.fill();
  ui.ctx.fillStyle = color;
  ui.ctx.fillRect(x - 33, y - 8, 3, 17);
  ui.ctx.restore();
  ui.label(text, x + 2, y, 9, '#f7e9c7', 'center', ui.theme.fonts.body, 58);
}

function drawResource(ui, x, y, type, value, color) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.fillStyle = '#4a352bc4';
  roundedPath(ctx, x, y, 51, 25, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  if (type === 'coin') ctx.ellipse(x + 13, y + 13, 8, 5, -0.2, 0, Math.PI * 2);
  else if (type === 'food') {
    ctx.moveTo(x + 7, y + 10);
    ctx.lineTo(x + 19, y + 10);
    ctx.lineTo(x + 17, y + 19);
    ctx.lineTo(x + 9, y + 19);
    ctx.closePath();
  } else {
    ctx.moveTo(x + 13, y + 5);
    ctx.lineTo(x + 20, y + 12);
    ctx.lineTo(x + 13, y + 20);
    ctx.lineTo(x + 6, y + 12);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
  ui.label(String(value), x + 29, y + 13, 10, '#f7e9c7', 'center', ui.theme.fonts.body, 35);
}

function drawTopHud(ui, state) {
  var board = state.board;
  var right = ui.width - (ui.safe ? ui.safe.capsuleRight : 14) - 8;
  ui.rect(0, 0, ui.width, 46, '#281d18f4');
  ui.ctx.fillStyle = '#c28d3e';
  ui.ctx.fillRect(0, 44, ui.width, 2);
  ui.label('灯下江湖', 22, 22, 17, ui.theme.colors.paper, 'left', ui.theme.fonts.title);
  ui.label('九域商路', 108, 22, 12, ui.theme.colors.gold, 'left', ui.theme.fonts.title);
  ui.label('第' + board.day + '日 · ' + phaseLabel(board.phase) + ' · ' + board.turn + '回合', 190, 22, 10, '#cbb88e', 'left', ui.theme.fonts.body);
  drawResource(ui, right - 164, 10, 'coin', state.inventory.coin, '#d6ae55');
  drawResource(ui, right - 108, 10, 'food', state.inventory.ingredient, '#6d9d73');
  drawResource(ui, right - 52, 10, 'fame', state.inn.reputation, '#b84b38');
}

function drawMiniMap(ui, board) {
  var ctx = ui.ctx;
  var x = 14;
  var y = 57;
  var width = 124;
  var height = 74;
  var tile = definition.tile(board.tileId);
  ctx.save();
  ctx.fillStyle = '#35261f4d';
  ctx.fillRect(x + 4, y + 5, width, height);
  ctx.fillStyle = '#eadbb4e8';
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x + width, y + 3);
  ctx.lineTo(x + width - 3, y + height);
  ctx.lineTo(x + 4, y + height - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a6046';
  ctx.stroke();
  definition.regions.forEach(function (region) {
    var rx = x + 10 + region.center.x / definition.world.width * (width - 20);
    var ry = y + 8 + region.center.y / definition.world.height * (height - 16);
    ctx.fillStyle = region.color + 'aa';
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fff1bb';
  ctx.strokeStyle = '#8d3028';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 10 + tile.x / definition.world.width * (width - 20), y + 8 + tile.y / definition.world.height * (height - 16), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawObjective(ui, state) {
  var board = state.board;
  var x = ui.width - (ui.safe ? ui.safe.capsuleRight : 14) - 218;
  var y = 57;
  var ctx = ui.ctx;
  ctx.save();
  ctx.fillStyle = '#eadab6e8';
  ctx.beginPath();
  ctx.moveTo(x + 7, y);
  ctx.lineTo(x + 208, y + 3);
  ctx.lineTo(x + 204, y + 69);
  ctx.lineTo(x, y + 65);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#73573f';
  ctx.stroke();
  ctx.fillStyle = '#a83c2d';
  ctx.fillRect(x + 12, y + 12, 3, 43);
  ctx.restore();
  ui.label('本回商路目标', x + 24, y + 15, 12, '#9d3b2e', 'left', ui.theme.fonts.title);
  ui.label('产业 ' + board.metrics.properties + '/3   来客 ' + board.metrics.npcMeetings + '/3', x + 24, y + 36, 10, '#382920', 'left');
  ui.label('地标 ' + board.metrics.landmarks + '/2   坚持至第3日', x + 24, y + 53, 10, '#382920', 'left');
}

var PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function drawDie(ui, x, y, size, angle, face, alpha, scale) {
  var ctx = ui.ctx;
  var pipGap = size * 0.22;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  ctx.rotate(angle || 0);
  ctx.scale(scale || 1, scale || 1);
  ctx.fillStyle = '#2a1c17aa';
  roundedPath(ctx, -size / 2 + 3, -size / 2 + 6, size, size, size * 0.18);
  ctx.fill();
  var gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#fff4d3');
  gradient.addColorStop(0.55, '#e7c983');
  gradient.addColorStop(1, '#b78238');
  ctx.fillStyle = gradient;
  roundedPath(ctx, -size / 2, -size / 2, size, size, size * 0.18);
  ctx.fill();
  ctx.strokeStyle = '#6f4226';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = face === 1 ? '#a83c2d' : '#37261e';
  (PIPS[face] || PIPS[1]).forEach(function (pip) {
    ctx.beginPath();
    ctx.arc(pip[0] * pipGap, pip[1] * pipGap, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDiceCup(ui, x, y, active) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.65;
  ctx.fillStyle = '#2f1f19';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 39, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f3528';
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 4);
  ctx.quadraticCurveTo(x - 28, y + 18, x - 23, y + 22);
  ctx.quadraticCurveTo(x, y + 32, x + 23, y + 22);
  ctx.quadraticCurveTo(x + 28, y + 18, x + 32, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d2a54c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawRollingDice(ui, board, x, y) {
  var now = Date.now();
  var duration = Number(board.rollDuration) || 1320;
  var elapsed = now - Number(board.rollStartedAt || now);
  var rolling = now < Number(board.rollingUntil || 0);
  var revealProgress = rolling ? 0 : clamp((now - board.rollingUntil) / Math.max(1, board.nextStepAt - board.rollingUntil), 0, 1);
  var progress = clamp(elapsed / duration, 0, 1);
  var face = rolling && progress < 0.88 ? 1 + Math.floor(elapsed / 82) % 6 : board.dice || 1;
  var amplitude = rolling ? 18 * (1 - progress * 0.55) : 0;
  var bounce = rolling ? Math.abs(Math.sin(progress * Math.PI * 5.5)) * (24 * (1 - progress * 0.35)) : 0;
  var angle = rolling ? progress * Math.PI * 7 + Math.sin(elapsed / 55) * 0.25 : (1 - easeOut(revealProgress)) * 0.45;
  var scale = rolling ? 0.88 + Math.sin(progress * Math.PI) * 0.16 : 1 + (1 - revealProgress) * 0.16;
  drawDiceCup(ui, x, y + 15, true);
  if (rolling) {
    drawDie(ui, x - Math.sin(elapsed / 62) * amplitude * 0.8, y - bounce + 5, 46, angle - 0.5, 1 + (face + 2) % 6, 0.13, scale * 1.12);
    drawDie(ui, x + Math.sin(elapsed / 74) * amplitude, y - bounce, 46, angle, face, 1, scale);
    ui.label(progress < 0.22 ? '蓄势' : progress < 0.82 ? '骰声滚过商路' : '即将落定', x, y - 55, 10, '#f8e8bd', 'center', ui.theme.fonts.title, 120);
  } else {
    drawDie(ui, x, y - 4, 50, angle, board.dice || 1, 1, scale);
    ui.label('落定 · ' + (board.dice || 1) + '点', x, y - 58, 11, '#ffe49a', 'center', ui.theme.fonts.title, 110);
  }
}

function drawDiceControl(ui, board) {
  var action = { type: 'boardRoll' };
  var x = ui.width - 69 - (ui.safe ? ui.safe.right : 14);
  var y = ui.height - 51;
  var enabled = !board.moving && !board.encounter && !board.external && !board.routeChoices && !board.chapterComplete;
  if (board.rollStartedAt && Date.now() < board.nextStepAt) {
    drawRollingDice(ui, board, x, y - 4);
    return;
  }
  if (board.moving) {
    drawDiceCup(ui, x, y + 3, false);
    ui.label('余 ' + board.stepsRemaining, x, y - 2, 14, '#f5d783', 'center', ui.theme.fonts.title);
    return;
  }
  drawDiceCup(ui, x, y + 4, enabled);
  drawDie(ui, x, y - 6 + (ui.pressed(action) ? 2 : 0), 36, -0.12, board.dice || 5, enabled ? 1 : 0.45, 1);
  ui.label('掷骰', x, y + 31, 9, '#f7e9c7', 'center', ui.theme.fonts.title);
  if (enabled) ui.hitArea(action, x - 42, y - 44, 84, 84);
}

function drawCutButton(ui, action, x, y, width, height, label, tone) {
  var ctx = ui.ctx;
  var pressed = ui.pressed(action);
  var dy = pressed ? 2 : 0;
  ctx.save();
  ctx.translate(0, dy);
  ctx.fillStyle = '#34241e';
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 3);
  ctx.lineTo(x + width - 4, y + 3);
  ctx.lineTo(x + width + 1, y + height - 7);
  ctx.lineTo(x + width - 7, y + height + 2);
  ctx.lineTo(x + 4, y + height + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.moveTo(x + 7, y);
  ctx.lineTo(x + width - 5, y);
  ctx.lineTo(x + width, y + 7);
  ctx.lineTo(x + width - 7, y + height);
  ctx.lineTo(x + 5, y + height);
  ctx.lineTo(x, y + height - 7);
  ctx.lineTo(x, y + 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a4933';
  ctx.stroke();
  ctx.restore();
  ui.label(label, x + width / 2, y + height / 2 + dy, 11, tone === '#e7d4a7' ? '#36261f' : '#fff0c7', 'center', ui.theme.fonts.title, width - 16);
  ui.hitArea(action, x, y, width, Math.max(44, height));
}

function drawCurrentStrip(ui, state) {
  var board = state.board;
  var tile = definition.tile(board.tileId);
  var region = definition.region(tile.regionId);
  var ctx = ui.ctx;
  var x = 148;
  var y = ui.height - 58;
  ctx.save();
  ctx.fillStyle = '#2a1e19e8';
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 427, y);
  ctx.lineTo(x + 418, y + 42);
  ctx.lineTo(x, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c18f3f';
  ctx.stroke();
  ctx.fillStyle = definition.region(tile.regionId).color;
  ctx.fillRect(x + 8, y + 7, 4, 28);
  ctx.restore();
  ui.label(region.shortName + ' · ' + tile.label, x + 22, y + 14, 12, '#f6e7bf', 'left', ui.theme.fonts.title, 230);
  ui.label(board.log[0] || '等待启程', x + 22, y + 31, 9, '#bca983', 'left', ui.theme.fonts.body, 302);
  drawCutButton(ui, { type: 'party' }, x + 438, y - 1, 58, 44, '队伍', '#3f7468');
}

function encounterPortrait(ui, npcId, x, y, size) {
  var art = npcId && ui.assets.manifest.npcs[npcId];
  var path = art && (art.portrait || art.atlas || art.sprite);
  var image = path && ui.assets.image(path);
  ui.ctx.save();
  ui.ctx.fillStyle = '#3a281f';
  ui.ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  ui.ctx.fillStyle = '#d3aa4b';
  ui.ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  ui.ctx.restore();
  if (image) ui.cover(image, x + 3, y + 3, size - 6, size - 6);
  else {
    ui.rect(x + 3, y + 3, size - 6, size - 6, '#d8c79e');
    ui.label('客', x + size / 2, y + size / 2, 28, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title);
  }
}

function drawEncounter(ui, state) {
  var board = state.board;
  var encounter = board.encounter;
  var width = 522;
  var height = 194;
  var x = (ui.width - width) / 2;
  var y = 102;
  var textX = x + 28;
  var textWidth = width - 56;
  var property;
  var tile;
  var cost;
  var ctx = ui.ctx;
  if (!encounter) return;
  ui.rect(0, 46, ui.width, ui.height - 46, '#1d1511a8');
  ctx.save();
  ctx.fillStyle = '#2d201a';
  ctx.fillRect(x + 5, y + 7, width, height);
  ctx.fillStyle = '#ead9b1';
  ctx.beginPath();
  ctx.moveTo(x + 9, y);
  ctx.lineTo(x + width - 8, y + 3);
  ctx.lineTo(x + width, y + 17);
  ctx.lineTo(x + width - 5, y + height - 7);
  ctx.lineTo(x + 8, y + height);
  ctx.lineTo(x, y + height - 14);
  ctx.lineTo(x + 3, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#886443';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#a83c2d';
  ctx.fillRect(x + 20, y + 18, 4, 92);
  ctx.restore();
  if (encounter.npcId) {
    encounterPortrait(ui, encounter.npcId, x + 35, y + 30, 96);
    textX = x + 154;
    textWidth = width - 184;
  }
  ui.label(encounter.title, textX, y + 30, 17, '#9d392d', 'left', ui.theme.fonts.title, textWidth);
  if (encounter.role) ui.label(encounter.role, textX, y + 51, 10, '#806b50', 'left', ui.theme.fonts.body, textWidth);
  ui.paragraph(encounter.text, textX, y + 64, { width: textWidth, size: 12, lineHeight: 19, maxLines: 3, color: '#2f241e' });

  if (encounter.type === 'property' && encounter.mode === 'partner') {
    drawCutButton(ui, { type: 'boardResolve', id: 'partner' }, x + 154, y + 138, 142, 44, '合作 ' + definition.tile(encounter.tileId).price + '文', '#a54835');
    drawCutButton(ui, { type: 'boardResolve', id: 'skip' }, x + 308, y + 138, 104, 44, '暂缓', '#e7d4a7');
  } else if (encounter.type === 'property' && encounter.mode === 'upgrade') {
    tile = definition.tile(encounter.tileId);
    property = board.owned[tile.id];
    cost = tile.price + (property.level || 1) * 8;
    drawCutButton(ui, { type: 'boardResolve', id: 'upgrade' }, x + 154, y + 138, 142, 44, '升级 ' + cost + '文', '#3f7468');
    drawCutButton(ui, { type: 'boardResolve', id: 'continue' }, x + 308, y + 138, 104, 44, '继续', '#e7d4a7');
  } else if (encounter.type === 'npc') {
    drawCutButton(ui, { type: 'boardResolve', id: 'talk' }, x + 154, y + 138, 112, 44, '结识', '#a54835');
    drawCutButton(ui, { type: 'boardResolve', id: 'trade' }, x + 278, y + 138, 112, 44, '换物', '#3f7468');
  } else if (encounter.type === 'landmark') {
    drawCutButton(ui, { type: 'boardResolve', id: 'landmark' }, x + 154, y + 138, 142, 44, '进入场景', '#a54835');
    drawCutButton(ui, { type: 'boardResolve', id: 'continue' }, x + 308, y + 138, 104, 44, '赶路', '#e7d4a7');
  } else if (encounter.type === 'battle') {
    drawCutButton(ui, { type: 'boardResolve', id: 'battle' }, x + 154, y + 138, 142, 44, '迎战', '#a54835');
    drawCutButton(ui, { type: 'boardResolve', id: 'continue' }, x + 308, y + 138, 104, 44, '绕行', '#e7d4a7');
  } else {
    drawCutButton(ui, { type: 'boardResolve', id: 'continue' }, x + width - 146, y + 138, 118, 44, encounter.type === 'complete' ? '继续经营' : '记下', '#a54835');
  }
}

function drawRoutes(ui, board) {
  var choices = board.routeChoices;
  var x;
  var ctx = ui.ctx;
  if (!choices || !choices.length) return;
  ctx.save();
  ctx.fillStyle = '#ead9b1f2';
  roundedPath(ctx, ui.width / 2 - 218, 114, 436, 120, 5);
  ctx.fill();
  ctx.strokeStyle = '#806044';
  ctx.stroke();
  ctx.restore();
  ui.label('前方商路分岔', ui.width / 2, 139, 16, '#a13e31', 'center', ui.theme.fonts.title);
  choices.forEach(function (tileId, index) {
    var region = definition.region(definition.tile(tileId).regionId);
    x = ui.width / 2 - 198 + index * 202;
    drawCutButton(ui, { type: 'boardRoute', tileId: tileId }, x, 165, 188, 48, region.shortName + '方向', index === 0 ? '#a54835' : '#3f7468');
  });
}

function drawBoard(ui, state) {
  var board = state.board;
  var view = camera(ui, board);
  drawWorld(ui, state, view);
  drawActors(ui, state, view);
  drawTopHud(ui, state);
  drawMiniMap(ui, board);
  drawObjective(ui, state);
  if (!board.encounter && !board.routeChoices) {
    drawCurrentStrip(ui, state);
    drawDiceControl(ui, board);
  }
  drawRoutes(ui, board);
  drawEncounter(ui, state);
}

module.exports = { drawBoard: drawBoard };
