'use strict';

// Ambient population is deliberately low priority: it gives every map a lived-in
// identity without competing with chapter-critical interactions.
var SCENES = {
  inn: scene('常住脚商', 'merchant', 250, 318, '门边风灯', 'lantern', 238, 312,
    '住店几日才知道，长风客栈最值钱的不是房钱，是掌柜肯替客人把难处听完。',
    '灯罩内侧留着细薄烟痕，昨夜有人很晚才从街上回来。'),
  yard: scene('劈柴伙计', 'townsman_old', 650, 300, '晾晒菜篮', 'ingredient-basket', 350, 304,
    '后院的柴要按干湿分垛，不然灶火一急，前堂催得再凶也出不了菜。',
    '菜篮按根茎、叶菜分成两层，说明后厨已经为午市提前备料。'),
  street: scene('卖花姑娘', 'townswoman_young', 1000, 310, '摊边货篮', 'ingredient-basket', 650, 310,
    '十字街看着热闹，哪家铺子先开门、哪辆车绕路，都能看出今日生意的风向。',
    '货篮底压着几片湿芦叶，货物应当刚从河道方向运来。'),
  locust_lane: scene('代写书生', 'townsman_old', 780, 300, '旧告示卷', 'notice-scroll', 440, 265,
    '告示上的官样文章未必可信，纸角、浆糊和围观人的脸色反而更诚实。',
    '旧告示背面有反复揭贴的痕迹，最近有人刻意改变巷里的消息。'),
  tea_shed: scene('赶路脚夫', 'merchant', 300, 300, '歇脚风灯', 'lantern', 800, 300,
    '茶棚里一句闲话能比驿站公文跑得更快，只是听来的消息得先分真假。',
    '风灯灯芯偏向东侧，午前一直有强风沿商路吹来。'),
  east_gate: scene('挑担农人', 'townsman_old', 520, 300, '关门路牌', 'road-plaque', 760, 300,
    '今早查路引查得严，送菜进镇都排了半刻钟，像是在防什么人混出去。',
    '路牌新添了一道向北的刻痕，应是巡路差役留下的临时记号。'),
  stone_bridge: scene('补桥石匠', 'townsman_old', 500, 300, '桥头里程牌', 'road-plaque', 800, 302,
    '桥面第三块青石有空响，重车经过时都得靠南慢行，最近却有人故意往北压车辙。',
    '里程牌背面沾着新鲜车油，失踪货车很可能在这里停留过。'),
  paper_mill: scene('抄纸学徒', 'townswoman_young', 600, 310, '晾纸样张', 'notice-scroll', 560, 292,
    '一张纸从纸浆到压纹要过七道手，水印若错了，多半不是无心。',
    '样张纤维长短不一，夹着本不该出现在民用纸里的蓝麻。'),
  paper_alley: scene('送纸小工', 'merchant', 250, 310, '防潮纸包', 'spice-crate', 610, 310,
    '后巷只走废纸和浆水，整箱新纸从这里过，肯定是想避开前门的眼睛。',
    '纸包外层很干，底部却有潮泥，搬运者在排水沟边停过。'),
  old_post: scene('拾信老人', 'townsman_old', 520, 310, '残灯', 'lantern', 610, 306,
    '驿站荒了，信却没全散。有些人宁可把旧话锁在格子里，也不愿它送到该去的人手上。',
    '灯座积灰很厚，灯芯却被新剪过，近期有人夜里来过。'),
  north_road: scene('歇脚镖师', 'guard', 330, 310, '断裂车绳', 'broken-rope', 900, 310,
    '镖道上的石头会说话。新翻的土、断口朝向，还有车夫不肯看的方向，都算线索。',
    '断绳不是被磨坏的，切口平整，是有人在停车后从内侧割断。'),
  guild_warehouse: scene('扛包脚夫', 'merchant', 460, 310, '待验货箱', 'spice-crate', 800, 310,
    '货栈最忙时谁都只看封条，真正会做手脚的人，偏偏从箱底和秤脚下手。',
    '货箱封绳颜色一致，绳结方向却相反，至少有一箱被重新打包。'),
  river_yard: scene('装卸把头', 'guard', 650, 310, '转运木箱', 'spice-crate', 720, 310,
    '河滩换货讲究潮时，晚一刻就得换泊位。有人借着催船，把两批箱子混到了一处。',
    '木箱侧面有两组编号，一组墨迹被河水泡开，另一组刚写不久。'),
  grain_market: scene('散粮小贩', 'merchant', 430, 312, '试秤粮篮', 'ingredient-basket', 700, 310,
    '价牌可以一起改，客人掏出的铜钱却不会说谎。想知道真价，得看实际成交。',
    '粮篮底层掺着去年的陈谷，摊主却按新粮价格计价。'),
  guild_office: scene('抄账伙计', 'townswoman_young', 450, 310, '候核账册', 'ledger', 650, 292,
    '账房规矩是同一笔货只落一次墨，可最近总有人拿着两张一样的货单来问。',
    '账册页码连续，装订线却在中间重穿过，夹页可能被替换。'),
  charity_granary: scene('领粮妇人', 'townswoman_young', 500, 310, '余粮菜篮', 'ingredient-basket', 700, 310,
    '仓里说粮已发完，可排队的人都没领到。空的是前仓，后墙那边夜里还有搬运声。',
    '篮中只有碎谷和麻绳头，整袋粮食显然刚被转移。'),
  canal_checkpoint: scene('等闸船工', 'merchant', 1080, 310, '关卡路牌', 'road-plaque', 650, 310,
    '过关讲票也讲时辰，同一辆车若在两本登记里出现，必定有一本账在撒谎。',
    '路牌上多出一条只供夜运车队使用的小道标记。'),
  money_house: scene('兑票客', 'merchant', 400, 310, '兑付底账', 'ledger', 700, 292,
    '票号只认日期、担保和印记。三样都对还兑不出钱，那就该问是谁改了规矩。',
    '底账上几笔兑付日期被同一种墨重新描粗，掩盖了原来的先后。'),
  scale_contract_lane: scene('修秤匠', 'townsman_old', 500, 310, '旧制秤牌', 'road-plaque', 780, 310,
    '秤砣轻一钱，整车货就能差出一袋。做秤的人怕的不是手抖，是有人让全镇一起抖。',
    '木牌记录了三种秤制，其中一套刻度最近被统一刮改。'),
  merchant_alliance_hall: scene('候议商户', 'merchant', 240, 310, '议事副账', 'ledger', 850, 292,
    '会馆里每个人都说自己守规矩，等账册摊开，才看得出他们守的是谁的规矩。',
    '副账只记货物流向，不记银钱，反而勾出了被刻意隐去的商路。'),
  old_ledger_vault: scene('守库老人', 'townsman_old', 430, 310, '验页提灯', 'lantern', 900, 310,
    '旧库怕火也怕水，账页能留下来，不是运气，是有人一直不肯让这段旧事消失。',
    '提灯罩内贴着防风纸，适合检查水痕，也说明来人熟悉账库。', ['c08-vault-open']),
  jiangnan_branch: scene('住店船娘', 'townswoman_young', 600, 310, '退菜托盘', 'returned-dishes', 590, 286,
    '水巷客人赶船期，菜慢一步、房牌错一间，都会把整条巷子的口碑带走。',
    '托盘里的三道菜都剩下同一种香料，问题不像出在火候。'),
  jiangnan_dock: scene('码头脚夫', 'merchant', 500, 310, '香料货箱', 'spice-crate', 700, 310,
    '码头的箱子看封绳，船票看水印。两样对不上，就别信搬货的人喊得多急。',
    '货箱边角有两种磕痕，它至少在两艘不同高度的船上装卸过。'),
  river_market: scene('卖藕姑娘', 'townswoman_young', 430, 310, '河鲜菜篮', 'ingredient-basket', 800, 310,
    '河市的价每天跟水位一起变，只有故意抬价的人才会连续几日一文不动。',
    '菜篮中的水草来自上游，说明摊主今早并未从登记的码头进货。'),
  rain_ferry: scene('候船客', 'merchant', 500, 310, '渡口风灯', 'lantern', 800, 310,
    '雨一大，船影和脚印都容易认错。可装满货的船吃水深，骗不了岸边的水线。',
    '灯下木板有一串被雨冲淡的香料粉末，一直延伸到货船旁。'),
  jiangnan_spice_workshop: scene('香料学徒', 'townswoman_young', 430, 310, '封存香料箱', 'spice-crate', 800, 310,
    '香料可以串味，封绳不会。只要找到最早的一批绳结，就能追到调包的人。',
    '箱盖内侧留有灶灰，不像在香料仓里封装，更像来自旧厨房。', ['c11-market-traced']),
  old_banquet_kitchen: scene('旧灶看守', 'townsman_old', 450, 310, '旧宴托盘', 'returned-dishes', 850, 310,
    '灶院废了以后，还有人定期扫灰。被烧掉的也许不是菜谱，而是不想让人记住的旧账。',
    '托盘边缘有反复试味留下的刻痕，李大嘴当年在这里练过同一道菜。', ['c11-shiwei-trusted'])
};

