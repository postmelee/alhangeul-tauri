import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPdfScope } from './verify-pdf-scope.mjs';

const context = { buildRef: 'a'.repeat(40), nativeRunId: '123' };
function completeEvidence() {
  return {
    schemaVersion: 1, scenario: 'linux-direct-pdf-hwpx', status: 'success',
    identity: context, fixtures: [{ id: 'form-hwpx' }],
    files: [
      'generated/form-direct.pdf', 'generated/form-direct-state.json',
      'pdf/direct-pdf-hwpx/pdf-analysis.json',
      ...Array.from({ length: 10 }, (_, index) =>
        `pdf/direct-pdf-hwpx/render-${String(index + 1).padStart(2, '0')}.png`),
    ].map((path) => ({ path })),
  };
}

test('HWPX 제한 실행은 정확한 문서·제품·10쪽 증거가 필요하다', () => {
  assert.doesNotThrow(() => verifyPdfScope(completeEvidence(), context));
  for (const override of [
    { status: 'failure' }, { scenario: 'linux-direct-pdf' },
    { fixtures: [{ id: 'biz-plan-hwp' }] }, { files: [] },
    { identity: { ...context, buildRef: 'b'.repeat(40) } },
    { identity: { ...context, nativeRunId: '124' } },
  ]) assert.throws(() => verifyPdfScope({ ...completeEvidence(), ...override }, context));
});

test('선택된 test가 없거나 PDF·상태·분석·한 쪽이라도 누락되면 실패한다', () => {
  assert.throws(() => verifyPdfScope({}, context));
  const evidence = completeEvidence();
  for (const missing of evidence.files) {
    assert.throws(() => verifyPdfScope({
      ...evidence, files: evidence.files.filter((file) => file !== missing),
    }, context));
  }
});
