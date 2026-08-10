'use strict';

const dishes = [
  { id: 'noodles', name: '阳春面', basePrice: 12, ingredients: { staple: 1, vegetable: 1 }, tags: ['清淡', '快捷'] },
  { id: 'cabbage', name: '醋溜白菜', basePrice: 10, ingredients: { vegetable: 2 }, tags: ['素食', '快捷'] },
  { id: 'tea_egg', name: '茶香蛋', basePrice: 15, ingredients: { tea: 1, meat: 1 }, tags: ['茶点', '便携'] },
  { id: 'soup', name: '药膳汤', basePrice: 19, ingredients: { vegetable: 1, tea: 1 }, tags: ['清淡', '养身'] },
  { id: 'lion_head', name: '红烧狮子头', basePrice: 24, ingredients: { meat: 2, staple: 1 }, tags: ['荤食', '下饭'] },
  { id: 'fish', name: '红烧鲫鱼', basePrice: 26, ingredients: { meat: 2, vegetable: 1 }, tags: ['荤食', '体面'] },
];

const guests = [
  { id: 'regular', name: '街坊熟客', prefers: ['快捷', '下饭'], patience: 3, budget: 16 },
  { id: 'merchant', name: '过路行商', prefers: ['便携', '体面'], patience: 2, budget: 24 },
  { id: 'family', name: '探亲一家', prefers: ['清淡', '养身'], patience: 3, budget: 20 },
  { id: 'scholar', name: '赶考书生', prefers: ['清淡', '茶点'], patience: 4, budget: 14 },
  { id: 'escort', name: '镖局客人', prefers: ['荤食', '下饭'], patience: 2, budget: 28 },
  { id: 'official', name: '巡街差役', prefers: ['快捷', '体面'], patience: 2, budget: 20 },
  { id: 'traveler', name: '江湖旅人', prefers: ['荤食', '便携'], patience: 2, budget: 22 },
  { id: 'elder', name: '远道老客', prefers: ['养身', '清淡'], patience: 4, budget: 18 },
];

function choice(label, job, specialist, result, effects, memory) {
  return { label, job, specialist, result, effects, memory: memory || null };
}

function event(id, title, guestId, objectRole, text, choices) {
  return { id, title, guestId, objectRole, text, choices };
}

