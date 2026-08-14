'use strict';

var assert = require('assert');
var originalSetInterval = global.setInterval;
var storage = {};
var handlers = {};
var draws = 0;

function context() {
  var gradient = { addColorStop: function () {} };
  return new Proxy({
    fillRect: function () { draws += 1; },
    strokeRect: function () { draws += 1; },
    fillText: function () { draws += 1; },
    drawImage: function () { draws += 1; },
    measureText: function (value) { return { width: String(value || '').length * 8 }; },
    createLinearGradient: function () { return gradient; },
    createRadialGradient: function () { return gradient; },
  }, {
    get: function (target, key) { return key in target ? target[key] : function () {}; },
    set: function (target, key, value) { target[key] = value; return true; },
  });
}

var canvas = { width: 1, height: 1, getContext: function () { return context(); } };
global.wx = {
  createCanvas: function () { return canvas; },
  createImage: function () {
    var image = { width: 64, height: 64 };
    Object.defineProperty(image, 'src', { set: function () { if (image.onerror) image.onerror({ errMsg: 'offline render test' }); } });
    return image;
  },
  getWindowInfo: function () { return { windowWidth: 844, windowHeight: 390, pixelRatio: 1, safeArea: { left: 0, top: 0, width: 844, height: 390 } }; },
  getMenuButtonBoundingClientRect: function () { return { left: 780, top: 8, right: 838, bottom: 40, width: 58, height: 32 }; },
  getStorageSync: function (key) { return storage[key]; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  onTouchStart: function (fn) { handlers.start = fn; },
  onTouchMove: function (fn) { handlers.move = fn; },
  onTouchEnd: function (fn) { handlers.end = fn; },
  onTouchCancel: function (fn) { handlers.cancel = fn; },
};

try {
  global.setInterval = function () { return 1; };
  var controller = require('../minigame/src/app').createGame(canvas);
  var touch = { identifier: 1, clientX: 210, clientY: 260 };
  handlers.start({ changedTouches: [touch] });
  handlers.end({ changedTouches: [touch] });
  controller.redraw();
  assert.strictEqual(controller.runtimeError(), null, '棋盘首帧渲染出现异常');
  assert(storage['dengxia-rpg-save-v11'], '棋盘入口没有写入 v11 存档');
  assert.strictEqual(storage['dengxia-rpg-save-v11'].screen, 'board');
  assert(draws > 20, '棋盘首帧绘制内容过少：' + draws);
  console.log('Board render smoke passed: title entry, 844x390 canvas and fallback assets.');
} finally {
  global.setInterval = originalSetInterval;
  delete global.wx;
}
