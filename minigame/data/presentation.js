var DRAMATIC_DIALOGUES = {
  'c03-old-letter': true,
  'c03-finale': true,
  'c04-cooperate': true,
  'c05-finale': true,
  'c06-finale': true,
  'c07-finale': true,
  'c08-fragment': true,
  'c08-finale': true,
  'c09-finale': true,
  'c10-finale': true,
  'c11-shiwei-trust': true,
  'c11-shiwei-quest': true,
  'c11-finale': true,
};

var BUBBLE_DIALOGUES = {
  'street-merchant': true,
  'tea-owner': true,
  'gate-check': true,
};

var COUNTERPARTS = {
  'late-letter-briefing': 'wuchen',
  'late-letter-return': 'wenyan',
  'c03-briefing': 'wuchen',
  'c05-briefing': 'jingzhi',
  'c07-briefing': 'wenyan',
  'c09-briefing': 'shiwei',
  'c09-finale': 'shiwei',
  'c10-briefing': 'shiwei',
  'c11-briefing': 'shiwei',
};

var EXPRESSIONS = {
  'c03-old-letter': 'tense',
  'c03-finale': 'relieved',
  'c04-cooperate': 'questioning',
  'c05-finale': 'thoughtful',
  'c06-finale': 'angry',
  'c07-finale': 'thoughtful',
  'c08-fragment': 'questioning',
  'c08-finale': 'relieved',
  'c09-shiwei-meet': 'angry',
  'c10-shiwei-cooperate': 'focused',
  'c11-shiwei-trust': 'sad',
  'c11-shiwei-quest': 'angry',
  'c11-finale': 'happy',
};

var POSES = {
  'c03-old-letter': 'explain',
  'c04-cooperate': 'emotion',
  'c07-finale': 'think',
  'c08-fragment': 'explain',
  'c11-shiwei-trust': 'think',
  'c11-shiwei-quest': 'emotion',
};

var ROLE_VFX = {
  zhangdeng: {
    palette: ['#f4d784', '#d79a42', '#9b4835'],
    motifs: ['lantern', 'ledger', 'abacus'],
    shake: [0, 0, 2],
  },
  wuchen: {
    palette: ['#d9f3df', '#65aaa0', '#315f67'],
    motifs: ['wind', 'acupoint', 'footwork'],
    shake: [1, 1, 2],
  },
  jingzhi: {
    palette: ['#ffd0a5', '#c75139', '#7e2c26'],
    motifs: ['palm', 'guard', 'impact'],
    shake: [2, 1, 4],
  },
  wenyan: {
    palette: ['#ece3c1', '#718d88', '#252d35'],
    motifs: ['ink', 'contract', 'seal'],
    shake: [0, 1, 2],
  },
  shiwei: {
    palette: ['#ffe0a0', '#d77832', '#8f3529'],
    motifs: ['fire', 'steam', 'spice'],
    shake: [3, 1, 3],
  },
};

function eightFrameAtlas(atlas, displayScale) {
  return {
    atlas: atlas,
    frameSize: { width: 443, height: 443 },
    atlasColumns: 4,
    displayScale: displayScale || 0.58,
    frames: {
      anticipation: [0],
      active: [1, 2, 3],
      impact: [4, 5],
      recovery: [6, 7],
    },
  };
}

