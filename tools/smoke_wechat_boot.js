const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'minigame');
const originalSetInterval = global.setInterval;

function clearGameModules() {
  Object.keys(require.cache).forEach((id) => {
    if (id.indexOf(ROOT) === 0) delete require.cache[id];
  });
}

function context(counter) {
  const gradient = { addColorStop() {} };
  return new Proxy({
    fillRect() { counter.draws += 1; },
    clearRect() {},
    fillText() { counter.text += 1; },
    drawImage() { counter.draws += 1; },
    measureText(value) { return { width: String(value).length * 8 }; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
  }, {
    get(target, key) { return key in target ? target[key] : function () {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
}

function makeWx(options) {
  const counter = { draws: 0, text: 0, canvasCalls: 0 };
  const storage = Object.assign({}, options.storage || {});
  const handlers = {};
  const wx = {
    createCanvas() {
      counter.canvasCalls += 1;
      if (options.failFirstCanvas && counter.canvasCalls === 1) throw new Error('mock canvas startup failure');
      return { width: 1, height: 1, getContext() { return context(counter); } };
    },
    createImage() {
      const image = { width: 64, height: 64 };
      Object.defineProperty(image, 'src', {
        set() { if (image.onerror) image.onerror({ errMsg: 'mock asset unavailable' }); },
      });
      return image;
    },
    getStorageSync(key) {
      if (options.failStorage) throw new Error('mock storage startup failure');
      return storage[key];
    },
    setStorageSync(key, value) { storage[key] = value; },
    removeStorageSync(key) { delete storage[key]; },
    onTouchStart(fn) { handlers.start = fn; },
    onTouchMove(fn) { handlers.move = fn; },
    onTouchEnd(fn) { handlers.end = fn; },
    onTouchCancel(fn) { handlers.cancel = fn; },
  };
  if (options.modern !== false) {
    wx.getWindowInfo = () => ({ windowWidth: 844, windowHeight: 390, pixelRatio: 1, safeArea: { left: 0, top: 0, width: 844, height: 390 } });
    wx.getMenuButtonBoundingClientRect = () => ({ left: 780, top: 8, right: 838, bottom: 40, width: 58, height: 32 });
  } else {
    wx.getSystemInfoSync = () => ({ windowWidth: 960, windowHeight: 540, pixelRatio: 1 });
  }
  return { wx, counter, storage, handlers };
}

function boot(name, options) {
  clearGameModules();
  const mock = makeWx(options || {});
  global.wx = mock.wx;
  global.setInterval = function () { return 1; };
  if (options && options.failAppInit) {
    const appPath = path.join(ROOT, 'src', 'app.js');
    require(appPath);
    require.cache[require.resolve(appPath)].exports = {
      createGame() { throw new Error('mock app initialization failure'); },
    };
  }
  require(path.join(ROOT, 'game.js'));
  assert(mock.counter.draws > 0, name + ': no visible frame was drawn');
  return mock;
}

try {
  const modern = boot('modern API', { modern: true });
  const startTouch = { identifier: 1, clientX: 210, clientY: 260 };
  modern.handlers.start({ changedTouches: [startTouch] });
  modern.handlers.end({ changedTouches: [startTouch] });
  assert(modern.storage['dengxia-rpg-save-v11'], 'new board save was not created');
  assert.strictEqual(modern.storage['dengxia-rpg-save-v11'].screen, 'board', 'start entry did not open the board');
  assert.strictEqual(modern.storage['dengxia-rpg-save-v11'].board.tileId, 'r0-0', 'board did not start at the inn');
  boot('legacy API fallback', { modern: false });
  const corrupted = boot('corrupt save recovery', {
    modern: true,
    storage: { 'dengxia-rpg-save-v10': '{broken-json' },
  });
  assert(corrupted.storage['dengxia-rpg-recovery-v11'], 'corrupt save was not backed up');
  const fatal = boot('fatal bootstrap screen', { modern: true, failFirstCanvas: true });
  assert(fatal.counter.text > 0, 'fatal bootstrap screen did not draw diagnostic text');
  const fatalAfterCanvas = boot('fatal after screen canvas', { modern: true, failAppInit: true });
  assert.strictEqual(fatalAfterCanvas.counter.canvasCalls, 1, 'fatal screen must reuse the visible screen canvas');
  assert(fatalAfterCanvas.counter.text > 0, 'same-canvas fatal screen did not draw diagnostic text');
  console.log('WeChat startup smoke test passed: title-to-board, modern, legacy, corrupt save, fatal screens.');
} finally {
  global.setInterval = originalSetInterval;
  delete global.wx;
}
