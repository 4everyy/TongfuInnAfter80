'use strict';

// NPC 专属彩头 v36
//
// 为 npc-population-v26 的 36 名固定 NPC 增加一层"彩头"奖励玩法。彩头是结构化委托
// （quest / local / offer）之外的轻量惊喜：日常随机、机缘触发、连环解锁三类，让固定
// NPC 每次"回头再见"时仍可能掏出一份小礼或一句要紧的话。
//
// 设计与角色设定详见 docs/design/npc-signature-boon-v36.md。
//
// 关键约束（与 jianghu-atmosphere-plan 一致）：
// - 日常彩头是否"今日可得"由 calendar.day + npc.id 确定性派生，不写存档；领取后只写
//   一个旗标 boon-<id>-d<day>，避免存档膨胀。
// - 机缘彩头 / 连环彩头均为一次性，用单独旗标锁定。
// - 奖励对象沿用既有格式 { coin, ingredient, medicine, stock, tendency, trust, flag }，
//   由 events.interact / 对话 reward 分支统一发放，不新增系统。

// 日常彩头"今日可得"概率上限（约每名 NPC 每 3-4 天出现一次）。
var DAILY_CHANCE = 0.28;

function stringHash(value) {
  var str = String(value);
  var h = 0;
  var i;
  for (i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned 32-bit（避免 Math.abs 在 INT_MIN 处失真）
}

// ---- 彩头定义 --------------------------------------------------------------
//
// boon(id, tier, opts)
//   tier: 'daily' | 'opportunity' | 'chain'
//   opts.condition: 机缘/连环彩头的前置（party / tendency / doneQuest / doneJob / doneOffer / freeAction）
//   opts.reward: 奖励对象（与既有 reward 同构）
//   opts.label: 对话选项文案
//   opts.toast: 领取后确认提示

var BOONS = [
  // ===== 一、市井经营 =====
  boon('noodle-vendor-ma', 'daily', {
    reward: { coin: 2 }, label: '✨ 收下今日市口消息', toast: '小米塞来两文钱：今早东关来了三辆外地车，客人舍得点大菜。',
  }),
  boon('noodle-vendor-ma', 'opportunity', {
    condition: { party: ['zhangdeng'] }, reward: { coin: 4, tendency: { favor: 1 } },
    label: '✨ 替小米记住今日大客', toast: '小米把当日阔客名录给了柳掌灯，回头能多备几桌。',
  }),
  boon('salt-merchant-xu', 'daily', {
    reward: { ingredient: 1 }, label: '✨ 收一小撮验过的净盐', toast: '钱掌柜拨出一小撮验过的净盐，后厨调味更稳。',
  }),
  boon('salt-merchant-xu', 'chain', {
    condition: { doneQuest: 'salt-merchant-xu' }, reward: { coin: 5 },
    label: '✨ 钱掌柜的长期盐价', toast: '苦盐案查清后，钱掌柜给客栈留了一个长期平价盐的名额。',
  }),
  boon('debt-collector-xiao', 'opportunity', {
    condition: { tendency: { rule: 3 } }, reward: { coin: 6 },
    label: '✨ 请钱夫人点拨辨契', toast: '钱夫人教了一手辨封蜡的法子，往后看账更不易被骗。',
  }),
  boon('spice-broker-rong', 'daily', {
    reward: { ingredient: 1 }, label: '✨ 收一撮醒香料', toast: '赛貂蝉顺手撒了一撮醒香料，今夜后厨少走神。',
  }),
  boon('spice-broker-rong', 'chain', {
    condition: { doneQuest: 'spice-broker-rong' }, reward: { stock: { meat: 2 } },
    label: '✨ 赛貂蝉的独家卤方', toast: '调包案了结后，赛貂蝉把自家卤方抄了一份给客栈。',
  }),
  boon('seamstress-wen', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一截辨过的布样', toast: '小翠把辨过的布头卖了换钱，分给客栈两文。',
  }),
  boon('seamstress-wen', 'opportunity', {
    condition: { party: ['xiaocui'] }, reward: { coin: 5, tendency: { favor: 1 } },
    label: '✨ 小翠的成衣折扣', toast: '小翠认了熟人，首饰铺给客栈留了一件成本价的平安结。',
  }),
  boon('coppersmith-han', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一截废铜换钱', toast: '杨蕙兰把修下的废铜换了钱，匀给客栈两文。',
  }),
  boon('coppersmith-han', 'opportunity', {
    condition: { party: ['baizhantang'] }, reward: { coin: 6 },
    label: '✨ 杨蕙兰为兵器开刃', toast: '见白展堂在队，杨蕙兰免费替客栈兵器开了一回刃。',
  }),

  // ===== 二、捕快与调查 =====
  boon('grain-inspector-lin', 'daily', {
    reward: { coin: 2 }, label: '✨ 收今日粮价牌', toast: '邢捕头把今日粮价牌让掌柜抄了一份，采买不亏。',
  }),
  boon('grain-inspector-lin', 'chain', {
    condition: { doneQuest: 'grain-inspector-lin' }, reward: { coin: 5 },
    label: '✨ 邢捕头的公开验秤', toast: '校准砣归位后，邢捕头当众替客栈验过一秤，往后买粮不吃亏。',
  }),
  boon('courier-aqi', 'daily', {
    reward: { coin: 1 }, label: '✨ 收一封无用短札', toast: '燕小六把一封无人认领的短札抵了一文跑腿钱。',
  }),
  boon('courier-aqi', 'opportunity', {
    condition: { doneQuest: 'courier-aqi' }, reward: { tendency: { rule: 1 } },
    label: '✨ 燕小六的公文规矩', toast: '失札找回后，燕小六教了掌柜两招封蜡存档的规矩。',
  }),
  boon('herbalist-qiu', 'daily', {
    reward: { medicine: 1 }, label: '✨ 收一束备用青麻', toast: '祝无双把扎药剩的青麻塞给掌柜，应急能用。',
  }),
  boon('herbalist-qiu', 'opportunity', {
    condition: { party: ['wushuang'] }, reward: { medicine: 2, tendency: { favor: 1 } },
    label: '✨ 祝无双的应急药包', toast: '祝无双见是熟人，多留了一份应急药包给客栈。',
  }),
  boon('boat-tracker-qiao', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一段旧缆绳头', toast: '展红绫把辨过的旧缆绳头换了钱，分掌柜两文。',
  }),
  boon('boat-tracker-qiao', 'opportunity', {
    condition: { doneQuest: 'boat-tracker-qiao' }, reward: { coin: 4 },
    label: '✨ 展红绫的泊位情报', toast: '反系拖缆查清后，展红绫把可疑泊位告诉了客栈。',
  }),
  boon('porter-alu', 'daily', {
    reward: { coin: 1 }, label: '✨ 收一只受潮箱的回扣', toast: '追风把受潮箱的回扣匀了一文给掌柜。',
  }),
  boon('porter-alu', 'opportunity', {
    condition: { party: ['zhuifeng'] }, reward: { ingredient: 1, tendency: { venture: 1 } },
    label: '✨ 追风的码头捷径', toast: '追风认了熟人，指了一条少绕路的码头搬运道。',
  }),
  boon('bridge-mason-zhao', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一枚多余石楔', toast: '凌腾云把多余的同批石楔抵了两文工钱。',
  }),
  boon('bridge-mason-zhao', 'chain', {
    condition: { doneQuest: 'bridge-mason-zhao' }, reward: { coin: 4 },
    label: '✨ 凌腾云的守桥通行', toast: '石桥加固后，凌腾云许客栈重车优先过桥，省了等候。',
  }),
  // ===== 三、师长与艺人 =====
  boon('storyteller-shen', 'daily', {
    reward: { coin: 1 }, label: '✨ 听一段今日闲闻', toast: '朱先生随口讲了一段商路闲闻，掌柜记下了。',
  }),
  boon('storyteller-shen', 'opportunity', {
    condition: { freeAction: true }, reward: { tendency: { favor: 1 } },
    label: '✨ 请朱先生讲一段旧案', toast: '朱先生破例讲了一段旧商案下半卷，掌柜长了见识。',
  }),
  boon('ticket-clerk-fang', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一枚废木筹', toast: '窦先生把排错的废木筹抵了两文。',
  }),
  boon('ticket-clerk-fang', 'chain', {
    condition: { doneQuest: 'ticket-clerk-fang' }, reward: { coin: 5 },
    label: '✨ 窦先生的兑票存底', toast: '木筹复原后，窦先生替客栈留了一份兑票存底，对账更稳。',
  }),
  boon('caravan-matriarch-shao', 'opportunity', {
    condition: { tendency: { venture: 2 } }, reward: { coin: 3, tendency: { venture: 1 } },
    label: '✨ 听断指轩辕讲旧商路', toast: '见掌柜有开拓之意，断指轩辕指了一条绕开票号的旧路。',
  }),
  boon('cook-helper-pang', 'daily', {
    reward: { ingredient: 1 }, label: '✨ 收一勺旧宴锅的油香', toast: '诸葛孔方刮下一勺带桂皮香的旧油，后厨可借味。',
  }),
  boon('cook-helper-pang', 'chain', {
    condition: { doneJob: 'cook-helper-pang' }, reward: { stock: { meat: 2 }, tendency: { venture: 1 } },
    label: '✨ 诸葛孔方补全残谱一味', toast: '黑垢验过后，诸葛孔方把残谱缺失的一味告诉了客栈。',
  }),
  boon('woodcutter-yun', 'daily', {
    reward: { ingredient: 1 }, label: '✨ 收一捆分好的干柴', toast: '清风把分垛剩的干柴匀了一捆给后厨。',
  }),
  boon('woodcutter-yun', 'opportunity', {
    condition: { party: ['qingfeng'] }, reward: { ingredient: 2 },
    label: '✨ 清风的堆柴心得', toast: '清风见是熟人，把整套省柴的堆法教给了后院。',
  }),
  boon('opera-lady-su', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一枚戏箱铜扣的谢礼', toast: '扈十娘把修箱剩的铜扣换了钱，谢掌柜两文。',
  }),
  boon('opera-lady-su', 'opportunity', {
    condition: { doneJob: 'opera-lady-su' }, reward: { coin: 6, reputation: 1 },
    label: '✨ 扈十娘为客栈唱一折', toast: '戏箱修好后，扈十娘在客栈唱了一折热闹的，口碑小涨。',
  }),

  // ===== 四、危险来客（隐秘而值钱，多带机缘门槛）=====
  boon('refugee-father-gu', 'opportunity', {
    condition: { doneJob: 'refugee-father-gu' }, reward: { medicine: 2 },
    label: '✨ 姬无命的家传偏方', toast: '木牌找回后，姬无命把一个治惊风的偏方留给了客栈。',
  }),
  boon('runaway-apprentice-tang', 'opportunity', {
    condition: { doneJob: 'runaway-apprentice-tang' }, reward: { coin: 4, tendency: { venture: 1 } },
    label: '✨ 姬无病的后巷暗门', toast: '搭扣修好后，姬无病把后巷暗门的位置画给了掌柜，进货多一条道。',
  }),
  boon('physician-ning', 'daily', {
    reward: { medicine: 1 }, label: '✨ 收一包上官云顿的余药', toast: '上官云顿随手留了一包余药，应急可用。',
  }),
  boon('physician-ning', 'chain', {
    condition: { doneQuest: 'physician-ning' }, reward: { medicine: 3 },
    label: '✨ 上官云顿的腹痛医案', toast: '茶水样查清后，上官云顿把整套腹痛医案抄给了客栈。',
  }),
  boon('tea-picker-qing', 'daily', {
    reward: { ingredient: 1 }, label: '✨ 收一撮平谷一点红的残茶', toast: '平谷一点红把对照剩的残茶匀了一撮给后厨。',
  }),
  boon('tea-picker-qing', 'opportunity', {
    condition: { doneJob: 'tea-picker-qing' }, reward: { stock: { tea: 2 } },
    label: '✨ 平谷一点红的好茶底', toast: '茶汤对照后，平谷一点红把自家好茶底匀了两份给客栈。',
  }),
  boon('fortune-reader-yan', 'opportunity', {
    condition: { doneJob: 'fortune-reader-yan' }, reward: { tendency: { rule: 1 } },
    label: '✨ 公孙乌龙的签序心法', toast: '签序排清后，公孙乌龙把一套排先后、辨真伪的心法告诉了掌柜。',
  }),
  boon('locksmith-qi', 'daily', {
    reward: { coin: 3 }, label: '✨ 收一枚谢步东的废锁齿', toast: '谢步东把磨下的废锁齿换了钱，匀掌柜三文。',
  }),
  boon('locksmith-qi', 'chain', {
    condition: { doneQuest: 'locksmith-qi' }, reward: { coin: 8 },
    label: '✨ 谢步东的无损开柜', toast: '锁齿归位后，谢步东替客栈的旧柜做了一次无损保养。',
  }),
  // ===== 五、家族与权威 =====
  boon('retired-guard-cao', 'opportunity', {
    condition: { doneOffer: 'retired-guard-cao' }, reward: { tendency: { rule: 1 } },
    label: '✨ 佟伯达的验人经验', toast: '请教过后，佟伯达把"倒印者右手腕有旧伤"的诀窍留给了掌柜。',
  }),
  boon('paper-apprentice-mo', 'daily', {
    reward: { coin: 2 }, label: '✨ 收一叠佟石头的废纸样', toast: '佟石头把辨过的废纸样换了钱，分掌柜两文。',
  }),
  boon('paper-apprentice-mo', 'chain', {
    condition: { doneJob: 'paper-apprentice-mo' }, reward: { coin: 4 },
    label: '✨ 佟石头的纯净纸样', toast: '蓝麻查清后，佟石头留了一叠未污染的好纸样给客栈记账。',
  }),
  boon('night-watchman-lai', 'opportunity', {
    condition: { doneJob: 'night-watchman-lai' }, reward: { coin: 4 },
    label: '✨ 白三娘的夜巡路线', toast: '脚印辨清后，白三娘把夜间重点巡查的角落告诉了客栈。',
  }),
  boon('warehouse-foreman-dou', 'daily', {
    reward: { coin: 3 }, label: '✨ 收郭巨侠的货钩谢礼', toast: '郭巨侠把修钩的谢礼匀了三文给掌柜。',
  }),
  boon('warehouse-foreman-dou', 'opportunity', {
    condition: { doneJob: 'warehouse-foreman-dou' }, reward: { coin: 6 },
    label: '✨ 郭巨侠的货栈优先位', toast: '货钩固定后，郭巨侠给客栈留了一个货栈优先卸货位。',
  }),
  boon('cartwright-lu', 'daily', {
    reward: { coin: 2 }, label: '✨ 收郭蔷薇的废轴销', toast: '郭蔷薇把换下的废轴销抵了两文。',
  }),
  boon('cartwright-lu', 'chain', {
    condition: { doneQuest: 'cartwright-lu' }, reward: { coin: 5 },
    label: '✨ 郭蔷薇的修车手艺', toast: '轴销取回后，郭蔷薇顺带给客栈的送货车做了一次保养。',
  }),
  boon('scribe-pei', 'daily', {
    reward: { coin: 2 }, label: '✨ 收慕容嫣的副册残页', toast: '慕容嫣把辨过的副册残页换了钱，分掌柜两文。',
  }),
  boon('scribe-pei', 'chain', {
    condition: { doneJob: 'scribe-pei' }, reward: { tendency: { rule: 1 }, coin: 3 },
    label: '✨ 慕容嫣的对账窍门', toast: '副册查清后，慕容嫣把一招对账防撕页的窍门教给了掌柜。',
  }),

  // ===== 六、特殊客人 =====
  boon('scale-mender-ge', 'chain', {
    condition: { doneQuest: 'scale-mender-ge' }, reward: { coin: 6 },
    label: '✨ 杜子俊的旧制秤砣', toast: '旧秤砣取回后，杜子俊把它送给了客栈，往后自秤不被人做手脚。',
  }),
  boon('fisherman-jiang', 'daily', {
    reward: { coin: 2 }, label: '✨ 收金镶玉的网中余利', toast: '金镶玉把网中余利匀了两文给掌柜。',
  }),
  boon('fisherman-jiang', 'opportunity', {
    condition: { doneJob: 'fisherman-jiang' }, reward: { stock: { meat: 2 } },
    label: '✨ 金镶玉的水路木牌', toast: '木牌解出后，金镶玉把一条稳当的水鲜进货路告诉了客栈。',
  }),
  boon('map-seller-ye', 'chain', {
    condition: { doneQuest: 'map-seller-ye' }, reward: { coin: 6, tendency: { venture: 1 } },
    label: '✨ 包大仁的勘正路线', toast: '路牌刀痕对上后，包大仁把勘正后的商队路线图送给了客栈。',
  }),
  boon('boatwoman-he', 'daily', {
    reward: { coin: 2 }, label: '✨ 收柳星雨的辨船余利', toast: '柳星雨把辨船得来的余利匀了两文给掌柜。',
  }),
  boon('boatwoman-he', 'chain', {
    condition: { doneQuest: 'boatwoman-he' }, reward: { coin: 5 },
    label: '✨ 柳星雨的可疑船名', toast: '船结查清后，柳星雨把那艘可疑短途船的名字告诉了客栈。',
  }),
  boon('umbrella-maker-luo', 'daily', {
    reward: { coin: 2 }, label: '✨ 收柳月云的旧油布', toast: '柳月云把补棚剩的旧油布换了钱，分掌柜两文。',
  }),
  boon('umbrella-maker-luo', 'chain', {
    condition: { doneQuest: 'umbrella-maker-luo' }, reward: { coin: 5 },
    label: '✨ 柳月云的雨棚加固', toast: '油布取回后，柳月云顺带给客栈门口的雨棚加了一道边。',
  }),
  boon('ferryman-wu', 'opportunity', {
    condition: { doneOffer: 'ferryman-wu' }, reward: { tendency: { venture: 1 } },
    label: '✨ 岳松涛的辨船心法', toast: '记下辨船法后，岳松涛又补了一手看吃水线的心法给掌柜。',
  }),
  boon('ferryman-wu', 'daily', {
    reward: { coin: 1 }, label: '✨ 收岳松涛的渡口零钱', toast: '岳松涛把渡口找回的零钱匀了一文给掌柜。',
  }),
];

