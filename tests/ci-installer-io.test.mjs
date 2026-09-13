import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEvaluationInput, readEvaluationInput, encodeEvaluationInput, evaluationSummary, reportEvaluation } from '../scripts/ci/installer-evaluation.mjs';
import { identity, scenarioRow } from './fixtures/ci-acceptance.mjs';
import { evidenceHash } from '../scripts/ci/acceptance-json.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
function input() {
  const context = { ...identity(), policyVersion: 1, contract: 'strict-product', installerKind: 'msi', scenario: 'lifecycle' };
  return { context, identity: { ...context }, summary: {}, inventory: {}, fixtureManifest: {}, steps: scenarioRow().independent.steps, smokeExitCode: 0 };
}
function evaluation(name = 'msi', observation = 'normal') {
  return { schemaVersion: 1, policyVersion: 1, status: 'passed', inputSha256: 'a'.repeat(64),
    provenanceStatus: 'requires-io-verification', verdict: scenarioRow(name, observation).envelope.verdict };
}
test('prepared IO input chooses fixed contracts and does not grant provenance', () => {
  const value = input(); assert.equal(validateEvaluationInput(value), value);
  assert.equal(evaluationSummary(evaluation()).observation, 'scenario-only');
});
test('native stdout bridge preserves Korean and emoji independently of the Windows code page', () => {
  const value = { input: '한글 파일 😀', sha256: 'a'.repeat(64) };
  const encoded = encodeEvaluationInput(value);
  assert.doesNotMatch(encoded, /[^\x00-\x7f]/);
  assert.deepEqual(JSON.parse(encoded), value);
});
for (const [name, mutate] of [
  ['contract override', v => { v.context.contract = 'hosted-nsis-diagnostic'; }],
  ['policy override', v => { v.context.policyVersion = 2; }],
  ['mismatched read-back identity', v => { v.identity.runAttempt = '1'; }],
  ['unknown exit', v => { v.smokeExitCode = 23; }],
  ['string exit', v => { v.smokeExitCode = '0'; }],
  ['extra input field', v => { v.allowFailure = true; }],
  ['missing step', v => { delete v.steps.download; }],
]) test(`prepared IO rejects ${name}`, () => {
  const value = input(); mutate(value); assert.throws(() => validateEvaluationInput(value));
});
test('actual Node IO CLI hashes original bytes and rejects duplicate keys', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alhangeul-installer-io-'));
  try {
    const path = join(dir, 'prepared input.json');
    const bytes = Buffer.from('\ufeff' + JSON.stringify(input(), null, 2));
    await writeFile(path, bytes);
    const record = await readEvaluationInput(path);
    assert.equal(record.sha256, evidenceHash(bytes));
    const script = fileURLToPath(new URL('../scripts/ci/installer-evaluation.mjs', import.meta.url));
    assert.deepEqual(JSON.parse(execFileSync(process.execPath, [script, 'read', path], { encoding: 'utf8' })), record);
    await writeFile(path, '{"status":1,"STATUS":2}');
    assert.throws(() => execFileSync(process.execPath, [script, 'read', path], { stdio: 'pipe' }), error => {
      assert.equal(error.status, 1);
      assert.equal(error.stderr.toString().trim(), 'installer-evaluation-io-failed');
      return true;
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('summary/output IO records both contract success and product limitation without reuse claims', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alhangeul-installer-report-'));
  try {
    const path = join(dir, 'installer-evaluation.json');
    const env = { GITHUB_STEP_SUMMARY: join(dir, 'summary.md'), GITHUB_OUTPUT: join(dir, 'output.txt') };
    await writeFile(path, JSON.stringify(evaluation('nsis', 'limited')));
    assert.equal(await reportEvaluation(path, env), 0);
    const markdown = await readFile(env.GITHUB_STEP_SUMMARY, 'utf8');
    assert.match(markdown, /검사 계약: 통과 \/ 제품 관측: 제한/);
    assert.match(markdown, /0x80040154/);
    assert.match(markdown, /재사용 자격: 미검증/);
    assert.match(await readFile(env.GITHUB_OUTPUT, 'utf8'), /contract_status=passed\nproduct_observation=limited/);
    await writeFile(path, JSON.stringify({ ...evaluation(), status: 'failed', verdict: null, inputSha256: null }));
    assert.equal(await reportEvaluation(path, env), 1);
    assert.match(await readFile(env.GITHUB_OUTPUT, 'utf8'), /contract_status=failed\nproduct_observation=unverified/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('report cannot promote failed verdict, unknown contract or unverified hash to success', () => {
  for (const mutate of [v => { v.verdict.contractStatus = 'failed'; }, v => { v.inputSha256 = null; },
    v => { v.verdict.contract = 'allow-all'; }, v => { v.provenanceStatus = 'io-verified'; }]) {
    const value = evaluation(); mutate(value); assert.throws(() => evaluationSummary(value));
  }
});
test('Windows process wrapper is fixed to original smoke and preserves every raw exit', async () => {
  const [entry, child, acceptance, tests] = await Promise.all(['scripts/ci/installer-smoke.ps1',
    'scripts/ci/installer-process.ps1', 'scripts/ci/installer-acceptance.ps1', 'tests/windows-installer-io.test.ps1'].map(read));
  assert.match(entry, /\.\.\\windows-installer-smoke.ps1/);
  assert.match(entry, /Invoke-CiRecordedInstallerProcess/);
  assert.match(child, /status = 'not-started'; exitCode = \$null/);
  assert.match(child, /\$observation.exitCode = \$code/);
  assert.match(entry, /exit \$code/);
  assert.match(child, /return \[int\]\$child.ExitCode/);
  assert.match(child, /\$null -eq \$child.ExitCode -or \$child.ExitCode -isnot \[int\]/);
  assert.match(child, /powershell.exe/);
  assert.match(acceptance, /Get-InstallerAcceptance \$prepared.input/);
  assert.match(acceptance, /requires-io-verification/);
  assert.match(acceptance, /evaluation-input-output-collision/);
  for (const marker of ['0, 1, 23, 3010', 'PRIVATE-SENTINEL', 'GITHUB_STEP_SUMMARY', 'GITHUB_OUTPUT', 'Get-FileHash']) assert.ok(tests.includes(marker));
  for (const source of [entry, child, acceptance, tests]) {
    assert.doesNotMatch(source, /[^\x00-\x7f]/);
    assert.ok(source.split('\n').length <= 300);
  }
});
test('both installer workflows use the recorded process entry while retaining strict failure gates', async () => {
  const [fresh, reused, fast] = await Promise.all(['alhangeul-windows-smoke', 'alhangeul-installer-reuse', 'alhangeul-ci-fast']
    .map(name => read(`.github/workflows/${name}.yml`)));
  for (const workflow of [fresh, reused]) assert.match(workflow, /\.\\scripts\\ci\\installer-smoke.ps1/);
  assert.match(fresh, /smoke = \$env:SMOKE_OUTCOME/);
  assert.match(fresh, /Where-Object \{ \$_.Value -ne 'success' \}/);
  assert.doesNotMatch(reused, /continue-on-error/);
  const windows = fast.slice(fast.indexOf('  windows-scripts:'));
  assert.ok(windows.indexOf('actions/setup-node@v5') < windows.indexOf('windows-tests.ps1'));
  assert.match(windows, /node-version: "24"/);
});
