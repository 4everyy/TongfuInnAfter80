var world = require('../../world/explore');
var worldTime = require('../../core/time');
var doorwayCrisis = require('../../../data/doorway-crisis');
var innSceneView = require('./inn-scene-v18');
var innScene = require('../../inn/scene-interactions');
var uiArt = require('../ui-art-v29');
var boons = require('../../../data/npc-signature-boon-v36');

var SCENE_WIDTH = 844;
var SCENE_Y = 42;
var HERO_HEIGHT = 112;
var NPC_HEIGHT = 104;
var MIN_DEPTH_SCALE = 0.88;
var MAX_DEPTH_SCALE = 1.04;
var TOAST_DURATION = 2400;
var lastToastText = '';
var lastToastAt = 0;

// P2 江湖气息：行走尘土 / 道具淡入淡出 运行态（不写入存档）
var dustParticles = [];
var lastDustAt = 0;
var propAppearAt = {};
var prevPropVisible = {};
var prevPropInitialized = false;
var lastMapId = null;

// P6-D3 队列 lerp 插值 + 加入淡入（视觉平滑，碰撞仍用逻辑位置）
var followerLerp = {};
var followerJoinAt = {};
var lastPartySeen = [];

// P4 江湖气息：热点分级高亮 / 调查冲击波 运行态（不写入存档）
var clamp = require('../../core/math-utils').clamp;
var hotspotRevealAt = {};
var prevHotspotNear = {};

