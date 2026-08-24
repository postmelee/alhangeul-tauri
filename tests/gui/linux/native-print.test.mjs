import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runProductionPrintSequence } from './native-print.mjs';

test('production native print는 준비·Print to File·cancel·CUPS를 같은 문서에서 순서대로 수행한다', async () => {
  const calls = [];
  const adapter = {
    wait: async (selector) => { calls.push(['wait', selector]); },
    waitAbsent: async (selector) => { calls.push(['waitAbsent', selector]); },
    actionOptional: async (selector, timeout) => {
      calls.push(['actionOptional', selector, timeout]);
      return { performed: true };
    },
    focus: async (selector) => { calls.push(['focus', selector]); },
    triggerSystemPrint: async () => { calls.push(['trigger']); },
    printToFile: async (path, trigger) => { calls.push(['printToFile', path]); await trigger(); },
    cancelPrint: async (trigger) => { calls.push(['cancelPrint']); await trigger(); },
    printWithVirtualPrinter: async (name, trigger) => {
      calls.push(['virtualPrinter', name]);
      await trigger();
    },
  };
  await runProductionPrintSequence({
    adapter,
    displayName: 'biz_plan.hwp',
    gtkPdf: '/evidence/gtk.pdf',
    cupsPdf: '/evidence/cups.pdf',
    printerName: 'PDF',
    waitForFile: async (path) => { calls.push(['file', path]); },
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'actionOptional', 'waitAbsent', 'wait',
    'printToFile', 'wait', 'trigger', 'wait', 'file',
    'cancelPrint', 'wait', 'trigger', 'wait',
    'virtualPrinter', 'wait', 'trigger', 'wait', 'file',
  ]);
  assert.equal(calls[0][2], 10000);
  assert.deepEqual(calls[2][1], { roles: ['document text'], names: ['biz_plan.hwp'] });
  for (const [, selector] of calls.filter(([name], index) => name === 'wait' && index !== 2)) {
    assert.deepEqual(selector, {
      roles: ['document text'], names: ['biz_plan.hwp'], focused: true,
    });
  }
});

test('native print executable는 direct production process와 finally cleanup을 고정한다', async () => {
  const source = await readFile(new URL('./native-print.mjs', import.meta.url), 'utf8');
  assert.match(source, /spawnLoggedProcess\(inputs\.appPath, \[fixture\.absolutePath\]/);
  assert.match(source, /cwd: generatedDir/);
  assert.match(source, /mode: 'production-native-print'/);
  assert.match(source, /webdriverControlled: false/);
  assert.match(source, /finally \{\n    await stopProcess\(app\.child\);\n  \}/);
  assert.doesNotMatch(source, /tauri-driver|WebKitWebDriver|@wdio/);
});
