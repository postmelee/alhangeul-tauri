import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveExecutable,
  spawnLoggedProcess,
  stopProcess,
} from '../../support/process.mjs';

const SOURCE_PATH = fileURLToPath(new URL('./drag_source.py', import.meta.url));

export async function dragFileIntoWindow(options, services = {}) {
  validateFile(options.filePath);
  const target = validateRect(options.targetRect, 'target');
  const env = options.env ?? process.env;
  if (!/^:\d+(?:\.\d+)?$/.test(env.DISPLAY ?? '')) {
    throw new Error('bounded drag는 X11 DISPLAY에서만 실행할 수 있습니다');
  }
  const findExecutable = services.resolveExecutable ?? resolveExecutable;
  const python = await findExecutable('python3', { pathValue: env.PATH });
  const xdotool = await findExecutable('xdotool', { pathValue: env.PATH });
  const sourceProcess = (services.spawnLoggedProcess ?? spawnLoggedProcess)(
    python,
    [SOURCE_PATH, options.filePath],
    { env },
  );
  try {
    await waitForReady(sourceProcess, options.timeoutMs ?? 10000, services.delay);
    const screen = readScreenRect(xdotool, env, services.spawnSync);
    const source = readSourceRect(xdotool, env, services.spawnSync);
    assertInside(screen, source, 'source');
    assertInside(screen, target, 'target');
    performBoundedDrag(xdotool, source, target, env, services.spawnSync);
  } finally {
    await (services.stopProcess ?? stopProcess)(sourceProcess.child);
  }
}

export function performBoundedDrag(xdotool, sourceRect, targetRect, env, execute = spawnSync) {
  const source = center(validateRect(sourceRect, 'source'));
  const target = center(validateRect(targetRect, 'target'));
  const result = execute(xdotool, [
    'mousemove', '--sync', String(source.x), String(source.y),
    'mousedown', '1',
    'mousemove', '--sync', String(target.x), String(target.y),
    'mouseup', '1',
  ], { encoding: 'utf8', env, timeout: 10000 });
  if (result.status !== 0) {
    throw new Error(`bounded drag failed: ${String(result.stderr || result.error || '').trim()}`);
  }
}

function readScreenRect(xdotool, env, execute = spawnSync) {
  const result = execute(xdotool, ['getdisplaygeometry'], { encoding: 'utf8', env, timeout: 5000 });
  const match = String(result.stdout).trim().match(/^(\d+)\s+(\d+)$/);
  if (result.status !== 0 || !match) throw new Error('X11 screen geometry를 읽을 수 없습니다');
  return { x: 0, y: 0, width: Number(match[1]), height: Number(match[2]) };
}

function readSourceRect(xdotool, env, execute = spawnSync) {
  const result = execute(xdotool, [
    'search', '--name', '^Alhangeul GUI drag source$',
    'getwindowgeometry', '--shell',
  ], { encoding: 'utf8', env, timeout: 5000 });
  if (result.status !== 0) throw new Error('GTK drag source window를 찾을 수 없습니다');
  const values = Object.fromEntries(
    String(result.stdout).trim().split('\n').map((line) => line.split('=', 2)),
  );
  return validateRect({
    x: Number(values.X), y: Number(values.Y),
    width: Number(values.WIDTH), height: Number(values.HEIGHT),
  }, 'source');
}

async function waitForReady(process, timeoutMs, delay = defaultDelay) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error('drag source timeout은 100~30000ms여야 합니다');
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (process.stdout.value().includes('READY')) return;
    if (process.child.exitCode !== null) break;
    await delay(50);
  }
  throw new Error(`GTK drag source가 준비되지 않았습니다: ${process.stderr.value().slice(0, 300)}`);
}

function validateRect(rect, label) {
  const result = {
    x: Number(rect?.x), y: Number(rect?.y),
    width: Number(rect?.width), height: Number(rect?.height),
  };
  if (!Object.values(result).every(Number.isSafeInteger)
      || result.x < 0 || result.y < 0 || result.width < 20 || result.height < 20) {
    throw new Error(`${label} bounds가 유효하지 않습니다`);
  }
  return result;
}

function assertInside(screen, rect, label) {
  if (rect.x < screen.x || rect.y < screen.y
      || rect.x + rect.width > screen.x + screen.width
      || rect.y + rect.height > screen.y + screen.height) {
    throw new Error(`${label} bounds가 X11 screen 밖입니다`);
  }
}

function center(rect) {
  return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
}

function validateFile(path) {
  if (!isAbsolute(path) || /[\r\n\0]/.test(path)) throw new Error('drag fixture는 단일행 절대 경로여야 합니다');
}

function defaultDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
