'use strict';

var ITEMS = {
  'herbal-packet': {
    id: 'herbal-packet', name: '行路药包', kind: 'supply', icon: 'medicine', price: 8,
    description: '补充一份常用药。', effects: { medicine: 1 }, dailyLimit: 2, chapter: 1,
  },
  'grain-basket': {
    id: 'grain-basket', name: '杂粮小篮', kind: 'supply', icon: 'basket', price: 7,
    description: '主食两份、蔬菜一份。', effects: { stock: { staple: 2, vegetable: 1 } }, dailyLimit: 2, chapter: 1,
  },
  'tea-brick': {
    id: 'tea-brick', name: '陈香茶砖', kind: 'supply', icon: 'tea', price: 6,
    description: '补充分店茶饮两份。', effects: { stock: { tea: 2 } }, dailyLimit: 2, chapter: 1,
  },
  'meat-spice-pack': {
    id: 'meat-spice-pack', name: '卤味料包', kind: 'supply', icon: 'pot', price: 10,
    description: '荤食与香料各备一程。', effects: { stock: { meat: 2 } }, dailyLimit: 1, chapter: 2,
  },

  'peace-knot': {
    id: 'peace-knot', name: '朱绳平安结', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 18,
    description: '护身安神，气血上限 +8。', bonuses: { hp: 8 }, chapter: 1,
  },
  'jade-hairpin': {
    id: 'jade-hairpin', name: '青玉束发簪', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 26,
    description: '凝神定气，真气上限 +6。', bonuses: { qi: 6 }, chapter: 3,
  },
  'brass-bell': {
    id: 'brass-bell', name: '寻路铜铃', kind: 'equipment', slot: 'accessory', icon: 'bell', price: 34,
    description: '听风辨位，身法 +2。', bonuses: { speed: 2 }, chapter: 5,
  },
  'cloud-clasp': {
    id: 'cloud-clasp', name: '流云如意扣', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 42,
    description: '气血 +5，真气 +4。', bonuses: { hp: 5, qi: 4 }, chapter: 8,
  },

  'elm-ruler': {
    id: 'elm-ruler', name: '榆木护店尺', kind: 'equipment', slot: 'weapon', icon: 'weapon', price: 20,
    description: '趁手结实，攻击 +3。', bonuses: { attack: 3 }, chapter: 1,
  },
  'copper-staff': {
    id: 'copper-staff', name: '包铜短杖', kind: 'equipment', slot: 'weapon', icon: 'weapon', price: 30,
    description: '攻守稳妥，攻击 +5。', bonuses: { attack: 5 }, chapter: 3,
  },
  'shop-iron-ruler': {
    id: 'shop-iron-ruler', name: '镇店铁尺', kind: 'equipment', slot: 'weapon', icon: 'weapon', price: 44,
    description: '压阵护客，攻击 +7。', bonuses: { attack: 7 }, chapter: 6,
  },
  'swallow-knife': {
    id: 'swallow-knife', name: '雁翎短刀', kind: 'equipment', slot: 'weapon', icon: 'weapon', price: 58,
    description: '轻快锋利，攻击 +9、身法 +1。', bonuses: { attack: 9, speed: 1 }, chapter: 8,
  },

  // ---- 菜蔬 / 食材类 ----
  'fresh-veggie': {
    id: 'fresh-veggie', name: '时令鲜蔬', kind: 'supply', icon: 'basket', price: 4,
    description: '两份当季青菜。', effects: { stock: { vegetable: 2 } }, dailyLimit: 3, chapter: 1,
  },
  'seasonal-fruit': {
    id: 'seasonal-fruit', name: '应季果篮', kind: 'supply', icon: 'basket', price: 5,
    description: '一份水果，可佐茶。', effects: { stock: { vegetable: 1 } }, dailyLimit: 3, chapter: 1,
  },
  'pickled-jar': {
    id: 'pickled-jar', name: '酱菜小坛', kind: 'supply', icon: 'basket', price: 6,
    description: '耐放的腌菜，主食搭档。', effects: { stock: { vegetable: 1 } }, dailyLimit: 2, chapter: 2,
  },
  'river-fish': {
    id: 'river-fish', name: '河鲜活鱼', kind: 'supply', icon: 'basket', price: 9,
    description: '两条活鱼，荤食佳选。', effects: { stock: { meat: 2 } }, dailyLimit: 2, chapter: 3,
  },
  'river-shrimp': {
    id: 'river-shrimp', name: '河虾小篓', kind: 'supply', icon: 'basket', price: 8,
    description: '一篓活虾，鲜味十足。', effects: { stock: { meat: 1 } }, dailyLimit: 2, chapter: 3,
  },
  'dry-rice': {
    id: 'dry-rice', name: '干粮米袋', kind: 'supply', icon: 'basket', price: 5,
    description: '两份主食。', effects: { stock: { staple: 2 } }, dailyLimit: 3, chapter: 1,
  },
  'oil-jar': {
    id: 'oil-jar', name: '食油小罐', kind: 'supply', icon: 'pot', price: 7,
    description: '一份油料，后厨必备。', effects: { stock: { staple: 1 } }, dailyLimit: 2, chapter: 2,
  },

  // ---- 药材类 ----
  'cold-cure': {
    id: 'cold-cure', name: '风寒散', kind: 'supply', icon: 'medicine', price: 7,
    description: '治风寒头痛。', effects: { medicine: 1 }, dailyLimit: 2, chapter: 1,
  },
  'wound-powder': {
    id: 'wound-powder', name: '金创药粉', kind: 'supply', icon: 'medicine', price: 9,
    description: '外伤止血。', effects: { medicine: 1 }, dailyLimit: 2, chapter: 2,
  },
  'qi-tonic': {
    id: 'qi-tonic', name: '养气丹', kind: 'supply', icon: 'medicine', price: 12,
    description: '调息补气。', effects: { medicine: 2 }, dailyLimit: 1, chapter: 4,
  },

  // ---- 古玩 / 旧物 / 情报 ----
  'old-token': {
    id: 'old-token', name: '旧路引牌', kind: 'supply', icon: 'scroll', price: 14,
    description: '一枚来历不明的旧牌，也许能换得江湖传闻。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 3,
  },
  'jade-shard': {
    id: 'jade-shard', name: '残玉片', kind: 'supply', icon: 'jewel', price: 18,
    description: '一块带纹的残玉，识货者会另眼相看。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 4,
  },
  'mystery-box': {
    id: 'mystery-box', name: '旧木匣', kind: 'supply', icon: 'scroll', price: 22,
    description: '封着的旧匣，里面可能是线索，也可能是空欢喜。', effects: { reputation: 2 }, dailyLimit: 1, chapter: 5,
  },
  'old-map': {
    id: 'old-map', name: '残破商路图', kind: 'supply', icon: 'scroll', price: 16,
    description: '一条被人涂改过的旧商路，也许指向隐秘货源。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 4,
  },
  'ancient-coin': {
    id: 'ancient-coin', name: '古旧铜钱', kind: 'supply', icon: 'scroll', price: 10,
    description: '一枚锈迹斑斑的旧钱，据说曾是漕运信物。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 3,
  },

  // ---- 文房 / 书墨 ----
  'ink-stick': {
    id: 'ink-stick', name: '松烟墨条', kind: 'supply', icon: 'scroll', price: 8,
    description: '质地细腻，记账利落。', effects: { reputation: 1 }, dailyLimit: 2, chapter: 2,
  },
  'paper-bundle': {
    id: 'paper-bundle', name: '造纸纸捆', kind: 'supply', icon: 'scroll', price: 6,
    description: '一沓手工纸，通用文房。', effects: { reputation: 1 }, dailyLimit: 2, chapter: 2,
  },
  'account-book': {
    id: 'account-book', name: '空白账册', kind: 'supply', icon: 'scroll', price: 10,
    description: '装订齐整，适合复盘账目。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 3,
  },
  'calligraphy-scroll': {
    id: 'calligraphy-scroll', name: '旧字画', kind: 'supply', icon: 'scroll', price: 15,
    description: '一幅泛黄字画，挂在堂中能添几分书卷气。', effects: { reputation: 2 }, dailyLimit: 1, chapter: 4,
  },

  // ---- 布匹 / 成衣 ----
  'linen-roll': {
    id: 'linen-roll', name: '粗麻布匹', kind: 'supply', icon: 'scroll', price: 7,
    description: '一匹耐磨粗布，可做工作服。', effects: { reputation: 1 }, dailyLimit: 2, chapter: 1,
  },
  'silk-ribbon': {
    id: 'silk-ribbon', name: '丝绦', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 20,
    description: '束袖利落，身法 +1。', bonuses: { speed: 1 }, chapter: 2,
  },
  'cotton-coat': {
    id: 'cotton-coat', name: '厚棉外褂', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 24,
    description: '御寒耐穿，气血 +6。', bonuses: { hp: 6 }, chapter: 3,
  },

  // ---- 茶点 ----
  'snack-plate': {
    id: 'snack-plate', name: '佐茶小碟', kind: 'supply', icon: 'tea', price: 5,
    description: '几样干果蜜饯，配茶刚好。', effects: { stock: { tea: 1 } }, dailyLimit: 3, chapter: 1,
  },
  'pastry-box': {
    id: 'pastry-box', name: '酥点礼盒', kind: 'supply', icon: 'tea', price: 9,
    description: '一盒酥点，待客体面。', effects: { stock: { tea: 2 } }, dailyLimit: 2, chapter: 2,
  },

  // ---- 工坊特产 ----
  'spice-giftbox': {
    id: 'spice-giftbox', name: '香料礼盒', kind: 'supply', icon: 'pot', price: 14,
    description: '配好的香料组合，省去配比烦恼。', effects: { stock: { meat: 2 } }, dailyLimit: 1, chapter: 4,
  },
  'hand-paper': {
    id: 'hand-paper', name: '手工笺纸', kind: 'supply', icon: 'scroll', price: 9,
    description: '纹理细腻的笺纸，适合写帖子。', effects: { reputation: 1 }, dailyLimit: 2, chapter: 3,
  },
  'sauce-jar': {
    id: 'sauce-jar', name: '秘制酱料罐', kind: 'supply', icon: 'pot', price: 11,
    description: '一罐老方酱料，后厨提味利器。', effects: { stock: { meat: 1 } }, dailyLimit: 2, chapter: 4,
  },

  // ---- 雨具 / 杂货 ----
  'bamboo-umbrella': {
    id: 'bamboo-umbrella', name: '竹柄油伞', kind: 'supply', icon: 'scroll', price: 8,
    description: '雨天出行必备。', effects: { reputation: 1 }, dailyLimit: 2, chapter: 2,
  },
  'warm-bottle': {
    id: 'warm-bottle', name: '暖水竹壶', kind: 'supply', icon: 'pot', price: 7,
    description: '保温耐摔，行路良伴。', effects: { medicine: 1 }, dailyLimit: 2, chapter: 2,
  },
  'road-lantern': {
    id: 'road-lantern', name: '行路灯笼', kind: 'supply', icon: 'scroll', price: 10,
    description: '夜里探路更安心。', effects: { reputation: 1 }, dailyLimit: 1, chapter: 3,
  },

  // ---- 首饰 / 玉器 ----
  'silver-ring': {
    id: 'silver-ring', name: '素银指环', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 22,
    description: '简单素雅，攻击 +2、身法 +1。', bonuses: { attack: 2, speed: 1 }, chapter: 3,
  },
  'jade-pendant': {
    id: 'jade-pendant', name: '青玉佩', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 38,
    description: '温润养人，气血 +4、真气 +4。', bonuses: { hp: 4, qi: 4 }, chapter: 6,
  },

  // ---- 兵器 / 护具 ----
  'iron-guard': {
    id: 'iron-guard', name: '铁片护臂', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 30,
    description: '护住小臂，气血 +8。', bonuses: { hp: 8 }, chapter: 5,
  },
  'leather-bracer': {
    id: 'leather-bracer', name: '皮护腕', kind: 'equipment', slot: 'accessory', icon: 'jewel', price: 26,
    description: '轻便灵活，身法 +2。', bonuses: { speed: 2 }, chapter: 4,
  },
};

