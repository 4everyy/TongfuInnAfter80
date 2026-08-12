# 灯下江湖 · 项目结构分析

> 本文档由代码与配置静态分析自动整理，更新时间：2026-08-10。

---

## 一、项目概览

| 项 | 内容 |
| --- | --- |
| 项目名称 | 灯下江湖（仓库：TongfuInnAfter80） |
| 定位 | 原创横屏微信小游戏，取材《武林外传》后 80 回衍生世界观 |
| 技术栈 | 微信小游戏原生 Canvas + CommonJS（`require/module.exports`）+ 微信本地存储 |
| 主入口 | 微信开发者工具导入目录：`D:\TongfuInnAfter80\minigame` |
| 渲染方式 | 原生 Canvas 2D，横屏，逻辑基准分辨率 `844 × 390` |
| 存档版本 | v9（`dengxia-rpg-save-v10`），兼容迁移 v3–v8 旧档 |
| 美术源 | 仅存放于 `D:\AI`，仓库只保留压缩后的运行时资源 |

### 核心主循环

```
柳掌灯自由探索  →  调查客栈与商路事件  →  完成营业  →  结识临时伙伴  →  推进招募与章节
```

### 已实现玩法

- 固定原创主角「柳掌灯」单人开局。
- 九名原创角色，含「相遇—协作—信任—任务—招募—结局」阶段。
- 四季、三十二章、二百二十四日的数据框架。
- 96 个经营事件、48 个探索事件、24 个稀有连续事件的数据池。
- 七张可探索地图、八向移动、二维碰撞、跟随、对话、回合制战斗。
- 菜单、岗位、客房、装修、三轮营业、日结。

---

## 二、顶层目录结构

```
TongfuInnAfter80/
├── .agents/                  # 代理配置（隐藏目录）
├── .env.local                # 本地环境变量（gitignored）
├── .gitignore                # 忽略 node_modules / dist / vite / Unity 产物等
├── AGENTS.md                 # 工作区存储规则（D:\AI 缓存策略）
├── README.md                 # 项目总览与关键模块说明
├── docs/                     # 设计文档、剧本、架构
├── minigame/                 # 微信小游戏主工程（唯一运行入口）
├── outputs/                  # 预览图、构建报告、美术产出
└── tools/                    # 构建、渲染、校验、美术处理脚本（Python + JS）
```

> 仓库已收敛：旧 Unity/React/Vite/Node 依赖均已移除，仅保留小游戏工程与设计文档。

---

## 三、minigame/ —— 微信小游戏主工程

这是唯一被微信开发者工具导入并运行的目录。包体约 **49.18 MB**（PNG 462 个 ≈ 41.92 MB，JPG 39 个 ≈ 7.18 MB）。

```
minigame/
├── game.js                   # 启动引导：Canvas 创建、启动屏、致命错误兜底、存档自愈
├── game.json                 # 小游戏配置：横屏、9 个分包声明
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── README.md
├── assets/                   # 运行时美术资源
│   └── art/                  # 压缩后的角色帧、场景、UI
├── data/                     # 纯数据层（JS 模块）
├── src/                      # 源代码层（JS 模块）
│   ├── app.js                # ★ 核心控制器：状态、动作分发、主循环
│   ├── combat/               # 战斗系统
│   ├── core/                 # 核心：存档、时间、战役、运输、随机事件、案卷
│   ├── dialogue/             # 对话系统
│   ├── inn/                  # 客栈经营：分支、厨试、核心循环、场景交互
│   ├── render/               # 渲染：Canvas、布局、主题、资源、UI 美术、视图集
│   ├── systems/              # 系统目录（当前空，预留）
│   └── world/                # 大地图：探索、事件、商业
└── subpackages/              # 分包：章节 / 场景 / NPC，按需下载
```

### 3.1 启动流程（`game.js`）

1. `safeWindowInfo()` 安全获取窗口尺寸，回退默认 `844×390`。
2. `drawBootScreen()` 绘制「灯下江湖 / 正在准备客栈……」启动屏。
3. `require('./src/app').createGame(screenCanvas)` 创建控制器。
4. 绑定 `wx.onError` / `wx.onUnhandledRejection` → `showFatal()` 致命错误页（含一键清除异常存档按钮）。
5. 绑定 `wx.onShow` / `wx.onWindowResize` → 重绘。
6. 启动屏诊断写入 `dengxia-boot-diagnostic-v1`。

