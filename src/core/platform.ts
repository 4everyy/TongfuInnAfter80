/**
 * 平台适配层：同时支持 微信小游戏(Canvas) 与 浏览器(DOM Canvas)。
 * 运行时自动探测，暴露统一的接口给引擎上层。
 */

export interface PlatformImage {
  width: number;
  height: number;
  src?: string;
}

export interface Platform {
  readonly isWegame: boolean;
  /** 画布尺寸（CSS 像素） */
  width: number;
  height: number;
  dpr: number;
  /** 主 Canvas 2D 上下文（已缩放 dpr） */
  ctx: CanvasRenderingContext2D;
  /** 显示层生命周期 */
  onShow(cb: () => void): void;
  onHide(cb: () => void): void;
  /** 浏览器窗口尺寸变化回调（微信小游戏无此事件，可为空） */
  onResize?: null | (() => void);
  /** 触摸/鼠标统一为指针事件 */
  onPointerDown(cb: (x: number, y: number) => void): void;
  onPointerMove(cb: (x: number, y: number) => void): void;
  onPointerUp(cb: (x: number, y: number) => void): void;
  /** 微信登录（H5 下返回占位） */
  login(): Promise<{ code: string }>;
  /** 振动等反馈 */
  vibrate(short: boolean): void;
  /** 本地存储 */
  storage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
  };
}

declare const wx: {
  getSystemInfoSync(): { windowWidth: number; windowHeight: number; pixelRatio: number };
  createCanvas(): HTMLCanvasElement & { _wx?: boolean };
  onShow(cb: () => void): void;
  onHide(cb: () => void): void;
  onTouchStart(cb: (e: { touches: Array<{ x: number; y: number }> }) => void): void;
  onTouchMove(cb: (e: { touches: Array<{ x: number; y: number }> }) => void): void;
  onTouchEnd(cb: (e: { touches: Array<{ x: number; y: number }> }) => void): void;
  login(o: { success: (r: { code: string }) => void; fail: (e: unknown) => void }): void;
  vibrateShort(o: object): void;
  vibrateLong(o: object): void;
  getStorageSync(k: string): string;
  setStorageSync(k: string, v: string): void;
  removeStorageSync(k: string): void;
};

function isWechat(): boolean {
  return typeof wx !== 'undefined' && !!wx && typeof wx.getSystemInfoSync === 'function';
}

export function createPlatform(): Platform {
  if (isWechat()) {
    return createWegamePlatform();
  }
  return createWebPlatform();
}

function createWegamePlatform(): Platform {
  const info = wx.getSystemInfoSync();
  const canvas = wx.createCanvas();
  const dpr = Math.min(info.pixelRatio || 1, 2);
  canvas.width = info.windowWidth * dpr;
  canvas.height = info.windowHeight * dpr;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(dpr, dpr);

  const p: Platform = {
    isWegame: true,
    width: info.windowWidth,
    height: info.windowHeight,
    dpr,
    ctx,
    onShow: (cb) => wx.onShow(cb),
    onHide: (cb) => wx.onHide(cb),
    onPointerDown: (cb) =>
      wx.onTouchStart((e) => {
        const t = e.touches[0];
        if (t) cb(t.x, t.y);
      }),
    onPointerMove: (cb) =>
      wx.onTouchMove((e) => {
        const t = e.touches[0];
        if (t) cb(t.x, t.y);
      }),
    onPointerUp: (cb) =>
      wx.onTouchEnd((e) => {
        const t = e.touches[0];
        if (t) cb(t.x, t.y);
      }),
    login: () =>
      new Promise((resolve, reject) =>
        wx.login({ success: (r) => resolve({ code: r.code }), fail: reject }),
      ),
    vibrate: (short) => (short ? wx.vibrateShort({}) : wx.vibrateLong({})),
    storage: {
      get: (k) => wx.getStorageSync(k) || null,
      set: (k, v) => wx.setStorageSync(k, v),
      remove: (k) => wx.removeStorageSync(k),
    },
  };
  return p;
}

function createWebPlatform(): Platform {
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  document.body.appendChild(canvas);
  const style = canvas.style;
  style.position = 'fixed';
  style.inset = '0';
  style.width = '100vw';
  style.height = '100vh';
  style.touchAction = 'none';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#1a1408';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const p: Platform = {
    isWegame: false,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr,
    get ctx() {
      return canvas.getContext('2d')!;
    },
    onResize: null,
    onShow: (cb) => window.addEventListener('focus', cb),
    onHide: (cb) => window.addEventListener('blur', cb),
    onPointerDown: (cb) =>
      canvas.addEventListener('pointerdown', (e) => cb(e.clientX, e.clientY)),
    onPointerMove: (cb) =>
      canvas.addEventListener('pointermove', (e) => cb(e.clientX, e.clientY)),
    onPointerUp: (cb) => canvas.addEventListener('pointerup', (e) => cb(e.clientX, e.clientY)),
    login: async () => ({ code: 'h5-local' }),
    vibrate: () => {
      if (navigator.vibrate) navigator.vibrate(15);
    },
    storage: {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      remove: (k) => localStorage.removeItem(k),
    },
  };

  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    p.width = window.innerWidth;
    p.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p.onResize?.();
  };

  window.addEventListener('resize', resize);
  resize();
  return p;
}