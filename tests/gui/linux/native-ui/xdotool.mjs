import { spawnSync } from 'node:child_process';

export function createShortcutRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  return async (key) => {
    if (!['ctrl+l', 'ctrl+p', 'Escape'].includes(key)) throw new Error(`허용되지 않은 key: ${key}`);
    const result = execute(options.xdotoolPath ?? 'xdotool', ['key', '--clearmodifiers', key], {
      encoding: 'utf8', env: options.env ?? process.env, timeout: 5000,
    });
    if (result.status !== 0) throw new Error(`xdotool key failed: ${compactError(result)}`);
  };
}

export function createPointerRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  return async (extents) => {
    const { x, y, width, height } = validateExtents(extents);
    const centerX = x + Math.floor(width / 2);
    const centerY = y + Math.floor(height / 2);
    const result = execute(options.xdotoolPath ?? 'xdotool', [
      'mousemove', '--sync', String(centerX), String(centerY), 'click', '1',
    ], { encoding: 'utf8', env: options.env ?? process.env, timeout: 5000 });
    if (result.status !== 0) throw new Error(`xdotool click failed: ${compactError(result)}`);
  };
}

function validateExtents(extents) {
  const values = ['x', 'y', 'width', 'height'].map((key) => extents?.[key]);
  if (!values.every(Number.isSafeInteger)) throw new Error('semantic button extents가 정수가 아닙니다');
  const [x, y, width, height] = values;
  if (x < 0 || y < 0 || width < 1 || height < 1 || x + width > 32768 || y + height > 32768) {
    throw new Error('semantic button extents가 화면 범위를 벗어났습니다');
  }
  return { x, y, width, height };
}

function compactError(result) {
  return String(result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 500);
}