**健壮性设计**：每一阶段都 `try/catch` 并写诊断；失败时绘制带「清除异常存档」按钮的兜底界面。

### 3.2 核心控制器（`src/app.js`）

`createGame(screenCanvas)` 返回 `{ redraw, runtimeError }`，内部职责：

- **状态**：`load()` 读取存档；`inn.ensure` / `innScene.ensure` / `campaign.ensure` 补全字段；`world.syncQuest` 同步任务。
- **交互路由** `interact(targetId)`：根据热点类型分发到 `doorwayCrisis` / `dialogue` / `combat` / `cookingTrials` / `inn` / `commerce`。
- **动作分发** `dispatch(action)`：统一入口，处理 `startAdventure` / `interact` / `dialogue` / `cookingTrialChoice` / `inn` / `startOuting` / `party*` / `attack|skill|defend` / `battle*` 等 30+ 动作类型，带 220ms 去抖。
- **输入**：`wx.onTouchStart/Move/End/Cancel` → 渲染层手势识别（摇杆 / 点击命中按钮）。
- **主循环**：`setInterval(33ms ≈ 30fps)`，仅在 `explore` 且无模态/对话/战斗/经营事件时驱动 `world.update`，其余情况每帧仍 `renderer.render`。
- **存档**：每次 `dispatch` 末尾 `save(state)`。

### 3.3 子系统模块（`src/`）

| 目录 | 关键文件 | 职责 |
| --- | --- | --- |
| `core/` | `store.js` `time.js` `campaign.js` `transport.js` `case-files.js` `random-events.js` | 存档迁移、世界时间、角色招募阶段、运输、案卷、随机事件 |
| `world/` | `explore.js` `events.js` `commerce.js` | 八向移动、碰撞、热点、跟随、地图切换、商路事件 |
| `inn/` | `inn.js` `core-loop-v28.js` `branches.js` `cooking-trials.js` `scene-interactions.js` | 客栈经营主循环、分店、厨试小游戏、场景内交互 |
| `combat/` | `battle.js` | 回合制战斗：攻击/技能/防御、目标选择、结算 |
| `dialogue/` | `dialogue.js` | 对话树、选项、揭示动画 |
| `render/` | `canvas.js` `layout.js` `theme.js` `assets.js` `ui-art-v29.js` | 渲染管线、布局、主题色、资源加载与重试、UI 美术合成 |
| `render/views/` | `title.js` `explore.js` `battle.js` `management*.js` `inn-scene-v18.js` `chapter001.js` `overlays.js` `transitions.js` | 各场景视图：标题、探索、战斗、经营、客栈场景、章节、遮罩、转场 |

### 3.4 数据层（`data/`）

纯 CommonJS 数据模块，被源码 `require` 引用，便于内容迭代与拆包。

| 文件 | 内容 |
| --- | --- |
| `campaign.js` | 原创角色、四季章节、日程、招募、事件池 |
| `content.js` | 当前可运行地图、对话、战斗 |
| `chapter001.js` | 第一回完整章节逻辑 |
| `doorway-crisis.js` | 门前危机事件 |
| `identity.js` | 主角与客栈身份信息 |
| `commerce.js` | 商路 / 贸易数据 |
| `management.js` `core-loop-v28.js` | 经营数据与核心循环配置 |
| `inn-interactions.js` `presentation.js` | 客栈交互、表现层数据 |
| `npc-population-v26.js` `scene-population.js` | NPC 与场景人口配置 |
| `season1-deep.js` `season1-deep-56.js` `season1-deep-78.js` | 第一季深度章节（第 5-8 回） |
| `season2-ch910.js` `season2-ch11.js` | 第二季第 9-11 回 |
| `all-map-access-v27.js` | 全地图解锁配置 |
| `package.json` | 数据层依赖声明 |

### 3.5 分包策略（`subpackages/`，9 个）

`game.json` 声明，按需下载以控制首包体积：

| 分包 | 用途 |
| --- | --- |
| `ch34` `ch56` `scene-s1a-v34` `scene-s1b-v34` | 第一季章节 3-8 回角色、技能、道具与场景资源 |
| `s2ch910` `s2ch11` | 第二季章节 9-11 回资源 |
| `scene-core-v34` | 公共地图、通用任务道具与前景层 |
| `scene-s1a-v34` `scene-s1b-v34` `scene-s2-v34` | 第一季 / 第二季正式场景、任务道具与前景层 |
| `npc-pop-v26` | NPC 人口数据与资源 |