function scene(name, artId, x, y, objectName, asset, objectX, objectY, dialogue, observation, requires) {
  return {
    npc: { name: name, artId: artId, x: x, y: y, requires: requires || null },
    object: { name: objectName, asset: asset, x: objectX, y: objectY, observation: observation },
    dialogue: dialogue
  };
}

function addUnique(list, item) {
  if (!list.some(function (entry) { return entry.id === item.id; })) list.push(item);
}

function apply(maps, dialogues) {
  Object.keys(SCENES).forEach(function (mapId) {
    var current = maps.find(function (map) { return map.id === mapId; });
    var entry = SCENES[mapId];
    var npcId = 'ambient-npc-' + mapId;
    var dialogueId = 'ambient-dialogue-' + mapId;
    var objectId = 'ambient-object-' + mapId;
    var flag = 'ambient-observed-' + mapId;
    if (!current) return;

    addUnique(current.npcs, {
      id: npcId,
      artId: entry.npc.artId,
      name: entry.npc.name,
      x: entry.npc.x,
      y: entry.npc.y,
      facing: 'left',
      requires: entry.npc.requires,
      showName: false,
      blocksMovement: false,
      ambient: true
    });
    addUnique(current.hotspots, {
      id: dialogueId,
      x: entry.npc.x,
      y: entry.npc.y,
      radius: 66,
      discoverRadius: 118,
      label: entry.npc.name,
      type: 'dialogue',
      dialogue: dialogueId,
      requires: entry.npc.requires,
      priority: 26,
      ambient: true
    });
    addUnique(current.hotspots, {
      id: objectId,
      x: entry.object.x,
      y: entry.object.y,
      radius: 62,
      discoverRadius: 104,
      label: entry.object.name,
      type: 'investigate',
      priority: 20,
      unless: [flag],
      effects: { flag: flag },
      toast: entry.object.observation,
      ambient: true
    });
    dialogues[dialogueId] = {
      speaker: entry.npc.name,
      text: entry.dialogue,
      presentation: 'bubble',
      choices: [{ label: '点头告辞', action: 'close' }]
    };
  });
  return maps;
}

function applyArt(mapArts) {
  Object.keys(SCENES).forEach(function (mapId) {
    var art = mapArts[mapId];
    var object = SCENES[mapId].object;
    var id = 'ambient-prop-' + mapId;
    if (!art) return;
    art.props = art.props || [];
    if (art.props.some(function (prop) { return prop.id === id; })) return;
    art.props.push({
      id: id,
      src: '@scene-core-v23/props/core/' + object.asset + '.png',
      x: object.x,
      y: object.y,
      sortY: object.y,
      scale: 0.28,
      pivot: { x: 96, y: 183 },
      decorative: true,
      optional: true,
      ambient: true
    });
  });
  return mapArts;
}

module.exports = { scenes: SCENES, apply: apply, applyArt: applyArt };
