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
const exploreSource = fs.readFileSync(path.join(root, 'minigame/src/render/views/explore.js'), 'utf8');
const sceneSource = fs.readFileSync(path.join(root, 'minigame/src/render/views/inn-scene-v18.js'), 'utf8');
const state = store.freshState();

assert(state.managementView === 'scene', 'New saves must enter the full-scene management view.');
assert(state.innScene && state.innScene.activePage === null, 'New saves must start in the live inn scene.');
assert(/require\('\.\/inn-scene-v18'\)/.test(exploreSource), 'Exploration must render the live inn interaction layer.');
assert(/drawObjectLayer/.test(sceneSource) && /drawScreenUi/.test(sceneSource), 'The live inn scene must expose object and overlay rendering.');
assert(!/managementNavToggle|COMPACT_PANEL_X|DETAIL_PANEL_X|drawDetailShell/.test(source), 'The v12 renderer must not contain the old drawer navigation.');
assert(/FONT = \{ title: 20, section: 16, body: 12, caption: 10 \}/.test(source), 'Management typography must use the four approved sizes.');
assert(/jobColumns: \[360, 490, 620\]/.test(source), 'Character job stamps must use three evenly spaced columns.');
assert(/jobRows: \[164, 248\]/.test(source), 'Character job stamps must use two stable rows.');
assert(/actions: \[690, 758\]/.test(source), 'Character commands must use the approved centered action positions.');
assert(/\{ center: true \}/.test(source), 'Character assignment status must center its icon and label as one group.');
assert(/centerY - 34, 70, 82/.test(source), 'Job stamp hit areas must not overlap between rows.');
assert(/ui\.label\(label, centerX, centerY \+ 36, 9,[\s\S]*?, 66\)/.test(source), 'Character command labels must stay within their own centered columns.');

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
