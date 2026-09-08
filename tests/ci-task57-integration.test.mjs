import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workflow = name => read(`.github/workflows/${name}.yml`);
const smoke = workflow('alhangeul-windows-smoke');
const reuse = workflow('alhangeul-installer-reuse');
const artifacts = workflow('alhangeul-artifacts');
const platform = workflow('alhangeul-artifact-platform');

test('#57 clean installer matrices survive both fresh and exact reuse paths', () => {
  for (const source of [smoke, reuse]) {
    assert.match(source, /fail-fast: false/);
    for (const [name, installer, scenario] of [
      ['nsis', 'nsis', 'lifecycle'], ['msi', 'msi', 'lifecycle'],
      ['msi-forced-reinstall', 'msi', 'forced-reinstall'],
    ]) assert.ok(source.includes(`- name: ${name}\n            installer: ${installer}\n            scenario: ${scenario}`));
    assert.match(source, /-InstallerKind \$env:INSTALLER_KIND/);
    assert.match(source, /-Scenario \$env:INSTALLER_SCENARIO/);
    assert.match(source, /digest-mismatch: error/);
    assert.match(source, /id: diagnostic-contract/);
    assert.match(source, /id: manual-evidence/);
    assert.doesNotMatch(source, /-InstallerKind ['"]?all|cargo |tauri build/);
  }
  assert.match(smoke, /name: alhangeul-desktop-windows-x64-\$\{\{ matrix.artifact \}\}/);
  assert.match(reuse, /name: alhangeul-installer-reuse-evidence-\$\{\{ matrix.name \}\}/);
});

test('Desktop remains an entry; support generation and exact IDs stay in reusable owners', () => {
  const desktop = workflow('alhangeul-desktop');
  assert.doesNotMatch(desktop, /^  (?:build|windows-installer-smoke|windows-thumbnail-context):/m);
  assert.match(desktop, /uses: .\/\.github\/workflows\/alhangeul-artifacts.yml/);
  assert.ok(platform.indexOf('name: Verify bundle artifact') < platform.indexOf('name: Build Windows thumbnail support package'));
  assert.match(platform, /support_artifact_id:.*\n\s+value: \$\{\{ jobs.build.outputs.support_artifact_id \}\}/);
  assert.match(platform, /support_artifact_id: \$\{\{ steps.support-upload.outputs.artifact-id \}\}/);
  assert.match(artifacts, /support_artifact_id: \$\{\{ needs.windows.outputs.support_artifact_id \}\}/);
  assert.match(smoke, /artifact-ids: \$\{\{ inputs.support_artifact_id \}\}/);
  assert.match(artifacts, /needs: \[plan, windows\]/);
  assert.match(artifacts, /needs: \[plan, fast, core, windows, linux, smoke\]/);
});

test('reuse records separate harness/product identity and validates current support without rebuilding', () => {
  assert.ok(reuse.indexOf('id: inventory') < reuse.indexOf('id: support'));
  assert.ok(reuse.indexOf('id: support') < reuse.indexOf('id: smoke\n'));
  assert.match(reuse, /--source-sha "\$PRODUCT_SHA"/);
  assert.match(reuse, /--product-version "\$PRODUCT_VERSION"/);
  assert.match(reuse, /PRODUCT_VERSION: \$\{\{ steps.handoff.outputs.product_version \}\}/);
  assert.match(reuse, /workflowSha = \$env:HARNESS_SHA/);
  assert.match(reuse, /productSha = \$env:PRODUCT_SHA/);
  assert.match(reuse, /-SummaryRoot 'diagnostics\\installer-reuse\\smoke'/);
  const evidence = read('scripts/ci/installer-evidence.mjs');
  for (const step of ['support', 'manual-tests', 'smoke-context', 'diagnostic-contract', 'manual-evidence']) assert.ok(evidence.includes(`'${step}'`));
  assert.match(evidence, /newProductAcceptance: 'unverified'/);
  const builder = read('scripts/build-windows-thumbnail-support.mjs');
  assert.match(builder, /createManifest\(sourceSha, productVersion \?\? version, files\)/);
  assert.doesNotMatch(builder, /inventory\.sourceSha\s*=/);
});

test('fast runs only pure context tests; native intervention remains a separate opt-in', () => {
  const fast = read('tests/windows-thumbnail-fast.test.ps1');
  assert.match(fast, /Invoke-CiPowerShellTest.*windows-thumbnail-assessment-tests.ps1/);
  assert.match(fast, /FunctionDefinitionAst/);
  assert.match(fast, /\$node.Name -in \$allowed/);
  assert.match(fast, /Test-ContextFindingContracts\nTest-ContextRawEvidence/);
  assert.doesNotMatch(fast, /Test-ContextProtectedTransactions|Test-ContextRegistryTransactions|Add-Type|CIConsent|LimitedContext/);
  assert.match(workflow('ci'), /thumbnail_context_experiment:\n\s+description:[^\n]+\n\s+type: boolean\n\s+default: false/);
  assert.match(smoke, /if: \$\{\{ inputs.thumbnail_context_experiment \}\}/);
  assert.match(smoke, /replica: \[1, 2\]/);
});
