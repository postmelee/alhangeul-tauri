import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_EVIDENCE_BYTES, parseEvidenceJson, readEvidenceJson, evidenceHash } from '../scripts/ci/acceptance-json.mjs';
import { SCENARIOS, STEP_NAMES, IDENTITY_FIELDS, fixedScenario, aggregateAcceptance, validateScenarioEvidence } from '../scripts/ci/acceptance-evidence.mjs';
import { identity, scenarioRow } from './fixtures/ci-acceptance.mjs';

test('strict JSON accepts UTF-8 BOM but hashes exact original bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alhangeul-acceptance-'));
  try {
    const bytes = Buffer.from('\ufeff{"objects":[{"same":1},{"same":2}],"escaped":"\\\"value"}');
    const path = join(dir, 'evidence.json');
    await writeFile(path, bytes);
    const result = await readEvidenceJson(path);
    assert.deepEqual(result.value.objects, [{ same: 1 }, { same: 2 }]);
    assert.equal(result.sha256, evidenceHash(bytes));
    assert.notEqual(result.sha256, evidenceHash(Buffer.from(JSON.stringify(result.value))));
    await assert.rejects(readEvidenceJson(dir));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

for (const [name, source] of [
  ['duplicate', '{"Status":1,"Status":2}'], ['PS case collision', '{"Status":1,"status":2}'],
  ['escaped duplicate', '{"status":1,"statu\\u0073":2}'], ['nested duplicate', '[{"a":{"b":1,"B":2}}]'],
  ['malformed', '{'], ['empty', ''], ['overflow number', '{"n":1e999}'],
  ['depth', '['.repeat(66) + '0' + ']'.repeat(66)],
]) test(`JSON boundary rejects ${name} without reflecting untrusted values`, () => {
  assert.throws(() => parseEvidenceJson(Buffer.from(source)), /^(Error: )?(invalid-evidence|duplicate-evidence)/);
});
test('JSON boundary rejects invalid encoding and oversized payload', () => {
  assert.throws(() => parseEvidenceJson(Buffer.from([0xff])), /encoding/);
  assert.throws(() => parseEvidenceJson(Buffer.alloc(MAX_EVIDENCE_BYTES + 1)), /size/);
});
test('read errors never expose the requested path', async () => {
  await assert.rejects(readEvidenceJson(join(tmpdir(), 'absent-private-evidence', 'missing.json')),
    { message: 'evidence-read-failed' });
});

test('fixed contracts cover exactly NSIS, MSI and forced reinstall', () => {
  for (const row of SCENARIOS) assert.deepEqual(fixedScenario(row.installerKind, row.scenario), row);
  assert.throws(() => fixedScenario('nsis', 'forced-reinstall'));
  assert.throws(() => fixedScenario('MSI', 'lifecycle'));
});

test('normal scenario requires independent replay and does not itself grant reuse', () => {
  const row = scenarioRow();
  const original = structuredClone(row);
  const result = validateScenarioEvidence(row.envelope, row.independent);
  assert.equal(result.verdict.reuseEligible, false);
  assert.deepEqual(row, original);
});
for (const field of IDENTITY_FIELDS) test(`scenario rejects mismatched ${field}`, () => {
  const row = scenarioRow();
  row.envelope.identity[field] += 'x';
  assert.throws(() => validateScenarioEvidence(row.envelope, row.independent));
});
for (const step of STEP_NAMES) test(`scenario rejects missing or failed ${step}`, () => {
  for (const outcome of [undefined, 'failure', 'cancelled', 'skipped']) {
    const row = scenarioRow(); row.independent.steps[step] = outcome;
    assert.throws(() => validateScenarioEvidence(row.envelope, row.independent));
  }
});
for (const [name, mutate] of [
  ['self-declared success', (r) => { r.independent.replayedVerdict.contractStatus = 'failed'; }],
  ['input changed', (r) => { r.independent.hashes.input = '0'.repeat(64); }],
  ['raw summary changed', (r) => { r.independent.hashes.summary = '0'.repeat(64); }],
  ['step evidence changed', (r) => { r.independent.hashes.steps = '0'.repeat(64); }],
  ['exit inferred incorrectly', (r) => { r.independent.smokeExitCode = 23; }],
  ['exit string', (r) => { r.independent.smokeExitCode = '0'; }],
  ['acceptance step failed', (r) => { r.independent.acceptanceStep = 'failure'; }],
  ['diagnostic upload failed', (r) => { r.independent.uploadStep = 'failure'; }],
  ['unverified provenance', (r) => { r.envelope.provenanceStatus = 'requires-io-verification'; }],
  ['future policy', (r) => { r.envelope.policyVersion = 2; }],
  ['contract override', (r) => { r.envelope.verdict.contract = 'hosted-nsis-diagnostic'; }],
  ['unexpected reason', (r) => { r.envelope.verdict.reasonCodes.push('arbitrary'); }],
  ['private field', (r) => { r.envelope.privatePath = 'not-for-output'; }],
  ['private identity field', (r) => { r.envelope.identity.privatePath = 'not-for-output'; }],
  ['private verdict field', (r) => { r.envelope.verdict.privatePath = 'not-for-output'; }],
  ['scenario override', (r) => { r.envelope.name = 'nsis'; }],
]) test(`scenario fails closed: ${name}`, () => {
  const row = scenarioRow(); mutate(row);
  assert.throws(() => validateScenarioEvidence(row.envelope, row.independent));
});

test('all three normal scenarios grant only producer reuse, never release or VDI acceptance', () => {
  const result = aggregateAcceptance(SCENARIOS.map((row) => scenarioRow(row.name)), identity());
  assert.equal(result.reuseEligible, true);
  assert.equal(result.releaseAcceptance, 'unverified');
  assert.equal(result.latestVdiAcceptance, 'unverified');
  assert.equal(result.productAcceptance, 'windows-installer-scenarios-only');
});
test('accepted aggregate snapshots inputs instead of exposing mutable references', () => {
  const expected = identity();
  const rows = SCENARIOS.map((row) => scenarioRow(row.name));
  const result = aggregateAcceptance(rows, expected);
  expected.runAttempt = '7'; rows[0].envelope.verdict.reasonCodes.push('private');
  rows[0].artifact.id = '999';
  assert.equal(result.identity.runAttempt, '2');
  assert.deepEqual(result.scenarios[0].verdict.reasonCodes, ['known-limitation-not-reproduced']);
  assert.equal(result.scenarios[0].artifact.id, '300');
});
test('known NSIS failure and 3010 preserve raw failures and block reuse', () => {
  const rows = [scenarioRow('nsis', 'limited'), scenarioRow(), scenarioRow('msi-forced-reinstall', 'reboot')];
  const result = aggregateAcceptance(rows, identity());
  assert.equal(result.contractStatus, 'passed');
  assert.equal(result.reuseEligible, false);
  assert.equal(result.productAcceptance, 'limited-observation');
  assert.equal(result.scenarios[0].verdict.rawSmoke.failureCount, 12);
  assert.equal(result.scenarios[2].verdict.rawSmoke.failureCount, 1);
  assert.ok(result.restrictions.includes('post-reboot-unverified'));
  rows[0].envelope.verdict.rawSmoke.failureCount = 0;
  assert.throws(() => aggregateAcceptance(rows, identity()));
});
for (const [name, mutate] of [
  ['missing scenario', (rows) => { rows.pop(); }],
  ['duplicate scenario', (rows) => { rows[2] = structuredClone(rows[0]); }],
  ['duplicate archive', (rows) => { rows[2].artifact.id = rows[0].artifact.id; }],
  ['different attempt', (rows) => { rows[0].independent.identity.runAttempt = '1'; }],
  ['archive digest absent', (rows) => { delete rows[0].artifact.digest; }],
]) test(`aggregate rejects ${name}`, () => {
  const rows = SCENARIOS.map((row) => scenarioRow(row.name)); mutate(rows);
  assert.throws(() => aggregateAcceptance(rows, identity()));
});
test('reuse mode never becomes a new ordinary producer', () => {
  const rows = SCENARIOS.map((row) => scenarioRow(row.name));
  const reused = { ...identity(), sourceMode: 'reuse', harnessSha: '9'.repeat(40), workflowSha: '9'.repeat(40) };
  for (const row of rows) { row.envelope.identity = { ...reused }; row.independent.identity = { ...reused }; }
  assert.equal(aggregateAcceptance(rows, reused).reuseEligible, false);
});
