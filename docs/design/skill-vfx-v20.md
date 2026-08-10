# 技能特效图集 v20 质量锚点

## 已完成锚点

- 角色：白展堂（底层 ID `wuchen`）。
- 技能：第二技能“截路听风”。
- 类型：控制／眩晕。
- 视觉语言：青玉风痕、穴位金点、低幅冲击环。
- 图集：`4 × 2`，共 8 帧，单帧 `443 × 443`，运行显示比例 `0.58`。
- 阶段：蓄势 1 帧、主效果 3 帧、命中 2 帧、消散 2 帧。

## 运行接口

- `SkillVfxDef.atlas`
- `SkillVfxDef.frameSize`
- `SkillVfxDef.atlasColumns`
- `SkillVfxDef.displayScale`
- `SkillVfxDef.frames.anticipation / active / impact / recovery`

渲染器已经支持多行图集，不再要求所有特效横向排成一行。资源缺失时继续使用角色专属 Canvas 特效。

## 资源位置

- 运行图：`@ch34/skills/wuchen/intercept-wind-v20.webp`
- 源图：`D:\AI\design-assets\dengxia\art-v20\skills\wuchen\intercept-wind-chroma-v20.png`
- 生成方式：Codex 内置图像生成，2026-08-02。
- C 盘未保留本轮生成源图。

## 验证

- `tools/validate_skill_vfx_v20.js`
- 检查八帧 Alpha、尺寸、透明覆盖率、完整阶段顺序和战斗状态绑定。
- 运行预览：`outputs/product-design/art-presentation-v19/04-wuchen-skill-impact.png`。

## 批量制作顺序

1. 五名角色第三技能已在 v21 完成，详见 `docs/design/ultimate-vfx-v21.md`。
2. 五项第一技能：伤害或治疗的高频短演出。
3. 剩余四项第二技能与白展堂第一技能。
4. 每项均保留 6–10 帧、四阶段和 Canvas 后备。
