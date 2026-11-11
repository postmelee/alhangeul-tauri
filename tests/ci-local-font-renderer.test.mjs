import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFontRenderer } from './gui/local-fonts/renderer-contract.mjs';

const absent = { effectiveBackend: 'canvas2d', backendFallbackReason: 'canvaskitResourcePreparationFailed',
  selection: { selectionError: 'CanvasKit font family가 준비되지 않았습니다: Abel' }, page: { canvaskit: null } };

test('disabled Abel records the real Canvas2D fallback separately from the request', () => {
  assert.deepEqual(assertFontRenderer(absent, 'canvaskit', true), {
    requestedBackend: 'canvaskit', effectiveBackend: 'canvas2d',
    backendFallbackReason: 'canvaskitResourcePreparationFailed',
  });
});
test('enabled font and representative documents must keep the requested renderer', () => {
  assert.throws(() => assertFontRenderer(absent, 'canvaskit'), /unexpected renderer fallback/);
  assert.deepEqual(assertFontRenderer({ effectiveBackend: 'canvaskit', backendFallbackReason: null }, 'canvaskit'), {
    requestedBackend: 'canvaskit', effectiveBackend: 'canvaskit', backendFallbackReason: null,
  });
});
test('disabled-font exception refuses unrelated or undocumented fallback', () => {
  for (const changed of [
    { backendFallbackReason: 'initializationFailed' },
    { selection: { selectionError: 'CanvasKit font family가 준비되지 않았습니다: AnotherFont' } },
    { page: { canvaskit: { localTypefaceCount: 1 } } },
    { effectiveBackend: 'unknown' },
  ]) assert.throws(() => assertFontRenderer({ ...absent, ...changed }, 'canvaskit', true));
});
