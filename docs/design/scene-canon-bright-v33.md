# 场景原作地名与鲜亮 2.5D 美术规范 v33

## 定位

场景不再沿用旧图的灰褐色滤镜和通用古镇模板。旧场景仅作为地图比例、出口方向、碰撞范围和任务坐标参考；新版根据《武林外传》剧中地点的社会功能、人物活动和剧情气质重新创作。

目标观感：

- 鲜亮、通透、温暖、有生活气。
- 是市井江湖喜剧，不是暗黑武侠或影视截图复刻。
- 场景先讲清楚“这里会发生什么”，再添加装饰。
- 同一世界统一线条、材质和光照，不用统一滤镜抹平地点差异。

## 2.5D 空间标准

每张正式地图至少拆分为五层：

1. 远景：山体、屋脊、天空、远处街巷，仅承担空间深度。
2. 建筑中景：墙体、门窗、柜台后部、桥梁主体和大型设施。
3. 可行走地面：明确道路、室内地坪、门槛和出口方向。
4. 可排序道具：桌椅、货箱、摊位、粮袋、灶台等，包含脚底 `sortY` 和碰撞。
5. 固定前景：栏杆、帘子、近景植物、车轮等，用于人物前后穿行和镜头遮挡。

人物脚底必须落在可行走地面；所有可遮挡实体同时登记碰撞和前景边界。远、中、近景的明度和饱和度逐层增加，避免仅靠模糊制造纵深。

## 鲜亮色彩标准

- 白天整体保持高明度，阴影仍可辨认木纹、石材和道路边界。
- 天空与远山使用清透青蓝，植物使用鲜活但不过荧光的草木绿。
- 建筑主材为蜂蜜色木材、暖白灰泥和浅暖石材。
- 青玉绿用于布帘、门帘和经营物件；朱砂红用于灯笼、绳结、印记和剧情焦点。
- 禁止大面积棕灰、脏黄、褐色雾罩和统一怀旧滤镜。
- 夜景采用蓝青环境光与暖灯局部照明，人物、出口和任务物保持清楚。

## 27 张地图的原作地点映射

底层地图 ID、出口和存档不变，只替换显示名称、美术语义和场景资产。

| 地图 ID | 开发显示名 | 地点依据 | 场景叙事重点 |
|---|---|---|---|
| `inn` | 同福客栈·大堂 | 剧中核心地点 | 柜台、后厨、楼梯、客房与街口同时可读，承担经营和群像事件 |
| `yard` | 同福客栈·后院 | 客栈生活空间 | 水井、柴房、晾晒、练功和修缮，强调日常烟火 |
| `street` | 七侠镇·西街 | 七侠镇街区 | 同福客栈、商铺、摊位与镇口方向形成主要生活轴 |
| `locust_lane` | 流云坊·告示巷 | 流云坊延展 | 告示、流言、寻人和追踪线索集中的窄巷 |
| `tea_shed` | 七侠镇·东街茶棚 | 东街延展 | 过路客、说书、打听消息和短暂停留 |
| `east_gate` | 七侠镇·镇口戏台 | 镇口戏台 | 戏台、牌坊与出镇道路，承担公共事件和出行检查 |
| `stone_bridge` | 白石桥 | 剧中提及地名 | 商路、货车、护送、伏击与西凉河线索 |
| `paper_mill` | 汉源斋·纸坊 | 汉源斋延展 | 纸张、水印、契纸和伪造路引调查 |
| `paper_alley` | 汉源斋·后巷 | 汉源斋延展 | 墨痕、排水沟、后门追踪和隐蔽交换 |
| `old_post` | 十八里铺·旧驿 | 十八里铺延展 | 旧信格、废弃路引、驿路旧案和诱捕 |
| `north_road` | 黑风岭·北道 | 黑风岭 | 镖路、落石、断轮、山贼和护送路线 |
| `guild_warehouse` | 十八里铺·商会货栈 | 十八里铺延展 | 封条、称重、真假货箱和商队冲突 |
| `river_yard` | 西凉河·转运滩 | 西凉河 | 码头坡道、货物调包、水痕和船运线索 |
| `grain_market` | 十八里铺·吉庆街粮市 | 吉庆街延展 | 粮价、赈济粮、秤台与市井交易 |
| `guild_office` | 万利当铺·后账房 | 万利当铺延展 | 双重账册、印章、契约与证人保护 |
| `charity_granary` | 左家庄·义仓 | 左家庄延展 | 空仓、粮垛、赈济和隐藏转运门 |
| `canal_checkpoint` | 西凉河·河渠关卡 | 西凉河延展 | 路障、粮车、水道和章末冲突 |
| `money_house` | 十八里铺·票号 | 十八里铺延展 | 高柜台、兑票窗口、日期与担保印记 |
| `scale_contract_lane` | 七侠镇·秤契巷 | 七侠镇商业支线 | 不同秤制、契纸摊、证词和追踪后门 |
| `merchant_alliance_hall` | 广阳府·商会馆 | 广阳府延展 | 对称礼制、契约墙、议事台和权力压迫 |
| `old_ledger_vault` | 太平山·旧账库 | 太平山延展 | 潮湿地库、烧损账柜、水道机关与旧案 |
| `jiangnan_branch` | 扬州·醉仙楼分号 | 扬州、醉仙楼 | 临水经营、江南客群、客房和后厨入口 |
| `jiangnan_dock` | 扬州码头 | 扬州延展 | 船票、泊位、货栈、香料箱和水运 |
| `river_market` | 扬州河市 | 扬州延展 | 水上摊位、临时厨房、货价和地方食材 |
| `rain_ferry` | 扬州·雨渡 | 扬州水路延展 | 雨夜追踪、湿栈桥、调包货船和战斗 |
| `jiangnan_spice_workshop` | 醉仙楼·香料坊 | 醉仙楼延展 | 晾料、研磨、封绳和问题香料调查 |
| `old_banquet_kitchen` | 醉仙楼·旧灶院 | 醉仙楼延展 | 旧宴灶、残谱、控火和厨师人物线 |

