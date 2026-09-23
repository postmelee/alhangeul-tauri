// Fixed biz-plan cover-page probe: excludes window chrome, rulers and status bar.
export function decodeScreenshotRaster(bytes) {
  const newline = bytes.indexOf(10);
  if (newline < 0 || newline > 512) throw new Error('screenshot raster header가 유효하지 않습니다');
  const raster = { ...JSON.parse(bytes.subarray(0, newline)), data: bytes.subarray(newline + 1) };
  validateRaster(raster);
  return raster;
}

export function analyzeEditorFrame(raster, window) {
  validateRaster(raster);
  validateWindow(raster, window);
  const row = window.y + Math.floor(window.height * 0.25);
  const center = window.x + Math.floor(window.width / 2);
  let left = center;
  let right = center;
  while (left > window.x && isWhite(raster, left - 1, row)) left -= 1;
  while (right < window.x + window.width && isWhite(raster, right, row)) right += 1;
  const pageWidth = right - left;
  if (pageWidth < window.width * 0.45 || pageWidth > window.width * 0.85) {
    throw new Error('editor page의 흰 경계를 찾지 못했습니다');
  }
  const region = {
    x: left + 24, y: window.y + Math.floor(window.height * 0.28),
    width: pageWidth - 48, height: Math.floor(window.height * 0.40),
  };
  return measureBody(raster, region);
}

export function compareEditorFrames(actual, expected) {
  if (JSON.stringify(actual.region) !== JSON.stringify(expected.region)) {
    return { matches: false, inkAgreement: 0, reason: 'editor page geometry가 달라졌습니다' };
  }
  let union = 0;
  let intersection = 0;
  for (let index = 0; index < actual.mask.length; index += 1) {
    union += Number(Boolean(actual.mask[index] || expected.mask[index]));
    intersection += Number(Boolean(actual.mask[index] && expected.mask[index]));
  }
  const inkAgreement = union === 0 ? 0 : intersection / union;
  return {
    matches: actual.hasBody && expected.hasBody && inkAgreement >= 0.9,
    inkAgreement,
    reason: inkAgreement < 0.9 ? 'baseline 본문 pixel과 일치하지 않습니다' : '',
  };
}

function measureBody(raster, region) {
  const mask = new Uint8Array(region.width * region.height);
  let darkPixels = 0;
  let inkRows = 0;
  let minX = region.width;
  let maxX = -1;
  for (let y = 0; y < region.height; y += 1) {
    let rowInk = 0;
    for (let x = 0; x < region.width; x += 1) {
      if (!isDark(raster, region.x + x, region.y + y)) continue;
      mask[y * region.width + x] = 1;
      darkPixels += 1;
      rowInk += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (rowInk >= 8) inkRows += 1;
  }
  const inkRatio = darkPixels / mask.length;
  const inkSpan = Math.max(0, maxX - minX + 1);
  const hasBody = darkPixels >= 800 && inkRatio >= 0.003 && inkRatio < 0.35
    && inkRows >= 18 && inkSpan >= region.width * 0.4;
  return { region, darkPixels, inkRows, inkSpan, inkRatio, hasBody, mask };
}

function validateRaster(raster) {
  const { width, height, channels, rowstride, data } = raster;
  if (![width, height, channels, rowstride].every(Number.isSafeInteger)
    || width < 1 || height < 1 || width > 8192 || height > 8192
    || ![3, 4].includes(channels) || rowstride < width * channels
    || !Buffer.isBuffer(data) || data.length > 40 * 1024 * 1024
    || data.length < (height - 1) * rowstride + width * channels
    || data.length > height * rowstride) throw new Error('screenshot raster 크기가 유효하지 않습니다');
}

function validateWindow(raster, window) {
  if (![window.x, window.y, window.width, window.height].every(Number.isSafeInteger)
    || window.x < 0 || window.y < 0 || window.width < 1000 || window.height < 700
    || window.x + window.width > raster.width || window.y + window.height > raster.height) {
    throw new Error('editor window가 screenshot 안의 지원 크기가 아닙니다');
  }
}

function pixel(raster, x, y) {
  const offset = y * raster.rowstride + x * raster.channels;
  if (raster.channels === 4 && raster.data[offset + 3] !== 255) {
    throw new Error('editor screenshot에 투명 pixel이 있습니다');
  }
  return raster.data.subarray(offset, offset + 3);
}

function isWhite(raster, x, y) {
  return pixel(raster, x, y).every((value) => value >= 248);
}

function isDark(raster, x, y) {
  return pixel(raster, x, y).every((value) => value < 180);
}