const serviceEvents = [
  event('v28-first-ledger', '少记的一碗面', 'regular', 'counter', '熟客一桌点了三碗面，账单却只记了两碗。客人没有发现，柜台也正忙。', [
    choice('主动补账并说明', 'counter', 'zhangdeng', '账目补正，熟客记住了客栈的坦荡。', { coin: 4, order: 3, reputation: 1, satisfaction: 2, flags: ['v28-honest-ledger'] }, 'honest-ledger'),
    choice('按现有账单结算', 'counter', 'zhangdeng', '眼前少收了一点争执，账房却留下了一个缺口。', { coin: 2, order: -1, satisfaction: 1, flags: ['v28-loose-ledger'] }, 'loose-ledger'),
  ]),
  event('v28-elder-tea', '咳嗽的老客', 'elder', 'hall', '角落老客咳得厉害，希望把原来的荤菜换成一碗热汤。后厨已经开始备料。', [
    choice('换成药膳汤', 'counter', 'zhangdeng', '热汤稳住了老客，也让旁桌看见客栈的体贴。', { stock: { tea: -1, vegetable: -1 }, reputation: 2, satisfaction: 3, flags: ['v28-elder-cared'] }, 'elder-cared'),
    choice('赠一壶热茶', 'service', 'wuchen', '没有打乱后厨，但老客的脸色缓和了不少。', { stock: { tea: -1 }, coin: 2, satisfaction: 2, flags: ['v28-elder-tea'] }, 'elder-tea'),
  ]),
  event('v28-empty-basket', '货架见底', 'merchant', 'supply', '送菜的货车没有按时到，青菜和肉只够撑过一轮客流。', [
    choice('缩减菜单保住品质', 'kitchen', 'shiwei', '菜少了，但每桌端出去的味道没有打折。', { order: 2, satisfaction: 2, flags: ['v28-short-menu'] }, 'short-menu'),
    choice('请跑堂去街口补货', 'service', 'wuchen', '临时补货赶上了第二轮，代价是多付了一笔急价。', { coin: -6, stock: { vegetable: 3, staple: 2 }, satisfaction: 2, flags: ['v28-emergency-stock'] }, 'emergency-stock'),
  ]),
  event('v28-late-carrier', '迟到的送货人', 'merchant', 'door', '送货人满身尘土，带来了货车在东关失踪的消息，也催着先结清旧账。', [
    choice('先请他吃口热饭', 'counter', 'zhangdeng', '一顿热饭换来了完整路线和一枚异常封绳。', { coin: -3, reputation: 1, satisfaction: 2, flags: ['sidequest-late-letter-unlocked', 'v28-route-clue'] }, 'carrier-fed'),
    choice('先核对货票', 'ledger', 'wenyan', '票据上的倒印暴露了问题，委托被正式写上告示板。', { order: 3, satisfaction: 1, flags: ['sidequest-late-letter-unlocked', 'v28-ticket-clue'] }, 'ticket-checked'),
  ]),
  event('v28-rush-kitchen', '满堂催菜', 'escort', 'kitchen', '三桌客人同时催菜，灶火、跑堂和账单挤成了一团。', [
    choice('按桌次稳定出菜', 'kitchen', 'shiwei', '速度不算最快，但没有一道菜送错。', { order: 4, satisfaction: 2, flags: ['v28-steady-service'] }, 'steady-service'),
    choice('先上快菜稳住客人', 'service', 'wuchen', '阳春面和茶香蛋先顶上，后厨终于缓过一口气。', { stock: { staple: -1, tea: -1 }, coin: 5, satisfaction: 3, flags: ['v28-fast-dishes'] }, 'fast-dishes'),
  ]),
  event('v28-chair-dispute', '最后一把靠背椅', 'regular', 'hall', '两桌客人都说靠背椅是自己先占的，争执已经影响旁桌用餐。', [
    choice('掌柜出面调停', 'counter', 'zhangdeng', '双方各退一步，靠背椅让给了带孩子的一桌。', { reputation: 2, order: 2, satisfaction: 2, flags: ['v28-chair-mediated'] }, 'chair-mediated'),
    choice('送一碟茶香蛋', 'service', 'wuchen', '小菜化开了火气，客人还多点了一壶茶。', { stock: { tea: -1, meat: -1 }, coin: 5, satisfaction: 3, flags: ['v28-chair-snack'] }, 'chair-snack'),
  ]),
  event('v28-lost-room-key', '找不到的房钥匙', 'traveler', 'rooms', '住客急着出门，房牌上的钥匙却不见了。', [
    choice('核对登记后开备用锁', 'rooms', 'wenyan', '身份核清，住客没有耽误行程。', { order: 3, satisfaction: 2 }, 'room-key-checked'),
    choice('先安抚再全店寻找', 'counter', 'zhangdeng', '钥匙在桌缝里找到，住客记下了掌柜的耐心。', { reputation: 2, satisfaction: 2 }, 'room-key-found'),
  ]),
  event('v28-salty-soup', '一锅偏咸的汤', 'family', 'kitchen', '汤锅被误加了一勺盐，再拖下去整轮客人都要久等。', [
    choice('重新起锅', 'kitchen', 'shiwei', '多费了食材，味道总算守住。', { stock: { vegetable: -1, tea: -1 }, satisfaction: 3 }, 'soup-remade'),
    choice('改成下饭汤菜', 'counter', 'zhangdeng', '掌柜临时改了菜名和搭配，客人接受了变化。', { coin: 3, satisfaction: 1 }, 'soup-reframed'),
  ]),
  event('v28-false-copper', '成色不对的铜钱', 'merchant', 'counter', '行商结账时混入几枚成色异常的铜钱，他自己似乎也不知情。', [
    choice('当面验钱', 'ledger', 'wenyan', '假钱被挑出，行商也交代了换钱的摊位。', { order: 3, satisfaction: 1, flags: ['v28-false-copper-clue'] }, 'copper-checked'),
    choice('留下铜钱稍后追查', 'counter', 'zhangdeng', '没有惊动客人，但客栈承担了眼前损失。', { coin: -4, reputation: 1, flags: ['v28-false-copper-kept'] }, 'copper-kept'),
  ]),
  event('v28-rain-escort', '雨中的镖队', 'escort', 'door', '突来的雨把一队镖客堵在门口，他们需要热饭和一处放货的位置。', [
    choice('腾出后院', 'patrol', 'jingzhi', '货物有处安放，镖客愿意支付额外看护费。', { coin: 8, order: 2, satisfaction: 2 }, 'escort-yard'),
    choice('优先安排热饭', 'kitchen', 'shiwei', '热气让整队人安定下来，却加重了后厨压力。', { stock: { meat: -1, staple: -1 }, reputation: 2, satisfaction: 2 }, 'escort-meal'),
  ]),
  event('v28-broken-stool', '突然断裂的木凳', 'regular', 'hall', '木凳在客人坐下时断了一条腿，幸好没有伤人。', [
    choice('立即赔礼换座', 'counter', 'zhangdeng', '处理得快，客人没有继续追究。', { coin: -3, reputation: 1, satisfaction: 2 }, 'stool-apology'),
    choice('当场加固木凳', 'rooms', 'jingzhi', '修理虽粗糙，却让围观客人叫了声好。', { order: 2, satisfaction: 2 }, 'stool-fixed'),
  ]),
  event('v28-tea-merchant', '只肯换货的茶商', 'merchant', 'supply', '茶商不要现钱，只想用茶叶换客栈的招牌菜。', [
    choice('用茶香蛋换茶叶', 'counter', 'zhangdeng', '双方都得了实惠，茶叶库存也宽裕起来。', { stock: { meat: -1, tea: 3 }, satisfaction: 2 }, 'tea-barter'),
    choice('坚持按市价采购', 'ledger', 'wenyan', '账目清楚，但茶商没有多留一两茶。', { coin: -5, stock: { tea: 2 }, order: 2 }, 'tea-purchased'),
  ]),
  event('v28-storyteller-tab', '说书人的旧账', 'scholar', 'counter', '说书人想拿今晚的新故事抵饭钱。', [
    choice('收下故事', 'counter', 'zhangdeng', '一段新鲜掌故让晚间客流多了起来。', { reputation: 2, satisfaction: 2 }, 'story-accepted'),
    choice('请他抄一份菜单', 'ledger', 'wenyan', '新菜单写得漂亮，也替客栈省下了工钱。', { coin: 3, order: 2 }, 'story-worked'),
  ]),
  event('v28-lost-child', '钻进后院的孩子', 'family', 'hall', '一名孩子趁大人结账时跑进后院，家人急得四处寻找。', [
    choice('封住出口分头找', 'patrol', 'jingzhi', '孩子在柴堆旁找到，大堂没有乱起来。', { order: 4, satisfaction: 2 }, 'child-found'),
    choice('掌柜安抚家人', 'counter', 'zhangdeng', '家人稳定下来，也主动帮忙回忆孩子去向。', { reputation: 2, satisfaction: 2 }, 'family-calmed'),
  ]),
  event('v28-secret-inspector', '不点菜的住客', 'official', 'counter', '陌生人坐了半个时辰，只观察柜台和后门。', [
    choice('照常招待暗中留意', 'patrol', 'wuchen', '对方没有找到破绽，悄悄离开了。', { order: 3, satisfaction: 1, risk: -2 }, 'inspector-watched'),
    choice('送茶主动攀谈', 'counter', 'zhangdeng', '几句闲聊探出了对方查账的来意。', { coin: -2, reputation: 1, risk: -1 }, 'inspector-talked'),
  ]),
  event('v28-night-medicine', '半夜求药的住客', 'elder', 'rooms', '住客旧疾发作，需要热水和一味普通药材。', [
    choice('腾出灶火煎药', 'kitchen', 'shiwei', '药及时送到，住客第二天恢复了精神。', { stock: { tea: -1 }, reputation: 2, satisfaction: 3 }, 'medicine-brewed'),
    choice('请街坊郎中来', 'service', 'wuchen', '人来得快，但客栈需要承担诊金。', { coin: -5, satisfaction: 2 }, 'doctor-called'),
  ]),
  event('v28-returning-regular', '带朋友回来的熟客', 'regular', 'hall', '前两日受过照顾的熟客带来两位朋友，点名要尝同一道菜。', [
    choice('照旧单安排', 'service', 'wuchen', '熟悉的味道让一桌人都很满意。', { coin: 8, reputation: 2, satisfaction: 3 }, 'regular-remembered'),
    choice('加一道新菜', 'kitchen', 'shiwei', '新菜成了话题，也为招牌菜积累了口碑。', { stock: { meat: -1 }, reputation: 2, satisfaction: 2 }, 'regular-surprised'),
  ]),
  event('v28-wedding-table', '临时加来的喜宴桌', 'family', 'kitchen', '一户人家临时要加一桌小宴，预算不高但时间很紧。', [
    choice('用三道现成菜组合', 'kitchen', 'shiwei', '菜式朴素齐整，没有耽误正常客流。', { coin: 10, stock: { staple: -1, vegetable: -1 }, satisfaction: 2 }, 'wedding-simple'),
    choice('做一份体面主菜', 'counter', 'zhangdeng', '主家很满意，其他桌却多等了一会儿。', { coin: 15, stock: { meat: -2 }, order: -1, satisfaction: 2 }, 'wedding-grand'),
  ]),
  event('v28-porter-injury', '扭伤脚的脚夫', 'traveler', 'yard', '卸货脚夫扭伤了脚，货箱还堆在门口。', [
    choice('先扶人休息', 'rooms', 'zhangdeng', '脚夫缓过劲，主动说出了货栈最近的怪事。', { reputation: 2, satisfaction: 2 }, 'porter-rested'),
    choice('雇人继续卸货', 'service', 'wuchen', '门口很快恢复通畅，但多付了临时工钱。', { coin: -4, order: 3 }, 'porter-replaced'),
  ]),
  event('v28-map-rumor', '画错一笔的商路图', 'traveler', 'notice', '旅人带来的商路图与告示板上的路线差了一座桥。', [
    choice('留下图纸比对', 'ledger', 'wenyan', '两张图的差异成为一条可追查线索。', { order: 2, flags: ['v28-map-clue'] }, 'map-kept'),
    choice('请旅人带路', 'patrol', 'wuchen', '旅人答应天黑前回来确认岔路。', { coin: -3, flags: ['v28-guide-hired'] }, 'guide-hired'),
  ]),
  event('v28-stove-spark', '灶膛窜火', 'regular', 'kitchen', '灶膛突然窜出火星，旁边还放着半筐干柴。', [
    choice('封火移开干柴', 'kitchen', 'shiwei', '火势被稳稳压住，锅里的菜也没有废。', { order: 3, satisfaction: 2 }, 'fire-contained'),
    choice('先疏散附近客人', 'patrol', 'jingzhi', '人都安全，只是这一锅菜没能保住。', { stock: { vegetable: -1 }, reputation: 1, satisfaction: 1 }, 'guests-cleared'),
  ]),
];

