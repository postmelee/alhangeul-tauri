export const EDITOR_WINDOW = Object.freeze({ windowId: '42', x: 0, y: 0, width: 1280, height: 900 });

export function editorRaster({ blank = false, shifted = false } = {}) {
  const width = 1280;
  const height = 900;
  const raster = { width, height, channels: 3, rowstride: width * 3, data: Buffer.alloc(width * height * 3, 223) };
  paintRaster(raster, { x: 253, y: 183, width: 794, height: 697 }, 255);
  // Toolbar and caret are deliberately present even in the blank-body fixture.
  paintRaster(raster, { x: 30, y: 40, width: 1100, height: 30 }, 0);
  paintRaster(raster, { x: 320, y: 610, width: 2, height: 16 }, 0);
  if (!blank) {
    for (let x = 320; x < 960; x += 20) {
      paintRaster(raster, { x, y: shifted ? 480 : 365, width: 10, height: 25 }, 0);
      paintRaster(raster, { x, y: shifted ? 520 : 420, width: 12, height: 35 }, 0);
    }
  }
  return raster;
}

export function paintRaster(raster, region, value) {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    const start = y * raster.rowstride + region.x * raster.channels;
    raster.data.fill(value, start, start + region.width * raster.channels);
  }
}