var SKILL_ATLASES = {
  zhangdeng: {
    0: eightFrameAtlas('@ch34/skills/xiangyu/read-hearts-v22.webp', 0.56),
    1: eightFrameAtlas('@ch34/skills/xiangyu/hundred-ledgers-v22.webp', 0.58),
    2: eightFrameAtlas('@ch34/skills/xiangyu/settle-heart-v21.webp', 0.58),
  },
  wuchen: {
    0: eightFrameAtlas('@ch34/skills/wuchen/flash-delivery-v22.webp', 0.56),
    1: eightFrameAtlas('@ch34/skills/wuchen/intercept-wind-v20.webp', 0.58),
    2: eightFrameAtlas('@ch34/skills/wuchen/courier-trace-v21.webp', 0.58),
  },
  jingzhi: {
    0: eightFrameAtlas('@ch34/skills/jingzhi/break-formation-v22.webp', 0.60),
    1: eightFrameAtlas('@ch34/skills/jingzhi/guard-guests-v22.webp', 0.60),
    2: eightFrameAtlas('@ch34/skills/jingzhi/halt-uproar-v21.webp', 0.62),
  },
  wenyan: {
    0: eightFrameAtlas('@ch34/skills/wenyan/hidden-ink-v22.webp', 0.56),
    1: eightFrameAtlas('@ch34/skills/wenyan/fixed-contract-v22.webp', 0.58),
    2: eightFrameAtlas('@ch34/skills/wenyan/remember-record-v21.webp', 0.58),
  },
  shiwei: {
    0: eightFrameAtlas('@s2ch910/skills/shiwei/ten-flavor-fire-v22.webp', 0.62),
    1: eightFrameAtlas('@s2ch910/skills/shiwei/herbal-feast-v22.webp', 0.58),
    2: eightFrameAtlas('@s2ch910/skills/shiwei/seal-stove-v21.webp', 0.62),
  },
};

var OUTDOOR_MAPS = {
  street: true,
  locust_lane: true,
  tea_shed: true,
  east_gate: true,
  stone_bridge: true,
  paper_alley: true,
  north_road: true,
  river_yard: true,
  grain_market: true,
  scale_contract_lane: true,
  canal_checkpoint: true,
  jiangnan_dock: true,
  river_market: true,
  rain_ferry: true,
};

function dialogue(id, definition) {
  var speakerId = definition && definition.speakerId || null;
  var listenerId = COUNTERPARTS[id] || (speakerId && speakerId !== 'zhangdeng' ? 'zhangdeng' : null);
  return {
    presentation: DRAMATIC_DIALOGUES[id] ? 'dramatic' : BUBBLE_DIALOGUES[id] ? 'bubble' : 'standard',
    listenerId: listenerId,
    expression: EXPRESSIONS[id] || 'neutral',
    pose: POSES[id] || 'idle',
  };
}

function skill(roleId, index, skillType) {
  var role = ROLE_VFX[roleId] || ROLE_VFX.zhangdeng;
  var skillIndex = Math.max(0, Math.min(2, Number(index) || 0));
  var generated = SKILL_ATLASES[roleId] && SKILL_ATLASES[roleId][skillIndex];
  var visual = {
    atlas: null,
    frameSize: null,
    atlasColumns: 1,
    frames: { anticipation: [], active: [], impact: [], recovery: [] },
    roleId: roleId,
    skillIndex: skillIndex,
    skillType: skillType,
    motif: role.motifs[skillIndex],
    palette: role.palette.slice(),
    anticipation: skillIndex === 2 ? 260 : 200,
    active: skillIndex === 2 ? 500 : 340,
    impact: skillIndex === 2 ? 90 : 70,
    hitStop: skillIndex === 2 ? 90 : 70,
    recovery: skillIndex === 2 ? 240 : 180,
    cutIn: skillIndex === 2,
    cameraShake: role.shake[skillIndex],
    screenTint: role.palette[1],
  };
  if (generated) {
    visual.atlas = generated.atlas;
    visual.frameSize = generated.frameSize;
    visual.atlasColumns = generated.atlasColumns;
    visual.displayScale = generated.displayScale || 1;
    visual.frames = generated.frames;
  }
  return visual;
}

function transition(fromMapId, toMapId) {
  var fromOutdoor = !!OUTDOOR_MAPS[fromMapId];
  var toOutdoor = !!OUTDOOR_MAPS[toMapId];
  var longTravel = (fromMapId && fromMapId.indexOf('jiangnan') >= 0) !== (toMapId && toMapId.indexOf('jiangnan') >= 0)
    && (fromMapId === 'inn' || toMapId === 'jiangnan_dock');
  if (longTravel) return { kind: 'route', duration: 700, switchAt: 0.56 };
  if (fromOutdoor && toOutdoor) return { kind: 'ink-pan', duration: 320, switchAt: 0.5 };
  return { kind: 'door', duration: 420, switchAt: 0.52 };
}

module.exports = {
  dialogue: dialogue,
  skill: skill,
  transition: transition,
  roleVfx: ROLE_VFX,
};
