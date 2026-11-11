import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFontRenderer, unavailableDeclaredFonts } from './gui/local-fonts/renderer-contract.mjs';

const absent = { effectiveBackend: 'canvas2d', backendFallbackReason: 'canvaskitResourcePreparationFailed',
  selection: { selectionError: 'CanvasKit font family가 준비되지 않았습니다: Abel' }, page: { canvaskit: null } };

test('disabled Abel records the real Canvas2D fallback separately from the request', () => {
  assert.deepEqual(assertFontRenderer(absent, 'canvaskit', true), {
    requestedBackend: 'canvaskit', effectiveBackend: 'canvas2d',
    backendFallbackReason: 'canvaskitResourcePreparationFailed',
  });
});
test('enabled Abel and unproven fallback must keep the requested renderer', () => {
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

test('remote font fallback requires an independently observed enforced CSP block', () => {
  const url = 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.0/HCRDotum.woff';
  const blocked = { ...absent, selection: { selectionError: `CanvasKit font source 준비 실패 (${url}): TypeError: Load failed` } };
  assert.equal(assertFontRenderer(blocked, 'canvaskit', false, [url]).effectiveBackend, 'canvas2d');
  assert.throws(() => assertFontRenderer(blocked, 'canvaskit', false), /unexpected renderer fallback/);
  assert.throws(() => assertFontRenderer(blocked, 'canvaskit', false, ['https://unrelated.example/font.woff']));
  assert.throws(() => assertFontRenderer(absent, 'canvaskit', false, [url]));
});

test('missing declared font requires independent absence and preserves available aliases', () => {
  const request = { source: '한양신명조', primary: ['한양신명조', 'HY Example'], substitute: [] };
  const plan = { embeddedFamilies: [], requests: [request] };
  assert.deepEqual(unavailableDeclaredFonts(plan, '[]', []), ['한양신명조']);
  assert.deepEqual(unavailableDeclaredFonts(plan, '[]', ['hyexample']), []);
  assert.deepEqual(unavailableDeclaredFonts(plan, '["HY Example"]', []), []);
  assert.deepEqual(unavailableDeclaredFonts({ ...plan, embeddedFamilies: ['한양신명조'] }, '[]', []), []);
  const missing = { ...absent, selection: { selectionError: 'CanvasKit font family가 준비되지 않았습니다: 한양신명조' } };
  assert.equal(assertFontRenderer(missing, 'canvaskit', false, [], ['한양신명조']).effectiveBackend, 'canvas2d');
  assert.throws(() => assertFontRenderer(missing, 'canvaskit', false, [], ['AnotherFont']));
});
