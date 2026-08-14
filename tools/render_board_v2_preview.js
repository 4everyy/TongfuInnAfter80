'use strict';

var fs = require('fs');
var path = require('path');
var canvasKit = require('@napi-rs/canvas');
var createCanvas = canvasKit.createCanvas;
var NativeImage = canvasKit.Image;
var canvas = createCanvas(844, 390);
var minigameRoot = path.resolve(__dirname, '..', 'minigame');
var nativeSrc = Object.getOwnPropertyDescriptor(NativeImage.prototype, 'src');

global.wx = {
  createImage: function () {
    var image = new NativeImage();
    Object.defineProperty(image, 'src', {
      set: function (value) {
        try {
          nativeSrc.set.call(image, fs.readFileSync(path.resolve(minigameRoot, value)));
          if (image.onload) image.onload();
        } catch (error) {
          if (image.onerror) image.onerror({ errMsg: error.message });
        }
      },
    });
    return image;
  },
  getWindowInfo: function () {
    return { windowWidth: 844, windowHeight: 390, pixelRatio: 1, safeArea: { left: 0, top: 0, width: 844, height: 390 } };
  },
  getMenuButtonBoundingClientRect: function () {
    return { left: 780, top: 8, right: 838, bottom: 40, width: 58, height: 32 };
  },
};

var store = require('../minigame/src/core/store');
var boardSystem = require('../minigame/src/board/board');
var renderer = require('../minigame/src/render/canvas').createRenderer(canvas);
var state = store.freshState();
boardSystem.start(state);
state.board.discovered = {};
definitionDiscovery(state);

renderPreviews().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});

async function renderPreviews() {
  var outputDir = path.resolve(__dirname, '..', 'outputs');
  var outputPath = path.join(outputDir, 'grand-board-v5-preview.png');
  var rollingPath = path.join(outputDir, 'grand-board-v5-dice-preview.png');
  var jiangnanPath = path.join(outputDir, 'grand-board-v5-jiangnan-preview.png');
  var jiangnanState;
  renderer.render(state);
  await new Promise(function (resolve) { setTimeout(resolve, 30); });
  renderer.render(state);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(outputPath);

  boardSystem.dispatch(state, { type: 'boardRoll' });
  state.board.rollStartedAt = Date.now() - 660;
  state.board.rollingUntil = state.board.rollStartedAt + state.board.rollDuration;
  state.board.nextStepAt = state.board.rollingUntil + 300;
  renderer.render(state);
  await new Promise(function (resolve) { setTimeout(resolve, 16); });
  renderer.render(state);
  fs.writeFileSync(rollingPath, canvas.toBuffer('image/png'));
  console.log(rollingPath);

  jiangnanState = store.freshState();
  boardSystem.start(jiangnanState);
  jiangnanState.board.tileId = 'r7-0';
  jiangnanState.board.lastTileId = 'r7-0';
  jiangnanState.board.moving = false;
  jiangnanState.board.rollingUntil = 0;
  jiangnanState.board.rollStartedAt = 0;
  boardSystem.definition.tiles.forEach(function (tile) {
    if (tile.regionIndex === 7 || tile.type === 'landmark') jiangnanState.board.discovered[tile.id] = true;
  });
  renderer.render(jiangnanState);
  await new Promise(function (resolve) { setTimeout(resolve, 16); });
  renderer.render(jiangnanState);
  fs.writeFileSync(jiangnanPath, canvas.toBuffer('image/png'));
  console.log(jiangnanPath);
}

function definitionDiscovery(target) {
  var definition = boardSystem.definition;
  definition.tiles.forEach(function (tile) {
    if (tile.regionIndex === 0 || tile.type === 'landmark') target.board.discovered[tile.id] = true;
  });
}
