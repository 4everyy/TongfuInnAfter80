const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = require(path.join(root, 'minigame/data/content'));
const manifest = require(path.join(root, 'minigame/assets/art/manifest'));
const world = require(path.join(root, 'minigame/src/world/explore'));
const layout = require(path.join(root, 'minigame/src/render/layout'));

const errors = [];
const warnings = [];
const runtimeArtRoot = path.join(root, 'minigame/assets/art');

function artFile(source) {
  const match = /^@([^/]+)\/(.+)$/.exec(source || '');
  return match
    ? path.join(root, 'minigame/subpackages', match[1], 'assets/art', match[2])
    : path.join(runtimeArtRoot, source);
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function imageSize(file) {
  const data = fs.readFileSync(file);
  if (data.length >= 24 && data.toString('ascii', 1, 4) === 'PNG') {
    const colorType = data[25];
    const indexedAlpha = colorType === 3 && data.indexOf(Buffer.from('tRNS')) >= 0;
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), alpha: [4, 6].indexOf(colorType) >= 0 || indexedAlpha };
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) { offset += 1; continue; }
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5), alpha: false };
      }
      offset += Math.max(2, length + 2);
    }
  }
  return null;
}

function directorySize(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directorySize(target) : fs.statSync(target).size);
  }, 0);
}

function inBounds(point, map) {
  return point.x >= 0 && point.x <= map.width && point.y >= 0 && point.y <= map.height;
}

function reachableExit(map, zone) {
  for (let x = zone.x + 8; x < zone.x + zone.width; x += 10) {
    for (let y = zone.y + 8; y < zone.y + zone.height; y += 10) {
      if (world.isWalkable(map, { x, y }, 8)) return true;
    }
  }
  return false;
}

function validateMaps() {
  const expected = [
    'inn', 'yard', 'street', 'locust_lane', 'tea_shed', 'east_gate', 'stone_bridge',
    'paper_mill', 'paper_alley', 'old_post', 'north_road', 'guild_warehouse', 'river_yard',
    'grain_market', 'guild_office', 'charity_granary', 'canal_checkpoint',
    'money_house', 'scale_contract_lane', 'merchant_alliance_hall', 'old_ledger_vault',
    'jiangnan_branch', 'jiangnan_dock', 'river_market', 'rain_ferry',
    'jiangnan_spice_workshop', 'old_banquet_kitchen',
  ];
  assert(content.maps.length === expected.length, '当前章节地图数量与登记表不一致');
  expected.forEach((id) => assert(content.maps.some((map) => map.id === id), `缺少地图 ${id}`));

  content.maps.forEach((map) => {
    assert(map.width >= 900 && map.height === 348, `${map.id} 世界尺寸异常`);
    assert(map.walkable.length > 0, `${map.id} 缺少可行走区域`);
    Object.keys(map.spawns).forEach((spawnId) => {
      const spawn = map.spawns[spawnId];
      assert(inBounds(spawn, map), `${map.id}.${spawnId} 出生点越界`);
      assert(world.isWalkable(map, spawn, 10), `${map.id}.${spawnId} 出生点落在阻挡区`);
    });
    map.hotspots.forEach((spot) => assert(inBounds(spot, map), `${map.id}.${spot.id} 热点越界`));
    map.npcs.forEach((npc) => assert(inBounds(npc, map), `${map.id}.${npc.id} NPC越界`));
    map.exits.forEach((exit) => {
      const target = content.maps.find((item) => item.id === exit.target);
      assert(!!target, `${map.id}.${exit.id} 指向不存在地图 ${exit.target}`);
      if (target) assert(!!target.spawns[exit.spawn], `${map.id}.${exit.id} 指向不存在出生点 ${exit.target}.${exit.spawn}`);
      assert(exit.zone.width >= 44 && exit.zone.height >= 44, `${map.id}.${exit.id} 出口触发区小于44px`);
      assert(reachableExit(map, exit.zone), `${map.id}.${exit.id} 出口被碰撞区完全挡住`);
    });
  });
}

