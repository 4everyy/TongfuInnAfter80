'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const identities = require('../minigame/data/npc-identities-v31');
const population = require('../minigame/data/npc-population-v26');
const manifest = require('../minigame/assets/art/manifest');
const content = require('../minigame/data/content');

const ROOT = path.resolve(__dirname, '..');
const ART_ROOT = path.join(ROOT, 'minigame', 'subpackages', 'npc-pop-v26', 'assets', 'art', 'npcs', 'classic-v31');
const entries = Object.keys(identities.classic);

assert.strictEqual(entries.length, 36, 'classic NPC mapping must contain 36 entries');
assert.strictEqual(new Set(entries.map(function (id) { return identities.classic[id].slug; })).size, 36, 'classic art slugs must be unique');
assert.strictEqual(population.roster.length, 36, 'population roster must remain stable');

entries.forEach(function (id) {
  const definition = identities.classic[id];
  const sprite = path.join(ART_ROOT, definition.slug + '.png');
  const portrait = path.join(ART_ROOT, 'portraits', definition.slug + '.webp');
  assert(fs.existsSync(sprite), 'missing classic NPC sprite: ' + definition.slug);
  assert(fs.existsSync(portrait), 'missing classic NPC portrait: ' + definition.slug);
  const png = fs.readFileSync(sprite);
  assert.strictEqual(png.readUInt32BE(16), 192, 'sprite width must be 192: ' + definition.slug);
  assert.strictEqual(png.readUInt32BE(20), 256, 'sprite height must be 256: ' + definition.slug);
  assert(png.includes(Buffer.from('tRNS')) || png[25] === 4 || png[25] === 6, 'sprite must preserve alpha: ' + definition.slug);
  assert(manifest.npcs[id], 'manifest missing NPC: ' + id);
  assert.strictEqual(manifest.npcs[id].atlas, '@npc-pop-v26/npcs/classic-v31/' + definition.slug + '.png');
  assert.strictEqual(manifest.npcs[id].portrait, '@npc-pop-v26/npcs/classic-v31/portraits/' + definition.slug + '.webp');
});

const populationNpcs = content.maps.reduce(function (result, map) {
  return result.concat((map.npcs || []).filter(function (npc) { return npc.populationV26; }));
}, []);
assert.strictEqual(populationNpcs.length, 36, 'all 36 population NPCs must be present');
populationNpcs.forEach(function (npc) {
  assert.strictEqual(npc.name, identities.classic[npc.artId].name, 'classic name mismatch for ' + npc.artId);
});

Object.keys(content.dialogues).filter(function (id) { return id.indexOf('npcv26-') === 0; }).forEach(function (id) {
  const dialogue = content.dialogues[id];
  assert(dialogue.speakerArtId, 'NPC dialogue missing speakerArtId: ' + id);
  assert(manifest.npcs[dialogue.speakerArtId], 'NPC dialogue art missing in manifest: ' + id);
});

console.log(JSON.stringify({
  mappings: entries.length,
  sprites: entries.length,
  portraits: entries.length,
  populationNpcs: populationNpcs.length,
  dialogues: Object.keys(content.dialogues).filter(function (id) { return id.indexOf('npcv26-') === 0; }).length,
}));
