'use strict';

var fs = require('fs');
var path = require('path');
var canvasKit = require('@napi-rs/canvas');
var createCanvas = canvasKit.createCanvas;
var loadImage = canvasKit.loadImage;

var source = process.argv[2] || 'D:\\AI\\design-assets\\grand-board\\v4\\premium-board-tokens-source.png';
var output = process.argv[3] || path.resolve(__dirname, '..', 'minigame', 'assets', 'art', 'board', 'token-atlas-v4.png');
var frame = 128;
var columns = 4;
var rows = 2;
var cropSize = 360;
var centers = [
  [207, 282],
  [568, 282],
  [946, 282],
  [1305, 282],
  [207, 682],
  [568, 682],
  [946, 682],
  [1305, 682],
];

function drawFrame(ctx, image, index) {
  var center = centers[index];
  var destinationX = index % columns * frame;
  var destinationY = Math.floor(index / columns) * frame;
  var inset = 3;

  ctx.save();
  ctx.beginPath();
  ctx.arc(destinationX + frame / 2, destinationY + frame / 2, frame / 2 - inset, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    image,
    center[0] - cropSize / 2,
    center[1] - cropSize / 2,
    cropSize,
    cropSize,
    destinationX + inset,
    destinationY + inset,
    frame - inset * 2,
    frame - inset * 2
  );
  ctx.restore();
}

function liftForMobile(ctx, width, height) {
  var pixels = ctx.getImageData(0, 0, width, height);
  var data = pixels.data;
  for (var offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3]) continue;
    data[offset] = Math.min(255, Math.pow(data[offset] / 255, 0.78) * 266 + 4);
    data[offset + 1] = Math.min(255, Math.pow(data[offset + 1] / 255, 0.82) * 260 + 3);
    data[offset + 2] = Math.min(255, Math.pow(data[offset + 2] / 255, 0.86) * 254 + 2);
  }
  ctx.putImageData(pixels, 0, 0);
}

async function build() {
  var image = await loadImage(source);
  var canvas = createCanvas(frame * columns, frame * rows);
  var ctx = canvas.getContext('2d');

  centers.forEach(function (_, index) { drawFrame(ctx, image, index); });
  liftForMobile(ctx, canvas.width, canvas.height);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  console.log(output);
}

build().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
