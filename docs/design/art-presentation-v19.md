# 前 11 章美术表现 v19

## 已完成

- 新增独立演出配置，覆盖 34 组对话、五名角色的 15 项技能和 27 张地图出口。
- 对话支持 `bubble / standard / dramatic` 三种层级、说话人与听者双侧半身像、表情和姿势资源回退。
- 关键剧情加入背景压暗、角色入场位移、说话者强调和朱砂题签。
- 技能效果携带角色、技能序号、视觉母题、配色和四段时间轴。
- 五名角色第三技能支持短切入；没有透明特效图集时使用角色专属 Canvas 特效。
- 佟湘玉正式战斗锚点已生成并压缩为运行资源，源图归档在 `D:\AI`。
- 地图出口改为门框、方向墨推或商路过场，切换期间冻结移动并在中点换图。
- 战斗进入与返回加入朱砂笔锋过场，目标地图加载失败时可以退回上一场景。
- 雨夜地图加入动态雨幕、冷色空气层和地面薄雾。

## 资源接口

- `RoleArt.dialogue`: `bust / expressions / poses`。
- `RoleArt.battlePortrait / skillCutIn`。
- `SkillVfxDef`: `atlas / frameSize / frames / anticipation / active / impact / recovery / hitStop / cameraShake / screenTint`。
- `DialogueDef`: `presentation / listenerId / expression / pose`。
- `sceneTransition`: `kind / duration / switchAt / direction / from / targetMapId / targetSpawnId`。

## 运行预览

- `outputs/product-design/art-presentation-v19/01-standard-dialogue.png`
- `outputs/product-design/art-presentation-v19/02-dramatic-dialogue.png`
- `outputs/product-design/art-presentation-v19/03-zhangdeng-skill-cutin.png`
- `outputs/product-design/art-presentation-v19/04-wuchen-skill-impact.png`
- `outputs/product-design/art-presentation-v19/05-inn-yard-transition.png`

## 自动检查

- `node tools/validate_art_presentation_v19.js`
- 覆盖 34 组对话层级、五人对话与战斗资源、15 项技能身份、27 图出口配对与过场中点换图。
- 既有战斗 FX、战斗战术、探索、经营交互和第 11 章检查继续作为回归门槛。

## 下一恢复点

1. 五名角色六表情与三姿势正式半身图已在 v20 完成，详见 `docs/design/dialogue-art-v20.md`。
2. 白展堂“截路听风”8 帧技能图集已作为 v20 质量锚点接入；其余 14 项继续按同一接口制作。
3. 完成 13 张重点地图的独立前景与光照素材，其余地图沿用运行时遮挡提取。
4. 在微信开发者工具和 iPhone 预览中检查对话遮挡、技能峰值亮度、过场触控锁与内存峰值。
5. Canva 等待新版预览确认后保存；Figma 等待原文件链接后同步组件。
