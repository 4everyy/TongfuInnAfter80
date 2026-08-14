# NPC 角色设定与专属彩头 v36

更新时间：2026-08-12
状态：规划（数据模块已落地，待接入运行层）
关联：`npc-population-v26.js`、`npc-identities-v31.js`、`npc-classic-art-v31.md`、`merchant-stalls-plan.md`、`jianghu-atmosphere-plan.md`

## 一、目标

为 `npc-population-v26` 的 36 名固定 NPC 增加两层内容，让"回头再见"的江湖人不再是脸谱：

- **角色设定**：为每名 NPC 补齐"性格 / 身世 / 招牌"三项展示文本，配合 `npc-classic-art-v31` 的原著画像，给对话头像旁的名帖与案卷提供可引用的人物底色。
- **专属彩头**：在结构化委托（quest / local / offer）之外，增加一层轻量惊喜奖励——日常随机、机缘触发、连环解锁三类，让固定 NPC 每次再见都"可能掏出一份小礼或一句要紧的话"。

核心体验：**江湖人讲交情，常来常往才有彩头**。玩家不必专门去做，但熟门熟路地走一遍老熟人，零星就会有所得。

## 二、设计原则

1. **零存档膨胀**：日常彩头是否"今日可得"由 `calendar.day` + `npc.id` 确定性派生，不写存档；领取后只写一个旗标 `boon-<id>-d<day>`。机缘/连环彩头一次性，用 `boon-<id>-claimed` 锁定。与 `jianghu-atmosphere-plan` 的"确定性派生、不写存档"原则一致。
2. **数据驱动**：角色设定与彩头全部集中在 `minigame/data/npc-signature-boon-v36.js`，缺省回退无彩头、无名帖，不影响既有玩法。
3. **复用既有奖励系统**：奖励对象沿用 `{ coin, ingredient, medicine, stock, tendency, trust, reputation, flag }`，由 `events.interact` / 对话 `action:'reward'` 统一发放，不新增系统、不新增交互类型。
4. **分层不抢戏**：彩头是对话里的一个额外选项（带 ✨ 标记），`priority` 低于主线热点，不覆盖 quest/local/offer 的原有流程。
5. **角色一致**：每名 NPC 的彩头奖励与其招牌、身世绑定——钱掌柜给净盐、诸葛孔方给借味油香、岳松涛给辨船心法，不出现"卖鱼的给兵器"这类错位。

## 三、彩头玩法机制

### 3.1 三层彩头

| 层级 | 触发方式 | 频次 | 典型奖励量级 |
|------|----------|------|--------------|
| **日常彩头 daily** | `dailyAvailable(npcId, day)` 为真（约 28% 的日子） | 每日重置，当日领过即锁 | 小（1–3 文 / 1 份食材药材 / 1 点倾向） |
| **机缘彩头 opportunity** | 满足 `condition`（队伍含某人 / 倾向达标 / 完成对应委托） | 一次性（`claimed` 旗标） | 中（4–6 文 / 2 份补给 / 1 点倾向） |
| **连环彩头 chain** | 完成 A 的主线委托后解锁 A 的连环彩头 | 一次性 | 中上（5–8 文 / 独家配方 / 1 点倾向） |

> 危险来客（第四组）多带机缘/连环门槛，体现"来路不正、出手却阔"——平日冷着脸，事办成了才肯露一手。

### 3.2 确定性与分布

日常彩头的可得性由 `stringHash('boon-<id>-d<day>')` 经 MurmurHash3 的 **fmix32 终结器**归一化到 `[0,1)` 后与 `DAILY_CHANCE = 0.28` 比较得到。djb2 类哈希雪崩性不足，直接取模会出现"某 NPC 永远可得 / 永远不可得"的聚簇；fmix32 终结器实测在 36 名 NPC × 224 日内，每名 NPC 均匀落在 **48–76 个可得日**，无异常值，整体 27.7%。

- 同一存档同一日结果固定（不靠 `Date.now()`），玩家不会"退出重进换奖"。
- 跨日自然变化，玩家每隔 3–4 天就有老熟人"今日有彩头"。

### 3.3 旗标与存档

| 旗标 | 含义 | 写入时机 |
|------|------|----------|
| `boon-<id>-d<day>` | 某日日常彩头已领 | 玩家点选"✨ …"并确认 |
| `boon-<id>-claimed` | 某机缘/连环彩头已领（一次性） | 同上 |

未领取的彩头**不产生任何存档字段**；旧存档无这些旗标时按"未领"处理，向后兼容。

### 3.4 前置条件 `condition`

机缘/连环彩头的 `condition` 支持以下字段（可组合）：

