# 开放探索素材台账

更新时间：2026-07-26

本台账服务于“佟湘玉主角 + 自由探索 + 逐步结识伙伴”的游戏重构。通用运行资源存放在`minigame/assets/art/`，章节资源存放在`minigame/subpackages/<chapter-pack>/assets/art/`；生成源图、工作文件和提示词记录存放在`D:\AI\design-assets\dengxia\`。

## 第 5、6 章已接入

- `@ch56/maps/grain_market/far.jpg`：雁回粮市，采价、粮袋批次和证人护送。
- `@ch56/maps/guild_office/far.jpg`：商会账房，双账比对、证据封存和账房战斗。
- `@ch56/maps/charity_granary/far.jpg`：城南义仓，空仓、倒扣封条和转运暗门。
- `@ch56/maps/canal_checkpoint/far.jpg`：河渠关卡，粮车护送、锁链路障和章末战斗。
- `@ch56/props/chain-barrier.png`：带 Alpha 的动态锁链路障。
- `@ch56/props/relief-cart.png`：赈济粮车场景道具。
- 本轮源图归档：`D:\AI\design-assets\dengxia\season1\chapters-05-06\`。

## 第 7、8 章已接入

- `@ch78/maps/money_house/far.jpg`：雁回票号，高柜台、兑票窗口、印章墙与封闭账房。
- `@ch78/maps/scale_contract_lane/far.jpg`：秤契巷，不同制式秤台、契纸摊与追踪后门。
- `@ch78/maps/merchant_alliance_hall/far.jpg`：商盟会馆，对称议事空间、契约墙与隐藏机关。
- `@ch78/maps/old_ledger_vault/far.jpg`：地下旧账库，潮湿砖库、水道、烧损账柜与季末战斗区。
- 四张运行图采用 JPEG，仅包含环境结构；NPC、文字、证据和任务物件均由运行层独立绘制。
- 生成方式：Codex 原生 ImageGen，经 Creative Production 面板`3c8d45a9-cc54-4953-b929-c20701dab745`登记，日期`2026-07-26`。
- 源图位置：
  - `D:\AI\design-assets\dengxia\season1\chapters-07-08\money-house-master-v1.png`
  - `D:\AI\generated-source-art\dengxiajianghu\chengqi-alley-master-2_5d-ultrawide.png`
  - `D:\AI\design-assets\dengxia\season1\chapters-07-08\merchant-alliance-hall-master-v1.png`
  - `D:\AI\TongfuInnAfter80\art-source\scenes\underground-old-ledger-vault\underground-old-ledger-vault-master.png`
- 吕秀才继续复用已验收的三方向 19 帧探索图集、受击剪辑和折扇战斗立绘；第 7、8 章的透光验页、核契与护证由空间热点、交互剪辑和战斗状态组合驱动，不复制一套基础角色图集。

## 已登记并优先复用

- 人物：`characters/xiangyu`、`zhantang`、`furong`、`xiucai` 等角色头像与探索图集，登记于 `minigame/assets/art/manifest.js`。
- 场景：客栈、后院、街道、告示巷、茶棚、东门、石桥的横向地图背景与既有遮挡设施。
- 设施：客栈桌椅遮挡层、后院练功桩、街边店面、东门桌案、石桥货车。
- 原则：保留角色图集的帧规格、锚点和文件路径；新玩法优先增加可交互设施、状态变体、UI 图标和环境特效，避免重绘已可用的角色与地图基础层。

## 运行时目录和命名

- `characters/<role-id>/`: `<role-id>_portrait.webp`、`<role-id>_explore_<direction>.png`、`<role-id>_skill_<name>.png`
- `scenes/<scene-id>/`: `<scene-id>_far.webp`、`<scene-id>_mid.webp`、`<scene-id>_near.webp`
- `props/<scene-id>/`: `<prop-id>_<state>.webp`；状态使用 `idle`、`active`、`spent`、`damaged`、`locked`
- `ui/`: `<feature>_<element>_<state>.webp`
- `fx/`: `<effect-id>_<frame>.png`

透明物件使用 PNG；背景、头像和大面积插画使用 WebP。每个导入项需要同步更新 `manifest.js`。

## P0 必做增量素材

### 人物

- 佟湘玉 `xiangyu_gesture_negotiate`：交涉手势，透明图，512×512，1 张；用于“掌柜周旋”触发时。
- 白展堂 `zhantang_service_idle`、`zhantang_watchful`：跑堂与警觉两种 NPC 状态，透明图，各 512×512；用于可反复互动与关系变化。
- 茶客群像 `guest_group_calm`、`guest_group_restless`：透明前景，1024×512；用于展示危机是否升级。

### 场景与设施

- 门前风波叠加层 `scenes/inn-front/inn-front_crisis_mid.webp`：客栈门口、散乱板凳、围观剪影，横向 1536×512，不画完整主角。
- 传闻板 `props/inn/rumor-board_idle.png`、`rumor-board_active.png`：512×768，透明，带可贴纸区域。
- 账本 `props/inn/ledger_idle.png`、`ledger_marked.png`：512×512，透明，打开状态；用于发现账目缺口。
- 茶桌 `props/inn/tea-table_idle.png`、`tea-table_unsettled.png`、`tea-table_served.png`：768×512，透明；用于茶客状态反馈。
- 后厨灶台 `props/inn/stove_cold.png`、`stove_hot.png`：768×768，透明；用于食物准备和大嘴后续能力。
- 街巷告示 `props/street/notice_rumor.png`：512×768，透明；用于外部传闻和下一地点提示。

### UI 与特效

- 掌柜行动图标：`ui/action_favor.webp`、`action_ledger.webp`、`action_promise.webp`，各 128×128。
- 自由探索标记：`ui/marker_interact.webp`、`marker_clue.webp`、`marker_changed.webp`，各 96×96；低干扰，只有接近时出现。
- 气泡尾巴和背景：`ui/speech_tail_left.png`、`speech_tail_right.png`、`speech_tail_down.png`，透明 64×64；气泡主体由 Canvas 绘制，不烘焙文字。
- 特效：`fx/ledger_glint_00..05.png`、`fx/steam_00..07.png`、`fx/attention_00..05.png`，256×256、透明序列。

## 本地生成提示词

统一风格前缀：

> Original hand-painted Chinese animation game asset, warm Jianghu inn comedy, warm wood and rice-paper cream palette, jade green and cinnabar accents, readable silhouette, clean transparent edge, stylized mobile game art, no text, no logo, no celebrity likeness, no modern object, no dark fantasy, isolated asset on flat removable background.

- 佟湘玉交涉动作：`innkeeper woman in muted rose robe, one hand holding a small ledger and one hand making a calm welcoming gesture, composed but shrewd expression, three-quarter view, full body, feet visible`。
- 白展堂跑堂/警觉：`nimble young waiter in deep teal cloth outfit, tray held low for service`；警觉版替换为 `subtle guarded stance, listening toward the street, no weapon pose`。
- 传闻板：`old wooden inn rumor board with pinned blank paper slips, red thread, small jade tassel, readable empty center, front view`。
- 账本：`open traditional Chinese inn ledger with abacus, blank entry columns and one suspicious ink blot, top-down three-quarter view`。
- 茶桌：`round wooden tea table with cups and stools`；三种状态分别加入 `neatly served hot tea`、`overturned cup and uneasy guests implied only by props`。

## 验收

- 透明边缘无白边、阴影不超出安全留白。
- 角色和设施不包含文字；文字由 Canvas 本地化绘制。
- 场景背景保留底部至少 22% 的可走区域；关键设施不得烘焙主角。
- 小屏缩放后，互动设施在 `320px` 逻辑宽度下仍至少具有 44px 点击命中区。
- 导入前记录源文件、模型、提示词、日期和许可到 `D:\AI\TongfuInnAfter80\art-source\` 对应类别。
