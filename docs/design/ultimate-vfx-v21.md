# 五人第三技能特效 v21

## 完成内容

当前五名角色的第三技能均完成正式透明图集，每项 8 帧、`4 × 2` 排列、单帧 `443 × 443`。

- 佟湘玉“一席定心”：灯火、账本、算盘轨迹与暖金稳定脉冲。
- 白展堂“驿痕追踪”：青玉脚印、路引线、铜牌与穴位锁定。
- 郭芙蓉“喝止风波”：朱砂掌风、交叉护卫、木屑与地面冲击。
- 吕秀才“博闻强记”：契纸、墨线、证据关系与朱砂印阵。
- 李大嘴“封灶守门”：灶火、锅盖、蒸汽、香料与热力护盾。

五项技能的主体、节奏和色彩均由角色能力与剧情身份决定，不通过随意换色制造差异。

## 运行接口

- 统一四阶段：蓄势 1 帧、主效果 3 帧、命中 2 帧、消散 2 帧。
- `displayScale`按角色在 `0.58–0.62`之间调整。
- 图集支持多行裁切；缺图或加载失败时回退角色专属 Canvas 演出。
- 第三技能继续叠加约 `420ms`角色剪影切入，效果图集在切入后进入峰值。

## 运行路径

- `@ch34/skills/xiangyu/settle-heart-v21.webp`
- `@ch34/skills/wuchen/courier-trace-v21.webp`
- `@ch34/skills/jingzhi/halt-uproar-v21.webp`
- `@ch34/skills/wenyan/remember-record-v21.webp`
- `@s2ch910/skills/shiwei/seal-stove-v21.webp`

所有源图与色键处理稿归档到 `D:\AI\design-assets\dengxia\art-v21\skills\`，C 盘不保留生成源图。

## 验证与预览

- `tools/validate_ultimate_vfx_v21.js`
- 覆盖五人 40 帧 Alpha、尺寸、透明覆盖率、阶段顺序、显示比例和战斗绑定。
- 实战预览：`outputs/product-design/art-presentation-v19/09-zhangdeng-ultimate.png`至`13-shiwei-ultimate.png`。

## 下一恢复点

1. 按使用频率制作五名角色第一技能，共 5 套图集。
2. 补齐佟湘玉、郭芙蓉、吕秀才、李大嘴的第二技能。
3. 最后补白展堂第一技能；白展堂第二技能已在 v20 完成。
4. 十五项技能全部完成后再进行亮度、峰值内存与真机帧率统一优化。

