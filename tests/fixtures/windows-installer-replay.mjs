import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runReplayPowerShell } from '../../scripts/ci/installer-replay.mjs';
import { readEvidenceJson } from '../../scripts/ci/acceptance-json.mjs';

const [inputPath, output] = process.argv.slice(2);
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
console.log('Windows Node-to-PowerShell replay isolation passed; installed product acceptance unverified.');
