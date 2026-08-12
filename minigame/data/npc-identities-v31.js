'use strict';

// Gameplay IDs stay stable for saves and quests. Classic 武林外传 identities are
// now the canonical roster presentation for all 36 population NPCs.
var CLASSIC = {
  'herbalist-qiu': classic('祝无双', 'zhu-wushuang', 2, 2, '药囊与精准剑姿对应行医调查'),
  'opera-lady-su': classic('扈十娘', 'hu-shiniang', 3, 5, '琵琶与戏箱对应演出事件'),
  'coppersmith-han': classic('杨蕙兰', 'yang-huilan', 1, 5, '长兵器与护送冲突对应兵器铺'),
  'noodle-vendor-ma': classic('小米', 'xiaomi', 1, 0, '街头姿态对应市井情报'),
  'porter-alu': classic('追风', 'zhuifeng', 2, 4, '追踪装备对应码头查货'),
  'storyteller-shen': classic('朱先生', 'zhu-xiansheng', 3, 0, '戒尺与卷轴对应讲学传闻'),
  'seamstress-wen': classic('小翠', 'xiaocui', 1, 4, '利落杂役姿态对应布料线索'),
  'umbrella-maker-luo': classic('柳月云', 'liu-yueyun', 6, 4, '轻装与绳结对应雨具任务'),
  'courier-aqi': classic('燕小六', 'yan-xiaoliu', 2, 1, '冒进捕快对应遗失公文'),

  'salt-merchant-xu': classic('钱掌柜', 'qian-zhanggui', 1, 1, '算盘与钱袋对应盐货交易'),
  'grain-inspector-lin': classic('邢捕头', 'xing-butou', 2, 0, '老练差役对应验粮秩序'),
  'boatwoman-he': classic('柳星雨', 'liu-xingyu', 6, 3, '伪装与开锁工具对应码头疑案'),
  'ticket-clerk-fang': classic('窦先生', 'dou-xiansheng', 3, 1, '账册与印盒对应票号核验'),
  'scale-mender-ge': classic('杜子俊', 'du-zijun', 6, 0, '契约与巨资对应秤契争议'),
  'spice-broker-rong': classic('赛貂蝉', 'sai-diaochan', 1, 3, '商户气质对应香料竞价'),
  'warehouse-foreman-dou': classic('郭巨侠', 'guo-juxia', 5, 3, '威严掌势对应货栈秩序'),
  'scribe-pei': classic('慕容嫣', 'murong-yan', 5, 5, '采写身份对应账房线索'),
  'caravan-matriarch-shao': classic('断指轩辕', 'duanzhi-xuanyuan', 3, 2, '江湖长辈对应旧商路传闻'),

  'bridge-mason-zhao': classic('凌腾云', 'ling-tengyun', 2, 5, '守桥刀客对应桥面修复'),
  'woodcutter-yun': classic('清风', 'qingfeng', 3, 4, '药草背篓对应后院柴草'),
  'ferryman-wu': classic('岳松涛', 'yue-songtao', 6, 5, '盟主令与赌具对应辨船传闻'),
  'boat-tracker-qiao': classic('展红绫', 'zhan-hongling', 2, 3, '六扇门令牌对应缆绳追踪'),
  'paper-apprentice-mo': classic('佟石头', 'tong-shitou', 5, 1, '少年学徒对应纸坊取样'),
  'night-watchman-lai': classic('白三娘', 'bai-sanniang', 5, 2, '密探姿态对应夜间脚印'),
  'retired-guard-cao': classic('佟伯达', 'tong-boda', 5, 0, '商路长辈对应关口经验'),
  'cartwright-lu': classic('郭蔷薇', 'guo-qiangwei', 5, 4, '骑装与长鞭对应车道护送'),
  'fisherman-jiang': classic('金镶玉', 'jin-xiangyu', 6, 1, '客栈掌柜气质对应水路木牌'),

  'physician-ning': classic('上官云顿', 'shangguan-yundun', 4, 2, '温和外表与毒针对应可疑医案'),
  'fortune-reader-yan': classic('公孙乌龙', 'gongsun-wulong', 4, 4, '一指姿态对应危险卜者'),
  'runaway-apprentice-tang': classic('姬无病', 'ji-wubing', 4, 1, '伪令与夸张姿态对应逃徒骗局'),
  'debt-collector-xiao': classic('钱夫人', 'qian-furen', 1, 2, '强势商户对应债契辨伪'),
  'refugee-father-gu': classic('姬无命', 'ji-wuming', 4, 0, '落魄伪装对应身份疑点'),
  'tea-picker-qing': classic('平谷一点红', 'pinggu-yidianhong', 4, 3, '红巾剑客伪装成茶客'),
  'cook-helper-pang': classic('诸葛孔方', 'zhuge-kongfang', 3, 3, '御厨体态与锅勺对应残谱'),
  'locksmith-qi': classic('谢步东', 'xie-budong', 4, 5, '钩刀与绳套对应旧库开锁'),
  'map-seller-ye': classic('包大仁', 'bao-daren', 6, 2, '伪文书对应被篡改路线'),
};

function classic(name, slug, sheet, cell, note) {
  return { name: name, slug: slug, sheet: sheet, cell: cell, note: note };
}

function definition(id) {
  return CLASSIC[id] || null;
}

// Classic 武林外传 identities are now the canonical NPC roster presentation.
// The original-IP placeholder names have been retired, so present/artPath/
// portraitPath always resolve to the classic profile regardless of brand.
function present(entry) {
  var replacement = definition(entry.id);
  if (!replacement) return entry;
  return Object.assign({}, entry, { name: replacement.name });
}

function artPath(id) {
  var replacement = definition(id);
  if (!replacement) return '@npc-pop-v26/npcs/' + id + '.png';
  return '@npc-pop-v26/npcs/classic-v31/' + replacement.slug + '.png';
}

function portraitPath(id) {
  var replacement = definition(id);
  if (!replacement) return null;
  return '@npc-pop-v26/npcs/classic-v31/portraits/' + replacement.slug + '.webp';
}

module.exports = {
  classic: CLASSIC,
  definition: definition,
  present: present,
  artPath: artPath,
  portraitPath: portraitPath,
};
