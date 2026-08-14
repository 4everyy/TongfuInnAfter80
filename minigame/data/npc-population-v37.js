'use strict';

var FRAME_SIZE = { width: 192, height: 256 };
var PIVOT = { x: 96, y: 244 };

function npc(id, name, mapId, ratio, source, role, dialogue, followup, design) {
  return { id: id, slug: id, name: name, mapId: mapId, ratio: ratio, source: source, role: role, dialogue: dialogue, followup: followup, design: design };
}

var ROSTER = [
  npc('moxiaobei', '莫小贝', 'inn', .18, '第3、17、38、46回', '衡山掌门／客栈少女', '嫂子，我把功课写完一半了。剩下一半能不能等我巡完客栈再写？', '我看着门口呢。真有江湖人闹事，我先喊你，再拔木剑。', { face: '圆脸、宽眼距、稚气雀斑', body: '明显儿童比例、短腿灵活', pose: '外八小步、身体前倾', prop: '木剑与糖葫芦', palette: '竹青、米白、朱绳' }),
  npc('xiaoqing', '小青', 'yard', .20, '第1回', '郭芙蓉随行丫鬟', '小姐闯江湖靠胆子，我替她收拾包袱和烂摊子。后院这根断绳，我一眼就看出是谁割的。', '绳口向外翻，是从院里割断的。这个细节别漏了。', { face: '窄鹅蛋脸、杏眼、薄唇', body: '紧凑运动型少女', pose: '侧身护包、随时接应', prop: '蓝布包袱与短匕', palette: '湖蓝、靛青、银灰' }),
  npc('laoluo', '老罗', 'grain_market', .16, '第13回', '卖鸡老人', '鸡不怕人多，就怕秤不准。掌柜若要买，我先让你听叫声、看脚爪，再谈价。', '小卉那只小红精神最好，别只看羽毛漂亮。', { face: '长方脸、深皱纹、凹颊', body: '瘦高佝偻老人', pose: '肩扛鸡笼、重心沉稳', prop: '竹鸡笼与扁担', palette: '土褐、灰麻、鸡冠红' }),
  npc('xiaohui', '小卉', 'grain_market', .82, '第13回', '老罗之女', '小红不是拿来炫耀的，它是我和爹一点点养大的。比赛可以输，鸡可不能受委屈。', '你摸摸它的背，毛顺、身子暖，就是养得好。', { face: '心形脸、圆眼、雀斑', body: '纤细乡村少女', pose: '双臂护鸡、脚步轻快', prop: '花母鸡与菜篮', palette: '杏橙、靛蓝、草绿' }),
  npc('leilaowu', '雷老五', 'stone_bridge', .18, '第15回', '盗墓者／地道高手', '桥底的土不是雨冲的，是有人新翻过。你要追车，先别踩乱那排脚印。', '我只管看土，不管你们江湖上的名号。', { face: '楔形脸、鹰钩鼻、窄眼', body: '长肢瘦削、轻微驼背', pose: '缩肩探路、随时后撤', prop: '绳索与短铲', palette: '炭黑、泥褐、暗铜' }),
  npc('fandaniang', '范大娘', 'paper_mill', .82, '第16回', '非法书商', '稿子要卖，得先有噱头。只是这回纸坊的水印比故事还热闹，掌柜可敢押一注？', '契约落笔前多看三遍，尤其是最小的那行字。', { face: '宽方脸、高挑眉、厚唇', body: '矮壮丰厚中年女性', pose: '昂首指点、占据空间', prop: '书捆与契约', palette: '梅紫、暗金、墨蓝' }),
  npc('housan', '侯三', 'street', .14, '第20回', '街头泼皮', '我可没挡路，我这是替街坊看摊。至于看摊钱嘛，掌柜的总不能让我白忙。', '你们客栈的人一个比一个会讲理，我先去别处转转。', { face: '三角脸、尖耳、歪嘴', body: '短小精瘦', pose: '曲膝叉腰、摇晃挑衅', prop: '骰子与破刀鞘', palette: '锈红、脏灰、褐黄' }),
  npc('wushouyi', '吴守义', 'tea_shed', .18, '第21回', '异乡访客', '我走了很远，只想亲眼看看传闻里的人。真到了这里，反倒不知道该问什么。', '传闻会变，眼前的人不会。让我再坐一碗茶的工夫。', { face: '长脸、下垂眼、苦相', body: '普通偏软的中年体态', pose: '含胸读纸、犹豫停步', prop: '折叠旅行须知', palette: '灰蓝、旧白、茶褐' }),
  npc('jiangxiaodao', '江小道', 'stone_bridge', .80, '第22回', '寻仇少年', '我追错过一次人，差点伤了无辜。如今每拔一次刀，都得先把脸和证据看清。', '桥那边的车印有两种宽度，别把押车人和劫车人混了。', { face: '宽青年脸、粗直眉', body: '结实短躯干、稳下盘', pose: '宽步前冲又强行收势', prop: '缺口刀与缠手', palette: '赭黄、黑灰、青带' }),
  npc('baimei', '白眉', 'locust_lane', .16, '第24回', '江湖术士', '告示纸朝东卷，说明今日宜查旧账、不宜信新印。至于准不准，得看掌柜给不给茶钱。', '算命靠嘴，查案靠眼。你还是看纸角那道新浆吧。', { face: '极长脸、夸张白眉、扇形胡须', body: '高瘦如竹', pose: '扬手作法、脚下虚浮', prop: '幡旗与铜铃', palette: '黑白、黛蓝、暗金' }),
  npc('louzhi', '娄知县', 'street', .86, '第22、42回', '七侠镇知县', '本县只是体察民情，顺便看看街上出口可还通畅。切记，别让任何摊贩堵住官道。', '百姓走得通，差役才办得成事。这条规矩要写进街契。', { face: '椭圆中年脸、小而谨慎的眼', body: '微肚腩、肩窄', pose: '端正文弱、手护公文', prop: '公文匣与礼篮', palette: '黛青、暗金、栗褐' }),
  npc('qiuxiaodong', '邱小冬', 'paper_alley', .18, '第38回', '白马书院学生', '我不是告状，我只是把先生今天回来的事说清楚。还有，这张纸不是我们的作业纸。', '纸边有鱼网的水印，可能是西凉河那边带来的。', { face: '方圆童脸、认真眉眼', body: '瘦小儿童比例', pose: '抱板直立、紧张解释', prop: '写字板与小鱼网', palette: '米白、豆绿、木褐' }),
  npc('xiaohu', '小虎', 'old_post', .18, '第38回', '学童／表演搭档', '驿站这么空，正好练一段棍花。你放心，我只打木桩，不碰信柜。', '刚才墙后响了一声，不像风，更像木板扣回去了。', { face: '圆方童脸、缺牙笑', body: '敦实短小', pose: '蹲身转竹圈', prop: '竹圈与短棍', palette: '芥黄、棕褐、青灰' }),
  npc('niuniu', '妞妞', 'old_post', .82, '第38回', '学童／木偶表演者', '我演的小老虎会说话，它说旧信柜后面藏着一张没寄出去的信。', '木偶不会骗人，是我看见以后才让它说的。', { face: '圆童脸、宽眼距、小鼻', body: '娇小儿童比例', pose: '叉腰举木偶', prop: '布老虎木偶与糖袋', palette: '珊瑚红、奶白、青绿' }),
  npc('hanjuan', '韩娟', 'inn', .82, '第47、69回', '昆仑掌门夫人', '你这客栈地方不大，倒收拾得挺有章法。别误会，我只是随便看看，绝不是来比较。', '那盏灯擦得不错。我们昆仑山上的灯嘛，也就高那么一点点。', { face: '长菱形脸、挑眉、细眼', body: '高挑匀称、姿态紧绷', pose: '抬颌展开扇面', prop: '孔雀扇与首饰匣', palette: '孔雀蓝、金棕、象牙白' }),
  npc('laohe', '老何', 'tea_shed', .82, '第47、69回', '昆仑派掌门', '茶凉一点不要紧，人说话别太烫。她爱比较，我听着便是。', '掌门不是站得最高的人，是愿意最后一个离席的人。', { face: '宽风霜脸、慈和垂眼', body: '高而骨感的老人', pose: '拄剑杖耐心等候', prop: '剑杖与旧茶囊', palette: '象牙白、松绿、灰褐' }),
  npc('murongzi', '慕容子', 'river_market', .18, '第49回相关人物', '江湖小报采写助理', '河市今天的价牌改了三次，我都记下来了。要是慕容嫣问起，可别说我只会跑腿。', '新闻不能只听一边，卖鱼的、运货的和掌柜都得问。', { face: '小椭圆脸、灵动大眼', body: '娇小轻快青年', pose: '弯腰速记、探头观察', prop: '纸卷与炭笔', palette: '姜黄、靛蓝、纸白' }),
  npc('xinpusen', '辛普森', 'scale_contract_lane', .82, '第68回', '异域求亲者', '这条红绳的长度、礼盒的重量、见面的时辰，我都量过。可人心怎么量，没人教我。', '规矩能让人不失礼，不能替人做决定。', { face: '长窄脸、高鼻、浅眼窝', body: '极高瘦、肩窄腿长', pose: '拘谨鞠躬、手持量绳', prop: '量绳与花束', palette: '酒红、米金、灰蓝' }),
  npc('mazhuozi', '马卓子', 'jiangnan_dock', .14, '第69回', '假捕快／江湖骗子', '我这腰牌当然是真的……至少绳子是真的。码头人多，掌柜可别乱声张。', '我只是混口饭吃，真要查案，还得找穿对官靴的人。', { face: '狐形窄脸、近眼距、薄下巴', body: '瘦小含胸', pose: '护住假腰牌、目光游移', prop: '假腰牌与粗绳', palette: '旧褐、灰蓝、暗红' }),
  npc('yinshisan', '殷十三', 'jiangnan_dock', .86, '第71回', '冷面江湖客', '货船换了缆绳，码头却没人承认。越是安静，越说明有人花钱让他们闭嘴。', '我不替谁伸冤，只替证据找个能开口的人。', { face: '长锐脸、下垂冷眼', body: '极高瘦、肩线平直', pose: '静立藏锋、重心不动', prop: '扇刃与暗袋', palette: '墨黑、暗朱、银灰' }),
  npc('nangongcanhua', '南宫残花', 'jiangnan_branch', .18, '第73回', '花商／可疑江湖客', '退菜盘里有股不该出现的花粉味。别看我，我卖花，却从不往灶台上撒。', '紫藤花粉遇热会发苦，查查香料袋的封口。', { face: '梨形柔脸、睡眼、弯唇', body: '柔韧中等体态', pose: '旋身递花、脚尖外撇', prop: '花篮与丝绳', palette: '薰衣紫、嫩绿、月白' }),
  npc('xiezhongda', '谢仲达', 'guild_warehouse', .18, '第73回', '六扇门调查者', '货栈的封条不是给箱子看的，是给经手人看的。谁碰过，手上总会留下蜡粉。', '先查手，再查口供。人会撒谎，蜡粉不会。', { face: '矩形脸、伤眉、短须', body: '宽肩精干中年', pose: '方正守位、左手压案卷', prop: '链钩与案卷', palette: '藏青、铁灰、暗金' }),
  npc('hujiaoe', '胡娇娥', 'river_yard', .82, '第74回', '强势江湖女客', '转运场的人说酒坛没动过，可封泥上多了一道指甲印。谁当我只会喝酒？', '坛子重了半斤，里头换的不是酒，是湿沙。', { face: '宽心形脸、明亮锐眼', body: '强壮丰润成年女性', pose: '宽站叉腰、单臂抱坛', prop: '酒坛与长勺', palette: '砖红、黑褐、铜金' }),
  npc('luyiming', '陆一鸣', 'jiangnan_spice_workshop', .16, '第17回', '衡山派弟子', '香料架摆得像剑阵，可惜东南角空了一格。若有人进出，必从那里绕。', '门派规矩不是用来摆威风的，是让后来人少走弯路。', { face: '端正椭圆脸、平直眉', body: '高挑匀称剑客', pose: '立如松、剑鞘贴身', prop: '长剑与门派旗', palette: '雾蓝、银白、松墨' }),
  npc('zhuxiaoyun', '祝小芸', 'north_road', .18, '第17回', '衡山派女弟子', '北坡风大，旗子倒了不一定是打斗，也可能是绳扣没系紧。先看结，再拔剑。', '我师兄总说稳重，可追线索的时候，快一步也很要紧。', { face: '紧凑菱形脸、上挑眼', body: '短小结实少女', pose: '高马尾转身拔短剑', prop: '短剑与门派签', palette: '薄荷绿、月白、黛青' }),
  npc('hongdashi', '洪大师', 'yard', .82, '第48回', '落魄武馆师父', '后院够开三张练功席，就是场租比拳脚还硬。掌柜要不要试试我的护院课？', '站桩先看脚，不看嗓门。人站得稳，桌椅才保得住。', { face: '巨大方脸、重眉、宽鼻', body: '桶形巨躯、粗臂', pose: '扎马步、木杖竖立', prop: '木杖与租账', palette: '赭黄、炭灰、麻白' }),
  npc('baicuiping', '白翠萍', 'charity_granary', .18, '第4回', '李大嘴母亲', '眼睛看不清，耳朵可没闲着。左边粮袋落地是实声，右边那几袋听着空。', '别扶我，我认得粮食的味，也认得人说谎时的喘气。', { face: '圆皱脸、眯眼、慈嘴角', body: '矮壮老妇', pose: '侧耳拄杖、脚步稳', prop: '木杖与针线袋', palette: '靛蓝、灰白、枣褐' }),
  npc('xiaoliu', '小刘', 'east_gate', .18, '第27回', '丐帮弟子', '关口今天来了三拨生面孔，只有一拨肯给乞丐看路引。越遮掩的，越值得记。', '别小看一只空碗，街上什么话都会落进去。', { face: '长窄脸、大耳、机灵眼', body: '高瘦青年', pose: '低身持竹杖、耳听四方', prop: '竹杖与帮派碗', palette: '橄榄绿、破褐、暗红' }),
  npc('gongzhanglao', '恭长老', 'old_banquet_kitchen', .82, '第27回', '丐帮长老', '旧灶院的锅气散了，人情还在。剩菜若处置得当，也能救急，不必糟蹋。', '江湖帮派先得管住自己的手，再谈管天下人的事。', { face: '宽风霜脸、单侧重眼皮', body: '高大厚实老人', pose: '沉肩拄杖、压场稳重', prop: '雕杖与酒葫芦', palette: '暗朱、炭黑、麻灰' }),
  npc('gezhanggui', '葛掌柜', 'rain_ferry', .82, '七侠镇商户群像', '雨夜渡口什么都贵，唯独争辩免费。可要算清损耗，还是得拿账本说话。', '船误一刻，菜价就多一分。别嫌我细，这是做买卖的命。', { face: '窄矩形脸、细须、薄眼', body: '中等微软体态', pose: '捏票核算、脚尖内收', prop: '小算盘与收据', palette: '鼠尾绿、象牙白、玉坠红' }),
  npc('meili', '美丽', 'canal_checkpoint', .14, '第12回', '姐妹杀手之一', '路障这么窄，连我的刀都过不去。掌柜要开路，先说好谁搬、谁赔。', '我妹妹嘴快，我刀快。今天都先收着。', { face: '长矩形脸、宽鼻、小眼', body: '极高大肌肉型女性', pose: '双脚钉地、双刀下垂', prop: '成对巨砍刀', palette: '深朱、黑铁、古铜' }),
  npc('budazhe', '不打折', 'canal_checkpoint', .86, '第12回', '姐妹杀手之二', '名字叫不打折，做买卖倒能谈。你要雇我们护车，先把饭钱算明白。', '我姐姐看着凶，其实最怕账算不清。', { face: '圆脸、宽鼻、大眼', body: '极矮壮、低重心女性', pose: '蹲身弹步、双钩外张', prop: '双钩刃与价签', palette: '苔绿、黑铜、赭黄' }),
  npc('jinzhanglao', '金长老', 'merchant_alliance_hall', .18, '第12回', '毒物长老', '会馆里那只蝎笼不是我的。我的蝎子吃得精细，绝不会把尾刺磨成这样。', '毒物也讲习性，胡乱栽赃的人不懂。', { face: '鹰形三角脸、窄眼', body: '极瘦高老人', pose: '曲指提笼、身体前探', prop: '蝎笼与针匣', palette: '乌金、墨黑、琥珀' }),
  npc('yinzhanglao', '银长老', 'old_ledger_vault', .82, '第12回', '毒物长老', '水道边有蛇蜕，却不是活蛇留下的。有人故意摆出来吓退查账的人。', '真蛇怕震，假蛇怕火。别乱踩机关。', { face: '月牙圆脸、小锐眼', body: '矮小佝偻老妇', pose: '侧身护篮、夹子前探', prop: '蛇篮与药夹', palette: '银蓝、冷灰、墨青' }),
  npc('zhenggongzi', '郑公子', 'money_house', .82, '前80回客商群像', '兑票要排队？我可以等，只是我的香囊不能和鱼货放在一处。', '钱庄规矩多，我也不是全不讲理。先把这张票验清楚。', { face: '软椭圆脸、宽眼距、慵懒眼', body: '窄肩微肚腩青年', pose: '倚扇后仰、重心松散', prop: '香扇与钱袋', palette: '钴蓝、乳白、亮金' }),
  npc('chenfuren', '陈夫人', 'guild_office', .82, '前80回商户群像', '商会说女眷不该问账，我偏要问。家里的钥匙在我手里，哪笔货钱对不上，我最先知道。', '印章可以借，钥匙不能。谁动过柜子，先查谁。', { face: '方下颌、高颧骨、平直锐眼', body: '高大结实中年女性', pose: '抱账立正、双臂收紧', prop: '钥匙串与家账', palette: '焦橙、深青、铜金' }),
];

