const jobs = [
  { id: 'counter', name: '柜台', trait: '接待', helperCost: 5 },
  { id: 'service', name: '跑堂', trait: '身法', helperCost: 5 },
  { id: 'kitchen', name: '后厨', trait: '厨务', helperCost: 6 },
  { id: 'ledger', name: '账房', trait: '算账', helperCost: 5 },
  { id: 'rooms', name: '客房', trait: '整理', helperCost: 4 },
  { id: 'patrol', name: '巡查', trait: '护店', helperCost: 6 },
];

const dishes = [
  { id: 'noodles', name: '阳春面', basePrice: 12, ingredients: { staple: 1, vegetable: 1 }, tags: ['清淡', '快捷'] },
  { id: 'fish', name: '红烧鲈鱼', basePrice: 26, ingredients: { meat: 2, vegetable: 1 }, tags: ['荤食', '体面'] },
  { id: 'soup', name: '药膳汤', basePrice: 19, ingredients: { vegetable: 1, tea: 1 }, tags: ['清淡', '养身'] },
  { id: 'cabbage', name: '醋溜白菜', basePrice: 10, ingredients: { vegetable: 2 }, tags: ['素食', '快捷'] },
  { id: 'lion_head', name: '红烧狮子头', basePrice: 24, ingredients: { meat: 2, staple: 1 }, tags: ['荤食', '下饭'] },
  { id: 'tea_egg', name: '茶香蛋', basePrice: 15, ingredients: { tea: 1, meat: 1 }, tags: ['茶点', '便携'] },
];

const facilities = [
  { id: 'hall', name: '大堂', costs: [40, 80], effect: '提升口碑与客流' },
  { id: 'kitchen', name: '后厨', costs: [55, 95], effect: '减少食材损耗' },
  { id: 'rooms', name: '客房', costs: [70, 110], effect: '提升房费与舒适度' },
  { id: 'sign', name: '招牌', costs: [90, 140], effect: '提高特殊来客概率' },
  { id: 'yard', name: '后院', costs: [45, 85], effect: '提升筹备和休息效果' },
];

const prepActions = [
  { id: 'purchase', name: '采购食材', description: '花 10 文补充四类食材', effects: { coin: -10, stock: { staple: 3, vegetable: 3, meat: 2, tea: 2 } } },
  { id: 'prepare', name: '提前备菜', description: '消耗少量主食，今日营业效率提高', effects: { stock: { staple: -1 }, prep: 2 } },
  { id: 'clean', name: '清扫客栈', description: '提高秩序与客房整洁', effects: { order: 8, roomCleanliness: 12 } },
  { id: 'promote', name: '街口揽客', description: '花 6 文宣传，今日客流和口碑提高', effects: { coin: -6, reputation: 1, guestBonus: 1 } },
];

const guests = [
  { id: 'regular', name: '街坊熟客', prefers: ['快捷', '下饭'], patience: 3 },
  { id: 'merchant', name: '过路行商', prefers: ['便携', '体面'], patience: 2 },
  { id: 'family', name: '探亲一家', prefers: ['清淡', '养身'], patience: 3 },
  { id: 'scholar', name: '赶考书生', prefers: ['清淡', '茶点'], patience: 4 },
  { id: 'escort', name: '镖局客人', prefers: ['荤食', '下饭'], patience: 2 },
  { id: 'official', name: '巡街差役', prefers: ['快捷', '体面'], patience: 2 },
  { id: 'traveler', name: '江湖旅人', prefers: ['荤食', '便携'], patience: 2 },
  { id: 'elder', name: '远道老客', prefers: ['养身', '清淡'], patience: 4 },
];