| 字段 | 判定 | 示例 |
|------|------|------|
| `party` | 队伍含任一指定 roleId | `{ party: ['baizhantang'] }` |
| `tendency` | 某 tendency ≥ 阈值 | `{ tendency: { rule: 3 } }` |
| `doneQuest` | 该 NPC 的 quest 委托已完成（`npcv26-<id>-done`） | `{ doneQuest: 'salt-merchant-xu' }` |
| `doneJob` | 该 NPC 的 local job 已完成 | `{ doneJob: 'opera-lady-su' }` |
| `doneOffer` | 该 NPC 的 offer 已完成 | `{ doneOffer: 'ferryman-wu' }` |
| `freeAction` | 当日尚有自由行动（未耗尽行动点） | `{ freeAction: true }` |

### 3.5 奖励类型

完全沿用既有 `reward` 结构：`coin`（银两）、`ingredient`（食材）、`medicine`（药材）、`stock`（细分类：staple/vegetable/meat/tea）、`tendency`（favor/rule/venture，影响案卷评分与结局）、`trust`（与已招募角色的好感，若彩头关联某角色）、`reputation`（口碑）、`flag`（一次性事件旗标）。

彩头**不引入**装备/新物品，避免冲击 `commerce` 与经济曲线（那是 `merchant-stalls-plan` 的职责）。

## 四、角色设定与彩头清单（6 组 36 名）

> 完整性格/身世/招牌文本与奖励数值见 `minigame/data/npc-signature-boon-v36.js`（`PROFILES` + `BOONS`）。下表只列原著名、招牌节选、所属地图与彩头层级，便于通览。

### 4.1 一组·市井经营（六人）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| noodle-vendor-ma | 小米 | street | 看人下菜，分得清谁舍得花钱 | 日常＋机缘(柳掌灯在队) |
| salt-merchant-xu | 钱掌柜 | river_market | 一撮验盐，入口知受潮 | 日常＋连环(苦盐案后) |
| debt-collector-xiao | 钱夫人 | guild_office | 辨封蜡，看副契比正文晚多久 | 机缘(讲规矩≥3) |
| spice-broker-rong | 赛貂蝉 | jiangnan_spice_workshop | 闻尾香，从灰里辨香料真伪 | 日常＋连环(调包案后) |
| seamstress-wen | 小翠 | locust_lane | 一缕辨布，线头说出哪家货栈 | 日常＋机缘(小翠在队) |
| coppersmith-han | 杨蕙兰 | yard | 开刃不收钱，见顺眼江湖人 | 日常＋机缘(白展堂在队) |

### 4.2 二组·捕快与调查（六人）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| grain-inspector-lin | 邢捕头 | grain_market | 标准斗不骗人，一斗验粮价 | 日常＋连环(校准砣归位后) |
| courier-aqi | 燕小六 | east_gate | 封蜡必存档，急札也要先收蜡印 | 日常＋机缘(失札找回后) |
| herbalist-qiu | 祝无双 | inn | 扎药青麻，配出救急车前叶 | 日常＋机缘(祝无双在队) |
| boat-tracker-qiao | 展红绫 | river_yard | 辨活扣，缆绳知船在何处停过 | 日常＋机缘(反系拖缆查清后) |
| porter-alu | 追风 | jiangnan_dock | 敲箱听底，一敲知箱底受潮 | 日常＋机缘(追风在队) |
| bridge-mason-zhao | 凌腾云 | stone_bridge | 同批石楔，加固整段重车道 | 日常＋连环(石桥加固后) |

### 4.3 三组·师长与艺人（六人）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| storyteller-shen | 朱先生 | tea_shed | 下半卷要茶钱，一碗茶听完旧案 | 日常＋机缘(尚有自由行动) |
| ticket-clerk-fang | 窦先生 | money_house | 木筹复原，三枚排出底账 | 日常＋连环(木筹复原后) |
| caravan-matriarch-shao | 断指轩辕 | merchant_alliance_hall | 旧赈灾路，说清沿途客栈来路 | 机缘(开拓≥2) |
| cook-helper-pang | 诸葛孔方 | old_banquet_kitchen | 辨火色，一勺黑垢看出封灶旧菜 | 日常＋连环(黑垢验过后) |
| woodcutter-yun | 清风 | yard | 堆柴省柴，一套堆法少烧两成 | 日常＋机缘(清风在队) |
| opera-lady-su | 扈十娘 | street | 唱一折热闹的，修好戏箱就唱 | 日常＋机缘(戏箱修好后) |

