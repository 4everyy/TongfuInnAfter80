const assert = require('assert');

let shouldFail = true;
let packageLoads = 0;
let lastImageSource = '';

global.wx = {
  createImage() {
    const image = { width: 64, height: 64, onload: null, onerror: null };
    Object.defineProperty(image, 'src', {
      set(value) {
        lastImageSource = value;
        if (shouldFail) {
          if (image.onerror) image.onerror({ errMsg: `mock failure: ${value}` });
        } else if (image.onload) image.onload();
      },
    });
    return image;
  },
  loadSubpackage(options) {
    packageLoads += 1;
    options.success();
    return { onProgressUpdate() {} };
  },
};

const { createAssetStore } = require('../minigame/src/render/assets');

const store = createAssetStore();
const path = 'npcs/merchant.png';

assert(store.npcPaths('merchant').includes(path), 'NPC sprite path is not discoverable');
assert(store.mapPaths('stone_bridge').includes('maps/stone_bridge/supply-cart.png'), 'Cart prop is not preloadable');

store.preload([path]);
let summary = store.summary([path]);
assert.strictEqual(summary.failed, 1, 'Failed image was not reported');
assert(summary.errors[0].message.includes('mock failure'), 'Failure reason was not retained');

shouldFail = false;
store.retryFailed([path]);
summary = store.summary([path]);
assert.strictEqual(summary.ready, 1, 'Retry did not recover the image');
assert.strictEqual(summary.failed, 0, 'Recovered image remains failed');

const chapterPath = store.mapPaths('grain_market')[0];
assert(chapterPath.indexOf('@ch56/') === 0, 'Chapter 5-6 map is not registered in its subpackage');
store.preload([chapterPath]);
summary = store.summary([chapterPath]);
assert.strictEqual(summary.ready, 1, 'Subpackage image did not become ready');
assert.strictEqual(packageLoads, 1, 'Subpackage should load exactly once');
assert(lastImageSource.indexOf('subpackages/ch56/assets/art/maps/grain_market/far.jpg') >= 0, 'Subpackage image path was resolved incorrectly');

const finalePath = store.mapPaths('old_ledger_vault')[0];
assert(finalePath.indexOf('@ch78/') === 0, 'Chapter 7-8 map is not registered in its subpackage');
store.preload([finalePath]);
summary = store.summary([finalePath]);
assert.strictEqual(summary.ready, 1, 'Chapter 7-8 subpackage image did not become ready');
assert.strictEqual(packageLoads, 2, 'Each chapter subpackage should load exactly once');
assert(lastImageSource.indexOf('subpackages/ch78/assets/art/maps/old_ledger_vault/far.jpg') >= 0, 'Chapter 7-8 path was resolved incorrectly');

const season2Path = store.mapPaths('jiangnan_branch')[0];
assert(season2Path.indexOf('@s2ch910/') === 0, 'Season 2 map is not registered in its subpackage');
store.preload([season2Path]);
summary = store.summary([season2Path]);
assert.strictEqual(summary.ready, 1, 'Season 2 subpackage image did not become ready');
assert.strictEqual(packageLoads, 3, 'Season 2 subpackage should load exactly once');
assert(lastImageSource.indexOf('subpackages/s2ch910/assets/art/maps/jiangnan_branch/far.jpg') >= 0,
  'Season 2 path was resolved incorrectly');

const chapter11Path = store.mapPaths('jiangnan_spice_workshop')[0];
assert(chapter11Path.indexOf('@s2ch11/') === 0, 'Chapter 11 map is not registered in its subpackage');
store.preload([chapter11Path]);
summary = store.summary([chapter11Path]);
assert.strictEqual(summary.ready, 1, 'Chapter 11 subpackage image did not become ready');
assert.strictEqual(packageLoads, 4, 'Chapter 11 subpackage should load exactly once');
assert(lastImageSource.indexOf('subpackages/s2ch11/assets/art/maps/jiangnan_spice_workshop/far.jpg') >= 0,
  'Chapter 11 path was resolved incorrectly');

console.log('Asset store failure, retry and chapter subpackage tests passed.');
