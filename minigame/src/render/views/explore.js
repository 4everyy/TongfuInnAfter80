var world = require('../../world/explore');
var worldTime = require('../../core/time');
var doorwayCrisis = require('../../../data/doorway-crisis');
var innSceneView = require('./inn-scene-v18');
var innScene = require('../../inn/scene-interactions');

var SCENE_WIDTH = 844;
var SCENE_Y = 42;
var HERO_HEIGHT = 112;
var NPC_HEIGHT = 104;
var MIN_DEPTH_SCALE = 0.88;
var MAX_DEPTH_SCALE = 1.04;
var TOAST_DURATION = 2400;
var lastToastText = '';
var lastToastAt = 0;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function sceneWidth(ui) {
  return ui.width;
}

function resourceItems(state) {
  var inventory = state.inventory || {};
  var inn = state.inn || {};
  return [
    { id: 'coin', value: number(inventory.coin, 0), fallback: '银', tone: '#d8bc76' },
    { id: 'ingredient', value: number(inventory.ingredient, 0), fallback: '食', tone: '#79a985' },
    { id: 'reputation', value: number(inn.reputation, 0), fallback: '誉', tone: '#c66553' },
    { id: 'order', value: number(inn.order, 0), fallback: '序', tone: '#92aa8e' },
  ];
}

function drawResourceHud(ui, state) {
  var resources = resourceItems(state);
  var paths = ui.assets.manifest.ui && ui.assets.manifest.ui.resources || {};
  var right = ui.width - (ui.safe ? ui.safe.capsuleRight : 14) - 8;
  var itemWidth = 46;
  var startX = right - resources.length * itemWidth;
  var index;
  var item;
  var image;
  var x;
  for (index = 0; index < resources.length; index += 1) {
    item = resources[index];
    image = paths[item.id] ? ui.assets.image(paths[item.id]) : null;
    x = startX + index * itemWidth;
    if (image) {
      ui.ctx.drawImage(image, x + 2, 12, 18, 18);
    } else {
      ui.ctx.save();
      ui.ctx.beginPath();
      ui.ctx.arc(x + 11, 21, 9, 0, Math.PI * 2);
      ui.ctx.fillStyle = item.tone;
      ui.ctx.fill();
      ui.label(item.fallback, x + 11, 21, 9, ui.theme.colors.deepWood, 'center', ui.theme.fonts.title);
      ui.ctx.restore();
    }
    ui.label(item.value, x + 25, 21, ui.theme.type.number.size, ui.theme.colors.paper, 'left');
    ui.hitArea({ type: 'hudHelp', id: item.id }, x, 0, 44, SCENE_Y);
  }
  return startX;
}

function drawHud(ui, state) {
  var quest = state.quest || { title: '', text: '' };
  var locationName = state.mapId ? world.map(state.mapId).name : quest.title;
  var resourceStart;
  var subtitleWidth;
  ui.rect(0, 0, ui.width, SCENE_Y, '#2c211df0');
  ui.label('灯下江湖 · 长风客栈', 14, 21, ui.theme.type.title.size, ui.theme.colors.paper, 'left', ui.theme.fonts.title);
  resourceStart = drawResourceHud(ui, state);
  subtitleWidth = Math.max(90, resourceStart - 232);
  ui.label(
    '第' + (state.worldTime && state.worldTime.day || 1) + '日 · '
      + worldTime.label(state.worldTime && state.worldTime.phase) + ' · ' + locationName,
    220,
    21,
    ui.theme.type.caption.size,
    ui.theme.colors.muted,
    'left',
    null,
    subtitleWidth
  );
}

function drawTaskCard(ui, state) {
  var quest = state.quest || {};
  var hasTask = !!(quest.title || quest.text);
  var right = ui.width - (ui.safe ? ui.safe.right : 14) - 10;
  var x;
  var y = SCENE_Y + 10;
  var width = 196;
  var height = 108;
  var chapter = state.campaign && state.campaign.chapter || 1;
  var chapterDay = state.campaign && state.campaign.chapterDay || 1;
  if (!hasTask) {
    x = right - 44;
    ui.roundedRect(x + 2, y + 3, 44, 44, 4, '#1d1512a8');
    ui.roundedRect(x, y, 44, 44, 4, '#ead7aaee', ui.theme.colors.gold);
    drawInteractionGlyph(ui, 'investigate', x + 22, y + 22, 18, ui.theme.colors.cinnabar);
    ui.hitArea({ type: 'task' }, x, y, 44, 44);
    return;
  }
  x = right - width;
  ui.roundedRect(x + 3, y + 4, width, height, 5, '#1b1512a6');
  ui.roundedRect(x, y, width, height, 5, '#f3e4bde8', '#7c5b3d');
  ui.rect(x + 8, y + 9, 3, height - 18, ui.theme.colors.cinnabar);
  ui.roundedRect(x + 16, y + 12, 28, 24, 3, ui.theme.colors.cinnabar, '#6d2c22');
  drawInteractionGlyph(ui, 'investigate', x + 30, y + 24, 13, ui.theme.colors.paper);
  ui.label(quest.title || '当前目标', x + 52, y + 24, 14, ui.theme.colors.ink, 'left', ui.theme.fonts.title, width - 64);
  ui.paragraph(quest.text || '在场景中继续调查。', x + 18, y + 46, {
    width: width - 36,
    size: ui.theme.type.caption.size,
    lineHeight: ui.theme.type.caption.lineHeight,
    maxLines: 2,
    color: ui.theme.colors.wood,
  });
  ui.label(
    '第' + chapter + '章 · 第' + chapterDay + '日 · 进行中',
    x + 18,
    y + height - 14,
    ui.theme.type.caption.size,
    ui.theme.colors.cinnabar,
    'left',
    null,
    width - 36
  );
  ui.hitArea({ type: 'task' }, x, y, width, height);
}