### 4.4 四组·危险来客（六人·隐秘而值钱）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| refugee-father-gu | 姬无命 | tea_shed | 家传偏方，木牌背后藏治惊风方 | 机缘(木牌找回后) |
| runaway-apprentice-tang | 姬无病 | paper_alley | 画暗门，修好搭扣画后巷暗门 | 机缘(搭扣修好后) |
| physician-ning | 上官云顿 | charity_granary | 毒针对症，温和外表下藏辨毒 | 日常＋连环(茶水样查清后) |
| tea-picker-qing | 平谷一点红 | jiangnan_branch | 辨茶底，残茶排除水源锁真凶 | 日常＋机缘(茶汤对照后) |
| fortune-reader-yan | 公孙乌龙 | locust_lane | 排签辨伪，三支旧签知假告示 | 机缘(签序排清后) |
| locksmith-qi | 谢步东 | old_ledger_vault | 无损开柜，一齿锁芯开陈年账柜 | 日常＋连环(锁齿归位后) |

### 4.5 五组·家族与权威（六人）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| retired-guard-cao | 佟伯达 | east_gate | 看手腕，倒印者右手腕有旧伤 | 机缘(请教过后) |
| paper-apprentice-mo | 佟石头 | paper_mill | 辨浆桶，三只浆桶标出污染 | 日常＋连环(蓝麻查清后) |
| night-watchman-lai | 白三娘 | old_post | 辨脚印走向，灰上脚印向内不外 | 机缘(脚印辨清后) |
| warehouse-foreman-dou | 郭巨侠 | guild_warehouse | 扣紧货钩，一寸不松不掉包 | 日常＋机缘(货钩固定后) |
| cartwright-lu | 郭蔷薇 | north_road | 同制轴销，一根修复断轮车 | 日常＋连环(轴销取回后) |
| scribe-pei | 慕容嫣 | guild_office | 辨副册夹层，一页纤维锁缺页 | 日常＋连环(副册查清后) |

### 4.6 六组·特殊客人（六人）
| 玩法 ID | 原著名 | 地图 | 招牌节选 | 彩头层级 |
|---------|--------|------|----------|----------|
| scale-mender-ge | 杜子俊 | scale_contract_lane | 旧制秤砣，一砣撬开秤契争议 | 连环(旧秤砣取回后) |
| fisherman-jiang | 金镶玉 | river_market | 网中辨牌，带印木牌知黑船 | 日常＋机缘(木牌解出后) |
| map-seller-ye | 包大仁 | street | 勘正路线，路牌刀痕证商队被引偏 | 连环(路牌刀痕对上后) |
| boatwoman-he | 柳星云 | jiangnan_dock | 辨系船结，被换活扣知哪条船 | 日常＋连环(船结查清后) |
| umbrella-maker-luo | 柳月云 | rain_ferry | 辨油布切口，旧油布知真假货印 | 日常＋连环(油布取回后) |
| ferryman-wu | 岳松涛 | rain_ferry | 辨吃水线，雨里载重藏不住 | 机缘(记下辨船法后)＋日常 |

> 统计：63 条彩头（日常 27 / 机缘 21 / 连环 15）。36 名 NPC 人人有设定、人人至少一条彩头；日常彩头覆盖 27 名，机缘/连环覆盖全部 36 名。
## 五、数据结构

`minigame/data/npc-signature-boon-v36.js` 导出：

```js
// 彩头定义
boon(id, tier, opts)
//   tier ∈ 'daily' | 'opportunity' | 'chain'
//   opts = { condition?, reward, label, toast }

// 角色设定
profile(name, group, personality, background, signature)

// 工具
dailyAvailable(npcId, day)   // boolean —— 日常彩头今日是否可得（fmix32 派生）
dailyFlag(npcId, day)         // 'boon-<id>-d<day>' —— 日常彩头领取旗标
claimFlag(npcId)              // 'boon-<id>-claimed' —— 一次性彩头领取旗标
forNpc(npcId)                 // 该 NPC 的全部彩头（日常 + 一次性）
profileOf(npcId)              // 该 NPC 的角色设定（缺省 null）
```

- `BOONS`：63 条彩头数组。
- `PROFILES`：36 名 NPC 的角色设定映射。
- `DAILY_CHANCE = 0.28`：日常彩头可得概率。

## 六、接入点（已实现）

数据模块与运行层均已接入。关键决策：对话选项与热点门禁是**静态**的（`requires`/`unless` 只能是
旗标数组，无法表达"今日是否可得"这类依赖 `calendar.day` 的确定性派生），因此彩头选项在
`dialogue.open` 打开"回头再见"对话时按当前 `state` **实时解析注入**——零静态数据膨胀、零存档膨胀。

