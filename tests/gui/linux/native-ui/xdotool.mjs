import { spawnSync } from 'node:child_process';
import { posix } from 'node:path';

export const PRINT_DIALOG_TITLES = Object.freeze(['Print', '인쇄']);
export const PRINT_FILE_CHOOSER_TITLES = Object.freeze(['Select a filename', '파일 이름 선택']);

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
    if (key !== 'alt+p' || !sameTitles(titles, PRINT_DIALOG_TITLES)) {
      throw new Error('허용되지 않은 dialog shortcut입니다');
    }
    const config = runnerConfig(options, execute);
    const ids = findVisibleWindowIds(config, titles);
    if (ids.size !== 1) throw new Error(`exact print window cardinality가 ${ids.size}입니다`);
    const [windowId] = ids;
    run(config, [
      'windowactivate', '--sync', windowId, 'key', '--clearmodifiers', key,
    ], 'window shortcut');
    return { windowId };
  };
}

export function createPrintWindowRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const config = runnerConfig(options, execute);
  return async (request) => {
    validatePrintWindowRequest(request);
    const present = request.operation === 'wait';
    const windowId = await waitForExactWindow(
      config, request.titles, present, request.timeoutMs, delay, 'print',
    );
    return present ? { windowId } : { absent: true };
  };
}

export function createPrintFileChooserRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const config = runnerConfig(options, execute);
  return async (request) => {
    validateChooserRequest(request);
    const windowId = await waitForExactWindow(
      config, request.titles, true, request.timeoutMs, delay, 'file chooser',
    );
    if (request.operation === 'wait') return { windowId };
    run(config, ['windowactivate', '--sync', windowId], 'chooser activation');
    assertActiveWindow(config, windowId);
    run(config, [
      'windowactivate', '--sync', windowId,
      'key', '--clearmodifiers', 'ctrl+a',
      'type', '--clearmodifiers', '--delay', '0', posix.basename(request.path),
    ], 'chooser basename');
    assertActiveWindow(config, windowId);
    run(config, ['key', '--clearmodifiers', 'Return'], 'chooser default response');
    await waitForExactWindow(
      config, request.titles, false, request.timeoutMs, delay, 'file chooser',
    );
    return { windowId };
  };
}

function assertActiveWindow(config, expectedId) {
  const result = config.execute(config.xdotoolPath, ['getactivewindow'], config.execOptions);
  if (result.status !== 0) throw new Error(`xdotool active window failed: ${compactError(result)}`);
  if (String(result.stdout).trim() !== expectedId) {
    throw new Error('exact file chooser window가 active window가 아닙니다');
  }
}

async function waitForExactWindow(config, titles, present, timeoutMs, delay, label) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const ids = findVisibleWindowIds(config, titles);
    if (ids.size > 1) throw new Error(`exact ${label} window cardinality가 ${ids.size}입니다`);
    if ((present && ids.size === 1) || (!present && ids.size === 0)) return ids.values().next().value;
    if (Date.now() >= deadline) {
      throw new Error(`exact ${label} window가 ${present ? '나타나지' : '닫히지'} 않았습니다`);
    }
    await delay(100);
  }
}

function validatePrintWindowRequest(request) {
  if (!sameTitles(request.titles, PRINT_DIALOG_TITLES)) {
    throw new Error('허용되지 않은 print dialog title입니다');
  }
  if (!['wait', 'waitAbsent'].includes(request.operation)) {
    throw new Error('허용되지 않은 print window operation입니다');
  }
  if (!Number.isSafeInteger(request.timeoutMs)
    || request.timeoutMs < 100 || request.timeoutMs > 120000) {
    throw new Error('print window timeout은 100~120000ms여야 합니다');
  }
}

function findVisibleWindowIds(config, titles) {
  const ids = new Set();
  for (const title of titles) {
    const result = config.execute(config.xdotoolPath, [
      'search', '--onlyvisible', '--name', `^${escapeRegex(title)}$`,
    ], config.execOptions);
    if (![0, 1].includes(result.status)) throw new Error(`xdotool search failed: ${compactError(result)}`);
    if (result.status === 0) addWindowIds(ids, result.stdout);
  }
  return ids;
}

function addWindowIds(ids, stdout) {
  for (const id of String(stdout).trim().split(/\s+/).filter(Boolean)) {
    if (!/^\d+$/.test(id)) throw new Error('xdotool window ID가 유효하지 않습니다');
    ids.add(id);
  }
}

function validateChooserRequest(request) {
  if (!sameTitles(request.titles, PRINT_FILE_CHOOSER_TITLES)) {
    throw new Error('허용되지 않은 file chooser title입니다');
  }
  if (!['wait', 'submitPath'].includes(request.operation)) {
    throw new Error('허용되지 않은 file chooser operation입니다');
  }
  if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs < 100 || request.timeoutMs > 5000) {
    throw new Error('file chooser timeout은 100~5000ms여야 합니다');
  }
  if (request.operation === 'submitPath'
    && (typeof request.path !== 'string' || !request.path.startsWith('/') || /[\r\n\0]/.test(request.path))) {
    throw new Error('file chooser path는 단일행 절대 경로여야 합니다');
  }
}

function runnerConfig(options, execute) {
  return {
    execute,
    xdotoolPath: options.xdotoolPath ?? 'xdotool',
    execOptions: { encoding: 'utf8', env: options.env ?? process.env, timeout: 5000 },
  };
}

function run(config, args, label) {
  const result = config.execute(config.xdotoolPath, args, config.execOptions);
  if (result.status !== 0) throw new Error(`xdotool ${label} failed: ${compactError(result)}`);
}

function sameTitles(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactError(result) {
  return String(result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 500);
}