每个分包结构：`{ game.js, assets/ }`。

---

## 四、docs/ —— 文档体系

```
docs/
├── 武林外传前80回.md          # 原作前 80 回剧本（参考）
├── 武林外传后80回.md          # 后 80 回衍生设定
├── art-assets-registry.md     # 美术资源登记
├── art-production.md          # 美术生产流程
├── current-build.md           # ★ 当前构建与优化清单（含包体快照、优先级）
├── game-modes.md              # 故事模式 / 自由模式规则
├── story-mode-mvp.md          # 故事模式 MVP 设计
├── architecture/
│   └── wechat-minigame.md     # 微信小游戏优先架构与阶段路线 M1–M5
├── design/                    # 各系统设计文档（按版本号）
│   ├── steps/                 # 分步设计与验收标准
│   ├── *-runtime-audit.md     # 运行时审计（战斗/探索/经营/场景/UI…）
│   ├── scene-v23.md / battle-v16.md / ui-art-v29.md ...  # 各版本设计
│   └── nine-role-adventure-plan.md / npc-commerce-v30.md ...  # 规划
└── story/
    └── 第一回-江湖不散场.md     # 已落地的第一回剧本
```

**文档命名约定**：多数文件带版本号（如 `v23` `v29` `v30`），与 `tools/` 中同名 `validate_*` / `build_*` / `render_*` 脚本一一对应，便于「设计 → 构建 → 校验 → 预览」闭环。

---

## 五、tools/ —— 工具链脚本

Python 与 Node 脚本，用于离线美术处理、数据构建、预览渲染、运行校验。**不进入小游戏包体**。按命名前缀分类：

### 5.1 构建（build_*）

| 脚本 | 语言 | 作用 |
| --- | --- | --- |
| `build_battle_art_v16.js` | JS | 战斗美术合成 |
| `build_directional_atlases.py` | Py | 八向行走图集 |
| `build_npc_population_v26.js` | JS | NPC 人口数据构建 |
| `build_role_atlas.py` | Py | 角色图集 |
| `build_runtime_art.py` | Py | 运行时美术打包 |
| `build_scene_layers_v23.js` | JS | 场景分层 |
| `build_season2_ch11_art.js` | JS | 第二季第 11 回美术 |
| `build_shiwei_runtime.js` | JS | 师卫运行时资源 |
| `build_world_v4_art.py` / `build_world_v4_entities.py` / `build_world_v4_review.py` | Py | 大世界美术/实体/复核 |

### 5.2 渲染预览（render_*）

`render_art_presentation_v19.js`、`render_battle_v14_preview.js`、`render_character_fit_previews.js`、`render_commerce_v30_preview.js`、`render_exploration_v11_preview.js`、`render_inn_interactions_v18.js`、`render_management_v5.js`、`render_npc_population_v26.js`、`render_scene_v23_previews.js`、`render_season2_ch11_preview.js`、`render_season2_preview.js`、`render_ui_art_v29_preview.js` — 生成 `outputs/` 下的预览图供视觉 QA。

### 5.3 校验（validate_*）

覆盖几乎所有玩法系统，共 **26 个**校验脚本，例如：

- 战斗：`validate_battle_fx_v15` `validate_battle_tactics_v17` `validate_battle_ui_v14` `validate_skill_vfx_v20` `validate_ultimate_vfx_v21`
- 场景/探索：`validate_scene_layers_v23` `validate_scene_population_v25` `validate_exploration_v8/v11` `validate_all_maps_unlocked_v27`
- 经营：`validate_management_v5/v12` `validate_commerce_v30` `validate_inn_interactions_v18` `validate_core_loop_v28`
- 章节：`validate_campaign_v9` `validate_branches_v10` `validate_chapters_56` `validate_chapters_78` `validate_deep_chapters` `validate_season2_ch910/ch11`
- 美术/UI：`validate_art_presentation_v19` `validate_dialogue_art_v20` `validate_ui_art_v29` `validate_ui_v6` `validate_all_skill_vfx_v22` `validate_npc_population_v26` `validate_shiwei_animation` `validate_world_v4`

### 5.4 处理（process_* / optimize_* / normalize_* / split_* / prepare_* / compose_*）

