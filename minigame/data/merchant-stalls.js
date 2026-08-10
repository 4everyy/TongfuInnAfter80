'use strict';

// ============================================================
// 固定商铺 NPC（merchant-stalls）
// 常驻地标、可反复交易、地域特色、零新系统
// 复用 commerce.js shop 机制 + person dialogue 机制
// 坐标由 ratio 锚定（地标感），经安全点验证后落地
// ============================================================

// ---- 几何验证（与 npc-population-v26 一致的逻辑）----

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
  t = Math.max(0, Math.min(1, t));
  var x = start[0] + t * dx;
  var y = start[1] + t * dy;
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

// 商铺 NPC 为小型不阻挡实体（collisionRadiusX:10, blocksMovement:false），
// 采用适配的紧凑排斥阈值（区别于大型阻挡 NPC 的 70/44 半径）：
//   - edge 12：贴墙也不至于越界
//   - obstacle 20：避免穿墙/与障碍重叠
//   - spawn 40：不卡玩家出生
//   - npc 44：约 1.5 个精灵宽，视觉不与其他 NPC 重叠
//   - hotspot 30：交互锚点不互相覆盖
function validPoint(map, point) {
  var floor = (map.walkable || []).some(function (polygon) {
    return pointInPolygon(point, polygon) && polygonDistance(point, polygon) >= 12;
  });
  if (!floor) return false;
  if ((map.obstacles || []).some(function (obstacle) {
    return pointInPolygon(point, obstacle.polygon) || polygonDistance(point, obstacle.polygon) < 20;
  })) return false;
  if (Object.keys(map.spawns || {}).some(function (id) {
    return Math.hypot(point.x - map.spawns[id].x, point.y - map.spawns[id].y) < 40;
  })) return false;
  if ((map.exits || []).some(function (exit) { return insideExit(point, exit); })) return false;
  if ((map.npcs || []).some(function (npc) {
    return Math.hypot(point.x - npc.x, point.y - npc.y) < 44;
  })) return false;
  if ((map.hotspots || []).some(function (spot) {
    return Math.hypot(point.x - spot.x, point.y - spot.y) < 30;
  })) return false;
  return true;
}

// 锚定 x 在 ratio 附近，搜索合法 y（与 npc-population-v26 safePoint 一致的稳健网格）
// 若锚定 ratio 落在拥挤区，逐步向两侧扩展 ratio（保留地标感 + 保证鲁棒）
function findStallPoint(map, ratio) {
  function tryRatio(r) {
    var base = Math.round(map.width * r);
    var offsets = [0, 72, -72, 144, -144, 216, -216, 288, -288];
    var ys = [318, 306, 290, 326, 274, 254, 234, 214, 196];
    var yi;
    var xi;
    for (yi = 0; yi < ys.length; yi += 1) {
      for (xi = 0; xi < offsets.length; xi += 1) {
        var point = {
          x: Math.max(30, Math.min(map.width - 30, base + offsets[xi])),
          y: Math.min(map.height - 18, ys[yi]),
        };
        if (validPoint(map, point)) return point;
      }
    }
    return null;
  }

  var found = tryRatio(ratio);
  if (found) return found;

  // 逐步向两侧扩展 ratio（±0.06 步长，最多扩展到 ±0.36）
  var step;
  for (step = 1; step <= 6; step += 1) {
    var delta = 0.06 * step;
    found = tryRatio(ratio - delta);
    if (found) return found;
    found = tryRatio(ratio + delta);
    if (found) return found;
  }
  throw new Error('No safe merchant stall point on ' + map.id + ' at ratio ' + ratio);
}

function addUnique(list, item) {
  if (!list.some(function (entry) { return entry.id === item.id; })) list.push(item);
}

// ---- 商铺定义 ----

function stall(id, name, mapId, ratio, artId, greeting, shopId, shopLabel) {
  return {
    id: id,
    name: name,
    mapId: mapId,
    ratio: ratio,
    artId: artId,
    greeting: greeting,
    shopId: shopId,
    shopLabel: shopLabel,
  };
}