var SHOPS = {
  'ma-goods': {
    id: 'ma-goods', npcId: 'noodle-vendor-ma', name: '马嫂杂货摊', type: 'goods', icon: 'shop',
    greeting: '赶路、开店都少不了这些寻常物件。', items: ['herbal-packet', 'grain-basket', 'tea-brick', 'meat-spice-pack'],
  },
  'wen-jewelry': {
    id: 'wen-jewelry', npcId: 'seamstress-wen', name: '温记首饰铺', type: 'jewelry', icon: 'jewel',
    greeting: '首饰不只好看，有些小物在江湖路上也能护人。', items: ['peace-knot', 'jade-hairpin', 'brass-bell', 'cloud-clasp'],
  },
  'han-armory': {
    id: 'han-armory', npcId: 'coppersmith-han', name: '韩家兵器行', type: 'weapon', icon: 'weapon',
    greeting: '兵器不求唬人，趁手、结实、护得住同伴才算好。', items: ['elm-ruler', 'copper-staff', 'shop-iron-ruler', 'swallow-knife'],
  },

  // ---- 固定商铺（原 merchant-stalls.js 已移除，以下商铺为孤立定义）----
  'hao-tea-stall': {
    id: 'hao-tea-stall', npcId: 'hao-tea-kettle', name: '郝茶釜茶摊', type: 'tea', icon: 'tea',
    greeting: '新煮的茶汤，配两碟酥点，正好歇脚。', items: ['tea-brick', 'snack-plate', 'pastry-box'],
  },
  'lu-ironforge': {
    id: 'lu-ironforge', npcId: 'lu-ironhammer', name: '鲁铁锤铁匠摊', type: 'weapon', icon: 'weapon',
    greeting: '趁手的家伙最实在。护臂、护腕都有现成的。', items: ['copper-staff', 'leather-bracer', 'iron-guard'],
  },
  'tao-veggie-stall': {
    id: 'tao-veggie-stall', npcId: 'tao-veggie', name: '陶菜婆菜摊', type: 'food', icon: 'basket',
    greeting: '今早的露水菜，水灵着呢。', items: ['fresh-veggie', 'seasonal-fruit', 'pickled-jar'],
  },
  'jin-antique-stall': {
    id: 'jin-antique-stall', npcId: 'jin-antique', name: '金淘古旧货', type: 'antique', icon: 'scroll',
    greeting: '别小看旧货，里头有几件连会馆的人都眼馋。', items: ['old-token', 'ancient-coin', 'old-map', 'mystery-box'],
  },
  'shi-cloth-stall': {
    id: 'shi-cloth-stall', npcId: 'shi-cloth', name: '施叠布布庄', type: 'cloth', icon: 'scroll',
    greeting: '粗布耐穿，丝绦利落，掌柜挑哪样？', items: ['linen-roll', 'silk-ribbon', 'cotton-coat'],
  },
  'mo-stationery': {
    id: 'mo-stationery', npcId: 'mo-halfscroll', name: '墨半卷文房', type: 'stationery', icon: 'scroll',
    greeting: '字写得好，先得纸墨不差。', items: ['ink-stick', 'paper-bundle', 'account-book', 'calligraphy-scroll'],
  },
  'chen-goods': {
    id: 'chen-goods', npcId: 'chen-goods', name: '陈记杂货', type: 'goods', icon: 'shop',
    greeting: '行路开店都用得上的零碎，便宜实在。', items: ['herbal-packet', 'grain-basket', 'bamboo-umbrella', 'warm-bottle'],
  },
  'qiao-oldstall': {
    id: 'qiao-oldstall', npcId: 'qiao-oldstall', name: '桥头旧摊', type: 'antique', icon: 'scroll',
    greeting: '桥头风大，东西也杂。挑挑看，也许有宝贝。', items: ['ancient-coin', 'jade-shard', 'road-lantern'],
  },
  'zhi-paperstore': {
    id: 'zhi-paperstore', npcId: 'zhi-weizhang', name: '纸未张纸铺', type: 'stationery', icon: 'scroll',
    greeting: '手工纸最讲究纤维。这批是今早压的。', items: ['paper-bundle', 'hand-paper', 'account-book'],
  },
  'ku-sundries': {
    id: 'ku-sundries', npcId: 'ku-sundries', name: '库边杂卖', type: 'goods', icon: 'shop',
    greeting: '货栈余下来的零碎，便宜卖。', items: ['grain-basket', 'oil-jar', 'dry-rice'],
  },
  'jiang-freshfish': {
    id: 'jiang-freshfish', npcId: 'jiang-freshfish', name: '江网子鲜鱼摊', type: 'food', icon: 'basket',
    greeting: '今早的网，活鱼活虾。', items: ['river-fish', 'river-shrimp'],
  },
  'mi-grain': {
    id: 'mi-grain', npcId: 'mi-seventhdou', name: '米七斗粮行', type: 'food', icon: 'basket',
    greeting: '新碾的米，陈磨的面。', items: ['dry-rice', 'grain-basket', 'oil-jar'],
  },
  'sun-herbbasket': {
    id: 'sun-herbbasket', npcId: 'sun-herbbasket', name: '孙药篓义诊摊', type: 'medicine', icon: 'medicine',
    greeting: '义诊看诊不要钱，药材只收本钱。', items: ['cold-cure', 'wound-powder', 'herbal-packet'],
  },
  'guan-peddler': {
    id: 'guan-peddler', npcId: 'guan-peddler', name: '关口小贩', type: 'goods', icon: 'shop',
    greeting: '过关赶路的人都来我这儿买零嘴。', items: ['snack-plate', 'warm-bottle', 'bamboo-umbrella'],
  },
  'yu-mingxuan': {
    id: 'yu-mingxuan', npcId: 'yu-mingxuan', name: '玉鸣轩首饰', type: 'jewelry', icon: 'jewel',
    greeting: '好玉养人，好工传家。', items: ['jade-hairpin', 'silver-ring', 'jade-pendant'],
  },
  'jiao-scaleware': {
    id: 'jiao-scaleware', npcId: 'jiao-scaleware', name: '校秤杂具', type: 'goods', icon: 'shop',
    greeting: '秤要准，砣要稳。做买卖先得量具不欺。', items: ['account-book', 'ink-stick', 'dry-rice'],
  },
  'tong-bazaar': {
    id: 'tong-bazaar', npcId: 'tong-bazaar', name: '同盟百货行', type: 'goods', icon: 'shop',
    greeting: '商会直属，货真价实。', items: ['qi-tonic', 'jade-pendant', 'spice-giftbox', 'calligraphy-scroll'],
  },
  'jiu-treasure': {
    id: 'jiu-treasure', npcId: 'jiu-treasure', name: '旧库淘宝人', type: 'antique', icon: 'scroll',
    greeting: '旧库里翻出来的东西，来路都正。', items: ['old-map', 'jade-shard', 'mystery-box'],
  },
  'jiangnan-teasnack': {
    id: 'jiangnan-teasnack', npcId: 'jiangnan-teasnack', name: '江南茶点铺', type: 'tea', icon: 'tea',
    greeting: '水乡的点心，甜咸都有。', items: ['snack-plate', 'pastry-box', 'tea-brick'],
  },
  'xiang-spicelady': {
    id: 'xiang-spicelady', npcId: 'xiang-spicelady', name: '香娘子香料行', type: 'spice', icon: 'pot',
    greeting: '南来的香料我闭眼都能辨。', items: ['spice-giftbox', 'meat-spice-pack', 'sauce-jar'],
  },
  'du-rainware': {
    id: 'du-rainware', npcId: 'du-rainware', name: '渡口雨具摊', type: 'goods', icon: 'shop',
    greeting: '雨大路滑，一把伞能省半场病。', items: ['bamboo-umbrella', 'warm-bottle', 'cold-cure'],
  },
  'jiu-sauce': {
    id: 'jiu-sauce', npcId: 'jiu-sauce', name: '旧灶酱料铺', type: 'spice', icon: 'pot',
    greeting: '老方子的酱料，炒菜省一半功夫。', items: ['sauce-jar', 'meat-spice-pack', 'oil-jar'],
  },
};

module.exports = { items: ITEMS, shops: SHOPS };
