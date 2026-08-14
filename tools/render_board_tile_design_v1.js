'use strict';

var fs = require('fs');
var path = require('path');
var canvasKit = require('@napi-rs/canvas');
var createCanvas = canvasKit.createCanvas;
var loadImage = canvasKit.loadImage;

var WIDTH = 1200;
var HEIGHT = 780;
var canvas = createCanvas(WIDTH, HEIGHT);
var ctx = canvas.getContext('2d');
var titleFont = '"Songti SC","STSong","SimSun",serif';
var bodyFont = '"PingFang SC","Microsoft YaHei",sans-serif';

var TYPES = [
  { id: 'landmark', name: '地标格', note: '进入正式场景，自由探索', color: '#a66b38' },
  { id: 'property', name: '产业格', note: '合作、升级与每日收益', color: '#bd9151' },
  { id: 'npc', name: '侠客格', note: '结识人物、交易与支线', color: '#a84235' },
  { id: 'event', name: '风波格', note: '随机事件与连续事件链', color: '#79604b' },
  { id: 'supply', name: '补给格', note: '食材、道具与商路物资', color: '#47735b' },
  { id: 'battle', name: '护路格', note: '战斗、护送与风险收益', color: '#8c312b' },
  { id: 'chance', name: '驿马格', note: '捷径、换路或额外移动', color: '#376f73' },
  { id: 'rest', name: '歇脚格', note: '恢复精力并整理队伍', color: '#665f74' },
];

var STATES = [
  { id: 'hidden', name: '未发现' },
  { id: 'ready', name: '可落点' },
  { id: 'active', name: '当前格' },
  { id: 'owned', name: '我方产业' },
  { id: 'rival', name: '对手产业' },
  { id: 'done', name: '已完成' },
  { id: 'locked', name: '未解锁' },
];

var REGIONS = [
  ['客栈镇心', '#ad6438'], ['老槐东关', '#b27a46'], ['桥驿商道', '#718153'],
  ['纸墨转运', '#81715d'], ['商会粮仓', '#b58a38'], ['义仓水路', '#50775e'],
  ['商盟旧案', '#75596e'], ['江南水巷', '#377c78'], ['百味香路', '#955743'],
];

