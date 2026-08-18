/**
 * 从 docs/武林外传前80回.md 提取章节剧情，生成 src/data/chapters.json
 *
 * 输出结构（每章）：
 *   id / title / arc（篇章）/ summary（首段剧情梗概）
 *   scenes: [{ text }] —— 后续由对话系统消费
 *
 * 规则（见文档头部可靠性分级）：
 *   - 第53/54/68回正文待补，标记 incomplete: true，仍可解锁（用标题与弧线定位）
 *   - 每回取前 2 段正文作为梗概来源，剔除引用标记与markdown语法
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'docs', '武林外传前80回.md');
const OUT = join(root, 'src', 'data', 'chapters.json');

const md = readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

/** 篇章（部分）标题 → 弧线名 */
function arcFromPart(partLine) {
  const m = partLine.match(/第[一二三四五六七八九十]+部分[：:](.+)/);
  if (!m) return null;
  const raw = m[1].trim();
  // "第1-10回——故事开启，众侠客齐聚同福" → 取破折号后的主旨
  const seg = raw.split(/——/);
  return (seg[1] || seg[0]).trim();
}

/** 中文数字 → 阿拉伯数字（支持 一~九十九） */
function cnNum(s) {
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 零: 0 };
  if (/^\d+$/.test(s)) return Number(s);
  if (s === '十') return 10;
  const m = s.match(/^(.)?十(.)?$/);
  if (m) return (m[1] ? map[m[1]] : 1) * 10 + (m[2] ? map[m[2]] : 0);
  return Number([...s].reduce((acc, ch) => acc * 10 + (map[ch] ?? 0), 0));
}

const chapters = [];
let arc = '序章';
let cur = null;
let buf = [];
let curIncomplete = false;

function flushSummary() {
  if (!cur) return;
  const paras = buf
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/\[citation:\d+\]/g, '')
        .replace(/【[^】]*】[^\n]*/g, '') // 去掉【经典场景】【游戏玩法设计点】等标记行
        .replace(/[*>`#]/g, '')
        .trim(),
    )
    .filter((p) => p.length > 4);
  cur.summary = paras.slice(0, 2).join(' ') || '（正文待补，以标题与弧线定位）';
  if (cur.summary.length > 220) cur.summary = cur.summary.slice(0, 220) + '……';
  cur.incomplete = curIncomplete;
  chapters.push(cur);
  cur = null;
  buf = [];
}

for (const line of lines) {
  const part = line.match(/^## 第.+部分/);
  if (part) {
    flushSummary();
    arc = arcFromPart(line) || arc;
    continue;
  }
  // 兼容两种标题格式："### 第1回 xxx" 与 "## 第七十二回：xxx"
  const h = line.match(/^#{2,3} 第(\d+|[一二三四五六七八九十]{1,3})[回]\s*[：:]?\s*(.+)$/);
  if (h) {
    flushSummary();
    const titleRaw = h[2].replace(/【[^】]*】/g, '').trim();
    // 仅以本回标题行的 ⚠️/待补 标记判定，避免附录说明文字误伤
    curIncomplete = /⚠️|正文待补/.test(h[2]);
    cur = {
      id: cnNum(h[1]),
      title: titleRaw,
      arc,
      summary: '',
      incomplete: false,
    };
    continue;
  }
  if (cur) buf.push(line);
}
flushSummary();

// 校验：必须 80 回
if (chapters.length !== 80) {
  console.warn(`⚠️ 提取到 ${chapters.length} 回（期望 80），请检查文档结构`);
}
const ids = new Set(chapters.map((c) => c.id));
for (let i = 1; i <= 80; i++) {
  if (!ids.has(i)) console.warn(`⚠️ 缺少第 ${i} 回`);
}

// 剧情梗概切分为"场景"，供对话系统按段展示
for (const c of chapters) {
  const sentences = c.summary
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter(Boolean);
  c.scenes = sentences.map((s) => ({ text: s }));
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), chapters }, null, 2), 'utf8');
console.log(`✅ 已生成 ${OUT}（${chapters.length} 回）`);
const incomplete = chapters.filter((c) => c.incomplete).map((c) => c.id);
if (incomplete.length) console.log(`⚠️ 正文待补章节：${incomplete.join(', ')}`);
