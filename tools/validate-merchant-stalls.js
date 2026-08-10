#!/usr/bin/env node
'use strict';
var ms = require('../minigame/data/merchant-stalls');
var co = require('../minigame/data/commerce');

var missing = [];
var seen = {};
ms.stalls.forEach(function (s) {
  if (seen[s.id]) missing.push('DUP id: ' + s.id);
  seen[s.id] = true;
  if (!co.shops[s.shopId]) missing.push(s.id + ' -> ' + s.shopId);
});

var uniqueShops = {};
ms.stalls.forEach(function (s) { uniqueShops[s.shopId] = true; });

if (missing.length) {
  console.log('FAIL:');
  missing.forEach(function (m) { console.log('  ' + m); });
  process.exit(1);
}

console.log('OK: ' + ms.stalls.length + ' stalls, '
  + Object.keys(uniqueShops).length + ' unique shopIds, all resolve in commerce.shops ('
  + Object.keys(co.shops).length + ' total)');