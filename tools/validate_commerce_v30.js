'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const store = require('../minigame/src/core/store');
const commerce = require('../minigame/src/world/commerce');
const combat = require('../minigame/src/combat/battle');
const content = require('../minigame/data/content');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function shopChoice(dialogueId, shopId) {
  const definition = content.dialogues[dialogueId];
  return definition && definition.choices.some((choice) => choice.action === 'shop' && choice.shopId === shopId);
}

const data = commerce.data;
assert(Object.keys(data.shops).length >= 3, 'At least three town shops are required.');
assert(Object.keys(data.items).length >= 12, 'At least twelve shop items are required.');
assert(shopChoice('npcv26-noodle-vendor-ma-start', 'ma-goods'), 'Ma shop is not connected to NPC dialogue.');
assert(shopChoice('npcv26-seamstress-wen-start', 'wen-jewelry'), 'Jewelry shop is not connected to NPC dialogue.');
assert(shopChoice('npcv26-coppersmith-han-start', 'han-armory'), 'Armory is not connected to NPC dialogue.');

const goods = store.freshState();
commerce.open(goods, 'ma-goods');
const originalCoin = goods.inventory.coin;
assert(commerce.buy(goods, 'ma-goods', 'herbal-packet', 'zhangdeng'), 'First medicine purchase failed.');
assert(commerce.buy(goods, 'ma-goods', 'herbal-packet', 'zhangdeng'), 'Second medicine purchase failed.');
assert(!commerce.buy(goods, 'ma-goods', 'herbal-packet', 'zhangdeng'), 'Daily limit did not stop the third purchase.');
assert(goods.inventory.coin === originalCoin - 16, 'Supply purchase deducted the wrong amount.');
assert(goods.inventory.medicine === 4, 'Supply purchase did not update medicine.');

const equipment = store.freshState();
equipment.campaign.chapter = 8;
equipment.characters.wuchen.recruited = true;
equipment.characters.wuchen.innUnlocked = true;
assert(commerce.buy(equipment, 'wen-jewelry', 'peace-knot', 'zhangdeng'), 'Accessory purchase failed.');
assert(equipment.characters.zhangdeng.equipment.accessory === 'peace-knot', 'Purchased accessory was not auto-equipped.');
assert(commerce.equip(equipment, 'wuchen', 'peace-knot'), 'Accessory transfer failed.');
assert(!equipment.characters.zhangdeng.equipment.accessory, 'Accessory remained equipped by two roles.');
assert(equipment.characters.wuchen.equipment.accessory === 'peace-knot', 'Accessory did not move to the selected role.');
assert(commerce.bonuses(equipment, 'wuchen').hp === 8, 'Accessory bonus is incorrect.');

const battleState = store.freshState();
battleState.campaign.chapter = 8;
assert(commerce.buy(battleState, 'han-armory', 'elm-ruler', 'zhangdeng'), 'Weapon purchase failed.');
combat.start(battleState, 'training');
assert(battleState.battle.party[0].attackBonus === 3, 'Weapon attack bonus did not enter battle state.');

const legacy = store.freshState();
delete legacy.commerce;
Object.keys(legacy.characters).forEach((id) => { delete legacy.characters[id].equipment; });
const migrated = store.normalize(legacy);
assert(migrated.commerce && migrated.commerce.owned, 'Legacy save did not receive commerce state.');
assert(migrated.characters.zhangdeng.equipment.weapon === null, 'Legacy role did not receive equipment slots.');

const overlay = fs.readFileSync(path.join(root, 'minigame/src/render/views/overlays.js'), 'utf8');
['drawShop', 'shopBuy', 'shopEquip', 'shopRole'].forEach((token) => assert(overlay.includes(token), 'Shop UI is missing ' + token));

console.log('Commerce v30 validation passed: shops, items, limits, equipment transfer, battle bonuses and save migration.');
