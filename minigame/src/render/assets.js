const manifest = require('../../assets/art/manifest');

function unique(paths) {
  return paths.filter((path, index) => path && paths.indexOf(path) === index);
}

function createAssetStore() {
  const records = {};
  const packages = {};

  function pathInfo(path) {
    const match = /^@([^/]+)\/(.+)$/.exec(path || '');
    if (!match) return { packageName: null, src: manifest.root + path };
    return {
      packageName: match[1],
      src: `subpackages/${match[1]}/assets/art/${match[2]}`,
    };
  }

  function loadImage(path, record) {
    const info = pathInfo(path);
    const image = wx.createImage();
    image.onload = () => {
      if (records[path] !== record) return;
      if (!image.width || !image.height) {
        record.status = 'failed';
        record.error = '图片尺寸无效';
        return;
      }
      record.status = 'ready';
      record.image = image;
    };
    image.onerror = (error) => {
      if (records[path] !== record) return;
      record.status = 'failed';
      record.error = error && (error.errMsg || error.message) || '图片加载失败';
    };
    image.src = info.src;
  }

  function ensurePackage(name, callback) {
    if (!name) return callback();
    if (packages[name] && packages[name].status === 'ready') return callback();
    if (packages[name] && packages[name].status === 'loading') {
      packages[name].callbacks.push(callback);
      return;
    }
    const runtime = packages[name] = { status: 'loading', error: null, callbacks: [callback] };
    if (!wx.loadSubpackage) {
      runtime.status = 'ready';
      runtime.callbacks.splice(0).forEach((next) => next());
      return;
    }
    const task = wx.loadSubpackage({
      name: name,
      success: function () {
        runtime.status = 'ready';
        runtime.callbacks.splice(0).forEach((next) => next());
      },
      fail: function (error) {
        runtime.status = 'failed';
        runtime.error = error && (error.errMsg || error.message) || '章节资源包加载失败';
        runtime.callbacks.splice(0).forEach((next) => next(runtime.error));
      },
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate(function (progress) { runtime.progress = progress.progress; });
    }
  }

  function request(path, force) {
    if (!path) return null;
    if (records[path] && !force) return records[path];
    const previous = records[path];
    const record = {
      status: 'loading',
      image: null,
      error: null,
      attempts: previous ? previous.attempts + 1 : 1,
      touchedAt: Date.now(),
    };
    records[path] = record;
    const info = pathInfo(path);
    ensurePackage(info.packageName, function (error) {
      if (records[path] !== record) return;
      if (error) {
        record.status = 'failed';
        record.error = error;
        return;
      }
      loadImage(path, record);
    });
    return record;
  }

  function nextPhase(phase) {
    if (phase === 'morning') return 'noon';
    if (phase === 'noon') return 'evening';
    return 'morning';
  }

  function mapPaths(id, context) {
    const art = manifest.maps[id];
    const config = context || null;
    const includeOptional = !config || config.includeOptional !== false;
    const phase = config && config.phase;
    const allowedPhases = phase
      ? [phase].concat(config.includeNextPhase ? [nextPhase(phase)] : [])
      : null;
    if (!art) return [];
    const layers = art.layers ? art.layers.filter((layer) => {
      if (layer.optional && !includeOptional) return false;
      if (layer.phase && allowedPhases && allowedPhases.indexOf(layer.phase) < 0) return false;
      if (layer.weather && config && config.weather && layer.weather !== config.weather) return false;
      return true;
    }).map((layer) => layer.src) : [];
    const props = art.props
      ? art.props.filter((prop) => includeOptional || !prop.optional).map((prop) => prop.src)
      : [];
    return unique(layers.concat(props));
  }

  function rolePaths(id, fields) {
    const art = manifest.characters[id];
    if (!art) return [];
    const keys = fields || ['portrait', 'dialogue', 'atlases', 'battle', 'battlePortrait', 'skillCutIn', 'chapterActions'];
    const paths = [];
    keys.forEach((key) => {
      if (key === 'atlases' || key === 'atlas') {
        if (art.atlases) Object.keys(art.atlases).forEach((direction) => paths.push(art.atlases[direction]));
        else paths.push(art.atlas);
      } else if (key === 'dialogue') {
        if (art.dialogue) {
          paths.push(art.dialogue.bust);
          paths.push(art.dialogue.atlas);
          Object.keys(art.dialogue.expressions || {}).forEach((name) => paths.push(art.dialogue.expressions[name]));
          Object.keys(art.dialogue.poses || {}).forEach((name) => paths.push(art.dialogue.poses[name]));
        }
      } else if (key === 'skillIcons') {
        if (art.skillIcons && manifest.ui && manifest.ui.battle) paths.push(manifest.ui.battle.iconAtlas);
      } else paths.push(art[key]);
    });
    return unique(paths);
  }

  function npcPaths(id) {
    const art = manifest.npcs && manifest.npcs[id];
    if (!art) return [];
    const paths = [art.sprite, art.atlas, art.portrait];
    if (art.atlases) Object.keys(art.atlases).forEach((direction) => paths.push(art.atlases[direction]));
    return unique(paths);
  }

  function uiPaths() {
    const resources = manifest.ui && manifest.ui.resources || {};
    const battle = manifest.ui && manifest.ui.battle || {};
    const presentation = manifest.ui && manifest.ui.presentation || {};
    return unique(Object.keys(resources).map((id) => resources[id])
      .concat(Object.keys(presentation).map((id) => presentation[id]))
      .concat([
      battle.wheel,
      battle.ledger,
      battle.iconAtlas,
    ]));
  }

  function allPaths() {
    const paths = [];
    Object.keys(manifest.maps).forEach((id) => paths.push.apply(paths, mapPaths(id)));
    Object.keys(manifest.characters).forEach((id) => paths.push.apply(paths, rolePaths(id)));
    Object.keys(manifest.npcs || {}).forEach((id) => paths.push.apply(paths, npcPaths(id)));
    paths.push.apply(paths, uiPaths());
    return unique(paths);
  }

  function preload(paths) {
    unique(paths || []).forEach((path) => request(path));
  }

  function image(path) {
    const record = request(path);
    if (record) record.touchedAt = Date.now();
    return record && record.status === 'ready' ? record.image : null;
  }

  function status(path) {
    const record = request(path);
    return record ? record.status : 'failed';
  }

  function detail(path) {
    const record = request(path);
    return record || { status: 'failed', image: null, error: '资源路径为空', attempts: 0 };
  }

  function summary(paths) {
    const selected = unique(paths || []);
    const result = { total: selected.length, loading: 0, ready: 0, failed: 0, progress: 1, errors: [] };
    selected.forEach((path) => {
      const record = request(path);
      result[record.status] += 1;
      if (record.status === 'failed') result.errors.push({ path, message: record.error });
    });
    result.progress = result.total ? result.ready / result.total : 1;
    return result;
  }

  function retry(path) {
    return request(path, true);
  }

  function retryFailed(paths) {
    unique(paths || []).forEach((path) => {
      if (records[path] && records[path].status === 'failed') retry(path);
    });
  }

  function releaseExcept(paths, maxAge) {
    const keep = unique(paths || []);
    const cutoff = Date.now() - (maxAge || 90000);
    Object.keys(records).forEach((path) => {
      if (keep.indexOf(path) < 0 && records[path].touchedAt < cutoff) delete records[path];
    });
  }

  return {
    manifest,
    image,
    status,
    detail,
    summary,
    mapPaths,
    rolePaths,
    npcPaths,
    uiPaths,
    allPaths,
    preload,
    retry,
    retryFailed,
    releaseExcept,
    packages,
  };
}

module.exports = { createAssetStore };
