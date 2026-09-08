import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { executableNames } from '../scripts/build-windows-thumbnail-support.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const files = ['experiment', 'registry', 'files', 'phase', 'process', 'evidence', 'tests'];
const sources = Object.fromEntries(await Promise.all(files.map(async (name) => [name, await read(`scripts/windows-thumbnail-context-${name}.ps1`)])));
const native = await read('scripts/windows-thumbnail-context.cs');
const workflow = await read('.github/workflows/alhangeul-desktop.yml');
const smokeWorkflow = await read('.github/workflows/alhangeul-windows-smoke.yml');
const job = smokeWorkflow.split('  windows-thumbnail-context:\n')[1].split('  windows-installer-smoke:\n')[0];

test('context experiment is an explicit disposable hosted-only opt-in, never user support', () => {
  for (const required of ['CIConsent', 'github-hosted', 'ALHANGEUL_CONTEXT_EXPERIMENT', 'requires-elevated-ci', 'source-workflow-mismatch']) assert.ok(sources.experiment.includes(required));
  assert.ok(sources.experiment.indexOf('requires-disposable-ci-consent') < sources.experiment.indexOf('CreateDirectory'));
  assert.ok(executableNames.every((name) => !name.includes('context')));
  assert.match(sources.experiment, /productAcceptance = 'not-established'/);
});

test('opt-in job requires Windows artifact tests and prohibits release publishing', () => {
  assert.match(workflow, /thumbnail_context_experiment:\s+description:[^\n]+\s+required: false\s+default: false\s+type: boolean/);
  for (const required of ['inputs.thumbnail_context_experiment', 'replica: [1, 2]', 'timeout-minutes: 30']) assert.ok(job.includes(required));
  for (const guard of ["inputs.artifact_platform == 'windows-x64'", "inputs.validation_profile == 'full'", 'inputs.run_tests', '!inputs.publish_release']) assert.ok(workflow.includes(guard));
  assert.match(job, /artifact-ids: \$\{\{ inputs.artifact_id \}\}/);
  assert.match(job, /digest-mismatch: error/);
  assert.match(job, /GITHUB_WORKFLOW_SHA/);
  assert.match(job, /windows-thumbnail-context-tests.ps1 -CIConsent/);
  assert.match(job, /actions\/upload-artifact@v7/);
  assert.doesNotMatch(job, /continue-on-error|publish_release=true|regsvr32|ExecutionPolicy/);
});

test('registry changes are restricted and journaled before writes', () => {
  assert.match(sources.registry, /Registry64/);
  assert.match(sources.registry, /hive-not-allowed/);
  assert.match(sources.registry, /value-not-allowed/);
  assert.ok(sources.registry.indexOf('$Journal.entries.Add($entry)') < sources.registry.indexOf('$key.SetValue($Name, $Value'));
  assert.match(sources.registry, /GetValueKind/);
  assert.match(sources.registry, /DoNotExpandEnvironmentNames/);
  assert.match(sources.registry, /registry-restore-conflict/);
  assert.match(sources.registry, /DeleteSubKey\(\$record.path, \$false\)/);
  assert.doesNotMatch(sources.registry, /DeleteSubKeyTree|Set-ItemProperty|RegistryHive\]::ClassesRoot/);
});

test('machine registration follows protected payload, not a user-writable DLL', () => {
  const entry = sources.experiment;
  assert.ok(entry.indexOf('Copy-ContextPayload $bundle $protected') < entry.indexOf('Add-ContextMachineClass $machineJournal'));
  assert.match(sources.registry, /Assert-ContextProtectedDirectory/);
  for (const required of ['SetAccessRuleProtection($true, $false)', 'S-1-5-32-544', 'S-1-5-18', 'S-1-5-32-545', 'ReadAndExecute', 'payload-acl-mismatch', 'ReparsePoint']) assert.ok(sources.files.includes(required));
  assert.doesNotMatch(sources.files, /Remove-Item|Delete\(\$Path, \$true\)/);
});

test('experiment follows A-B-A and preserves actual baseline failure and cleanup errors', () => {
  const order = ['c0-initial', 'c1-limited', 'c0-after-context', 'c2-protected-path', 'c3-machine-visible', 'c2-after-machine-restore', 'c0-final'];
  let offset = -1;
  for (const label of order) { const next = sources.experiment.indexOf(`'${label}'`); assert.ok(next > offset); offset = next; }
  assert.match(sources.experiment, /baseline-not-reproduced/);
  assert.match(sources.experiment, /if \(-not \$machineJournal.restored\)/);
  assert.match(sources.experiment, /if \(-not \$pathJournal.restored\)/);
  assert.match(sources.experiment, /association-mutation/);
  assert.match(sources.experiment, /cleanup-failed/);
  assert.match(sources.experiment, /exit 2/);
});