const dayScripts = [
  { day: 1, title: '新账开门', objective: '完成两项筹备，守住第一天的账目与口碑。', morningEpisode: 'zhangdeng-1', eveningEpisode: 'wuchen-1', serviceEvents: ['v28-first-ledger', 'v28-elder-tea'], miniGame: 'ledger', miniGameGuestId: 'regular' },
  { day: 2, title: '货车误时', objective: '在缺货中维持营业，并查清东关货车的去向。', morningEpisode: 'wuchen-2', eveningEpisode: 'zhangdeng-2', serviceEvents: ['v28-empty-basket', 'v28-late-carrier'], miniGame: 'order', miniGameGuestId: 'merchant' },
  { day: 3, title: '满堂催菜', objective: '处理客流高峰，让岗位、菜单和备菜真正协同。', morningEpisode: 'jingzhi-1', eveningEpisode: 'jingzhi-2', serviceEvents: ['v28-rush-kitchen', 'v28-chair-dispute'], miniGame: 'order', miniGameGuestId: 'escort' },
];

function replaceById(target, source) {
  source.forEach(function (item) {
    var index = target.findIndex(function (current) { return current.id === item.id; });
    if (index >= 0) target[index] = item;
    else target.push(item);
  });
}

function apply(management) {
  replaceById(management.dishes, dishes);
  replaceById(management.guests, guests);
  serviceEvents.forEach(function (item) { management.serviceEvents[item.id] = item; });
  dayScripts.forEach(function (item) { management.dayScripts[item.day - 1] = item; });
  return management;
}

module.exports = { dishes, guests, serviceEvents, dayScripts, apply };
