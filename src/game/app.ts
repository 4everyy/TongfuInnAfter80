/** 应用层：输入路由 / HUD / 对话流 / 掌故事件池（非线性）/ 四季 / 存档 */

import type { Platform } from '@core/platform';
import { sfx, unlockAudio, startBGM } from '@core/audio';
import { CHAR_MAP, STORY_GATE_MONEY, SEASONS, SEASON_SEC, SEASON_TRANSITION } from './defs';
import type { Season } from './defs';
import { MainScene } from './scene';
import { InnManager } from './inn';
import { DISHES } from './defs';
import { DialogBox, drawHUD, roundRect } from './ui';
import chaptersJson from '@data/chapters.json';

export interface ChapterJson {
  id: number;
  title: string;
  arc: string;
  summary: string;
  incomplete: boolean;
  scenes: Array<{ text: string }>;
}

const CHAPTERS = chaptersJson.chapters as ChapterJson[];

/** 各角色闲聊台词（搭话时依次播放） */
const IDLE_TALK: Record<string, string[]> = {
  tongxy: ['额滴神啊，又来客人咧。', '跑堂的！上茶——', '省钱才是硬道理。'],
  moxb: ['嫂子说糖葫芦不能当饭吃，我不信。', '衡山派掌门在此，还不速速退下！'],
  lidz: ['今儿的食材新鲜得很，放心吃！', '我这手艺忽高忽低，全看运气。'],
  lvc: ['子曾经曰过：知识就是力量。', '掌柜的，这个月账又平不了咧……'],
  baizt: ['葵花点穴！……跟你开玩笑的。', '跑堂这活儿，看着简单，门道多着呢。'],
  guofr: ['确定一定以及肯定！', '排山倒海——咳，使不得使不得。'],
  xingbt: ['我看好你哟！', '七侠镇的治安，包在我身上。'],
};

/** NPC 讲掌故概率与冷却 */
const NPC_STORY_CHANCE = 0.32;
const NPC_STORY_CD = 50;
/** 走访分区触发概率与冷却 */
const ZONE_STORY_CHANCE = 0.3;
const ZONE_STORY_CD = 70;

interface Line {
  speaker: string;
  title: string;
  text: string;
  charId?: string; // 立绘 id（public/portraits/{id}.png）
}

export class App {
  private scene: MainScene;
  private dialog = new DialogBox();
  private queue: Line[] = [];
  private curLine: Line | null = null;
  private talking = false;
  private storyPending = false;
  private toast: { text: string; t: number } | null = null;
  /** 掌故收录面板（一段轶事听完/看完后弹出） */
  private settle: {
    title: string;
    reward: number;
    t: number;
  } | null = null;
  private audioReady = false;
  private money: number;
  private earned = 0;
  private totalEarned = 0;
  /** 已收录掌故 id 集 */
  private heard = new Set<number>();
  /** 四季 */
  private seasonIdx = 0;
  private seasonT = 0;
  /** 本季营收（换季清零） */
  private seasonEarned = 0;
  /** NPC / 分区掌故触发冷却 */
  private npcCd: Record<string, number> = {};
  private zoneCd: Record<string, number> = {};
  private inn: InnManager;

  constructor(private platform: Platform) {
    // 读档（v2：掌故集 + 四季；兼容 v1 线性进度）
    let money = 88;
    let heardIds: number[] = [];
    let total = 0;
    let si = 0;
    let st = 0;
    let se = 0;
    try {
      const raw = platform.storage.get('tfi_save');
      if (raw) {
        const s = JSON.parse(raw) as {
          m?: number;
          c?: number;
          t?: number;
          h?: number[];
          si?: number;
          st?: number;
          se?: number;
        };
        if (typeof s.m === 'number') money = s.m;
        if (typeof s.t === 'number') total = s.t;
        if (Array.isArray(s.h)) heardIds = s.h.filter((n) => typeof n === 'number');
        else if (typeof s.c === 'number') heardIds = Array.from({ length: s.c }, (_, i) => i + 1); // v1 → 前N回视为已收录
        if (typeof s.si === 'number') si = s.si % 4;
        if (typeof s.st === 'number') st = Math.min(s.st, SEASON_SEC);
        if (typeof s.se === 'number') se = s.se;
      }
    } catch {
      /* 损坏存档忽略 */
    }
    this.money = money;
    this.totalEarned = total;
    this.heard = new Set(heardIds.filter((id) => id >= 1 && id <= CHAPTERS.length));
    this.seasonIdx = si;
    this.seasonT = st;
    this.seasonEarned = se;

    this.scene = new MainScene(platform.width, platform.height, {
      onTalk: (id) => this.startTalk(id),
      onZone: (name) => this.onZone(name),
    });
    this.scene.season = this.season;

    this.inn = new InnManager({
      onPay: (amount, _tip) => {
        this.money += amount;
        this.earned += amount;
        this.totalEarned += amount;
        this.seasonEarned += amount;
        this.save();
      },
      onEvent: (ev) => sfx(ev),
    });
    this.inn.progress = this.heard.size;
    this.scene.inn = this.inn;

    platform.onPointerDown((x, y) => this.onTap(x, y));
    platform.onResize = () => this.scene.resize(platform.width, platform.height);
  }

