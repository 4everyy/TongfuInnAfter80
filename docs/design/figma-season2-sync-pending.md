# Figma 第二季待同步清单

原 Figma 文件链接与节点链接尚未提供，因此本轮不新建替代文件。取得链接后，在现有微信小游戏设计文件中同步以下内容：

1. 探索画面：完整 `844` 宽场景、悬浮任务卡、单一主提示和轻量摇杆，不保留固定右栏。
2. 分店管理：总店／水巷分店标题、独立库存、口碑、客房与设施状态。
3. 运输状态：起点、终点、货物、预计到达日、天气延误、已到货。
4. 天气组件：晴天、雨天、早晨、中午、晚上。
5. 人物阶段：李大嘴的相遇、临时合作、信任、专属任务、正式加入。
6. 分包状态：`s2ch910`加载、失败重试与安全返回总店。

运行画面基准：

- `outputs/screenshots/season2-01-branch.png`
- `outputs/screenshots/season2-02-dock.png`
- `outputs/screenshots/season2-03-river-market.png`
- `outputs/screenshots/season2-04-rain-ferry.png`
- `outputs/screenshots/season2-05-management.png`

## 自由探索 v11 待同步

1. 江湖话本对话框：底部 38% 高度、角色头像、朱砂姓名签、宣纸正文和竹简选项。
2. 热点六状态：隐藏、发现、接近、可交互、锁定、完成；图标按对话、调查、战斗、经营和出口区分。
3. 探索操作：圆形铜木交互按钮，以及客栈、队伍两个小型木牌按钮。
4. 锁定出口：场景内显示门牌、锁图标和明确的解锁条件，不再静默阻挡。
5. 按钮反馈：按下位移 2 逻辑像素，90ms 压下，150ms 回弹；可操作区域不小于 44 逻辑像素。
6. 调试覆盖层仅用于工程检查，不登记为正式设计组件。

新版运行画面基准：

- `outputs/product-design/exploration-v11-audit/01-inn-hotspot.png`
- `outputs/product-design/exploration-v11-audit/02-locked-exit.png`
- `outputs/product-design/exploration-v11-audit/03-town-open.png`
- `outputs/product-design/exploration-v11-audit/04-storybook-dialogue.png`

## 探索 HUD v13 待同步

1. 悬浮任务卡：`196 × 108`，任务标题、两行目标和章节状态；无任务时缩为 `44 × 44` 告示印记。
2. 独立任务话本页：遮罩、宣纸书页、朱砂题签、目标正文和关闭按钮。
3. 四级字体：标题 `20/28`、区块 `16/22`、正文／按钮 `12/18`、辅助 `10/14`。
4. 资源 HUD：银锭、食材篮、朱砂印牌和算盘筹牌，图标显示尺寸 `18`，命中区 `44`。
5. 底部操作：仅保留 `48` 队伍按钮和 `60` 动态交互按钮。
6. 场景融合：人物脚底锚点、柜台前沿遮挡和低透明脚底阴影。

运行画面基准：

- `outputs/product-design/exploration-v13-audit/01-inn-hotspot.png`
- `outputs/product-design/exploration-v13-audit/04-storybook-dialogue.png`
- `outputs/product-design/exploration-v13-audit/05-collision-debug.png`
- `outputs/product-design/exploration-v13-audit/06-task-page.png`

## 战斗 UI v16 待同步

1. 半圆武学轮盘：`64` 普攻主印、三枚 `52` 技能印和一枚 `52` 防守印。
2. 技能状态：默认、按下、真气不足、当前行动呼吸和图片失败后备。
3. 技能说明签：招式名、效果类型、当前真气与消耗，仅在按压时出现。
4. 战果账册：左页评价与队伍状态，右页奖励槽、算盘轨道及归账印章。
5. 结算动效：暗场 `160ms`、展开 `360ms`、盖印 `180ms`、奖励计数 `480ms`。
6. 组件不得生成网页实现；最终规范仍映射到微信小游戏原生 Canvas。

运行画面基准：

- `outputs/product-design/battle-v16-audit/01-player-turn.png`
- `outputs/product-design/battle-v16-audit/01b-pressed-skill.png`
- `outputs/product-design/battle-v16-audit/02-insufficient-qi.png`
- `outputs/product-design/battle-v16-audit/04-skill-hit.png`
- `outputs/product-design/battle-v16-audit/05-victory-settlement.png`

## 战斗战术 v17 待同步

1. 目标选择态：多敌人时以朱砂选圈、敌方状态条和“点选”文字共同表达；提供 44 逻辑像素以上的撤销触控区。
2. 敌方预警签：敌人名称、招式名称、锁定对象和预计伤害；快速、重型及后续敌方招式共用同一信息结构。
3. 状态详情卡：队伍与敌方共用布局，展示体力、真气／攻击速度、护盾、眩晕、削弱、蓄势和护卫。
4. 战果账册扩展：章节战绩、同行默契、稀有掉落及其一次性领取状态。

运行画面基准：

- `outputs/product-design/battle-v17-audit/01-target-selection.png`
- `outputs/product-design/battle-v17-audit/02-enemy-warning.png`
- `outputs/product-design/battle-v17-audit/03-status-details.png`
- `outputs/product-design/battle-v17-audit/04-victory-links.png`
