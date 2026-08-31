import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./gui/updater-window.ts', import.meta.url), 'utf8');

test('multi-window 생성은 driver 응답과 분리하고 실제 두 창과 native 결과를 확인한다', () => {
  assert.match(source, /window\.setTimeout\([\s\S]*invoke<string>\('create_editor_window'\)/);
  assert.match(source, /return handles\.length === 2/);
  assert.match(source, /__updaterWindowCreation = \{ error: String\(error\) \}/);
  const markers = [
    'const label = await readCreationResult()',
    'await browser.switchToWindow(handle)',
    'await waitForNativeBridge()',
    'await browser.switchToWindow(primaryHandle)',
  ];
  let cursor = 0;
  for (const marker of markers) {
    const next = source.indexOf(marker, cursor);
    assert.ok(next >= cursor, `순서가 올바르지 않습니다: ${marker}`);
    cursor = next + marker.length;
  }
  assert.doesNotMatch(source, /catch\s*\{/);
});
