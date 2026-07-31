# 《灯下江湖》v10 开发进度

更新时间：2026-07-28

## 当前版本

- 技术路线：微信小游戏原生 Canvas、CommonJS、微信本地存储和原生分包。
- 佟湘玉固定为自由探索主角；新游戏从佟湘玉单人开始。
- 已接入 27 张正式地图、八向移动、二维碰撞、队伍跟随、对话、回合制战斗、客栈经营与本地存档。
- 第一季第 1-8 章已形成完整闭环。
- 第二季第 9-11 章已接入，共 21 个游戏日。
- 开发界面显示经典昵称；存档、资源和任务条件继续使用原创角色 ID。

## 单入口首页

- 首页只保留一个 60 逻辑像素高的“开始游戏”入口。
- 已移除公开的“客栈经营”和“开发档案”入口。
- `startAdventure` 创建佟湘玉单人新档并直接进入客栈自由探索。
- 有效旧存档继续自动恢复；旧章渲染和迁移代码仍保留。

## 第二季第 11 章

章节：《失味的宴席》

- 已完成七日内容：集中退菜、辨料、河市追查、旧封记、香料作坊、烧损菜谱、试菜复宴。
- 新增江南香料作坊、百味旧灶院两张分层 2.5D 地图。
- 新增三个可操作烹饪试炼：辨料、调味、控火。
- 试炼结果写入 `recipeResearch`，不提升存档版本；失误影响增益，但不会造成剧情死档。
- 李大嘴严格经过第 9 章相遇、第 10 章合作、第 11 章信任与专属任务后才可正式加入。
- 章末选择分别影响人情、规矩、开拓倾向。
- 完成后解锁菜谱“醒香三鲜羹”，下一章节进入第 12 章《河市浮价》。

## 美术与资源

- Creative Production 面板：`3c8d45a9-cc54-4953-b929-c20701dab745`，当前 revision 63。
- 已登记第 11 章香料作坊、旧灶院、剧情道具和李大嘴剧情动作。
- 正式源图位于 `D:\AI\design-assets\dengxia\season2-ch11\sources`。
- 游戏运行资源位于 `minigame/subpackages/s2ch11/assets/art`。
- 场景使用压缩 JPEG；剧情道具和角色动作使用真实 Alpha PNG。
- 李大嘴剧情动作已接入烹饪试炼面板，道具比例已通过 `844 x 390` 合成预览校准。

## 设计同步

- Product Design 审核：`docs/design/season2-ch11-runtime-audit.md`。
- 第 9、10 章 Canva 原稿保持不变。
- 第 11 章 Canva 副本：`DAHQpgTRG08`，已于 2026-07-28 确认并提交保存。
- Figma 仍等待原文件链接，不创建替代文件。

## 自动检查