var STALLS = [
  // ==== M1: 市井核心（9 家；inn 大堂热点密集，茶饮摊改由 tea_shed 承载）====
  stall('lu-ironhammer', '鲁铁锤', 'yard', 0.58, 'townsman_old',
    '趁手的家伙最实在。护臂、护腕都有现成的。镇店铁尺早卖光了，下一炉还得等三日。',
    'lu-ironforge', '看看铁器'),
  stall('tao-veggie', '陶菜婆', 'street', 0.22, 'townswoman_young',
    '今早的露水菜，水灵着呢。听说粮市这两天有人压价，菜价怕也要跟着乱。',
    'tao-veggie-stall', '看看菜蔬'),
  stall('jin-antique', '金淘古', 'street', 0.70, 'merchant',
    '别小看旧货，里头有几件连会馆的人都眼馋。这枚旧钱别看锈了，当年可是漕运的路引。',
    'jin-antique-stall', '看看旧货'),
  stall('shi-cloth', '施叠布', 'locust_lane', 0.62, 'townswoman_young',
    '粗布耐穿，丝绦利落，掌柜挑哪样？最近靛蓝染料缺货，怕是有人在囤。',
    'shi-cloth-stall', '看看布匹'),
  stall('mo-halfscroll', '墨半卷', 'locust_lane', 0.36, 'townsman_old',
    '字写得好，先得纸墨不差。听说纸坊那边的蓝麻出了问题，纸价怕要涨。',
    'mo-stationery', '看看文房'),
  stall('hao-tea-kettle-2', '郝茶釜', 'tea_shed', 0.56, 'tea_owner',
    '路过喝碗茶吧，今日的点心是新做的。这条路上最近不太平，赶路的多，歇脚的少。',
    'hao-tea-stall', '看看茶点'),
  stall('chen-goods', '陈杂货', 'east_gate', 0.72, 'merchant',
    '行路开店都用得上的零碎，便宜实在。过关的人多了，听说北边路上又出了岔子。',
    'chen-goods', '看看杂货'),
  stall('mi-seventhdou', '米七斗', 'grain_market', 0.22, 'merchant',
    '新碾的米，陈磨的面。这两天粮价怪得很，三家店报一个价，邪门。',
    'mi-grain', '看看粮油'),
  stall('tao-veggie-2', '陶菜婆', 'grain_market', 0.66, 'townswoman_young',
    '粮市这边的菜便宜些，掌柜多拿点？卖菜的都说最近进货被卡了，怕是要涨。',
    'tao-veggie-stall', '看看菜蔬'),

  // ==== M2: 工坊与水边（9 家）====
  stall('zhi-weizhang', '纸未张', 'paper_mill', 0.41, 'townsman_old',
    '手工纸最讲究纤维。这批是今早压的。最近浆桶里总混进些不该有的东西，唉。',
    'zhi-paperstore', '看看纸品'),
  stall('mo-halfscroll-2', '墨半卷', 'paper_alley', 0.66, 'townsman_old',
    '后巷有些旧书字画，掌柜识货便看看。纸坊的学徒最近跑了几个，说是怕惹上麻烦。',
    'mo-stationery', '看看字画'),
  stall('xiang-spicelady', '香娘子', 'jiangnan_dock', 0.27, 'townswoman_young',
    '南来的香料我闭眼都能辨。最近有几批香料封绳不对，来路存疑。',
    'xiang-spicelady', '看看香料'),
  stall('jiang-freshfish', '江网子', 'river_yard', 0.41, 'townsman_old',
    '今早的网，活鱼活虾。河里最近总漂着碎木片，上游怕是有事。',
    'jiang-freshfish', '看看河鲜'),
  stall('xiang-spicelady-2', '香娘子', 'jiangnan_spice_workshop', 0.48, 'townswoman_young',
    '作坊里的香料都是当日磨的，鲜着呢。旧灶那边的灰总有些不对味，我说不上来。',
    'xiang-spicelady', '看看香料'),
  stall('jiu-sauce', '旧灶酱料', 'old_banquet_kitchen', 0.47, 'townsman_old',
    '老方子的酱料，炒菜省一半功夫。这灶封了好些年了，最近才重新开火。',
    'jiu-sauce', '看看酱料'),
  stall('jiang-freshfish-2', '江网子', 'river_market', 0.35, 'townsman_old',
    '河市的鱼最新鲜，掌柜来两条？最近网里总挂住些怪东西，木牌碎片什么的。',
    'jiang-freshfish', '看看河鲜'),
  stall('du-rainware', '渡口雨具', 'rain_ferry', 0.25, 'merchant',
    '雨大路滑，一把伞能省半场病。雨夜里总有不登记的船靠岸，古怪得很。',
    'du-rainware', '看看雨具'),
  stall('jiangnan-teasnack', '江南茶点', 'jiangnan_branch', 0.48, 'townswoman_young',
    '水乡的点心，甜咸都有。分店最近退菜退得凶，也不知道哪里出了岔。',
    'jiangnan-teasnack', '看看茶点'),

  // ==== M3: 关口/仓储/账务/补齐（11 家）====
  stall('qiao-oldstall', '桥头旧摊', 'stone_bridge', 0.34, 'townsman_old',
    '桥头风大，东西也杂。挑挑看，也许有宝贝。桥那头夜里总有大车经过，也不知运的什么。',
    'qiao-oldstall', '看看旧物'),
  stall('lu-ironhammer-2', '鲁铁锤', 'north_road', 0.53, 'townsman_old',
    '路边支个摊，修兵器补护具，都能做。北坡那辆断轮车还没修好，轴销难找得很。',
    'lu-ironforge', '看看铁器'),
  stall('jin-antique-2', '金淘古', 'old_post', 0.32, 'merchant',
    '驿站旧物多，来路都正，掌柜放心。三更后的脚步声，我也听见过几回。',
    'jin-antique-stall', '看看旧货'),
  stall('ku-sundries', '库边杂卖', 'guild_warehouse', 0.55, 'merchant',
    '货栈余下来的零碎，便宜卖。最近货钩总松，也不知道谁碰的。',
    'ku-sundries', '看看杂卖'),
  stall('mo-halfscroll-3', '墨半卷', 'guild_office', 0.48, 'townsman_old',
    '账册文房都有，记账利索些总没错。账房少了一页副册，谁撕的说不清。',
    'mo-stationery', '看看文房'),
  stall('sun-herbbasket', '孙药篓', 'charity_granary', 0.28, 'townswoman_young',
    '义诊看诊不要钱，药材只收本钱。领粮的人肚子疼得奇怪，不像饿出来的。',
    'sun-herbbasket', '看看药材'),
  stall('guan-peddler', '关口小贩', 'canal_checkpoint', 0.65, 'merchant',
    '过关赶路的人都来我这儿买零嘴。过关的货船最近多了一拨，查得也严了。',
    'guan-peddler', '看看零嘴'),
  stall('yu-mingxuan', '玉鸣轩', 'money_house', 0.24, 'townswoman_young',
    '好玉养人，好工传家。兑票的事闹得沸沸扬扬，掌柜也小心些。',
    'yu-mingxuan', '看看首饰'),
  stall('jiao-scaleware', '校秤杂具', 'scale_contract_lane', 0.28, 'townsman_old',
    '秤要准，砣要稳。做买卖先得量具不欺。标准砣被人换过一回，好在找回来了。',
    'jiao-scaleware', '看看量具'),
  stall('tong-bazaar', '同盟百货行', 'merchant_alliance_hall', 0.35, 'merchant',
    '商会直属，货真价实。邵老夫人常来这里坐坐，她见过的大世面可多了。',
    'tong-bazaar', '看看百货'),
  stall('jiu-treasure', '旧库淘宝', 'old_ledger_vault', 0.40, 'merchant',
    '旧库里翻出来的东西，来路都正。账柜的锁芯坏了好些日子，一直没人修。',
    'jiu-treasure', '看看古物'),
];

