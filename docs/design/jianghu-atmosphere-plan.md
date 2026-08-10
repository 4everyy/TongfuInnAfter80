# 江湖气息优化总方案

更新时间：2026-08-10
状态：规划（待评审）
关联：`scene-v23.md`、`scene-population-v25.md`、`npc-population-v26.md`、`exploration-v13-runtime-audit.md`

## 一、目标

在不破坏既有碰撞、剧情坐标、存档与分包预算的前提下，通过**渲染层增强 + 数据驱动配置**，让 27 张地图、63+ 名 NPC、数十件道具形成可感知的"江湖生活感"：

- 场景会呼吸：时段、天气、地域特色共同决定氛围。
- NPC 会活着：待机、转向、站位、表情、状态反馈。
- 道具会说话：可交互、可调查、状态可视。
- 玩家有分量：行走、互动、队伍都有回响。

## 二、设计原则

1. **零存档风险**：所有增强基于 `Date.now()`、地图 id、NPC id 的确定性派生，不写入存档。
2. **数据可配**：氛围、NPC 行为、道具高亮全部走 `manifest.js` / `scene-population.js` / `npc-population-v26.js` 的可选字段，缺省回退到通用效果。
3. **性能可控**：单帧新增 draw call 控制在场景粒子预算内（参考 `drawAmbience` 上限），低端机可通过 `settings.atmosphereLevel` 降级。
4. **分层不抢戏**：氛围层永远在 UI 之下、正式光照之上；NPC/道具高亮不覆盖主线热点。
5. **可灰度上线**：每个维度独立开关，可分批合并，不影响主分支稳定性。

## 三、现状盘点

| 维度 | 已有能力 | 缺口 |
|------|----------|------|
| 环境氛围 | 天气（雨）、时段色块、v23 正式光照、本次新增 `drawAmbience`（光尘/落叶/萤火/灯笼） | 地域特色不足、声景视觉化、风/雾、季节 |
| NPC | 站立精灵、名字、阴影、靠近暗示（本次新增 `drawNpcHint`） | 无待机动画、无头部转向、无表情、站位全天不变 |
| 道具 | `props` 装饰、`hotspots` 交互、`interactionAnchor` | 无可交互高亮区分、调查反馈单薄、状态变化无视觉 |
| 玩家 | 行走动画、深度缩放、阴影、队伍三角形标记 | 无脚步尘土、无互动冲击波、无队列插值 |
| 场景特色 | v23 分层、前景遮挡 | 各地图"一眼可辨"的环境小事件几乎为零 |

## 四、五大工作流

### A. 环境氛围增强（渲染层，已有基础）

**A1. 粒子系统升级**
- 改造 `drawAmbience`，读取 `mapArt.atmosphere` 可选配置，缺省回退到 `ambientProfile`。
- 新增粒子类型：
  - `mist`：晨雾/水面水汽（低空横向漂移半透明带）
  - `ember`：灶台/火盆飞溅火星（向上随机衰减）
  - `petal`：花瓣（比落叶更轻、更慢、颜色多样）
  - `smoke`：炊烟（从屋顶/灶口缓慢上升扩散）
  - `splash`：水边小水花（随机出现）
- 粒子配置示例（`manifest.js` 中 `maps.inn.atmosphere`）：
  ```js
  atmosphere: {
    dust: 18, ember: 2, smoke: { x: 245, y: 200, strength: 1 },
    lantern: [[200, 70], [500, 60], [800, 70]]
  }
  ```

**A2. 地域特色氛围**（按地图分组配置，缺省自动推断）

| 地图组 | 特色氛围 |
|--------|----------|
| 客栈/分店（室内） | 光尘 + 灶台火星 + 灯笼暖光 + 偶尔炊烟 |
| 后院/河院（半室外） | 晨雾 + 少量落叶 + 井水反光 |
| 十字街/粮市/河市（市井） | 尘土 + 叫卖声波纹（视觉化） + 人流暗示 |
| 告示巷/纸坊巷（巷弄） | 飘纸屑 + 阴影晃动 |
| 茶棚/东关（半室外关口） | 茶汽 + 旗幡摆动暗示 |
| 石桥/北路（野外） | 强风粒子 + 草叶 + 远处鸟影 |
| 码头/雨渡口（水边） | 水汽 + 水波纹 + 缆绳晃动 |
| 纸坊/作坊/灶院（工作） | 纸屑/粉末/火星/炊烟 |
| 账库/钱庄（室内仓储） | 尘封感（低饱和慢飘尘） + 油灯火苗 |

**A3. 时段 × 天气联动**
- 雨天：所有室外粒子减量，增加水面涟漪、屋檐水滴；萤火归零。
- 夜晚：室内灯笼加强，室外萤火/月光斑；色尘偏冷。
- 中午：粒子最稀薄，光尘最亮。
- 晨/昏：增加长投影暗示 + 雾气。