```powershell
node tools/validate_world_v4.js
node tools/validate_season2_ch11.js
node tools/validate_season2_ch910.js
node tools/validate_branches_v10.js
node tools/validate_campaign_v9.js
node tools/validate_exploration_v8.js
node tools/test_asset_store.js
node tools/smoke_wechat_boot.js
node tools/validate_management_v5.js
node tools/validate_ui_v6.js
Get-ChildItem minigame -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

当前结果：

- 27 张地图的出口、出生点、碰撞、热点和资源路径通过。
- 第 11 章七日流程、三段试炼和李大嘴招募门槛通过。
- 分店隔离、跨店运输、天气延误和旧存档迁移通过。
- 首页只有一个可点击入口，旧入口文案不存在。
- 42 个小游戏 JavaScript 文件语法通过。
- 主包与每个章节分包均低于内部 `3.8 MB` 控制目标。

## 仍需 GUI 验收

1. 在微信开发者工具实走两张第 11 章地图，检查湿地高光、脚底阴影和动态遮挡。
2. 触摸完成辨料、调味、控火三段试炼，验证点击反馈与误触保护。
3. 验证护证战斗、正式招募、退出重进和第 12 章恢复点。
4. 在 `844 x 390`、16:9 和超宽横屏各检查一轮画面。

## 下一恢复点

第二季第 12 章《河市浮价》：

- 江南分店价格波动与水路供货事件。
- 李大嘴加入后的首段成长剧情。
- 分店菜单与运输成本联动。
- 继续保持佟湘玉为固定探索主角。

## 存储规则

- 生成源图、提示词、中间稿和缓存只进入 `D:\AI`。
- `D:\TongfuInnAfter80` 只保留源码、优化运行资源和必要评审输出。
- 不在 C 盘安装、下载或保留本项目生成素材。

## 2026-07-28 自由探索 v11 收尾

- 新档立即开放客栈、后院和十字街；完成开场后开放告示巷、茶棚和东关，接取《迟到的驿信》后开放镇外石桥。
- 新增 `visitedMaps` 与 `unlockedMaps`，旧存档会根据当前位置、章节与任务旗标补全，不重置经营和人物进度。
- 客栈增加第 2 章正常接案与返店热点；锁定出口会显示门牌、锁图标及解锁原因。
- 移动改为最多 6 逻辑像素一步的连续碰撞检测，使用脚底椭圆、障碍边缘检测和横纵轴滑动。
- 背景内已烘焙的柜台、楼梯和货物根据障碍底边参与纵深排序；已有透明前景继续优先使用。
- 热点采用统一状态和优先级，场景同时最多显示三个提示，操作距离外不再显示大段文案。
- 对话升级为江湖话本面板，支持约 24 汉字/秒逐字显示、点击补全、竹简选项和 44 逻辑像素触控区。
- 运行预览位于 `outputs/product-design/exploration-v11-audit`，Product Design 审核记录位于 `docs/design/exploration-v11-runtime-audit.md`。
- Creative Production 面板 `3c8d45a9-cc54-4953-b929-c20701dab745` 已登记新版热点、锁路、城镇开放和话本对话运行画面。
- Canva 设计 `DAHQQYHR9-g` 本轮连接器连续两次网络失败，未产生草稿、未提交修改；恢复后补充地图开放阶段、热点状态和交互流程。
- Figma 仍等待原设计文件链接；待同步内容已追加到 `docs/design/figma-season2-sync-pending.md`。

### 本轮自动检查

- 27 张地图、34 段对话、公共地图渐进开放、热点可达性和连续碰撞通过。
- 第 1-11 章、四季 32 章注册、分店隔离、运输、天气、经营日结和存档迁移通过。
- 分包失败重试、启动异常页和全部小游戏 JavaScript 语法通过。
- 微信开发者工具已检测到所有修改并自动编译，日志没有新增业务编译错误；仍需在 GUI 中实走并保存触控截图。

### 下一恢复点

1. 在微信开发者工具实走客栈、后院、十字街、告示巷、茶棚、东关和石桥，重点检查动态遮挡及狭窄通道。
2. 用真实触摸完成第 2 章接案、调查、战斗和返店，确认热点提示与逐字对话节奏。
3. Canva 网络恢复后更新并预览 `DAHQQYHR9-g`，取得明确保存许可后提交。
4. 收到原 Figma 文件链接后同步探索 v11 组件，不创建替代文件。

## 2026-07-29 模拟器黑屏修复

- 开发者工具日志确认 `game.js` 和 `src/app.js` 编译成功，没有游戏业务异常。
- 黑屏时编译缓存仍更新，但游戏启动诊断没有写入，说明旧模拟器实例未执行最新入口。
- 已备份开发者工具设置到 `D:\AI\backups\wechatdevtools`。
- 已关闭开发者工具 GPU 加速与自动远程调试，并清理当前项目专属的 D 盘编译缓存。
- 通过开发者工具 HTTP 服务重新打开 `D:\TongfuInnAfter80\minigame`，返回状态 `200`。
- 启动记录已写入 `dengxia-boot-diagnostic-v1`，当前阶段为 `first-frame-drawn`，证明本地入口与首帧渲染均已恢复。
- 启动层新增 `wx.onError`、`wx.onUnhandledRejection`、`wx.onShow` 和 `wx.onWindowResize` 保护；恢复显示或尺寸变化时会主动重绘。
- 全部小游戏 JavaScript 语法、27 图、探索 v11、资源失败重试和启动异常页检查通过。

## 2026-07-28 黑屏修复记录

- 微信开发者工具实际导入目录确认为 `D:\TongfuInnAfter80\minigame`。
- 黑屏现场伴随“模拟器长时间没有响应”；完全退出并重启 D 盘开发者工具后，最小 Canvas 启动画面和完整游戏画面均恢复。
- 启动入口现在只创建一块屏幕 Canvas，并将同一画布传给游戏和异常页，避免初始化失败时把诊断信息绘制到离屏 Canvas。
- 启动后立即显示“正在准备客栈”首帧；初始化异常时显示可见错误阶段、错误摘要和清除异常存档入口。
- 新增“主画布创建后初始化失败”的回归检查，要求异常页复用同一块屏幕 Canvas。
- 真实运行截图：`outputs/wechat-title-fixed.png`。
- 若后续再次出现“模拟器长时间没有响应”，先完整重启开发者工具实例，再判断为业务代码故障；不要仅反复点击编译。

## 2026-07-29 经营账簿紧凑化

- 经营场景可视宽度由 `500` 增至 `620` 逻辑像素，右侧常驻区域由 `344` 缩至 `224`。
- 默认账簿只显示今日目标、行动与收益摘要、四项筹备行动和已选菜单。
- 原七个常驻纵向页签改为按需打开的两列账簿目录，排班、菜单、客房、装修、人物和证据不再持续占用场景。
- 详细账页以临时抽屉从右侧展开；打开时自动收起场景底栏，避免操作按钮被抽屉裁成半截。
- 中午营业仍自动进入订单详情，原经营数据、存档字段和业务流程保持不变。
- 运行预览：
  - `outputs/screenshots/season2-05-management.png`
  - `outputs/screenshots/season2-06-management-book.png`
  - `outputs/screenshots/season2-07-management-detail.png`
- 经营日结、UI 触控与胶囊避让、分店隔离、第二季第 11 章、探索 v11、启动保护及全部小游戏 JavaScript 语法检查通过。
- 已通过开发者工具服务端口刷新 `D:\TongfuInnAfter80\minigame`，返回状态 `200`。

## 2026-07-29 全场景经营 UI v12

- 经营主页删除右侧常驻面板、抽屉、纵向页签和底部账簿入口，客栈场景恢复为完整 `844 × 390` 主体验。
- 新增七个直接物件入口：柜台、后厨、客房、告示、大堂、后院和门面；点击场景人物进入岗位、剧情与队伍操作。
- 复杂功能使用独立全屏主题页，简单筹备行动直接复用原经营动作；进入经营与日结完成后均回到完整场景。
- 字体固定为 `20 / 16 / 12 / 10` 四级；按钮统一为纸签切角、细墨线、朱砂选中态和 2 像素按压反馈。
- 首次使用的物件显示短标签，点击后保存发现状态并降为纯图标；任务相关入口继续呼吸提示。
- 旧 `managementPage` 与 `managementNavOpen`仅保留存档兼容，不再参与运行渲染。
- 新增 `tools/validate_management_v12.js`，覆盖七入口、无旧抽屉、四级字体、人物定岗与经营入口恢复。
- Product Design运行审核：`docs/design/management-v12-runtime-audit.md`。
- Creative Production面板 `3c8d45a9-cc54-4953-b929-c20701dab745` 已登记新版运行基准和后续无文字热点图标规范。
- Canva 独立评审设计 `DAHQuvyc0eE` 已确认保存，原第一季设计未修改。
- Canva 编辑链接：`https://www.canva.com/d/oyr2os17uvFEepx`。
- Figma仍等待原设计文件链接，不创建替代文件。

