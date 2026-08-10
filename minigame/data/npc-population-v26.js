'use strict';

var FRAME_SIZE = { width: 192, height: 256 };
var PIVOT = { x: 96, y: 244 };
var PLACEMENTS = {};

function person(id, name, mapId, ratio, dialogue, mode, options) {
  return Object.assign({ id: id, name: name, mapId: mapId, ratio: ratio, dialogue: dialogue, mode: mode }, options || {});
}

var ROSTER = [
  person('herbalist-qiu', '裘百草', 'inn', 0.32, '掌柜的，后院晒着的不是野草，是能救急的车前叶。只是少了一束扎药的青麻。', 'quest', { quest: 'herb-bundle' }),
  person('opera-lady-su', '苏三娘', 'street', 0.44, '戏箱的铜扣被挤歪了。若能替我扶正，今晚给客栈唱一折热闹的。', 'local', { job: job('repair', '戏箱铜扣', 'spice-crate', '铜扣已经重新咬合，戏箱能安全搬动了。', { coin: 3 }) }),
  person('coppersmith-han', '韩铜匠', 'yard', 0.72, '废驿站那盏旧灯的铜芯是我师父做的。替我找回来，我给客栈修一套耐烧灯罩。', 'quest', { quest: 'copper-wick', shop: 'han-armory', shopLabel: '看看兵器' }),
  person('noodle-vendor-ma', '马嫂', 'street', 0.62, '面摊缺一把干柴。帮我从摊后捆稳，我告诉你今天哪一拨客人最舍得花钱。', 'local', { shop: 'ma-goods', shopLabel: '看看杂货', job: job('collect', '散落干柴', 'broken-rope', '干柴捆好，马嫂记下了客栈的招牌菜。', { ingredient: 1 }) }),
  person('porter-alu', '阿禄', 'jiangnan_dock', 0.74, '香料箱不能只看封绳，底板一响就说明受过潮。劳烦替我敲一遍。', 'local', { job: job('investigate', '受潮箱底', 'spice-crate', '第三只箱子的底板声音发闷，已单独标记。', { coin: 2 }) }),
  person('storyteller-shen', '沈半卷', 'tea_shed', 0.68, '江湖传闻最怕只听上半卷。你给我一碗茶钱，我便把商路旧案的下半句说完。', 'offer', { offer: offer('请一碗茶', { coin: -2 }, '传闻记下了：旧账册曾在石桥换过一次车。') }),
  person('seamstress-wen', '温裁缝', 'locust_lane', 0.76, '告示纸角粘着一缕靛蓝线，不是官差衣料。替我取下，我能辨出是哪家货栈的布。', 'local', { shop: 'wen-jewelry', shopLabel: '看看首饰', job: job('collect', '靛蓝线头', 'notice-scroll', '线头来自商会货栈常用的封箱布。', { coin: 2 }) }),
  person('umbrella-maker-luo', '罗伞娘', 'rain_ferry', 0.72, '渡口的油布被人割开，雨水一落，真假货印都会糊成一团。替我去分店找块旧油布。', 'quest', { quest: 'ferry-oilcloth' }),
  person('courier-aqi', '阿七', 'east_gate', 0.56, '我丢了一封没有署名的短札，风往老槐树巷吹。信不值钱，封口的蜡印却不能落进别人手里。', 'quest', { quest: 'lost-letter' }),

  person('salt-merchant-xu', '徐盐客', 'river_market', 0.34, '这一撮盐看着白，入口却发苦。你帮我对着河水验一验，是盐坏了，还是秤被动过。', 'local', { job: job('recipeSample', '苦盐样本', 'ingredient-basket', '盐里混入了受潮的旧卤晶，来源并非本地盐船。', { ingredient: 1 }) }),
  person('grain-inspector-lin', '林司斗', 'grain_market', 0.68, '粮价能骗人，标准斗不会。我的校准砣被送去秤契巷，取回来才能当街验粮。', 'quest', { quest: 'grain-weight' }),
  person('boatwoman-he', '何大桨', 'jiangnan_dock', 0.52, '雨夜有人把系船结换成了活扣。去渡口看一眼，若还留着原绳，我便知道是哪条船。', 'quest', { quest: 'mooring-knot' }),
  person('ticket-clerk-fang', '方票手', 'money_house', 0.62, '兑票日期被人抹得太齐。替我把三枚木筹按先后排回去，底账自然会说话。', 'local', { job: job('mechanism', '兑票木筹', 'ledger', '木筹顺序复原，重复兑付集中在同一个雨夜。', { coin: 3 }) }),
  person('scale-mender-ge', '葛校秤', 'scale_contract_lane', 0.42, '修秤不难，难的是找到谁先换了标准。我有一枚旧砣落在商会账房，替我取来。', 'quest', { quest: 'old-scale-weight' }),
  person('spice-broker-rong', '容香娘', 'jiangnan_spice_workshop', 0.70, '这批香料的尾香像旧灶灰。你去灶院取一撮冷灰，我便能辨出调包时辰。', 'quest', { quest: 'cold-stove-ash', gate: ['c11-market-traced'] }),
  person('warehouse-foreman-dou', '窦把头', 'guild_warehouse', 0.72, '货钩松一寸，整箱证据就会摔碎。替我把钩栓重新扣紧。', 'local', { job: job('repair', '松动货钩', 'broken-rope', '货钩已固定，关键货箱不会在装卸时掉包。', { coin: 3 }) }),
  person('scribe-pei', '裴抄手', 'guild_office', 0.68, '账页少一张不可怕，怕的是页码还连得上。帮我查查桌下那本副册。', 'local', { job: job('investigate', '桌下副册', 'ledger', '副册夹层留下被撕页的纤维，缺页来自同一本账。', { coin: 2 }) }),
  person('caravan-matriarch-shao', '邵老夫人', 'merchant_alliance_hall', 0.30, '商路不是会馆里画出来的，是一车一车走出来的。你若肯听，我便说说三十年前那条赈灾路。', 'offer', { offer: offer('听旧商路', null, '邵老夫人指出：旧路绕开票号，却从未绕开沿途客栈。') }),

  person('bridge-mason-zhao', '赵石匠', 'stone_bridge', 0.66, '桥北第三块石板松了，东关存着同批石楔。取一枚来，我把重车道重新封稳。', 'quest', { quest: 'bridge-wedge' }),
  person('woodcutter-yun', '云娘', 'yard', 0.42, '湿柴该晒，干柴该遮。掌柜若把后院分清楚，午市能少烧两成柴。', 'offer', { offer: offer('请教堆柴法', { ingredient: 1 }, '云娘帮忙重新分垛，后厨得到一份可用干柴。') }),
  person('ferryman-wu', '吴艄公', 'rain_ferry', 0.34, '看水不看浪，看船不看旗。真正载重的船，雨里吃水线藏不住。', 'offer', { offer: offer('记下辨船法', null, '已掌握雨夜辨认重载货船的方法。') }),
  person('boat-tracker-qiao', '乔纤夫', 'river_yard', 0.30, '拖缆磨损得不对，像是有人半路解开又重新打结。帮我把旧结拆开看看。', 'local', { job: job('investigate', '反系拖缆', 'broken-rope', '绳芯夹着异地芦苇，货船曾在上游靠岸。', { coin: 2 }) }),
  person('paper-apprentice-mo', '莫青纸', 'paper_mill', 0.76, '纸浆里混进了不该有的蓝麻。请帮我把三只浆桶逐一标出来。', 'local', { job: job('collect', '蓝麻纤维', 'notice-scroll', '蓝麻只出现在第二只浆桶，污染不是偶然。', { coin: 2 }) }),
  person('night-watchman-lai', '赖更夫', 'old_post', 0.74, '我昨夜听见三更后还有脚步。替我看灯座旁的灰，别踩乱了。', 'local', { job: job('investigate', '灯座脚印', 'lantern', '灰上留着向内不向外的脚印，来人仍可能藏在驿站深处。', { coin: 2 }) }),
  person('retired-guard-cao', '曹老巡', 'east_gate', 0.34, '新差役看印章，老差役看拿印的人。手腕总往袖里缩，多半心里有鬼。', 'offer', { offer: offer('请教查验经验', null, '曹老巡提醒：倒印者右手腕有旧伤。') }),
  person('cartwright-lu', '鲁车匠', 'north_road', 0.72, '断轮能修，错轴不能凑合。河滩转运场还有一根同制轴销，替我取来。', 'quest', { quest: 'cart-axle-pin' }),
  person('fisherman-jiang', '江网子', 'river_market', 0.78, '渔网挂住了一块带印木牌，帮我从网眼里解出来，别把字磨掉。', 'local', { job: job('collect', '网中木牌', 'road-plaque', '木牌属于一艘未登记的短途货船。', { coin: 3 }) }),

  person('physician-ning', '宁秋白', 'charity_granary', 0.72, '领粮的人腹痛相似，不像饿出来的。茶棚还留着同批水样，取来让我验一验。', 'quest', { quest: 'tea-water-sample' }),
  person('fortune-reader-yan', '晏三签', 'locust_lane', 0.34, '我不替人算命，只替人排顺序。三支签对应三张告示，你来试试哪张最晚贴。', 'local', { job: job('mechanism', '三支旧签', 'notice-scroll', '签序与浆糊干湿吻合，最晚那张告示确实是伪造的。', { coin: 2 }) }),
  person('runaway-apprentice-tang', '唐小榆', 'paper_alley', 0.72, '工具袋的搭扣坏了，我不想回师门挨训。帮我修好，我把后巷暗门的位置告诉你。', 'local', { job: job('repair', '工具袋搭扣', 'spice-crate', '搭扣修好，唐小榆在地图上画出了后巷暗门。', { coin: 2 }) }),
  person('debt-collector-xiao', '萧执契', 'guild_office', 0.28, '欠债不是罪，拿同一张契逼人还两次才是。你若愿意，我可以指出哪枚封蜡是假的。', 'offer', { offer: offer('请他辨契', null, '萧执契确认：副契封蜡比正文晚了至少半年。') }),
  person('refugee-father-gu', '顾远山', 'tea_shed', 0.36, '我把家传木牌落在棚外，不值钱，却是孩子认家的记号。劳烦帮我找回来。', 'local', { job: job('collect', '家传木牌', 'road-plaque', '木牌在泥里找回，顾远山终于松了一口气。', { medicine: 1 }) }),
  person('tea-picker-qing', '青禾', 'jiangnan_branch', 0.70, '退回的菜都有苦尾，可新茶没有。取一点残汤与茶叶对照，就能排除水源。', 'local', { job: job('recipeSample', '茶汤对照', 'returned-dishes', '茶汤清甜，失味并非来自分店水源。', { ingredient: 1 }) }),
  person('cook-helper-pang', '庞小灶', 'old_banquet_kitchen', 0.68, '旧宴锅底有两层火色。帮我刮下一点黑垢，能看出当年封灶前做过什么菜。', 'local', { gate: ['c11-shiwei-trusted'], job: job('recipeSample', '宴锅黑垢', 'returned-dishes', '黑垢里有桂皮与旧油香，残谱缺失的一味得到确认。', { ingredient: 1 }) }),
  person('locksmith-qi', '齐开锁', 'old_ledger_vault', 0.70, '账柜锁芯少了一齿，会馆机关里可能还卡着断片。替我取来，我便能无损开柜。', 'quest', { quest: 'vault-lock-tooth', gate: ['c08-vault-open'] }),
  person('map-seller-ye', '叶百程', 'street', 0.25, '我卖的图被人改了一条岔路。东关路牌背面若有同样刀痕，就能证明有人故意引错商队。', 'quest', { quest: 'altered-route' })
];