**A4. 声景视觉化（无音频）**
- 市井地图：在 NPC 密集区绘制半透明同心圆"嘈杂波纹"（很低频，每 2-3 秒一次）。
- 水边：绘制水面周期性扩散圈。
- 工坊：绘制轻微震动线条暗示运转。
- 这一层 alpha 极低（0.06-0.1），仅作潜意识氛围。

**A5. 风向系统**
- 新增 `mapArt.wind`（方向 + 强度），影响落叶/炊烟/旗幡的飘动方向。
- 玩家行走时衣摆/发丝（如果精灵支持）可后续接入。

---

### B. NPC 生命感（数据 + 渲染）

**B1. 待机微动画（纯渲染，不改精灵）**
- 给每名 NPC 的精灵绘制加一个 `idlePhase`（基于 id hash 的相位偏移）：
  - 整体上下浮动 ±1px（呼吸感），周期 2.5-3.5 秒。
  - 阴影同步轻微缩放。
- 配置：`npc.idleAmplitude`（默认 1，老人 0.6，孩童 1.4）。

**B2. 头部转向（渲染层 hack）**
- 当玩家进入 NPC 朝向的"视野锥"（前方 140px、±50°）时：
  - NPC 精灵整体不转，但在头顶区域绘制一个轻微的高光暗示（眼睛方向感）。
  - 或：在 NPC 朝向玩家方向绘制一个小的"关注光点"。
- 实现位置：`drawNpc` 末尾，基于 `state.position` 与 `npc.facing` 判断。

**B3. NPC 状态气泡（已有 `drawNpcHint`，扩展）**
- 现状：靠近 124px 内显示金色省略号。
- 扩展状态：
  - 有任务给玩家：金色叹号（常驻，不依赖距离）。
  - 任务可交付：金色问号变实心。
  - 正在闲谈中：说话波形动画。
  - 营业 NPC 待客：铜钱小图标。
- 配置：`npc.hintType`（auto/task/merchant/silent）。

**B4. 时段站位变化（数据驱动）**
- `scene-population.js` / `npc-population-v26.js` 增加 `schedule`：
  ```js
  schedule: {
    morning: { x: 300, y: 280, facing: 'right' },
    noon: { x: 500, y: 290, facing: 'down' },
    evening: { x: 700, y: 280, facing: 'left' }
  }
  ```
- `world.js` 在 `visibleNpcs` 时根据 `state.worldTime.phase` 选择站位。
- 缺省：使用现有静态 `x/y/facing`，不影响存量 NPC。

**B5. NPC 走动暗示（不真的移动，避免碰撞复杂度）**
- 给"应该会走动"的 NPC（脚夫、更夫、船娘）配置 `wander`：
  - 在原站位附近 ±20px 范围内做缓慢正弦摆动（纯视觉，不更新碰撞）。
  - 每隔 8-15 秒"换一个停顿姿态"（idlePhase 重置）。

**B6. 营业/工作动画暗示**
- 茶棚老板、灶台帮厨、纸坊学徒等：在 `npc.craft` 配置下：
  - 手部区域绘制周期性"操作光点"（非常小的闪烁）。
  - 工作台前方绘制成品/废屑粒子（茶汽、纸屑、火星）。

---

### C. 道具与热点互动感（渲染层为主）

**C1. 可交互道具分级高亮**
- 现状：`drawHotspot` 统一地面环 + 头顶圆。
- 改进：根据 `hotspot.type` 与 `interactionState`（near/active/idle）分级：
  - `idle`（远处不可见）：仅极淡地面光（alpha 0.15）。
  - `near`：地面环 + 头顶淡图标（alpha 0.5）。
  - `active`：完整高亮 + 呼吸 + 连接玩家的细线（可选）。
- 对 `linkedObjectId` 的道具：高亮叠加在道具精灵脚边，而非热点圆心。

**C2. 调查/交互冲击反馈**
- 玩家与 hotspot 交互瞬间（`state.lastInteractionAt`）：
  - 在热点位置绘制一次性扩散环（600ms 衰减）。
  - 配合 toast 出现时，在 toast 位置加一个上浮光点。
- 实现：在 `explore.js` 维护一个本地 `lastInteractFx`（不进存档）。

**C3. 道具状态变化视觉**
- `requires/unless` 切换导致道具出现/消失时，做一个 300ms 淡入/淡出（而非瞬间切换）。
- 实现：`buildSceneItems` 给 prop 加 `appearAt` 时间戳，`drawProp` 据 `Date.now()-appearAt` 算 alpha。