### 运行预览

- `outputs/screenshots/season2-05-management.png`
- `outputs/screenshots/season2-06-management-counter.png`
- `outputs/screenshots/season2-07-management-kitchen.png`
- `outputs/screenshots/season2-08-management-rooms.png`
- `outputs/screenshots/season2-09-management-notice.png`
- `outputs/screenshots/season2-10-management-character.png`

### 本轮检查

- 经营 v12、七日经营、UI安全区、分店隔离、四季32章与224日注册通过。
- 第3-11章、27图探索、角色招募门槛、市场证据、运输天气和旧存档迁移通过。
- 全部小游戏 JavaScript 语法及微信启动保护检查通过。

## 2026-07-30 探索场景融合与 HUD v13

- 探索画面删除 `270px` 固定右栏和纵向页签，场景使用完整 `844px` 逻辑宽度。
- 当前任务改为 `196 × 108` 悬浮话本卡，点击进入独立任务页；无任务时缩为告示印记。
- 底部移除客栈／账簿入口，仅保留队伍和动态交互。
- 客栈柜台碰撞重新校准为正式背景范围，佟湘玉出生点移至柜台前地面；柜台后 NPC 使用脚底纵深和柜台前沿遮挡。
- 27 张地图新增出生点与 NPC 站位合法性检查，修正十字街、废弃驿站、北坡镖道、票号和商盟会馆的旧坐标。
- Canvas 文本停止使用 `fillText` 宽度压缩，统一为 `20/16/12/10` 四级并支持换行和省略号。
- 银两、食材、口碑、秩序四枚透明手绘图标已登记到 Creative Production 面板 revision 75；源图位于 `D:\AI`。
- 运行图标总计约 `54 KB`，加载失败会回退为单字标识，不进入场景必需资源检查。
- Product Design 审核：`docs/design/exploration-v13-runtime-audit.md`。
- Canva 设计 `DAHQuvyc0eE` 已于 2026-07-30 确认并正式保存为 v13 评审稿。
- Canva 编辑链接：`https://www.canva.com/d/ZVcGhb-fmOKTogu`。
- Figma 仍缺少原文件链接，待同步清单已更新，不创建替代文件。
- 微信开发者工具预览编译通过：主包 `2.7 MB`，总计 `7.0 MB`，五个分包均低于 `3.8 MB`。

