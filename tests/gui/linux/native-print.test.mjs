import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';
import test from 'node:test';
import { runProductionPrintSequence, waitForVirtualPrinterPdf } from './native-print.mjs';

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
    waitForCupsPdf: async () => { calls.push(['cupsPdf']); },
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'actionOptional', 'waitAbsent', 'wait',
    'printToFile', 'wait', 'trigger', 'wait', 'file',
    'cancelPrint', 'wait', 'trigger', 'wait',
    'virtualPrinter', 'wait', 'trigger', 'wait', 'cupsPdf',
  ]);
  assert.equal(calls[0][2], 10000);
  assert.deepEqual(calls[2][1], { roles: ['document text'], names: ['biz_plan.hwp'] });
  for (const [, selector] of calls.filter(([name], index) => name === 'wait' && index !== 2)) {
    assert.deepEqual(selector, {
      roles: ['document text'], names: ['biz_plan.hwp'], focused: true,
    });
  }
});

test('CUPS-PDF는 신규 regular PDF 하나가 안정되면 canonical evidence path로 이동한다', async () => {
  const directory = await mkdtemp(posix.join(tmpdir(), 'alhangeul-cups-'));
  const sourcePath = posix.join(directory, 'Alhangeul_job__2-job_1.pdf');
  const targetPath = posix.join(directory, 'biz_plan.pdf');
  try {
    await writeFile(sourcePath, '%PDF-1.4\nfixture\n');
    assert.equal(await waitForVirtualPrinterPdf({
      baseline: new Map(), directory, targetPath, timeoutMs: 1000, delay: async () => {},
    }), targetPath);
    assert.equal(await readFile(targetPath, 'utf8'), '%PDF-1.4\nfixture\n');
    await assert.rejects(readFile(sourcePath), { code: 'ENOENT' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CUPS-PDF는 신규 regular PDF가 복수이면 fail-closed 한다', async () => {
  const directory = await mkdtemp(posix.join(tmpdir(), 'alhangeul-cups-'));
  try {
    await Promise.all([
      writeFile(posix.join(directory, 'first.pdf'), '%PDF-1.4\nfirst\n'),
      writeFile(posix.join(directory, 'second.pdf'), '%PDF-1.4\nsecond\n'),
    ]);
    await assert.rejects(waitForVirtualPrinterPdf({
      baseline: new Map(), directory,
      targetPath: posix.join(directory, 'canonical.pdf'), timeoutMs: 1000,
    }), /artifact가 2개/);
  } finally {
    await rm(directory, { recursive: true, force: true });
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
