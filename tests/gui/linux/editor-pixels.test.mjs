import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeEditorFrame, compareEditorFrames, decodeScreenshotRaster } from './editor-pixels.mjs';
import { EDITOR_WINDOW, editorRaster, paintRaster } from '../support/editor-raster-fixture.mjs';

test('editor pixel probe는 toolbar·caret가 아닌 흰 page 내부 본문을 검증한다', () => {
  const body = analyzeEditorFrame(editorRaster(), EDITOR_WINDOW);
  const blank = analyzeEditorFrame(editorRaster({ blank: true }), EDITOR_WINDOW);
  assert.equal(body.hasBody, true);
  assert.equal(blank.hasBody, false);
  assert.deepEqual(body.region, { x: 277, y: 252, width: 746, height: 360 });
  assert.equal(compareEditorFrames(body, body).matches, true);
  assert.equal(compareEditorFrames(blank, body).matches, false);
});

test('정상 pixel 양만 같아도 본문 위치·내용이 바뀌면 baseline과 불일치한다', () => {
  const body = analyzeEditorFrame(editorRaster(), EDITOR_WINDOW);
  const changed = analyzeEditorFrame(editorRaster({ shifted: true }), EDITOR_WINDOW);
  assert.equal(changed.hasBody, true);
  assert.equal(compareEditorFrames(changed, body).matches, false);
  assert.equal(compareEditorFrames({ ...body, region: { ...body.region, x: 278 } }, body).matches, false);
});

test('blank 전체·page 경계 없음·가려진 page·잘린 window는 fail-closed한다', () => {
  const blank = editorRaster();
  blank.data.fill(255);
  assert.throws(() => analyzeEditorFrame(blank, EDITOR_WINDOW), /흰 경계/);
  const covered = editorRaster();
  paintRaster(covered, { x: 277, y: 252, width: 746, height: 360 }, 0);
  assert.equal(analyzeEditorFrame(covered, EDITOR_WINDOW).hasBody, false);
  assert.throws(() => analyzeEditorFrame(editorRaster(), { ...EDITOR_WINDOW, x: 10 }), /지원 크기/);
  assert.throws(() => analyzeEditorFrame(editorRaster(), { ...EDITOR_WINDOW, height: 0 }), /지원 크기/);
});

test('raster bridge는 RGB/RGBA row padding과 마지막 row 길이를 검증한다', () => {
  for (const channels of [3, 4]) {
    const header = { width: 5, height: 2, channels, rowstride: 24 };
    const data = Buffer.alloc(24 + 5 * channels, 255);
    const frame = decodeScreenshotRaster(Buffer.concat([Buffer.from(`${JSON.stringify(header)}\n`), data]));
    assert.equal(frame.data.length, data.length);
    assert.throws(() => decodeScreenshotRaster(Buffer.concat([
      Buffer.from(`${JSON.stringify(header)}\n`), data.subarray(1),
    ])), /raster 크기/);
  }
  assert.throws(() => decodeScreenshotRaster(Buffer.from('broken')), /header/);
  assert.throws(() => analyzeEditorFrame({ ...editorRaster(), width: -1 }, EDITOR_WINDOW), /raster 크기/);
});
