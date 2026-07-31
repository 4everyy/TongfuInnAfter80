'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const battleView = fs.readFileSync(path.join(root, 'minigame/src/render/views/battle.js'), 'utf8');
const combat = fs.readFileSync(path.join(root, 'minigame/src/combat/battle.js'), 'utf8');
const manifest = require(path.join(root, 'minigame/assets/art/manifest'));

[
  'drawPartyToken',
  'drawCircularPortrait',
  'drawSkillGlyph',
  'drawActionMedallion',
  'drawActionTooltip',
  'drawWheelBackdrop',
  'drawAtlasSkillIcon',
  'drawEnemyWarning',
  'drawTargetPrompt',
  'drawStatusDetails',
  'drawStatusPips',
  'drawTurnSeal',
  'drawBattleLog',
  'drawBattleEffects',
  'drawFloatingValue',
  'drawLedgerFallback',
  'drawVictoryOverlay',
].forEach((name) => {
  if (!battleView.includes('function ' + name)) throw new Error('Missing battle UI component: ' + name);
});

if (!battleView.includes('hitSize: 64') || !battleView.includes('hitSize: 56')) {
  throw new Error('Battle medallions must retain 56px or larger touch targets.');
}
if (!combat.includes("battle.log = definition.name + '真气不足")) {
  throw new Error('Insufficient qi must provide visible feedback.');
}
if (!combat.includes('function selectTarget') || !combat.includes('function enemyPlan')) {
  throw new Error('Battle tactics must expose target selection and enemy intent planning.');
}
if (battleView.includes('function drawActionCard') || battleView.includes("ui.addButton({ type: 'attack' }")) {
  throw new Error('Legacy battle action cards are still registered.');
}
if (!manifest.ui.battle || !manifest.ui.battle.iconAtlas || !manifest.ui.battle.wheel || !manifest.ui.battle.ledger) {
  throw new Error('Battle art manifest is incomplete.');
}
['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'].forEach((id) => {
  if (!manifest.characters[id].skillIcons || manifest.characters[id].skillIcons.length !== 3) {
    throw new Error('Missing three skill icons for ' + id);
  }
});

console.log('Battle UI v17 validation passed: martial wheel, target selection, intent warning, status details and touch targets.');
