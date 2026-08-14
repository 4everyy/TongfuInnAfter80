'use strict';

var fs = require('fs');
var path = require('path');
var canvasKit = require('@napi-rs/canvas');
var createCanvas = canvasKit.createCanvas;
var loadImage = canvasKit.loadImage;

var W = 844;
var H = 390;
var titleFont = '"Songti SC","STSong","SimSun",serif';
var bodyFont = '"PingFang SC","Microsoft YaHei",sans-serif';
var root = path.resolve(__dirname, '..');

var files = {
  world: 'minigame/assets/art/board/wuxia-world-v3.jpg',
  bridge: 'minigame/subpackages/scene-core-v34/assets/art/maps/stone_bridge/background.jpg',
  yard: 'minigame/subpackages/scene-core-v34/assets/art/maps/yard/background.jpg',
  xiangyu: 'minigame/assets/art/characters/xiangyu/portrait-v9.webp',
  zhantang: 'minigame/assets/art/characters/zhantang/portrait-v9.webp',
  furong: 'minigame/assets/art/characters/furong/portrait.webp',
  xiucai: 'minigame/assets/art/characters/xiucai/portrait.webp',
};

function rounded(ctx, x, y, width, height, radius) {
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

function label(ctx, text, x, y, size, color, align, family, weight) {
  ctx.font = (weight ? weight + ' ' : '') + size + 'px ' + (family || bodyFont);
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function cover(ctx, image, x, y, width, height, focusY) {
  var scale = Math.max(width / image.width, height / image.height);
  var sw = width / scale;
  var sh = height / scale;
  var sx = (image.width - sw) / 2;
  var sy = (image.height - sh) * (focusY == null ? 0.5 : focusY);
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function cutPanel(ctx, x, y, width, height, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + width - 9, y);
  ctx.lineTo(x + width, y + 9);
  ctx.lineTo(x + width - 5, y + height - 6);
  ctx.lineTo(x + width - 13, y + height);
  ctx.lineTo(x + 6, y + height);
  ctx.lineTo(x, y + height - 8);
  ctx.lineTo(x, y + 8);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke || '#c79a4c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function portrait(ctx, image, x, y, size, color, active) {
  ctx.save();
  if (active) {
    ctx.shadowColor = '#ffd56c';
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = '#271c17';
  ctx.beginPath();
  ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 4 : 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.clip();
  cover(ctx, image, x - size / 2, y - size / 2, size, size, 0.22);
  ctx.restore();
}

function drawCoin(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color || '#e3b653';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * scale, 6 * scale, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6e4322';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#5f3f28';
  ctx.fillRect(-2 * scale, -2 * scale, 4 * scale, 4 * scale);
  ctx.restore();
}

function drawSeal(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ad3d31';
  ctx.beginPath();
  ctx.moveTo(0, -12 * scale);
  ctx.lineTo(11 * scale, -4 * scale);
  ctx.lineTo(8 * scale, 10 * scale);
  ctx.lineTo(-8 * scale, 10 * scale);
  ctx.lineTo(-11 * scale, -4 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f1c96b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawItemIcon(ctx, type, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color || '#fff0c3';
  ctx.fillStyle = color || '#fff0c3';
  ctx.lineWidth = 2.4 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'needle') {
    ctx.beginPath();
    ctx.moveTo(-15 * scale, 12 * scale);
    ctx.lineTo(13 * scale, -14 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14 * scale, -15 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'tea') {
    ctx.beginPath();
    ctx.moveTo(-13 * scale, -3 * scale);
    ctx.lineTo(8 * scale, -3 * scale);
    ctx.lineTo(6 * scale, 11 * scale);
    ctx.lineTo(-10 * scale, 11 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9 * scale, 3 * scale, 7 * scale, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -9 * scale);
    ctx.quadraticCurveTo(-1 * scale, -14 * scale, 3 * scale, -9 * scale);
    ctx.stroke();
  } else if (type === 'palm') {
    ctx.beginPath();
    ctx.arc(0, 3 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.stroke();
    [-9, -4, 1, 6].forEach(function (offset, index) {
      ctx.beginPath();
      ctx.moveTo(offset * scale, -4 * scale);
      ctx.lineTo((offset + 2) * scale, (-17 + Math.abs(index - 1.5) * 2) * scale);
      ctx.stroke();
    });
  } else if (type === 'dice') {
    rounded(ctx, -14 * scale, -14 * scale, 28 * scale, 28 * scale, 5 * scale);
    ctx.stroke();
    [[-6, -6], [6, 6], [0, 0]].forEach(function (point) {
      ctx.beginPath();
      ctx.arc(point[0] * scale, point[1] * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

function drawRankStrip(ctx, portraits, activeIndex) {
  var names = ['佟湘玉', '白展堂', '郭芙蓉', '吕秀才'];
  var colors = ['#d7a744', '#3f7d72', '#ad4235', '#736383'];
  var scores = ['令 2 · 银 64', '令 1 · 银 92', '令 1 · 银 78', '令 0 · 银 110'];
  for (var i = 0; i < 4; i += 1) {
    var x = 16 + i * 128;
    var y = 8;
    cutPanel(ctx, x + 22, y + 3, 104, 39, i === activeIndex ? '#49301fe8' : '#241a16d9', colors[i]);
    portrait(ctx, portraits[i], x + 24, y + 22, 38, colors[i], i === activeIndex);
    label(ctx, names[i], x + 48, y + 16, 11, '#fff1cb', 'left', titleFont, '600');
    label(ctx, scores[i], x + 48, y + 31, 8, '#cbb891', 'left', bodyFont);
  }
}

function drawSafeCapsule(ctx) {
  ctx.fillStyle = '#191311e8';
  rounded(ctx, 772, 8, 64, 34, 17);
  ctx.fill();
  ctx.strokeStyle = '#655b55';
  ctx.stroke();
  [791, 802, 813].forEach(function (x) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, 25, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderBoard(images) {
  var canvas = createCanvas(W, H);
  var ctx = canvas.getContext('2d');
  cover(ctx, images.world, 0, 0, W, H, 0.38);
  ctx.fillStyle = '#15211b26';
  ctx.fillRect(0, 0, W, H);
  drawRankStrip(ctx, [images.xiangyu, images.zhantang, images.furong, images.xiucai], 0);
  drawSafeCapsule(ctx);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a1d16e8';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(34, 248);
  ctx.bezierCurveTo(186, 180, 286, 314, 430, 238);
  ctx.bezierCurveTo(560, 168, 662, 254, 814, 174);
  ctx.stroke();
  ctx.strokeStyle = '#d8b96d';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#6c4d2f';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  var nodeX = [96, 206, 318, 430, 544, 658, 770];
  var nodeY = [223, 235, 270, 238, 209, 220, 188];
  var colors = ['#b1783c', '#497866', '#a33e33', '#6e5e73', '#3d7578', '#9a5d38', '#b1783c'];
  for (var i = 0; i < nodeX.length; i += 1) {
    ctx.fillStyle = '#dcb85f';
    ctx.beginPath();
    ctx.arc(nodeX[i], nodeY[i], i === 3 ? 24 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(nodeX[i], nodeY[i], i === 3 ? 20 : 14, 0, Math.PI * 2);
    ctx.fill();
    drawItemIcon(ctx, i === 2 ? 'palm' : i === 4 ? 'tea' : 'dice', nodeX[i], nodeY[i], 0.45, '#fff0c7');
  }

  portrait(ctx, images.xiangyu, 430, 190, 64, '#ffd468', true);
  ctx.fillStyle = '#2b1d17e8';
  rounded(ctx, 357, 280, 150, 30, 5);
  ctx.fill();
  label(ctx, '佟湘玉的回合', 432, 295, 14, '#ffe7a3', 'center', titleFont, '600');

  cutPanel(ctx, 14, 316, 244, 61, '#211815e8', '#a57c3f');
  label(ctx, '随身锦囊', 28, 329, 10, '#cbb78e', 'left', bodyFont);
  ['needle', 'tea', 'palm'].forEach(function (type, index) {
    var x = 63 + index * 62;
    ctx.fillStyle = index === 0 ? '#8f352ce8' : '#4a382fe8';
    rounded(ctx, x - 22, 339, 46, 32, 4);
    ctx.fill();
    ctx.strokeStyle = index === 0 ? '#f0c55a' : '#826b4c';
    ctx.stroke();
    drawItemIcon(ctx, type, x + 1, 355, 0.62, '#fff0c7');
  });

  cutPanel(ctx, 602, 304, 114, 68, '#263d35ed', '#c6a04f');
  drawSeal(ctx, 629, 337, 0.85);
  label(ctx, '江湖令', 650, 324, 10, '#c9b690', 'left', bodyFont);
  label(ctx, '2', 672, 347, 23, '#fff0bd', 'center', titleFont, '700');
  ctx.fillStyle = '#713a28';
  rounded(ctx, 735, 296, 92, 80, 24);
  ctx.fill();
  ctx.strokeStyle = '#e1b955';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawItemIcon(ctx, 'dice', 781, 329, 1.15, '#fff0c7');
  label(ctx, '掷骰', 781, 359, 12, '#fff0c7', 'center', titleFont, '600');
  return canvas;
}

function renderItem(images) {
  var canvas = createCanvas(W, H);
  var ctx = canvas.getContext('2d');
  cover(ctx, images.bridge, 0, 0, W, H, 0.45);
  var tint = ctx.createLinearGradient(0, 0, W, 0);
  tint.addColorStop(0, '#18241fcc');
  tint.addColorStop(0.48, '#18241f38');
  tint.addColorStop(1, '#481e1dcc');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  drawRankStrip(ctx, [images.xiangyu, images.zhantang, images.furong, images.xiucai], 0);
  drawSafeCapsule(ctx);

  portrait(ctx, images.xiangyu, 165, 184, 122, '#e1b653', true);
  portrait(ctx, images.zhantang, 675, 184, 122, '#a73e35', false);
  label(ctx, '佟湘玉', 165, 260, 18, '#fff0c8', 'center', titleFont, '600');
  label(ctx, '白展堂', 675, 260, 18, '#fff0c8', 'center', titleFont, '600');

  ctx.strokeStyle = '#e6bd52';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(235, 184);
  ctx.quadraticCurveTo(422, 100, 608, 184);
  ctx.stroke();
  ctx.setLineDash([]);
  for (var i = 0; i < 5; i += 1) {
    drawCoin(ctx, 285 + i * 68, 149 - Math.sin(i / 4 * Math.PI) * 31, 0.8, '#e4b956');
  }
  ctx.fillStyle = '#a63d31';
  rounded(ctx, 362, 80, 120, 42, 6);
  ctx.fill();
  ctx.strokeStyle = '#f0c660';
  ctx.stroke();
  drawItemIcon(ctx, 'needle', 390, 101, 0.64, '#fff0c7');
  label(ctx, '点穴铜钱', 415, 101, 15, '#fff0c7', 'left', titleFont, '600');

  cutPanel(ctx, 220, 286, 404, 88, '#201715ed', '#d0a34d');
  label(ctx, '选择目标', 242, 303, 11, '#c7b38b', 'left', bodyFont);
  label(ctx, '令目标下一回合无法移动', 242, 326, 14, '#f9e9bd', 'left', titleFont, '600');
  label(ctx, '命中率 100%  ·  使用后消耗', 242, 350, 10, '#af9d7a', 'left', bodyFont);
  ctx.fillStyle = '#9f3c32';
  rounded(ctx, 498, 310, 106, 48, 7);
  ctx.fill();
  ctx.strokeStyle = '#efc45a';
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, '出手', 551, 334, 16, '#fff1c7', 'center', titleFont, '700');
  return canvas;
}

function renderResult(images) {
  var canvas = createCanvas(W, H);
  var ctx = canvas.getContext('2d');
  cover(ctx, images.yard, 0, 0, W, H, 0.42);
  ctx.fillStyle = '#17120f78';
  ctx.fillRect(0, 0, W, H);
  var beam = ctx.createRadialGradient(422, 170, 20, 422, 170, 290);
  beam.addColorStop(0, '#ffe8a17a');
  beam.addColorStop(1, '#f2c75a00');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, W, H);
  drawSafeCapsule(ctx);

  label(ctx, '跑堂争速', 422, 31, 15, '#d7c49d', 'center', titleFont);
  label(ctx, '小游戏结算', 422, 61, 27, '#fff0c6', 'center', titleFont, '700');
  ctx.fillStyle = '#b13d31';
  ctx.fillRect(347, 79, 150, 3);

  var entries = [
    { image: images.xiangyu, name: '佟湘玉', rank: '壹', x: 332, y: 119, w: 180, h: 224, color: '#dcae4c', reward: '+20 银  +1 令' },
    { image: images.furong, name: '郭芙蓉', rank: '贰', x: 126, y: 166, w: 154, h: 177, color: '#a84235', reward: '+12 银' },
    { image: images.zhantang, name: '白展堂', rank: '叁', x: 564, y: 180, w: 154, h: 163, color: '#3f7a70', reward: '+8 银' },
    { image: images.xiucai, name: '吕秀才', rank: '肆', x: 20, y: 211, w: 92, h: 132, color: '#70617b', reward: '+4 银' },
  ];
  entries.forEach(function (entry, index) {
    ctx.save();
    if (!index) {
      ctx.shadowColor = '#ffd663';
      ctx.shadowBlur = 20;
    }
    cutPanel(ctx, entry.x, entry.y, entry.w, entry.h, '#211815e8', entry.color);
    ctx.restore();
    ctx.fillStyle = entry.color;
    ctx.beginPath();
    ctx.arc(entry.x + 24, entry.y + 24, 18, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, entry.rank, entry.x + 24, entry.y + 24, 18, '#fff1c7', 'center', titleFont, '700');
    var pSize = index === 0 ? 104 : index === 3 ? 58 : 82;
    portrait(ctx, entry.image, entry.x + entry.w / 2, entry.y + (index === 0 ? 91 : 76), pSize, entry.color, !index);
    label(ctx, entry.name, entry.x + entry.w / 2, entry.y + entry.h - 53, index === 0 ? 18 : 14, '#fff0c7', 'center', titleFont, '600');
    label(ctx, entry.reward, entry.x + entry.w / 2, entry.y + entry.h - 27, index === 0 ? 12 : 10, '#e6c36e', 'center', bodyFont, '600');
  });

  ctx.fillStyle = '#2d5f53';
  rounded(ctx, 735, 292, 92, 72, 18);
  ctx.fill();
  ctx.strokeStyle = '#d6b052';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawSeal(ctx, 781, 319, 0.9);
  label(ctx, '归账', 781, 346, 13, '#fff0c7', 'center', titleFont, '600');
  return canvas;
}

async function main() {
  var images = {};
  var keys = Object.keys(files);
  for (var i = 0; i < keys.length; i += 1) images[keys[i]] = await loadImage(path.resolve(root, files[keys[i]]));
  var outputDir = path.resolve(root, 'outputs', 'party-ui-v1');
  fs.mkdirSync(outputDir, { recursive: true });
  var results = [
    ['01-board-action.png', renderBoard(images)],
    ['02-item-attack.png', renderItem(images)],
    ['03-minigame-result.png', renderResult(images)],
  ];
  results.forEach(function (entry) {
    var output = path.join(outputDir, entry[0]);
    fs.writeFileSync(output, entry[1].toBuffer('image/png'));
    console.log(output);
  });
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