  get season(): Season {
    return SEASONS[this.seasonIdx];
  }

  get storyTotal() {
    return CHAPTERS.length;
  }

  private save() {
    this.platform.storage.set(
      'tfi_save',
      JSON.stringify({
        m: this.money,
        t: this.totalEarned,
        h: [...this.heard],
        si: this.seasonIdx,
        st: this.seasonT,
        se: this.seasonEarned,
      }),
    );
  }

  /* ---------------- 掌故事件池 ---------------- */

  /** 未收录掌故 id 池 */
  private storyPool(): number[] {
    return CHAPTERS.filter((c) => !this.heard.has(c.id)).map((c) => c.id);
  }

  /** 门槛是否已达（可触发新掌故） */
  private gateMet(): boolean {
    return this.totalEarned >= STORY_GATE_MONEY(this.heard.size);
  }

  /** 取一段随机未收录掌故（揉和抽取，不按顺序） */
  private pickStory(): ChapterJson | null {
    const pool = this.storyPool();
    if (pool.length === 0) return null;
    return CHAPTERS.find((c) => c.id === pool[Math.floor(Math.random() * pool.length)]) ?? null;
  }

  /** 播放一段掌故（无说书人也可由场景/角色触发） */
  private playStory(ch: ChapterJson, lead: Line) {
    sfx('gong');
    this.heardPlusBuffer.push(ch.id);
    this.queue = [
      lead,
      { speaker: '', title: '', text: `【掌故】${ch.title}` },
      ...ch.scenes.map((s) => ({ speaker: '', title: '', text: s.text })),
    ];
    this.storyPending = true;
    this.talking = true;
    this.next();
  }

  private onZone(name: string) {
    this.toast = { text: name, t: 2.6 };
    // 走访触发：新地方总有新鲜事
    const cd = this.zoneCd[name] ?? 0;
    if (cd <= 0 && this.gateMet()) {
      this.zoneCd[name] = ZONE_STORY_CD;
      if (Math.random() < ZONE_STORY_CHANCE) {
        const ch = this.pickStory();
        if (ch) {
          this.scene.paused = true;
          this.playStory(ch, {
            speaker: '',
            title: '',
            text: `${name}人来人往，一段旧事涌上心头——`,
          });
        }
      }
    }
  }

  /* ---------------- 对话 ---------------- */

  private startTalk(npcId: string) {
    const def = CHAR_MAP[npcId] ?? CHAR_MAP['moody'];
    this.scene.paused = true;
    this.platform.vibrate(true);
    if (npcId === 'moody') {
      // 神秘客 = 说书人：门槛已达即说一段新掌故
      const ch = this.pickStory();
      if (ch) {
        if (!this.gateMet()) {
          const lack = STORY_GATE_MONEY(this.heard.size) - this.totalEarned;
          this.queue = [
            {
              speaker: def.name,
              title: def.title,
              text: `想听新鲜掌故？说书人捋了捋胡子：客栈经营还没做出起色——累计营收还差 ${lack} 文，先去招呼客人、上菜收银吧！`,
            },
          ];
          this.talking = true;
          this.next();
          return;
        }
        this.playStory(ch, {
          speaker: def.name,
          title: def.title,
          text: '说书人醒木一拍：今日不说旧书，只讲一段七侠镇自己的故事——',
          charId: 'moody',
        });
      } else {
        this.queue = [
          {
            speaker: def.name,
            title: def.title,
            text: '八十段掌故都已说尽，后事如何，且听下回分解。',
            charId: 'moody',
          },
        ];
        this.talking = true;
        this.next();
      }
    } else {
      // 主角搭话：偶发讲起一桩江湖旧事
      const cd = this.npcCd[npcId] ?? 0;
      const ch = cd <= 0 && this.gateMet() && Math.random() < NPC_STORY_CHANCE ? this.pickStory() : null;
      if (ch) {
        this.npcCd[npcId] = NPC_STORY_CD;
        this.playStory(ch, {
          speaker: def.name,
          title: def.title,
          text: `${def.name}放下手里的活计：哎，你听说了吗——`,
          charId: npcId,
        });
      } else {
        const lines = IDLE_TALK[npcId] ?? [def.intro];
        this.queue = lines.map((t) => ({
          speaker: def.name,
          title: def.title,
          text: t,
          charId: npcId,
        }));
        this.talking = true;
        this.next();
      }
    }
  }

