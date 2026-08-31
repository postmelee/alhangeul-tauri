import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readInputs } from './window-probe.mjs';
import { parseWindows, webdriverClient } from './window-probe-support.mjs';

const env = { GITHUB_ACTIONS: 'true', ALHANGEUL_PROBE_MODE: 'normal-ui',
  ALHANGEUL_PROBE_APP: '/tmp/app', ALHANGEUL_PROBE_OUTPUT: '/tmp/evidence',
  ALHANGEUL_PROBE_COORDINATES: '/tmp/menu.json' };

test('native 진단은 Linux Actions와 절대 경로만 허용한다', () => {
  assert.equal(readInputs(env, 'linux').mode, 'normal-ui');
  assert.throws(() => readInputs(env, 'win32'), /Linux Actions/);
  assert.throws(() => readInputs({ ...env, GITHUB_ACTIONS: 'false' }, 'linux'), /Linux Actions/);
  assert.throws(() => readInputs({ ...env, ALHANGEUL_PROBE_APP: 'app' }, 'linux'), /absolute path/);
  assert.throws(() => readInputs({ ...env, ALHANGEUL_PROBE_MODE: 'apply' }, 'linux'), /mode/);
});

test('OS 관측은 Alhangeul 창만 반환하고 signed geometry를 보존한다', () => {
  const result = parseWindows('0x012345ab 0 123 -20 40 1100 700 runner Alhangeul\n'
    + '0x012345ac 0 124 0 0 800 600 runner unrelated');
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { id: '0x012345ab', pid: 123, title: 'Alhangeul',
    x: -20, y: 40, width: 1100, height: 700 });
  assert.deepEqual(parseWindows(''), []);
});

test('HTTP 500에서도 원래 WebKit crash 메시지를 기록한다', async () => {
  const evidence = [];
  const request = webdriverClient(evidence, async () => ({
    ok: false, status: 500,
    json: async () => ({ value: { error: 'invalid session id', message: 'page crash or hang' } }),
  }));
  await assert.rejects(request('GET', '/session/a/window/handles'), /page crash or hang/);
  assert.equal(evidence[0].httpStatus, 500);
  assert.match(evidence[0].error, /invalid session id/);
});

test('raw WebDriver 성공 응답과 요청 경로를 기록한다', async () => {
  const evidence = [];
  const request = webdriverClient(evidence, async () => ({
    ok: true, status: 200, json: async () => ({ value: ['window-1', 'window-2'] }),
  }));
  assert.deepEqual(await request('GET', '/session/a/window/handles'), ['window-1', 'window-2']);
  assert.equal(evidence[0].path, '/session/a/window/handles');
});

test('진단 workflow는 기존 N artifact만 읽고 비교·종료 stack을 수집한다', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/alhangeul-updater-linux-window-probe.yml', import.meta.url), 'utf8');
  const source = await readFile(new URL('./window-probe.mjs', import.meta.url), 'utf8');
  const dispatch = await readFile(new URL('../../../.github/workflows/alhangeul-desktop.yml', import.meta.url), 'utf8');
  assert.match(workflow, /runs-on: ubuntu-22.04/);
  assert.match(workflow, /9730919657/);
  assert.match(workflow, /62786aa966656d52dd597541ad46636facaf8d8f08d72838e12fedea2e33f368/);
  assert.match(workflow, /digest-mismatch: error/);
  assert.match(workflow, /for mode in webdriver-ui normal-ui webdriver-invoke normal-gdb/);
  assert.match(workflow, /appimage-before.sha256.*appimage-after.sha256/);
  assert.match(workflow, /if: \$\{\{ always\(\) \}\}/);
  assert.doesNotMatch(workflow, /contents: write|secrets\.|gh release|pnpm tauri build|cargo build/);
  assert.doesNotMatch(source, /invoke\(['"]updater_|update_apply|update_check/);
  assert.match(source, /delete env.TAURI_WEBVIEW_AUTOMATION/);
  assert.match(source, /alwaysMatch: \{ 'tauri:options': \{ application: app \} \}/);
  assert.doesNotMatch(source, /browserName:\s*['"]/);
  assert.match(source, /stopGroup\(managed\)/);
  assert.match(source, /catch syscall exit_group/);
  assert.match(source, /thread apply all bt 18/);
  assert.match(dispatch, /inputs.mode == 'updater-linux-window-probe'/);
});
