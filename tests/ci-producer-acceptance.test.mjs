import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyProducerAcceptance } from '../scripts/ci/producer-acceptance.mjs';
import { producerFixture, scenarioRow } from './fixtures/ci-acceptance.mjs';
import { parseEvidenceJson } from '../scripts/ci/acceptance-json.mjs';

test('producer requires verified metadata and digest-checked acceptance bytes', () => {
  const { document, handoff } = producerFixture();
  const result = verifyProducerAcceptance(document, handoff);
  assert.equal(result.status, 'verified');
  assert.equal(result.producerRunAttempt, '2');
  assert.equal(result.newProductAcceptance, 'unverified');
  assert.equal(result.releaseAcceptance, 'unverified');
});
test('aggregate JSON round trip preserves producer identity and eligibility', () => {
  const { document, handoff } = producerFixture();
  const decoded = parseEvidenceJson(Buffer.from(JSON.stringify(document)));
  assert.deepEqual(verifyProducerAcceptance(decoded, handoff), verifyProducerAcceptance(document, handoff));
});
for (const [name, mutate] of [
  ['metadata only', (d, h) => { h.downloadStatus = 'unverified'; }],
  ['failed producer', (d, h) => { h.producerConclusion = 'failure'; }],
  ['incomplete producer', (d, h) => { h.producerStatus = 'in_progress'; }],
  ['old attempt', (d) => { d.identity.runAttempt = '1'; }],
  ['different product', (d) => { d.identity.productSha = '9'.repeat(40); }],
  ['different archive', (d) => { d.identity.artifactId = '999'; }],
  ['different digest', (d) => { d.identity.artifactDigest = `sha256:${'9'.repeat(64)}`; }],
  ['legacy policy', (d) => { delete d.policyVersion; }],
  ['future policy', (d) => { d.policyVersion = 2; }],
  ['missing scenario', (d) => { d.scenarios.pop(); }],
  ['duplicate scenario', (d) => { d.scenarios[2] = structuredClone(d.scenarios[0]); }],
  ['duplicate archive', (d) => { d.scenarios[2].artifact.id = d.scenarios[0].artifact.id; }],
  ['scenario mixed attempt', (d) => { d.scenarios[0].identity.runAttempt = '1'; }],
  ['missing raw hash', (d) => { delete d.scenarios[0].hashes.summary; }],
  ['self-granted scenario reuse', (d) => { d.scenarios[0].verdict.reuseEligible = true; }],
  ['limited overall', (d) => { d.productAcceptance = 'limited-observation'; }],
  ['restrictions erased incompletely', (d) => { d.restrictions = ['post-reboot-unverified']; }],
  ['release overclaim', (d) => { d.releaseAcceptance = 'passed'; }],
  ['ineligible', (d) => { d.reuseEligible = false; }],
  ['string eligibility', (d) => { d.reuseEligible = 'true'; }],
]) test(`producer rejects ${name}`, () => {
  const { document, handoff } = producerFixture(); mutate(document, handoff);
  assert.throws(() => verifyProducerAcceptance(document, handoff));
});
for (const [name, observation] of [['nsis', 'limited'], ['msi-forced-reinstall', 'reboot']]) {
  test(`forged top-level success cannot conceal ${name} ${observation}`, () => {
    const { document, handoff } = producerFixture();
    const row = scenarioRow(name, observation);
    document.scenarios[document.scenarios.findIndex((item) => item.name === name)] = { name, ...row.envelope, artifact: row.artifact };
    assert.throws(() => verifyProducerAcceptance(document, handoff), /producer-scenario-limited/);
  });
}