### 下一恢复点

1. 在开发者工具实走客栈柜台、楼梯和左右桌椅，确认真实触控下无穿模。
2. 检查资源图标点击说明、任务卡呼吸提示和任务页关闭反馈。
3. 收到 Figma 原文件链接后同步 v13 组件，不创建替代文件。

## 2026-07-30 战斗 UI v14

- 方形人物卡替换为圆形头像徽章、体力环、真气环和护盾状态标记。
- 底部文字按钮替换为五枚图标化切角招式牌，统一 `52px` 触控高度。
- 新增攻击、治疗、群体治疗、护盾、控制、削弱、专注和防守图标。
- 当前行动角色、敌方状态和回合印记使用克制呼吸动效。
- 战斗日志改为短卷签，内容变化时使用 `240ms` 淡入位移。
- 真气不足会显示所差数值，不再无反馈。
- Product Design 运行审核：`docs/design/battle-v14-runtime-audit.md`。
- 微信开发者工具预览编译通过，总包约 `7.0 MB`；启动诊断于 `15:20:29` 记录 `first-frame-drawn`。

### 下一恢复点

1. 为普通攻击、三项技能和受击补充透明特效帧。
2. 增加敌人受击闪白、伤害数字和胜利结算动效。
3. 收到 Figma 原文件链接后同步战斗徽章、招式牌和回合状态组件。

## 2026-07-30 战斗技能与结算 v15

- 战斗系统新增可保存的视觉事件队列，记录来源、目标、技能类型、数值和播放时间。
- 普攻、群攻、治疗、群疗、护盾、控制、削弱、专注和防守拥有独立 Canvas 特效。
- 敌人受击闪白约 `170ms`，伤害与治疗数字使用弹跳上浮动画。
- 胜利后不再瞬间返回地图，改为落印、纸屑、奖励图标和确认按钮组成的结算动画。
- 奖励在胜利时只结算一次；确认、重复点击和章节恢复均不会重复发奖。
- 完整验证通过：战斗 FX、第一季章节模拟、27 图探索、分店、经营、存档迁移和启动保护。
- 微信开发者工具编译通过，总包约 `7.0 MB`；`15:38:37` 记录 `first-frame-drawn`。

### 下一恢复点

1. 为九名角色分别制作具有身份特征的技能关键帧和音效节奏。
2. 增加敌方技能预警、目标选择与状态详情。
3. 将战斗结算与章节评级、角色关系和掉落物展示进一步联动。

## 2026-07-30 战斗武学轮盘与账册结算 v16

