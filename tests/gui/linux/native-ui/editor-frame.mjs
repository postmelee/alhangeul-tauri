import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodeScreenshotRaster } from '../editor-pixels.mjs';

const RASTER_DRIVER = fileURLToPath(new URL('./screenshot_raster.py', import.meta.url));

export function createEditorWindowReader(options) {
  if (!Number.isSafeInteger(options.pid) || options.pid < 1) throw new Error('editor PID가 유효하지 않습니다');
  const execute = options.spawnSync ?? spawnSync;
  const run = (args) => {
    const result = execute(options.xdotoolPath ?? 'xdotool', args, {
      encoding: 'utf8', env: options.env ?? process.env, timeout: 5000,
    });
    if (result.status !== 0) throw new Error(`editor X11 조회 실패: ${String(result.stderr || result.error || result.status).slice(0, 300)}`);
    return String(result.stdout).trim();
  };
  return () => {
    const ids = run(['search', '--all', '--onlyvisible', '--pid', String(options.pid), '--name', '^Alhangeul$'])
      .split(/\s+/).filter(Boolean);
    if (ids.length !== 1 || !/^\d+$/.test(ids[0])) throw new Error('exact editor window cardinality가 1이 아닙니다');
    const windowId = ids[0];
    if (run(['getactivewindow']) !== windowId) throw new Error('exact editor window가 active가 아닙니다');
    return { windowId, ...parseWindowGeometry(run(['getwindowgeometry', '--shell', windowId])) };
  };
}

export function parseWindowGeometry(source) {
  const values = {};
  for (const key of ['X', 'Y', 'WIDTH', 'HEIGHT']) {
    const matches = [...source.matchAll(new RegExp(`^${key}=(-?\\d+)$`, 'mg'))];
    if (matches.length !== 1) throw new Error('X11 geometry 응답이 유효하지 않습니다');
    values[key.toLowerCase()] = Number(matches[0][1]);
  }
  if (!Object.values(values).every(Number.isSafeInteger)
    || values.width < 1 || values.height < 1) throw new Error('X11 geometry 크기가 유효하지 않습니다');
  return values;
}

export function createScreenshotReader(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  return async (path) => {
    const result = execute(options.pythonPath ?? 'python3', [RASTER_DRIVER, path], {
      env: options.env ?? process.env, timeout: 10000, maxBuffer: 40 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(`screenshot decode 실패: ${String(result.stderr || result.error || result.status).slice(0, 300)}`);
    return decodeScreenshotRaster(result.stdout);
  };
}