  private next() {
    const line = this.queue.shift();
    if (!line) {
      this.finishTalk();
      return;
    }
    this.curLine = line;
    this.dialog.show(line.text);
  }

  private finishTalk() {
    this.dialog.hide();
    this.scene.paused = false;
    this.talking = false;
    if (this.storyPending) {
      this.storyPending = false;
      // 结算最近一段掌故
      const buf = this.heardPlusBuffer;
      const last = buf.length > 0 ? buf[buf.length - 1] : undefined;
      if (last != null) {
        this.heard.add(last);
        this.inn.progress = this.heard.size;
        const reward = Math.max(30, Math.round(STORY_GATE_MONEY(this.heard.size - 1) * 0.6));
        this.money += reward;
        this.earned += reward;
        this.totalEarned += reward;
        this.save();
        const ch = CHAPTERS.find((c) => c.id === last);
        this.settle = { title: ch?.title ?? '', reward, t: 0 };
      }
    }
    this.heardPlusBuffer.length = 0;
  }

  /** 掌故播放期间暂存 id（听完才正式收录） */
  private heardPlusBuffer: number[] = [];

  /* ---------------- 输入 ---------------- */

  private onTap(x: number, y: number) {
    // 首次交互解锁音频（浏览器自动播放策略）
    if (!this.audioReady) {
      this.audioReady = true;
      unlockAudio();
      startBGM();
    }
    if (this.settle) {
      // 点击关闭收录面板
      this.settle = null;
      return;
    }
    if (this.talking) {
      // 先补全打字，再翻下一条
      if (!this.dialog.skip()) return;
      this.next();
      return;
    }
    const cust = this.scene.pickCustomer(x, y);
    if (cust) {
      this.inn.tapCustomer(cust);
      return;
    }
    const npc = this.scene.pickNpc(x, y);
    if (npc && this.scene.talkRange(npc)) {
      this.startTalk(npc.id);
    } else if (npc) {
      this.scene.goToNpc(npc);
    } else {
      this.scene.moveTo(x, y);
    }
  }

  /* ---------------- 主循环 ---------------- */