function layersByOrder(ui, mapId) {
  var art = ui.assets.manifest.maps[mapId];
  var layers = art && art.layers ? art.layers.slice() : [];
  layers.sort(function (a, b) {
    return number(a.order, 0) - number(b.order, 0);
  });
  return layers;
}

function drawLayer(ui, layer, camera) {
  var image = ui.assets.image(layer.src);
  var parallax = number(layer.parallax, 1);
  var x = number(layer.x, 0) - camera * parallax;
  var y = SCENE_Y + number(layer.y, 0);
  var width;
  var height;
  if (!image) return false;
  width = number(layer.worldWidth, image.width);
  height = number(layer.worldHeight, image.height);
  ui.ctx.drawImage(image, x, y, width, height);
  return true;
}

function depthBounds(current) {
  var minimum = current.height * 0.5;
  var maximum = current.height * 0.94;
  var found = false;
  var polygonIndex;
  var pointIndex;
  var point;
  for (polygonIndex = 0; polygonIndex < (current.walkable || []).length; polygonIndex += 1) {
    for (pointIndex = 0; pointIndex < current.walkable[polygonIndex].length; pointIndex += 1) {
      point = current.walkable[polygonIndex][pointIndex];
      if (!found) {
        minimum = point[1];
        maximum = point[1];
        found = true;
      } else {
        minimum = Math.min(minimum, point[1]);
        maximum = Math.max(maximum, point[1]);
      }
    }
  }
  if (maximum - minimum < 1) maximum = minimum + 1;
  return { minimum: minimum, maximum: maximum };
}

function depthScale(current, sortY) {
  var bounds = depthBounds(current);
  var progress = clamp((sortY - bounds.minimum) / (bounds.maximum - bounds.minimum), 0, 1);
  return MIN_DEPTH_SCALE + (MAX_DEPTH_SCALE - MIN_DEPTH_SCALE) * progress;
}

function mapArt(ui, id) {
  return ui.assets.manifest.maps[id] || {};
}

function characterTuning(ui, current, id, npc) {
  var roleArt = id && ui.assets.manifest.characters[id];
  var npcArt = npc && npc.artId && ui.assets.manifest.npcs && ui.assets.manifest.npcs[npc.artId];
  var art = roleArt || npcArt || {};
  var scene = mapArt(ui, current.id);
  return {
    displayScale: number(art.displayScale, 1) * number(scene.characterScale, 1),
    shadowScale: number(art.shadowScale, npc ? 0.9 : 1),
    shadowAlpha: number(art.shadowAlpha, npc ? 0.12 : 0.14)
  };
}

function propGeometry(prop, image) {
  var scale = number(prop.scale, 1);
  var width = number(prop.width, image.width * scale);
  var height = number(prop.height, image.height * scale);
  var anchorX = number(prop.x, 0);
  var anchorY = number(prop.y, 0);
  var drawX = anchorX;
  var drawY = anchorY;
  var sortY;
  if (prop.pivot) {
    drawX -= number(prop.pivot.x, 0) * (width / image.width);
    drawY -= number(prop.pivot.y, image.height) * (height / image.height);
    sortY = number(prop.sortY, anchorY);
  } else {
    sortY = number(prop.sortY, anchorY + height);
  }
  return { drawX: drawX, drawY: drawY, width: width, height: height, sortY: sortY };
}

function polygonBounds(polygon) {
  var minimumX = Infinity;
  var minimumY = Infinity;
  var maximumX = -Infinity;
  var maximumY = -Infinity;
  var index;
  for (index = 0; index < polygon.length; index += 1) {
    minimumX = Math.min(minimumX, polygon[index][0]);
    minimumY = Math.min(minimumY, polygon[index][1]);
    maximumX = Math.max(maximumX, polygon[index][0]);
    maximumY = Math.max(maximumY, polygon[index][1]);
  }
  return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY, bottom: maximumY };
}

function occluderPolygon(obstacle) {
  var bounds;
  var rise;
  if (obstacle.occluderPolygon) return obstacle.occluderPolygon;
  bounds = polygonBounds(obstacle.polygon);
  rise = number(obstacle.occluderRise, Math.min(86, Math.max(34, bounds.height * 0.9)));
  return [
    [bounds.x, Math.max(0, bounds.y - rise)],
    [bounds.x + bounds.width, Math.max(0, bounds.y - rise)],
    [bounds.x + bounds.width, bounds.bottom],
    [bounds.x, bounds.bottom]
  ];
}

