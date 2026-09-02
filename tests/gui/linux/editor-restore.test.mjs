import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as pathApi from 'node:path';
import test from 'node:test';
import { createEditorRestoreProbe, EDITOR_CHECKPOINTS } from './editor-restore.mjs';
import { EDITOR_WINDOW, editorRaster } from '../support/editor-raster-fixture.mjs';

async function withProbe(run, initial = {}) {
  const root = await mkdtemp(pathApi.join(tmpdir(), 'alhangeul-editor-'));
  const state = { blank: false, shifted: false, clock: 0, ...initial };
  const probe = createEditorRestoreProbe({
    outputDir: root, pid: 123, timeoutMs: 1000,
    captureScreenshot: async (path) => writeFile(path, 'synthetic image, decoded by test service'),
  }, {
    pathApi, readWindow: () => ({ ...EDITOR_WINDOW }),
    readScreenshot: async () => editorRaster(state),
    now: () => state.clock,
    delay: async (ms) => { state.clock += ms; },
  });
  const summary = async () => JSON.parse(await readFile(pathApi.join(
    root, 'scenarios', 'linux-system-print', 'editor', 'restore.json',
  ), 'utf8'));
  try { await run({ probe, state, summary }); } finally { await rm(root, { recursive: true, force: true }); }
}

test('본문 baseline과 세 인쇄 경계는 연속 두 frame·같은 baseline과 해시 evidence를 요구한다', async () => {
  await withProbe(async ({ probe, summary }) => {
    for (const label of EDITOR_CHECKPOINTS) await probe.check(label);
    const report = await summary();
    assert.equal(report.pid, 123);
    assert.deepEqual(report.checkpoints.map((point) => point.status), Array(4).fill('success'));
    assert.deepEqual(report.checkpoints.map((point) => point.samples.length), Array(4).fill(2));
    assert.equal((await probe.describeFiles()).length, 9);
    for (const checkpoint of report.checkpoints) {
      for (const sample of checkpoint.samples) {
        assert.match(sample.file.sha256, /^[a-f0-9]{64}$/);
        assert.equal(sample.metrics.hasBody, true);
        assert.equal(sample.metrics.mask, undefined);
      }
    }
  });
});

test('빈 baseline은 timeout으로 실패하고 첫 screenshot부터 모든 관찰을 보존한다', async () => {
  await withProbe(async ({ probe, summary }) => {
    await assert.rejects(probe.check('before-print'), /before-print: editor 본문/);
    const checkpoint = (await summary()).checkpoints[0];
    assert.equal(checkpoint.status, 'failure');
    assert.equal(checkpoint.samples.length, 3);
    assert.ok(checkpoint.samples.every((sample) => !sample.metrics.hasBody && sample.file.sha256));
  }, { blank: true });
});

test('인쇄 뒤 빈 본문이나 다른 본문은 포커스와 무관하게 실패한다', async () => {
  for (const change of [{ blank: true }, { shifted: true }]) {
    await withProbe(async ({ probe, state, summary }) => {
      await probe.check('before-print');
      Object.assign(state, change);
      await assert.rejects(probe.check('after-print-to-file'), /after-print-to-file:/);
      assert.equal((await summary()).checkpoints[1].status, 'failure');
    });
  }
});

test('순서를 건너뛰거나 무제한 timeout으로 body probe를 약화시킬 수 없다', async () => {
  await withProbe(async ({ probe }) => {
    await assert.rejects(probe.check('after-cancel'), /순서/);
  });
  assert.throws(() => createEditorRestoreProbe({ timeoutMs: 0 }), /timeout/);
});
