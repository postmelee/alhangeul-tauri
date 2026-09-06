import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { artifactPlan, selectValidation, evaluateArtifactResults, PLATFORMS } from '../scripts/ci/profiles.mjs';

test('platform catalog contains only supported runner and native target combinations', () => {
  assert.deepEqual(PLATFORMS, [
    { name: 'windows-x64', os: 'windows-2025', target: 'x86_64-pc-windows-msvc', bundle_args: '' },
    { name: 'linux-x64', os: 'ubuntu-22.04', target: 'x86_64-unknown-linux-gnu', bundle_args: '' },
    { name: 'linux-arm64', os: 'ubuntu-22.04-arm', target: 'aarch64-unknown-linux-gnu', bundle_args: '--bundles deb' },
  ]);
});
for (const [paths, profile] of [
  [['docs/DEVELOPMENT.md'], 'fast'], [['mydocs/plans/task_m010_59.md', 'AGENTS.md'], 'fast'],
  [['tests/windows-packaging.test.mjs'], 'fast'],
  [['scripts/windows-installer-smoke.ps1'], 'installer'],
  [['scripts/windows-build-new-package.ps1'], 'full'],
  [['scripts/updater/windows-native-acceptance.ps1'], 'full'],
  [['scripts/windows-thumbnail-smoke.ps1', 'apps/linux-thumbnailer/Cargo.toml'], 'full'],
  [['tests/example.test.ps1'], 'installer'],
  [['apps/thumbnail-handler/src/lib.rs', 'docs/DEVELOPMENT.md'], 'windows-package'],
  [['apps/linux-thumbnailer/src/main.rs'], 'linux-package'],
  [['apps/desktop/src-tauri/linux/alhangeul.thumbnailer'], 'linux-package'],
  [['apps/thumbnail-worker/Cargo.lock', 'apps/linux-thumbnailer/Cargo.lock'], 'full'],
  [['crates/document-preview/src/lib.rs'], 'full'],
  [['apps/studio-host/src/main.ts'], 'full'],
  [['third_party/rhwp'], 'full'], [['pnpm-lock.yaml'], 'full'],
  [['.github/workflows/ci.yml'], 'full'], [['scripts/ci/profiles.mjs'], 'full'],
  [['tests/ci-profiles.test.mjs'], 'full'], [['unknown'], 'full'],
  [[], 'full'], [null, 'full'], [['../windows'], 'full'], [['bad\npath'], 'full'],
]) test(`selector maps ${JSON.stringify(paths)} to ${profile}`, () => assert.equal(selectValidation(paths).profile, profile));

test('scope reductions never claim complete artifact acceptance', () => {
  const full = artifactPlan({});
  assert.equal(full.complete, true);
  assert.equal(full.coreMatrix.include.length, 3);
  assert.equal(full.windowsMatrix.include.length, 1);
  assert.equal(full.linuxMatrix.include.length, 2);
  for (const options of [{ platform: 'windows-x64' }, { platform: 'linux' }, { profile: 'product' }, { profile: 'core' }, { runTests: false }]) {
    assert.equal(artifactPlan(options).complete, false);
  }
  assert.equal(artifactPlan({ profile: 'product' }).core, false);
  assert.equal(artifactPlan({ profile: 'product' }).smoke, false);
  assert.equal(artifactPlan({ profile: 'core' }).windows, false);
  for (const options of [{ platform: 'invalid' }, { profile: 'invalid' }, { runTests: 'false' }]) assert.throws(() => artifactPlan(options));
});
test('every selected gate must actually succeed, including diagnostics/core/smoke', () => {
  const plan = artifactPlan({});
  const names = ['plan', 'fast', 'core', 'windows', 'linux', 'smoke'];
  const passed = Object.fromEntries(names.map((name) => [name, { result: 'success' }]));
  assert.equal(evaluateArtifactResults(plan, passed).status, 'passed');
  for (const name of names) for (const result of ['skipped', 'cancelled', 'failure', undefined]) {
    assert.equal(evaluateArtifactResults(plan, { ...passed, [name]: { result } }).status, 'failed');
  }
  assert.equal(evaluateArtifactResults(artifactPlan({ platform: 'windows-x64' }), { ...passed, linux: { result: 'skipped' } }).status, 'passed');
});
test('controller preserves exact source, Windows-only dependencies and unconditional gate', () => {
  const source = readFileSync(new URL('../.github/workflows/alhangeul-artifacts.yml', import.meta.url), 'utf8');
  assert.match(source, /needs: \[plan, windows\]/);
  assert.match(source, /needs: \[plan, fast, core, windows, linux, smoke\]\n    if: \$\{\{ always\(\) \}\}/);
  assert.match(source, /ARTIFACT_PLAN: \$\{\{ needs.plan.outputs.plan \}\}/);
  assert.match(source, /JOB_RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
  assert.doesNotMatch(source, /secrets\.|contents: write|publish_release/);
});
