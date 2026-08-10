'use strict';

const path = require('path');

const root = path.resolve(__dirname, '..');
const content = require(path.join(root, 'minigame/data/content'));
const definitions = require(path.join(root, 'minigame/data/inn-interactions'));
const store = require(path.join(root, 'minigame/src/core/store'));
const scene = require(path.join(root, 'minigame/src/inn/scene-interactions'));
const world = require(path.join(root, 'minigame/src/world/explore'));
const management = require(path.join(root, 'minigame/src/inn/inn'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function objectById(mapId, id) {
  return definitions.objectsForMap(mapId).find((item) => item.id === id);
}

function actionOwners(actionId) {
  const owners = [];
  Object.keys(definitions.OBJECTS).forEach((mapId) => {
    definitions.OBJECTS[mapId].forEach((object) => {
      if (object.actions.indexOf(actionId) >= 0) owners.push(object.role);
    });
  });
  return Array.from(new Set(owners));
}

const maps = content.maps;
const mapIds = new Set(maps.map((item) => item.id));
const objectIds = new Set();
let linkedCount = 0;

assert(maps.length === 27, 'The v18 regression baseline must retain all 27 maps.');

Object.keys(definitions.OBJECTS).forEach((mapId) => {
  assert(mapIds.has(mapId), 'Inn object map does not exist: ' + mapId);
  definitions.OBJECTS[mapId].forEach((object) => {
    assert(!objectIds.has(object.id), 'Duplicate inn object id: ' + object.id);
    objectIds.add(object.id);
    assert(object.hit.width >= 44 && object.hit.height >= 44, 'Hit area is below 44px: ' + object.id);
    assert(object.hit.x >= 0 && object.hit.y >= 0, 'Hit area starts outside map: ' + object.id);
    assert(object.hit.x + object.hit.width <= content.maps.find((item) => item.id === mapId).width,
      'Hit area exceeds map width: ' + object.id);
    object.actions.forEach((actionId) => {
      assert(definitions.action(actionId), 'Missing action definition: ' + actionId);
    });
  });
});

maps.forEach((map) => {
  (map.hotspots || []).forEach((hotspot) => {
    if (!hotspot.linkedObjectId) return;
    linkedCount += 1;
    assert(objectById(map.id, hotspot.linkedObjectId),
      'Linked object does not exist for hotspot ' + map.id + '/' + hotspot.id);
  });
});

assert(linkedCount >= 20, 'Expected the shared inn story hotspots to be explicitly linked.');
assert(JSON.stringify(actionOwners('open')) === JSON.stringify(['door']), 'Open must only belong to the door.');
assert(JSON.stringify(actionOwners('settle')) === JSON.stringify(['counter']), 'Settlement must only belong to the counter.');
assert(JSON.stringify(actionOwners('purchase')) === JSON.stringify(['supply']), 'Purchase must only belong to supply storage.');
assert(JSON.stringify(actionOwners('clean')) === JSON.stringify(['hall']), 'Cleaning must only belong to hall seating.');
assert(JSON.stringify(actionOwners('promote')) === JSON.stringify(['door']), 'Promotion must only belong to the sign/door.');
assert(JSON.stringify(actionOwners('prepare')) === JSON.stringify(['kitchen']), 'Food preparation must only belong to the stove.');

const storyState = store.freshState();
storyState.screen = 'explore';
storyState.mode = 'explore';
storyState.mapId = 'inn';
const linkedSpot = world.visibleHotspots(storyState).find((spot) => spot.linkedObjectId);
assert(linkedSpot, 'Fresh inn state must expose a linked tutorial hotspot.');
const linkedObject = objectById('inn', linkedSpot.linkedObjectId);
storyState.position = { x: 20, y: 330 };
scene.dispatch(storyState, { type: 'innObjectSelect', id: linkedObject.id });
const farStory = scene.actionsForObject(storyState, linkedObject).find((item) => item.kind === 'story');
assert(farStory && farStory.lockedReason, 'Story actions must remain locked outside their exploration radius.');
const directManagement = scene.actionsForObject(storyState, linkedObject).find((item) => item.kind !== 'story');
assert(directManagement, 'Direct object clicks must still expose management actions from a distance.');
storyState.position = { x: linkedSpot.x, y: linkedSpot.y };
const nearStory = scene.actionsForObject(storyState, linkedObject).find((item) => item.kind === 'story');
assert(nearStory && !nearStory.lockedReason, 'Story action must unlock inside its original exploration radius.');

const microState = store.freshState();
microState.screen = 'explore';
microState.mode = 'explore';
microState.mapId = 'inn';
const coinBefore = microState.inventory.coin;
const actionsBefore = microState.calendar.actionsUsed;
scene.dispatch(microState, { type: 'innObjectSelect', id: 'changfeng-pantry' });
assert(scene.dispatch(microState, { type: 'innObjectAction', id: 'purchase' }), 'Purchase microgame must open from supply storage.');
assert(scene.dispatch(microState, { type: 'innMicroCancel' }), 'Microgame cancel must succeed.');
assert(microState.inventory.coin === coinBefore && microState.calendar.actionsUsed === actionsBefore,
  'Cancelling a microgame must not spend resources or actions.');
scene.dispatch(microState, { type: 'innObjectSelect', id: 'changfeng-pantry' });
scene.dispatch(microState, { type: 'innObjectAction', id: 'purchase' });
assert(scene.dispatch(microState, { type: 'innMicroChoice', choice: 'balanced' }), 'Purchase must settle once.');
const coinAfter = microState.inventory.coin;
assert(!scene.dispatch(microState, { type: 'innMicroChoice', choice: 'balanced' }), 'Completed microgame cannot settle twice.');
assert(microState.inventory.coin === coinAfter, 'Repeated microgame input must not duplicate costs or rewards.');

const serviceState = store.freshState();
serviceState.screen = 'explore';
serviceState.mode = 'explore';
serviceState.mapId = 'inn';
serviceState.campaign.chapter = 3;
serviceState.campaign.chapterDay = 1;
serviceState.flags['c03-started'] = true;
serviceState.episodes.pendingId = null;
assert(management.dispatch(serviceState, { type: 'startShift' }), 'A prepared day must enter noon service.');
let serviceGuard = 0;
while (serviceState.calendar.phase === 'noon' && serviceGuard < 12) {
  const step = management.currentServiceStep(serviceState);
  const role = scene.serviceObjectRole(serviceState);
  const serviceObject = scene.objects(serviceState).find((item) => item.role === role);
  assert(step && serviceObject, 'Every service step must resolve to one physical scene object.');
  assert(scene.objects(serviceState).filter((item) => scene.actionsForObject(serviceState, item)
    .some((action) => action.id === 'service')).length === 1,
  'Only the current service object may expose the noon action.');
  scene.dispatch(serviceState, { type: 'innObjectSelect', id: serviceObject.id });
  assert(scene.dispatch(serviceState, { type: 'innObjectAction', id: 'service' }),
    'The current service task must open from its physical object.');
  scene.dispatch(serviceState, {
    type: 'innServiceChoice',
    kind: step.kind,
    index: 0,
  });
  serviceGuard += 1;
}
assert(serviceState.calendar.phase === 'evening' && serviceState.service.completed,
  'Three service rounds must complete once and advance to evening.');

const legacy = store.normalize({ version: 10, screen: 'inn', mapId: 'inn', innScene: { activePage: 'kitchen' } });
assert(legacy.screen === 'explore' && legacy.mode === 'explore', 'Legacy inn screen must migrate to live exploration.');
assert(legacy.innScene.activePage === 'kitchen', 'Legacy complex page must be restored as an overlay.');

console.log('Inn interactions v18 validation passed: 27 maps, ' + linkedCount
  + ' explicit story links, unique action ownership, distance gating, service routing, microgame idempotency and legacy migration.');
