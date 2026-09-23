import assert from 'node:assert/strict';
import test from 'node:test';
import { printWithVerifiedVirtualPrinter } from './virtual-printer.mjs';

const missing = new Error(
  "AT-SPI wait failed: semantic target did not appear: {'roles': ['dialog'], 'names': ['print', '인쇄']}",
);

test('AT-SPI가 반복 Print dialog를 누락하면 검증된 기본 PDF와 exact window만 허용한다', async () => {
  const calls = [];
  const printWindows = [];
  const windowShortcuts = [];
  await printWithVerifiedVirtualPrinter({
    printerName: 'PDF',
    defaultPrinterName: 'PDF',
    timeoutMs: 30000,
    trigger: async () => {},
    runAtspi: async (request) => { calls.push(request); throw missing; },
    runPrintWindow: async (request) => { printWindows.push(request); return {}; },
    runWindowShortcut: async (request) => { windowShortcuts.push(request); },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].timeoutMs, 5000);
  assert.deepEqual(printWindows.map(({ operation }) => operation), ['wait', 'waitAbsent']);
  assert.deepEqual(windowShortcuts, [{ titles: ['Print', '인쇄'], key: 'alt+p' }]);
});

test('AT-SPI dialog 부재 fallback은 검증된 default 불일치와 다른 driver 오류를 거부한다', async () => {
  const options = {
    printerName: 'PDF',
    timeoutMs: 30000,
    trigger: async () => {},
    runPrintWindow: async () => ({}),
    runWindowShortcut: async () => {},
  };
  await assert.rejects(
    printWithVerifiedVirtualPrinter({
      ...options, defaultPrinterName: '', runAtspi: async () => { throw missing; },
    }),
    /검증된 기본 virtual printer가 필요/,
  );
  await assert.rejects(
    printWithVerifiedVirtualPrinter({
      ...options, defaultPrinterName: 'PDF',
      runAtspi: async () => { throw new Error('AT-SPI wait failed: driver crash'); },
    }),
    /driver crash/,
  );
});
