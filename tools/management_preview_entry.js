var manifest = require('../minigame/assets/art/manifest');
var content = require('../minigame/data/content');
var theme = require('../minigame/src/render/theme').theme;
var management = require('../minigame/src/inn/inn');
var store = require('../minigame/src/core/store');
var drawManagement = require('../minigame/src/render/views/management').drawManagement;

var WIDTH = 844;
var HEIGHT = 390;
var ASSET_ROOT = '../../../minigame/' + manifest.root;
var images = {};
var stages = [];
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

function unique(values) {
  return values.filter(function (value, index) { return value && values.indexOf(value) === index; });
}

function neededPaths() {
  var paths = [];
  (manifest.maps.inn.layers || []).forEach(function (layer) { paths.push(layer.src); });
  ['xiangyu', 'zhantang', 'furong', 'xiucai'].forEach(function (id) {
    var art = manifest.characters[id];
    paths.push(art.portrait);
    Object.keys(art.atlases || {}).forEach(function (direction) { paths.push(art.atlases[direction]); });
  });
  return unique(paths);
}

function preload() {
  return Promise.all(neededPaths().map(function (relative) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { images[relative] = image; resolve(); };
      image.onerror = reject;
      image.src = ASSET_ROOT + relative;
    });
  }));
}

function role(id) {
  var index;
  for (index = 0; index < content.roles.length; index += 1) if (content.roles[index].id === id) return content.roles[index];
  return content.roles[0];
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

function label(value, x, y, size, color, align, family, maxWidth) {
  ctx.font = String(size) + 'px ' + (family || theme.fonts.body);
  ctx.fillStyle = color || theme.colors.ink;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  if (maxWidth != null) ctx.fillText(String(value), x, y, maxWidth);
  else ctx.fillText(String(value), x, y);
}

function addButton(action, x, y, width, height, title, tone) {
  rect(x, y, width, height, tone || theme.colors.gold, theme.colors.wood);
  label(title, x + width / 2, y + height / 2, Math.max(11, Math.min(16, height * 0.34)), theme.colors.ink, 'center', null, width - 8);
}

function cover(image, x, y, width, height) {
  var scale = Math.max(width / image.width, height / image.height);
  var sourceWidth = width / scale;
  var sourceHeight = height / scale;
  ctx.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
}

function portrait(id, x, y, size) {
  var art = manifest.characters[id];
  var image = art && images[art.portrait];
  if (!image) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  cover(image, x, y, size, size);
  ctx.restore();
}

function heroShadow(x, y, spriteHeight) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#241b16';
  ctx.translate(x, y + 1);
  ctx.scale(1, 0.28);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(12, spriteHeight * 0.23), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function atlasPath(art, facing) {
  var direction = facing === 'up' ? 'back' : facing === 'down' ? 'front' : 'side';
  return art.atlases[direction] || art.atlases.side;
}

function artHero(id, x, y, spriteHeight, facing) {
  var art = manifest.characters[id];
  var image = art && images[atlasPath(art, facing)];
  var frameWidth;
  var frameHeight;
  var scale;
  if (!art || !image) return false;
  frameWidth = art.frameSize.width;
  frameHeight = art.frameSize.height;
  scale = spriteHeight / frameHeight;
  ctx.save();
  ctx.translate(x, y);
  if (facing === 'left') ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, frameWidth, frameHeight, -art.pivot.x * scale, -art.pivot.y * scale, frameWidth * scale, frameHeight * scale);
  ctx.restore();
  return true;
}

function fallbackHero(id, x, y, spriteHeight, facing) {
  var item = role(id);
  ctx.save();
  ctx.translate(x, y);
  if (facing === 'left') ctx.scale(-1, 1);
  ctx.fillStyle = item.color;
  ctx.fillRect(-spriteHeight * 0.22, -spriteHeight * 0.58, spriteHeight * 0.44, spriteHeight * 0.55);
  ctx.restore();
}

var ui = {
  ctx: ctx,
  assets: { manifest: manifest, image: function (relative) { return images[relative] || null; } },
  theme: theme,
  width: WIDTH,
  height: HEIGHT,
  rect: rect,
  label: label,
  addButton: addButton,
  hitArea: function () {},
  cover: cover,
  role: role,
  portrait: portrait,
  heroShadow: heroShadow,
  artHero: artHero,
  fallbackHero: fallbackHero,
};

function snapshot(state, name) {
  stages.push({ name: name, state: JSON.parse(JSON.stringify(state)) });
}

function closeResult(state) {
  if (state.managementEvent) management.dispatch(state, { type: 'managementEventClose' });
}

function resolveEpisode(state) {
  if (!state.episodes.pendingId) return;
  management.dispatch(state, { type: 'episodeOpen' });
  management.dispatch(state, { type: 'episodeChoice', index: 0 });
  closeResult(state);
}

function buildStages() {
  var state = store.freshState();
  state.screen = 'inn';
  snapshot(state, '01-morning');
  state.managementPage = 'staff';
  snapshot(state, '02-staff');
  state.managementPage = 'today';
  management.dispatch(state, { type: 'episodeOpen' });
  snapshot(state, '03-episode');
  management.dispatch(state, { type: 'episodeChoice', index: 0 });
  closeResult(state);
  management.dispatch(state, { type: 'prep', id: 'clean' });
  management.dispatch(state, { type: 'startShift' });
  snapshot(state, '04-noon-event');
  management.dispatch(state, { type: 'serviceChoice', index: 0 });
  snapshot(state, '05-service-result');
  closeResult(state);
  snapshot(state, '06-minigame');
  while (management.currentServiceStep(state) && management.currentServiceStep(state).kind === 'minigame') {
    var game = state.service.miniGame;
    management.dispatch(state, { type: 'miniGameChoice', index: game.rounds[game.round].correct });
  }
  closeResult(state);
  management.dispatch(state, { type: 'serviceChoice', index: 0 });
  closeResult(state);
  snapshot(state, '07-evening');
  resolveEpisode(state);
  management.dispatch(state, { type: 'settle' });
  snapshot(state, '08-settlement');
}

window.renderStage = function (index) {
  var stage = stages[index];
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawManagement(ui, JSON.parse(JSON.stringify(stage.state)));
  return stage.name;
};

preload().then(function () {
  var requestedStage = Math.max(0, parseInt(new URLSearchParams(window.location.search).get('stage') || '0', 10) || 0);
  buildStages();
  window.renderStage(Math.min(requestedStage, stages.length - 1));
  window.__stageCount = stages.length;
  window.__ready = true;
}).catch(function (error) {
  window.__previewError = String(error && error.message || error);
  window.__ready = false;
});