function exitCenter(exit) {
  return {
    x: exit.zone.x + exit.zone.width / 2,
    y: exit.zone.y + exit.zone.height * 0.72
  };
}

function followerFallback(state, index) {
  var spacing = 42 * (index + 1);
  var x = state.position.x;
  var y = state.position.y;
  if (state.facing === 'right') x -= spacing;
  else if (state.facing === 'left') x += spacing;
  else if (state.facing === 'down') y -= spacing * 0.7;
  else y += spacing * 0.7;
  x += index ? 10 : 0;
  y += index ? 12 : -8;
  return { x: x, y: y, facing: state.facing, moving: false };
}

function buildSceneItems(ui, state, current) {
  var items = [];
  var mapArt = ui.assets.manifest.maps[current.id] || { props: [] };
  var props = mapArt.props || [];
  var hotspots = world.discoverableHotspots(state);
  var npcs = world.visibleNpcs(state);
  var active = world.activeHotspot(state);
  var backgroundLayer = (mapArt.layers || []).find(function (layer) {
    return number(layer.parallax, 1) === 1 && number(layer.order, 0) < 3;
  });
  var backgroundImage = backgroundLayer ? ui.assets.image(backgroundLayer.src) : null;
  var linkedObstacles = {};
  var followers = [];
  var party = state.party || [];
  var index;
  var image;
  var geometry;
  var npc;
  var id;
  var point;
  var sequence = 0;

  for (index = 0; index < props.length; index += 1) {
    if (!world.conditionsMet(props[index], state)) continue;
    if (props[index].obstacleId) linkedObstacles[props[index].obstacleId] = true;
    image = ui.assets.image(props[index].src);
    if (!image) continue;
    geometry = propGeometry(props[index], image);
    items.push({
      kind: 'prop',
      source: props[index],
      image: image,
      geometry: geometry,
      sortY: geometry.sortY,
      sequence: sequence
    });
    sequence += 1;
  }

  if (backgroundLayer && backgroundImage) {
    for (index = 0; index < current.obstacles.length; index += 1) {
      if (!world.conditionsMet(current.obstacles[index], state)) continue;
      if (linkedObstacles[current.obstacles[index].id] || current.obstacles[index].occludes === false) continue;
      geometry = polygonBounds(current.obstacles[index].polygon);
      items.push({
        kind: 'bakedOccluder',
        source: current.obstacles[index],
        layer: backgroundLayer,
        image: backgroundImage,
        polygon: occluderPolygon(current.obstacles[index]),
        sortY: number(current.obstacles[index].sortY, geometry.bottom),
        sequence: sequence
      });
      sequence += 1;
    }
  }

  for (index = 0; index < hotspots.length; index += 1) {
    items.push({
      kind: 'hotspot',
      source: hotspots[index],
      x: hotspots[index].x,
      y: hotspots[index].y,
      distance: Math.hypot(hotspots[index].x - state.position.x, hotspots[index].y - state.position.y),
      sortY: hotspots[index].y,
      active: !!active && active.id === hotspots[index].id,
      status: world.interactionState(state, hotspots[index]),
      sequence: sequence
    });
    sequence += 1;
  }

  for (index = 0; index < current.exits.length; index += 1) {
    point = exitCenter(current.exits[index]);
    if (Math.hypot(point.x - state.position.x, point.y - state.position.y) > 210
      && state.blockedExitId !== current.exits[index].id) continue;
    items.push({
      kind: 'exit',
      source: current.exits[index],
      x: point.x,
      y: point.y,
      distance: Math.hypot(point.x - state.position.x, point.y - state.position.y),
      locked: !world.exitUnlocked(state, current.exits[index]),
      active: state.blockedExitId === current.exits[index].id,
      sortY: point.y,
      sequence: sequence
    });
    sequence += 1;
  }

  for (index = 0; index < npcs.length; index += 1) {
    npc = npcs[index];
    items.push({
      kind: 'npc',
      source: npc,
      x: npc.x,
      y: npc.y,
      sortY: npc.y,
      sequence: sequence
    });
    sequence += 1;
  }

  items.push({
    kind: 'party',
    id: state.activeId,
    x: state.position.x,
    y: state.position.y,
    facing: state.facing || 'right',
    moving: !!state.moving,
    leader: true,
    sortY: state.position.y,
    sequence: sequence
  });
  sequence += 1;

  for (index = 0; index < party.length; index += 1) {
    if (party[index] !== state.activeId && followers.length < 2) followers.push(party[index]);
  }
  for (index = 0; index < followers.length; index += 1) {
    id = followers[index];
    point = state.followers && state.followers[id] ? state.followers[id] : followerFallback(state, index);
    items.push({
      kind: 'party',
      id: id,
      x: point.x,
      y: point.y,
      facing: point.facing || state.facing || 'right',
      moving: !!point.moving,
      leader: false,
      sortY: point.y,
      sequence: sequence
    });
    sequence += 1;
  }

  items.sort(function (a, b) {
    if (a.sortY !== b.sortY) return a.sortY - b.sortY;
    return a.sequence - b.sequence;
  });
  return items;
}