“延展”表示基于剧中地点为玩法原创的内部或邻接空间，不宣称为电视剧中已出现的固定镜头。

## 地点差异来自剧情行为

- 同福客栈：视线围绕柜台形成聚集，适合经营、争执和人物会面。
- 七侠镇街道：道路开阔、店铺入口清楚，适合巡查、追踪和随机来客。
- 十八里铺：货栈、票号和粮市更密集，适合交易、账册和商路矛盾。
- 西凉河与黑风岭：路线、桥梁、坡道和障碍主导画面，适合护送与战斗。
- 扬州：水巷、码头、河市和雨幕形成水路经营特色，颜色更清润。
- 太平山与地下旧库：可以偏冷，但必须通过暖灯保留道路和交互物可读性。

## 已完成质量锚点

源图仅存放在 D 盘，不直接进入小游戏包：

- `D:\AI\design-assets\tongfu-scenes\v33-bright\source\01-tongfu-inn-hall-bright.png`
- `D:\AI\design-assets\tongfu-scenes\v33-bright\source\02-qixia-west-street-bright.png`
- `D:\AI\design-assets\tongfu-scenes\v33-bright\source\03-baishi-bridge-bright.png`

三张锚点通过构图和色彩确认后，再按区域分批制作其余地图。运行接入前必须完成裁切、碰撞、出生点、出口和前景遮挡校准，禁止直接覆盖旧背景导致穿模。

## v34 第一批完全重绘候选

v33 的三张图属于保留旧空间关系的鲜亮化质量锚点，不计入“完全重绘”数量。v34 从空白画布重新设计，不复用旧建筑布局：

| 运行地图 ID | 新场景 | 主要玩法 | 源图 |
|---|---|---|---|
| `east_gate` | 七侠镇·镇口戏台 | 公共事件、验路引、戏台冲突、出镇 | `D:\AI\design-assets\tongfu-scenes\v34-redesign\source\01-qixia-town-gate-stage.png` |
| `locust_lane` | 七侠镇·灯市街 | 告示调查、流言、人群事件、巷道追踪 | `D:\AI\design-assets\tongfu-scenes\v34-redesign\source\02-qixia-lantern-market-street.png` |
| `north_road` | 黑风岭·北道 | 护送、修路、伏击、断轮与镖旗线索 | `D:\AI\design-assets\tongfu-scenes\v34-redesign\source\03-heifeng-ridge-north-road.png` |
| `river_yard` | 西凉河·旧渡口 | 货运调查、渡河、调包线索和船夫事件 | `D:\AI\design-assets\tongfu-scenes\v34-redesign\source\04-xiliang-river-old-ferry.png` |