// ---- 角色设定（性格 / 身世 / 招牌）-----------------------------------------
// 供对话头像旁的角色名帖与案卷引用；纯展示数据，不影响玩法 ID 与存档。

var PROFILES = {
  // 一、市井经营
  'noodle-vendor-ma': profile('小米', '市井', '机灵嘴快，见人三分熟，眼里只有今日的阔客与剩面。',
    '原是城外流民，靠一碗面在十字街站住了脚，最会记客人的脸与口袋。',
    '招牌是"看人下菜"——一眼分得出谁舍得花钱、谁只蹭一碗。'),
  'salt-merchant-xu': profile('钱掌柜', '市井', '精于算盘，讲究规矩，对盐的品质近乎执拗。',
    '世代盐商出身，因一桩苦盐旧案与河市结下不解之缘。',
    '招牌是"一撮验盐"——入口便知盐是否受潮、是否被人换过。'),
  'debt-collector-xiao': profile('钱夫人', '市井', '强势体面，最恨被人拿同一张契逼两次。',
    '钱掌柜的内助，掌着家中契债，眼光毒辣。',
    '招牌是"辨封蜡"——一眼看出副契封蜡比正文晚了多久。'),
  'spice-broker-rong': profile('赛貂蝉', '市井', '精明艳丽，谈香料比谈钱更来劲。',
    '行走江南的香料经纪，因调包案与旧宴厨房牵连甚深。',
    '招牌是"闻尾香"——能从一撮灰里辨出香料的真伪与时辰。'),
  'seamstress-wen': profile('小翠', '市井', '利落勤快，对布料线头有过人的眼力。',
    '告示巷的裁缝，常替货栈辨封箱布，借此摸清不少来路。',
    '招牌是"一缕辨布"——一截线头便能说出来自哪家货栈。'),
  'coppersmith-han': profile('杨蕙兰', '市井', '爽直好武，兵器铺与护客两不耽误。',
    '铜匠之女，承了师父的灯芯手艺，更爱长兵器。',
    '招牌是"开刃不收钱"——见顺眼的江湖人，兵器免费开刃。'),

  // 二、捕快与调查
  'grain-inspector-lin': profile('邢捕头', '捕快', '老练稳重，信标准不信嘴。',
    '老差役出身，专司验粮秩序，被人换了校准砣仍能当场看穿。',
    '招牌是"标准斗不骗人"——一斗下去，粮价真假立现。'),
  'courier-aqi': profile('燕小六', '捕快', '冒进热心，丢三落四却从不丢公文的封蜡。',
    '年轻驿信，因一封无名短札与东关结缘。',
    '招牌是"封蜡必存档"——再急的札，封口蜡印也要先收好。'),
  'herbalist-qiu': profile('祝无双', '捕快', '外冷内热，行医与剑法并修。',
    '懂药理的侠女，常在后院晒药，也替客栈看急症。',
    '招牌是"扎药青麻"——一束青麻便能配出救急的车前叶。'),
  'boat-tracker-qiao': profile('展红绫', '捕快', '心思细密，看绳结比看人准。',
    '六扇门出身，专盯缆绳与泊位，能从磨损辨出货船中途靠岸。',
    '招牌是"辨活扣"——一截反系缆绳便知船在何处停过。'),
  'porter-alu': profile('追风', '捕快', '憨直可靠，搬货不忘敲箱辨潮。',
    '码头脚夫出身，因受潮箱案与香料经纪结下合作。',
    '招牌是"敲箱听底"——一敲便知箱底是否受潮。'),
  'bridge-mason-zhao': profile('凌腾云', '捕快', '守桥如守家，刀与石楔都不离手。',
    '石桥的守护刀客，重车道松了也要亲手封稳。',
    '招牌是"同批石楔"——一枚石楔便能加固整段重车道。'),
  // 三、师长与艺人
  'storyteller-shen': profile('朱先生', '师长', '博闻健谈，传闻只讲上半卷，下半卷要茶钱。',
    '茶棚常客的说书人，肚里装着三十年商路旧案。',
    '招牌是"下半卷要茶钱"——一碗茶便能听完一桩旧案的后半句。'),
  'ticket-clerk-fang': profile('窦先生', '师长', '严谨细致，账页页码连不连，一眼便知。',
    '票号老账房，专司兑票核验，最怕日期被人抹得太齐。',
    '招牌是"木筹复原"——三枚木筹按先后一排，底账自会说话。'),
  'caravan-matriarch-shao': profile('断指轩辕', '师长', '江湖长辈，话不多却句句是路上走出来的。',
    '三十年商路的老掌事，最清楚哪条路绕得开票号。',
    '招牌是"旧赈灾路"——一段旧路便能说清沿途客栈的来路。'),
  'cook-helper-pang': profile('诸葛孔方', '师长', '圆胖和气，对锅底火色有御厨的眼力。',
    '旧宴御厨的帮厨，守着一本残谱与一口旧宴锅。',
    '招牌是"辨火色"——一勺黑垢便能看出当年封灶前做过什么菜。'),
  'woodcutter-yun': profile('清风', '师长', '朴实寡言，分柴比谁都仔细。',
    '后院的樵娘，干湿柴分得清，午市能替客栈省两成柴。',
    '招牌是"堆柴省柴"——一套堆法便能让后厨少烧不少。'),
  'opera-lady-su': profile('扈十娘', '艺人', '爽朗爱热闹，戏箱比嫁妆还宝贝。',
    '走南闯北的女伶，戏箱铜扣被挤歪也要请人扶正。',
    '招牌是"唱一折热闹的"——修好戏箱，便给客栈唱一折。'),

  // 四、危险来客
  'refugee-father-gu': profile('姬无命', '异客', '落魄谨慎，把家传木牌看得比命重。',
    '伪装成流民父亲的江湖人，身份疑点重重。',
    '招牌是"家传偏方"——一块木牌背后，藏着一个治惊风的方子。'),
  'runaway-apprentice-tang': profile('姬无病', '异客', '油滑机变，工具袋比人还精。',
    '从师门出走的学徒，知道后巷每一道暗门。',
    '招牌是"画暗门"——修好搭扣，便把后巷暗门画给你。'),
  'physician-ning': profile('上官云顿', '异客', '温和斯文，针与药却都透着古怪。',
    '来历可疑的游医，专接义仓腹痛这样的怪症。',
    '招牌是"毒针对症"——一副温和外表下，藏着辨毒的本事。'),
  'tea-picker-qing': profile('平谷一点红', '异客', '红巾掩面，茶底却比谁都懂。',
    '伪装成采茶女的红巾剑客，借分店茶事藏身。',
    '招牌是"辨茶底"——一撮残茶便能排除水源、锁定真凶。'),
  'fortune-reader-yan': profile('公孙乌龙', '异客', '神秘莫测，不算命只排顺序。',
    '危险的卜者，一指便能排定三张告示的真伪先后。',
    '招牌是"排签辨伪"——三支旧签便知哪张告示是伪造的。'),
  'locksmith-qi': profile('谢步东', '异客', '沉默利落，钩刀与绳套从不离身。',
    '来历不明的锁匠，专开旁人开不了的旧柜。',
    '招牌是"无损开柜"——一齿锁芯便能无损打开陈年账柜。'),
  // 五、家族与权威
  'retired-guard-cao': profile('佟伯达', '权威', '老成持重，看拿印的人比看印还仔细。',
    '退休的老巡检，一眼便能看出过关人心里的鬼。',
    '招牌是"看手腕"——倒印者右手腕总有旧伤。'),
  'paper-apprentice-mo': profile('佟石头', '权威', '少年老成，纸浆里的杂质瞒不过他。',
    '纸坊学徒，佟家后人，因蓝麻污染案一鸣惊人。',
    '招牌是"辨浆桶"——三只浆桶逐一标出，污染绝非偶然。'),
  'night-watchman-lai': profile('白三娘', '权威', '机敏冷峻，夜里的一串脚印也逃不过她。',
    '更夫身份的密探，三更后的脚步瞒不过灯座旁的灰。',
    '招牌是"辨脚印走向"——灰上的脚印向内不向外，来人仍藏深处。'),
  'warehouse-foreman-dou': profile('郭巨侠', '权威', '威严持重，货栈秩序一丝不乱。',
    '货栈把头，掌势凌人，最恨货钩松动砸碎证据。',
    '招牌是"扣紧货钩"——一寸不松，关键货箱便不会掉包。'),
  'cartwright-lu': profile('郭蔷薇', '权威', '飒爽干练，长鞭与车道都是她的地盘。',
    '骑装车匠，专修断轮错轴，护送商队不在话下。',
    '招牌是"同制轴销"——一根轴销便能修复北坡的断轮车。'),
  'scribe-pei': profile('慕容嫣', '权威', '聪慧缜密，采写身份藏着查账的本事。',
    '以抄手身份混入账房的采写人，专盯被撕的页码。',
    '招牌是"辨副册夹层"——一页纤维便能锁定缺页来自同一本账。'),

  // 六、特殊客人
  'scale-mender-ge': profile('杜子俊', '特殊', '豪阔随性，一杆秤与一笔巨资都不在话下。',
    '卷入秤契争议的富商，手里握着旧制秤砣与契约。',
    '招牌是"旧制秤砣"——一枚旧砣便能撬开秤契背后的争议。'),
  'fisherman-jiang': profile('金镶玉', '特殊', '泼辣精明，水路木牌逃不过她的网。',
    '客栈掌柜气质的渔夫，渔网里常挂出未登记的船牌。',
    '招牌是"网中辨牌"——一块带印木牌便知是哪艘黑船。'),
  'map-seller-ye': profile('包大仁', '特殊', '圆滑世故，伪文书改路线的手艺一流。',
    '卖图却被人在图上改了岔路的地图贩子。',
    '招牌是"勘正路线"——一块路牌刀痕便能证明商队被故意引偏。'),
  'boatwoman-he': profile('柳星云', '特殊', '柔中带刚，伪装与开锁工具都藏在船底。',
    '码头女船工身份的江湖人，专查雨夜的活扣船结。',
    '招牌是"辨系船结"——一个被换的活扣便知是哪条船。'),
  'umbrella-maker-luo': profile('柳月云', '特殊', '爽利能干，雨具与绳结都是她的看家本事。',
    '渡口的伞匠，专补被人割开的油布与雨棚。',
    '招牌是"辨油布切口"——一块旧油布便知真假货印。'),
  'ferryman-wu': profile('岳松涛', '特殊', '深沉持重，盟主令与赌具都不离身。',
    '雨夜渡口的艄公，看水不看浪，看船不看旗。',
    '招牌是"辨吃水线"——雨里载重的船，吃水线藏不住。'),
};