function drawProp(ui, item, camera) {
  var prop = item.source;
  var geometry = item.geometry;
  var parallax = number(prop.parallax, 1);
  ui.ctx.save();
  ui.ctx.globalAlpha = number(prop.alpha, 1);
  ui.ctx.drawImage(
    item.image,
    geometry.drawX - camera * parallax,
    SCENE_Y + geometry.drawY,
    geometry.width,
    geometry.height
  );
  ui.ctx.restore();
}

function drawBakedOccluder(ui, item, camera) {
  var layer = item.layer;
  var polygon = item.polygon;
  var index;
  ui.ctx.save();
  ui.ctx.beginPath();
  for (index = 0; index < polygon.length; index += 1) {
    if (index === 0) ui.ctx.moveTo(polygon[index][0] - camera, SCENE_Y + polygon[index][1]);
    else ui.ctx.lineTo(polygon[index][0] - camera, SCENE_Y + polygon[index][1]);
  }
  ui.ctx.closePath();
  ui.ctx.clip();
  ui.ctx.drawImage(
    item.image,
    number(layer.x, 0) - camera,
    SCENE_Y + number(layer.y, 0),
    number(layer.worldWidth, item.image.width),
    number(layer.worldHeight, item.image.height)
  );
  ui.ctx.restore();
}

function hotspotTone(ui, type) {
  if (type === 'battle') return ui.theme.colors.cinnabar;
  if (type === 'dialogue' || type === 'inn') return ui.theme.colors.jade;
  if (type === 'investigate' || type === 'mechanism') return '#d5c28b';
  return ui.theme.colors.gold;
}