function addUnique(list, item) { if (!list.some(function (entry) { return entry.id === item.id; })) list.push(item); }

function makeDialogue(dialogues, id, entry, text, choices) {
  dialogues[id] = { speaker: entry.name, speakerArtId: entry.id, text: text, presentation: 'bubble', choices: choices };
}

function apply(maps, dialogues) {
  ROSTER.forEach(function (entry) {
    var map = maps.find(function (candidate) { return candidate.id === entry.mapId; });
    var done = 'npcv37-' + entry.id + '-met';
    var x;
    var y;
    if (!map) throw new Error('Missing v37 NPC map: ' + entry.mapId);
    x = Math.round(map.width * entry.ratio);
    y = Math.max(236, map.height - 42);
    addUnique(map.npcs, { id: 'npcv37-' + entry.id, artId: entry.id, name: entry.name, x: x, y: y, facing: entry.ratio > .5 ? 'left' : 'right', showName: true, blocksMovement: false, collisionRadiusX: 10, collisionRadiusY: 6, stance: entry.role.indexOf('杀手') >= 0 ? 'guarded' : 'relaxed', populationV37: true });
    addUnique(map.hotspots, { id: 'npcv37-' + entry.id + '-meet', x: x, y: y, radius: 64, discoverRadius: 106, label: entry.name, type: 'dialogue', dialogue: 'npcv37-' + entry.id + '-meet', unless: [done], priority: 20, populationV37: true });
    addUnique(map.hotspots, { id: 'npcv37-' + entry.id + '-repeat', x: x, y: y, radius: 64, discoverRadius: 96, label: entry.name, type: 'dialogue', dialogue: 'npcv37-' + entry.id + '-repeat', requires: [done], priority: 12, populationV37: true });
    makeDialogue(dialogues, 'npcv37-' + entry.id + '-meet', entry, entry.dialogue, [{ label: '记下这番话', action: 'flag', flag: done }, { label: '稍后再聊', action: 'close' }]);
    makeDialogue(dialogues, 'npcv37-' + entry.id + '-repeat', entry, entry.followup, [{ label: '告辞', action: 'close' }]);
  });
  return maps;
}

function applyArt(npcArts) {
  ROSTER.forEach(function (entry) {
    var child = ['moxiaobei', 'qiuxiaodong', 'xiaohu', 'niuniu'].indexOf(entry.id) >= 0;
    npcArts[entry.id] = { atlas: '@npc-pop-v37/npcs/classic-v37/' + entry.slug + '.png', portrait: '@npc-pop-v37/npcs/classic-v37/portraits/' + entry.slug + '.webp', frameSize: FRAME_SIZE, pivot: PIVOT, clips: { idle: [0], walk: [0], interact: [0], hit: [0] }, fps: { idle: 1, walk: 1, interact: 1, hit: 1 }, displayScale: child ? .92 : 1.05, shadowScale: .94, shadowAlpha: .11 };
  });
  return npcArts;
}

module.exports = { roster: ROSTER, apply: apply, applyArt: applyArt };