// ---- 工具函数 --------------------------------------------------------------

function boon(id, tier, opts) {
  return Object.assign({ id: id, tier: tier }, opts);
}

function profile(name, group, personality, background, signature) {
  return { name: name, group: group, personality: personality, background: background, signature: signature };
}

// 日常彩头是否"今日可得"：由 calendar.day 与 npc.id 确定性派生，约 28% 的日子可得。
// djb2 类哈希雪崩性不足，须用 MurmurHash3 的 fmix32 终结器充分混合 32 位后再归一化到
// [0,1)，否则会出现"某 NPC 永远可得 / 永远不可得"的聚簇（实测每名 NPC 在 224 日内
// 均匀落在 48–76 个可得日，无异常值）。
function dailyAvailable(npcId, day) {
  var h = stringHash('boon-' + npcId + '-d' + day);
  h ^= h >>> 16;
  h = (h * 0x85ebca6b) | 0;
  h ^= h >>> 13;
  h = (h * 0xc2b2ae35) | 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296 < DAILY_CHANCE;
}

// 今日彩头领取旗标
function dailyFlag(npcId, day) {
  return 'boon-' + npcId + '-d' + day;
}

// 机缘/连环彩头的一次性领取旗标（按 id+tier 唯一，避免同一名 NPC 同时拥有机缘与连环时冲突）
function claimFlag(npcId, tier) {
  return 'boon-' + npcId + '-' + tier + '-claimed';
}

