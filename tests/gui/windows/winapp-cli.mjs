import { execFile } from 'node:child_process';
import { win32 } from 'node:path';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 1_048_576;
const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export function createWinAppCli(options = {}) {
  const executablePath = windowsExecutable(options.executablePath);
  const appPid = positiveInteger(options.appPid, 'app PID');
  const windowHandle = positiveInteger(options.windowHandle, 'window HWND');
  const runtime = {
    executablePath,
    appPid,
    windowHandle,
    timeoutMs: boundedTimeout(options.timeoutMs),
    execFileImpl: options.execFileImpl ?? execFile,
    env: options.env ?? process.env,
  };

  return Object.freeze({
    listWindows: async () => validateWindowList(
      await invokeUi(runtime, ['list-windows', '-a', String(appPid)]),
      appPid,
      windowHandle,
    ),
    status: async () => validateTarget(
      await invokeUi(runtime, ['status', '-w', String(windowHandle)]),
      appPid,
      windowHandle,
      'status',
    ),
    inspect: async (depth = 4) => validateInspect(
      await invokeUi(runtime, [
        'inspect', '-w', String(windowHandle), '--depth', String(inspectDepth(depth)),
      ]),
      windowHandle,
    ),
    waitFor: async (selector, timeoutMs = 5_000) => invokeUi(runtime, [
      'wait-for', safeText(selector, 'selector'), '-w', String(windowHandle),
      '--timeout', String(boundedWait(timeoutMs)),
    ]),
    screenshot: async (outputPath) => validateTarget(
      await invokeUi(runtime, [
        'screenshot', '-w', String(windowHandle), '--output', windowsOutput(outputPath),
      ]),
      appPid,
      windowHandle,
      'screenshot',
    ),
  });
}

export async function discoverWinAppWindows(options = {}) {
  const runtime = {
    executablePath: windowsExecutable(options.executablePath),
    timeoutMs: boundedTimeout(options.timeoutMs),
    execFileImpl: options.execFileImpl ?? execFile,
    env: options.env ?? process.env,
  };
  const payload = await invokeUi(runtime, [
    'list-windows', '-a', safeText(options.appName, 'app name'),
  ]);
  if (!Array.isArray(payload)) throw new Error('WinApp list-windows JSON은 배열이어야 합니다.');
  return payload.map((window) => normalizeWindow(window));
}

export async function runWinAppJson(options = {}) {
  const args = [...(options.args ?? [])];
  if (args.length === 0 || args.some((arg) => typeof arg !== 'string' || /[\r\n\0]/.test(arg))) {
    throw new Error('WinApp CLI argv는 비어 있지 않은 단일행 문자열 배열이어야 합니다.');
  }
  const result = await executeFile({
    executablePath: windowsExecutable(options.executablePath),
    args: [...args, '--json'],
    timeoutMs: boundedTimeout(options.timeoutMs),
    execFileImpl: options.execFileImpl ?? execFile,
    env: options.env ?? process.env,
  });
  if (result.error) throw commandError(result, args);
  if (result.stderr.trim() !== '') {
    throw new Error(`WinApp CLI가 성공하면서 stderr를 기록했습니다: ${boundedText(result.stderr)}`);
  }
  return parseJson(result.stdout, 'stdout');
}

async function invokeUi(runtime, args) {
  return runWinAppJson({ ...runtime, args: ['ui', ...args] });
}

