const profiles = {
  classicDev: {
    title: '武林外传·灯下江湖',
    innName: '同福客栈',
    townName: '七侠镇',
    roles: {
      zhangdeng: '佟湘玉',
      wuchen: '白展堂',
      jingzhi: '郭芙蓉',
      wenyan: '吕秀才',
      shiwei: '李大嘴',
      xiaoman: '莫小贝',
      qiubai: '祝无双',
      tangyu: '燕小六',
      zhaochuan: '邢捕头',
    },
  },
  originalRelease: {
    title: '灯下江湖',
    innName: '长风客栈',
    townName: '雁回镇',
    roles: {
      zhangdeng: '柳掌灯',
      wuchen: '谢无尘',
      jingzhi: '霍惊枝',
      wenyan: '闻砚',
      shiwei: '庞十味',
      xiaoman: '叶小满',
      qiubai: '宁秋白',
      tangyu: '唐榆',
      zhaochuan: '裴照川',
    },
  },
};

const ACTIVE_PROFILE = 'classicDev';

function profile(id) {
  return profiles[id] || profiles[ACTIVE_PROFILE];
}

function roleName(id, profileId) {
  const selected = profile(profileId);
  return selected.roles[id] || id;
}

function resolve(text, profileId) {
  const selected = profile(profileId);
  return String(text || '')
    .replace(/\{title\}/g, selected.title)
    .replace(/\{inn\}/g, selected.innName)
    .replace(/\{town\}/g, selected.townName)
    .replace(/\{role:([a-z_]+)\}/g, function (_, id) { return roleName(id, profileId); });
}

module.exports = {
  ACTIVE_PROFILE: ACTIVE_PROFILE,
  profiles: profiles,
  profile: profile,
  roleName: roleName,
  resolve: resolve,
};