const characterEpisodes = {
  'zhangdeng-1': {
    id: 'zhangdeng-1', roleId: 'zhangdeng', title: '三文钱的人情',
    text: '熟客想赊一碗面。柳掌灯嘴上算得精，手却已经摸向账本。',
    choices: [
      { label: '记在人情账上', result: '熟客连声道谢，答应替客栈揽客。', effects: { coin: -3, reputation: 2, affinity: { zhangdeng: 1 }, flags: ['xy-kind-ledger'] } },
      { label: '按规矩收钱', result: '账目清楚，掌柜也松了一口气。', effects: { coin: 3, order: 2, mood: { zhangdeng: -1 }, flags: ['xy-clear-price'] } },
    ],
  },
  'zhangdeng-2': {
    id: 'zhangdeng-2', roleId: 'zhangdeng', title: '缺货也要开门',
    text: '货车误时，柳掌灯在赊账补货与缩减菜单之间犹豫。',
    choices: [
      { label: '向街坊赊一批菜', result: '午市保住了，但欠下一份人情。', effects: { stock: { vegetable: 3, staple: 2 }, reputation: 1, flags: ['xy-borrowed-stock'] } },
      { label: '缩减今日菜单', result: '成本稳住，客人选择却少了一些。', effects: { order: 3, guestBonus: -1, flags: ['xy-short-menu'] } },
    ],
  },
  'zhangdeng-3': {
    id: 'zhangdeng-3', roleId: 'zhangdeng', title: '招牌值几两',
    text: '新招牌报价不低。柳掌灯想要体面，也担心压住客栈周转。',
    choices: [
      { label: '先修里子', result: '她把钱留给客房和后厨，大家心里更踏实。', effects: { order: 5, mood: { zhangdeng: 2 }, flags: ['xy-practical-sign'] } },
      { label: '换一块好招牌', result: '新招牌引来不少驻足目光。', effects: { coin: -12, reputation: 3, flags: ['xy-new-sign'] } },
    ],
  },
  'wuchen-1': {
    id: 'wuchen-1', roleId: 'wuchen', title: '快一步还是慢半步',
    text: '谢无尘能一口气端三桌菜，但他发现角落老客一直没有开口。',
    choices: [
      { label: '先照顾角落老客', result: '老客记住了这份细心。', effects: { reputation: 2, affinity: { wuchen: 1 }, energy: { wuchen: -4 }, flags: ['zt-care-first'] } },
      { label: '先把三桌跑完', result: '大堂周转飞快，几桌客人都没久等。', effects: { coin: 5, order: 2, energy: { wuchen: -6 }, flags: ['zt-speed-first'] } },
    ],
  },
  'wuchen-2': {
    id: 'wuchen-2', roleId: 'wuchen', title: '东门来的车辙',
    text: '谢无尘看出货绳上的红泥来自东关，却不愿把自己的旧门路说透。',
    choices: [
      { label: '相信他的判断', result: '他主动把东关路线画在了委托单上。', effects: { affinity: { wuchen: 2 }, flags: ['zt-route-trusted', 'sidequest-late-letter-unlocked'] } },
      { label: '让差役再核实', result: '线索更稳妥，但谢无尘明显收起了话头。', effects: { order: 2, affinity: { wuchen: -1 }, flags: ['zt-route-checked', 'sidequest-late-letter-unlocked'] } },
    ],
  },
  'wuchen-3': {
    id: 'wuchen-3', roleId: 'wuchen', title: '暗访客的眼神',
    text: '一名住客总盯着柜台和后门。谢无尘认得这种踩点的眼神。',
    choices: [
      { label: '悄悄盯住他', result: '客栈没有惊动其他客人，风险被压了下去。', effects: { order: 5, risk: -2, energy: { wuchen: -7 }, flags: ['zt-shadow-watch'] } },
      { label: '当面请他离店', result: '动作干脆，却让大堂议论了一阵。', effects: { reputation: -1, risk: -3, mood: { wuchen: 1 }, flags: ['zt-open-warning'] } },
    ],
  },
  'jingzhi-1': {
    id: 'jingzhi-1', roleId: 'jingzhi', title: '一块抹布的胜负',
    text: '霍惊枝嫌擦桌太慢，想用掌风一次吹净整间大堂。',
    choices: [
      { label: '稳稳擦完', result: '她忍住性子，把桌角都收拾得干净利落。', effects: { order: 5, affinity: { jingzhi: 1 }, energy: { jingzhi: -4 }, flags: ['fr-patient-clean'] } },
      { label: '试试掌风', result: '灰尘散了，两个茶碗也跟着遭了殃。', effects: { coin: -4, order: 3, mood: { jingzhi: 2 }, flags: ['fr-palm-clean'] } },
    ],
  },
  'jingzhi-2': {
    id: 'jingzhi-2', roleId: 'jingzhi', title: '两桌一把椅',
    text: '两桌客人争最后一把靠背椅，霍惊枝已经卷起袖口。',
    choices: [
      { label: '让她讲一次道理', result: '话虽然硬，双方倒真各退了一步。', effects: { order: 4, reputation: 1, affinity: { jingzhi: 1 }, flags: ['fr-talked-down'] } },
      { label: '掌柜亲自调停', result: '场面很快安静，霍惊枝却有点不服气。', effects: { reputation: 2, mood: { jingzhi: -1 }, flags: ['fr-held-back'] } },
    ],
  },
  'jingzhi-3': {
    id: 'jingzhi-3', roleId: 'jingzhi', title: '谁来挂招牌',
    text: '新招牌送到门口，霍惊枝坚持自己爬梯子挂上去。',
    choices: [
      { label: '让她负责', result: '招牌挂得略歪，却稳稳当当。', effects: { reputation: 1, affinity: { jingzhi: 2 }, energy: { jingzhi: -5 }, flags: ['fr-hung-sign'] } },
      { label: '大家一起搭手', result: '她嘴上嫌慢，心里却很受用。', effects: { order: 3, mood: { jingzhi: 2 }, flags: ['fr-team-sign'] } },
    ],
  },
  'wenyan-1': {
    id: 'wenyan-1', roleId: 'wenyan', title: '账本上的半钱',
    text: '闻砚发现昨夜账面差了半钱，所有人都觉得不值得再查。',
    choices: [
      { label: '陪他查到底', result: '半钱来自重复记账，今日账目从源头理顺。', effects: { coin: 4, order: 4, affinity: { wenyan: 1 }, flags: ['xc-found-half'] } },
      { label: '先顾今日营业', result: '客栈准时开门，旧账暂时夹进了书页。', effects: { guestBonus: 1, mood: { wenyan: -1 }, flags: ['xc-deferred-half'] } },
    ],
  },
  'wenyan-2': {
    id: 'wenyan-2', roleId: 'wenyan', title: '长住客的契书',
    text: '长住客想压低房价，闻砚拟了一份滴水不漏的契书。',
    choices: [
      { label: '照契书办', result: '房钱稳稳入账，住客也挑不出漏洞。', effects: { coin: 8, order: 3, affinity: { wenyan: 1 }, flags: ['xc-strict-contract'] } },
      { label: '留一条人情款', result: '少收一点房钱，换来住客长期照顾生意。', effects: { coin: 3, reputation: 2, flags: ['xc-kind-contract'] } },
    ],
  },
  'wenyan-3': {
    id: 'wenyan-3', roleId: 'wenyan', title: '一道菜的价钱',
    text: '闻砚算出热门菜还能涨价，柳掌灯却担心街坊吃不起。',
    choices: [
      { label: '只给外地客加价', result: '收益增加，价目也仍然讲得通。', effects: { coin: 7, reputation: -1, flags: ['xc-tiered-price'] } },
      { label: '维持一视同仁', result: '街坊记住了客栈没有趁热涨价。', effects: { reputation: 3, affinity: { wenyan: 1 }, flags: ['xc-fair-price'] } },
    ],
  },
};