function job(type, label, asset, toast, reward) {
  return { type: type, label: label, asset: asset, toast: toast, reward: reward || {} };
}

function offer(label, reward, toast) {
  return { label: label, reward: reward || null, toast: toast };
}

var QUESTS = {
  'herb-bundle': quest('yard', 0.28, 'collect', '扎药青麻', 'ingredient-basket', '青麻晒得正好，可以带回给裘百草。', { medicine: 1, coin: 2 }),
  'copper-wick': quest('old_post', 0.62, 'collect', '旧灯铜芯', 'lantern', '铜芯藏在灯座积灰下，仍能修复。', { coin: 4 }),
  'ferry-oilcloth': quest('jiangnan_branch', 0.38, 'collect', '旧防雨油布', 'returned-dishes', '油布边缘完整，足够修补渡口雨棚。', { coin: 4 }),
  'lost-letter': quest('locust_lane', 0.58, 'collect', '无名短札', 'notice-scroll', '短札夹在老槐树根后，蜡印没有破。', { coin: 3 }),
  'grain-weight': quest('scale_contract_lane', 0.72, 'collect', '标准校准砣', 'road-plaque', '校准砣重量无误，可以带回粮市公开验秤。', { coin: 5 }),
  'mooring-knot': quest('rain_ferry', 0.62, 'investigate', '被换的船结', 'broken-rope', '活扣绳尾留着码头三号泊位的蓝漆。', { coin: 4 }),
  'old-scale-weight': quest('guild_office', 0.58, 'collect', '旧制秤砣', 'ledger', '秤砣被压在副账下，刻度与现行标准不同。', { coin: 5 }),
  'cold-stove-ash': quest('old_banquet_kitchen', 0.46, 'recipeSample', '冷灶灰样', 'returned-dishes', '灰中混着旧香料壳，调包时间可以进一步缩小。', { ingredient: 2 }),
  'bridge-wedge': quest('east_gate', 0.76, 'collect', '同批石楔', 'road-plaque', '石楔尺寸吻合，可以加固石桥北侧重车道。', { coin: 4 }),
  'cart-axle-pin': quest('river_yard', 0.72, 'collect', '同制轴销', 'spice-crate', '轴销没有裂纹，足够修复北坡的断轮车。', { coin: 5 }),
  'tea-water-sample': quest('tea_shed', 0.74, 'recipeSample', '同批茶水', 'ingredient-basket', '水样带有轻微苦涩，可能与义仓腹痛有关。', { medicine: 2 }),
  'vault-lock-tooth': quest('merchant_alliance_hall', 0.66, 'collect', '断裂锁齿', 'ledger', '锁齿卡在机关槽底，纹路与旧账柜一致。', { coin: 6 }),
  'altered-route': quest('east_gate', 0.46, 'investigate', '路牌刀痕', 'road-plaque', '刀痕走向与改图完全一致，商队确实被人故意引偏。', { coin: 4 })
};