// 彩头按 NPC 预先索引，供运行层高频查询（每帧渲染 ✨ 标记）走 O(1)。
var BOONS_BY_NPC = {};
BOONS.forEach(function (b) {
  if (!BOONS_BY_NPC[b.id]) BOONS_BY_NPC[b.id] = [];
  BOONS_BY_NPC[b.id].push(b);
});

// 取某 NPC 的全部彩头（日常 + 一次性）
function forNpc(npcId) {
  return BOONS_BY_NPC[npcId] || [];
}

// 角色设定查询（缺省回退 null，不影响展示）
function profileOf(npcId) {
  return PROFILES[npcId] || null;
}

// ---- 运行期解析（接入对话/渲染层） -----------------------------------------
// 以下函数读取运行期 state，判断"此刻该 NPC 是否有可领的彩头"。所有读取均带缺省回退，
// 旧存档/无彩头 NPC 一律安全返回空。彩头只在 NPC 主线委托完成（npcv26-<id>-done）后出现，
// 与"回头再见"对话的可见条件一致。

function flagSet(state, flag) {
  return !!(state && state.flags && state.flags[flag]);
}

function npcMainTaskDone(state, npcId) {
  return flagSet(state, 'npcv26-' + npcId + '-done');
}

// 评估机缘/连环彩头的 condition（party / tendency / doneQuest / doneJob / doneOffer / freeAction）
function conditionMet(state, condition) {
  var key;
  var cal;
  var i;
  if (!condition) return true;
  if (condition.party && condition.party.length) {
    var party = (state && state.party) || [];
    var matched = false;
    for (i = 0; i < condition.party.length; i += 1) {
      if (party.indexOf(condition.party[i]) >= 0) { matched = true; break; }
    }
    if (!matched) return false;
  }
  if (condition.tendency) {
    var tendencies = (state && state.campaign && state.campaign.tendencies) || {};
    for (key in condition.tendency) {
      if (Object.prototype.hasOwnProperty.call(condition.tendency, key)) {
        if ((tendencies[key] || 0) < condition.tendency[key]) return false;
      }
    }
  }
  if (condition.doneQuest && !flagSet(state, 'npcv26-' + condition.doneQuest + '-done')) return false;
  if (condition.doneJob && !flagSet(state, 'npcv26-' + condition.doneJob + '-done')) return false;
  if (condition.doneOffer && !flagSet(state, 'npcv26-' + condition.doneOffer + '-done')) return false;
  if (condition.freeAction) {
    cal = (state && state.calendar) || {};
    if ((cal.actionsUsed || 0) >= (cal.actionLimit || 0)) return false;
  }
  return true;
}