test('same-user linked-token comparison does not synthesize a low integrity token', () => {
  for (const required of ['Number(token, 18) != 2', 'Information(token, 19)', '!context.sameUser', 'context.session != self.SessionId', 'context.elevationType != 3', 'context.integrityRid != 8192', 'CreateProcessWithTokenW(token, 1', 'CloseHandle(token)']) assert.ok(native.includes(required));
  assert.match(sources.process, /normalExplorerObserved/);
  assert.match(sources.process, /context-unavailable/);
  assert.match(sources.process, /launchError/);
  assert.match(sources.process, /if \(-not \$launch.started\)/);
  assert.match(native, /started = true, exitCode = code/);
  assert.doesNotMatch(native, /AdjustTokenPrivileges|SetTokenInformation|CreateRestrictedToken|LogonUser|password/i);
  assert.match(sources.phase, /context-user-session-mismatch/);
  assert.match(sources.phase, /profile-registration-mismatch/);
});

test('public fixtures and independent STA probes preserve order, raw evidence and cleanup', () => {
  assert.ok(sources.phase.indexOf("$fixture 'shell'") < sources.phase.indexOf("$fixture 'force-extract'"));
  assert.ok(sources.phase.indexOf("$fixture 'shell'") < sources.phase.indexOf("'activation' 'activate'"));
  assert.match(sources.phase, /Assert-ContextFile \$copy \$Fixture; Assert-ContextFile \$source \$Fixture/);
  assert.match(sources.phase, /worker-residual/);
  assert.match(sources.evidence, /raw-probe-mismatch/);
  assert.match(sources.evidence, /missing-or-duplicate-probe/);
  assert.match(sources.evidence, /probe-context-mismatch/);
  assert.match(sources.files, /fixture-pin-mismatch/);
});

test('Windows tests include partial writes, later-owner conflict and machine cleanup', () => {
  for (const required of ['powershell-parse-failed', 'partial-restore-mismatch', 'later-value-overwritten', 'machine-restore-missing', 'missing-phase', 'finding-mismatch', 'invalid-process-must-not-succeed']) assert.ok(sources.tests.includes(required));
  assert.match(sources.tests, /exit 0\s*$/);
});

test('negative fixtures model the failing API and clear successful bitmap dimensions', () => {
  const factory = sources.tests.split('function New-ContextTestPhase {')[1].split('function Test-ContextFindingContracts')[0];
  assert.match(factory, /param\(\[switch\]\$FailedDocuments\)/);
  assert.ok(factory.includes("$FailedDocuments -and $label -match '^(small-hwp|large-hwp|form-hwpx)-(shell|force-extract)$'"));
  assert.match(factory, /\$result.status = 'failed'; \$result.hresult = '0x80040154'; \$exitCode = 1/);
  for (const field of ['bitmapPresent', 'width', 'height']) assert.ok(factory.includes(`$result.${field} = $null`));
  assert.ok(factory.includes("$result.phase = if ($mode -eq 'shell') { 'IShellItemImageFactory.GetImage' } else { 'IThumbnailCache.GetThumbnail' }"));
  for (const marker of ['failed-fixture-count', 'invalid-negative-fixture', 'negative-fixture-exit', 'negative-roundtrip-classification', 'success-phase-not-class-not-registered', 'failed-dimension-rejected', 'negative-fixture-restored']) assert.ok(sources.tests.includes(marker));
  assert.match(sources.tests, /foreach \(\$failedDocuments in @\(\$true, \$false\)\)/);
  assert.match(sources.tests, /Assert-ContextPhaseEvidence \$roundTrip \$root/);
  assert.match(sources.tests, /if \(\$failedDocuments\) \{\s+foreach \(\$label in \(Get-ContextExpectedLabels\)\)/);
  assert.match(sources.files, /\[IO.FileMode\]::CreateNew/);
});

test('fast raw-evidence tests load their pure equality dependency without registry entry points', async () => {
  const fast = await read('tests/windows-thumbnail-fast.test.ps1');
  assert.match(fast, /'windows-thumbnail-context-registry.ps1' = @\('Test-ContextEqual'\)/);
  assert.match(fast, /\$loaded.Count -ne \$allowed.Count/);
  assert.match(fast, /\$node.Name -in \$allowed/);
  assert.doesNotMatch(fast, /\. \(Join-Path[^\n]*context-registry|Open-ContextHive|Get-ContextClass|Set-ContextValue|New-ContextJournal|CIConsent/);
  assert.match(sources.registry, /function Test-ContextEqual\(\$Left, \$Right\) \{\s+return \(ConvertTo-Json/);
});

test('context code does not change security policy or kill unrelated Shell processes', () => {
  const all = Object.values(sources).join('\n');
  assert.doesNotMatch(all, /DisableProcessIsolation\s*=|Set-ExecutionPolicy|ExecutionPolicy Bypass|Stop-Process|taskkill|New-LocalUser|Set-LocalUser|regsvr32/i);
  assert.doesNotMatch(all, /Write-(?:Host|Output).*Exception\.Message/);
  for (const [name, source] of Object.entries(sources)) assert.ok(source.split('\n').length <= 300, `${name} exceeds file size guideline`);
  assert.ok(native.split('\n').length <= 300);
});
