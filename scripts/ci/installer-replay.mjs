import { execFileSync } from 'node:child_process';
import { lstat, readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { readEvidenceJson, evidenceHash } from './acceptance-json.mjs';
import { buildInstallerInput } from './installer-input.mjs';
import { fixedScenario, assertVerdict, requireEvidence } from './acceptance-evidence.mjs';
import { evaluationSummary } from './installer-evaluation.mjs';

export async function checkEvidenceTree(root) {
  const pending = [root];
  let count = 0;
  while (pending.length) {
    const path = pending.pop();
    const stat = await lstat(path);
    requireEvidence(!stat.isSymbolicLink() && ++count <= 512, 'invalid-replay-tree');
    if (stat.isDirectory()) {
      for (const name of await readdir(path)) pending.push(join(path, name));
    } else {
      requireEvidence(stat.isFile(), 'invalid-replay-file');
      if (path.toLowerCase().endsWith('.json')) await readEvidenceJson(path);
    }
  }
}

export function runReplayPowerShell(script, args) {
  requireEvidence(process.platform === 'win32', 'windows-replay-required');
  const executable = join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  try {
    execFileSync(executable, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
      resolve(script), ...args], { timeout: 120_000, stdio: 'pipe', windowsHide: true,
      env: { ...process.env, GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '', GITHUB_TOKEN: '', GH_TOKEN: '' } });
  } catch { throw new Error('independent-powershell-replay-failed'); }
}

export async function replayInstallerScenario(options, services = {}) {
  const { root, metadata, row, inventory, fixtureManifest, replayRoot } = options;
  const diagnostic = options.diagnostic ?? {};
  diagnostic.phase = 'input-readback';
  const selected = fixedScenario(row.name === 'nsis' ? 'nsis' : 'msi', row.name === 'msi-forced-reinstall' ? 'forced-reinstall' : 'lifecycle');
  requireEvidence(selected.name === row.name, 'unexpected-replay-scenario');
  await checkEvidenceTree(root);
  const checkout = (await readFile(join(root, 'checked-out-sha.txt'), 'utf8')).replace(/^\ufeff/, '').trim();
  requireEvidence(checkout === metadata.identity.harnessSha, 'replay-checkout-mismatch');
  const records = { summary: await readEvidenceJson(join(root, 'windows-installer-smoke-summary.json')),
    steps: await readEvidenceJson(join(root, 'step-outcomes.json')),
    process: await readEvidenceJson(join(root, 'smoke-process.json')),
    workflow: await readEvidenceJson(join(root, 'workflow-context.json')), inventory, fixtureManifest };
  const rebuilt = buildInstallerInput(records, metadata, selected);
  const input = await readEvidenceJson(join(root, 'installer-input.json'));
  const binding = await readEvidenceJson(join(root, 'installer-input-binding.json'));
  requireEvidence(input.sha256 === evidenceHash(rebuilt.bytes)
    && isDeepStrictEqual(binding.value, rebuilt.binding), 'replay-input-binding-mismatch');
  const original = (await readEvidenceJson(join(root, 'installer-evaluation.json'))).value;
  evaluationSummary(original);
  requireEvidence(original.status === 'passed' && original.inputSha256 === input.sha256, 'original-evaluation-not-passed');
  const replay = services.runPowerShell ?? runReplayPowerShell;
  diagnostic.phase = 'diagnostic-readback';
  await replay('scripts/windows-thumbnail-assessment-tests.ps1', ['-SummaryPath', join(root, 'windows-installer-smoke-summary.json')]);
  diagnostic.phase = 'manual-readback';
  await replay('scripts/windows-thumbnail-check-tests.ps1', ['-SupportRoot', options.supportRoot, '-SummaryRoot', root]);
  await mkdir(replayRoot, { recursive: true });
  const replayInput = join(replayRoot, 'installer-input.json');
  await writeFile(replayInput, rebuilt.bytes);
  await writeFile(join(replayRoot, 'installer-evaluation.json'), '{"status":"unverified"}\n');
  diagnostic.phase = 'pure-replay';
  await replay('scripts/ci/installer-acceptance.ps1', ['-InputPath', replayInput, '-OutputDirectory', replayRoot]);
  const computed = (await readEvidenceJson(join(replayRoot, 'installer-evaluation.json'))).value;
  requireEvidence(isDeepStrictEqual(computed, original), 'independent-evaluation-mismatch');
  assertVerdict(computed.verdict, selected);
  const hashes = { summary: records.summary.sha256, steps: records.steps.sha256, input: input.sha256 };
  const envelope = { schemaVersion: 1, policyVersion: 1, identity: metadata.identity,
    installerKind: selected.installerKind, scenario: selected.scenario, provenanceStatus: 'io-verified',
    hashes, verdict: original.verdict };
  return { envelope, artifact: { id: row.artifact.id, digest: row.artifact.digest },
    independent: { identity: metadata.identity, scenarioName: selected.name, hashes,
      replayedVerdict: computed.verdict, steps: records.steps.value, smokeExitCode: records.process.value.exitCode,
      acceptanceStep: row.acceptanceStep, uploadStep: row.uploadStep } };
}
