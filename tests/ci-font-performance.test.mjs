import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import { readPerformanceCandidate, selectPerformanceFile } from '../scripts/ci/font-performance-candidate.mjs';

const valid = { FONT_PERFORMANCE_BUILD_REF: 'a'.repeat(40), FONT_PERFORMANCE_RUN_ID: '123', FONT_PERFORMANCE_PLATFORM: 'windows-x64' };
test('performance candidate accepts exact supported source/run and rejects malformed identity', () => {
  assert.equal(readPerformanceCandidate(valid).kind, 'msi');
  assert.equal(readPerformanceCandidate({ ...valid, FONT_PERFORMANCE_PLATFORM: 'linux-x64' }).kind, 'appimage');
  for (const [key, values] of Object.entries({ FONT_PERFORMANCE_BUILD_REF: ['', 'main', 'A'.repeat(40)],
    FONT_PERFORMANCE_RUN_ID: ['', '-1', '1x', '9007199254740992'], FONT_PERFORMANCE_PLATFORM: ['unsupported-platform', 'linux-arm64'] })) {
    for (const value of values) assert.throws(() => readPerformanceCandidate({ ...valid, [key]: value }));
  }
});

test('performance file selection rejects missing, duplicate, empty and malformed packages', () => {
  const file = { kind: 'msi', size: 42, sha256: 'a'.repeat(64), path: 'msi/app.msi' };
  assert.equal(selectPerformanceFile({ files: [file] }, 'msi'), file);
  for (const files of [[], [file, file], [{ ...file, size: 0 }], [{ ...file, sha256: 'wrong' }]]) {
    assert.throws(() => selectPerformanceFile({ files }, 'msi'));
  }
});

test('performance workflow only compares exact files and requires both GUI/cleanup outcomes', async () => {
  const source = await readFile(new URL('../.github/workflows/alhangeul-font-performance.yml', import.meta.url), 'utf8');
  const workflow = parse(source);
  assert.deepEqual(Object.keys(workflow.on), ['workflow_call', 'workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(workflow.jobs.compare.strategy.matrix.include.map(row => row.os), ['windows-2025', 'ubuntu-22.04']);
  assert.doesNotMatch(source, /secrets\.|: write|continue-on-error|gh release|build:desktop|tauri build|appimage-extract|APPIMAGE_EXTRACT_AND_RUN/);
  assert.match(source, /font-performance-candidate\.mjs/);
  assert.match(source, /test -c \/dev\/fuse/);
  const steps = workflow.jobs.compare.steps;
  const final = steps.at(-1);
  assert.equal(final.if, 'always()');
  assert.equal(final.shell, 'bash');
  assert.match(final.run, /outcomes\.every\(o=>o\.installed&&o\.gui&&o\.cleaned\)/);
  assert.match(final.run, /\['baseline','improved'\]/);
  const restore = steps.find(step => step.id === 'restore-policy');
  assert.equal(restore.if, "always() && runner.os == 'Windows'");
  assert.match(restore.run, /-Phase Cleanup/);
});

test('existing dispatcher calls performance comparison without publishing or rebuilding', async () => {
  const source = await readFile(new URL('../.github/workflows/alhangeul-desktop.yml', import.meta.url), 'utf8');
  const job = parse(source).jobs['font-performance'];
  assert.equal(job.if, "${{ inputs.mode == 'font-performance' && !inputs.publish_release }}");
  assert.equal(job.uses, './.github/workflows/alhangeul-font-performance.yml');
  assert.deepEqual(job.permissions, { contents: 'read', actions: 'read' });
  assert.equal(job.with.native_run_id, '${{ inputs.font_performance_run_id }}');
});