// ---- 装配 ----

function apply(maps, dialogues) {
  STALLS.forEach(function (entry) {
    var map = maps.find(function (m) { return m.id === entry.mapId; });
    if (!map) throw new Error('Missing merchant stall map: ' + entry.mapId);

    var point = findStallPoint(map, entry.ratio);
    var npcId = 'merchant-' + entry.id;
    var dialogueId = 'merchant-' + entry.id + '-talk';

    // 添加 NPC（固定坐标，merchant 标记，不阻挡移动）
    addUnique(map.npcs, {
      id: npcId,
      artId: entry.artId,
      name: entry.name,
      x: point.x,
      y: point.y,
      facing: entry.ratio > 0.55 ? 'left' : 'right',
      showName: false,
      blocksMovement: false,
      collisionRadiusX: 10,
      collisionRadiusY: 6,
      merchant: true,
    });

    // 添加对话热点（常驻、无 requires/unless 门控）
    addUnique(map.hotspots, {
      id: dialogueId,
      x: point.x,
      y: point.y,
      radius: 64,
      discoverRadius: 108,
      label: entry.name,
      type: 'dialogue',
      dialogue: dialogueId,
      priority: 20,
      merchant: true,
    });

    // 对话：开场白（含地域八卦）+ [看货, 告辞]
    dialogues[dialogueId] = {
      speaker: entry.name,
      text: entry.greeting,
      presentation: 'bubble',
      choices: [
        { label: entry.shopLabel || '看看货物', action: 'shop', shopId: entry.shopId },
        { label: '告辞', action: 'close' },
      ],
    };
  });
  return maps;
}

function applyArt(npcArts, mapArts) {
  // 商铺 NPC 复用 ambient 精灵（merchant / townsman_old / townswoman_young / tea_owner），
  // 这些 artId 已由场景美术系统注册，无需在此添加新图集。
  // 如后续需要专属精灵，可在此扩展 npcArts[entry.id] 条目。
}

module.exports = { stalls: STALLS, apply: apply, applyArt: applyArt };