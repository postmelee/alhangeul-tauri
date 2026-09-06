import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertDocumentIdentity } from './gui/support/document-identity.ts';
import { analyzeWindowsPdfs, validateEvidence } from './gui/windows-pdf/analyze.mjs';

// Actual decision functions, not a duplicate selector or a mock of the validator.
// The dataset is reduced remote evidence, NOT a Windows UI replay or PDF sample.
const data = JSON.parse(await readFile(new URL('./fixtures/windows-pdf-regressions.json', import.meta.url), 'utf8'));
const sample = id => structuredClone(data.cases.find(item => item.id === id).evidence);
const expected = evidence => ({
  buildRef: evidence.buildRef, fixture: evidence.fixture, phase: evidence.phase,
});

test('판정 회귀와 정적 계약은 focused 명령 및 기본 automation suite에서 함께 실행된다', async () => {
  const { scripts } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  for (const key of ['test:gui:windows:contracts', 'test:automation']) {
    const files = scripts[key].split(/\s+/);
    for (const file of ['tests/windows-pdf-workflow.test.mjs',
      'tests/windows-pdf-regressions.test.mjs', 'tests/gui-contracts.test.mjs']) {
      assert.equal(files.filter(value => value === file).length, 1, `${key}: ${file}`);
    }
  }
});

test('축약 회귀 데이터는 원본 run·harness·artifact 식별과 고유 사례를 유지한다', () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.cases.length, 5);
  assert.equal(new Set(data.cases.map(item => item.id)).size, 5);
  for (const item of data.cases) {
    assert.match(item.origin.runId, /^[1-9][0-9]*$/);
    assert.match(item.origin.nativeRunId, /^[1-9][0-9]*$/);
    assert.match(item.origin.harnessSha, /^[0-9a-f]{40}$/);
    assert.match(item.origin.artifactFile, /^[a-z-]+\.json$/);
    assert.match(item.evidence.buildRef, /^[0-9a-f]{40}$/);
    const allowed = new Set(['buildRef', 'phase', 'fixture', 'scenario', 'nativeDialogs',
      'schemaVersion', 'openedTitle', 'documentIdentityVerified', 'status', 'sourceHash',
      'sourceUnchanged', 'dirtyPreserved', 'pdfSha256', 'pageCount', 'marker',
      'overwriteVerified', 'pdfTested']);
    for (const key of Object.keys(item.evidence)) assert.ok(allowed.has(key), `Unexpected raw field: ${key}`);
  }
});

for (const item of data.cases) {
  test(`실제 관측 재생: ${item.id}의 PDF evidence 판정`, () => {
    const evidence = structuredClone(item.evidence);
    if (item.id.startsWith('fresh-')) {
      assert.doesNotThrow(() => validateEvidence(evidence, expected(evidence)));
    } else {
      assert.throws(() => validateEvidence(evidence, expected(evidence)), /Invalid Windows PDF evidence/);
    }
  });
}

test('HWPX를 요청했지만 HWP가 열린 실제 title은 helper 성공 여부와 무관하게 거부한다', () => {
  const wrong = sample('wrong-document');
  assert.throws(() => assertDocumentIdentity(wrong.openedTitle, 'source-form-hwpx.hwpx'), /identity mismatch/);
  const good = sample('fresh-hwpx');
  assert.doesNotThrow(() => assertDocumentIdentity(good.openedTitle, 'source-form-hwpx.hwpx'));
  // Synthetic mutation: isolate title enforcement from the recorded failure flag.
  const falselyPassed = { ...good, openedTitle: wrong.openedTitle, documentIdentityVerified: true };
  assert.throws(() => validateEvidence(falselyPassed, expected(good)), /Invalid Windows PDF evidence/);
});

test('정확한 문서가 열려도 저장/덮어쓰기 성공의 증거는 아니다', () => {
  for (const id of ['open-only', 'unsupported-overwrite']) {
    const evidence = sample(id);
    const extension = evidence.fixture === 'biz-plan-hwp' ? 'hwp' : 'hwpx';
    assert.doesNotThrow(() => assertDocumentIdentity(
      evidence.openedTitle, `source-${evidence.fixture}.${extension}`,
    ));
    assert.throws(() => validateEvidence(evidence, expected(evidence)), /Invalid Windows PDF evidence/);
  }
});

test('fresh 성공을 restart로 재명명해도 overwrite 확인 없이 통과하지 않는다', () => {
  const fresh = sample('fresh-hwp');
  const restart = { ...fresh, phase: 'restart' };
  assert.throws(() => validateEvidence(restart, expected(restart)), /Invalid Windows PDF evidence/);
  // Positive control for this pure schema predicate, not an observed restart pass.
  assert.doesNotThrow(() => validateEvidence({ ...restart, overwriteVerified: true }, expected(restart)));
});

async function prepareFresh(root) {
  // Synthetic bytes: exercise evidence orchestration without a PDF renderer.
  const bytes = Buffer.from('unit-test-only-not-a-pdf');
  const pdfSha256 = createHash('sha256').update(bytes).digest('hex');
  for (const id of ['fresh-hwp', 'fresh-hwpx']) {
    const evidence = { ...sample(id), pdfSha256 };
    const label = `${evidence.fixture}-${evidence.phase}`;
    await writeFile(join(root, `${label}.json`), JSON.stringify(evidence));
    await writeFile(join(root, `${label}.pdf`), bytes);
  }
  // A previous result must not survive a new incomplete or failed analysis.
  await writeFile(join(root, 'windows-pdf-summary.json'), '{"status":"passed"}');
}

for (const failure of ['missing-restart', 'unsupported-overwrite']) {
  test(`두 fresh 성공 + ${failure}로 전체 summary를 만들지 않는다`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'windows-pdf-regression-'));
    try {
      await prepareFresh(root);
      if (failure === 'unsupported-overwrite') {
        await writeFile(join(root, 'biz-plan-hwp-restart.json'), JSON.stringify(sample(failure)));
      }
      let analysisCalls = 0;
      const fakeAnalysis = async () => { analysisCalls += 1; return { summary: {} }; };
      const error = failure === 'missing-restart' ? /ENOENT/ : /Invalid Windows PDF evidence/;
      await assert.rejects(analyzeWindowsPdfs(root, sample('fresh-hwp').buildRef, fakeAnalysis), error);
      assert.equal(analysisCalls, 1, 'stop before analyzing unverified restart output');
      await assert.rejects(readFile(join(root, 'windows-pdf-summary.json')), /ENOENT/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