四张图当前为源图候选，尚未直接替换运行背景。接入前需按各自世界尺寸裁切，并重建碰撞、出口、任务道具、NPC 站位和前景遮挡。其余地图仍处于旧背景或鲜亮化锚点状态，不得记录为已重绘。

## v34 剩余 20 张完全重绘源图

2026-08-11 已完成剩余 20 张从空白画布重新设计的源图。至此 v34 共 24 张完全重绘候选；`inn`、`street`、`stone_bridge` 三张继续使用 v33 鲜亮锚点，27 张地图均已有新版美术候选。

| 运行地图 ID | 新场景 | 源图文件 |
|---|---|---|
| `yard` | 同福客栈·后院 | `05-tongfu-rear-yard.png` |
| `tea_shed` | 七侠镇·东街茶棚 | `06-qixia-east-street-tea-shed.png` |
| `paper_mill` | 汉源斋·纸坊 | `07-hanyuanzhai-paper-workshop.png` |
| `paper_alley` | 汉源斋·后巷 | `08-hanyuanzhai-paper-alley.png` |
| `old_post` | 十八里铺·旧驿 | `09-shibalipu-abandoned-post.png` |
| `guild_warehouse` | 十八里铺·商会货栈 | `10-shibalipu-merchant-warehouse.png` |
| `grain_market` | 十八里铺·吉庆街粮市 | `11-shibalipu-jiqing-grain-market.png` |
| `guild_office` | 万利当铺·后账房 | `12-wanli-pawnshop-accounts-office.png` |
| `charity_granary` | 左家庄·义仓 | `13-zuojiazhuang-relief-granary.png` |
| `canal_checkpoint` | 西凉河·河渠关卡 | `14-xiliang-canal-checkpoint.png` |
| `money_house` | 十八里铺·票号 | `15-shibalipu-money-house.png` |
| `scale_contract_lane` | 七侠镇·秤契巷 | `16-qixia-scale-contract-lane.png` |
| `merchant_alliance_hall` | 广阳府·商会馆 | `17-guangyang-merchant-alliance-hall.png` |
| `old_ledger_vault` | 太平山·旧账库 | `18-taiping-old-ledger-vault.png` |
| `jiangnan_branch` | 扬州·醉仙楼分号 | `19-yangzhou-zuixianlou-branch.png` |
| `jiangnan_dock` | 扬州码头 | `20-yangzhou-canal-dock.png` |
| `river_market` | 扬州河市 | `21-yangzhou-river-market.png` |
| `rain_ferry` | 扬州·雨渡 | `22-yangzhou-rain-ferry.png` |
| `jiangnan_spice_workshop` | 醉仙楼·香料坊 | `23-zuixianlou-spice-workshop.png` |
| `old_banquet_kitchen` | 醉仙楼·旧灶院 | `24-zuixianlou-old-banquet-kitchen.png` |

完整源图目录：`D:\AI\design-assets\tongfu-scenes\v34-redesign\source`。

源图检查结果：24 张 PNG 均可读取，总体积约 59.24 MB；22 张接近 `2.8:1`，纸坊后巷与票号在运行处理时需居中裁切到目标地图宽高比。C 盘本轮生成目录为空。

### 接入状态

- 美术源图：完成。
- 运行压缩：未开始。
- 前景与道具拆层：未开始。
- 碰撞、出口、出生点和 NPC 站位校准：未开始。
- 微信开发者工具验收：未开始。

不得直接用整张源图覆盖旧背景。下一阶段按“公共地图、第一季、第二季”分包逐张接入，每完成一张即进行人物比例、碰撞和遮挡检查。

## 发布约束

当前经典地名用于开发版和风格验证。正式公开或商业发行前，应单独确认角色名、地名、设定和美术联想的授权风险；底层地图 ID 与原创名称配置继续保留，便于切换发行版本。
