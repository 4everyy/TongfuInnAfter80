'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const store = require(path.join(root, 'minigame/src/core/store'));
const management = require(path.join(root, 'minigame/src/inn/inn'));
const view = require(path.join(root, 'minigame/src/render/views/management-v12'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(path.join(root, 'minigame/src/render/views/management-v12.js'), 'utf8');
const shim = fs.readFileSync(path.join(root, 'minigame/src/render/views/management.js'), 'utf8');
const state = store.freshState();

assert(state.managementView === 'scene', 'New saves must enter the full-scene management view.');
assert(/require\('\.\/management-v12'\)/.test(shim), 'The legacy management renderer must not remain active.');
assert(!/managementNavToggle|COMPACT_PANEL_X|DETAIL_PANEL_X|drawDetailShell/.test(source), 'The v12 renderer must not contain the old drawer navigation.');
assert(/FONT = \{ title: 20, section: 16, body: 12, caption: 10 \}/.test(source), 'Management typography must use the four approved sizes.');

assert(Array.isArray(view.OBJECTS) && view.OBJECTS.length === 7, 'Seven scene object entry points are required.');
assert(new Set(view.OBJECTS.map((item) => item.id)).size === view.OBJECTS.length, 'Scene object ids must be unique.');
['counter', 'kitchen', 'rooms', 'notice', 'hall', 'yard', 'door'].forEach((id) => {
  assert(view.OBJECTS.some((item) => item.id === id && item.view), 'Missing scene object: ' + id);
});

management.dispatch(state, { type: 'managementObjectOpen', view: 'kitchen', objectId: 'kitchen' });
assert(state.managementView === 'kitchen', 'Scene objects must open their themed page.');
assert(state.managementSeenObjects.indexOf('kitchen') >= 0, 'Used scene objects must persist their discovered state.');
management.dispatch(state, { type: 'managementSceneBack' });
assert(state.managementView === 'scene', 'Themed pages must return to the full scene.');

state.characters.wuchen.innUnlocked = true;
management.dispatch(state, { type: 'assignRole', id: 'service', roleId: 'wuchen' });
assert(state.dailyPlan.assignments.service === 'wuchen', 'Character job assignment must update the selected job.');
assert(Object.keys(state.dailyPlan.assignments).filter((id) => state.dailyPlan.assignments[id] === 'wuchen').length === 1, 'A character may only occupy one job.');

management.enterManagement(state, false);
assert(state.managementView === 'scene', 'Entering management must always reset transient UI to the full scene.');

console.log('Management v12 validation passed: full scene, seven object entries, themed pages, typography and role assignment.');
