/**
 * AI 立绘生成流水线（免费工具链，全部本地处理）：
 *   1. Pollinations 免费文生图 API（flux 模型）生成 Q 版角色立绘
 *   2. rembg (u2netp, 本地 venv) AI 抠图去背景
 *   3. sharp 裁边 + 缩放到标准立绘尺寸
 *   4. 输出 public/portraits/{id}.png（Vite 静态目录）
 *
 * 用法：node tools/gen-art.mjs [--only id1,id2] [--force]
 * 依赖：npm i -D sharp；D:\AI\venv-rembg（pip install "rembg[cpu,cli]"）
 * 模型：D:\AI\models\u2netp.onnx（ghfast.top 镜像下载）
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REMBG = 'D:\\AI\\venv-rembg\\Scripts\\rembg.exe';
const TMP = 'D:\\AI\\temp\\gen';
const OUT = resolve('public/portraits');
const BASE = 'https://image.pollinations.ai/prompt/';
const SIZE = 512;

const CAST = [
  { id: 'tongxy', q: 'chibi anime girl innkeeper, big head small body, elegant hanfu dress in dark red with gold hairpin, hair bun, ancient chinese Ming dynasty style, holding an abacus, warm smile, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'baizt', q: 'chibi anime man waiter, big head small body, light grey hanfu robe, black hair ponytail, handsome smirk, ancient chinese inn waiter holding a tray, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'lvc', q: 'chibi anime young scholar, big head small body, green scholar robe, black square scholar hat, holding a book, gentle face, ancient chinese style, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'guofr', q: 'chibi anime tomboy girl, big head small body, blue hanfu outfit, double hair buns with red ribbons, confident fierce expression, fists up martial arts pose, ancient chinese style, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'lidz', q: 'chibi anime chubby chef man, big head small body, white kitchen apron over beige clothes, white chef headscarf, holding a big spatula, jolly grin, ancient chinese cook, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'moxb', q: 'chibi anime little girl, big head small body, cute pink hanfu, double buns with red string, eating candied hawthorn, mischievous smile, ancient chinese child, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'xingbt', q: 'chibi anime constable officer, big head small body, dark blue yamen uniform with black official hat, full beard, holding a wooden baton, boastful pose, ancient chinese constable, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
  { id: 'moody', q: 'chibi anime mysterious wanderer, big head small body, grey worn robe, large straw conical hat covering eyes, carrying a sword wrapped in cloth, ancient chinese ronin, front view, full body, plain background, mobile game character portrait, clean flat colors, thick outline' },
];

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1].split(',')
  : null;
const list = only ? CAST.filter((c) => only.includes(c.id)) : CAST;

mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const sharp = (await import('sharp')).default;

function fetchOne(url, dest, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      execFileSync('curl.exe', ['-s', '--max-time', '180', '-o', dest, url]);
      if (existsSync(dest) && readFileSync(dest).length > 10000) return;
      console.log(`  retry ${t}: file too small`);
    } catch (e) {
      console.log(`  retry ${t}: ${e.message?.slice(0, 80)}`);
    }
  }
  throw new Error(`download failed: ${url.slice(0, 60)}`);
}

async function trimTo(src, dest, box) {
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  if (maxX < minX) throw new Error('empty after cutout');
  await sharp(src)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
}

let ok = 0;
for (const c of list) {
  const raw = resolve(TMP, `${c.id}.jpg`);
  const cut = resolve(TMP, `${c.id}_cut.png`);
  const out = resolve(OUT, `${c.id}.png`);
  if (existsSync(out) && !process.argv.includes('--force')) {
    console.log(`[skip] ${c.id}`);
    ok++;
    continue;
  }
  console.log(`[gen ] ${c.id} ...`);
  const url = `${BASE}${encodeURIComponent(c.q)}?width=${SIZE}&height=${SIZE}&nologo=true&model=flux&seed=${1000 + c.id.length * 7}`;
  try {
    fetchOne(url, raw);
    execFileSync(REMBG, ['i', '--model', 'u2netp', raw, cut], {
      env: { ...process.env, U2NET_HOME: 'D:\\AI\\models' },
    });
    await trimTo(cut, out, 256);
    console.log(`[ ok ] ${c.id} -> public/portraits/${c.id}.png`);
    ok++;
  } catch (e) {
    console.error(`[fail] ${c.id}: ${e.message}`);
  }
}
console.log(`\n完成 ${ok}/${list.length}。生成物在 public/portraits/`);
