function safeWindowInfo() {
  var info = {};
  try {
    if (wx.getWindowInfo) info = wx.getWindowInfo() || {};
  } catch (error) {}
  if (!info.windowWidth || !info.windowHeight) {
    try {
      if (wx.getSystemInfoSync) info = wx.getSystemInfoSync() || {};
    } catch (error) {}
  }
  return {
    windowWidth: Math.max(1, Number(info.windowWidth) || 844),
    windowHeight: Math.max(1, Number(info.windowHeight) || 390),
    pixelRatio: Math.max(1, Number(info.pixelRatio) || 1),
  };
}

function prepareCanvas(canvas) {
  var info = safeWindowInfo();
  var logicalScale = Math.min(info.windowWidth / 844, info.windowHeight / 390);
  var scale = info.pixelRatio * logicalScale;
  canvas.width = Math.round(info.windowWidth * info.pixelRatio);
  canvas.height = Math.round(info.windowHeight * info.pixelRatio);
  return {
    ctx: canvas.getContext('2d'),
    info: info,
    logicalScale: Math.max(logicalScale, 0.001),
    scale: Math.max(scale, 0.001),
  };
}

function drawBootScreen(canvas) {
  var view = prepareCanvas(canvas);
  var ctx = view.ctx;
  if (ctx.setTransform) ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  ctx.fillStyle = '#2c211d';
  ctx.fillRect(0, 0, 844, 390);
  ctx.fillStyle = '#d7a84a';
  ctx.fillRect(36, 52, 5, 58);
  ctx.fillStyle = '#f4e4bb';
  ctx.font = '22px sans-serif';
  ctx.fillText('\u706f\u4e0b\u6c5f\u6e56', 56, 76);
  ctx.font = '14px sans-serif';
  ctx.fillText('\u6b63\u5728\u51c6\u5907\u5ba2\u6808\u2026\u2026', 56, 106);
}

function showFatal(error, stage, screenCanvas) {
  var canvas = screenCanvas;
  var view;
  var ctx;
  var message = error && (error.stack || error.message || String(error)) || '\u672a\u77e5\u9519\u8bef';
  try {
    if (!canvas) canvas = wx.createCanvas();
    view = prepareCanvas(canvas);
    ctx = view.ctx;
    if (ctx.setTransform) ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    ctx.fillStyle = '#2c211d';
    ctx.fillRect(0, 0, 844, 390);
    ctx.fillStyle = '#f4e4bb';
    ctx.font = '22px sans-serif';
    ctx.fillText('\u957f\u98ce\u5ba2\u6808\u542f\u52a8\u5931\u8d25', 36, 68);
    ctx.font = '14px sans-serif';
    ctx.fillText('\u9636\u6bb5\uff1a' + stage, 36, 104);
    ctx.fillText(message.replace(/[\r\n]+/g, ' ').slice(0, 92), 36, 134);
    ctx.fillStyle = '#d7a84a';
    ctx.fillRect(36, 170, 180, 48);
    ctx.fillStyle = '#2c211d';
    ctx.fillText('\u6e05\u9664\u5f02\u5e38\u5b58\u6863', 72, 200);
    ctx.fillStyle = '#f4e4bb';
    ctx.fillText('\u6e05\u9664\u540e\u8bf7\u70b9\u51fb\u5f00\u53d1\u8005\u5de5\u5177\u7684\u201c\u7f16\u8bd1\u201d\u3002', 36, 252);
    if (wx.onTouchEnd) {
      wx.onTouchEnd(function (event) {
        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        var x = touch.clientX / view.logicalScale;
        var y = touch.clientY / view.logicalScale;
        if (x >= 36 && x <= 216 && y >= 170 && y <= 218) {
          [
            'dengxia-rpg-save-v10',
            'tongfu-rpg-save-v8',
            'tongfu-rpg-save-v7',
            'tongfu-rpg-save-v6',
            'tongfu-rpg-save-v5',
            'tongfu-rpg-save-v4',
            'tongfu-rpg-save-v3',
          ].forEach(function (key) {
            try { wx.removeStorageSync(key); } catch (storageError) {}
          });
          ctx.fillStyle = '#2c211d';
          ctx.fillRect(30, 164, 300, 100);
          ctx.fillStyle = '#f4e4bb';
          ctx.fillText('\u5b58\u6863\u5df2\u6e05\u9664\uff0c\u8bf7\u91cd\u65b0\u7f16\u8bd1\u3002', 36, 200);
        }
      });
    }
  } catch (drawError) {
    if (typeof console !== 'undefined' && console.error) console.error('Fatal screen failed:', drawError);
  }
  if (typeof console !== 'undefined' && console.error) console.error('[Tongfu bootstrap][' + stage + ']', error);
}

var screenCanvas;
var gameController;
var asyncFailureShown = false;

function normalizeRuntimeError(reason) {
  if (reason && reason.reason) return reason.reason;
  if (reason && reason.message) return reason;
  return new Error(typeof reason === 'string' ? reason : JSON.stringify(reason || '未知异步错误'));
}

function showAsyncFailure(reason, stage) {
  var error = normalizeRuntimeError(reason);
  writeBootDiagnostic('async-failure', stage + ': ' + (error.message || String(error)));
  if (asyncFailureShown) {
    if (typeof console !== 'undefined' && console.error) console.error('[Tongfu async][' + stage + ']', error);
    return;
  }
  asyncFailureShown = true;
  showFatal(error, stage, screenCanvas);
}

function writeBootDiagnostic(stage, detail) {
  try {
    if (wx.setStorageSync) {
      wx.setStorageSync('dengxia-boot-diagnostic-v1', {
        stage: stage,
        detail: detail || '',
        at: Date.now(),
      });
    }
  } catch (error) {}
}

try {
  if (wx.onError) wx.onError(function (message) {
    showAsyncFailure(message, '\u8fd0\u884c\u65f6\u5f02\u5e38');
  });
  if (wx.onUnhandledRejection) wx.onUnhandledRejection(function (event) {
    showAsyncFailure(event, '\u672a\u5904\u7406\u7684\u5f02\u6b65\u5f02\u5e38');
  });
} catch (error) {
  if (typeof console !== 'undefined' && console.warn) console.warn('Runtime error hooks unavailable:', error);
}

try {
  writeBootDiagnostic('canvas-creating');
  screenCanvas = wx.createCanvas();
  drawBootScreen(screenCanvas);
  writeBootDiagnostic('boot-screen-drawn');
  var createGame = require('./src/app').createGame;
  gameController = createGame(screenCanvas);
  if (gameController && gameController.runtimeError && gameController.runtimeError()) {
    throw gameController.runtimeError();
  }
  writeBootDiagnostic('first-frame-drawn');
  if (wx.onShow) {
    wx.onShow(function () {
      asyncFailureShown = false;
      if (gameController && gameController.redraw) gameController.redraw();
    });
  }
  if (wx.onWindowResize) {
    wx.onWindowResize(function () {
      if (gameController && gameController.redraw) gameController.redraw();
    });
  }
  setTimeout(function () {
    if (gameController && gameController.redraw) gameController.redraw();
  }, 180);
} catch (error) {
  writeBootDiagnostic('bootstrap-failure', error && (error.message || String(error)));
  showFatal(error, '\u52a0\u8f7d\u4e0e\u521d\u59cb\u5316', screenCanvas);
}