- 旧的底部文字招式卡已替换为半圆武学轮盘：`64px` 普攻主印、三枚 `52px` 技能印和一枚 `52px` 防守印。
- 默认只显示图标；按下技能时显示招式名、效果类型及真气消耗，释放后直接执行。
- 真气不足使用灰墨遮罩、朱砂缺口环和警示点，不再只用低透明度表示禁用。
- 五名当前角色共制作并接入 `15` 枚身份化技能印；普通攻击和防守使用两枚通用技能印。
- 胜利结算升级为双页掌柜战果账册，包含评价落印、奖励逐项入账和 `归账` 印章按钮。
- 结算动画可点击跳过，奖励仍只发放一次，退出、归账和重复点击均不会重复领取。
- 运行资源位于 `minigame/assets/art/ui/battle`，共约 `120 KB`；生成源图归档于 `D:\AI\design-assets\dengxia-jianghu\battle-v16\source`。
- Creative Production 面板 `3c8d45a9-cc54-4953-b929-c20701dab745` 已完成七项资源登记，当前 revision `83`。
- Product Design 运行审核：`docs/design/battle-v16-runtime-audit.md`。
- Canva 设计 `DAHQuvyc0eE` 已于 2026-07-30 经用户确认并正式保存为战斗 UI v16 评审稿。
- Canva 编辑链接：`https://www.canva.com/d/dcaC07U4exgNNL6`。
- Figma 仍缺少原文件链接；轮盘、技能印、战果账册和动效规格已加入待同步清单，不创建替代文件。
- 微信开发者工具真实预览编译通过：主包 `2.7 MB`，总计 `7.0 MB`；五个章节分包均低于内部 `3.8 MB` 目标。

### 运行预览

- `outputs/product-design/battle-v16-audit/01-player-turn.png`
- `outputs/product-design/battle-v16-audit/01b-pressed-skill.png`
- `outputs/product-design/battle-v16-audit/02-insufficient-qi.png`
- `outputs/product-design/battle-v16-audit/03-enemy-turn.png`
- `outputs/product-design/battle-v16-audit/04-skill-hit.png`
- `outputs/product-design/battle-v16-audit/05-victory-settlement.png`

### 下一恢复点

1. 在微信开发者工具与真机复核轮盘的单手按压手感、底部安全区和超宽屏边距。
2. 为敌方行动补充技能预警、目标选择和状态详情。
3. 将胜利账册与章节评级、关系变化、稀有掉落和音效节奏联动。
4. 收到 Figma 原文件链接后同步 v16 组件，不创建替代文件。

## 2026-07-30 战斗战术反馈 v17

- 修复单体技能把“技能序号”误当成“敌人目标序号”的旧逻辑。多敌人场景现在先选择招式，再由玩家点选目标；群体、自疗、护盾和防守保持一触即发。
- 敌方回合新增蓄势预警，显示招式、锁定对象与预计伤害；重型敌人会使用“沉肩冲撞”，快速敌人会使用“试探快步／连环快袭”。
- 角色与敌人可点击查看状态详情：体力、真气、攻击、速度、护盾、眩晕、削弱、蓄势和护卫。
- 战果账册新增第几章战绩、同行默契和稀有战利品。关系增长与战利品使用战斗 ID 旗标限制为一次，避免反复进入同一战斗刷取。
- 新增 `tools/validate_battle_tactics_v17.js`，覆盖目标选择、状态详情、战斗评级、关系增长和稀有掉落。
- Product Design 运行审核：`docs/design/battle-v17-runtime-audit.md`。
- 运行预览：
  - `outputs/product-design/battle-v17-audit/01-target-selection.png`
  - `outputs/product-design/battle-v17-audit/02-enemy-warning.png`
  - `outputs/product-design/battle-v17-audit/03-status-details.png`
  - `outputs/product-design/battle-v17-audit/04-victory-links.png`
- 27 张地图、第一至十一章、经营、分店、存档迁移及全部小游戏 JavaScript 语法检查通过；当前运行包约 `7.70 MB`。

### 下一恢复点

1. 在微信开发者工具与真机测试多敌人点选、撤销、敌方预警和状态卡的触控手感。
2. 为敌方增加数据驱动的招式表、预警图标和音效节奏。
3. 将本章战绩汇总到季末评级、客栈菜单奖励和角色专属剧情。
4. 收到 Figma 原文件链接后同步 v16／v17 组件，不创建替代文件。
