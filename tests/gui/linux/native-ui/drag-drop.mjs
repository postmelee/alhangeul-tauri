import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
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
  const pathOptions = { pathValue: env.PATH, pathApi: posix };
  const python = await findExecutable('python3', pathOptions);
  const xdotool = await findExecutable('xdotool', pathOptions);
  const sourceProcess = (services.spawnLoggedProcess ?? spawnLoggedProcess)(
    python,
    [SOURCE_PATH, options.filePath],
    { env },
  );
  const evidence = { phase: 'source-ready', target, markers: [] };
  try {
    await waitForReady(sourceProcess, options.timeoutMs ?? 10000, services.delay);
    const screen = readScreenRect(xdotool, env, services.spawnSync);
    const source = readSourceRect(xdotool, env, services.spawnSync);
    assertInside(screen, source, 'source');
    assertInside(screen, target, 'target');
    Object.assign(evidence, { screen, source });
    await performBoundedDrag(xdotool, source, target, env, {
      execute: services.spawnSync,
      observe: async (marker) => {
        evidence.phase = marker === 'STARTED' ? 'drag-start' : 'uri-transfer';
        await waitForMarker(sourceProcess, marker, options.timeoutMs ?? 10000, services.delay);
      },
    });
    evidence.phase = 'drag-end';
    await waitForTransfer(sourceProcess, options.timeoutMs ?? 10000, services.delay);
    evidence.phase = 'complete';
  } finally {
    try {
      await writeTransferEvidence(options.evidencePath, evidence, sourceProcess.stdout.value());
    } finally {
      await (services.stopProcess ?? stopProcess)(sourceProcess.child);
    }
  }
}

async function writeTransferEvidence(path, evidence, output) {
  if (!path) return;
  evidence.markers = String(output).split(/\r?\n/)
    .filter((line) => /^(READY|STARTED|DATA|FINISHED|FAILED:[A-Z_-]+)$/.test(line));
  await mkdir(posix.dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(evidence, null, 2));
}

export async function performBoundedDrag(xdotool, sourceRect, targetRect, env, services = {}) {
  const sourceBounds = validateRect(sourceRect, 'source');
  const source = center(sourceBounds);
  const threshold = dragThresholdPoint(sourceBounds, source);
  const target = center(validateRect(targetRect, 'target'));
  const execute = services.execute ?? spawnSync;
  const observe = services.observe ?? (async () => {});
  const input = (args) => {
    const result = execute(xdotool, args, { encoding: 'utf8', env, timeout: 10000 });
    if (result.status !== 0) {
      throw new Error(`bounded drag failed: ${String(result.stderr || result.error || '').trim()}`);
    }
  };
  // One gesture: wait for GTK/Xdnd observations instead of assuming 200ms delivers the URI.
  try {
    input([
      'mousemove', '--sync', String(source.x), String(source.y),
      'mousedown', '1', 'sleep', '0.2',
      'mousemove', '--sync', String(threshold.x), String(threshold.y),
    ]);
    await observe('STARTED');
    input(['mousemove', '--sync', String(target.x), String(target.y)]);
    await observe('DATA');
  } finally {
    input(['mouseup', '1']);
  }
}

async function waitForMarker(process, marker, timeoutMs, delay = defaultDelay) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const output = process.stdout.value();
    if (hasMarker(output, marker)) return;
    if (hasMarker(output, 'FINISHED') || process.child.exitCode !== null) break;
    await delay(50);
  }
  throw new Error(`GTK drag ${marker} 관측을 확인하지 못했습니다`);
}

function readScreenRect(xdotool, env, execute = spawnSync) {
  const result = execute(xdotool, ['getdisplaygeometry'], { encoding: 'utf8', env, timeout: 5000 });
  const match = String(result.stdout).trim().match(/^(\d+)\s+(\d+)$/);
  if (result.status !== 0 || !match) throw new Error('X11 screen geometry를 읽을 수 없습니다');
  return { x: 0, y: 0, width: Number(match[1]), height: Number(match[2]) };
}

function readSourceRect(xdotool, env, execute = spawnSync) {
  const search = execute(xdotool, [
    'search', '--name', '^Alhangeul GUI drag source$',
  ], { encoding: 'utf8', env, timeout: 5000 });
  const windowIds = String(search.stdout).trim().split(/\s+/).filter(Boolean);
  if (search.status !== 0 || windowIds.length !== 1 || !/^\d+$/.test(windowIds[0])) {
    throw new Error(`GTK drag source window는 정확히 1개여야 합니다: ${windowIds.length}`);
  }
  const result = execute(xdotool, [
    'getwindowgeometry', '--shell', windowIds[0],
  ], { encoding: 'utf8', env, timeout: 5000 });
  if (result.status !== 0) throw new Error('GTK drag source geometry를 읽을 수 없습니다');
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
    if (hasMarker(process.stdout.value(), 'READY')) return;
    if (process.child.exitCode !== null) break;
    await delay(50);
  }
  throw new Error(`GTK drag source가 준비되지 않았습니다: ${process.stderr.value().slice(0, 300)}`);
}

async function waitForTransfer(process, timeoutMs, delay = defaultDelay) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const output = process.stdout.value();
    if (hasMarker(output, 'FINISHED')) {
      if (hasMarker(output, 'DATA')) return;
      throw new Error('GTK drag는 끝났지만 fixture URI가 전달되지 않았습니다');
    }
    if (process.child.exitCode !== null) break;
    await delay(50);
  }
  throw new Error(`GTK drag 전송이 완료되지 않았습니다: ${process.stderr.value().slice(0, 300)}`);
}

function hasMarker(output, marker) {
  return String(output).split(/\r?\n/).includes(marker);
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

function dragThresholdPoint(rect, source) {
  const right = rect.x + rect.width - 1 - source.x;
  const distance = Math.min(16, right);
  return { x: source.x + distance, y: source.y };
}

function validateFile(path) {
  if (!posix.isAbsolute(path) || /[\r\n\0]/.test(path)) throw new Error('drag fixture는 단일행 절대 경로여야 합니다');
}

function defaultDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
