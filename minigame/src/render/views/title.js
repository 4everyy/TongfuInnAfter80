'use strict';

var content = require('../../../data/content');

function drawTitle(ui) {
  var far = ui.assets.manifest.maps.inn.layers.find(function (layer) {
    return layer.id === 'background' || layer.id === 'far';
  });
  var bg = far && ui.assets.image(far.src);
  var profile = content.identity.profile();

  if (bg) ui.cover(bg, 0, 0, ui.width, ui.height);
  else ui.rect(0, 0, ui.width, ui.height, '#8a6747');
  ui.rect(0, 0, ui.width, ui.height, '#23191499');
  ui.label(profile.title, 84, 116, 38, ui.theme.colors.paper, 'left', ui.theme.fonts.title, 440);
  ui.label('九域商路 · 288 格天下棋盘', 112, 174, 20, ui.theme.colors.gold, 'left', ui.theme.fonts.title);
  ui.portrait('zhangdeng', 574, 88, 142);
  ui.addButton({ type: 'startAdventure' }, 118, 232, 300, 60, '开始棋局', ui.theme.colors.cinnabar);
}

module.exports = { drawTitle: drawTitle };