function validateArt() {
  content.maps.forEach((map) => {
    const art = manifest.maps[map.id];
    assert(!!art, `${map.id} 未登记美术`);
    if (!art) return;
    assert(art.layers && art.layers.length > 0, `${map.id} 缺少背景层`);
    (art.layers || []).forEach((layer) => {
      const file = artFile(layer.src);
      assert(fs.existsSync(file), `${map.id} 资源不存在: ${layer.src}`);
      if (!fs.existsSync(file)) return;
      const size = imageSize(file);
      assert(size && size.width === layer.worldWidth && size.height === layer.worldHeight,
        `${map.id} 尺寸不匹配: ${layer.src}`);
    });
    (art.props || []).forEach((prop) => {
      const file = artFile(prop.src);
      assert(fs.existsSync(file), `${map.id} 遮挡物不存在: ${prop.src}`);
      if (fs.existsSync(file)) {
        const size = imageSize(file);
        assert(size && size.alpha, `${map.id} 遮挡物必须是带Alpha的PNG: ${prop.src}`);
      }
    });
  });

  Object.keys(manifest.characters).forEach((id) => {
    const art = manifest.characters[id];
    ['side', 'front', 'back'].forEach((direction) => {
      assert(art.atlases && art.atlases[direction], `${id} 缺少${direction}方向图集`);
      if (!art.atlases || !art.atlases[direction]) return;
      const file = artFile(art.atlases[direction]);
      assert(fs.existsSync(file), `${id}.${direction} 图集不存在`);
      if (!fs.existsSync(file)) return;
      const size = imageSize(file);
      assert(size && size.alpha, `${id}.${direction} 图集没有Alpha通道`);
      assert(size && size.width === art.frameSize.width * art.atlasColumns, `${id}.${direction} 图集列宽错误`);
      assert(size && size.height >= art.frameSize.height * 3, `${id}.${direction} 图集行数不足`);
    });
  });

  Object.keys(manifest.npcs || {}).forEach((id) => {
    const art = manifest.npcs[id];
    const source = art.sprite || art.atlas || art.portrait;
    assert(!!source, `${id} NPC没有可绘制资源`);
    if (!source) return;
    const file = path.join(runtimeArtRoot, source);
    assert(fs.existsSync(file), `${id} NPC资源不存在: ${source}`);
    if (!fs.existsSync(file)) return;
    const size = imageSize(file);
    assert(size && size.alpha, `${id} NPC资源必须带Alpha: ${source}`);
  });

  content.maps.forEach((map) => {
    map.npcs.forEach((npc) => {
      if (npc.artId) assert(!!manifest.npcs[npc.artId], `${map.id}.${npc.id} 未登记NPC美术 ${npc.artId}`);
    });
  });

  const stoneBridge = manifest.maps.stone_bridge;
  assert(stoneBridge && stoneBridge.props.some((prop) => /supply-cart/.test(prop.src)), '石桥缺少物资车场景道具');

  const directionalReportPath = path.join(root, 'outputs/creative-production/world-v4/directional-atlas-report.json');
  assert(fs.existsSync(directionalReportPath), '缺少方向图集检查报告');
  if (fs.existsSync(directionalReportPath)) {
    const report = JSON.parse(fs.readFileSync(directionalReportPath, 'utf8'));
    assert(report.roles.length === 4, '方向图集报告必须覆盖四名角色');
    report.roles.forEach((role) => {
      ['front', 'back'].forEach((direction) => {
        const result = role.directions[direction];
        assert(result && result.status === 'ready', `${role.role}.${direction} 方向图集未就绪`);
        if (result) assert(result.baselineDrift <= 2, `${role.role}.${direction} 脚底漂移超过2px`);
      });
    });
  }

  const entityReportPath = path.join(root, 'outputs/creative-production/world-v4/entity-runtime-report.json');
  assert(fs.existsSync(entityReportPath), '缺少NPC与物资车检查报告');
  if (fs.existsSync(entityReportPath)) {
    const report = JSON.parse(fs.readFileSync(entityReportPath, 'utf8'));
    assert(report.npcs.length === 7, '章节NPC运行资源必须为七名');
    report.npcs.forEach((npc) => {
      assert(npc.size[0] === 160 && npc.size[1] === 224, `${npc.id} NPC尺寸不是160x224`);
      assert(npc.alpha[0] === 0 && npc.alpha[1] === 255, `${npc.id} NPC透明通道异常`);
    });
    assert(report.cart.size[0] <= 320 && report.cart.size[1] <= 210, '物资车运行图尺寸异常');
    assert(report.cart.alpha[0] === 0 && report.cart.alpha[1] === 255, '物资车透明通道异常');
  }

  const subpackagesRoot = path.join(root, 'minigame/subpackages');
  const subpackageBytes = fs.existsSync(subpackagesRoot) ? directorySize(subpackagesRoot) : 0;
  const mainBytes = directorySize(path.join(root, 'minigame')) - subpackageBytes;
  assert(mainBytes <= Math.round(3.8 * 1024 * 1024), `小游戏主包超过3.8MB目标: ${(mainBytes / 1024 / 1024).toFixed(2)}MB`);
  const gameConfigPath = path.join(root, 'minigame/game.json');
  const gameConfig = JSON.parse(fs.readFileSync(gameConfigPath, 'utf8'));
  const configuredPackages = gameConfig.subpackages || [];
  assert(configuredPackages.length > 0, 'game.json 未登记章节分包');
  const packageNames = new Set();
  configuredPackages.forEach((subpackage) => {
    assert(subpackage.name && !packageNames.has(subpackage.name), `分包名称无效或重复: ${subpackage.name || '(empty)'}`);
    packageNames.add(subpackage.name);
    assert(subpackage.root, `章节分包 ${subpackage.name} 缺少 root`);
    const packageRoot = path.join(root, 'minigame', subpackage.root);
    assert(fs.existsSync(packageRoot) && fs.statSync(packageRoot).isDirectory(), `章节分包目录不存在: ${subpackage.root}`);
    assert(fs.existsSync(path.join(packageRoot, 'game.js')), `章节分包 ${subpackage.name} 缺少根入口 game.js`);
    assert(fs.existsSync(path.join(packageRoot, 'assets')), `章节分包 ${subpackage.name} 未包含运行资源`);
    const bytes = directorySize(packageRoot);
    assert(bytes <= Math.round(3.8 * 1024 * 1024), `章节分包 ${subpackage.name} 超过3.8MB: ${(bytes / 1024 / 1024).toFixed(2)}MB`);
  });
}