**C4. 装饰道具的环境感**
- 给关键装饰道具（灯笼、旗帜、水面）配置 `sway`：
  - 灯笼：轻微左右摆动（±2°）。
  - 旗帜：更强的风致摆动。
  - 水面道具：周期性反光闪烁。
- 实现：`drawProp` 读取 `prop.sway`，对精灵做 `ctx.translate + rotate`。

**C5. 可拾取/可调查道具的差异化图标**
- 现状：`drawInteractionGlyph` 按 type 出图标。
- 细化：
  - `loot`：宝箱/铜钱图标 + 金色。
  - `investigate`：放大镜/卷轴图标 + 暖色。
  - `repair`：锤/钉图标 + 棕色。
  - `mechanism`：齿轮图标 + 青色。
  - `recipeSample`：碗碟图标 + 食色。
- 这些图标走 `ui-art-v29` 的 `drawIcon`，确保风格统一。

---

### D. 玩家角色与队伍反馈

**D1. 行走尘土**
- 玩家移动时，在脚后绘制 2-3 个淡出尘点（200ms 生命周期）。
- 雨天/石板地：改为水花/无尘（按 `mapArt.groundType` 配置）。

**D2. 互动冲击波**
- 触发 hotspot/对话/战斗瞬间，玩家脚下绘制一次性扩散环。

**D3. 队列表现**
- 现状：跟随者用 `followerFallback` 硬性偏移。
- 改进：跟随者位置做 lerp 插值（视觉），碰撞仍用逻辑位置。
- 队伍人数变化时，新成员有"加入淡入"动画。

**D4. 队长标记**
- 现状：金色三角形。
- 增强：三角形加呼吸光晕 + 当前任务进度色（可选）。

---

### E. 场景特色小事件（数据驱动，渲染表现）

为关键地图增加"一眼可辨"的环境小事件，纯视觉、无玩法、无碰撞：

| 地图 | 特色小事件（周期性/概率性） |
|------|-----------------------------|
| inn | 偶尔有茶客举杯（小光点上升）；门口风铃轻响暗示 |
| yard | 井桶偶尔晃动；晾衣绳衣物飘动 |
| street | 叫卖声波纹；孩童跑过（快速横向粒子）；偶尔落叶旋风 |
| locust_lane | 老槐树树叶持续飘落；树影晃动 |
| tea_shed | 茶汽从棚内上升；旗幡摆动 |
| east_gate | 关旗摆动；偶尔巡差走过（影子粒子） |
| stone_bridge | 桥下水波纹；远处鸟影掠过 |
| grain_market | 叫卖波纹；偶尔谷物扬尘 |
| jiangnan_dock | 缆绳晃动；水波纹；海鸟影子 |
| river_market | 水波纹；船身轻微起伏暗示 |
| rain_ferry | 强水波；雨幕加强；灯笼摇曳 |
| paper_mill | 纸屑飞舞；水车转动暗示（阴影摆动） |
| jiangnan_spice_workshop | 香料粉末飘散；暖色烟雾 |
| old_banquet_kitchen | 强炊烟；火星；偶尔菜香波纹 |
| old_ledger_vault | 尘封慢飘尘；油灯火苗闪烁 |
| money_house | 账册翻动暗示（小粒子）；铜色光尘 |

这些事件由 `mapArt.ambientEvents` 配置触发，渲染层统一调度。

---

## 五、分批实施计划

| 批次 | 范围 | 工作量 | 风险 | 优先级 |
|------|------|--------|------|--------|
| **P1**（已完成） | `drawAmbience` 光尘/落叶/萤火/灯笼；`drawNpcHint` 靠近暗示 | 已落地 | 低 | — |
| **P2**（已完成） | NPC 待机微动画（B1）、道具淡入淡出（C3）、行走尘土（D1） | 已落地 | 低 | — |
| **P3**（已完成） | 粒子系统升级（A1，新增 mist/ember/petal/smoke/splash）、地域特色氛围（A2，`regionGroup` 九分组）、时段天气联动（A3） | 已落地 | 低 | — |
| **P4**（已完成） | 分级高亮（C1，active/near/far 三级）、调查冲击反馈（C2，`hotspotRevealAt` 扩散环）、差异化矢量图标（C5，`drawHotspotGlyph`） | 已落地 | 低 | — |
| **P5**（已完成） | NPC 头部转向（B2，`drawNpcAttention`）、状态气泡扩展（B3，`task/merchant/speaking/silent`）、营业动画（B6，`drawNpcCraft`） | 已落地 | — | — |
| **P6**（已完成） | 时段站位（B4，`world/explore.js visibleNpcs schedule`）、NPC 走动暗示（B5，`wander` 正弦摆动）、队列插值（D3，`followerLerp` + 加入淡入） + D4 队长呼吸光晕 | 已落地 | — | — |
| **P7**（已完成） | 装饰道具摆动（C4，`drawProp sway/shimmer`）、风向系统（A5，`mapArt.wind` 影响粒子/道具）、声景视觉化（A4，`drawSoundscape` 市井/水边/工坊） | 已落地 | — | — |
| **P8**（渲染就绪，待数据） | 场景特色小事件（E）逐地图配置 | 渲染层已支持 `ambientEvents`，需逐地图填配置 | 低 | 中 |
| **P9**（已完成） | `settings.atmosphereLevel` 四档降级（0=基线 / 1=粒子减半 / 2=完整 / 3=全部+声景） | 已落地 | — | — |

