/** 程序化音频：Web Audio 合成音效与五声 BGM，零外部资源（H5 / 微信小游戏通用） */

export type SfxName = 'coin' | 'serve' | 'order' | 'angry' | 'gong';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmStep = 0;

/** 五声音阶（C 宫调）与旋律动机 */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0];
const MELODY = [0, 2, 4, 3, 2, 1, 0, 2, 3, 4, 3, 2, 1, 0, 1, 2];

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const g = globalThis as Record<string, unknown>;
    const AC =
      (g.AudioContext as (typeof AudioContext | undefined)) ??
      (g.webkitAudioContext as (typeof AudioContext | undefined));
    let c: AudioContext | null = null;
    if (typeof AC === 'function') c = new AC();
    const wxApi = g.wx as { createWebAudioContext?: () => AudioContext } | undefined;
    if (!c && wxApi && typeof wxApi.createWebAudioContext === 'function')
      c = wxApi.createWebAudioContext();
    if (!c) return null;
    master = c.createGain();
    master.gain.value = 0.6;
    master.connect(c.destination);
    ctx = c;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** 浏览器策略：需在首次用户交互后解锁 */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

function tone(
  freq: number,
  t0: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slideTo?: number,
) {
  const c = getCtx();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** 合成音效：收银 / 上菜 / 点单 / 怒离 / 开章锣 */
export function sfx(name: SfxName) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'coin':
      tone(988, t, 0.09, 'sine', 0.22);
      tone(1319, t + 0.08, 0.16, 'sine', 0.2);
      break;
    case 'serve':
      tone(660, t, 0.1, 'triangle', 0.2);
      tone(880, t + 0.09, 0.1, 'triangle', 0.18);
      tone(1109, t + 0.18, 0.22, 'triangle', 0.16);
      break;
    case 'order':
      tone(740, t, 0.11, 'square', 0.09);
      break;
    case 'angry':
      tone(320, t, 0.32, 'sawtooth', 0.13, 170);
      break;
    case 'gong':
      tone(196, t, 1.6, 'sine', 0.28);
      tone(198.5, t, 1.6, 'sine', 0.16); // 失谐拍频模拟锣鸣
      tone(392, t, 0.8, 'sine', 0.07);
      break;
  }
}

/** 五声 BGM：低音量琶音循环（宫调式，客栈小调氛围） */
export function startBGM() {
  const c = getCtx();
  if (!c || bgmTimer) return;
  bgmTimer = setInterval(() => {
    const cc = getCtx();
    if (!cc) return;
    const t = cc.currentTime + 0.02;
    const m = MELODY[bgmStep % MELODY.length];
    tone(PENTA[m], t, 0.55, 'triangle', 0.05);
    if (bgmStep % 4 === 0) tone(PENTA[m] / 2, t, 1.3, 'sine', 0.04);
    bgmStep++;
  }, 420);
}

export function stopBGM() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}