function validateMovement() {
  const base = {
    mode: 'explore', modal: null, dialogue: null, battle: null,
    mapId: 'street', spawnId: 'main', position: { x: 600, y: 300 },
    velocity: { x: 0, y: 0 }, facing: 'right', moving: false,
    party: ['zhangdeng', 'wuchen', 'jingzhi'], activeId: 'zhangdeng', protagonist: 'zhangdeng',
    followers: {}, trail: [], flags: { 'mission-accepted': true, 'jingzhi-cooperating': true },
    exitCooldown: 99,
  };
  const straight = JSON.parse(JSON.stringify(base));
  const diagonal = JSON.parse(JSON.stringify(base));
  world.update(straight, { move: { x: 1, y: 0 } }, 0.1);
  world.update(diagonal, { move: { x: 1, y: 1 } }, 0.1);
  const straightDistance = Math.hypot(straight.position.x - base.position.x, straight.position.y - base.position.y);
  const diagonalDistance = Math.hypot(diagonal.position.x - base.position.x, diagonal.position.y - base.position.y);
  const difference = straightDistance ? Math.abs(diagonalDistance - straightDistance) / straightDistance : 1;
  assert(difference <= 0.03, `斜向速度偏差 ${(difference * 100).toFixed(1)}%`);
  assert(Object.keys(diagonal.followers).length === 2, '三人队没有生成两名跟随者');
}

function validateLayouts() {
  [
    { windowWidth: 844, windowHeight: 390, pixelRatio: 1 },
    { windowWidth: 960, windowHeight: 540, pixelRatio: 2 },
    { windowWidth: 1024, windowHeight: 390, pixelRatio: 1 },
    { windowWidth: 960, windowHeight: 420, pixelRatio: 2, safeArea: { left: 24, top: 8, width: 912, height: 396 } },
  ].forEach((info) => {
    const metrics = layout.createLayout(info);
    assert(metrics.scale > 0, `${info.windowWidth}x${info.windowHeight} 布局缩放无效`);
    assert(metrics.offsetX >= (info.safeArea ? info.safeArea.left : 0) - 0.01, `${info.windowWidth}x${info.windowHeight} 横向安全区越界`);
    assert(metrics.offsetY >= (info.safeArea ? info.safeArea.top : 0) - 0.01, `${info.windowWidth}x${info.windowHeight} 纵向安全区越界`);
    const logical = layout.toLogical(metrics, metrics.offsetX + 422 * metrics.scale, metrics.offsetY + 195 * metrics.scale);
    assert(Math.abs(logical.x - 422) < 0.01 && Math.abs(logical.y - 195) < 0.01,
      `${info.windowWidth}x${info.windowHeight} 触控坐标换算异常`);
  });
}

validateMaps();
validateArt();
validateMovement();
validateLayouts();

if (warnings.length) warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}
console.log(`World v4 validation passed: ${content.maps.length} maps, ${Object.keys(manifest.characters).length} art-ready roles, ${(directorySize(path.join(root, 'minigame')) / 1024 / 1024).toFixed(2)} MB package.`);
