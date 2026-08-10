# 固定商铺 NPC 增丰富方案

更新时间：2026-08-10
状态：规划（待评审）
关联：`npc-population-v26.js`、`scene-population.js`、`commerce.js`、`jianghu-atmosphere-plan.md`

## 一、目标

在不破坏既有任务 NPC、氛围 NPC、存档与分包预算的前提下，为 27 张地图引入一批**常驻商铺型 NPC**（固定地标、可反复交易、地域特色鲜明），让江湖真正"有铺可进、有货可买、有人可聊"：

- 每张主城/市井地图至少 1-2 家特色固定商铺。
- 商铺卖的东西各不相同：兵器、药材、菜蔬、古玩、布匹、水产、书墨、茶点……
- 复用现有 `commerce.js` 的 `shop` 机制（对话选项 → 商店面板），零新系统。
- 固定坐标，不用 `safePoint` 随机——这是"地标"。
- 与既有剧情 NPC / 氛围 NPC 不冲突、不重叠。

## 二、设计原则

1. **复用机制**：走 `person()` 的 `shop`/`shopLabel` + `withShop()`，不新增交互类型。
2. **固定坐标**：直接给 `x/y`，并在 `safePoint` 验证后微调，避免与热点/出口/其他 NPC 重叠（间距 ≥ 70px）。
3. **数据驱动**：所有商铺写在一个新文件 `merchant-stalls.js`（或并入 `commerce.js`），缺省回退无商铺。
4. **常驻可重复**：不走 `done` flag 锁死，对话永远可用；商店每日补货（复用 `dailyLimit`）。
5. **地域合理**：兵器铺不出现在水里，鱼贩不出现在账库；卖什么由地图身份决定。
6. **分层不抢戏**：商铺 NPC 的 `priority` 低于主线（26-28），但高于氛围 NPC（26）同级，使用 `merchant: true` 标记区分。
7. **经济平衡**：新增物品分档（廉价日用 → 中档 → 高档），价格与既有经济曲线对齐，`dailyLimit` 防刷。

## 三、商铺类型与地域分布

### 3.1 新增商铺类型矩阵

| 类型 | 典型地图 | 售卖品类 | 代表 NPC |
|------|----------|----------|----------|
| 兵器/铁匠 | yard、north_road | 武器、护甲 | 韩铜匠（已有）、新增"鲁铁锤" |
| 药材/药铺 | inn、charity_granary | 药品、补品 | 新增"孙药篓" |
| 菜蔬/果贩 | grain_market、street | 食材（蔬菜/水果） | 新增"陶菜婆" |
| 粮油 | grain_market | 主食、油 | 新增"米七斗" |
| 古玩/旧货 | locust_lane、old_post | 古玩、旧物、情报 | 新增"金淘古" |
| 布匹/裁缝 | locust_lane、street | 布料、成衣 | 温裁缝（已有）、新增"施叠布" |
| 杂货 | street、east_gate | 日用 | 马嫂（已有）、新增"陈杂货行" |
| 水产/河鲜 | river_market、jiangnan_dock | 鱼虾、河鲜 | 新增"江网子"（注：与剧情 NPC 同名区分） |
| 书墨/字画 | paper_alley、guild_office | 书籍、文房 | 新增"墨半卷" |
| 茶点 | tea_shed、inn | 茶饮、点心 | 新增"郝茶釜" |
| 首饰/玉器 | money_house、merchant_alliance_hall | 首饰、玉器 | 温裁缝（已有）、新增"玉鸣轩" |
| 工坊特产 | paper_mill、jiangnan_spice_workshop、old_banquet_kitchen | 纸品/香料/酱料 | 新增"香娘子"、"纸未张" |

### 3.2 27 张地图商铺落点（每图 1-2 家，共约 28 家）

