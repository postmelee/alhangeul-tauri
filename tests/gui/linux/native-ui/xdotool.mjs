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

function compactError(result) {
  return String(result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 500);
}
