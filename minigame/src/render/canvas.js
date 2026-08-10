var content = require('../../data/content');
var createAssetStore = require('./assets').createAssetStore;
var theme = require('./theme').theme;
var layoutModule = require('./layout');
var drawTitle = require('./views/title').drawTitle;
var drawExplore = require('./views/explore').drawExplore;
var drawManagement = require('./views/management').drawManagement;
var drawManagementOverlay = require('./views/management').drawManagementOverlay;
var drawOverlays = require('./views/overlays').drawOverlays;
var drawBattle = require('./views/battle').drawBattle;
var drawTransitions = require('./views/transitions').drawTransitions;
var drawChapter001 = require('./views/chapter001').drawChapter001;

var WALK_FRAME_DISTANCE = 12.5;
var MAX_ANIMATION_STEP = 72;
var TAP_SLOP = 8;
var JOYSTICK_RADIUS = 40;
var JOYSTICK_TOUCH_RADIUS = 58;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function unique(paths) {
  var result = [];
  var index;
  for (index = 0; index < (paths || []).length; index += 1) {
    if (paths[index] && result.indexOf(paths[index]) < 0) result.push(paths[index]);
  }
  return result;
}

function createRenderer(canvas) {
  var ctx = canvas.getContext('2d');
  var assets = createAssetStore();
  var buttons = [];
  var animation = {};
  var touches = {};
  var joystick = null;
  var prefetchKey = '';
  var lastState = null;
  var resourceSnapshot = null;
  var resourceScreen = null;
  var resourceEffects = [];
  var frameNow = 0;
  var phaseTransition = { from: null, to: null, startedAt: 0 };
  var pageTransition = { page: null, startedAt: 0 };
  var runtimeError = null;
  var layout = layoutModule.createLayout({ windowWidth: 844, windowHeight: 390, pixelRatio: 1 });

  function resize() {
    var info = null;
    var menuButton = null;
    try { if (wx.getWindowInfo) info = wx.getWindowInfo(); } catch (error) {}
    if (!info || !info.windowWidth || !info.windowHeight) {
      try { if (wx.getSystemInfoSync) info = wx.getSystemInfoSync(); } catch (error) {}
    }
    if (!info) info = { windowWidth: 844, windowHeight: 390, pixelRatio: 1 };
    try { if (wx.getMenuButtonBoundingClientRect) menuButton = wx.getMenuButtonBoundingClientRect(); } catch (error) {}
    layout = layoutModule.createLayout(info, menuButton);
    layoutModule.resizeCanvas(canvas, layout);
  }

  function rect(x, y, width, height, color, stroke) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);
    }
  }

  function roundedRect(x, y, width, height, radius, color, stroke) {
    var r = Math.max(0, Math.min(radius || 0, width / 2, height / 2));
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
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function fitSingleLine(value, maxWidth) {
    var text = String(value == null ? '' : value);
    var suffix = '…';
    if (maxWidth == null || ctx.measureText(text).width <= maxWidth) return text;
    while (text && ctx.measureText(text + suffix).width > maxWidth) text = text.slice(0, -1);
    return text ? text + suffix : '';
  }

  function label(value, x, y, size, color, align, family, maxWidth) {
    ctx.font = String(size) + 'px ' + (family || theme.fonts.body);
    ctx.fillStyle = color || theme.colors.ink;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitSingleLine(value, maxWidth), x, y);
  }

  function paragraph(value, x, y, options) {
    var config = options || {};
    var size = config.size || theme.type.body.size;
    var lineHeight = config.lineHeight || theme.type.body.lineHeight;
    var maximumLines = config.maxLines || 2;
    var width = config.width || 180;
    var source = String(value == null ? '' : value);
    var lines = [];
    var line = '';
    var index;
    var character;
    ctx.font = String(size) + 'px ' + (config.family || theme.fonts.body);
    for (index = 0; index < source.length; index += 1) {
      character = source[index];
      if (character === '\n') {
        lines.push(line);
        line = '';
      } else if (ctx.measureText(line + character).width > width && line) {
        lines.push(line);
        line = character;
      } else {
        line += character;
      }
      if (lines.length >= maximumLines) break;
    }
    if (line && lines.length < maximumLines) lines.push(line);
    if (index < source.length && lines.length) {
      lines[lines.length - 1] = fitSingleLine(lines[lines.length - 1] + '…', width);
    }
    ctx.fillStyle = config.color || theme.colors.ink;
    ctx.textAlign = config.align || 'left';
    ctx.textBaseline = 'top';
    for (index = 0; index < lines.length; index += 1) {
      ctx.fillText(lines[index], x, y + index * lineHeight);
    }
    return lines.length;
  }

  function actionKey(action) {
    return Object.keys(action || {}).sort().map(function (key) { return key + ':' + String(action[key]); }).join('|');
  }

  function actionPressed(action) {
    var key = actionKey(action);
    return Object.keys(touches).some(function (touchId) {
      return touches[touchId].pressedKey === key && !touches[touchId].moved;
    });
  }

  function addButton(action, x, y, width, height, title, tone) {
    var hitWidth = Math.max(theme.touch.min, width);
    var hitHeight = Math.max(theme.touch.min, height);
    var hitX = x - (hitWidth - width) / 2;
    var hitY = y - (hitHeight - height) / 2;
    var fill = tone || theme.colors.gold;
    var pressed = actionPressed(action);
    var drawY = y + (pressed ? 2 : 0);
    var textColor = fill === theme.colors.jade || fill === theme.colors.cinnabar ? theme.colors.paper : theme.colors.ink;
    if (!pressed) roundedRect(x, y + 2, width, height, theme.radius.control, theme.colors.buttonShadow);
    roundedRect(x, drawY, width, height, theme.radius.control, fill, theme.colors.wood);
    label(title, x + width / 2, drawY + height / 2, Math.max(11, Math.min(16, height * 0.34)), textColor, 'center', null, width - 8);
    buttons.push({ action: action, key: actionKey(action), x: hitX, y: hitY, w: hitWidth, h: hitHeight });
  }

  function hitArea(action, x, y, width, height) {
    buttons.push({ action: action, key: actionKey(action), x: x, y: y, w: width, h: height });
  }

  function cover(image, x, y, width, height) {
    var scale;
    var sourceWidth;
    var sourceHeight;
    if (!image || !image.width || !image.height) return;
    scale = Math.max(width / image.width, height / image.height);
    sourceWidth = width / scale;
    sourceHeight = height / scale;
    ctx.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
  }

  function role(id) {
    var index;
    for (index = 0; index < content.roles.length; index += 1) {
      if (content.roles[index].id === id) return content.roles[index];
    }
    return content.roles[0];
  }

  function mapById(id) {
    var index;
    for (index = 0; index < content.maps.length; index += 1) {
      if (content.maps[index].id === id) return content.maps[index];
    }
    return content.maps[0];
  }

  function portrait(id, x, y, size) {
    var art = assets.manifest.characters[id];
    var image = art && art.portrait ? assets.image(art.portrait) : null;
    var item;
    if (image) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, size, size);
      ctx.clip();
      cover(image, x, y, size, size);
      ctx.restore();
      return;
    }
    item = role(id);
    rect(x, y, size, size, item.color, theme.colors.paper);
    label(item.name.slice(0, 1), x + size / 2, y + size / 2, size * 0.45, theme.colors.paper, 'center', theme.fonts.title);
  }

  function heroShadow(x, y, spriteHeight, depthScale, alpha) {
    var scale = depthScale || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha == null ? 0.14 : alpha;
    ctx.fillStyle = '#241b16';
    ctx.translate(x, y + 1);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(12, spriteHeight * 0.23 * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function fallbackHero(id, x, y, spriteHeight, facing) {
    var item = role(id);
    var flipped = facing === 'left';
    ctx.save();
    ctx.translate(x, y);
    if (flipped) ctx.scale(-1, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = item.color;
    ctx.fillRect(-spriteHeight * 0.22, -spriteHeight * 0.58, spriteHeight * 0.44, spriteHeight * 0.55);
    ctx.fillStyle = '#e8bc94';
    ctx.beginPath();
    ctx.arc(0, -spriteHeight * 0.72, spriteHeight * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function fallbackNpc(npc, x, y, spriteHeight) {
    var color = npc.color || theme.colors.wood;
    var name = npc.name || '客';
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-spriteHeight * 0.19, 0);
    ctx.lineTo(-spriteHeight * 0.14, -spriteHeight * 0.54);
    ctx.lineTo(spriteHeight * 0.14, -spriteHeight * 0.54);
    ctx.lineTo(spriteHeight * 0.19, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9ad85';
    ctx.beginPath();
    ctx.arc(0, -spriteHeight * 0.67, spriteHeight * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(name.slice(0, 1), x, y - spriteHeight * 0.28, Math.max(12, spriteHeight * 0.16), theme.colors.paper, 'center', theme.fonts.title);
  }

  function directionForFacing(facing) {
    if (facing === 'up') return 'back';
    if (facing === 'down') return 'front';
    return 'side';
  }

  function atlasPath(art, facing) {
    var direction = directionForFacing(facing);
    if (art && art.atlases) return art.atlases[direction] || art.atlases.side || null;
    return art && art.atlas ? art.atlas : null;
  }

  function animationEntry(key, worldX, worldY) {
    if (!animation[key]) {
      animation[key] = {
        lastWorldX: worldX,
        lastWorldY: worldY,
        walkDistance: 0,
        lastMoving: false,
        forcedClip: null,
        forcedUntil: 0
      };
    }
    return animation[key];
  }

  function frameFor(key, art, moving, worldX, worldY, clipName) {
    var clip = art.clips[clipName] || art.clips.idle || [0];
    var fps = art.fps && (art.fps[clipName] || art.fps.idle) || 6;
    var entry = animationEntry(key, worldX, worldY);
    var delta = distance(entry.lastWorldX, entry.lastWorldY, worldX, worldY);
    var index;

    if (moving) {
      if (!entry.lastMoving) entry.walkDistance = 0;
      else if (delta <= MAX_ANIMATION_STEP) entry.walkDistance += delta;
    }
    entry.lastWorldX = worldX;
    entry.lastWorldY = worldY;
    entry.lastMoving = moving;

    if (!clip.length) return 0;
    if (clipName === 'walk') index = Math.floor(entry.walkDistance / WALK_FRAME_DISTANCE) % clip.length;
    else index = Math.floor(Date.now() / (1000 / fps)) % clip.length;
    return clip[index];
  }

  function drawAtlasArt(art, image, animationKey, x, y, spriteHeight, facing, moving, worldX, worldY, requestedClip) {
    var entry;
    var forcedClip;
    var clipName;
    var frame;
    var frameWidth;
    var frameHeight;
    var atlasColumns;
    var sourceX;
    var sourceY;
    var drawScale;
    if (!art || !image || !art.frameSize || !art.pivot || !art.clips) return false;

    entry = animationEntry(animationKey, worldX, worldY);
    forcedClip = entry.forcedUntil > Date.now() && art.clips[entry.forcedClip] ? entry.forcedClip : null;
    clipName = forcedClip || requestedClip || (moving ? 'walk' : 'idle');
    if (!art.clips[clipName]) clipName = art.clips.idle ? 'idle' : Object.keys(art.clips)[0];
    frame = frameFor(animationKey, art, moving, worldX, worldY, clipName);
    frameWidth = art.frameSize.width;
    frameHeight = art.frameSize.height;
    atlasColumns = art.atlasColumns || 1;
    sourceX = (frame % atlasColumns) * frameWidth;
    sourceY = Math.floor(frame / atlasColumns) * frameHeight;
    drawScale = spriteHeight / frameHeight;

    ctx.save();
    ctx.translate(x, y);
    if (facing === 'left') ctx.scale(-1, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      -art.pivot.x * drawScale,
      -art.pivot.y * drawScale,
      frameWidth * drawScale,
      frameHeight * drawScale
    );
    ctx.restore();
    return true;
  }

  function artHero(id, x, y, spriteHeight, facing, moving, worldX, worldY, requestedClip, animationKey) {
    var art = assets.manifest.characters[id];
    var path = atlasPath(art, facing);
    var image = path ? assets.image(path) : null;
    if (!art || !image) return false;
    return drawAtlasArt(art, image, animationKey || id, x, y, spriteHeight, facing, moving, worldX, worldY, requestedClip);
  }

  function artNpc(npc, x, y, spriteHeight, worldX, worldY) {
    var art;
    var path;
    var image;
    var drawHeight;
    var drawWidth;
    var facing = npc.facing || 'down';
    if (npc.roleId) {
      return artHero(npc.roleId, x, y, spriteHeight, facing, false, worldX, worldY, null, 'npc:' + npc.id);
    }
    art = assets.manifest.npcs && assets.manifest.npcs[npc.artId];
    if (!art) return false;
    path = atlasPath(art, facing) || art.sprite || art.portrait;
    image = path ? assets.image(path) : null;
    if (!image) return false;
    if (art.frameSize && art.pivot && art.clips) {
      return drawAtlasArt(art, image, 'npc:' + npc.id, x, y, spriteHeight, facing, false, worldX, worldY, null);
    }
    drawHeight = spriteHeight;
    drawWidth = image.height ? image.width * drawHeight / image.height : drawHeight * 0.6;
    ctx.save();
    ctx.translate(x, y);
    if (facing === 'left') ctx.scale(-1, 1);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  function partyIds(state) {
    var result = [];
    var source = state && state.party ? state.party : [];
    var index;
    for (index = 0; index < source.length && result.length < 3; index += 1) {
      if (result.indexOf(source[index]) < 0) result.push(source[index]);
    }
    if (state && state.activeId && result.indexOf(state.activeId) < 0) result.unshift(state.activeId);
    return result.slice(0, 3);
  }

  function requiredPaths(state) {
    var paths = [];
    var ids;
    var current;
    var npc;
    var index;
    if (!state || state.screen === 'title') {
      paths = paths.concat(assets.mapPaths('inn', { includeOptional: false }));
      paths = paths.concat(assets.rolePaths('zhangdeng', ['portrait']));
      return unique(paths);
    }
    if (state.screen === 'inn') {
      paths = paths.concat(assets.mapPaths(state.activeBranchId === 'jiangnan' ? 'jiangnan_branch' : 'inn', {
        phase: state.calendar && state.calendar.phase || 'morning',
        includeOptional: false
      }));
      ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'].forEach(function (id) {
        if (!state.characters[id] || !state.characters[id].innUnlocked) return;
        paths = paths.concat(assets.rolePaths(id, ['portrait', 'atlases']));
      });
      return unique(paths);
    }
    paths = paths.concat(assets.mapPaths(state.mapId, {
      phase: state.worldTime && state.worldTime.phase || 'morning',
      weather: state.mapVariants && state.mapVariants.weather,
      includeOptional: false
    }));
    ids = partyIds(state);
    for (index = 0; index < ids.length; index += 1) {
      paths = paths.concat(assets.rolePaths(ids[index], ['portrait', 'dialogue', 'atlases']));
    }
    current = mapById(state.mapId);
    for (index = 0; index < current.npcs.length; index += 1) {
      npc = current.npcs[index];
      if (npc.roleId) paths = paths.concat(assets.rolePaths(npc.roleId, ['atlases']));
      else if (npc.artId) paths = paths.concat(assets.npcPaths(npc.artId));
    }
    if (state.battle && state.battle.enemies) {
      paths = paths.concat(assets.uiPaths());
      if (state.battle.performance && state.battle.performance.atlas) paths.push(state.battle.performance.atlas);
      for (index = 0; index < ids.length; index += 1) {
        paths = paths.concat(assets.rolePaths(ids[index], ['skillIcons', 'battle', 'battlePortrait', 'skillCutIn']));
      }
      for (index = 0; index < state.battle.enemies.length; index += 1) {
        if (state.battle.enemies[index].artId) {
          paths = paths.concat(assets.npcPaths(state.battle.enemies[index].artId));
        }
      }
    }
    if (state.modal && state.modal.type === 'cookingTrial') {
      paths = paths.concat(assets.rolePaths('shiwei', ['chapterActions']));
    }
    if (state.dialogue) {
      if (state.dialogue.speakerId) paths = paths.concat(assets.rolePaths(state.dialogue.speakerId, ['dialogue']));
      if (state.dialogue.listenerId) paths = paths.concat(assets.rolePaths(state.dialogue.listenerId, ['dialogue']));
    }
    return unique(paths);
  }

  function requiredIssues(state) {
    var issues = [];
    var mapId;
    var mapArt;
    var ids;
    var index;
    var directionIndex;
    var directions = ['side', 'front', 'back'];
    var art;
    var current;
    var npc;
    if (!state || state.screen === 'title') return issues;

    mapId = state.screen === 'inn'
      ? (state.activeBranchId === 'jiangnan' ? 'jiangnan_branch' : 'inn')
      : state.mapId;
    mapArt = assets.manifest.maps[mapId];
    if (!mapArt || !mapArt.layers || !mapArt.layers.length) {
      issues.push({ path: 'manifest:maps/' + mapId, message: '当前地图没有登记正式美术' });
    } else {
      for (index = 0; index < mapArt.layers.length; index += 1) {
        if (!mapArt.layers[index].src) {
          issues.push({ path: 'manifest:maps/' + mapId + '/layer-' + index, message: '当前地图图层路径为空' });
        }
      }
    }

    ids = state.screen === 'inn'
      ? ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'].filter(function (id) {
        return state.characters[id] && state.characters[id].innUnlocked;
      })
      : partyIds(state);
    for (index = 0; index < ids.length; index += 1) {
      art = assets.manifest.characters[ids[index]];
      if (!art) {
        issues.push({ path: 'manifest:characters/' + ids[index], message: '当前队员没有登记角色美术' });
        continue;
      }
      if (!art.portrait) issues.push({ path: 'manifest:characters/' + ids[index] + '/portrait', message: '当前队员缺少头像' });
      if (!art.frameSize || !art.pivot || !art.clips) {
        issues.push({ path: 'manifest:characters/' + ids[index] + '/atlas-meta', message: '当前队员图集参数不完整' });
      }
      for (directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
        if (!art.atlases || !art.atlases[directions[directionIndex]]) {
          issues.push({
            path: 'manifest:characters/' + ids[index] + '/' + directions[directionIndex],
            message: '当前队员缺少' + directions[directionIndex] + '方向图集'
          });
        }
      }
    }
    current = mapById(mapId);
    for (index = 0; index < current.npcs.length; index += 1) {
      npc = current.npcs[index];
      if (npc.artId && (!assets.manifest.npcs || !assets.manifest.npcs[npc.artId])) {
        issues.push({ path: 'manifest:npcs/' + npc.artId, message: '当前地图NPC缺少正式美术' });
      }
    }
    return issues;
  }

  function readiness(state) {
    var result = assets.summary(requiredPaths(state));
    var issues = requiredIssues(state);
    var index;
    for (index = 0; index < issues.length; index += 1) result.errors.push(issues[index]);
    result.total += issues.length;
    result.failed += issues.length;
    result.progress = result.total ? result.ready / result.total : 1;
    return result;
  }

  function prefetchFor(state) {
    var current;
    var paths = [];
    var index;
    var npc;
    var key;
    var phase;
    var weather;
    if (!state || state.screen !== 'explore' || !state.mapId) return;
    current = mapById(state.mapId);
    phase = state.worldTime && state.worldTime.phase || 'morning';
    weather = state.mapVariants && state.mapVariants.weather;
    key = state.mapId + '|' + phase + '|' + String(weather || '') + '|' + partyIds(state).join(',');
    if (key === prefetchKey) return;
    prefetchKey = key;

    paths = paths.concat(assets.mapPaths(state.mapId, {
      phase: phase,
      weather: weather,
      includeOptional: true,
      includeNextPhase: true
    }));
    for (index = 0; index < current.exits.length; index += 1) {
      paths = paths.concat(assets.mapPaths(current.exits[index].target, {
        phase: phase,
        weather: weather,
        includeOptional: true,
        includeNextPhase: false
      }));
    }
    for (index = 0; index < current.npcs.length; index += 1) {
      npc = current.npcs[index];
      if (npc.roleId) paths = paths.concat(assets.rolePaths(npc.roleId, ['atlases']));
      else if (npc.artId) paths = paths.concat(assets.npcPaths(npc.artId));
    }
    paths = paths.concat(assets.uiPaths());
    assets.preload(unique(paths));
  }

  function vector() {
    if (!joystick) return { x: 0, y: 0 };
    return { x: joystick.x, y: joystick.y };
  }

  function ui() {
    return {
      ctx: ctx,
      assets: assets,
      theme: theme,
      safe: layout.safe,
      width: layout.width,
      height: layout.height,
      rect: rect,
      roundedRect: roundedRect,
      label: label,
      paragraph: paragraph,
      addButton: addButton,
      pressed: actionPressed,
      hitArea: hitArea,
      cover: cover,
      role: role,
      portrait: portrait,
      heroShadow: heroShadow,
      fallbackHero: fallbackHero,
      fallbackNpc: fallbackNpc,
      artHero: artHero,
      artNpc: artNpc,
      assetSummary: readiness,
      joystickVector: vector,
      joystickAxis: function () { return vector().x; },
      timeTint: timeTint,
      phaseLayerAlpha: phaseLayerAlpha,
      pageProgress: pageProgress
    };
  }

  function readResources(state) {
    return {
      coin: Number(state.inventory && state.inventory.coin) || 0,
      ingredient: Number(state.inventory && state.inventory.ingredient) || 0,
      reputation: Number(state.inn && state.inn.reputation) || 0,
      order: Number(state.inn && state.inn.order) || 0,
    };
  }

  function queueResourceEffects(state, now) {
    var current = readResources(state);
    var keys = ['coin', 'ingredient', 'reputation', 'order'];
    var names = { coin: '银', ingredient: '食', reputation: '口碑', order: '秩序' };
    var right = layout.width - (layout.safe ? layout.safe.capsuleRight : 14);
    var targets = { coin: right - 158, ingredient: right - 112, reputation: right - 58, order: right - 14 };
    var sourceX = state.battle ? layout.width / 2 : state.screen === 'inn' ? 650 : 245;
    var sourceY = state.battle ? 250 : 180;
    var index;
    var key;
    var delta;
    if (!resourceSnapshot || state.screen === 'title' || resourceScreen === 'title') {
      resourceSnapshot = current;
      resourceScreen = state.screen;
      return;
    }
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      delta = current[key] - resourceSnapshot[key];
      if (!delta) continue;
      resourceEffects.push({
        label: names[key] + (delta > 0 ? ' +' : ' ') + delta,
        color: delta > 0 ? theme.colors.jade : theme.colors.cinnabar,
        fromX: sourceX,
        fromY: sourceY + index * 5,
        toX: targets[key],
        toY: 21,
        startedAt: now + index * 35,
      });
    }
    if (resourceEffects.length > 12) resourceEffects.splice(0, resourceEffects.length - 12);
    resourceSnapshot = current;
    resourceScreen = state.screen;
  }

  function drawResourceEffects(now) {
    var duration = theme.motion.resource;
    resourceEffects = resourceEffects.filter(function (effect) {
      var elapsed = now - effect.startedAt;
      var progress;
      var eased;
      var x;
      var y;
      var alpha;
      var width;
      if (elapsed < 0) return true;
      if (elapsed >= duration) return false;
      progress = elapsed / duration;
      eased = 1 - Math.pow(1 - progress, 3);
      x = effect.fromX + (effect.toX - effect.fromX) * eased;
      y = effect.fromY + (effect.toY - effect.fromY) * eased - Math.sin(Math.PI * progress) * 18;
      alpha = progress < 0.15 ? progress / 0.15 : Math.min(1, (1 - progress) / 0.22);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '600 10px ' + theme.fonts.body;
      width = ctx.measureText(effect.label).width + 12;
      roundedRect(x - width / 2, y - 9, width, 18, 3, theme.colors.paper, theme.colors.muted);
      label(effect.label, x, y, 10, effect.color, 'center', theme.fonts.body);
      ctx.restore();
      return true;
    });
  }

  function updatePhaseTransition(phase, now) {
    if (!phaseTransition.to) {
      phaseTransition.from = phase;
      phaseTransition.to = phase;
      phaseTransition.startedAt = now;
    } else if (phaseTransition.to !== phase) {
      phaseTransition.from = phaseTransition.to;
      phaseTransition.to = phase;
      phaseTransition.startedAt = now;
    }
  }

  function timeTint(x, y, width, height) {
    var palette = {
      morning: [242, 197, 106, 0.10],
      noon: [249, 228, 160, 0.04],
      evening: [25, 54, 74, 0.32],
    };
    var from = palette[phaseTransition.from] || palette.morning;
    var to = palette[phaseTransition.to] || palette.morning;
    var progress = Math.min(1, Math.max(0, (frameNow - phaseTransition.startedAt) / theme.motion.scene));
    var eased = progress * progress * (3 - 2 * progress);
    var red = Math.round(from[0] + (to[0] - from[0]) * eased);
    var green = Math.round(from[1] + (to[1] - from[1]) * eased);
    var blue = Math.round(from[2] + (to[2] - from[2]) * eased);
    var alpha = from[3] + (to[3] - from[3]) * eased;
    ctx.fillStyle = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha.toFixed(3) + ')';
    ctx.fillRect(x, y, width, height);
  }

  function phaseLayerAlpha(phase) {
    var progress = Math.min(1, Math.max(0, (frameNow - phaseTransition.startedAt) / theme.motion.scene));
    var eased = progress * progress * (3 - 2 * progress);
    if (phaseTransition.from === phaseTransition.to) return phase === phaseTransition.to ? 1 : 0;
    if (phase === phaseTransition.from) return 1 - eased;
    if (phase === phaseTransition.to) return eased;
    return 0;
  }

  function updatePageTransition(page, now) {
    if (!pageTransition.page) {
      pageTransition.page = page;
      pageTransition.startedAt = now - theme.motion.page;
    } else if (pageTransition.page !== page) {
      pageTransition.page = page;
      pageTransition.startedAt = now;
    }
  }

  function pageProgress() {
    var progress = Math.min(1, Math.max(0, (frameNow - pageTransition.startedAt) / theme.motion.page));
    return 1 - Math.pow(1 - progress, 3);
  }

  function drawRuntimeError(error) {
    var message = error && (error.message || String(error)) || '渲染初始化失败';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2c211d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f4e4bb';
    ctx.font = '18px sans-serif';
    ctx.fillText('长风客栈未能完成画面初始化', 28, 48);
    ctx.font = '13px sans-serif';
    ctx.fillText('错误信息：' + message.slice(0, 80), 28, 78);
    ctx.fillStyle = '#d7a84a';
    ctx.fillRect(28, 102, 132, 44);
    ctx.fillStyle = '#2c211d';
    ctx.fillText('重试画面', 66, 130);
    buttons.push({ action: { type: 'retryRuntime' }, key: 'type:retryRuntime', x: 28, y: 102, w: 132, h: 44 });
  }

  function render(state) {
    var view;
    var now = Date.now();
    try {
      runtimeError = null;
      frameNow = now;
      lastState = state;
      resize();
      updatePhaseTransition(state.screen === 'explore' && state.worldTime ? state.worldTime.phase : state.calendar && state.calendar.phase || 'morning', now);
      if (state.screen === 'inn' || state.innScene && state.innScene.activePage) {
        updatePageTransition(state.innScene && state.innScene.activePage || state.managementView || 'scene', now);
      }
      queueResourceEffects(state, now);
      layoutModule.beginFrame(ctx, canvas, layout, theme.colors.ink);
      buttons.length = 0;
      prefetchFor(state);
      view = ui();
      if (state.screen === 'title') drawTitle(view, state);
      else if (state.screen === 'chapter001') drawChapter001(view, state);
      else if (state.battle) drawBattle(view, state);
      else if (state.screen === 'inn') {
        drawManagement(view, state);
        drawOverlays(view, state);
      }
      else {
        drawExplore(view, state);
        if (state.innScene && (state.innScene.activePage || state.managementEvent)) {
          drawManagementOverlay(view, state);
        }
        drawOverlays(view, state);
      }
      drawTransitions(view, state);
      drawResourceEffects(now);
    } catch (error) {
      runtimeError = error;
      if (typeof console !== 'undefined' && console.error) console.error('Tongfu render failure:', error);
      drawRuntimeError(error);
    }
  }

  function point(x, y) {
    return layoutModule.toLogical(layout, x, y);
  }

  function hit(x, y) {
    var logical = point(x, y);
    var index;
    var button;
    for (index = buttons.length - 1; index >= 0; index -= 1) {
      button = buttons[index];
      if (logical.x >= button.x && logical.x <= button.x + button.w && logical.y >= button.y && logical.y <= button.y + button.h) return button;
    }
    return null;
  }

  function touchKey(id) {
    return '$' + String(id);
  }

  function joystickCenter() {
    return { x: 62, y: layout.height - 58 };
  }

  function inJoystickZone(logical) {
    var center = joystickCenter();
    if (!lastState || lastState.screen !== 'explore' || lastState.mode !== 'explore') return false;
    return distance(center.x, center.y, logical.x, logical.y) <= JOYSTICK_TOUCH_RADIUS;
  }

  function begin(id, x, y) {
    var logical = point(x, y);
    var key = touchKey(id);
    var captured = !joystick && inJoystickZone(logical);
    var button = captured ? null : hit(x, y);
    touches[key] = {
      startX: logical.x,
      startY: logical.y,
      x: logical.x,
      y: logical.y,
      moved: false,
      wasJoystick: captured,
      pressedKey: button ? button.key : null
    };
    if (captured) {
      joystick = { id: key, originX: logical.x, originY: logical.y, x: 0, y: 0 };
    }
    return { wasJoystick: captured, moved: false };
  }

  function updateTouch(id, x, y) {
    var key = touchKey(id);
    var touch = touches[key];
    var logical;
    var dx;
    var dy;
    var magnitude;
    if (!touch) return null;
    logical = point(x, y);
    touch.x = logical.x;
    touch.y = logical.y;
    if (distance(touch.startX, touch.startY, logical.x, logical.y) > TAP_SLOP) {
      touch.moved = true;
      touch.pressedKey = null;
    }
    if (joystick && joystick.id === key) {
      dx = logical.x - joystick.originX;
      dy = logical.y - joystick.originY;
      magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude > JOYSTICK_RADIUS) {
        dx = dx * JOYSTICK_RADIUS / magnitude;
        dy = dy * JOYSTICK_RADIUS / magnitude;
      }
      joystick.x = clamp(dx / JOYSTICK_RADIUS, -1, 1);
      joystick.y = clamp(dy / JOYSTICK_RADIUS, -1, 1);
    }
    return touch;
  }

  function move(id, x, y) {
    updateTouch(id, x, y);
    return vector();
  }

  function end(id, x, y) {
    var key = touchKey(id);
    var touch = updateTouch(id, x, y);
    var wasJoystick = !!(touch && touch.wasJoystick) || !!(joystick && joystick.id === key);
    var moved = touch ? touch.moved : wasJoystick;
    var finalVector = vector();
    if (joystick && joystick.id === key) joystick = null;
    delete touches[key];
    return { wasJoystick: wasJoystick, moved: moved, vector: finalVector };
  }

  function retryAssets(state) {
    assets.retryFailed(requiredPaths(state));
  }

  function playAction(id, clip, duration) {
    var entry = animationEntry(id, 0, 0);
    entry.forcedClip = clip;
    entry.forcedUntil = Date.now() + (duration || 400);
  }

  return {
    render: render,
    hit: hit,
    begin: begin,
    move: move,
    end: end,
    vector: vector,
    axis: function () { return vector().x; },
    readyFor: function (state) {
      var summary = readiness(state);
      return summary.loading === 0 && summary.failed === 0;
    },
    assetSummary: readiness,
    retryAssets: retryAssets,
    playAction: playAction,
    role: role,
    runtimeError: function () { return runtimeError; }
  };
}

module.exports = { createRenderer: createRenderer };
