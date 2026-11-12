import test from 'node:test';
import assert from 'node:assert/strict';
import { candidate, verifyProducer } from '../scripts/ci/hosted-ui-input.mjs';
const valid = () => [{ id: candidate.run, head_sha: candidate.source, conclusion: 'success',
  repository: { full_name: candidate.repository } },
{ id: candidate.artifact, expired: false, name: 'alhangeul-desktop-windows-x64',
  digest: candidate.digest, workflow_run: { id: candidate.run, head_sha: candidate.source } }];
test('hosted UI observation requires exact successful source and artifact', () => {
  assert.doesNotThrow(() => verifyProducer(...valid()));
  for (const change of [
    ([r]) => { r.conclusion = 'failure'; },
    ([r]) => { r.head_sha = 'b'.repeat(40); },
    ([r]) => { r.repository.full_name = 'other/repository'; },
    ([, a]) => { a.expired = true; },
    ([, a]) => { a.id++; },
    ([, a]) => { a.digest = 'sha256:' + '0'.repeat(64); },
    ([, a]) => { a.workflow_run.id++; },
  ]) {
    const pair = valid(); change(pair);
    assert.throws(() => verifyProducer(...pair), /invalid-hosted-ui-producer/);
  }
});
