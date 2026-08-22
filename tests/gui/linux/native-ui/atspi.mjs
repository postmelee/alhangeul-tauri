import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRIVER_PATH = fileURLToPath(new URL('./atspi_driver.py', import.meta.url));
const FILE_DIALOG = Object.freeze({
  roles: ['file chooser', 'dialog'],
  names: ['file', '파일', 'open', '열기', 'save', '저장', 'name', '이름'],
});
const PRINT_DIALOG = Object.freeze({
  roles: ['dialog'],
  names: ['print', '인쇄'],
});
const FILE_CHOOSER_SCOPE = Object.freeze({
  roles: ['file chooser'],
  names: ['file', '파일', 'open', '열기', 'save', '저장'],
});
const LOCATION_ENTRY = Object.freeze({
  roles: ['text', 'entry'],
  within: FILE_CHOOSER_SCOPE,
});
const NAME_ENTRY = Object.freeze({
  roles: ['text', 'entry'],
  within: FILE_CHOOSER_SCOPE,
});
const BUTTON_ROLES = ['push button', 'button'];

export function createAtspiRunner(options = {}) {
  const execute = options.spawnSync ?? spawnSync;
  const pythonPath = options.pythonPath ?? 'python3';
  const driverPath = options.driverPath ?? DRIVER_PATH;
  return async (request) => {
    const result = execute(pythonPath, [driverPath], {
      encoding: 'utf8',
      env: options.env ?? process.env,
      input: JSON.stringify(request),
      maxBuffer: 2 * 1024 * 1024,
      timeout: Math.min((request.timeoutMs ?? 15000) + 5000, 125000),
    });
    const response = parseDriverResponse(result.stdout);
    if (result.status !== 0 || !response.ok) {
      const responseError = typeof response.error === 'string' ? response.error.trim() : '';
      throw new Error(`AT-SPI command failed: ${responseError || compactError(result)}`);
    }
    return response.result;
  };
}

export class LinuxNativeUiAdapter {
  constructor(options) {
    this.pathApi = options.pathApi ?? posix;
    if (!this.pathApi.isAbsolute(options.outputDir)) throw new Error('native UI outputDir는 절대 경로여야 합니다');
    this.outputDir = options.outputDir;
    this.timeoutMs = boundedTimeout(options.timeoutMs ?? 30000);
    this.applicationNames = validateNames(options.applicationNames ?? ['Alhangeul']);
    this.saveTargets = options.saveTargets ?? {};
    this.runAtspi = options.runAtspi ?? createAtspiRunner(options);
    this.runShortcut = options.runShortcut ?? createShortcutRunner(options);
    this.captureScreenshot = options.captureScreenshot ?? (async () => {});
  }

  async complete(command, trigger) {
    if (command === 'file:save') {
      await trigger();
      return;
    }
    const targetPath = this.saveTargets[command];
    if (!targetPath) throw new Error(`${command}의 native save target이 없습니다`);
    await this.saveDocument(command, targetPath, trigger);
  }

  async openDocument(path, trigger) {
    validateAbsoluteFile(path, 'open path', this.pathApi);
    return this.withFailureEvidence('open-document', async () => {
      await trigger();
      await this.wait(FILE_DIALOG);
      await this.shortcut('ctrl+l');
      await this.setText(LOCATION_ENTRY, path);
      await this.shortcut('Return');
      await this.waitAbsent(FILE_DIALOG);
    });
  }

  async saveDocument(command, path, trigger) {
    validateAbsoluteFile(path, 'save path', this.pathApi);
    return this.withFailureEvidence(safeLabel(command), async () => {
      await trigger();
      await this.wait(FILE_DIALOG);
      await this.shortcut('ctrl+l');
      await this.setText(LOCATION_ENTRY, this.pathApi.dirname(path));
      await this.shortcut('Return');
      await this.wait(FILE_DIALOG);
      await this.setText(NAME_ENTRY, this.pathApi.basename(path));
      await this.action({ roles: BUTTON_ROLES, names: ['save', '저장'] });
      await this.waitAbsent(FILE_DIALOG);
    });
  }

