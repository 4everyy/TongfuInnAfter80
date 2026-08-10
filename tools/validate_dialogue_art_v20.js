'use strict';

const assert = require('assert');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const manifest = require(path.join(root, 'minigame/assets/art/manifest'));
const roleIds = ['zhangdeng', 'wuchen', 'jingzhi', 'wenyan', 'shiwei'];
const expressions = ['neutral', 'happy', 'relieved', 'questioning', 'focused', 'tense', 'angry', 'sad', 'thoughtful'];
const poses = ['idle', 'explain', 'think', 'emotion'];

function runtimePath(value) {
  if (value.charAt(0) === '@') {
    const slash = value.indexOf('/');
    const packageName = value.slice(1, slash);
    return path.join(root, 'minigame/subpackages', packageName, 'assets/art', value.slice(slash + 1));
  }
  return path.join(root, 'minigame/assets/art', value);
}

async function validateRole(id) {
  const dialogue = manifest.characters[id].dialogue;
  const file = runtimePath(dialogue.atlas);
  const metadata = await sharp(file).metadata();
  const frameWidth = dialogue.frameSize.width;
  const frameHeight = dialogue.frameSize.height;

  assert(dialogue.columns === 3, `${id} dialogue atlas must use three columns`);
  assert(metadata.width === frameWidth * 3, `${id} dialogue atlas width mismatch`);
  assert(metadata.height === frameHeight * 3, `${id} dialogue atlas height mismatch`);
  assert(metadata.hasAlpha && metadata.channels === 4, `${id} dialogue atlas needs a real alpha channel`);

  expressions.forEach((name) => {
    assert(Number.isInteger(dialogue.expressionFrames[name]), `${id} expression missing: ${name}`);
  });
  poses.forEach((name) => {
    assert(Number.isInteger(dialogue.poseFrames[name]), `${id} pose missing: ${name}`);
  });

  for (let frame = 0; frame < 9; frame += 1) {
    const left = frame % 3 * frameWidth;
    const top = Math.floor(frame / 3) * frameHeight;
    const { data, info } = await sharp(file)
      .extract({ left, top, width: frameWidth, height: frameHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let visible = 0;
    for (let index = 3; index < data.length; index += info.channels) {
      if (data[index] > 24) visible += 1;
    }
    const coverage = visible / (frameWidth * frameHeight);
    assert(data[3] < 16, `${id} frame ${frame} top-left corner is not transparent`);
    assert(coverage > 0.22 && coverage < 0.78, `${id} frame ${frame} coverage out of range: ${coverage.toFixed(3)}`);
  }
}

(async function run() {
  for (const id of roleIds) await validateRole(id);
  console.log('Dialogue art v20 validation passed: 5 roles, 45 transparent frames, expression and pose mappings.');
}()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