| 地图 | 商铺 | 卖点 | 固定坐标（待 safePoint 校验微调） |
|------|------|------|-------------------|
| inn | 邱记药摊（herbalist-qiu，已有） | 药材 | 复用 |
| inn | 郝茶釜（hao-tea-kettle） | 茶饮/点心 | (380, 300) |
| yard | 鲁铁锤（lu-ironhammer） | 兵器修理/低档武器 | (520, 300) |
| street | 陶菜婆（tao-veggie） | 菜蔬/水果 | (820, 310) |
| street | 金淘古（jin-antique） | 古玩/旧货/情报 | (300, 305) |
| locust_lane | 施叠布（shi-cloth） | 布匹/成衣 | (600, 305) |
| locust_lane | 墨半卷（mo-halfscroll） | 书墨/字画 | (380, 300) |
| tea_shed | 郝茶釜分摊（hao-tea-kettle-2） | 茶饮/茶点 | (550, 300) |
| east_gate | 陈杂货（chen-goods） | 行路杂货 | (680, 305) |
| stone_bridge | 桥头旧摊（qiao-oldstall） | 旧物/零碎 | (380, 305) |
| paper_mill | 纸未张（zhi-weizhang） | 纸品/文房 | (480, 310) |
| paper_alley | 墨半卷分铺（mo-halfscroll-2） | 旧书/字画 | (700, 305) |
| old_post | 金淘古分摊（jin-antique-2） | 旧货/古玩 | (400, 305) |
| north_road | 鲁铁锤分摊（lu-ironhammer-2） | 路边兵器/护具 | (700, 305) |
| guild_warehouse | 库边杂卖（ku-sundries） | 仓储余货 | (650, 305) |
| river_yard | 江网子鲜鱼（jiang-freshfish） | 河鲜/水产 | (560, 305) |
| grain_market | 米七斗（mi-seventhdou） | 粮油/主食 | (300, 310) |
| grain_market | 陶菜婆分摊（tao-veggie-2） | 菜蔬 | (820, 310) |
| guild_office | 墨半卷账具（mo-halfscroll-3） | 文房/账册 | (560, 295) |
| charity_granary | 孙药篓义诊摊（sun-herbbasket） | 平价药材 | (360, 305) |
| canal_checkpoint | 关口小贩（guan-peddler） | 行路零嘴 | (900, 305) |
| money_house | 玉鸣轩（yu-mingxuan） | 首饰/玉器 | (300, 295) |
| scale_contract_lane | 校秤杂具（jiao-scaleware） | 秤具/度量 | (380, 305) |
| merchant_alliance_hall | 同盟百货行（tong-bazaar） | 高档杂货 | (500, 295) |
| old_ledger_vault | 旧库淘宝人（jiu-treasure） | 旧账/古物 | (600, 305) |
| jiangnan_branch | 江南茶点（jiangnan-teasnack） | 茶点/分店特产 | (480, 305) |
| jiangnan_dock | 香娘子（xiang-spicelady） | 香料/南货 | (360, 305) |
| river_market | 江网子河鲜（jiang-freshfish-2） | 河鲜 | (600, 305) |
| rain_ferry | 渡口雨具摊（du-rainware） | 伞/雨具/热饮 | (360, 305) |
| jiangnan_spice_workshop | 香娘子作坊（xiang-spicelady-2） | 香料/酱料 | (600, 305) |
| old_banquet_kitchen | 旧灶酱料（jiu-sauce） | 旧方酱料/干货 | (620, 305) |

> 同一 NPC 在多图出现的"分摊"用 id 后缀区分，对话/头像复用主 NPC。

## 四、数据模型（零新机制，纯扩展）

### 4.1 在 `commerce.js` 扩展 SHOPS

```js
'tao-veggie-stall': {
  id: 'tao-veggie-stall', npcId: 'tao-veggie', name: '陶菜婆菜摊', type: 'food', icon: 'basket',
  greeting: '今早的露水菜，水灵着呢。掌柜的看看？',
  items: ['fresh-veggie', 'seasonal-fruit', 'pickled-jar']
},
'jin-antique-stall': {
  id: 'jin-antique-stall', npcId: 'jin-antique', name: '金淘古旧货', type: 'antique', icon: 'scroll',
  greeting: '这物件来历不小，掌柜识货便收去。',
  items: ['old-token', 'jade-shard', 'mystery-box']
}
// ……（共约 28 家）
```

### 4.2 在 `commerce.js` 扩展 ITEMS

按品类分批补：

- **菜蔬/食材**（fresh-veggie / seasonal-fruit / pickled-jar / river-fish / river-shrimp / dry-rice / oil-jar）
- **药材**（herbal-packet 已有；新增 cold-cure / wound-powder / qi-tonic）
- **古玩/旧物**（old-token / jade-shard / mystery-box / old-map / ancient-coin）
- **文房/书墨**（ink-stick / paper-bundle / account-book / calligraphy-scroll）
- **布匹/成衣**（linen-roll / silk-ribbon / cotton-coat）
- **茶点**（tea-brick 已有；新增 snack-plate / pastry-box）
- **工坊特产**（spice-giftbox / hand-paper / sauce-jar）
- **雨具/杂货**（bamboo-umbrella / warm-bottle / road-lantern）
- **首饰/玉器**（peace-knot / jade-hairpin 已有；新增 silver-ring / jade-pendant）
- **兵器/护具**（elm-ruler 等已有；新增 iron-guard / leather-bracer）

每件物品遵循现有结构：`{ id, name, kind, icon, price, description, effects/bonuses, dailyLimit, chapter }`。

### 4.3 新增 `merchant-stalls.js`（或在 `npc-population-v26.js` 追加）

为避免污染任务 NPC 的 `ROSTER`，新建独立文件：

```js
var STALLS = [
  stall('tao-veggie', '陶菜婆', 'street', 820, 310, 'right',
    '今早从城外进的露水菜，水灵着呢。', 'tao-veggie-stall', '看看菜蔬'),
  stall('jin-antique', '金淘古', 'street', 300, 305, 'left',
    '别小看旧货，里头有几件连会馆的人都眼馋。', 'jin-antique-stall', '看看旧货'),
  // ……
];

function stall(id, name, mapId, x, y, facing, greeting, shopId, shopLabel) {
  return { id: id, name: name, mapId: mapId, x: x, y: y, facing: facing,
    greeting: greeting, shop: shopId, shopLabel: shopLabel, mode: 'merchant' };
}
```

