const content = require('../../data/campaign');

const STAGES = ['locked', 'encountered', 'cooperating', 'trusted', 'quest', 'recruited', 'finale'];

function ensure(state) {
  if (!state.relationships || typeof state.relationships !== 'object') state.relationships = {};
  content.roles.forEach(function (role) {
    const character = state.characters[role.id];
    if (!character) return;
    character.recruitmentStage = character.recruitmentStage || (role.id === content.BRAND.protagonist ? 'recruited' : 'locked');
    character.temporary = !!character.temporary;
    state.relationships[role.id] = Object.assign({ trust: role.id === content.BRAND.protagonist ? 100 : 0, conflict: 0, promises: [], history: [] }, state.relationships[role.id] || {});
  });
  return state.campaign;
}

function stageIndex(stage) {
  const index = STAGES.indexOf(stage);
  return index < 0 ? 0 : index;
}

function setStage(state, roleId, stage, note) {
  ensure(state);
  const character = state.characters[roleId];
  if (!character || STAGES.indexOf(stage) < 0) return false;
  if (stageIndex(stage) < stageIndex(character.recruitmentStage)) return false;
  character.recruitmentStage = stage;
  character.innUnlocked = stageIndex(stage) >= stageIndex('cooperating');
  character.temporary = stageIndex(stage) >= stageIndex('cooperating') && stageIndex(stage) < stageIndex('recruited');
  character.recruited = stageIndex(stage) >= stageIndex('recruited');
  if (note) state.relationships[roleId].history.push({ at: Date.now(), stage: stage, note: note });
  return true;
}

function advanceStage(state, roleId, stage, note) {
  ensure(state);
  const character = state.characters[roleId];
  const targetIndex = stageIndex(stage);
  const currentIndex = character ? stageIndex(character.recruitmentStage) : -1;
  if (!character || targetIndex > currentIndex + 1) return false;
  return setStage(state, roleId, stage, note);
}

function canTravel(state, roleId) {
  const character = state.characters[roleId];
  return !!character && (character.recruited || character.temporary || roleId === content.BRAND.protagonist);
}

function addTemporaryFollower(state, roleId, note) {
  if (!setStage(state, roleId, 'cooperating', note)) return false;
  if (state.party.indexOf(roleId) < 0 && state.party.length < 3) state.party.push(roleId);
  state.characters[roleId].inParty = state.party.indexOf(roleId) >= 0;
  return true;
}

function recruit(state, roleId, note) {
  if (!setStage(state, roleId, 'recruited', note)) return false;
  if (state.party.indexOf(roleId) < 0 && state.party.length < 3) state.party.push(roleId);
  state.characters[roleId].inParty = state.party.indexOf(roleId) >= 0;
  return true;
}

function completeChapter(state, chapterNumber) {
  ensure(state);
  const id = 'chapter-' + String(chapterNumber).padStart(2, '0');
  if (state.campaign.completed.indexOf(id) < 0) state.campaign.completed.push(id);
  state.campaign.chapter = Math.max(state.campaign.chapter, chapterNumber);
  state.campaign.season = Math.min(4, Math.floor((state.campaign.chapter - 1) / 8) + 1);
}

module.exports = {
  STAGES: STAGES,
  data: content,
  ensure: ensure,
  setStage: setStage,
  advanceStage: advanceStage,
  canTravel: canTravel,
  addTemporaryFollower: addTemporaryFollower,
  recruit: recruit,
  completeChapter: completeChapter,
};