  async printToFile(path, trigger) {
    validateAbsoluteFile(path, 'print path', this.pathApi);
    return this.withFailureEvidence('print-to-file', async () => {
      await trigger();
      await this.wait(PRINT_DIALOG);
      await this.action({
        roles: ['radio button', 'table cell', 'list item', 'toggle button'],
        names: ['print to file', '파일로 인쇄'],
      });
      await this.setText({
        roles: ['text', 'entry'],
        names: ['file', '파일', 'name', '이름'],
        within: PRINT_DIALOG,
      }, path);
      await this.action({ roles: BUTTON_ROLES, names: ['print', '인쇄'] });
      await this.waitAbsent(PRINT_DIALOG);
    });
  }

  async printWithVirtualPrinter(printerName, trigger) {
    const name = validateNames([printerName])[0];
    if (!/(pdf|print\s+to\s+file|파일)/i.test(name)) {
      throw new Error('physical printer는 GUI acceptance에서 선택할 수 없습니다');
    }
    return this.withFailureEvidence('virtual-printer', async () => {
      await trigger();
      await this.wait(PRINT_DIALOG);
      await this.action({
        roles: ['radio button', 'table cell', 'list item', 'toggle button'],
        names: [name],
      });
      await this.action({ roles: BUTTON_ROLES, names: ['print', '인쇄'] });
      await this.waitAbsent(PRINT_DIALOG);
    });
  }

  async cancelPrint(trigger) {
    return this.withFailureEvidence('cancel-print', async () => {
      await trigger();
      await this.wait(PRINT_DIALOG);
      await this.action({ roles: BUTTON_ROLES, names: ['cancel', '취소'] });
      await this.waitAbsent(PRINT_DIALOG);
    });
  }

  async dumpTree(label) {
    const result = await this.command({ command: 'snapshot' });
    const path = this.pathApi.join(this.outputDir, 'native-ui', `${safeLabel(label)}-tree.json`);
    await mkdir(this.pathApi.dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
    return path;
  }

  async withFailureEvidence(label, action) {
    try {
      return await action();
    } catch (error) {
      await mkdir(this.pathApi.join(this.outputDir, 'native-ui'), { recursive: true });
      await Promise.allSettled([
        this.dumpTree(label),
        this.captureScreenshot(this.pathApi.join(this.outputDir, 'native-ui', `${safeLabel(label)}.png`)),
      ]);
      await this.runShortcut('Escape').catch(() => undefined);
      throw error;
    }
  }

  wait(selector) {
    return this.command({ command: 'wait', selector });
  }

  waitAbsent(selector) {
    return this.command({ command: 'waitAbsent', selector });
  }

  setText(selector, value) {
    return this.command({ command: 'setText', selector, value });
  }

  action(selector) {
    return this.command({ command: 'action', selector });
  }

  shortcut(key) {
    return this.runShortcut(key);
  }

  command(request) {
    return this.runAtspi({
      applicationNames: this.applicationNames,
      timeoutMs: this.timeoutMs,
      ...request,
    });
  }
}

function createShortcutRunner(options) {
  const execute = options.spawnSync ?? spawnSync;
  return async (key) => {
    if (!['ctrl+l', 'Return', 'Escape'].includes(key)) throw new Error(`허용되지 않은 key: ${key}`);
    const result = execute(options.xdotoolPath ?? 'xdotool', ['key', '--clearmodifiers', key], {
      encoding: 'utf8', env: options.env ?? process.env, timeout: 5000,
    });
    if (result.status !== 0) throw new Error(`xdotool key failed: ${compactError(result)}`);
  };
}

function parseDriverResponse(stdout) {
  const line = String(stdout ?? '').trim().split('\n').at(-1);
  if (!line) return { ok: false, error: 'driver가 JSON 응답을 내지 않았습니다' };
  try { return JSON.parse(line); } catch { return { ok: false, error: 'driver JSON 응답이 손상되었습니다' }; }
}

function compactError(result) {
  return String(result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 500);
}

function validateAbsoluteFile(path, label, pathApi) {
  if (!pathApi.isAbsolute(path) || /[\r\n\0]/.test(path)) throw new Error(`${label}는 단일행 절대 경로여야 합니다`);
}

function validateNames(names) {
  if (!Array.isArray(names) || names.length === 0 || names.length > 8) throw new Error('semantic name 목록이 유효하지 않습니다');
  return names.map((name) => {
    if (typeof name !== 'string' || name.trim() === '' || /[\r\n\0]/.test(name)) throw new Error('semantic name이 유효하지 않습니다');
    return name.trim();
  });
}

function boundedTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 5000 || value > 120000) throw new Error('native UI timeout은 5000~120000ms여야 합니다');
  return value;
}

function safeLabel(value) {
  return String(value).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 64);
}