const serviceEvents = {
  'd1-account-gap': { id: 'd1-account-gap', title: '午市第一笔账', guestId: 'regular', text: '熟客一桌点了三碗面，账单却少记了一碗。', choices: [
    { label: '闻砚当场核清', specialist: 'wenyan', job: 'ledger', result: '账单补正，客人也服气。', effects: { coin: 5, order: 2, satisfaction: 1 } },
    { label: '掌柜抹掉零头', specialist: 'zhangdeng', job: 'counter', result: '少赚一点，换来一桌笑声。', effects: { coin: 2, reputation: 1, satisfaction: 2 } },
  ] },
  'd1-tea-request': { id: 'd1-tea-request', title: '一壶热茶', guestId: 'elder', text: '老客咳得厉害，想把饭换成一壶温茶。', choices: [
    { label: '换成药膳汤', specialist: 'zhangdeng', job: 'counter', result: '老客喝得舒坦。', effects: { stock: { tea: -1 }, reputation: 2, satisfaction: 2 } },
    { label: '照单上菜', specialist: 'wuchen', job: 'service', result: '出菜很快，只是少了些体贴。', effects: { coin: 4, satisfaction: 1 } },
  ] },
  'd2-short-stock': { id: 'd2-short-stock', title: '后厨报缺', guestId: 'merchant', text: '菜刚开炒，后厨发现今日青菜只够一桌。', choices: [
    { label: '缩成拿手小菜', specialist: 'zhangdeng', job: 'counter', result: '份量少了，味道和体面保住了。', effects: { order: 2, satisfaction: 1 } },
    { label: '谢无尘跑腿补货', specialist: 'wuchen', job: 'service', result: '他来回一趟，几乎没让客人察觉。', effects: { coin: -4, stock: { vegetable: 3 }, energy: { wuchen: -5 }, satisfaction: 2 } },
  ] },
  'd2-late-merchant': { id: 'd2-late-merchant', title: '迟到的行商', guestId: 'merchant', text: '送货行商满身尘土，带来了东关货车失踪的消息。', choices: [
    { label: '先让他吃口热饭', specialist: 'zhangdeng', job: 'counter', result: '行商把沿途见闻全说了。', effects: { reputation: 1, satisfaction: 2, flags: ['sidequest-late-letter-unlocked'] } },
    { label: '立刻追问路线', specialist: 'wuchen', job: 'patrol', result: '线索很快写进委托板。', effects: { order: 2, risk: -1, flags: ['sidequest-late-letter-unlocked'] } },
  ] },
  'd3-rush-orders': { id: 'd3-rush-orders', title: '满堂催菜', guestId: 'escort', text: '三桌镖客同时催菜，后厨和跑堂都快转不过来。', choices: [
    { label: '按桌次依次出菜', specialist: 'wenyan', job: 'ledger', result: '慢了一点，但一桌都没送错。', effects: { order: 4, satisfaction: 1 } },
    { label: '让霍惊枝分桌送', specialist: 'jingzhi', job: 'service', result: '动作利落，大堂气氛也被带了起来。', effects: { coin: 5, energy: { jingzhi: -6 }, satisfaction: 2 } },
  ] },
  'd3-chair-dispute': { id: 'd3-chair-dispute', title: '一把靠背椅', guestId: 'regular', text: '两桌客人都说靠背椅是自己先占的。', choices: [
    { label: '霍惊枝讲理', specialist: 'jingzhi', job: 'rooms', result: '她把声音压住，双方总算各退一步。', effects: { order: 4, reputation: 1, satisfaction: 2 } },
    { label: '送一盘茶香蛋', specialist: 'zhangdeng', job: 'counter', result: '一盘小菜把火气化开了。', effects: { stock: { tea: -1, meat: -1 }, reputation: 2, satisfaction: 2 } },
  ] },
  'd4-long-stay': { id: 'd4-long-stay', title: '长住客压价', guestId: 'scholar', text: '赶考书生想连住三晚，却只带了两晚房钱。', choices: [
    { label: '签分期房契', specialist: 'wenyan', job: 'ledger', result: '住客按日结清，客房也没有空置。', effects: { coin: 6, roomComfort: 2, roomBooking: { guestId: 'scholar', days: 3 }, satisfaction: 2 } },
    { label: '免去最后一晚', specialist: 'zhangdeng', job: 'counter', result: '书生答应高中后再来还愿。', effects: { reputation: 3, roomBooking: { guestId: 'scholar', days: 3 }, satisfaction: 2 } },
  ] },
  'd4-night-noise': { id: 'd4-night-noise', title: '楼上异响', guestId: 'family', text: '客房传来反复挪动桌椅的声音，楼下客人开始抬头。', choices: [
    { label: '谢无尘轻声查房', specialist: 'wuchen', job: 'patrol', result: '原来是窗闩松了，很快恢复安静。', effects: { order: 4, energy: { wuchen: -3 }, satisfaction: 2 } },
    { label: '先安抚楼下客人', specialist: 'zhangdeng', job: 'counter', result: '掌柜稳住大堂，再慢慢处理楼上。', effects: { reputation: 2, order: 2, satisfaction: 1 } },
  ] },
  'd5-secret-visitor': { id: 'd5-secret-visitor', title: '不点菜的住客', guestId: 'traveler', text: '陌生人坐了半个时辰，只观察柜台和后门。', choices: [
    { label: '谢无尘暗中盯住', specialist: 'wuchen', job: 'patrol', result: '陌生人察觉无机可乘，悄悄离店。', effects: { risk: -2, order: 3, satisfaction: 1 } },
    { label: '请差役过来喝茶', specialist: 'zhangdeng', job: 'counter', result: '一桌官茶让可疑客人坐不住了。', effects: { coin: -3, reputation: 1, risk: -3 } },
  ] },
  'd5-patrol-check': { id: 'd5-patrol-check', title: '巡街查簿', guestId: 'official', text: '差役临时查看住店簿，正好撞上大堂最忙的时候。', choices: [
    { label: '闻砚递上清册', specialist: 'wenyan', job: 'ledger', result: '每一笔都对得上，检查很快结束。', effects: { order: 4, reputation: 1, satisfaction: 1 } },
    { label: '掌柜边聊边查', specialist: 'zhangdeng', job: 'counter', result: '气氛轻松，只是耽搁了几桌结账。', effects: { reputation: 2, coin: -2, satisfaction: 1 } },
  ] },
  'd6-sign-price': { id: 'd6-sign-price', title: '新招牌新价钱', guestId: 'regular', text: '街坊发现热门菜涨了价，围着柜台问个明白。', choices: [
    { label: '闻砚列明成本', specialist: 'wenyan', job: 'ledger', result: '价钱有理有据，街坊不再争论。', effects: { coin: 5, order: 3, satisfaction: 1 } },
    { label: '老客维持旧价', specialist: 'zhangdeng', job: 'counter', result: '少赚一点，老客都觉得受照顾。', effects: { reputation: 3, satisfaction: 2 } },
  ] },
  'd6-returning-guest': { id: 'd6-returning-guest', title: '带朋友回来的老客', guestId: 'elder', text: '第一日受照顾的老客带来两位朋友，点名要同一桌菜。', choices: [
    { label: '照旧单安排', specialist: 'wuchen', job: 'service', result: '谢无尘还记得每个人的口味。', effects: { coin: 8, reputation: 2, satisfaction: 2 } },
    { label: '送一道新菜', specialist: 'jingzhi', job: 'rooms', result: '新菜成了全桌的话题。', effects: { stock: { meat: -1, tea: -1 }, reputation: 2, satisfaction: 3 } },
  ] },
  'd7-banquet-open': { id: 'd7-banquet-open', title: '雁回宴开席', guestId: 'escort', text: '第一拨客人同时进门，柜台、跑堂和后厨都在等你的安排。', choices: [
    { label: '按排班稳稳开席', specialist: 'zhangdeng', job: 'counter', result: '各岗位衔接顺畅，第一轮没有乱。', effects: { coin: 10, order: 5, satisfaction: 3 } },
    { label: '先上招牌菜造势', specialist: 'wuchen', job: 'service', result: '气氛一下热起来，食材消耗也更快。', effects: { coin: 14, stock: { meat: -2 }, reputation: 2, satisfaction: 2 } },
  ] },
  'd7-banquet-toast': { id: 'd7-banquet-toast', title: '最后一桌', guestId: 'family', text: '打烊前最后一桌客人举杯，说这七日看见了真正的长风客栈。', choices: [
    { label: '掌柜回敬一杯', specialist: 'zhangdeng', job: 'counter', result: '笑声从大堂一直传到街口。', effects: { reputation: 4, satisfaction: 3, flags: ['seven-day-toast'] } },
    { label: '全伙计一起谢客', specialist: 'jingzhi', job: 'service', result: '所有人的疲惫都变成了值得。', effects: { order: 3, moodAll: 3, satisfaction: 3, flags: ['seven-day-team-bow'] } },
  ] },
};

