const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.resolve(__dirname, 'management_preview_entry.js');
const OUTPUT = path.resolve(ROOT, 'outputs/wechat-devtools/management-v5');
const BUNDLE = path.join(OUTPUT, 'preview-bundle.js');
const HTML = path.join(OUTPUT, 'preview.html');
const PROFILE = path.join(OUTPUT, 'browser-profile');
const CACHE = path.join(OUTPUT, 'browser-cache');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function resolveModule(fromFile, request) {
  if (request[0] !== '.') throw new Error('Preview bundle only supports relative modules: ' + request);
  const candidate = path.resolve(path.dirname(fromFile), request);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (fs.existsSync(candidate + '.js')) return candidate + '.js';
  throw new Error('Cannot resolve ' + request + ' from ' + fromFile);
}

function bundle(entry) {
  const ids = new Map();
  const modules = [];

  function add(file) {
    const absolute = path.resolve(file);
    if (ids.has(absolute)) return ids.get(absolute);
    const id = modules.length;
    ids.set(absolute, id);
    modules.push(null);
    let code = fs.readFileSync(absolute, 'utf8');
    code = code.replace(/require\((['"])(.+?)\1\)/g, (match, quote, request) => {
      const dependency = add(resolveModule(absolute, request));
      return '__require(' + dependency + ')';
    });
    modules[id] = { file: absolute, code };
    return id;
  }

  const entryId = add(entry);
  const body = modules.map((module, id) => {
    return JSON.stringify(id) + ':function(module,exports,__require){\n' + module.code + '\n}';
  }).join(',\n');
  return '(function(modules){var cache={};function __require(id){if(cache[id])return cache[id].exports;var module=cache[id]={exports:{}};modules[id](module,module.exports,__require);return module.exports;}__require(' + entryId + ');})({\n' + body + '\n});\n';
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.mkdirSync(PROFILE, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(BUNDLE, bundle(ENTRY));
  fs.writeFileSync(HTML, [
    '<!doctype html>',
    '<html lang="zh-CN"><head><meta charset="utf-8">',
    '<style>html,body{margin:0;width:844px;height:390px;overflow:hidden;background:#2d211b}canvas{display:block;width:844px;height:390px}</style>',
    '</head><body><canvas id="game" width="844" height="390"></canvas><script src="preview-bundle.js"></script></body></html>',
  ].join(''));

  const names = ['01-morning', '02-staff', '03-episode', '04-noon-event', '05-service-result', '06-minigame', '07-evening', '08-settlement'];
  for (let index = 0; index < names.length; index += 1) {
    const stageProfile = path.join(PROFILE, 'stage-' + index);
    const screenshot = path.join(OUTPUT, names[index] + '.png');
    fs.mkdirSync(stageProfile, { recursive: true });
    const result = spawnSync(CHROME, [
      '--headless=new',
      '--hide-scrollbars',
      '--window-size=844,390',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu-shader-disk-cache',
      '--disk-cache-dir=' + CACHE,
      '--user-data-dir=' + stageProfile,
      '--virtual-time-budget=5000',
      '--screenshot=' + screenshot,
      pathToFileURL(HTML).href + '?stage=' + index,
    ], { encoding: 'utf8', env: process.env });
    if (result.status !== 0 || !fs.existsSync(screenshot)) {
      throw new Error('Chrome screenshot failed for ' + names[index] + ': ' + (result.stderr || result.stdout || result.status));
    }
  }
  console.log(JSON.stringify({ output: OUTPUT, screenshots: names }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