`apply(maps, dialogues)` 注入：
- `map.npcs.push` 一个固定坐标 NPC（`merchant: true`）
- `map.hotspots.push` 一个 dialogue 热点，对话选项含 `withShop` 注入的"看看货物"
- 对话内容 = `greeting` + `[{看货}, {闲聊一句}, {告辞}]`

## 五、对话设计（轻量，免剧情负担）

每家商铺固定 1 句开场白 + 3 选项：

```
[开场白]（如："今早的露水菜，水灵着呢。"）
  → [看看货物]（进 shop）
  → [打听点事]（1 句地域八卦，纯文本，不奖励）
  → [告辞]
```

"打听点事"给江湖生活感，例如：
- 菜贩："听说粮市这两天有人压价，菜价怕也要跟着乱。"
- 古玩贩："这枚旧钱别看锈了，当年可是漕运的路引。"
- 铁匠："镇店铁尺早卖光了，下一炉还得等三日。"

## 六、接入点与改动清单

| 文件 | 改动 |
|------|------|
| `minigame/data/merchant-stalls.js`（**新增**） | 约 28 家商铺 NPC 定义 + `apply/applyArt` |
| `minigame/data/commerce.js` | ITEMS 增加 ~30 件，SHOPS 增加 ~28 家 |
| `minigame/data/content.js` 或入口装配处 | 注册 `merchant-stalls.apply(maps, dialogues)` |
| `minigame/assets/art/manifest.js` | 各图 `npcArts` 补充新 NPC 的精灵引用（可复用 ambient 角色） |
| `minigame/src/render/views/explore.js` | 已有 `drawNpc` 渲染；商铺 NPC `hintType: 'merchant'` 已支持铜钱图标 |
| `tools/validate_commerce_v30.js` | 增加"商铺 NPC 必须有对应 shopId"的校验 |

## 七、性能与分包

- **精灵**：商铺 NPC 尽量复用既有 ambient 精灵（`merchant`/`townswoman_young`/`townsman_old`），避免新图集；确需新增的归到 `@npc-pop-v26` 子包。
- **热点数**：每图新增 1-2 个 dialogue 热点，不影响现有 `discoverRadius` 预算。
- **数据量**：`commerce.js` 预计 +120 行，`merchant-stalls.js` ~150 行，可控。

## 八、分批实施

| 批次 | 范围 | 说明 |
|------|------|------|
| **M1** | 优先市井核心图（street / grain_market / river_market / locust_lane / tea_shed），约 10 家 | 人流密集图先落地，立刻提升"进城感" |
| **M2** | 工坊与水边（paper_mill / paper_alley / jiangnan_dock / jiangnan_spice_workshop / old_banquet_kitchen / river_yard / rain_ferry），约 9 家 | 强化地域特产 |
| **M3** | 关口/仓储/账务（east_gate / canal_checkpoint / guild_warehouse / guild_office / money_house / scale_contract_lane / merchant_alliance_hall / old_ledger_vault / charity_granary / old_post / north_road / jiangnan_branch / inn / yard / stone_bridge），补齐剩余约 14 家 | 全图铺满 |
| **M4** | 校验 + 平衡性回归 | `validate_commerce_v30`、经济数值复查 |

## 九、风险与回退

| 风险 | 应对 |
|------|------|
| 固定坐标与剧情 NPC/出口重叠 | `safePoint` 二次校验 + validator 兜底 |
| 新增物品破坏经济 | 全部带 `dailyLimit`，价格分档对齐既有曲线 |
| 精灵不够 | 优先复用 ambient 精灵，避免新分包 |
| 对话膨胀 | 每家固定 1 句开场 + 1 句八卦，不写长文本 |

## 十、验收清单

- [ ] `node -c commerce.js / merchant-stalls.js` 通过
- [ ] `tools/validate_commerce_v30.js` 通过（含新增"商铺-shopId 一致性"检查）
- [ ] `tools/validate_exploration_v11.js` 通过（无热点/出口/NPC 重叠）
- [ ] 每张目标地图进入后能看到 ≥1 家商铺 NPC，对话可进店、可购买、每日补货生效
- [ ] 商铺 NPC 不遮挡主线热点、不阻塞移动（`blocksMovement: false`）

## 十一、下一步

1. 评审本方案，确认 M1 范围与商铺清单。
2. 评审通过后，按 M1→M2→M3 顺序实现：
   - 先扩 `commerce.js`（ITEMS + SHOPS）
   - 再写 `merchant-stalls.js`（NPC + 热点 + 对话）
   - 最后接入装配 + 跑校验
3. 美术按需补精灵（尽量复用）。