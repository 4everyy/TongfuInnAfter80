var content = require('../../data/content');
var world = require('../world/explore');
var management = require('../inn/inn');
var campaign = require('../core/campaign');
var caseFiles = require('../core/case-files');

var roles = content.roles;
var battles = content.battles;
var effectSerial = 0;
var enemyTimer = null;
var scheduledBattle = null;

function role(id) {
  var index;
  for (index = 0; index < roles.length; index += 1) {
    if (roles[index].id === id) return roles[index];
  }
  return null;
}

function alive(list) {
  return (list || []).filter(function (item) {
    return item.hp > 0;
  });
}

function numberOr(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function copyEnemy(enemy, index) {
  var unit = {};
  Object.keys(enemy || {}).forEach(function (key) {
    unit[key] = enemy[key];
  });
  unit.id = unit.id || 'enemy-' + index;
  unit.maxHp = numberOr(unit.maxHp, unit.hp);
  unit.shield = 0;
  unit.stun = 0;
  unit.weak = 0;
  unit.taunt = 0;
  unit.actionCount = numberOr(unit.actionCount, 0);
  return unit;
}

function pushEffect(battle, effect) {
  var entry = {};
  Object.keys(effect || {}).forEach(function (key) {
    entry[key] = effect[key];
  });
  effectSerial += 1;
  entry.id = 'battle-effect-' + Date.now() + '-' + effectSerial;
  entry.startedAt = Date.now();
  entry.duration = numberOr(entry.duration, 760);
  if (!battle.effects) battle.effects = [];
  battle.effects.push(entry);
  if (battle.effects.length > 18) battle.effects.splice(0, battle.effects.length - 18);
  return entry;
}

function partyUnit(state, id) {
  var definition = role(id);
  var character = state.characters[id];
  return {
    id: id,
    hp: numberOr(character.hp, definition.stats[0]),
    maxHp: definition.stats[0],
    qi: numberOr(character.qi, definition.stats[1]),
    shield: 0,
    stun: 0,
    focus: 0,
    taunt: 0,
  };
}

function start(state, id) {
  var definition = battles[id];
  var sourceParty = state.party || [];
  var party;

  if (!definition) {
    state.toast = '这场战斗尚未准备好。';
    return false;
  }

  party = sourceParty.filter(function (member, index) {
    return sourceParty.indexOf(member) === index
      && state.characters[member]
      && campaign.canTravel(state, member)
      && role(member);
  }).slice(0, 3);

  if (!party.length) {
    state.toast = '没有可以出战的队员。';
    return false;
  }

  state.battle = {
    id: id,
    startedAt: Date.now(),
    title: definition.title,
    background: definition.background || null,
    leaderId: party.indexOf(state.activeId) >= 0 ? state.activeId : party[0],
    party: party.map(function (member) {
      return partyUnit(state, member);
    }),
    enemies: (definition.enemies || []).map(copyEnemy),
    turn: null,
    queue: [],
    log: '敌人拦住了去路。',
    selected: 0,
    pendingAction: null,
    inspect: null,
    warning: null,
    effects: [],
    metrics: { actions: 0, rounds: 1, damageDealt: 0, damageTaken: 0, healing: 0, partyDown: 0 },
    result: null,
  };
  next(state);
  return true;
}

function label(turn) {
  var definition = turn.side === 'party' ? role(turn.unit.id) : null;
  return definition ? definition.name : turn.unit.name;
}

function hurt(target, amount) {
  var before = target.hp;
  var defended = Math.min(target.shield || 0, amount);
  target.shield = Math.max(0, (target.shield || 0) - amount);
  target.hp = Math.max(0, target.hp - amount + defended);
  return Math.max(0, before - target.hp);
}

function turnSpeed(turn) {
  var definition = turn.side === 'party' ? role(turn.unit.id) : null;
  return definition ? definition.stats[2] : numberOr(turn.unit.speed, 0);
}

function unitById(list, id) {
  var index;
  for (index = 0; index < (list || []).length; index += 1) {
    if (list[index].id === id && list[index].hp > 0) return list[index];
  }
  return null;
}

function targetForEnemy(targets) {
  var guarded = (targets || []).filter(function (unit) { return unit.taunt > 0; });
  var candidates = guarded.length ? guarded : (targets || []);
  return candidates.slice().sort(function (left, right) {
    var leftValue = left.hp + (left.shield || 0) * 0.7;
    var rightValue = right.hp + (right.shield || 0) * 0.7;
    return leftValue - rightValue;
  })[0] || null;
}

function enemyPlan(unit, targets) {
  var target = targetForEnemy(targets);
  var count = numberOr(unit.actionCount, 0);
  var multiplier = 1;
  var name = '正面突袭';
  var style = 'damage';
  var stun = false;
  if (unit.artId === 'ruffian_heavy' && count % 3 === 0) {
    multiplier = 1.28;
    name = '沉肩冲撞';
    style = 'heavy';
    stun = true;
  } else if (unit.artId === 'ruffian_fast' && count % 3 === 1) {
    multiplier = 1.16;
    name = '连环快袭';
    style = 'quick';
  } else if (unit.artId === 'ruffian_fast') {
    multiplier = 0.92;
    name = '试探快步';
    style = 'quick';
  }
  return {
    sourceId: unit.id,
    targetIds: target ? [target.id] : [],
    name: name,
    style: style,
    multiplier: multiplier,
    stun: stun,
    estimated: target ? Math.max(4, Math.round(unit.atk * multiplier) - (target.focus || 0) - (unit.weak || 0)) : 0,
  };
}

function scheduleEnemyTurn(state, battle) {
  var warning;
  var delay;
  if (!battle || battle.result || !battle.turn || battle.turn.side !== 'enemy') return;
  if (scheduledBattle === battle) return;
  warning = enemyPlan(battle.turn.unit, alive(battle.party));
  warning.startedAt = Date.now();
  warning.executesAt = warning.startedAt + 760;
  battle.warning = warning;
  battle.log = battle.turn.unit.name + '正在蓄势：“' + warning.name + '”。';
  scheduledBattle = battle;
  delay = Math.max(140, warning.executesAt - Date.now());
  enemyTimer = setTimeout(function () {
    if (scheduledBattle !== battle) return;
    scheduledBattle = null;
    enemyTimer = null;
    enemyTurn(state, battle);
  }, delay);
}

function clearEnemyTimer(battle) {
  if (scheduledBattle !== battle) return;
  if (enemyTimer) clearTimeout(enemyTimer);
  scheduledBattle = null;
  enemyTimer = null;
}

function next(state) {
  var battle = state.battle;
  var current;

  if (!battle) return;
  if (battle.result) return;
  if (!alive(battle.enemies).length) {
    win(state);
    return;
  }
  if (!alive(battle.party).length) {
    lose(state);
    return;
  }

  battle.pendingAction = null;
  battle.warning = null;
  if (!battle.queue.length) {
    battle.queue = alive(battle.party).map(function (unit) {
      return { side: 'party', unit: unit };
    }).concat(alive(battle.enemies).map(function (unit) {
      return { side: 'enemy', unit: unit };
    }));
    battle.queue.forEach(function (turn) {
      turn.speed = turnSpeed(turn);
    });
    battle.queue.sort(function (a, b) {
      return b.speed - a.speed;
    });
    battle.metrics.rounds += battle.metrics.actions ? 1 : 0;
  }

  current = battle.queue.shift();
  battle.turn = current;
  if (current.unit.stun) {
    current.unit.stun -= 1;
    battle.log = label(current) + '无法行动。';
    next(state);
    return;
  }
  if (current.side === 'enemy') {
    scheduleEnemyTurn(state, battle);
  }
}

function enemyTurn(state, expectedBattle) {
  var battle = state.battle;
  var targets;
  var target;
  var damage;
  var warning;

  if (!battle || battle !== expectedBattle || battle.result || !battle.turn || battle.turn.side !== 'enemy') return;
  targets = alive(battle.party);
  if (!targets.length) {
    next(state);
    return;
  }
  warning = battle.warning || enemyPlan(battle.turn.unit, targets);
  target = unitById(targets, warning.targetIds && warning.targetIds[0]) || targetForEnemy(targets);
  if (!target) {
    next(state);
    return;
  }
  damage = Math.max(4, Math.round(battle.turn.unit.atk * (warning.multiplier || 1)) - (target.focus || 0) - (battle.turn.unit.weak || 0));
  damage = hurt(target, damage);
  pushEffect(battle, {
    kind: 'damage',
    skillType: warning.style === 'quick' ? 'damageAll' : 'damage',
    sourceSide: 'enemy',
    sourceId: battle.turn.unit.id,
    targetSide: 'party',
    targetId: target.id,
    amount: damage,
  });
  if (warning.stun && target.hp > 0) {
    target.stun = 1;
    pushEffect(battle, {
      kind: 'status', skillType: 'stun', sourceSide: 'enemy', sourceId: battle.turn.unit.id,
      targetSide: 'party', targetId: target.id,
    });
  }
  battle.metrics.damageTaken += damage;
  battle.metrics.actions += 1;
  battle.turn.unit.actionCount += 1;
  if (battle.turn.unit.weak > 0) battle.turn.unit.weak -= 1;
  if (target.taunt > 0) target.taunt -= 1;
  battle.warning = null;
  battle.log = battle.turn.unit.name + '施展“' + warning.name + '”，' + role(target.id).name + '受到 ' + damage + ' 点伤害。';
  next(state);
}

function actionNeedsTarget(type, skill) {
  return type === 'attack' || (type === 'skill' && skill && (skill[1] === 'damage' || skill[1] === 'stun'));
}

function action(state, type, value, targetId) {
  var battle = state.battle;
  var actor;
  var definition;
  var targets;
  var target;
  var damage;
  var skill;
  var amount;
  var actual;
  var healed;
  var needsTarget;

  if (!battle || battle.result || !battle.turn || battle.turn.side !== 'party') return;
  actor = battle.turn.unit;
  definition = role(actor.id);
  targets = alive(battle.enemies);
  skill = type === 'skill' ? definition && definition.skills[value] : null;
  needsTarget = actionNeedsTarget(type, skill);
  if (!definition || (needsTarget && !targets.length)) {
    next(state);
    return;
  }

  if (needsTarget && targets.length > 1 && !targetId) {
    battle.pendingAction = { type: type, index: typeof value === 'number' ? value : 0 };
    battle.inspect = null;
    battle.log = '请选择“' + (type === 'attack' ? '普通攻击' : skill[0]) + '”的目标。';
    return false;
  }
  target = unitById(targets, targetId) || targets[0];

  if (type === 'attack') {
    damage = definition.stats[2] + 10 + actor.focus;
    actual = hurt(target, damage);
    pushEffect(battle, {
      kind: 'damage',
      skillType: 'damage',
      sourceSide: 'party',
      sourceId: actor.id,
      targetSide: 'enemy',
      targetId: target.id,
      amount: actual,
    });
    battle.metrics.damageDealt += actual;
    battle.log = definition.name + '发动普通攻击，造成 ' + actual + ' 点伤害。';
  } else if (type === 'skill') {
    if (!skill) return;
    if (actor.qi < skill[2]) {
      battle.log = definition.name + '真气不足，还差 ' + (skill[2] - actor.qi) + ' 点。';
      return;
    }
    actor.qi -= skill[2];
    amount = skill[3];
    if (skill[1] === 'damage') {
      actual = hurt(target, amount + actor.focus);
      pushEffect(battle, {
        kind: 'damage',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'enemy',
        targetId: target.id,
        amount: actual,
      });
      battle.metrics.damageDealt += actual;
    }
    if (skill[1] === 'damageAll') targets.forEach(function (enemy) {
      actual = hurt(enemy, amount);
      pushEffect(battle, {
        kind: 'damage',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'enemy',
        targetId: enemy.id,
        amount: actual,
      });
      battle.metrics.damageDealt += actual;
    });
    if (skill[1] === 'heal') {
      healed = Math.min(amount, definition.stats[0] - actor.hp);
      actor.hp += healed;
      pushEffect(battle, {
        kind: 'heal',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'party',
        targetId: actor.id,
        amount: healed,
      });
      battle.metrics.healing += healed;
    }
    if (skill[1] === 'healAll') alive(battle.party).forEach(function (unit) {
      healed = Math.min(amount, role(unit.id).stats[0] - unit.hp);
      unit.hp += healed;
      pushEffect(battle, {
        kind: 'heal',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'party',
        targetId: unit.id,
        amount: healed,
      });
      battle.metrics.healing += healed;
    });
    if (skill[1] === 'shield') {
      actor.shield += amount;
      pushEffect(battle, {
        kind: 'shield',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'party',
        targetId: actor.id,
        amount: amount,
      });
    }
    if (skill[1] === 'stun') {
      target.stun = 1;
      pushEffect(battle, {
        kind: 'status',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'enemy',
        targetId: target.id,
      });
    }
    if (skill[1] === 'weaken') targets.forEach(function (enemy) {
      enemy.weak = 4;
      pushEffect(battle, {
        kind: 'status',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'enemy',
        targetId: enemy.id,
      });
    });
    if (skill[1] === 'focus') {
      actor.focus += amount;
      pushEffect(battle, {
        kind: 'status',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'party',
        targetId: actor.id,
        amount: amount,
      });
    }
    if (skill[1] === 'taunt') {
      actor.shield += amount;
      actor.taunt = Math.max(actor.taunt || 0, 2);
      pushEffect(battle, {
        kind: 'shield',
        skillType: skill[1],
        sourceSide: 'party',
        sourceId: actor.id,
        targetSide: 'party',
        targetId: actor.id,
        amount: amount,
      });
    }
    battle.log = definition.name + '施展“' + skill[0] + '”。';
  } else if (type === 'defend') {
    actor.shield += 18;
    actor.qi = Math.min(definition.stats[1], actor.qi + 8);
    pushEffect(battle, {
      kind: 'shield',
      skillType: 'defend',
      sourceSide: 'party',
      sourceId: actor.id,
      targetSide: 'party',
      targetId: actor.id,
      amount: 18,
    });
    battle.log = definition.name + '摆出守势。';
  } else {
    return;
  }
  battle.metrics.actions += 1;
  battle.pendingAction = null;
  battle.inspect = null;
  next(state);
}

function selectTarget(state, targetId) {
  var battle = state.battle;
  var pending;
  if (!battle || !battle.pendingAction || battle.result || !battle.turn || battle.turn.side !== 'party') return false;
  pending = battle.pendingAction;
  return action(state, pending.type, pending.index, targetId);
}

function cancelTarget(state) {
  var battle = state.battle;
  if (!battle || !battle.pendingAction) return false;
  battle.pendingAction = null;
  battle.log = '已收回招式，重新选择。';
  return true;
}

function inspect(state, side, id) {
  var battle = state.battle;
  var unit = unitById(side === 'enemy' ? battle && battle.enemies : battle && battle.party, id);
  if (!battle || !unit || battle.result) return false;
  battle.inspect = { side: side, id: id };
  return true;
}

function closeInspect(state) {
  if (!state.battle) return false;
  state.battle.inspect = null;
  return true;
}

function addInventory(state, key, amount) {
  if (typeof amount !== 'number' || !isFinite(amount)) return;
  state.inventory[key] = Math.max(0, numberOr(state.inventory[key], 0) + amount);
}

function applyFlags(state, reward) {
  var flags = reward.flags;
  if (reward.flag) state.flags[reward.flag] = true;
  if (typeof flags === 'string') state.flags[flags] = true;
  else if (Array.isArray(flags)) flags.forEach(function (flag) { state.flags[flag] = true; });
  else if (flags) Object.keys(flags).forEach(function (flag) { state.flags[flag] = !!flags[flag]; });
}

function applyReward(state, reward) {
  addInventory(state, 'coin', reward.coin);
  if (reward.ingredient) management.changeStock(state, { staple: reward.ingredient });
  addInventory(state, 'medicine', reward.medicine);
  if (typeof reward.reputation === 'number' && isFinite(reward.reputation)) {
    state.inn.reputation = Math.max(0, numberOr(state.inn.reputation, 0) + reward.reputation);
  }
  applyFlags(state, reward);
  caseFiles.applyEffects(state, reward);
}

function battleGrade(battle) {
  var maximum = 0;
  var current = 0;
  var metrics = battle.metrics || {};
  var par;
  var score;
  (battle.party || []).forEach(function (unit) {
    maximum += unit.maxHp || 1;
    current += Math.max(0, unit.hp || 0);
  });
  par = Math.max(3, (battle.enemies || []).length * 3);
  score = (maximum ? current / maximum : 0) * 70
    + Math.max(0, 20 - Math.max(0, numberOr(metrics.actions, 0) - par) * 2)
    + (numberOr(metrics.partyDown, 0) ? 0 : 10);
  if (score >= 88) return { grade: 'S', label: '全员平安', score: Math.round(score) };
  if (score >= 72) return { grade: 'A', label: '稳胜归店', score: Math.round(score) };
  if (score >= 52) return { grade: 'B', label: '有惊无险', score: Math.round(score) };
  return { grade: 'C', label: '险守此程', score: Math.round(score) };
}

function rareDropFor(battle, grade) {
  var defaults = {
    bridge_ruffians: { id: 'bridge-pass-fragment', name: '石桥路引残角' },
    'c08-vault-guard': { id: 'ledger-wax-seal', name: '旧账蜡印' },
    'c11-flavor-guard': { id: 'spice-seal', name: '香料封签' },
  };
  var definition = battles[battle.id] || {};
  var reward = definition.reward || {};
  var drop = reward.rareDrop || defaults[battle.id];
  if (!drop || (grade.grade !== 'S' && grade.grade !== 'A')) return null;
  if (typeof drop === 'string') return { id: drop, name: drop };
  return { id: drop.id, name: drop.name || '稀有战利品' };
}

function applyBattleLinks(state, battle, grade) {
  var key = 'battle-links-' + battle.id;
  var links = { chapter: state.campaign && state.campaign.chapter || 1, grade: grade.grade, relationships: [], rareDrop: null };
  var gain = grade.grade === 'S' ? 2 : 1;
  if (!state.flags[key]) {
    campaign.ensure(state);
    (battle.party || []).forEach(function (unit) {
      if (unit.id === 'zhangdeng' || !state.relationships[unit.id]) return;
      state.relationships[unit.id].trust += gain;
      state.relationships[unit.id].history.push({ at: Date.now(), stage: 'battle', note: '并肩完成“' + battle.title + '”' });
      links.relationships.push({ id: unit.id, gain: gain });
    });
    state.flags[key] = true;
    links.rareDrop = rareDropFor(battle, grade);
    if (links.rareDrop) {
      state.inventory.trophies = state.inventory.trophies || {};
      state.inventory.trophies[links.rareDrop.id] = Math.max(0, numberOr(state.inventory.trophies[links.rareDrop.id], 0)) + 1;
    }
  }
  return links;
}

function rewardToast(reward) {
  var gains = [];
  if (reward.coin) gains.push(reward.coin + ' 文');
  if (reward.ingredient) gains.push(reward.ingredient + ' 份食材');
  if (reward.medicine) gains.push(reward.medicine + ' 份药品');
  if (reward.reputation) gains.push(reward.reputation + ' 点声望');
  return gains.length ? '战斗胜利，获得 ' + gains.join('、') + '。' : '战斗胜利。';
}

function win(state) {
  var battle = state.battle;
  var definition = battle && battles[battle.id];
  var reward = definition && definition.reward || {};
  var grade;
  var links;
  if (!battle || battle.result) return;
  clearEnemyTimer(battle);
  grade = battleGrade(battle);
  applyReward(state, reward);
  links = applyBattleLinks(state, battle, grade);
  battle.turn = null;
  battle.queue = [];
  battle.result = {
    status: 'victory',
    startedAt: Date.now(),
    reward: reward,
    grade: grade,
    links: links,
    message: reward.toast || rewardToast(reward),
    claimed: false,
  };
  battle.log = '胜负已定，客栈众人守住了这一程。';
  world.syncQuest(state);
}

function finish(state) {
  var battle = state.battle;
  if (!battle || !battle.result || battle.result.status !== 'victory') return false;
  state.toast = battle.result.message;
  battle.result.claimed = true;
  state.battle = null;
  world.syncQuest(state);
  return true;
}

function lose(state) {
  if (state.battle) clearEnemyTimer(state.battle);
  state.battle = null;
  if (state.activeBranchId === 'jiangnan') {
    world.spawn(state, 'jiangnan_branch', 'recovery', '战斗失利，先回水巷分店休整。');
    world.syncQuest(state);
    return;
  }
  world.spawn(state, 'inn', 'recovery', '败下阵来，先回客栈休整。');
  world.syncQuest(state);
}

module.exports = {
  start: start,
  action: action,
  selectTarget: selectTarget,
  cancelTarget: cancelTarget,
  inspect: inspect,
  closeInspect: closeInspect,
  finish: finish,
  role: role,
  battleGrade: battleGrade,
};