| 位置 | 改动 | 状态 |
|------|------|------|
| `data/npc-signature-boon-v36.js` | 新增 `resolve(state, npcId)` / `hasClaimable(state, npcId)`：集中"此刻可领彩头"解析（读 `calendar.day` / `flags` / `party` / `tendencies` / `actionsUsed`，全部带缺省回退，旧档安全）；`claimFlag` 改为按 `id+tier` 唯一；新增 `BOONS_BY_NPC` 索引，渲染层每帧查询 O(1) | ✅ |
| `src/dialogue/dialogue.js` | `open()` 末尾调 `injectBoonChoices`，把 `resolve()` 返回的 `✨` 选项插在"回头再见"关闭项之前；`choose()` 复用既有 `choice.flag`+`choice.reward` 管线（`action:'boon'` 只补一行 toast）；`applyReward` 扩展 `stock/tendency/trust/reputation` 子项（沿用 `inn.changeStock` / `campaign.tendencies` / `relationships.trust` 先例） | ✅ |
| `src/render/views/explore.js` | `npcHintType` 增加 `'boon'`：NPC 主线完成且有可领彩头时返回 `'boon'`（不覆盖 task/merchant）；`drawNpcHint` 新增金色四角星标（呼吸、仅靠近显示，复用既有 `hintType` 图标层） | ✅ |

接入原则：彩头是 NPC 既有委托流程的**附加项**，不替换、不阻塞 quest/local/offer。玩家未完成主线
或未满足彩头条件时，`resolve` 返回空、`hasClaimable` 返回 `false`，对话与头顶标记与接入前**完全一致**
（已由 `validate_exploration_v11` / `validate_world_v4` / `validate_core_loop_v28` 等回归确认）。

> 名帖内嵌"性格 / 招牌"文字（设计书初版列入）暂缓：会挤占已调校的名帖尺寸；角色经典名已作为对话
> 说话人名展示，`profileOf` 已导出供后续"角色详情面板"复用。

## 七、验收清单

- [x] `node -c npc-signature-boon-v36.js` 语法通过。
- [x] 36 名 NPC（与 `npc-identities-v31` 的 `classic` 一致）人人有 `profile` 且至少一条 `boon`。
- [x] `dailyAvailable` 在 36 NPC × 224 日内分布均匀：整体 27.7%，单 NPC 48–76 个可得日，无"永远可得/永不可得"。
- [x] 旗标命名 `boon-<id>-d<day>` / `boon-<id>-<tier>-claimed` 不与既有 `npcv26-*` 旗标冲突；`claimFlag` 按 `id+tier` 唯一，避免同 NPC 机缘+连环冲突。
- [x] 奖励对象结构与 `events.interact` / `dialogue.applyReward` 既有 `reward` 同构，无新字段类型。
- [x] 接入运行层后：`tools/validate_exploration_v11.js` 通过（27 图 / 132 对话 / 无热点出口 NPC 重叠）。
- [x] 接入后：`tools/validate_boon_v36.js` 通过——13 组端到端测试覆盖注入 / 按日锁定 / 永久锁定 / 条件门禁（party·tendency）/ 奖励子类型（coin·ingredient·stock·tendency·reputation）/ 渲染标记 / 数据完整性。
- [ ] 微信开发者工具实走：抽验 6 名（每组一名）的日常/机缘/连环三类彩头触发与文案。（仅剩此项，需真机）

## 八、文件与下一步

| 文件 | 说明 |
|------|------|
| `minigame/data/npc-signature-boon-v36.js`（**新增**） | 36 名角色设定 + 63 条彩头 + 确定性派生工具 + 运行期解析（`resolve`/`hasClaimable`） |
| `minigame/src/dialogue/dialogue.js`（**改**） | `open` 注入彩头选项；`choose` 复用 flag/reward 管线（`action:'boon'`）；`applyReward` 扩展 `stock/tendency/trust/reputation` |
| `minigame/src/render/views/explore.js`（**改**） | `npcHintType` 增 `'boon'`；`drawNpcHint` 增金色四角星标（✨） |
| `tools/validate_boon_v36.js`（**新增**） | 13 组端到端校验：注入 / 锁定 / 门禁 / 奖励子类型 / 渲染标记 / 数据完整性 |
| `docs/design/npc-signature-boon-v36.md`（**新增**） | 本设计书 |

**下一步：**

1. ~~按"六、接入点"三处最小接入~~ ✅ 已完成（运行期注入方案，详见 §六）。
2. 微信开发者工具真机抽验 6 名 NPC（每组一名）的日常/机缘/连环三类彩头触发与文案（验收清单唯一待办，需真机）。
3. 视效果决定是否为危险来客组增加"连环彩头链"（A 的彩头解锁 B 的彩头），进一步强化"江湖人际网"。
4. 与 `merchant-stalls-plan` 协同：商铺型 NPC（小米/钱掌柜等）若后续接入店铺，其日常彩头可与 `dailyLimit` 补货对齐，避免同日既得彩头又刷货。
5. 可选：为独立"角色详情面板"接入 `profileOf` 的性格/招牌文字（当前已用 ✨ 标记 + 对话说话人名表达身份）。