function rounded(x, y, width, height, radius) {
  var r = Math.min(radius, width / 2, height / 2);
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

function label(text, x, y, size, color, align, family, weight) {
  ctx.font = (weight ? weight + ' ' : '') + size + 'px ' + (family || bodyFont);
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function octagon(x, y, radius) {
  ctx.beginPath();
  for (var i = 0; i < 8; i += 1) {
    var angle = -Math.PI / 8 + i * Math.PI / 4;
    var px = x + Math.cos(angle) * radius;
    var py = y + Math.sin(angle) * radius;
    if (!i) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawRoad(x, y, width) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#241812d9';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.strokeStyle = '#d8bc79';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = '#65503a';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 9]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawIcon(type, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'landmark') {
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -3 * scale);
    ctx.quadraticCurveTo(0, -17 * scale, 16 * scale, -3 * scale);
    ctx.lineTo(12 * scale, 2 * scale);
    ctx.quadraticCurveTo(0, -5 * scale, -12 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeRect(-10 * scale, 2 * scale, 20 * scale, 15 * scale);
    ctx.beginPath();
    ctx.moveTo(0, 3 * scale);
    ctx.lineTo(0, 17 * scale);
    ctx.stroke();
  } else if (type === 'property') {
    ctx.beginPath();
    ctx.moveTo(-15 * scale, -10 * scale);
    ctx.lineTo(15 * scale, -10 * scale);
    ctx.lineTo(12 * scale, -2 * scale);
    ctx.lineTo(-12 * scale, -2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeRect(-12 * scale, -2 * scale, 24 * scale, 18 * scale);
    ctx.beginPath();
    ctx.moveTo(-4 * scale, 16 * scale);
    ctx.lineTo(-4 * scale, 5 * scale);
    ctx.lineTo(5 * scale, 5 * scale);
    ctx.lineTo(5 * scale, 16 * scale);
    ctx.stroke();
  } else if (type === 'npc') {
    ctx.beginPath();
    ctx.arc(0, -8 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14 * scale, 16 * scale);
    ctx.quadraticCurveTo(-12 * scale, 0, 0, 0);
    ctx.quadraticCurveTo(12 * scale, 0, 14 * scale, 16 * scale);
    ctx.stroke();
  } else if (type === 'event') {
    ctx.beginPath();
    ctx.moveTo(-13 * scale, -16 * scale);
    ctx.lineTo(10 * scale, -13 * scale);
    ctx.lineTo(13 * scale, 14 * scale);
    ctx.lineTo(-10 * scale, 16 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7 * scale, -7 * scale);
    ctx.quadraticCurveTo(7 * scale, -12 * scale, 6 * scale, 0);
    ctx.quadraticCurveTo(4 * scale, 8 * scale, -4 * scale, 8 * scale);
    ctx.stroke();
  } else if (type === 'supply') {
    ctx.beginPath();
    ctx.moveTo(-15 * scale, -4 * scale);
    ctx.lineTo(-11 * scale, 15 * scale);
    ctx.lineTo(11 * scale, 15 * scale);
    ctx.lineTo(15 * scale, -4 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -3 * scale, 12 * scale, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.moveTo(-8 * scale, 2 * scale);
    ctx.lineTo(8 * scale, 2 * scale);
    ctx.moveTo(-7 * scale, 8 * scale);
    ctx.lineTo(7 * scale, 8 * scale);
    ctx.stroke();
  } else if (type === 'battle') {
    [-1, 1].forEach(function (direction) {
      ctx.save();
      ctx.rotate(direction * 0.72);
      ctx.beginPath();
      ctx.moveTo(0, -18 * scale);
      ctx.lineTo(3 * scale, 9 * scale);
      ctx.lineTo(0, 15 * scale);
      ctx.lineTo(-3 * scale, 9 * scale);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });
  } else if (type === 'chance') {
    ctx.beginPath();
    ctx.moveTo(-14 * scale, 10 * scale);
    ctx.quadraticCurveTo(-12 * scale, -14 * scale, 3 * scale, -14 * scale);
    ctx.quadraticCurveTo(16 * scale, -10 * scale, 12 * scale, 5 * scale);
    ctx.quadraticCurveTo(7 * scale, 15 * scale, -2 * scale, 12 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4 * scale, -7 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-15 * scale, 3 * scale);
    ctx.quadraticCurveTo(0, 15 * scale, 15 * scale, 3 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -2 * scale);
    ctx.quadraticCurveTo(0, 6 * scale, 10 * scale, -2 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14 * scale, -11 * scale);
    ctx.quadraticCurveTo(20 * scale, -16 * scale, 23 * scale, -8 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTile(type, x, y, radius, state) {
  var config = TYPES.filter(function (entry) { return entry.id === type; })[0] || TYPES[0];
  var fill = config.color;
  var icon = '#fff0c7';
  var alpha = 1;
  ctx.save();
  if (state === 'hidden') { fill = '#7a756c'; alpha = 0.62; }
  if (state === 'owned') fill = '#2f7461';
  if (state === 'rival') fill = '#a64034';
  if (state === 'locked') { fill = '#53514f'; alpha = 0.72; }

  if (state === 'active') {
    var halo = ctx.createRadialGradient(x, y, radius, x, y, radius + 22);
    halo.addColorStop(0, '#ffd66caa');
    halo.addColorStop(1, '#ffd66c00');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius + 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.24 * alpha;
  ctx.fillStyle = '#1f1612';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.75, radius * 0.9, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#dcb75c';
  octagon(x, y, radius + 5);
  ctx.fill();
  ctx.strokeStyle = '#432d20';
  ctx.lineWidth = 2;
  ctx.stroke();

  var surface = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  surface.addColorStop(0, '#f4dfaa');
  surface.addColorStop(0.12, fill);
  surface.addColorStop(0.82, fill);
  surface.addColorStop(1, '#2c211c');
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = state === 'active' ? '#fff3bd' : '#4d3527';
  ctx.lineWidth = state === 'active' ? 3 : 1.5;
  ctx.stroke();
  drawIcon(type, x, y, radius / 34, icon);

  if (state === 'owned' || state === 'rival') {
    ctx.fillStyle = state === 'owned' ? '#1f5144' : '#7c2d29';
    ctx.beginPath();
    ctx.moveTo(x - radius - 9, y - 6);
    ctx.lineTo(x - radius + 4, y - 6);
    ctx.lineTo(x - radius + 4, y + 9);
    ctx.lineTo(x - radius - 4, y + 5);
    ctx.lineTo(x - radius - 9, y + 10);
    ctx.closePath();
    ctx.fill();
  }
  if (state === 'done') {
    ctx.strokeStyle = '#a9322a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + radius * 0.62, y - radius * 0.58, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.52, y - radius * 0.58);
    ctx.lineTo(x + radius * 0.60, y - radius * 0.47);
    ctx.lineTo(x + radius * 0.75, y - radius * 0.70);
    ctx.stroke();
  }
  if (state === 'locked') {
    ctx.strokeStyle = '#d7c6a2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 5, 11, Math.PI, 0);
    ctx.stroke();
    ctx.strokeRect(x - 13, y - 5, 26, 20);
  }
  ctx.restore();
}

async function render() {
  var background = await loadImage(path.resolve(__dirname, '..', 'minigame', 'assets', 'art', 'board', 'wuxia-world-v3.jpg'));
  ctx.drawImage(background, 0, 0, background.width, background.height, 0, 0, WIDTH, 300);
  var overlay = ctx.createLinearGradient(0, 0, 0, 310);
  overlay.addColorStop(0, '#1e17118c');
  overlay.addColorStop(0.72, '#39291b30');
  overlay.addColorStop(1, '#ead8ac');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, 310);
  ctx.fillStyle = '#ead8ac';
  ctx.fillRect(0, 300, WIDTH, HEIGHT - 300);

  label('武侠棋格视觉系统 · 第一稿', 48, 46, 28, '#fff0c6', 'left', titleFont, '600');
  label('铜木印牌落在驿道上；功能靠轮廓识别，颜色只用于状态和地域。', 50, 82, 14, '#e3d3ad', 'left', bodyFont);

  TYPES.forEach(function (type, index) {
    var col = index % 4;
    var row = Math.floor(index / 4);
    var x = 55 + col * 286;
    var y = 128 + row * 135;
    ctx.save();
    ctx.fillStyle = '#211815bf';
    rounded(x, y, 258, 112, 6);
    ctx.fill();
    ctx.strokeStyle = '#c49547aa';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    drawRoad(x + 20, y + 57, 92);
    drawTile(type.id, x + 74, y + 57, type.id === 'landmark' ? 31 : 26, 'ready');
    label(type.name, x + 126, y + 37, 17, '#f7e8bf', 'left', titleFont, '600');
    label(type.note, x + 126, y + 65, 11, '#cdbb94', 'left', bodyFont);
    label(type.id === 'landmark' ? '大格 · 常显名称' : '标准格 · 近距显示', x + 126, y + 87, 10, '#a99470', 'left', bodyFont);
  });

  label('状态层', 50, 423, 20, '#7f3028', 'left', titleFont, '600');
  label('同一基础格只叠加状态，不重新换图，避免玩家重新学习。', 126, 423, 12, '#6a5944', 'left', bodyFont);
  STATES.forEach(function (state, index) {
    var x = 80 + index * 157;
    drawRoad(x - 45, 488, 90);
    drawTile('property', x, 488, 27, state.id);
    label(state.name, x, 534, 12, '#36291f', 'center', bodyFont, '600');
  });

  ctx.strokeStyle = '#8e7654';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 566);
  ctx.lineTo(WIDTH - 48, 566);
  ctx.stroke();
  label('九域换肤', 50, 598, 20, '#7f3028', 'left', titleFont, '600');
  label('只改变外圈矿物色、旗帜与地貌纹样；图标轮廓始终固定。', 144, 598, 12, '#6a5944', 'left', bodyFont);

  REGIONS.forEach(function (region, index) {
    var x = 53 + index * 126;
    var y = 642;
    ctx.fillStyle = '#2b211c';
    rounded(x, y, 112, 62, 4);
    ctx.fill();
    ctx.fillStyle = region[1];
    ctx.fillRect(x, y, 7, 62);
    drawTile('rest', x + 30, y + 30, 17, 'ready');
    label(region[0], x + 54, y + 23, 11, '#f5e5bc', 'left', titleFont);
    label(index < 3 ? '关中' : index < 7 ? '商路' : '江南', x + 54, y + 43, 9, '#ae9d7c', 'left', bodyFont);
  });

  label('建议运行尺寸：普通格 34px / 地标格 46px；可点击区域统一扩展至 44px 以上。', 50, 744, 12, '#66543f', 'left', bodyFont);
  var output = path.resolve(__dirname, '..', 'outputs', 'board-tile-design-v1.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  console.log(output);
}

render().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