function quest(mapId, ratio, type, label, asset, toast, reward) {
  return { mapId: mapId, ratio: ratio, type: type, label: label, asset: asset, toast: toast, reward: reward };
}

function pointInPolygon(point, polygon) {
  var inside = false;
  var i;
  var j;
  for (i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    if (((polygon[i][1] > point.y) !== (polygon[j][1] > point.y))
      && point.x < (polygon[j][0] - polygon[i][0]) * (point.y - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  var dx = end[0] - start[0];
  var dy = end[1] - start[1];
  var length = dx * dx + dy * dy;
  var t = length ? ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / length : 0;
  var x;
  var y;
  t = Math.max(0, Math.min(1, t));
  x = start[0] + t * dx;
  y = start[1] + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function polygonDistance(point, polygon) {
  var result = Infinity;
  var index;
  for (index = 0; index < polygon.length; index += 1) {
    result = Math.min(result, distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]));
  }
  return result;
}

function insideExit(point, exit) {
  var zone = exit.zone || exit;
  return point.x >= zone.x - 46 && point.x <= zone.x + zone.width + 46
    && point.y >= zone.y - 30 && point.y <= zone.y + zone.height + 30;
}

function validPoint(map, point, avoidHotspots) {
  var floor = (map.walkable || []).some(function (polygon) {
    return pointInPolygon(point, polygon) && polygonDistance(point, polygon) >= 14;
  });
  if (!floor) return false;
  if ((map.obstacles || []).some(function (obstacle) {
    return pointInPolygon(point, obstacle.polygon) || polygonDistance(point, obstacle.polygon) < 24;
  })) return false;
  if (Object.keys(map.spawns || {}).some(function (id) { return Math.hypot(point.x - map.spawns[id].x, point.y - map.spawns[id].y) < 62; })) return false;
  if ((map.exits || []).some(function (exit) { return insideExit(point, exit); })) return false;
  if ((map.npcs || []).some(function (npc) { return Math.hypot(point.x - npc.x, point.y - npc.y) < 70; })) return false;
  if (avoidHotspots && (map.hotspots || []).some(function (spot) { return Math.hypot(point.x - spot.x, point.y - spot.y) < 44; })) return false;
  return true;
}

function safePoint(map, ratio, avoidHotspots) {
  var base = Math.round(map.width * ratio);
  var offsets = [0, 72, -72, 144, -144, 216, -216, 288, -288];
  var ys = [318, 306, 290, 326, 274, 254, 234];
  var y;
  var x;
  for (y = 0; y < ys.length; y += 1) {
    for (x = 0; x < offsets.length; x += 1) {
      var point = { x: Math.max(30, Math.min(map.width - 30, base + offsets[x])), y: Math.min(map.height - 18, ys[y]) };
      if (validPoint(map, point, avoidHotspots)) return point;
    }
  }
  throw new Error('No safe NPC population point on map ' + map.id + ' near ratio ' + ratio);
}

function addUnique(list, item) {
  if (!list.some(function (entry) { return entry.id === item.id; })) list.push(item);
}

function combine(first, second) {
  return (first || []).concat(second || []);
}

function dialogue(dialogues, id, speaker, text, choices) {
  dialogues[id] = { speaker: speaker, text: text, presentation: 'bubble', choices: choices };
}

function withShop(entry, choices) {
  var result = (choices || []).slice();
  if (entry.shop) result.splice(Math.max(0, result.length - 1), 0, {
    label: entry.shopLabel || '看看货物',
    action: 'shop',
    shopId: entry.shop
  });
  return result;
}

function addNpcHotspot(map, entry, point, suffix, requires, unless, priority) {
  addUnique(map.hotspots, {
    id: 'npcv26-' + entry.id + '-' + suffix,
    x: point.x,
    y: point.y,
    radius: 64,
    discoverRadius: 108,
    label: entry.name,
    type: 'dialogue',
    dialogue: 'npcv26-' + entry.id + '-' + suffix,
    requires: requires,
    unless: unless,
    priority: priority,
    populationV26: true
  });
}

function addRepeatDialogue(map, dialogues, entry, point, doneFlag) {
  var id = 'npcv26-' + entry.id + '-repeat';
  addNpcHotspot(map, entry, point, 'repeat', combine(entry.gate, [doneFlag]), null, 18);
  dialogue(dialogues, id, entry.name, entry.shop
    ? '事情已经有了着落。铺子照常开着，掌柜还要看看什么？'
    : '这件事已经有了着落。往后若有新消息，我会到客栈告知掌柜。', withShop(entry, [{ label: '回头再见', action: 'close' }]));
}

function applyQuest(maps, dialogues, entry, map, point) {
  var definition = QUESTS[entry.quest];
  var targetMap = maps.find(function (item) { return item.id === definition.mapId; });
  var started = 'npcv26-' + entry.id + '-started';
  var itemFlag = 'npcv26-' + entry.id + '-item';
  var done = 'npcv26-' + entry.id + '-done';
  var taskPoint = safePoint(targetMap, definition.ratio, false);
  PLACEMENTS[entry.id] = { npc: point, task: taskPoint, taskMapId: targetMap.id, asset: definition.asset };

  addNpcHotspot(map, entry, point, 'start', entry.gate, [started, done], 34);
  addNpcHotspot(map, entry, point, 'progress', combine(entry.gate, [started]), [itemFlag, done], 32);
  addNpcHotspot(map, entry, point, 'finish', combine(entry.gate, [itemFlag]), [done], 38);
  dialogue(dialogues, 'npcv26-' + entry.id + '-start', entry.name, entry.dialogue, withShop(entry, [
    { label: '接下委托', action: 'flag', flag: started },
    { label: '稍后再说', action: 'close' }
  ]));
  dialogue(dialogues, 'npcv26-' + entry.id + '-progress', entry.name, '要找的东西还在路上。别着急，先按线索去对应场景仔细看看。', [{ label: '记下地点', action: 'close' }]);
  dialogue(dialogues, 'npcv26-' + entry.id + '-finish', entry.name, '正是它。事情办得利落，这份谢礼请掌柜收下。', [
    { label: '收下谢礼', action: 'reward', reward: definition.reward, flag: done }
  ]);
  addUnique(targetMap.hotspots, {
    id: 'npcv26-task-' + entry.id,
    x: taskPoint.x,
    y: taskPoint.y,
    radius: 62,
    discoverRadius: 112,
    label: definition.label,
    type: definition.type,
    requires: combine(entry.gate, [started]),
    unless: [itemFlag],
    effects: { flag: itemFlag },
    toast: definition.toast,
    priority: 30,
    populationV26: true
  });
  addRepeatDialogue(map, dialogues, entry, point, done);
}

function applyLocal(maps, dialogues, entry, map, point) {
  var started = 'npcv26-' + entry.id + '-started';
  var done = 'npcv26-' + entry.id + '-done';
  var taskPoint = safePoint(map, Math.max(0.12, Math.min(0.88, entry.ratio + (entry.ratio > 0.55 ? -0.18 : 0.18))), false);
  var reward = Object.assign({}, entry.job.reward || {}, { flag: done });
  PLACEMENTS[entry.id] = { npc: point, task: taskPoint, taskMapId: map.id, asset: entry.job.asset };
  addNpcHotspot(map, entry, point, 'start', entry.gate, [started, done], 30);
  dialogue(dialogues, 'npcv26-' + entry.id + '-start', entry.name, entry.dialogue, withShop(entry, [
    { label: '搭把手', action: 'flag', flag: started },
    { label: '先忙别的', action: 'close' }
  ]));
  addUnique(map.hotspots, {
    id: 'npcv26-job-' + entry.id,
    x: taskPoint.x,
    y: taskPoint.y,
    radius: 60,
    discoverRadius: 106,
    label: entry.job.label,
    type: entry.job.type,
    requires: combine(entry.gate, [started]),
    unless: [done],
    effects: reward,
    toast: entry.job.toast,
    priority: 28,
    populationV26: true
  });
  addRepeatDialogue(map, dialogues, entry, point, done);
}

function applyOffer(dialogues, entry, map, point) {
  var done = 'npcv26-' + entry.id + '-done';
  var choice = entry.offer.reward
    ? { label: entry.offer.label, action: 'reward', reward: entry.offer.reward, flag: done }
    : { label: entry.offer.label, action: 'flag', flag: done };
  PLACEMENTS[entry.id] = { npc: point };
  addNpcHotspot(map, entry, point, 'offer', entry.gate, [done], 24);
  dialogue(dialogues, 'npcv26-' + entry.id + '-offer', entry.name, entry.dialogue, [choice, { label: '以后再问', action: 'close' }]);
  addRepeatDialogue(map, dialogues, entry, point, done);
}

function apply(maps, dialogues) {
  ROSTER.forEach(function (entry) {
    var map = maps.find(function (item) { return item.id === entry.mapId; });
    var point;
    if (!map) throw new Error('Missing NPC map: ' + entry.mapId);
    point = safePoint(map, entry.ratio, false);
    addUnique(map.npcs, {
      id: 'npcv26-' + entry.id,
      artId: entry.id,
      name: entry.name,
      x: point.x,
      y: point.y,
      facing: entry.ratio > 0.55 ? 'left' : 'right',
      requires: entry.gate || null,
      showName: false,
      blocksMovement: false,
      collisionRadiusX: 10,
      collisionRadiusY: 6,
      populationV26: true
    });
    if (entry.mode === 'quest') applyQuest(maps, dialogues, entry, map, point);
    else if (entry.mode === 'local') applyLocal(maps, dialogues, entry, map, point);
    else applyOffer(dialogues, entry, map, point);
  });
  return maps;
}

function applyArt(npcArts, mapArts) {
  ROSTER.forEach(function (entry) {
    var placement = PLACEMENTS[entry.id];
    npcArts[entry.id] = {
      atlas: '@npc-pop-v26/npcs/' + entry.id + '.png',
      frameSize: FRAME_SIZE,
      pivot: PIVOT,
      clips: { idle: [0], walk: [0], interact: [0], hit: [0] },
      fps: { idle: 1, walk: 1, interact: 1, hit: 1 },
      displayScale: 1.05,
      shadowScale: 0.94,
      shadowAlpha: 0.11
    };
    if (!placement || !placement.task || !mapArts[placement.taskMapId]) return;
    mapArts[placement.taskMapId].props = mapArts[placement.taskMapId].props || [];
    addUnique(mapArts[placement.taskMapId].props, {
      id: 'npcv26-prop-' + entry.id,
      src: '@scene-core-v23/props/core/' + placement.asset + '.png',
      x: placement.task.x,
      y: placement.task.y,
      sortY: placement.task.y,
      scale: 0.25,
      pivot: { x: 96, y: 183 },
      requires: ['npcv26-' + entry.id + '-started'],
      unless: ['npcv26-' + entry.id + '-done'],
      decorative: true,
      optional: true,
      populationV26: true
    });
  });
}

module.exports = { roster: ROSTER, quests: QUESTS, placements: PLACEMENTS, apply: apply, applyArt: applyArt };
