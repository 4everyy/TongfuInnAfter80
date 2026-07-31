const layout = require('../minigame/src/render/layout');
const theme = require('../minigame/src/render/theme').theme;
const explore = require('../minigame/src/render/views/explore');
const manifest = require('../minigame/assets/art/manifest');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const base = layout.createLayout({ windowWidth: 844, windowHeight: 390, pixelRatio: 1 });
const withCapsule = layout.createLayout(
  { windowWidth: 844, windowHeight: 390, pixelRatio: 1 },
  { left: 720, right: 832, top: 8, bottom: 38, width: 112, height: 30 }
);

assert(base.width === 844 && base.height === 390, '横屏逻辑画布发生变化');
assert(base.safe.capsuleRight === 14, '无胶囊信息时回退边距错误');
assert(withCapsule.safe.capsuleRight >= 124, '顶部 HUD 没有避让胶囊');
assert(theme.touch.min >= 44, '最小触控区域小于 44 逻辑像素');
assert(theme.colors.paper === '#F7E9C7' && theme.colors.jade === '#2F6F62', 'UI v6 配色未生效');
assert(theme.motion.debounce === 220, '防重复触发时间未登记');
assert(theme.motion.resource >= 360 && theme.motion.resource <= 500, '资源飞入动画时长不合理');
assert(theme.motion.scene === 500, '早中晚光照过渡时长未登记');
assert(theme.motion.page >= 160 && theme.motion.page <= 220, '账本翻页动画时长不合理');
assert(explore.SCENE_WIDTH === 844, '探索视野没有扩展到完整逻辑画布');
assert(theme.type.title.size === 20 && theme.type.title.lineHeight === 28, '标题字体层级未按 v13 统一');
assert(theme.type.section.size === 16 && theme.type.body.size === 12 && theme.type.caption.size === 10,
  '四级字体体系未按 v13 统一');
assert(manifest.ui && Object.keys(manifest.ui.resources || {}).length === 4, '四项 HUD 图标未登记');
assert(manifest.characters.zhangdeng.displayScale >= 1.08, '主角显示比例没有完成融合精修');
assert(manifest.characters.zhangdeng.shadowAlpha >= 0.12 && manifest.characters.zhangdeng.shadowAlpha <= 0.16,
  '角色脚底阴影透明度不在克制范围');

console.log('UI v6 validation passed: tokens, touch target and capsule inset.');