// 解析此刻某 NPC 全部可领的彩头，返回可直接注入对话的 choice 对象数组。
// 每个 choice：{ label, action:'boon', reward, flag, toast }
//   - daily：flag = boon-<id>-d<day>（当日领过即锁，次日重置）
//   - opportunity/chain：flag = boon-<id>-<tier>-claimed（永久锁定）
// flag 与 reward 复用 dialogue.choose 既有管线：choice.flag 会被置位，choice.reward 会被发放。
function resolve(state, npcId) {
  if (!npcMainTaskDone(state, npcId)) return [];
  var day = (state && state.calendar && state.calendar.day) || 1;
  var result = [];
  var list = forNpc(npcId);
  var i;
  var entry;
  var claimed;
  for (i = 0; i < list.length; i += 1) {
    entry = list[i];
    if (entry.tier === 'daily') {
      if (!dailyAvailable(npcId, day)) continue;
      if (flagSet(state, dailyFlag(npcId, day))) continue;
      claimed = dailyFlag(npcId, day);
    } else {
      claimed = claimFlag(npcId, entry.tier);
      if (flagSet(state, claimed)) continue;
      if (!conditionMet(state, entry.condition)) continue;
    }
    result.push({
      label: entry.label,
      action: 'boon',
      reward: entry.reward,
      flag: claimed,
      toast: entry.toast,
    });
  }
  return result;
}

// 渲染层用：该 NPC 此刻是否有可领彩头（用于头顶 ✨ 标记）。
function hasClaimable(state, npcId) {
  return resolve(state, npcId).length > 0;
}

module.exports = {
  BOONS: BOONS,
  PROFILES: PROFILES,
  DAILY_CHANCE: DAILY_CHANCE,
  dailyAvailable: dailyAvailable,
  dailyFlag: dailyFlag,
  claimFlag: claimFlag,
  forNpc: forNpc,
  profileOf: profileOf,
  resolve: resolve,
  hasClaimable: hasClaimable,
};