function drawInteractionGlyph(ui, type, x, y, size, color) {
  var ctx = ui.ctx;
  var half = size / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'dialogue' || type === 'crisis') {
    ctx.strokeRect(x - half * 0.72, y - half * 0.5, size * 0.72, size * 0.52);
    ctx.beginPath();
    ctx.moveTo(x - half * 0.25, y + half * 0.02);
    ctx.lineTo(x - half * 0.42, y + half * 0.38);
    ctx.lineTo(x - half * 0.02, y + half * 0.08);
    ctx.stroke();
    [-0.42, -0.16, 0.1].forEach(function (offset) {
      ctx.beginPath();
      ctx.arc(x + size * offset, y - size * 0.05, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === 'battle') {
    ctx.beginPath();
    ctx.moveTo(x - half * 0.55, y - half * 0.55);
    ctx.lineTo(x + half * 0.55, y + half * 0.55);
    ctx.moveTo(x + half * 0.55, y - half * 0.55);
    ctx.lineTo(x - half * 0.55, y + half * 0.55);
    ctx.stroke();
  } else if (type === 'investigate' || type === 'mechanism') {
    ctx.beginPath();
    ctx.arc(x - half * 0.12, y - half * 0.12, half * 0.48, 0, Math.PI * 2);
    ctx.moveTo(x + half * 0.24, y + half * 0.24);
    ctx.lineTo(x + half * 0.62, y + half * 0.62);
    ctx.stroke();
  } else if (type === 'inn') {
    ctx.strokeRect(x - half * 0.52, y - half * 0.62, size * 0.72, size * 1.1);
    ctx.beginPath();
    ctx.arc(x + half * 0.03, y + half * 0.05, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - half * 0.7);
    ctx.lineTo(x + half * 0.28, y - half * 0.18);
    ctx.lineTo(x + half * 0.68, y);
    ctx.lineTo(x + half * 0.28, y + half * 0.18);
    ctx.lineTo(x, y + half * 0.7);
    ctx.lineTo(x - half * 0.28, y + half * 0.18);
    ctx.lineTo(x - half * 0.68, y);
    ctx.lineTo(x - half * 0.28, y - half * 0.18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHotspot(ui, item, camera, current) {
  var scale = depthScale(current, item.sortY);
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  var pulse = 0.94 + (Math.sin(Date.now() / 900 * Math.PI * 2) + 1) * 0.06;
  var radius = (item.active ? 14 : 10) * scale * pulse;
  var visibility = item.active ? 1 : item.status === 'near' ? 0.58 : 0.34;
  var tone = hotspotTone(ui, item.source.type);
  ui.ctx.save();
  ui.ctx.globalAlpha = visibility;
  ui.ctx.strokeStyle = tone;
  ui.ctx.lineWidth = item.active ? 2 : 1.5;
  ui.ctx.translate(x, y + 1);
  ui.ctx.scale(1, 0.42);
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ui.ctx.stroke();
  ui.ctx.restore();

  ui.ctx.save();
  ui.ctx.globalAlpha = item.active ? 1 : visibility + 0.18;
  ui.ctx.fillStyle = '#2b211de8';
  ui.ctx.strokeStyle = tone;
  ui.ctx.lineWidth = 1.5;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y - 24 * scale, 11 * scale * pulse, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.stroke();
  ui.ctx.restore();
  drawInteractionGlyph(ui, item.source.type, x, y - 24 * scale, 12 * scale, tone);
}

function drawExit(ui, item, camera) {
  var x = item.x - camera;
  var y = SCENE_Y + item.y - 36;
  var tone = item.locked ? ui.theme.colors.muted : ui.theme.colors.jade;
  ui.ctx.save();
  ui.ctx.globalAlpha = item.locked ? 0.82 : 0.92;
  ui.roundedRect(x - 21, y - 17, 42, 34, 3, '#2b211de6', tone);
  ui.ctx.strokeStyle = tone;
  ui.ctx.fillStyle = tone;
  ui.ctx.lineWidth = 2;
  if (item.locked) {
    ui.ctx.strokeRect(x - 6, y - 1, 12, 10);
    ui.ctx.beginPath();
    ui.ctx.arc(x, y - 2, 5, Math.PI, Math.PI * 2);
    ui.ctx.stroke();
  } else {
    ui.ctx.beginPath();
    ui.ctx.moveTo(x - 8, y);
    ui.ctx.lineTo(x + 8, y);
    ui.ctx.lineTo(x + 2, y - 6);
    ui.ctx.moveTo(x + 8, y);
    ui.ctx.lineTo(x + 2, y + 6);
    ui.ctx.stroke();
  }
  ui.ctx.restore();
  if (item.distance < 138) {
    ui.roundedRect(x - 35, y - 38, 70, 18, 3, '#2b211dcf', tone);
    ui.label(item.locked ? '道路未开放' : '前往下一处', x, y - 29, 9, ui.theme.colors.paper, 'center', ui.theme.fonts.title, 64);
  }
}

function drawNpc(ui, item, camera, current, state) {
  var scale = depthScale(current, item.sortY);
  var tuning = characterTuning(ui, current, item.source.roleId, item.source);
  var spriteHeight = NPC_HEIGHT * scale * tuning.displayScale;
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  var drawn;
  ui.heroShadow(x, y, spriteHeight, tuning.shadowScale, tuning.shadowAlpha);
  drawn = ui.artNpc(item.source, x, y, spriteHeight, item.x, item.y);
  if (!drawn) ui.fallbackNpc(item.source, x, y, spriteHeight);
  if (item.source.name && item.source.showName !== false) {
    ui.label(item.source.name, x, y - spriteHeight - 8, 10, ui.theme.colors.paper, 'center', null, 88);
  }
  if (innScene.isBusinessMap(state) && item.source.roleId) {
    ui.hitArea(
      { type: 'innCharacterSelect', id: item.source.roleId },
      x - 28,
      y - spriteHeight,
      56,
      Math.max(64, spriteHeight + 8)
    );
  }
}

function drawPartyMember(ui, item, camera, current, state) {
  var scale = depthScale(current, item.sortY);
  var tuning = characterTuning(ui, current, item.id);
  var spriteHeight = HERO_HEIGHT * scale * tuning.displayScale;
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  ui.heroShadow(x, y, spriteHeight, tuning.shadowScale, tuning.shadowAlpha);
  ui.artHero(item.id, x, y, spriteHeight, item.facing, item.moving, item.x, item.y, null, item.id);
  if (item.leader) {
    ui.ctx.save();
    ui.ctx.fillStyle = ui.theme.colors.gold;
    ui.ctx.beginPath();
    ui.ctx.moveTo(x, y - spriteHeight - 8);
    ui.ctx.lineTo(x - 5, y - spriteHeight - 15);
    ui.ctx.lineTo(x + 5, y - spriteHeight - 15);
    ui.ctx.closePath();
    ui.ctx.fill();
    ui.ctx.restore();
  }
  if (innScene.isBusinessMap(state)) {
    ui.hitArea(
      { type: 'innCharacterSelect', id: item.id },
      x - 28,
      y - spriteHeight,
      56,
      Math.max(64, spriteHeight + 8)
    );
  }
}

function drawSceneItems(ui, items, camera, current, state) {
  var index;
  for (index = 0; index < items.length; index += 1) {
    if (items[index].kind === 'prop') drawProp(ui, items[index], camera);
    else if (items[index].kind === 'bakedOccluder') drawBakedOccluder(ui, items[index], camera);
    else if (items[index].kind === 'hotspot') drawHotspot(ui, items[index], camera, current);
    else if (items[index].kind === 'exit') drawExit(ui, items[index], camera);
    else if (items[index].kind === 'npc') drawNpc(ui, items[index], camera, current, state);
    else if (items[index].kind === 'party') drawPartyMember(ui, items[index], camera, current, state);
  }
}

function drawTimeTint(ui, state, sceneHeight, width) {
  var phase = state.worldTime && state.worldTime.phase || 'morning';
  if (ui.timeTint) {
    ui.timeTint(0, SCENE_Y, width, sceneHeight);
    return;
  }
  if (phase === 'evening') ui.rect(0, SCENE_Y, width, sceneHeight, '#17354a45');
  else if (phase === 'morning') ui.rect(0, SCENE_Y, width, sceneHeight, '#f0c66a12');
}

function drawPolygon(ui, polygon, camera, color, fill) {
  var index;
  ui.ctx.beginPath();
  for (index = 0; index < polygon.length; index += 1) {
    if (index === 0) ui.ctx.moveTo(polygon[index][0] - camera, SCENE_Y + polygon[index][1]);
    else ui.ctx.lineTo(polygon[index][0] - camera, SCENE_Y + polygon[index][1]);
  }
  ui.ctx.closePath();
  if (fill) {
    ui.ctx.fillStyle = fill;
    ui.ctx.fill();
  }
  ui.ctx.strokeStyle = color;
  ui.ctx.lineWidth = 1;
  ui.ctx.stroke();
}

function drawWorldDebug(ui, state, current, camera) {
  var index;
  var spot;
  if (!state.settings || !state.settings.worldDebug) return;
  ui.ctx.save();
  for (index = 0; index < current.walkable.length; index += 1) {
    drawPolygon(ui, current.walkable[index], camera, '#55d68a', '#55d68a18');
  }
  for (index = 0; index < current.obstacles.length; index += 1) {
    if (world.conditionsMet(current.obstacles[index], state)) {
      drawPolygon(ui, current.obstacles[index].polygon, camera, '#ff6a5f', '#ff6a5f28');
    }
  }
  for (index = 0; index < current.exits.length; index += 1) {
    ui.ctx.strokeStyle = world.exitUnlocked(state, current.exits[index]) ? '#6fcf97' : '#ffcc5c';
    ui.ctx.strokeRect(
      current.exits[index].zone.x - camera,
      SCENE_Y + current.exits[index].zone.y,
      current.exits[index].zone.width,
      current.exits[index].zone.height
    );
  }
  for (index = 0; index < current.hotspots.length; index += 1) {
    spot = current.hotspots[index];
    if (!world.conditionsMet(spot, state)) continue;
    ui.ctx.strokeStyle = '#67b7ff';
    ui.ctx.beginPath();
    ui.ctx.arc(spot.x - camera, SCENE_Y + spot.y, spot.radius || 72, 0, Math.PI * 2);
    ui.ctx.stroke();
  }
  ui.ctx.translate(state.position.x - camera, SCENE_Y + state.position.y);
  ui.ctx.scale(1, world.COLLISION_RADIUS_Y / world.COLLISION_RADIUS_X);
  ui.ctx.strokeStyle = '#ffffff';
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, world.COLLISION_RADIUS_X, 0, Math.PI * 2);
  ui.ctx.stroke();
  ui.ctx.restore();
}

function drawUtilityGlyph(ui, type, x, y, color) {
  var ctx = ui.ctx;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  if (type === 'inn') {
    ctx.strokeRect(x - 8, y - 7, 16, 14);
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 7);
    ctx.lineTo(x, y - 14);
    ctx.lineTo(x + 10, y - 7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 5, 4, 0, Math.PI * 2);
    ctx.moveTo(x - 12, y + 8);
    ctx.quadraticCurveTo(x - 5, y, x + 1, y + 8);
    ctx.moveTo(x - 1, y + 8);
    ctx.quadraticCurveTo(x + 5, y, x + 12, y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWoodControl(ui, action, centerX, centerY, size, type, title, primary, enabled) {
  var pressed = ui.pressed && ui.pressed(action);
  var offset = pressed ? 2 : 0;
  var alpha = enabled === false ? 0.45 : 1;
  var fill = primary ? '#b88432' : '#ead7aa';
  var border = primary ? '#f0d287' : '#6e4d32';
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  if (primary) {
    ui.ctx.beginPath();
    ui.ctx.arc(centerX, centerY + 3, size / 2, 0, Math.PI * 2);
    ui.ctx.fillStyle = '#5a3826';
    ui.ctx.fill();
    ui.ctx.beginPath();
    ui.ctx.arc(centerX, centerY + offset, size / 2 - 2, 0, Math.PI * 2);
    ui.ctx.fillStyle = fill;
    ui.ctx.fill();
    ui.ctx.strokeStyle = border;
    ui.ctx.lineWidth = 2;
    ui.ctx.stroke();
    drawInteractionGlyph(ui, type || 'interact', centerX, centerY - 4 + offset, 19, '#2b211d');
    ui.label(title, centerX, centerY + 15 + offset, 9, '#2b211d', 'center', ui.theme.fonts.title, size - 8);
  } else {
    ui.roundedRect(centerX - size / 2, centerY - size / 2 + 3, size, size, 4, '#60432d');
    ui.roundedRect(centerX - size / 2, centerY - size / 2 + offset, size, size, 4, fill, border);
    drawUtilityGlyph(ui, type, centerX, centerY - 5 + offset, '#2b211d');
    ui.label(title, centerX, centerY + 12 + offset, 9, '#2b211d', 'center', ui.theme.fonts.title, size - 6);
  }
  ui.ctx.restore();
  ui.hitArea(action, centerX - Math.max(size, 44) / 2, centerY - Math.max(size, 44) / 2, Math.max(size, 44), Math.max(size, 44));
}

function speechAnchor(state, current, camera, speaker) {
  if (speaker === 'wuchen') return { x: 430 - camera, y: SCENE_Y + 110, direction: 'down' };
  if (speaker === 'guest') return { x: 350 - camera, y: SCENE_Y + 150, direction: 'down' };
  if (speaker === 'shiwei') return { x: 820 - camera, y: SCENE_Y + 142, direction: 'down' };
  return { x: state.position.x - camera, y: SCENE_Y + state.position.y - 112, direction: 'down' };
}

function wrapSpeech(ctx, text, width) {
  var chars = String(text || '').split('');
  var lines = [];
  var line = '';
  var index;
  for (index = 0; index < chars.length; index += 1) {
    if (ctx.measureText(line + chars[index]).width > width && line) {
      lines.push(line);
      line = chars[index];
    } else line += chars[index];
  }
  if (line) lines.push(line);
  return lines;
}

function drawSpeechBubble(ui, state, current, camera) {
  var crisis = doorwayCrisis.ensure(state);
  var speech = crisis.speech;
  var anchor;
  var width;
  var lines;
  var height;
  var x;
  var y;
  var index;
  if (!speech || Date.now() - speech.at > 6200) return false;
  anchor = speechAnchor(state, current, camera, speech.speaker);
  ui.ctx.save();
  ui.ctx.font = '13px ' + ui.theme.fonts.body;
  width = Math.min(210, Math.max(116, ui.ctx.measureText(speech.text).width + 30));
  lines = wrapSpeech(ui.ctx, speech.text, width - 24);
  height = 18 + lines.length * 18;
  x = clamp(anchor.x - width / 2, 10, ui.width - width - 10);
  y = anchor.y - height - 16;
  if (y < 52) y = anchor.y + 12;
  ui.roundedRect(x, y, width, height, 8, '#f6e8c9ee', ui.theme.colors.wood);
  ui.ctx.beginPath();
  if (y < anchor.y) {
    ui.ctx.moveTo(clamp(anchor.x, x + 14, x + width - 14), y + height);
    ui.ctx.lineTo(clamp(anchor.x, x + 14, x + width - 14) - 6, y + height - 8);
    ui.ctx.lineTo(clamp(anchor.x, x + 14, x + width - 14) + 6, y + height - 8);
  } else {
    ui.ctx.moveTo(clamp(anchor.x, x + 14, x + width - 14), y);
    ui.ctx.lineTo(clamp(anchor.x, x + 14, x + width - 14) - 6, y + 8);
    ui.ctx.lineTo(clamp(anchor.x, x + 14, x + width - 14) + 6, y + 8);
  }
  ui.ctx.closePath();
  ui.ctx.fillStyle = '#f6e8c9ee';
  ui.ctx.fill();
  ui.ctx.strokeStyle = ui.theme.colors.wood;
  ui.ctx.lineWidth = 1;
  ui.ctx.stroke();
  for (index = 0; index < lines.length; index += 1) ui.label(lines[index], x + 12, y + 12 + index * 18, 13, ui.theme.colors.ink, 'left');
  ui.ctx.restore();
  return true;
}

function drawCrisisActions(ui, state) {
  var crisis = doorwayCrisis.ensure(state);
  var startX;
  if (state.mapId !== 'inn' || crisis.resolved || crisis.clues.length < 2) return;
  startX = ui.width / 2 - 139;
  ui.addButton({ type: 'crisisAction', id: 'favor' }, startX, ui.height - 55, 86, 44, '讲人情', ui.theme.colors.gold);
  ui.addButton({ type: 'crisisAction', id: 'ledger' }, startX + 96, ui.height - 55, 86, 44, '查账目', ui.theme.colors.jade);
  ui.addButton({ type: 'crisisAction', id: 'promise' }, startX + 192, ui.height - 55, 86, 44, '作承诺', ui.theme.colors.cinnabar);
}

function drawJoystick(ui) {
  var centerX = 62;
  var centerY = ui.height - 58;
  var vector = ui.joystickVector();
  var knobX = vector.x * 23;
  var knobY = vector.y * 23;
  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
  ui.ctx.fillStyle = '#2a211b82';
  ui.ctx.fill();
  ui.ctx.strokeStyle = '#f7e9c7b8';
  ui.ctx.lineWidth = 1.2;
  ui.ctx.stroke();
  ui.ctx.globalAlpha = 0.36;
  ui.ctx.beginPath();
  ui.ctx.moveTo(centerX - 27, centerY);
  ui.ctx.lineTo(centerX + 27, centerY);
  ui.ctx.moveTo(centerX, centerY - 27);
  ui.ctx.lineTo(centerX, centerY + 27);
  ui.ctx.stroke();
  ui.ctx.globalAlpha = 1;
  ui.ctx.beginPath();
  ui.ctx.arc(centerX + knobX, centerY + knobY, 15, 0, Math.PI * 2);
  ui.ctx.fillStyle = '#d5a74ad9';
  ui.ctx.fill();
  ui.ctx.restore();
}

function drawLoading(ui, state, current, summary) {
  var progress = clamp(summary.progress || 0, 0, 1);
  var centerX = ui.width / 2;
  ui.rect(0, SCENE_Y, ui.width, ui.height - SCENE_Y, '#342821');
  ui.rect(centerX - 179, 104, 358, 174, ui.theme.colors.paper, ui.theme.colors.wood);
  ui.label('正在装载' + current.name, centerX, 136, 18, ui.theme.colors.ink, 'center', ui.theme.fonts.title, 320);
  ui.label('只等待当前地图与上阵队员', centerX, 164, 11, ui.theme.colors.wood, 'center');
  ui.rect(centerX - 141, 190, 282, 10, '#2d211b', ui.theme.colors.muted);
  ui.rect(centerX - 139, 192, 278 * progress, 6, ui.theme.colors.gold);
  ui.label(summary.ready + '/' + summary.total, centerX, 220, 11, ui.theme.colors.wood, 'center');
  ui.addButton({ type: 'returnInn' }, centerX - 62, 234, 124, 44, '返回客栈', ui.theme.colors.panel);
}

function drawAssetFailure(ui, state, current, summary) {
  var centerX = ui.width / 2;
  ui.rect(0, SCENE_Y, ui.width, ui.height - SCENE_Y, '#342821');
  ui.rect(centerX - 191, 88, 382, 210, ui.theme.colors.paper, ui.theme.colors.cinnabar);
  ui.label(current.name + '美术加载失败', centerX, 124, 19, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title, 344);
  ui.label('无法显示正式场景，已暂停移动。', centerX, 158, 12, ui.theme.colors.ink, 'center');
  ui.label('可重新加载，或返回客栈起点。', centerX, 181, 11, ui.theme.colors.wood, 'center');
  ui.label(summary.failed + ' 项资源未就绪', centerX, 207, 10, ui.theme.colors.muted, 'center');
  ui.addButton({ type: 'retryAssets' }, centerX - 143, 236, 128, 44, '重新加载', ui.theme.colors.gold);
  ui.addButton({ type: 'returnInn' }, centerX + 15, 236, 128, 44, '返回客栈', ui.theme.colors.panel);
}

function drawExplore(ui, state) {
  var current = world.map(state.mapId);
  var viewportWidth = sceneWidth(ui);
  var sceneHeight = ui.height - SCENE_Y;
  var position = state.position || current.spawns.main;
  var camera = clamp(position.x - viewportWidth * 0.48, 0, Math.max(0, current.width - viewportWidth));
  var summary = ui.assetSummary(state);
  var layers;
  var backgroundLayers = [];
  var foregroundLayers = [];
  var items;
  var hot;
  var speaking;
  var showToast;
  var index;

  drawHud(ui, state);
  if (summary.failed > 0) {
    drawAssetFailure(ui, state, current, summary);
    return;
  }
  if (summary.loading > 0) {
    drawLoading(ui, state, current, summary);
    return;
  }

  layers = layersByOrder(ui, current.id);
  for (index = 0; index < layers.length; index += 1) {
    if (layers[index].foreground === true || number(layers[index].order, 0) >= 3) foregroundLayers.push(layers[index]);
    else backgroundLayers.push(layers[index]);
  }

  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.rect(0, SCENE_Y, viewportWidth, sceneHeight);
  ui.ctx.clip();
  for (index = 0; index < backgroundLayers.length; index += 1) drawLayer(ui, backgroundLayers[index], camera);
  items = buildSceneItems(ui, state, current);
  drawSceneItems(ui, items, camera, current, state);
  innSceneView.drawObjectLayer(ui, state, camera);
  for (index = 0; index < foregroundLayers.length; index += 1) drawLayer(ui, foregroundLayers[index], camera);
  drawTimeTint(ui, state, sceneHeight, viewportWidth);
  drawWorldDebug(ui, state, current, camera);
  ui.ctx.restore();

  hot = world.activeHotspot(state);
  speaking = drawSpeechBubble(ui, state, current, camera);
  if (state.toast && state.toast !== lastToastText) {
    lastToastText = state.toast;
    lastToastAt = Date.now();
  }
  showToast = !!state.toast && Date.now() - lastToastAt < TOAST_DURATION;
  if (!speaking && hot) {
    ui.roundedRect(viewportWidth / 2 - 94, ui.height - 103, 188, 34, 4, '#2b211de8', hotspotTone(ui, hot.type));
    drawInteractionGlyph(ui, hot.type, viewportWidth / 2 - 74, ui.height - 86, 14, hotspotTone(ui, hot.type));
    ui.label(hot.label, viewportWidth / 2 + 8, ui.height - 86, 12, ui.theme.colors.paper, 'center', ui.theme.fonts.title, 152);
  } else if (!speaking && showToast) {
    ui.rect(viewportWidth / 2 - 169, SCENE_Y + 10, 338, 28, '#2b211bd9', ui.theme.colors.gold);
    ui.label(state.toast, viewportWidth / 2, SCENE_Y + 24, 10, ui.theme.colors.paper, 'center', null, 318);
  }

  if (!state.modal && !state.dialogue) drawTaskCard(ui, state);
  drawCrisisActions(ui, state);
  if (!(state.innScene && (state.innScene.selectedObjectId || state.innScene.microGame || state.innScene.serviceOpen))) {
    drawJoystick(ui);
    if (!innScene.isBusinessMap(state)) {
      drawWoodControl(ui, { type: 'party' }, viewportWidth - 100, ui.height - 40, 48, 'party', '队伍', false, true);
    }
    drawWoodControl(ui, { type: 'interact' }, viewportWidth - 40, ui.height - 42, 60, hot ? hot.type : 'interact', hot ? '互动' : '查看', true, !!hot);
  }
  innSceneView.drawScreenUi(ui, state);
}

module.exports = {
  SCENE_WIDTH: SCENE_WIDTH,
  drawHud: drawHud,
  drawExplore: drawExplore,
  depthScale: depthScale
};