const miniGames = {
  ledger: {
    id: 'ledger', name: '算盘核账', rounds: [
      { prompt: '三碗阳春面，每碗 12 文', options: ['30 文', '36 文', '42 文'], correct: 1 },
      { prompt: '两间客房，每间 18 文', options: ['28 文', '36 文', '38 文'], correct: 1 },
      { prompt: '收 50 文，找回 14 文', options: ['34 文', '36 文', '38 文'], correct: 1 },
    ],
  },
  rooms: {
    id: 'rooms', name: '客房整理', rounds: [
      { prompt: '窗边一直进风，先处理哪里？', options: ['窗闩', '茶杯', '房牌'], correct: 0 },
      { prompt: '住客准备歇息，先整理哪里？', options: ['账本', '被褥', '门帘'], correct: 1 },
      { prompt: '地面有水渍，应该先做什么？', options: ['盖住', '擦净', '开窗'], correct: 1 },
    ],
  },
  order: { id: 'order', name: '订单配菜', rounds: [] },
};

const dayScripts = [
  { day: 1, title: '新账开门', objective: '完成首次排班并稳住午市。', morningEpisode: 'zhangdeng-1', eveningEpisode: 'wuchen-1', serviceEvents: ['d1-account-gap', 'd1-tea-request'], miniGame: 'ledger' },
  { day: 2, title: '货车误时', objective: '在缺货情况下维持营业，并查明货车去向。', morningEpisode: 'wuchen-2', eveningEpisode: 'zhangdeng-2', serviceEvents: ['d2-short-stock', 'd2-late-merchant'], miniGame: 'order' },
  { day: 3, title: '满堂催菜', objective: '处理高峰客流与大堂争执。', morningEpisode: 'jingzhi-1', eveningEpisode: 'jingzhi-2', serviceEvents: ['d3-rush-orders', 'd3-chair-dispute'], miniGame: 'order' },
  { day: 4, title: '天字号长客', objective: '安排长住客，并稳住客房秩序。', morningEpisode: 'wenyan-1', eveningEpisode: 'wenyan-2', serviceEvents: ['d4-long-stay', 'd4-night-noise'], miniGame: 'rooms' },
  { day: 5, title: '暗访来客', objective: '识别可疑住客，不惊动正常客人。', morningEpisode: 'wuchen-3', eveningEpisode: 'zhangdeng-3', serviceEvents: ['d5-secret-visitor', 'd5-patrol-check'], miniGame: 'ledger' },
  { day: 6, title: '招牌之争', objective: '决定客栈的定价与门面方向。', morningEpisode: 'jingzhi-3', eveningEpisode: 'wenyan-3', serviceEvents: ['d6-sign-price', 'd6-returning-guest'], miniGame: 'rooms' },
  { day: 7, title: '雁回宴', objective: '完成三轮宴席，给七日经营交出答卷。', morningEpisode: null, eveningEpisode: null, serviceEvents: ['d7-banquet-open', 'd7-banquet-toast'], miniGame: 'order', finale: true },
];

const sideQuests = [{
  id: 'late-letter',
  title: '迟到的驿信',
  description: '追查失踪货车，找回客栈物资。',
  unlockFlag: 'sidequest-late-letter-unlocked',
  completeFlag: 'chapter-late-letter-complete',
  startMap: 'inn',
  startSpawn: 'main',
  rewards: { stock: { staple: 3, vegetable: 2, meat: 2, tea: 1 }, recipe: 'tea_egg' },
}];

module.exports = {
  jobs,
  dishes,
  facilities,
  prepActions,
  guests,
  characterEpisodes,
  serviceEvents,
  miniGames,
  dayScripts,
  sideQuests,
};
