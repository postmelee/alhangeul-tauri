import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { replayFailureDiagnostic } from '../scripts/ci/replay-diagnostic.mjs';

const record = () => ({ schemaVersion: 1, status: 'failed', code: 'package-invalid',
  sites: [{ file: 'windows-thumbnail-check.ps1', line: 35 }] });
const error = value => ({ status: 1, stdout: Buffer.from(`ALHANGEUL_READBACK_DIAGNOSTIC=${JSON.stringify(value)}\r\n`),
  stderr: 'PRIVATE-PATH', message: 'PRIVATE-TOKEN' });
test('child diagnostic preserves only fixed code, exit and repository locations', () => {
  const value = record(); value.private = 'PRIVATE'; value.sites[0].path = 'PRIVATE';
  const result = replayFailureDiagnostic(error(value));
  assert.deepEqual(result, { status: 'failed', code: 'child-process-failed', exitCode: 1,
    detail: { code: 'package-invalid', sites: [{ file: 'windows-thumbnail-check.ps1', line: 35 }] } });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});
for (const [name, mutate] of [
  ['unknown code', v => { v.code = 'PRIVATE'; }], ['absolute path', v => { v.sites[0].file = 'C:\\PRIVATE\\file.ps1'; }],
  ['unknown source', v => { v.sites[0].file = 'secret.ps1'; }], ['line type', v => { v.sites[0].line = '35'; }],
  ['excessive frames', v => { v.sites = Array(9).fill(v.sites[0]); }], ['false success', v => { v.status = 'passed'; }],
]) test(`child diagnostic rejects ${name}`, () => {
  const value = record(); mutate(value);
  assert.equal(replayFailureDiagnostic(error(value)).detail, undefined);
});
test('malformed, duplicate and excessive stdout never become a diagnostic', () => {
  for (const stdout of ['ALHANGEUL_READBACK_DIAGNOSTIC={', 'x'.repeat(65537),
    error(record()).stdout.toString().repeat(2)]) {
    assert.equal(replayFailureDiagnostic({ status: 1, stdout }).detail, undefined);
  }
});
test('timeout, output limit and unknown startup errors remain failures without raw text', () => {
  for (const [code, expected] of [['ETIMEDOUT', 'child-timeout'], ['ENOBUFS', 'child-output-limit'], ['PRIVATE', 'child-start-or-signal-failed']]) {
    const result = replayFailureDiagnostic({ code, message: 'PRIVATE', stderr: 'PRIVATE' });
    assert.equal(result.code, expected); assert.equal(result.exitCode, null);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
  }
});
test('manual wrapper retains existing verifier and nonzero failure without logging exceptions', async () => {
  const source = await readFile(new URL('../scripts/ci/manual-readback.ps1', import.meta.url), 'utf8');
  assert.match(source, /windows-thumbnail-check-tests.ps1/);
  assert.match(source, /-SupportRoot \$SupportRoot -SummaryRoot \$SummaryRoot/);
  assert.match(source, /\$LASTEXITCODE -ne 0/);
  assert.match(source, /exit 1/);
  assert.doesNotMatch(source, /Write-(?:Output|Error).*Exception|Restart-Computer|Start-Process/);
});