`process_ui_art_v29.py`、`process_ui_v13_assets.py`、`process_walk_pilot.py`、`optimize_atlas.py`、`normalize_vfx_sheet.js`、`split_animation_sheet.py`、`prepare_map_background.py`、`compose_animation_preview.py` — 美术资源的切分、合并、优化、规范化。

### 5.5 其他

`simulate_chapter_v4.js`（章节模拟）、`smoke_wechat_boot.js`（启动冒烟）、`test_asset_store.js`（资源存储测试）、`management_preview_entry.js`（预览入口）、`comfyui/`（AI 绘图工作流）。

---

## 六、outputs/ —— 产出与预览

```
outputs/
├── *.png / *.jpg / *.json          # 顶层预览图与构建报告（微信开发者工具截图、战斗/标题预览…）
├── art-processing/                 # 美术处理中间产物
├── canva/                          # Canva 设计稿
├── creative-production/            # 创意生产
├── figma/                          # Figma 导出
├── generated/                      # AI/脚本生成图
├── imagegen/                       # 图像生成
├── product-design/                 # 产品设计稿
├── screenshots/                    # 截图
└── wechat-devtools/                # 微信开发者工具自动化产物（部分 gitignored）
```

> `outputs/wechat-devtools/**/` 下的 `browser-profile/`、`browser-cache/`、`browser-temp/`、`preview-bundle.js`、`preview.html` 已在 `.gitignore` 中忽略。

---

## 七、工作区存储规则（来自 `AGENTS.md`）

- **禁止**在 C 盘安装工具、下载模型、建立依赖缓存。
- `D:\AI`：AI 工具、模型、虚拟环境、缓存、下载、临时生成、源美术。
- `D:\TongfuInnAfter80`：仅放游戏源码与优化后的运行时资产。
- 大型下载前须显式指定缓存/临时目录到 D 盘并确认可用空间。
- 不得移动/删除 C 盘既有软件，除非用户明确许可。

---

## 八、架构要点总结

### 8.1 数据驱动 + 分层

```
data/*.js  ──require──▶  src/{core,world,inn,combat,dialogue}
                                    │
                                    ▼
                              src/app.js  ──dispatch──▶  src/render/*  ──▶  Canvas
```

- 数据层（`data/`）与逻辑层（`src/`）分离，内容迭代不动代码。
- 渲染层细分 `canvas / layout / theme / assets / views`，视图按场景独立。

### 8.2 状态与存档

- 单一全局 `state` 对象，`core/store.js` 负责 `freshState / load / save` 与跨版本迁移。
- 每个动作后 `save(state)`，启动时 `load()`，字段缺失由各 `ensure()` 补全。
- 致命错误时提供「清除异常存档」自愈入口。

### 8.3 性能与分包

- 首包瘦身优先级最高：角色行走帧、技能帧按角色/章节分包。
- 9 个分包按需下载；美术源图仅在 `D:\AI`，工程内为压缩产物。
- 主循环 30fps，探索态才推进物理，其余场景只重绘。

### 8.4 工程闭环

```
设计文档(docs/design/*.md) ──▶ 构建(build_*) ──▶ 校验(validate_*)
        │                                              │
        ▼                                              ▼
   数据(data/*.js) ──▶ 游戏运行(minigame/) ──▶ 预览(render_* → outputs/)
```

每个版本号（v23/v29/v30…）在文档、数据、脚本、分包四处保持一致，形成可追溯的版本化交付链。

---

## 九、建议与风险点

1. **`src/systems/` 为空目录**：若已弃用建议删除；若为预留请补 README 说明。
2. **数据文件体积**：`data/` 下 JS 模块随章节扩展会增大，建议评估是否进一步拆分到分包。
3. **`outputs/` 入库策略**：大量预览图入库会膨胀仓库，可考虑只保留关键基线，其余走 CI 产物。
4. **文档版本号一致性**：维护一份「版本号 → 对应文档/脚本/分包」映射表，避免版本漂移。
5. **启动错误兜底**：`game.js` 已做存档自愈，但建议补一份「存档迁移失败」的灰度降级路径（如只读旧档继续游玩）。
6. **Unity 残留**：架构文档仍提 `unity/`，但仓库已无该目录，建议同步更新 `docs/architecture/wechat-minigame.md` 的「当前入口」路径（现为 `D:\TongfuInnAfter80\minigame`）。
