import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runReplayPowerShell } from '../../scripts/ci/installer-replay.mjs';
import { readEvidenceJson } from '../../scripts/ci/acceptance-json.mjs';

const [inputPath, output, evidencePath, testMode = 'normal'] = process.argv.slice(2);
const evidence = { schemaVersion: 1, status: 'failed', phase: 'evaluation', child: null };
const diagnostic = {};
async function run() {
const envOutput = process.env.GITHUB_OUTPUT;
const before = envOutput ? await readFile(envOutput) : null;
runReplayPowerShell('scripts/ci/installer-acceptance.ps1', ['-InputPath', inputPath, '-OutputDirectory', output]);
const result = (await readEvidenceJson(join(output, 'installer-evaluation.json'))).value;
assert.equal(result.status, 'passed');
assert.ok(Array.isArray(result.verdict.reasonCodes));
assert.equal(result.verdict.reuseEligible, false);
if (envOutput) assert.deepEqual(await readFile(envOutput), before);
await writeFile(inputPath, '{"status":1,"STATUS":2}');
assert.throws(() => runReplayPowerShell('scripts/ci/installer-acceptance.ps1', ['-InputPath', inputPath, '-OutputDirectory', output]),
  /independent-powershell-replay-failed/);
assert.equal((await readEvidenceJson(join(output, 'installer-evaluation.json'))).value.status, 'failed');
evidence.phase = 'missing-readback-input';
diagnostic.child = { stale: true };
assert.throws(() => runReplayPowerShell('scripts/ci/manual-readback.ps1', [], diagnostic), /independent-powershell-replay-failed/);
assert.equal(diagnostic.child.exitCode, 1);
assert.equal(diagnostic.child.detail.code, 'missing-readback-input');
assert.equal(diagnostic.child.stale, undefined);
// Run the actual verifier: a nonexistent support directory must fail safely.
evidence.phase = 'missing-support';
assert.throws(() => runReplayPowerShell('scripts/ci/manual-readback.ps1',
  ['-SupportRoot', join(output, 'PRIVATE-missing-support'), '-SummaryRoot', output], diagnostic), /independent-powershell-replay-failed/);
assert.equal(diagnostic.child.exitCode, 1);
// Dynamically compiled functions have no original file location; require the real caller.
assert.ok(diagnostic.child.detail.sites.some(site => site.file === 'windows-thumbnail-check-tests.ps1'
  && Number.isSafeInteger(site.line) && site.line > 0));
assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|[A-Z]:\\/);
if (envOutput) assert.deepEqual(await readFile(envOutput), before);
evidence.phase = 'completed';
if (testMode === 'failure-evidence') throw new Error('expected-evidence-preservation-failure');
evidence.status = 'passed';
console.log('Windows Node-to-PowerShell replay isolation passed; installed product acceptance unverified.');
}
try { await run(); }
finally {
  // runReplayPowerShell already projects only safe enums, numeric exit and allowed sites.
  evidence.child = diagnostic.child?.status === 'failed' ? diagnostic.child : null;
  if (evidencePath) await writeFile(evidencePath, JSON.stringify(evidence) + '\n');
}
