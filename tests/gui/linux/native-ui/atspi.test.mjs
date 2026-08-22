import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as hostPath from 'node:path';
import test from 'node:test';
import {
  createAtspiRunner,
  LinuxNativeUiAdapter,
} from './atspi.mjs';

test('Save As는 dialog readiness 뒤 directory와 basename을 semantic field에 입력한다', async () => {
  const calls = [];
  const shortcuts = [];
  let triggered = false;
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return { ok: true }; },
    runShortcut: async (key) => { shortcuts.push(key); },
  });

  await adapter.saveDocument('file:save-as', '/tmp/output/saved.hwp', async () => {
    triggered = true;
  });

  assert.equal(triggered, true);
  assert.deepEqual(shortcuts, ['ctrl+l', 'Return']);
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'setText', 'wait', 'setText', 'action', 'waitAbsent',
  ]);
  assert.equal(calls[1].value, '/tmp/output');
  assert.deepEqual(calls[1].selector.within.roles, ['file chooser']);
  assert.equal(calls[3].value, 'saved.hwp');
  assert.deepEqual(calls[3].selector.within.roles, ['file chooser']);
  assert.deepEqual(calls[4].selector.names, ['save', '저장']);
});

test('native open은 GTK location shortcut을 한 번 쓰고 modal close를 기다린다', async () => {
  const calls = [];
  const shortcuts = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
    runShortcut: async (key) => { shortcuts.push(key); },
  });
  await adapter.openDocument('/fixtures/biz_plan.hwp', async () => {});
  assert.deepEqual(shortcuts, ['ctrl+l', 'Return']);
  assert.deepEqual(calls.map(({ command }) => command), ['wait', 'setText', 'waitAbsent']);
  assert.equal(calls[1].value, '/fixtures/biz_plan.hwp');
  assert.deepEqual(calls[1].selector.within.roles, ['file chooser']);
});

test('print adapter는 Print to File만 고르고 save/cancel modal 종료를 확인한다', async () => {
  const calls = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
  });
  await adapter.printToFile('/tmp/output/gtk.pdf', async () => {});
  await adapter.cancelPrint(async () => {});
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'action', 'setText', 'action', 'waitAbsent',
    'wait', 'action', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, ['print to file', '파일로 인쇄']);
  assert.equal(calls[2].value, '/tmp/output/gtk.pdf');
  assert.deepEqual(calls[2].selector.within, { roles: ['dialog'], names: ['print', '인쇄'] });
  await assert.rejects(
    adapter.printWithVirtualPrinter('Office LaserJet', async () => {}),
    /physical printer/,
  );
});

test('Python bridge는 anonymous editable node를 semantic ancestor 안에서만 선택한다', async () => {
  const source = await readFile(new URL('./atspi_driver.py', import.meta.url), 'utf8');
  assert.match(source, /within = selector\.get\("within"\)/);
  assert.match(source, /matches_info\(node_info\(item\), within\)/);
  assert.match(source, /info\["role"\] in \{"text", "entry"\}/);
});

test('adapter 실패는 tree와 screenshot을 남기고 Escape cleanup 후 원인을 보존한다', async () => {
  const outputDir = await mkdtemp(hostPath.join(tmpdir(), 'alhangeul-atspi-'));
  const shortcuts = [];
  const adapter = createAdapter({
    outputDir,
    pathApi: hostPath,
    runAtspi: async (request) => {
      if (request.command === 'snapshot') return { nodes: [{ role: 'dialog', name: '저장' }] };
      throw new Error('dialog drift');
    },
    runShortcut: async (key) => { shortcuts.push(key); },
    captureScreenshot: async (path) => { await writeFile(path, 'png'); },
  });
  await assert.rejects(
    adapter.saveDocument('file:save-as', hostPath.join(outputDir, 'fail.hwp'), async () => {}),
    /dialog drift/,
  );
  assert.deepEqual(shortcuts, ['Escape']);
  const tree = JSON.parse(await readFile(hostPath.join(outputDir, 'native-ui', 'file-save-as-tree.json')));
  assert.equal(tree.nodes[0].name, '저장');
});

test('AT-SPI process bridge는 JSON 1건만 허용하고 driver 오류를 fail-closed 한다', async () => {
  const requests = [];
  const runner = createAtspiRunner({
    pythonPath: '/usr/bin/python3',
    driverPath: '/tests/atspi_driver.py',
    spawnSync: (command, args, options) => {
      requests.push([command, args, JSON.parse(options.input)]);
      return { status: 0, stdout: '{"ok":true,"result":{"role":"dialog"}}\n', stderr: '' };
    },
  });
  assert.deepEqual(await runner({ command: 'wait', timeoutMs: 5000 }), { role: 'dialog' });
  assert.equal(requests[0][0], '/usr/bin/python3');

  const failing = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":"missing role"}\n', stderr: 'private' }),
  });
  await assert.rejects(failing({ command: 'wait' }), /missing role/);

  const emptyError = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":""}\n', stderr: 'driver stderr' }),
  });
  await assert.rejects(emptyError({ command: 'wait' }), /driver stderr/);
});

function createAdapter(override = {}) {
  return new LinuxNativeUiAdapter({
    outputDir: '/tmp/evidence',
    timeoutMs: 30000,
    applicationNames: ['Alhangeul'],
    runShortcut: async () => {},
    captureScreenshot: async () => {},
    ...override,
  });
}