  update(dt: number) {
    if (!this.talking && !this.settle) this.inn.update(dt);
    this.scene.update(dt);
    this.dialog.update(dt);
    if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
    if (this.settle && this.settle.t < 99) this.settle.t += dt;
    // 冷却递减
    for (const k of Object.keys(this.npcCd)) this.npcCd[k] = Math.max(0, this.npcCd[k] - dt);
    for (const k of Object.keys(this.zoneCd)) this.zoneCd[k] = Math.max(0, this.zoneCd[k] - dt);
    // 四季轮换
    this.seasonT += dt;
    if (this.seasonT >= SEASON_SEC) {
      this.seasonT -= SEASON_SEC;
      this.seasonIdx = (this.seasonIdx + 1) % 4;
      this.seasonEarned = 0;
      this.scene.season = this.season;
      this.toast = { text: SEASON_TRANSITION[this.season], t: 3 };
      this.save();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const W = this.platform.width;
    const H = this.platform.height;
    this.scene.render(ctx);
    const need = STORY_GATE_MONEY(this.heard.size);
    const gateK = this.gateMet() ? null : Math.min(1, this.totalEarned / need);
    drawHUD(
      ctx,
      W,
      this.money,
      this.season,
      1 - this.seasonT / SEASON_SEC,
      this.seasonEarned,
      this.heard.size,
      this.storyTotal,
      gateK,
    );
    // 操作提示
    ctx.fillStyle = 'rgba(216,200,168,0.75)';
    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击地面移动 · 点击角色搭话 · 多走动走听，江湖掌故自来', 20, 70);
    // 分区 / 换季 / 奖励提示横幅
    if (this.toast) {
      const t = this.toast.t;
      const a = Math.max(0, Math.min(1, (2.6 - t) / 0.3, t / 0.5));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = 'bold 17px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(this.toast.text).width;
      ctx.fillStyle = 'rgba(30,20,10,0.82)';
      roundRect(ctx, W / 2 - tw / 2 - 18, 62, tw + 36, 34, 17);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,160,23,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffe8b0';
      ctx.fillText(this.toast.text, W / 2, 79);
      ctx.restore();
    }
    // 后厨面板（灶台进度 + 出餐口）
    this.drawKitchen(ctx, W, H);
    // 对话框（隐藏动画期间继续绘制）
    this.dialog.draw(
      ctx,
      W,
      H,
      this.curLine?.speaker ?? '',
      this.curLine?.title ?? '',
      this.curLine?.charId,
    );
    // 掌故收录面板
    if (this.settle) this.drawSettle(ctx, W, H);
  }

  /** 掌故收录面板：标题 · 赏银 · 收藏进度 */
  private drawSettle(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const s = this.settle!;
    const a = Math.max(0, Math.min(1, s.t / 0.35));
    const pw = Math.min(320, W - 48);
    const ph = 168;
    const x = (W - pw) / 2;
    const y = H * 0.5 - ph / 2;
    ctx.save();
    ctx.globalAlpha = a;
    // 遮罩
    ctx.fillStyle = 'rgba(10,6,2,0.55)';
    ctx.fillRect(0, 0, W, H);
    // 面板
    ctx.fillStyle = 'rgba(30,22,10,0.95)';
    roundRect(ctx, x, y, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4a017';
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('—— 掌故收录 ——', W / 2, y + 26);
    ctx.fillStyle = '#ffe8b0';
    ctx.font = 'bold 17px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(s.title, W / 2, y + 56, pw - 32);
    ctx.fillStyle = '#8ce88c';
    ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`赏银 +${s.reward}`, W / 2, y + 86);
    ctx.fillStyle = 'rgba(216,200,168,0.85)';
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`江湖掌故 已收录 ${this.heard.size}/${this.storyTotal}`, W / 2, y + 114);
    ctx.fillStyle = 'rgba(216,200,168,0.55)';
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('点击任意处继续经营', W / 2, y + 144);
    ctx.restore();
  }

  /** 后厨面板：显示烹饪进度与待上菜单 */
  private drawKitchen(ctx: CanvasRenderingContext2D, W: number, _H: number) {
    const inn = this.inn;
    const panelW = 214;
    const panelH = 116;
    const x = 14;
    const y = 92;
    ctx.save();
    ctx.fillStyle = 'rgba(24,16,8,0.78)';
    roundRect(ctx, x, y, panelW, panelH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,160,23,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8c878';
    ctx.fillText('后厨 · 出餐口', x + 12, y + 16);
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
    const cooking = inn.cooking;
    if (cooking) {
      const k = Math.min(1, cooking.t / cooking.dish.cookSec);
      ctx.fillStyle = '#d8c8a8';
      ctx.fillText(`烹饪：${cooking.dish.name}`, x + 12, y + 36);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, x + 12, y + 46, panelW - 24, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#e09040';
      roundRect(ctx, x + 12, y + 46, (panelW - 24) * k, 8, 4);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(216,200,168,0.55)';
      ctx.fillText('灶台空闲 · 等待下单', x + 12, y + 36);
    }
    if (inn.ready.length > 0) {
      ctx.fillStyle = '#b8e8a0';
      ctx.fillText(`待上菜：${inn.ready.map((r) => r.dish.name).join('、')}`, x + 12, y + 64);
      ctx.fillStyle = 'rgba(216,200,168,0.75)';
      ctx.fillText('点击头顶菜名的客人上菜', x + 12, y + 80);
    } else {
      ctx.fillStyle = 'rgba(216,200,168,0.55)';
      ctx.fillText('出餐口空空如也', x + 12, y + 64);
    }
    ctx.fillStyle = 'rgba(216,200,160,0.6)';
    const unlocked = DISHES.filter((d) => d.unlockChapter <= this.inn.progress).length;
    ctx.fillText(`菜谱 ${unlocked}/${DISHES.length}`, x + 12, y + 100);
    ctx.restore();
  }
}