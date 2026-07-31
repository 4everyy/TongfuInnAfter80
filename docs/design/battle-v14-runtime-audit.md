# 战斗 UI v14 运行审核

## 改造结果

- 角色状态由方形信息卡改为圆形头像徽章。
- 红色外环表达体力，青玉细环表达真气；当前行动角色使用低强度呼吸光环。
- 技能区改为五枚切角招式牌，使用攻击、治疗、护盾、控制和专注图标区分类型。
- 招式牌只保留招式名与真气消耗，触控高度统一为 `52` 逻辑像素。
- 敌人状态改为紧凑悬浮血条，当前敌方回合使用朱砂呼吸边框。
- 战斗日志改为短卷签，并在内容变化时执行 `240ms` 淡入位移动画。
- 真气不足会显示明确差额，不再静默无响应。

## 运行证据

- `outputs/product-design/battle-v14-audit/01-player-turn.png`
- `outputs/product-design/battle-v14-audit/02-insufficient-qi.png`
- `outputs/product-design/battle-v14-audit/03-enemy-turn.png`

## 验证

- 战斗 UI v14、UI 安全区、27 图探索和微信启动保护检查通过。
- 全部小游戏 JavaScript 语法检查通过。
- 微信开发者工具预览编译通过，总包约 `7.0 MB`。
- 模拟器启动诊断记录为 `first-frame-drawn`，时间为 `2026-07-30 15:20:29`。

## 技能与结算 v15

- 攻击、群体攻击、治疗、群体治疗、护盾、控制、削弱与专注均登记独立视觉事件。
- 敌人受击使用约 `170ms` 闪白与轮廓亮边。
- 伤害和治疗数值使用弹跳、上浮、淡出动画。
- 最后一击后保留战斗场景，进入“战斗告捷”结算层。
- 结算层包含落印、纸屑、奖励图标和“收下战果”确认。
- 奖励在胜利建立时只发放一次，确认返回不会重复领取。
- 新增运行证据：
  - `outputs/product-design/battle-v14-audit/04-skill-hit.png`
  - `outputs/product-design/battle-v14-audit/05-victory-settlement.png`
- 微信开发者工具再次编译通过，启动诊断于 `2026-07-30 15:38:37` 记录 `first-frame-drawn`。
