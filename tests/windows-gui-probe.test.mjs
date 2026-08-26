import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectProbeEnvironment,
  runWindowsGuiProbe,
  selectSingleAppWindow,
} from './gui/windows/probe.mjs';

test('Windows probe 환경은 absolute CLI/output과 bounded timeout을 요구한다', () => {
  const runtime = inspectProbeEnvironment(probeOptions());
  assert.equal(runtime.cliPath, 'C:\\tools\\winapp.exe');
  assert.equal(runtime.screenshotPath, 'C:\\evidence\\scenarios\\windows-production-probe\\window.png');
  assert.throws(() => inspectProbeEnvironment(probeOptions({
    services: { platform: 'linux' },
  })), /Windows에서만/);
  assert.throws(() => inspectProbeEnvironment(probeOptions({
    env: { ALHANGEUL_WINAPP_CLI_PATH: 'winapp.exe' },
  })), /절대 Windows/);
});

test('production window discovery는 Alhangeul process/title 한 개만 허용한다', () => {
  assert.equal(selectSingleAppWindow([targetWindow()]).hwnd, 99);
  assert.throws(() => selectSingleAppWindow([]), /정확히 1개/);
  assert.throws(() => selectSingleAppWindow([
    targetWindow(),
    targetWindow({ hwnd: 100 }),
  ]), /2개/);
});

test('WebDriver readiness와 동일 WinApp PID/HWND evidence를 기록한다', async () => {
  const writes = new Map();
  const manifests = [];
  const result = await runWindowsGuiProbe(probeOptions({
    services: probeServices({ writes, manifests }),
  }));
  assert.equal(result.rootTag, 'HTML');
  assert.equal(result.status.processId, 77);
  assert.equal(manifests[0].status, 'success');
  assert.equal(manifests[0].scenario, 'windows-production-probe');
  assert.equal(manifests[0].files.length, 4);
  assert.ok(writes.has('C:\\evidence\\scenarios\\windows-production-probe\\inspect.json'));
});

test('WebView와 native title의 과도 상태를 각각 기다린다', async () => {
  let webAttempts = 0;
  let nativeAttempts = 0;
  const options = probeOptions({
    browser: fakeBrowser({
      getTitle: async () => (++webAttempts === 1 ? '' : 'Alhangeul'),
    }),
    services: probeServices({
      discoverWindows: async () => {
        nativeAttempts += 1;
        return [targetWindow({ title: nativeAttempts === 1 ? '' : 'Alhangeul' })];
      },
    }),
  });
  const result = await runWindowsGuiProbe(options);
  assert.equal(result.title, 'Alhangeul');
  assert.equal(result.target.title, 'Alhangeul');
  assert.equal(webAttempts, 2);
  assert.equal(nativeAttempts, 2);
});

test('target identity 불일치도 failure manifest를 남기고 실패한다', async () => {
  const manifests = [];
  await assert.rejects(runWindowsGuiProbe(probeOptions({
    services: probeServices({
      manifests,
      status: { processId: 78, hwnd: 99 },
    }),
  })), /target identity/);
  assert.equal(manifests[0].status, 'failure');
  assert.match(manifests[0].error, /target identity/);
});

function probeOptions(override = {}) {
  return {
    browser: fakeBrowser(),
    inputs: {
      appPath: 'C:\\Program Files\\Alhangeul\\Alhangeul.exe',
      buildRef: 'a'.repeat(40),
      nativeRunId: '1234',
      driverPath: 'C:\\cargo\\bin\\tauri-driver.exe',
      fixtureRoot: 'C:\\repo',
      outputDir: 'C:\\evidence',
      timeoutMs: 90_000,
      appVersion: '0.1.0',
      driverVersion: 'tauri-driver 2.0.6',
    },
    env: { ALHANGEUL_WINAPP_CLI_PATH: 'C:\\tools\\winapp.exe' },
    services: { platform: 'win32' },
    ...override,
  };
}

function probeServices(options = {}) {
  const target = targetWindow();
  return {
    platform: 'win32',
    mkdir: async () => {},
    writeFile: async (path, source) => options.writes?.set(path, source),
    describeFile: async (_root, path, kind) => ({
      kind,
      path: path.split('\\').at(-1),
      size: 10,
      sha256: 'b'.repeat(64),
    }),
    writeManifest: async (_root, manifest) => options.manifests?.push(manifest),
    discoverWindows: options.discoverWindows ?? (async () => [target]),
    createClient: () => ({
      status: async () => options.status ?? { processId: 77, hwnd: 99 },
      listWindows: async () => [target],
      inspect: async () => ({ windows: [{ hwnd: 99, elements: [{ type: 'Window' }] }] }),
      screenshot: async () => ({ processId: 77, hwnd: 99 }),
    }),
  };
}

function fakeBrowser(options = {}) {
  return {
    getTitle: options.getTitle ?? (async () => 'Alhangeul'),
    execute: options.execute ?? (async () => 'HTML'),
    waitUntil: async (condition, waitOptions) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        if (await condition()) return true;
      }
      throw new Error(waitOptions.timeoutMsg);
    },
  };
}

function targetWindow(override = {}) {
  return {
    processId: 77,
    hwnd: 99,
    processName: 'Alhangeul',
    title: 'Alhangeul',
    ...override,
  };
}
