import { spawnSync } from 'node:child_process';

export function createShortcutRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  return async (key) => {
    if (!['ctrl+l', 'ctrl+p', 'Escape', 'alt+p'].includes(key)) throw new Error(`허용되지 않은 key: ${key}`);
    const result = execute(options.xdotoolPath ?? 'xdotool', ['key', '--clearmodifiers', key], {
      encoding: 'utf8', env: options.env ?? process.env, timeout: 5000,
    });
    if (result.status !== 0) throw new Error(`xdotool key failed: ${compactError(result)}`);
  };
}

export function createWindowShortcutRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  return async ({ titles, key }) => {
    if (key !== 'alt+p' || JSON.stringify(titles) !== JSON.stringify(['Print', '인쇄'])) {
      throw new Error('허용되지 않은 dialog shortcut입니다');
    }
    const ids = new Set();
    for (const title of titles) {
      const result = execute(options.xdotoolPath ?? 'xdotool', [
        'search', '--onlyvisible', '--name', `^${title}$`,
      ], { encoding: 'utf8', env: options.env ?? process.env, timeout: 5000 });
      if (![0, 1].includes(result.status)) throw new Error(`xdotool search failed: ${compactError(result)}`);
      if (result.status === 0) {
        for (const id of String(result.stdout).trim().split(/\s+/).filter(Boolean)) {
          if (!/^\d+$/.test(id)) throw new Error('xdotool window ID가 유효하지 않습니다');
          ids.add(id);
        }
      }
    }
    if (ids.size !== 1) throw new Error(`exact print window cardinality가 ${ids.size}입니다`);
    const [windowId] = ids;
    const result = execute(options.xdotoolPath ?? 'xdotool', [
      'windowactivate', '--sync', windowId, 'key', '--clearmodifiers', key,
    ], { encoding: 'utf8', env: options.env ?? process.env, timeout: 5000 });
    if (result.status !== 0) throw new Error(`xdotool window shortcut failed: ${compactError(result)}`);
    return { windowId };
  };
}

function compactError(result) {
  return String(result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 500);
}
