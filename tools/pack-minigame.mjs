/**
 * 微信小游戏打包：从 dist/（H5 产物）生成 dist/minigame/ 小游戏工程。
 *
 * 产物结构（可直接用微信开发者工具打开 dist/minigame 目录）：
 *   game.js               入口：require 业务入口分块
 *   game.json             小游戏配置（竖屏）
 *   project.config.json   开发者工具工程配置（开启 ES6 转 CommonJS）
 *   index-*.js / core-*.js / game-*.js   vite 分块（拍平，相对引用不变）
 *
 * 说明：vite 分块之间是 `./xxx.js` 相对 import，拍平到同一目录后引用关系不变；
 * 开发者工具 setting.es6 会把 import/export 编译为小游戏可用的模块语法。
 * 主包超过 4MB 时给出警告（首屏资源需走分包/CDN）。
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(dist, 'minigame');

if (!readdirSync(dist).includes('index.html')) {
  console.error('✖ 未找到 dist/index.html，请先执行 vite build（npm run build:h5）');
  process.exit(1);
}

// 1) 清空并重建输出目录
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 2) 拍平拷贝 JS 分块
const assetsDir = join(dist, 'assets');
const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
for (const f of files) cpSync(join(assetsDir, f), join(out, f));

// 3) 从 index.html 解析入口分块名
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const m = html.match(/assets\/(index-[\w-]+\.js)/);
if (!m) {
  console.error('✖ index.html 中未找到入口分块（index-*.js）');
  process.exit(1);
}
const entry = m[1];
writeFileSync(
  join(out, 'game.js'),
  `// 由 tools/pack-minigame.mjs 自动生成：小游戏入口\nrequire('./${entry}');\n`,
);

// 4) 小游戏配置
writeFileSync(
  join(out, 'game.json'),
  `${JSON.stringify(
    {
      deviceOrientation: 'portrait',
      showStatusBar: false,
      networkTimeout: { request: 10000, connectSocket: 10000, uploadFile: 10000, downloadFile: 10000 },
    },
    null,
    2,
  )}\n`,
);

// 5) 开发者工具工程配置
writeFileSync(
  join(out, 'project.config.json'),
  `${JSON.stringify(
    {
      appid: 'touristappid',
      projectname: 'tongfu-inn-after-80',
      compileType: 'game',
      libVersion: '3.4.3',
      setting: {
        es6: true, // 关键：分块内的 import/export → CommonJS
        enhance: true,
        minified: true,
        postcss: false,
        urlCheck: false,
      },
    },
    null,
    2,
  )}\n`,
);

// 6) 主包体积统计（小游戏主包上限 4MB）
let total = 0;
for (const f of readdirSync(out)) total += statSync(join(out, f)).size;
const mb = total / 1024 / 1024;
console.log(`[pack:minigame] 小游戏工程已生成：${out}`);
console.log(`[pack:minigame] 入口 ${entry}；分块 ${files.length} 个；总体积 ${mb.toFixed(2)} MB`);
if (mb > 4) console.warn('[pack:minigame] ⚠ 主包超过 4MB，请拆分包或将首屏资源走 CDN');