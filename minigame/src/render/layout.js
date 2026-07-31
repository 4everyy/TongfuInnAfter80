const BASE_WIDTH = 844;
const BASE_HEIGHT = 390;

function createLayout(info, menuButton) {
  info = info || {};
  const windowWidth = Math.max(1, Number(info.windowWidth) || BASE_WIDTH);
  const windowHeight = Math.max(1, Number(info.windowHeight) || BASE_HEIGHT);
  const safe = info.safeArea && info.safeArea.width && info.safeArea.height
    ? info.safeArea
    : { left: 0, top: 0, width: windowWidth, height: windowHeight };
  const scale = Math.max(0.01, Math.min(safe.width / BASE_WIDTH, safe.height / BASE_HEIGHT));
  const offsetX = safe.left + (safe.width - BASE_WIDTH * scale) / 2;
  const offsetY = safe.top + (safe.height - BASE_HEIGHT * scale) / 2;
  let capsuleRight = 14;
  if (menuButton && menuButton.width > 0 && menuButton.height > 0) {
    const logicalLeft = (menuButton.left - offsetX) / scale;
    const logicalTop = (menuButton.top - offsetY) / scale;
    const logicalBottom = (menuButton.bottom - offsetY) / scale;
    if (logicalBottom > 0 && logicalTop < 48 && logicalLeft < BASE_WIDTH) {
      capsuleRight = Math.max(14, Math.min(BASE_WIDTH * 0.35, BASE_WIDTH - logicalLeft + 12));
    }
  }
  return {
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    windowWidth,
    windowHeight,
    pixelRatio: Math.max(1, info.pixelRatio || 1),
    scale,
    offsetX,
    offsetY,
    safe: { left: 14, right: 14, top: 0, bottom: 0, capsuleRight },
  };
}

function resizeCanvas(canvas, layout) {
  const width = Math.round(layout.windowWidth * layout.pixelRatio);
  const height = Math.round(layout.windowHeight * layout.pixelRatio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

function beginFrame(ctx, canvas, layout, background) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const unit = layout.pixelRatio * layout.scale;
  ctx.setTransform(unit, 0, 0, unit, layout.offsetX * layout.pixelRatio, layout.offsetY * layout.pixelRatio);
}

function toLogical(layout, x, y) {
  return { x: (x - layout.offsetX) / layout.scale, y: (y - layout.offsetY) / layout.scale };
}

module.exports = { BASE_WIDTH, BASE_HEIGHT, createLayout, resizeCanvas, beginFrame, toLogical };