function number(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function stringHash(value) {
  var str = String(value);
  var hash = 0;
  var index;
  for (index = 0; index < str.length; index += 1) {
    hash = ((hash << 5) - hash + str.charCodeAt(index)) | 0;
  }
  return (hash < 0 ? hash + 2147483648 : hash) / 2147483648;
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
    uiArt.drawPanel(ui, 'card', x, y, 44, 44, { fill: '#ead7aaee' });
    drawInteractionGlyph(ui, 'investigate', x + 22, y + 22, 18, ui.theme.colors.cinnabar);
    ui.hitArea({ type: 'task' }, x, y, 44, 44);
    return;
  }
  x = right - width;
  uiArt.drawPanel(ui, 'card', x, y, width, height, { fill: '#f3e4bde8' });
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

function drawLayer(ui, layer, camera, state) {
  var image = ui.assets.image(layer.src);
  var parallax = number(layer.parallax, 1);
  var x = number(layer.x, 0) - camera * parallax;
  var y = SCENE_Y + number(layer.y, 0);
  var weather = state && state.mapVariants && state.mapVariants.weather;
  var alpha = number(layer.alpha, 1);
  var width;
  var height;
  if (layer.weather && weather && layer.weather !== weather) return false;
  if (layer.phase && ui.phaseLayerAlpha) alpha *= ui.phaseLayerAlpha(layer.phase);
  if (alpha <= 0.001) return false;
  if (!image) return false;
  width = number(layer.worldWidth, image.width);
  height = number(layer.worldHeight, image.height);
  ui.ctx.save();
  ui.ctx.globalAlpha = alpha;
  ui.ctx.globalCompositeOperation = layer.blend || 'source-over';
  ui.ctx.drawImage(image, x, y, width, height);
  ui.ctx.restore();
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
    displayScale: number(npc && npc.displayScale, number(art.displayScale, 1)) * number(scene.characterScale, 1),
    shadowScale: number(npc && npc.shadowScale, number(art.shadowScale, npc ? 0.9 : 1)),
    shadowAlpha: number(npc && npc.shadowAlpha, number(art.shadowAlpha, npc ? 0.12 : 0.14))
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
  var propId;
  var currentPropVisible;

  if (lastMapId !== state.mapId) {
    propAppearAt = {};
    prevPropVisible = {};
    prevPropInitialized = false;
    hotspotRevealAt = {};
    prevHotspotNear = {};
    lastMapId = state.mapId;
  }

  currentPropVisible = {};
  for (index = 0; index < props.length; index += 1) {
    propId = props[index].id || (props[index].src + ':' + index);
    if (world.conditionsMet(props[index], state)) {
      currentPropVisible[propId] = true;
      if (!propAppearAt.hasOwnProperty(propId)) {
        propAppearAt[propId] = prevPropInitialized && !prevPropVisible[propId] ? Date.now() : 0;
      }
    }
  }
  for (propId in propAppearAt) {
    if (!currentPropVisible[propId]) delete propAppearAt[propId];
  }
  prevPropVisible = currentPropVisible;
  prevPropInitialized = true;

  for (index = 0; index < props.length; index += 1) {
    if (!world.conditionsMet(props[index], state)) continue;
    image = ui.assets.image(props[index].src);
    if (!image) continue;
    if (props[index].obstacleId) linkedObstacles[props[index].obstacleId] = true;
    geometry = propGeometry(props[index], image);
    propId = props[index].id || (props[index].src + ':' + index);
    items.push({
      kind: 'prop',
      source: props[index],
      image: image,
      geometry: geometry,
      appearAt: propAppearAt[propId] || 0,
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

  // 调查冲击：记录每个热点首次进入 near/active 的时间，离开后清除以备再次触发
  var nearNow = {};
  for (index = 0; index < items.length; index += 1) {
    if (items[index].kind !== 'hotspot') continue;
    if (items[index].status === 'near' || items[index].active) {
      nearNow[items[index].source.id] = true;
      if (!hotspotRevealAt[items[index].source.id]) {
        hotspotRevealAt[items[index].source.id] = Date.now();
      }
    }
  }
  for (var revealId in hotspotRevealAt) {
    if (!nearNow[revealId] && !prevHotspotNear[revealId + ':locked']) {
      delete hotspotRevealAt[revealId];
    }
  }
  prevHotspotNear = nearNow;

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
    // B5 NPC 走动暗示：wander 在原站位附近做正弦摆动（纯视觉，碰撞用逻辑坐标）
    var visX = npc.x;
    var visY = npc.y;
    if (npc.wander) {
      var wSeed = stringHash(npc.id || npc.roleId || npc.name || '') * 6.2832;
      var wAmp = number(npc.wander.amplitude, 20);
      var wSpeed = number(npc.wander.speed, 0.5);
      var wT = Date.now() / 1000;
      visX = npc.x + Math.sin(wT * wSpeed + wSeed) * wAmp;
      visY = npc.y + Math.cos(wT * wSpeed * 0.7 + wSeed) * wAmp * 0.4;
    }
    items.push({
      kind: 'npc',
      source: npc,
      x: visX,
      y: visY,
      sortY: number(npc.sortY, visY),
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
  // D3：检测新加入队伍的成员（用于加入淡入动画）
  if (lastPartySeen.length !== followers.length
    || followers.some((fid, fi) => fid !== lastPartySeen[fi])) {
    followers.forEach((fid) => {
      if (lastPartySeen.indexOf(fid) < 0 && !followerJoinAt[fid]) {
        followerJoinAt[fid] = Date.now();
      }
    });
  }
  lastPartySeen = followers.slice();

  for (index = 0; index < followers.length; index += 1) {
    id = followers[index];
    point = state.followers && state.followers[id] ? state.followers[id] : followerFallback(state, index);
    // D3：lerp 插值（视觉平滑），碰撞仍用逻辑位置
    if (!followerLerp[id]) {
      followerLerp[id] = { x: point.x, y: point.y };
    } else {
      followerLerp[id].x += (point.x - followerLerp[id].x) * 0.18;
      followerLerp[id].y += (point.y - followerLerp[id].y) * 0.18;
    }
    items.push({
      kind: 'party',
      id: id,
      x: followerLerp[id].x,
      y: followerLerp[id].y,
      facing: point.facing || state.facing || 'right',
      moving: !!point.moving,
      leader: false,
      joinAt: followerJoinAt[id] || 0,
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

// C4 装饰道具摆动：灯笼轻微左右摆、旗帜强风摆、水面反光闪烁
function drawProp(ui, item, camera, state) {
  var prop = item.source;
  var geometry = item.geometry;
  var parallax = number(prop.parallax, 1);
  var appearAlpha = item.appearAt ? clamp((Date.now() - item.appearAt) / 300, 0, 1) : 1;
  var sway = prop.sway;
  var ctx = ui.ctx;
  ctx.save();
  ctx.globalAlpha = number(prop.alpha, 1) * appearAlpha;
  if (sway) {
    // 摆动锚点：道具底部中心
    var anchorX = geometry.drawX - camera * parallax + geometry.width / 2;
    var anchorY = SCENE_Y + geometry.drawY + geometry.height;
    var t = Date.now() / 1000;
    var mapWind = mapArt(ui, state.mapId).wind;
    var windFactor = mapWind && typeof mapWind.x === 'number' ? mapWind.x : 0.25;
    var ampDeg = number(sway.amplitude, 2);
    var speed = number(sway.speed, 1.2);
    var angle = Math.sin(t * speed + windFactor * 2) * ampDeg * Math.PI / 180;
    // 风向加成：风越大摆动越偏
    angle += windFactor * number(sway.windBias, 0.3) * ampDeg * Math.PI / 180;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(angle);
    ctx.translate(-anchorX, -anchorY);
  }
  ctx.drawImage(
    item.image,
    geometry.drawX - camera * parallax,
    SCENE_Y + geometry.drawY,
    geometry.width,
    geometry.height
  );
  // 水面道具周期性反光闪烁
  if (prop.shimmer) {
    var shT = Date.now() / 1000;
    var shPhase = (shT * number(prop.shimmer.speed, 0.8)) % 1;
    var shAlpha = (0.5 + 0.5 * Math.sin(shPhase * Math.PI * 2)) * number(prop.shimmer.strength, 0.3);
    if (shAlpha > 0.05) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = shAlpha;
      ctx.drawImage(
        item.image,
        geometry.drawX - camera * parallax,
        SCENE_Y + geometry.drawY,
        geometry.width,
        geometry.height
      );
    }
  }
  ctx.restore();
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
  uiArt.drawIcon(ui, type, x, y, size, color);
}

// 热点分级：active（已激活）/ near（邻近）/ far（远处可见）
function hotspotTier(item) {
  if (item.active) return 'active';
  if (item.status === 'near') return 'near';
  return 'far';
}

// 差异化矢量图标：按交互类型绘制不同形状（不依赖美术资源）
function drawHotspotGlyph(ui, type, x, y, size, color) {
  var ctx = ui.ctx;
  var s = size;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, s * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'investigate') {
    // 放大镜：圆 + 斜柄
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.6, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y + s * 0.16);
    ctx.lineTo(x + s * 0.4, y + s * 0.4);
    ctx.stroke();
  } else if (type === 'battle') {
    // 交叉双剑 + 双圆护手
    ctx.beginPath();
    ctx.moveTo(x - s * 0.38, y - s * 0.38);
    ctx.lineTo(x + s * 0.28, y + s * 0.1);
    ctx.moveTo(x + s * 0.38, y - s * 0.38);
    ctx.lineTo(x - s * 0.28, y + s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - s * 0.38, y - s * 0.38, s * 0.1, 0, Math.PI * 2);
    ctx.arc(x + s * 0.38, y - s * 0.38, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'dialogue' || type === 'inn') {
    // 对话气泡：圆角矩形 + 下指小三角
    roundedRectPath(ctx, x - s * 0.4, y - s * 0.32, s * 0.8, s * 0.54, s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.12, y + s * 0.2);
    ctx.lineTo(x - s * 0.22, y + s * 0.4);
    ctx.lineTo(x + s * 0.04, y + s * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'mechanism') {
    // 齿轮：中心圆 + 8 个小齿
    ctx.beginPath();
    ctx.arc(x, y, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    var teeth = 8;
    var ti;
    for (ti = 0; ti < teeth; ti += 1) {
      var ang = (ti / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * s * 0.28, y + Math.sin(ang) * s * 0.28);
      ctx.lineTo(x + Math.cos(ang) * s * 0.42, y + Math.sin(ang) * s * 0.42);
      ctx.stroke();
    }
  } else {
    // 默认 / quest：菱形
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.4);
    ctx.lineTo(x + s * 0.32, y);
    ctx.lineTo(x, y + s * 0.4);
    ctx.lineTo(x - s * 0.32, y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHotspot(ui, item, camera, current) {
  var scale = depthScale(current, item.sortY);
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  var t = Date.now() / 1000;
  var tier = hotspotTier(item);
  var tone = hotspotTone(ui, item.source.type);
  var pulse;
  var radius;
  var visibility;
  var ringAlpha;
  var lineWidth;
  var badgeSize;
  var badgeOffset = 24 * scale;
  var revealAt;
  var revealAge;
  var fillGrad;
  var haloGrad;

  // 分级参数：active 高频强脉动 / near 中频 / far 低频弱
  if (tier === 'active') {
    pulse = 0.94 + (Math.sin(t * 4) + 1) * 0.08;
    radius = 16 * scale * pulse;
    visibility = 1;
    ringAlpha = 1;
    lineWidth = 2.2;
    badgeSize = 12 * scale * pulse;
  } else if (tier === 'near') {
    pulse = 0.94 + (Math.sin(t * 2.5) + 1) * 0.06;
    radius = 12 * scale * pulse;
    visibility = 0.72;
    ringAlpha = 0.68;
    lineWidth = 1.7;
    badgeSize = 10.5 * scale * pulse;
  } else {
    pulse = 0.94 + (Math.sin(t * 1.5) + 1) * 0.04;
    radius = 9 * scale * pulse;
    visibility = 0.38;
    ringAlpha = 0.38;
    lineWidth = 1.3;
    badgeSize = 9 * scale * pulse;
  }

  // 调查冲击波：首次进入 near/active 后 0.9s 内绘制快速扩散环
  revealAt = hotspotRevealAt[item.source.id];
  if (revealAt) {
    revealAge = (Date.now() - revealAt) / 900;
    if (revealAge < 1) {
      ui.ctx.save();
      ui.ctx.globalAlpha = (1 - revealAge) * 0.85;
      ui.ctx.strokeStyle = tone;
      ui.ctx.lineWidth = Math.max(0.8, 2.4 * (1 - revealAge));
      ui.ctx.translate(x, y + 1);
      ui.ctx.scale(1, 0.42);
      ui.ctx.beginPath();
      ui.ctx.arc(0, 0, radius + revealAge * 30 * scale, 0, Math.PI * 2);
      ui.ctx.stroke();
      ui.ctx.restore();
    }
  }

  // 地面光圈填充：near/active 带径向渐变（增强空间锚定感）
  if (tier !== 'far') {
    ui.ctx.save();
    ui.ctx.globalAlpha = ringAlpha * 0.9;
    ui.ctx.translate(x, y + 1);
    ui.ctx.scale(1, 0.42);
    fillGrad = ui.ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
    fillGrad.addColorStop(0, tier === 'active' ? 'rgba(213,167,74,0.22)' : 'rgba(213,167,74,0.10)');
    fillGrad.addColorStop(1, 'rgba(213,167,74,0)');
    ui.ctx.fillStyle = fillGrad;
    ui.ctx.beginPath();
    ui.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ui.ctx.fill();
    ui.ctx.restore();
  }

  // 地面描边环
  ui.ctx.save();
  ui.ctx.globalAlpha = ringAlpha;
  ui.ctx.strokeStyle = tone;
  ui.ctx.lineWidth = lineWidth;
  ui.ctx.translate(x, y + 1);
  ui.ctx.scale(1, 0.42);
  ui.ctx.beginPath();
  ui.ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ui.ctx.stroke();
  ui.ctx.restore();

  // 头顶徽章：active 多一层金色外发光
  ui.ctx.save();
  ui.ctx.globalAlpha = tier === 'active' ? 1 : Math.min(1, visibility + 0.18);
  if (tier === 'active') {
    haloGrad = ui.ctx.createRadialGradient(x, y - badgeOffset, badgeSize, x, y - badgeOffset, badgeSize + 9);
    haloGrad.addColorStop(0, 'rgba(213,167,74,0.36)');
    haloGrad.addColorStop(1, 'rgba(213,167,74,0)');
    ui.ctx.fillStyle = haloGrad;
    ui.ctx.beginPath();
    ui.ctx.arc(x, y - badgeOffset, badgeSize + 9, 0, Math.PI * 2);
    ui.ctx.fill();
  }
  ui.ctx.fillStyle = '#2b211de8';
  ui.ctx.strokeStyle = tone;
  ui.ctx.lineWidth = tier === 'active' ? 2 : 1.4;
  ui.ctx.beginPath();
  ui.ctx.arc(x, y - badgeOffset, badgeSize, 0, Math.PI * 2);
  ui.ctx.fill();
  ui.ctx.stroke();
  ui.ctx.restore();

  // 差异化矢量图标
  drawHotspotGlyph(ui, item.source.type, x, y - badgeOffset, badgeSize * 1.5, tone);
}

function roundedRectPath(ctx, x, y, w, h, r) {
  var radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function shortExitDestination(rawName) {
  var name = String(rawName || '').trim();
  name = name.replace(/^长风客栈/, '').replace(/^雁回镇/, '');
  if (!name) name = String(rawName || '前路');
  if (name.length > 4) name = name.slice(-3);
  return name;
}

function drawExit(ui, item, camera) {
  var ctx = ui.ctx;
  var x = item.x - camera;
  var y = SCENE_Y + item.y - 36;
  var locked = !!item.locked;
  var tone = locked ? ui.theme.colors.muted : ui.theme.colors.jade;
  var accent = locked ? '#8a7a5c' : ui.theme.colors.gold;
  var glowColor = locked ? 'rgba(167,149,112,0.40)' : 'rgba(213,167,74,0.58)';
  var t = Date.now() / 1000;
  var near = item.distance < 138;
  var pulse = 0.92 + (Math.sin(t * 2.2) * 0.5 + 0.5) * (near ? 0.10 : 0.08);
  var bob = Math.sin(t * 1.6) * 1.4;
  var badgeY = y + bob;

  // 地面光池：径向渐变椭圆光晕，强化"传送点"空间感
  ctx.save();
  ctx.translate(x, y + 20);
  ctx.scale(1, 0.34);
  var groundGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 32);
  groundGrad.addColorStop(0, glowColor);
  groundGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 悬浮徽章：投影 + 光晕 + 双层金属环 + 渐变内盘
  ctx.save();
  // 投影
  ctx.save();
  ctx.translate(x, badgeY + 16);
  ctx.scale(1, 0.30);
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = '#150d07';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 呼吸光晕（仅解锁）：靠近时光晕更亮、外扩，形成"入口被唤醒"的反馈
  if (!locked) {
    ctx.globalAlpha = (near ? 0.72 : 0.55) * pulse;
    var glowR = near ? 30 : 27;
    var glowGrad = ctx.createRadialGradient(x, badgeY, 8, x, badgeY, glowR);
    glowGrad.addColorStop(0, 'rgba(213,167,74,0)');
    glowGrad.addColorStop(0.55, 'rgba(213,167,74,0.38)');
    glowGrad.addColorStop(1, 'rgba(213,167,74,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, badgeY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 外金属环
  var R = 16 * pulse;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(x, badgeY, R, 0, Math.PI * 2);
  ctx.stroke();

  // 渐变内盘
  var discGrad = ctx.createLinearGradient(x, badgeY - R, x, badgeY + R);
  discGrad.addColorStop(0, locked ? '#3b332b' : '#3a2a20');
  discGrad.addColorStop(1, locked ? '#201b15' : '#1b130f');
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.arc(x, badgeY, R - 1.6, 0, Math.PI * 2);
  ctx.fill();

  // 内侧主题色细环
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 1;
  ctx.strokeStyle = tone;
  ctx.beginPath();
  ctx.arc(x, badgeY, R - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 图标
  uiArt.drawIcon(ui, locked ? 'lock' : 'exit', x, badgeY, 16, accent);
  ctx.restore();

  // 近距离提示卡片：路引门牌 —— 标注目的地，暖纸 + 朱砂钤印分隔 + 状态副标
  if (near) {
    var destRaw = '';
    try { destRaw = world.map(item.source.target).name || ''; } catch (e) { destRaw = ''; }
    var dest = shortExitDestination(destRaw);
    var mainText = locked ? '道路未通' : dest;
    var subText = locked ? '尚需时日' : '过此即至';
    var mainColor = locked ? ui.theme.colors.wood : ui.theme.colors.ink;
    var subColor = locked ? '#9a8a68' : ui.theme.colors.cinnabar;
    var borderColor = locked ? '#8a7a5c' : accent;
    ctx.save();
    ctx.font = '11px ' + ui.theme.fonts.title;
    var tw = ctx.measureText(mainText).width;
    ctx.font = '8px ' + ui.theme.fonts.title;
    var sw = ctx.measureText(subText).width;
    var cardW = Math.min(120, Math.max(tw, sw) + 34);
    var cardH = 31;
    var cardX = clamp(x - cardW / 2, 6, ui.width - cardW - 6);
    var cardY = badgeY - 27 - 8 - cardH;

    // 卡片投影
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = '#150d07';
    roundedRectPath(ctx, cardX + 1, cardY + 4, cardW, cardH, 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 卡片主体（暖纸渐变 + 细描边）
    var cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#f8eed6f5');
    cardGrad.addColorStop(1, '#e6d2a6f0');
    ctx.fillStyle = cardGrad;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, 5);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // 顶部朱砂分隔线 + 两端钤印圆点（仅解锁，仿路引印章）
    if (!locked) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = ui.theme.colors.cinnabar;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 9, cardY + 9);
      ctx.lineTo(cardX + cardW - 9, cardY + 9);
      ctx.stroke();
      ctx.fillStyle = ui.theme.colors.cinnabar;
      ctx.beginPath();
      ctx.arc(cardX + 5.5, cardY + 9, 1.3, 0, Math.PI * 2);
      ctx.arc(cardX + cardW - 5.5, cardY + 9, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 主文字（目的地名）
    ui.label(mainText, cardX + cardW / 2, cardY + 16, 11, mainColor, 'center', ui.theme.fonts.title, cardW - 14);
    // 副标（开放 / 锁定状态）
    ui.label(subText, cardX + cardW / 2, cardY + 25, 8, subColor, 'center', ui.theme.fonts.title, cardW - 12);

    // 下指三角（连接卡片与徽章）
    var px = clamp(x, cardX + 10, cardX + cardW - 10);
    ctx.fillStyle = '#e6d2a6f0';
    ctx.beginPath();
    ctx.moveTo(px - 5, cardY + cardH - 0.5);
    ctx.lineTo(px, cardY + cardH + 6);
    ctx.lineTo(px + 5, cardY + cardH - 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.restore();
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  var rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// 身份显示牌：NPC 头顶古风牌匾（深底金边 + 上沿高光 + 身份色点 + 下指尾）
// 身份色点：角色/营业=金，任务=朱砂，其余=青
function drawNpcNamePlate(ui, npc, x, headTopY, state) {
  var name = npc ? npc.name : null;
  if (!name || npc.showName === false) return;
  var ctx = ui.ctx;
  var colors = ui.theme.colors;
  var fontSize = 10;
  var maxTextW = 88;
  var padX = 9;
  var padY = 4;

  ctx.save();
  ctx.font = fontSize + 'px ' + ui.theme.fonts.title;
  var textW = Math.min(maxTextW, Math.max(20, Math.ceil(ctx.measureText(name).width)));
  ctx.restore();

  var boxW = textW + padX * 2;
  var boxH = fontSize + padY * 2;
  var boxX = Math.round(x - boxW / 2);
  var boxBottom = Math.round(headTopY - 4);
  var boxY = boxBottom - boxH;

  var hint = npcHintType(npc, state);
  var accent = npc.roleId ? colors.gold
    : (hint === 'task' ? colors.cinnabar : (hint === 'merchant' ? colors.gold : colors.jade));

  ctx.save();
  // 投影
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 4);
  ctx.fillStyle = 'rgba(43,33,28,0.86)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // 金色描边
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.gold;
  ctx.globalAlpha = 0.9;
  roundRectPath(ctx, boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1, 3.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // 上沿内侧高光
  ctx.strokeStyle = 'rgba(245,225,170,0.28)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(boxX + 5, boxY + 2.3);
  ctx.lineTo(boxX + boxW - 5, boxY + 2.3);
  ctx.stroke();
  // 身份色点
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(boxX + 6, boxY + boxH / 2, 1.7, 0, Math.PI * 2);
  ctx.fill();
  // 下指尾（连接牌匾与头顶）
  ctx.fillStyle = 'rgba(43,33,28,0.86)';
  ctx.beginPath();
  ctx.moveTo(x - 4, boxBottom - 0.5);
  ctx.lineTo(x, boxBottom + 5);
  ctx.lineTo(x + 4, boxBottom - 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.gold;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // 牌匾文字
  ui.label(name, x, boxY + boxH / 2 + 0.5, fontSize, colors.paper, 'center', ui.theme.fonts.title, maxTextW);
}

function drawNpc(ui, item, camera, current, state) {
  var scale = depthScale(current, item.sortY);
  var tuning = characterTuning(ui, current, item.source.roleId, item.source);
  var spriteHeight = NPC_HEIGHT * scale * tuning.displayScale;
  var idleAmp = number(item.source.idleAmplitude, item.source.roleId ? .35 : .2);
  var idleSeed = stringHash(item.source.id || item.source.roleId || item.source.name || '');
  var t = Date.now() / 1000;
  var bob = Math.sin(t * 2.0 + idleSeed * 6.2832) * idleAmp;
  var shadowPulse = 1 + Math.sin(t * 2.0 + idleSeed * 6.2832) * 0.03 * idleAmp;
  var x = item.x - camera;
  var y = SCENE_Y + item.y + bob;
  var drawn;
  ui.heroShadow(x, y, spriteHeight, tuning.shadowScale * shadowPulse, tuning.shadowAlpha);
  drawn = ui.artNpc(item.source, x, y, spriteHeight, item.x, item.y);
  if (!drawn) ui.fallbackNpc(item.source, x, y, spriteHeight);
  var nameDistance = Math.hypot(state.position.x - item.x, state.position.y - item.y);
  var nameHint = npcHintType(item.source, state);
  if (nameHint === 'task' || nameDistance <= (item.source.roleId ? 154 : 112)) {
    drawNpcNamePlate(ui, item.source, x, y - spriteHeight, state);
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
  // P5：头部转向关注光点 + 营业动画 + 状态气泡
  drawNpcAttention(ui, item, camera, current, state);
  drawNpcCraft(ui, item, camera, current, state);
  drawNpcHint(ui, item, camera, current, state);
}

function drawPartyMember(ui, item, camera, current, state) {
  var scale = depthScale(current, item.sortY);
  var tuning = characterTuning(ui, current, item.id);
  var spriteHeight = HERO_HEIGHT * scale * tuning.displayScale;
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  // D3 加入淡入：新成员进队时 360ms 内 alpha 从 0.12 渐变到 1
  var joinAge = item.joinAt ? Date.now() - item.joinAt : 0;
  var joinAlpha = item.joinAt ? clamp(joinAge / 360, 0.12, 1) : 1;
  if (item.leader && item.moving) updateDust(ui, state, current, item.x, item.y, item.facing);
  ui.ctx.save();
  ui.ctx.globalAlpha = joinAlpha;
  ui.heroShadow(x, y, spriteHeight, tuning.shadowScale, tuning.shadowAlpha);
  ui.artHero(item.id, x, y, spriteHeight, item.facing, item.moving, item.x, item.y, null, item.id);
  if (item.leader) {
    // D4 队长标记：呼吸光晕 + 金色三角
    var leaderT = Date.now() / 1000;
    var glowPulse = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(leaderT * 2.4));
    var haloGrad = ui.ctx.createRadialGradient(x, y - spriteHeight - 12, 3, x, y - spriteHeight - 12, 14);
    haloGrad.addColorStop(0, 'rgba(213,167,74,' + (0.4 * glowPulse).toFixed(3) + ')');
    haloGrad.addColorStop(1, 'rgba(213,167,74,0)');
    ui.ctx.fillStyle = haloGrad;
    ui.ctx.beginPath();
    ui.ctx.arc(x, y - spriteHeight - 12, 14, 0, Math.PI * 2);
    ui.ctx.fill();
    ui.ctx.fillStyle = ui.theme.colors.gold;
    ui.ctx.beginPath();
    ui.ctx.moveTo(x, y - spriteHeight - 8);
    ui.ctx.lineTo(x - 5, y - spriteHeight - 15);
    ui.ctx.lineTo(x + 5, y - spriteHeight - 15);
    ui.ctx.closePath();
    ui.ctx.fill();
  }
  ui.ctx.restore();
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
    if (items[index].kind === 'prop') drawProp(ui, items[index], camera, state);
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

function drawWeather(ui, state, current, sceneHeight, width) {
  var weather = state.mapVariants && state.mapVariants.weather || current.weather || 'clear';
  var now;
  var index;
  var x;
  var y;
  var gradient;
  if (weather !== 'rain') return;
  now = Date.now() / 18;
  ui.ctx.save();
  gradient = ui.ctx.createLinearGradient(0, SCENE_Y, 0, SCENE_Y + sceneHeight);
  gradient.addColorStop(0, '#72899812');
  gradient.addColorStop(1, '#17334938');
  ui.ctx.fillStyle = gradient;
  ui.ctx.fillRect(0, SCENE_Y, width, sceneHeight);
  ui.ctx.strokeStyle = '#d8e4df70';
  ui.ctx.lineWidth = 1;
  ui.ctx.beginPath();
  for (index = 0; index < 54; index += 1) {
    x = (index * 97 + now * 3.1) % (width + 70) - 35;
    y = SCENE_Y + (index * 53 + now * 5.7) % sceneHeight;
    ui.ctx.moveTo(x, y);
    ui.ctx.lineTo(x - 7, y + 15);
  }
  ui.ctx.stroke();
  ui.ctx.globalAlpha = 0.16;
  ui.ctx.fillStyle = '#dbe8e2';
  ui.ctx.fillRect(0, SCENE_Y + sceneHeight - 28, width, 28);
  ui.ctx.restore();
}

// 地域分组：用于自动推断氛围特色
function regionGroup(mapId) {
  if (mapId === 'inn' || mapId === 'jiangnan_branch') return 'indoor';
  if (mapId === 'yard' || mapId === 'river_yard') return 'courtyard';
  if (mapId === 'street' || mapId === 'grain_market' || mapId === 'river_market') return 'market';
  if (mapId === 'locust_lane' || mapId === 'paper_alley' || mapId === 'scale_contract_lane') return 'alley';
  if (mapId === 'tea_shed' || mapId === 'east_gate' || mapId === 'canal_checkpoint') return 'gate';
  if (mapId === 'stone_bridge' || mapId === 'north_road') return 'wild';
  if (mapId === 'jiangnan_dock' || mapId === 'rain_ferry') return 'waterfront';
  if (mapId === 'paper_mill' || mapId === 'jiangnan_spice_workshop' || mapId === 'old_banquet_kitchen') return 'workshop';
  if (mapId === 'guild_warehouse' || mapId === 'guild_office' || mapId === 'charity_granary'
    || mapId === 'money_house' || mapId === 'merchant_alliance_hall' || mapId === 'old_ledger_vault') return 'vault';
  if (mapId === 'old_post') return 'courtyard';
  return 'outdoor';
}

// 江湖气息：环境氛围层（地域推断 + mapArt.atmosphere 覆盖 + 时段天气联动）
function ambientProfile(mapId, weather, phase, atmosphereOverride) {
  var group = regionGroup(mapId);
  var indoor = group === 'indoor';
  var vault = group === 'vault';
  var profile = {
    dust: indoor ? 18 : vault ? 12 : 0,
    leaf: 0,
    firefly: phase === 'evening' && !indoor && !vault ? 10 : 0,
    lanternGlow: indoor ? 3 : (group === 'gate' ? 2 : 0),
    mist: 0,
    ember: 0,
    smoke: null,
    splash: 0,
    petal: 0,
    dustColor: indoor ? 'rgba(245,214,140,0.55)' : vault ? 'rgba(200,190,170,0.35)' : 'rgba(232,219,180,0.40)',
  };

  // 地域特色
  if (group === 'courtyard') { profile.mist = 6; profile.leaf = 8; }
  else if (group === 'market') { profile.dust = 10; profile.leaf = 4; }
  else if (group === 'alley') { profile.leaf = 12; profile.petal = 4; }
  else if (group === 'gate') { profile.leaf = 6; }
  else if (group === 'wild') { profile.leaf = 16; profile.mist = 4; }
  else if (group === 'waterfront') { profile.mist = 10; profile.splash = 6; }
  else if (group === 'workshop') {
    profile.ember = mapId === 'old_banquet_kitchen' ? 5 : 3;
    profile.smoke = { strength: 1 };
    if (mapId === 'paper_mill') profile.petal = 8;
    if (mapId === 'jiangnan_spice_workshop') profile.dust = 8;
  }
  // 室内灶台火星（inn/jiangnan_branch）
  if (indoor) profile.ember = 2;

  // mapArt.atmosphere 覆盖
  if (atmosphereOverride) {
    if (typeof atmosphereOverride.dust === 'number') profile.dust = atmosphereOverride.dust;
    if (typeof atmosphereOverride.leaf === 'number') profile.leaf = atmosphereOverride.leaf;
    if (typeof atmosphereOverride.firefly === 'number') profile.firefly = atmosphereOverride.firefly;
    if (typeof atmosphereOverride.lantern === 'number') profile.lanternGlow = atmosphereOverride.lantern;
    if (typeof atmosphereOverride.mist === 'number') profile.mist = atmosphereOverride.mist;
    if (typeof atmosphereOverride.ember === 'number') profile.ember = atmosphereOverride.ember;
    if (typeof atmosphereOverride.petal === 'number') profile.petal = atmosphereOverride.petal;
    if (typeof atmosphereOverride.splash === 'number') profile.splash = atmosphereOverride.splash;
    if (atmosphereOverride.smoke) profile.smoke = atmosphereOverride.smoke;
  }

  // 时段 × 天气联动
  if (weather === 'rain') {
    profile.leaf = Math.floor(profile.leaf * 0.4);
    profile.petal = Math.floor(profile.petal * 0.3);
    profile.firefly = 0;
    profile.ember = Math.floor(profile.ember * 0.5);
    profile.splash = Math.max(profile.splash, group === 'waterfront' ? 10 : 6);
  }
  if (phase === 'morning') profile.mist = Math.floor(profile.mist * 1.4);
  if (phase === 'noon') { profile.dust = Math.floor(profile.dust * 0.7); profile.mist = Math.floor(profile.mist * 0.5); }
  if (phase === 'evening' && !indoor) profile.lanternGlow = Math.max(profile.lanternGlow, 2);
  return profile;
}

function hashSeed(value) {
  var h = (value * 2654435761) % 2147483647;
  return (h < 0 ? h + 2147483647 : h) / 2147483647;
}

// P9 atmosphereLevel 降级：0=仅时段色块+天气 / 1=基础粒子减半 / 2=完整 / 3=全部+声景
function atmosphereLevel(state) {
  return number(state && state.settings && state.settings.atmosphereLevel, 2);
}

function drawAmbience(ui, state, current, viewportWidth, sceneHeight, camera) {
  var ctx = ui.ctx;
  var level = atmosphereLevel(state);
  if (level <= 0) return;
  var phase = state.worldTime && state.worldTime.phase || 'morning';
  var weather = state.mapVariants && state.mapVariants.weather || current.weather || 'clear';
  var atmosphereOverride = mapArt(ui, current.id).atmosphere;
  var profile = ambientProfile(current.id, weather, phase, atmosphereOverride);
  // 降级：level=1 时所有粒子数量减半
  if (level === 1) {
    profile.dust = Math.floor(profile.dust * 0.5);
    profile.leaf = Math.floor(profile.leaf * 0.5);
    profile.firefly = Math.floor(profile.firefly * 0.5);
    profile.lanternGlow = Math.floor(profile.lanternGlow * 0.5);
    profile.mist = Math.floor(profile.mist * 0.5);
    profile.ember = Math.floor(profile.ember * 0.5);
    profile.petal = Math.floor(profile.petal * 0.5);
    profile.splash = Math.floor(profile.splash * 0.5);
    if (profile.smoke) profile.smoke.strength = (profile.smoke.strength || 1) * 0.5;
  }
  var mapWind = mapArt(ui, current.id).wind;
  var windX = mapWind && typeof mapWind.x === 'number' ? mapWind.x : 0.25;
  var t = Date.now() / 1000;
  var index;
  var seed;
  var x;
  var y;
  var alpha;
  var size;
  var speed;

  // 暖色光尘（室内烛火气）
  if (profile.dust) {
    ctx.save();
    ctx.fillStyle = profile.dustColor;
    for (index = 0; index < profile.dust; index += 1) {
      seed = hashSeed(index + 31);
      x = (seed * viewportWidth + Math.sin(t * 0.3 + seed * 6.28) * 10 + t * (4 + seed * 3)) % viewportWidth;
      if (x < 0) x += viewportWidth;
      y = sceneHeight * (0.1 + seed * 0.8) + Math.sin(t * 0.6 + seed * 6) * 6;
      alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.2 + seed * 9));
      size = 1 + seed * 1.6;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 落叶/花瓣（室外）
  if (profile.leaf) {
    ctx.save();
    ctx.fillStyle = weather === 'rain' ? 'rgba(150,140,100,0.5)' : 'rgba(196,124,58,0.6)';
    for (index = 0; index < profile.leaf; index += 1) {
      seed = hashSeed(index + 113);
      speed = 16 + seed * 22;
      x = (seed * (viewportWidth + 80) + Math.sin(t * 1.4 + seed * 8) * 40 - t * speed * 0.3) % (viewportWidth + 80);
      if (x < 0) x += viewportWidth + 80;
      y = (seed * sceneHeight + t * speed) % (sceneHeight + 30);
      alpha = 0.4 + 0.4 * seed;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(x, SCENE_Y + y);
      ctx.rotate(Math.sin(t * 2 + seed * 7) * 0.8 + t * (0.6 + seed));
      ctx.scale(1, 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, 3 + seed * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 夜晚萤火
  if (profile.firefly) {
    ctx.save();
    for (index = 0; index < profile.firefly; index += 1) {
      seed = hashSeed(index + 257);
      x = seed * viewportWidth + Math.sin(t * 0.8 + seed * 6) * 24;
      y = sceneHeight * 0.2 + seed * sceneHeight * 0.6 + Math.cos(t * 0.5 + seed * 5) * 18;
      alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.5 + seed * 8));
      ctx.globalAlpha = alpha;
      var grad = ctx.createRadialGradient(x, SCENE_Y + y, 0, x, SCENE_Y + y, 6);
      grad.addColorStop(0, 'rgba(190,255,180,0.9)');
      grad.addColorStop(1, 'rgba(190,255,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 灯笼/火光 暖色呼吸光斑
  if (profile.lanternGlow) {
    ctx.save();
    var positions = (current.id === 'inn')
      ? [[viewportWidth * 0.2, 70], [viewportWidth * 0.5, 60], [viewportWidth * 0.8, 70]]
      : [[viewportWidth * 0.3, 80], [viewportWidth * 0.7, 80]];
    for (index = 0; index < Math.min(profile.lanternGlow, positions.length); index += 1) {
      var pos = positions[index];
      var flicker = 0.85 + 0.15 * Math.sin(t * 3 + index * 1.7) + 0.05 * Math.sin(t * 7.3 + index);
      var r = 60 * flicker;
      var lg = ctx.createRadialGradient(pos[0], SCENE_Y + pos[1], 2, pos[0], SCENE_Y + pos[1], r);
      lg.addColorStop(0, 'rgba(255,196,110,0.32)');
      lg.addColorStop(1, 'rgba(255,196,110,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(pos[0], SCENE_Y + pos[1], r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 晨雾 / 水面水汽（低空横向漂移半透明带）
  if (profile.mist) {
    ctx.save();
    for (index = 0; index < profile.mist; index += 1) {
      seed = hashSeed(index + 401);
      speed = 3 + seed * 4;
      x = (seed * (viewportWidth + 120) + t * speed * (1 + windX)) % (viewportWidth + 120);
      if (x < 0) x += viewportWidth + 120;
      y = sceneHeight * (0.55 + seed * 0.4) + Math.sin(t * 0.4 + seed * 5) * 8;
      alpha = 0.06 + 0.05 * seed;
      size = 40 + seed * 50;
      ctx.globalAlpha = alpha;
      var mistGrad = ctx.createRadialGradient(x, SCENE_Y + y, 1, x, SCENE_Y + y, size);
      mistGrad.addColorStop(0, 'rgba(220,228,232,0.6)');
      mistGrad.addColorStop(1, 'rgba(220,228,232,0)');
      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 灶台/火盆飞溅火星（向上随机衰减）
  if (profile.ember) {
    ctx.save();
    for (index = 0; index < profile.ember; index += 1) {
      seed = hashSeed(index + 563);
      var emberX = viewportWidth * (0.2 + seed * 0.6);
      var emberLife = (t * (0.8 + seed * 0.6) + seed * 10) % 1;
      x = emberX + Math.sin(t * 2 + seed * 7) * 6;
      y = sceneHeight * 0.85 - emberLife * sceneHeight * 0.5;
      alpha = (1 - emberLife) * 0.7;
      size = 1.2 + (1 - emberLife) * 1.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff8a3a';
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 炊烟（从固定点缓慢上升扩散）
  if (profile.smoke) {
    ctx.save();
    var smokeSrc = profile.smoke.x != null ? profile.smoke : { x: viewportWidth * 0.3, y: sceneHeight * 0.3, strength: 1 };
    var smokeCount = Math.round(3 * (smokeSrc.strength || 1));
    for (index = 0; index < smokeCount; index += 1) {
      seed = hashSeed(index + 671);
      var smokeLife = (t * (0.35 + seed * 0.2) + seed * 7) % 1;
      x = (smokeSrc.x || viewportWidth * 0.3) + Math.sin(smokeLife * 3 + seed * 5) * 14 * smokeLife;
      y = (smokeSrc.y || sceneHeight * 0.3) - smokeLife * sceneHeight * 0.4;
      alpha = (1 - smokeLife) * 0.18;
      size = 8 + smokeLife * 22;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(180,180,180,0.5)';
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 水边小水花（随机出现）
  if (profile.splash) {
    ctx.save();
    for (index = 0; index < profile.splash; index += 1) {
      seed = hashSeed(index + 787);
      var splashPhase = (t * (0.5 + seed * 0.8) + seed * 4) % 1;
      if (splashPhase > 0.5) continue;
      x = viewportWidth * seed;
      y = sceneHeight * (0.7 + seed * 0.25);
      alpha = (0.5 - splashPhase) * 1.2;
      size = 2 + (0.5 - splashPhase) * 6;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(200,222,228,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, SCENE_Y + y, size, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 花瓣（比落叶更轻、更慢、颜色多样）
  if (profile.petal) {
    ctx.save();
    var petalColors = ['#f2b6c0', '#f6d3a8', '#e8c9e6', '#f7e0b6'];
    for (index = 0; index < profile.petal; index += 1) {
      seed = hashSeed(index + 809);
      speed = 8 + seed * 12;
      x = (seed * (viewportWidth + 80) + Math.sin(t * 0.9 + seed * 6) * 30 - t * speed * (0.4 + windX)) % (viewportWidth + 80);
      if (x < 0) x += viewportWidth + 80;
      y = (seed * sceneHeight + t * speed * 0.7) % (sceneHeight + 30);
      alpha = 0.35 + 0.4 * seed;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = petalColors[index % petalColors.length];
      ctx.save();
      ctx.translate(x, SCENE_Y + y);
      ctx.rotate(Math.sin(t * 1.5 + seed * 8) * 0.6 + t * (0.4 + seed * 0.5));
      ctx.scale(1, 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, 2.2 + seed * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

// P7-A4 声景视觉化（无音频）：极低 alpha 的潜意识级环境波纹
// 市井 → 嘈杂同心圆 / 水边 → 周期性扩散圈 / 工坊 → 轻微震动线
function drawSoundscape(ui, state, current, viewportWidth, sceneHeight) {
  var group = regionGroup(current.id);
  var ctx = ui.ctx;
  var t = Date.now() / 1000;
  var index;
  var x;
  var y;
  var r;
  var alpha;

  if (group === 'market') {
    // 市井嘈杂波纹：每 2.5s 在 NPC 密集区发散一组同心圆
    var burstPhase = (t / 2.5) % 1;
    if (burstPhase < 0.5) {
      ctx.save();
      var burstX = viewportWidth * 0.5;
      var burstY = SCENE_Y + sceneHeight * 0.5;
      alpha = (0.5 - burstPhase) * 0.16;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#d5c28b';
      ctx.lineWidth = 1;
      for (index = 0; index < 3; index += 1) {
        r = 20 + burstPhase * 80 + index * 22;
        ctx.globalAlpha = alpha * (1 - index * 0.3);
        ctx.beginPath();
        ctx.arc(burstX, burstY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (group === 'waterfront') {
    // 水边涟漪：周期性水面扩散圈（3 个相位错开）
    ctx.save();
    ctx.strokeStyle = 'rgba(200,222,228,0.8)';
    ctx.lineWidth = 1;
    for (index = 0; index < 3; index += 1) {
      var ripplePhase = ((t * 0.6) + index * 0.33) % 1;
      if (ripplePhase > 0.6) continue;
      x = viewportWidth * (0.2 + index * 0.3);
      y = SCENE_Y + sceneHeight * (0.78 + index * 0.05);
      r = 8 + ripplePhase * 28;
      alpha = (0.6 - ripplePhase) * 0.14;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (group === 'workshop') {
    // 工坊震动线：底部轻微横向往复（暗示机械运转）
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#a89070';
    ctx.lineWidth = 1;
    var vibeY = SCENE_Y + sceneHeight * 0.85;
    var vibeOffset = Math.sin(t * 12) * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, vibeY + vibeOffset);
    for (x = 0; x <= viewportWidth; x += 24) {
      ctx.lineTo(x, vibeY + Math.sin(t * 8 + x * 0.05) * 2);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// 行走尘土：队长移动时在脚后扬起，按地面类型变色
function updateDust(ui, state, current, worldX, worldY, facing) {
  var now = Date.now();
  var mapArtData = mapArt(ui, state.mapId);
  var weather = state.mapVariants && state.mapVariants.weather;
  var groundType = mapArtData.groundType || (weather === 'rain' ? 'water' : 'dust');
  var back = facing === 'left' ? 7 : facing === 'right' ? -7 : 0;
  var i;
  if (now - lastDustAt < 75) return;
  lastDustAt = now;
  for (i = 0; i < 2; i += 1) {
    dustParticles.push({
      wx: worldX + back + (Math.random() - 0.5) * 10,
      wy: worldY + 6 + (Math.random() - 0.5) * 4,
      vx: back * 0.18 + (Math.random() - 0.5) * 0.5,
      vy: -0.25 - Math.random() * 0.35,
      bornAt: now,
      ground: groundType
    });
  }
  if (dustParticles.length > 36) dustParticles.splice(0, dustParticles.length - 36);
}

function drawDust(ui, camera) {
  var ctx = ui.ctx;
  var now = Date.now();
  var i;
  var p;
  var age;
  var life;
  var alpha;
  var size;
  var color;
  if (!dustParticles.length) return;
  ctx.save();
  for (i = dustParticles.length - 1; i >= 0; i -= 1) {
    p = dustParticles[i];
    age = now - p.bornAt;
    life = p.ground === 'water' ? 340 : 240;
    if (age > life) {
      dustParticles.splice(i, 1);
      continue;
    }
    p.wx += p.vx;
    p.wy += p.vy;
    p.vy += 0.012;
    alpha = (1 - age / life) * (p.ground === 'water' ? 0.55 : 0.4);
    size = (p.ground === 'water' ? 2.6 : 2.1) * (1 - (age / life) * 0.55);
    color = p.ground === 'water' ? '#cfe3e6' : p.ground === 'stone' ? '#9b9080' : '#8c745c';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.wx - camera, SCENE_Y + p.wy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// P5-B2：NPC 头部转向关注光点
// 当玩家进入 NPC 朝向的视野锥（前方 140px、±50°）时，头顶绘制关注高光
function drawNpcAttention(ui, item, camera, current, state) {
  var npc = item.source;
  var facing = npc.facing || 'down';
  var dx = state.position.x - item.x;
  var dy = state.position.y - item.y;
  var dist = Math.hypot(dx, dy);
  var visionRange = 140;
  var visionAngle = 50 * Math.PI / 180;
  var facingVec;
  var angle;
  var proximity;
  var scale = depthScale(current, item.sortY);
  var spriteHeight = NPC_HEIGHT * scale;
  var t = Date.now() / 1000;
  var ctx = ui.ctx;
  var pulseAlpha;
  if (dist > visionRange || dist < 8) return;
  // 朝向向量
  if (facing === 'left') facingVec = { x: -1, y: 0 };
  else if (facing === 'right') facingVec = { x: 1, y: 0 };
  else if (facing === 'up') facingVec = { x: 0, y: -1 };
  else facingVec = { x: 0, y: 1 };
  // 计算玩家相对方向与朝向的夹角
  angle = Math.acos(clamp((dx * facingVec.x + dy * facingVec.y) / dist, -1, 1));
  if (angle > visionAngle) return;
  proximity = clamp(1 - dist / visionRange, 0, 1);
  pulseAlpha = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.5));
  ctx.save();
  ctx.globalAlpha = proximity * pulseAlpha;
  // 头顶关注光点（暖白色小光晕）
  var glowY = (SCENE_Y + item.y) - spriteHeight * 0.78;
  var grad = ctx.createRadialGradient(item.x - camera, glowY, 1, item.x - camera, glowY, 9);
  grad.addColorStop(0, 'rgba(255,240,200,0.7)');
  grad.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(item.x - camera, glowY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// P5-B3：NPC 状态气泡扩展
// 支持 hintType: auto(默认省略号) / task(叹号) / merchant(铜钱) / speaking(声波) / silent(无)
function npcHintType(npc, state) {
  if (npc.hintType && npc.hintType !== 'auto') return npc.hintType;
  // 自动推断：有未接任务 → task；营业地图 + roleId → merchant
  if (npc.roleId && innScene.isBusinessMap(state)) return 'merchant';
  // v36：主线委托已完成且有可领彩头 → 头顶 ✨ 星标（不覆盖 task/merchant，仅靠近显示）
  if (npc.artId && boons.hasClaimable(state, npc.artId)) return 'boon';
  return 'auto';
}

function drawNpcHint(ui, item, camera, current, state) {
  var scale = depthScale(current, item.sortY);
  var spriteHeight = NPC_HEIGHT * scale;
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  var dist = Math.hypot(state.position.x - item.x, state.position.y - item.y);
  var nearRadius = 124;
  var proximity;
  var t;
  var pulse;
  var bob;
  var ctx;
  var hintType = npcHintType(item.source, state);
  var badgeY;
  var alwaysShow = hintType === 'task';
  // silent 类型完全不显示
  if (hintType === 'silent') return;
  // task 类型常驻显示（不依赖距离）；其他类型需靠近
  if (!alwaysShow) {
    if (dist > nearRadius) return;
    proximity = clamp(1 - dist / nearRadius, 0, 1);
    if (proximity < 0.15) return;
  } else {
    proximity = 1;
  }
  t = Date.now() / 1000;
  pulse = 0.92 + 0.08 * Math.sin(t * 3);
  bob = Math.sin(t * 2) * 1.6;
  // 若头顶有身份名牌，把状态气泡上抬，避免与名牌重叠
  var hasNamePlate = item.source.name && item.source.showName !== false;
  badgeY = y - spriteHeight - 18 + bob - (hasNamePlate ? 18 : 0);
  ctx = ui.ctx;
  ctx.save();
  ctx.globalAlpha = Math.min(1, proximity * 1.3);

  if (hintType === 'task') {
    // 金色叹号（常驻，呼吸更强）
    pulse = 0.88 + 0.12 * Math.sin(t * 4);
    ctx.fillStyle = ui.theme.colors.gold;
    ctx.strokeStyle = ui.theme.colors.gold;
    ctx.lineWidth = 1.5;
    // 叹号竖条
    ctx.fillRect(x - 1.2, badgeY - 6 * pulse, 2.4, 9 * pulse);
    // 叹号下点
    ctx.beginPath();
    ctx.arc(x, badgeY + 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 外发光环
    ctx.globalAlpha = Math.min(1, proximity * 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, badgeY, 10 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hintType === 'merchant') {
    // 铜钱图标：金色圆环 + 中心方孔
    ctx.strokeStyle = ui.theme.colors.gold;
    ctx.fillStyle = ui.theme.colors.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, badgeY, 6 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, badgeY - 1.5, 3, 3);
  } else if (hintType === 'speaking') {
    // 说话声波：三个递增同心弧
    ctx.strokeStyle = ui.theme.colors.jade;
    ctx.lineWidth = 1.3;
    var wavePhase = (t * 2) % 1;
    var arcR;
    for (var wi = 0; wi < 3; wi += 1) {
      arcR = 4 + wi * 3 + wavePhase * 2;
      ctx.globalAlpha = Math.min(1, proximity * (1 - wi * 0.25));
      ctx.beginPath();
      ctx.arc(x, badgeY, arcR, -0.6, 0.6);
      ctx.stroke();
    }
  } else if (hintType === 'boon') {
    // 彩头星标：金色四角星（呼吸），低干扰、仅靠近显示
    pulse = 0.85 + 0.15 * Math.sin(t * 3.5);
    ctx.fillStyle = ui.theme.colors.gold;
    var sp = 5.5 * pulse;
    ctx.beginPath();
    ctx.moveTo(x, badgeY - sp);
    ctx.lineTo(x + sp * 0.28, badgeY - sp * 0.28);
    ctx.lineTo(x + sp, badgeY);
    ctx.lineTo(x + sp * 0.28, badgeY + sp * 0.28);
    ctx.lineTo(x, badgeY + sp);
    ctx.lineTo(x - sp * 0.28, badgeY + sp * 0.28);
    ctx.lineTo(x - sp, badgeY);
    ctx.lineTo(x - sp * 0.28, badgeY - sp * 0.28);
    ctx.closePath();
    ctx.fill();
    // 中心微亮点（提升辨识度）
    ctx.fillStyle = ui.theme.colors.paper;
    ctx.beginPath();
    ctx.arc(x, badgeY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 默认：金色空心环 + 省略号
    ctx.strokeStyle = ui.theme.colors.gold;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, badgeY, 8 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ui.theme.colors.gold;
    var dots = [[-3, 0], [0, 0.6], [3, 0]];
    for (var i = 0; i < dots.length; i += 1) {
      ctx.beginPath();
      ctx.arc(x + dots[i][0], badgeY + dots[i][1], 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// P5-B6：营业/工作动画暗示
// npc.craft 配置：在 NPC 手部区域绘制周期性操作光点 + 工作台前成品粒子
function drawNpcCraft(ui, item, camera, current, state) {
  var craft = item.source.craft;
  if (!craft) return;
  var scale = depthScale(current, item.sortY);
  var spriteHeight = NPC_HEIGHT * scale;
  var x = item.x - camera;
  var y = SCENE_Y + item.y;
  var t = Date.now() / 1000;
  var ctx = ui.ctx;
  var handY = y - spriteHeight * 0.45;
  var handX = x + (craft.handOffsetX || 8);
  var i;
  var phase;
  // 手部操作光点（周期闪烁）
  phase = (t * (craft.speed || 1.5)) % 1;
  if (phase < 0.4) {
    ctx.save();
    ctx.globalAlpha = (0.4 - phase) * 2 * 0.7;
    ctx.fillStyle = craft.sparkColor || '#ffd27a';
    ctx.beginPath();
    ctx.arc(handX, handY, 2.2 + (0.4 - phase) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 工作台前成品/废屑粒子（向下飘落，按 craft.particle 类型）
  if (craft.particle) {
    var pCount = craft.particleCount || 3;
    ctx.save();
    for (i = 0; i < pCount; i += 1) {
      var pSeed = hashSeed(i + 911 + (item.source.id ? item.source.id.charCodeAt(0) : 0));
      var pLife = (t * 0.6 + pSeed * 5) % 1;
      var px = x + (craft.tableOffsetX || 14) + Math.sin(pSeed * 6) * 8;
      var py = y + pLife * 14;
      var pAlpha = (1 - pLife) * 0.5;
      ctx.globalAlpha = pAlpha;
      if (craft.particle === 'steam') {
        // 茶汽/热汽（白色上升）
        py = y - pLife * 16;
        ctx.fillStyle = 'rgba(230,230,225,0.6)';
        ctx.beginPath();
        ctx.arc(px, py, 2 + pLife * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (craft.particle === 'sawdust' || craft.particle === 'powder') {
        ctx.fillStyle = craft.particle === 'powder' ? '#c8a060' : '#b89060';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
    ctx.restore();
  }
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
  uiArt.drawPanel(ui, 'prompt', x, y, width, height, { fill: '#f6e8c9ee', stroke: ui.theme.colors.wood, shadow: true });
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
  uiArt.drawSealButton(ui, { type: 'crisisAction', id: 'favor' }, startX, ui.height - 55, 86, 44, '讲人情', { icon: 'relationship' });
  uiArt.drawSealButton(ui, { type: 'crisisAction', id: 'ledger' }, startX + 96, ui.height - 55, 86, 44, '查账目', { icon: 'abacus', primary: true });
  uiArt.drawSealButton(ui, { type: 'crisisAction', id: 'promise' }, startX + 192, ui.height - 55, 86, 44, '作承诺', { icon: 'check' });
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
  uiArt.drawPanel(ui, 'dialogue', centerX - 179, 104, 358, 174, { fill: ui.theme.colors.paper, stroke: ui.theme.colors.wood });
  uiArt.drawIcon(ui, 'quest', centerX - 124, 136, 20, ui.theme.colors.cinnabar);
  ui.label('正在装载' + current.name, centerX + 10, 136, 18, ui.theme.colors.ink, 'center', ui.theme.fonts.title, 280);
  ui.label('只等待当前地图与上阵队员', centerX, 164, 11, ui.theme.colors.wood, 'center');
  ui.rect(centerX - 141, 190, 282, 10, '#2d211b', ui.theme.colors.muted);
  ui.rect(centerX - 139, 192, 278 * progress, 6, ui.theme.colors.gold);
  ui.label(summary.ready + '/' + summary.total, centerX, 220, 11, ui.theme.colors.wood, 'center');
  uiArt.drawSealButton(ui, { type: 'returnInn' }, centerX - 62, 234, 124, 44, '返回客栈', { icon: 'door' });
}

function drawAssetFailure(ui, state, current, summary) {
  var centerX = ui.width / 2;
  ui.rect(0, SCENE_Y, ui.width, ui.height - SCENE_Y, '#342821');
  uiArt.drawPanel(ui, 'dialogue', centerX - 191, 88, 382, 210, { fill: ui.theme.colors.paper, stroke: ui.theme.colors.cinnabar });
  uiArt.drawIcon(ui, 'warning', centerX - 130, 124, 22, ui.theme.colors.cinnabar);
  ui.label(current.name + '美术加载失败', centerX + 12, 124, 19, ui.theme.colors.cinnabar, 'center', ui.theme.fonts.title, 306);
  ui.label('无法显示正式场景，已暂停移动。', centerX, 158, 12, ui.theme.colors.ink, 'center');
  ui.label(state.lastSceneRoute ? '可重新加载，或退回上一场景。' : '可重新加载，或返回客栈起点。', centerX, 181, 11, ui.theme.colors.wood, 'center');
  ui.label(summary.failed + ' 项资源未就绪', centerX, 207, 10, ui.theme.colors.muted, 'center');
  uiArt.drawSealButton(ui, { type: 'retryAssets' }, centerX - 143, 236, 128, 44, '重新加载', { icon: 'quest', primary: true });
  uiArt.drawSealButton(
    ui,
    state.lastSceneRoute ? { type: 'transitionReturn' } : { type: 'returnInn' },
    centerX + 15,
    236,
    128,
    44,
    state.lastSceneRoute ? '退回上一场景' : '返回客栈',
    { icon: 'exit' }
  );
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
  var lightingLayers = [];
  var formalLightingDrawn = false;
  var items;
  var hot;
  var freeHot;
  var speaking;
  var showToast;
  var innUiOpen;
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
    if (layers[index].kind === 'lighting') lightingLayers.push(layers[index]);
    else if (layers[index].foreground === true || layers[index].kind === 'foreground' || number(layers[index].order, 0) >= 3) foregroundLayers.push(layers[index]);
    else backgroundLayers.push(layers[index]);
  }

  ui.ctx.save();
  ui.ctx.beginPath();
  ui.ctx.rect(0, SCENE_Y, viewportWidth, sceneHeight);
  ui.ctx.clip();
  for (index = 0; index < backgroundLayers.length; index += 1) drawLayer(ui, backgroundLayers[index], camera, state);
  innSceneView.drawObjectLayer(ui, state, camera);
  items = buildSceneItems(ui, state, current);
  drawSceneItems(ui, items, camera, current, state);
  // P9：行走尘土仅在 level≥1 显示
  if (atmosphereLevel(state) >= 1) drawDust(ui, camera);
  for (index = 0; index < foregroundLayers.length; index += 1) drawLayer(ui, foregroundLayers[index], camera, state);
  for (index = 0; index < lightingLayers.length; index += 1) {
    if (drawLayer(ui, lightingLayers[index], camera, state)) formalLightingDrawn = true;
  }
  if (!formalLightingDrawn) drawTimeTint(ui, state, sceneHeight, viewportWidth);
  drawWeather(ui, state, current, sceneHeight, viewportWidth);
  drawAmbience(ui, state, current, viewportWidth, sceneHeight, camera);
  // P9：声景仅在 level≥3 显示（高级氛围）
  if (atmosphereLevel(state) >= 3) {
    drawSoundscape(ui, state, current, viewportWidth, sceneHeight);
  }
  drawWorldDebug(ui, state, current, camera);
  ui.ctx.restore();

  hot = world.activeHotspot(state);
  freeHot = hot && !hot.linkedObjectId ? hot : null;
  innUiOpen = !!(state.innScene && (
    state.innScene.selectedObjectId
    || state.innScene.microGame
    || state.innScene.serviceOpen
    || state.innScene.activePage
  ));
  speaking = drawSpeechBubble(ui, state, current, camera);
  if (state.toast && state.toast !== lastToastText) {
    lastToastText = state.toast;
    lastToastAt = Date.now();
  }
  showToast = !!state.toast && Date.now() - lastToastAt < TOAST_DURATION;
  if (!speaking && freeHot && !innUiOpen) {
    uiArt.drawPanel(ui, 'prompt', viewportWidth / 2 - 94, ui.height - 103, 188, 34, { fill: '#2b211de8', shadow: false });
    drawInteractionGlyph(ui, freeHot.type, viewportWidth / 2 - 74, ui.height - 86, 14, hotspotTone(ui, freeHot.type));
    ui.label(freeHot.label, viewportWidth / 2 + 8, ui.height - 86, 12, ui.theme.colors.ink, 'center', ui.theme.fonts.title, 152);
  } else if (!speaking && showToast) {
    uiArt.drawPanel(ui, 'card', viewportWidth / 2 - 169, SCENE_Y + 8, 338, 32, { fill: '#f0dfbde8', shadow: true });
    uiArt.drawIcon(ui, 'complete', viewportWidth / 2 - 147, SCENE_Y + 24, 13, ui.theme.colors.jade);
    ui.label(state.toast, viewportWidth / 2 + 8, SCENE_Y + 24, 10, ui.theme.colors.ink, 'center', null, 286);
  }

  if (!state.modal && !state.dialogue && !innUiOpen) drawTaskCard(ui, state);
  drawCrisisActions(ui, state);
  if (!innUiOpen) {
    drawJoystick(ui);
    if (state.board && state.board.inLandmark) {
      drawWoodControl(ui, { type: 'boardReturn' }, viewportWidth - 100, ui.height - 40, 48, 'exit', '棋盘', false, true);
    } else if (!innScene.isBusinessMap(state)) {
      drawWoodControl(ui, { type: 'party' }, viewportWidth - 100, ui.height - 40, 48, 'party', '队伍', false, true);
    }
    if (freeHot) {
      drawWoodControl(ui, { type: 'interact' }, viewportWidth - 40, ui.height - 42, 60, freeHot.type, '互动', true, true);
    }
  }
  innSceneView.drawScreenUi(ui, state);
}

module.exports = {
  SCENE_WIDTH: SCENE_WIDTH,
  drawHud: drawHud,
  drawExplore: drawExplore,
  depthScale: depthScale
};
