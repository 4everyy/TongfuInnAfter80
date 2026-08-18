/**
 * 验证流水线：AI 生成图（JPEG 无 alpha）→ 洪水填充抠除纯色背景 → 裁边 → PNG
 * 用法：node tools/test-cutout.mjs <in> <out>
 * 依赖：npm i -D sharp （缓存指向 D:\AI\npm-cache）
 */
const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: node tools/test-cutout.mjs <in> <out>');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('missing sharp: npm i -D sharp');
  process.exit(2);
}

const { data, info } = await sharp(inPath)
  .ensureAlpha(0)
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const ch = info.channels; // 4 (RGBA)

// 1) 从四角洪水填充抠除背景（容差 32）
const tol = 32;
const corners = [0, W - 1, (H - 1) * W, H * W - 1];
const visited = new Uint8Array(W * H);
const stack = [...corners];
const bg = corners.map((i) => {
  const o = i * ch;
  return [data[o], data[o + 1], data[o + 2]];
});
const near = (o) => {
  const r = data[o], g = data[o + 1], b = data[o + 2];
  return bg.some(([R, G, B]) => Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol);
};
while (stack.length) {
  const i = stack.pop();
  if (i < 0 || i >= W * H || visited[i]) continue;
  const o = i * ch;
  if (!near(o)) continue;
  visited[i] = 1;
  data[o + 3] = 0;
  const x = i % W;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  stack.push(i - W);
  stack.push(i + W);
}

// 2) 边缘半透明过渡（与背景色距离 <50 的残留像素降 alpha）
for (let i = 0; i < W * H; i++) {
  if (visited[i]) continue;
  const o = i * ch;
  let best = 1e9;
  for (const [R, G, B] of bg) {
    const d = Math.hypot(data[o] - R, data[o + 1] - G, data[o + 2] - B);
    if (d < best) best = d;
  }
  if (best < 50) data[o + 3] = Math.round(255 * (best / 50));
}

// 3) 裁边到内容 bbox
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (data[i * ch + 3] > 16) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < minX || maxY < minY) {
  console.error('empty image after cutout');
  process.exit(3);
}
console.log(`bbox: ${minX},${minY} -> ${maxX},${maxY} (src ${W}x${H})`);

await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
  .png()
  .toFile(outPath);
console.log(`written ${outPath}`);