function executeFile(options) {
  return new Promise((resolve) => {
    const childEnv = {
      ...options.env,
      WINAPP_CLI_TELEMETRY_OPTOUT: '1',
      WINAPP_CLI_UPDATE_CHECK: '0',
    };
    options.execFileImpl(options.executablePath, options.args, {
      encoding: 'utf8',
      env: childEnv,
      maxBuffer: MAX_OUTPUT_BYTES,
      timeout: options.timeoutMs,
      windowsHide: true,
    }, (error, stdout = '', stderr = '') => {
      resolve({ error, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

function commandError(result, args) {
  const envelope = parseLastJsonLine(result.stderr);
  const code = envelope?.error?.code ?? result.error.code ?? 'command_failed';
  const message = envelope?.error?.message ?? result.error.message;
  const error = new Error(`WinApp CLI ${args.slice(0, 2).join(' ')} 실패 (${code}): ${message}`);
  error.code = code;
  error.details = envelope?.error ?? null;
  return error;
}

function parseJson(source, stream) {
  const normalized = source.replace(ANSI_ESCAPE, '').trim();
  if (normalized === '') throw new Error(`WinApp CLI ${stream} JSON이 비어 있습니다.`);
  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error(`WinApp CLI ${stream}가 단일 JSON 값이 아닙니다: ${boundedText(normalized)}`);
  }
}

function parseLastJsonLine(source) {
  const lines = source.replace(ANSI_ESCAPE, '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return null;
  try { return JSON.parse(lines.at(-1)); } catch { return null; }
}

function validateWindowList(payload, pid, hwnd) {
  if (!Array.isArray(payload)) throw new Error('WinApp list-windows JSON은 배열이어야 합니다.');
  const windows = payload.map((window) => normalizeWindow(window));
  if (windows.length !== 1 || windows[0].processId !== pid || windows[0].hwnd !== hwnd) {
    throw new Error(`WinApp target window가 고정되지 않았습니다: PID ${pid}, HWND ${hwnd}`);
  }
  return windows;
}

function normalizeWindow(value) {
  if (!value || typeof value !== 'object') throw new Error('WinApp window JSON이 객체가 아닙니다.');
  return Object.freeze({
    ...value,
    processId: positiveInteger(value.processId, 'window processId'),
    hwnd: positiveInteger(value.hwnd, 'window hwnd'),
    processName: safeText(value.processName, 'window processName'),
    title: optionalText(value.title, 'window title'),
  });
}

function validateTarget(payload, pid, hwnd, command) {
  if (!payload || typeof payload !== 'object') throw new Error(`WinApp ${command} JSON이 객체가 아닙니다.`);
  if (positiveInteger(payload.processId, `${command} processId`) !== pid ||
      positiveInteger(payload.hwnd, `${command} hwnd`) !== hwnd) {
    throw new Error(`WinApp ${command} target PID/HWND가 다릅니다.`);
  }
  return payload;
}

function validateInspect(payload, hwnd) {
  if (!payload || !Array.isArray(payload.windows) || payload.windows.length === 0) {
    throw new Error('WinApp inspect JSON에 window tree가 없습니다.');
  }
  const target = payload.windows.find((window) => Number(window.hwnd) === hwnd);
  if (!target || !Array.isArray(target.elements) || target.elements.length === 0) {
    throw new Error('WinApp inspect JSON에 target HWND element가 없습니다.');
  }
  return payload;
}

function windowsExecutable(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || !/\.exe$/i.test(value)) {
    throw new Error('WinApp CLI executable은 절대 Windows .exe 경로여야 합니다.');
  }
  return win32.normalize(value);
}

function windowsOutput(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error('WinApp screenshot output은 절대 Windows 경로여야 합니다.');
  }
  return win32.normalize(value);
}

function safeText(value, name) {
  if (typeof value !== 'string' || value.trim() === '' || /[\r\n\0]/.test(value)) {
    throw new Error(`${name}은 비어 있지 않은 단일행 문자열이어야 합니다.`);
  }
  return value.trim();
}

function optionalText(value, name) {
  if (value == null) return '';
  if (typeof value !== 'string' || /[\r\n\0]/.test(value)) {
    throw new Error(`${name}은 단일행 문자열이어야 합니다.`);
  }
  return value.trim();
}

function positiveInteger(value, name) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${name}은 양의 안전 정수여야 합니다.`);
  return number;
}

function boundedTimeout(value = DEFAULT_TIMEOUT_MS) {
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 1_000 || timeout > 120_000) {
    throw new Error('WinApp CLI timeout은 1000~120000ms 범위여야 합니다.');
  }
  return timeout;
}

function boundedWait(value) {
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 100 || timeout > 120_000) {
    throw new Error('WinApp wait timeout은 100~120000ms 범위여야 합니다.');
  }
  return timeout;
}

function inspectDepth(value) {
  const depth = Number(value);
  if (!Number.isSafeInteger(depth) || depth < 1 || depth > 12) {
    throw new Error('WinApp inspect depth는 1~12 범위여야 합니다.');
  }
  return depth;
}

function boundedText(value) {
  return value.length <= 500 ? value : `${value.slice(0, 500)}…`;
}