## 六、工程接入点

| 文件 | 改动类型 |
|------|----------|
| `minigame/src/render/views/explore.js` | 新增/扩展 `drawAmbience`、`drawNpc`、`drawProp`、`drawHotspot`、`drawPartyMember` |
| `minigame/assets/art/manifest.js` | 各 map 增加 `atmosphere`、`wind`、`ambientEvents`、`groundType` 可选字段 |
| `minigame/data/scene-population.js` | NPC 增加 `schedule`、`idleAmplitude`、`wander`、`craft`、`hintType` |
| `minigame/data/npc-population-v26.js` | 同上 |
| `minigame/src/world/explore.js` | `visibleNpcs` 支持 `schedule` 选择站位 |
| `minigame/src/render/ui-art-v29.js` | `drawIcon` 扩展新图标（lock/exit/loot/investigate/repair/mechanism/recipeSample 已部分存在） |
| `minigame/src/render/views/inn-scene-v18.js` | 客栈内道具的摆动/高亮同步 |
| 新增 `minigame/src/render/atmosphere.js`（可选） | 抽离粒子系统，便于 P3 后维护 |
| `tools/validate_atmosphere.js`（新增） | 校验配置合法性、粒子数量预算 |

## 七、性能预算与降级

- **目标**：iPhone X / 红米级别 30fps 稳定，iPad / 旗舰 60fps。
- **单帧新增 draw call 预算**：≤ 120（粒子 + 高亮 + 反馈）。
- **降级策略**（`settings.atmosphereLevel`）：
  - `0`：仅保留时段色块 + 天气（回到 v23 基线）。
  - `1`：保留 `drawAmbience` 基础粒子（数量减半）。
  - `2`（默认）：完整氛围 + NPC 待机 + 道具高亮。
  - `3`：全部 + 场景特色小事件。
- 自动降级：首次进入场景检测连续掉帧 > 10%，自动 -1 级并提示。

## 八、风险与回退

| 风险 | 应对 |
|------|------|
| 粒子过多导致低端机卡顿 | P9 性能回归 + 自动降级 |
| NPC 站位变化破坏寻路 | `schedule` 仅改视觉坐标，碰撞用逻辑坐标；专项寻路验证 |
| 数据字段膨胀 | 所有新字段可选 + validator 兜底 |
| 视觉喧宾夺主 | 氛围层 alpha 上限 0.4，主线热点优先级锁死最高 |
| 与 v23 光照冲突 | 氛围层绘制顺序在正式光照之后、UI 之前；正式光照成功时弱化通用色块 |

## 九、验收清单（每批合并前）

- [ ] `node -c` 全部新增/修改文件通过
- [ ] `tools/validate_*.js` 相关校验通过
- [ ] 进入/离开/切换时段/切换天气，无瞬闪、无卡顿
- [ ] 主线热点、战斗、营业 UI 优先级正确，未被氛围遮挡
- [ ] 低端机降级路径生效
- [ ] 微信开发者工具真机预览视觉确认（需开启服务端口）

## 十、下一步

1. 评审本方案，确认 P2-P4 的优先级与范围。
2. 评审通过后，按批次在独立分支实现，每批合并前跑全量 validate + 语法检查。
3. P8（场景特色小事件）可与文案/美术协同，逐地图填充 `ambientEvents` 配置。

---

附：地图与场景分组速查（27 张）

| 分组 | 地图 |
|------|------|
| 室内 | inn, jiangnan_branch |
| 半室内/院落 | yard, river_yard |
| 市井 | street, grain_market, river_market |
| 巷弄 | locust_lane, paper_alley, scale_contract_lane |
| 关口/茶棚 | tea_shed, east_gate, canal_checkpoint |
| 野外/桥 | stone_bridge, north_road |
| 水边 | jiangnan_dock, rain_ferry |
| 工坊 | paper_mill, jiangnan_spice_workshop, old_banquet_kitchen |
| 仓储/账务 | guild_warehouse, guild_office, charity_granary, money_house, merchant_alliance_hall, old_ledger_vault |
| 驿站 | old_post |