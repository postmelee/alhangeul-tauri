import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidate, validateIdentity, loadCandidate } from '../scripts/ci/release-candidate-input.mjs';
import { CANDIDATES, PRODUCT_SHA, PRODUCER_RUN, assertCandidateIdentity,
  assertCandidateFile } from '../scripts/ci/release-file-candidate.mjs';
import { LINUX_CANDIDATES, selectLinuxInstaller } from '../scripts/ci/release-linux-candidate.mjs';
import { readFile } from 'node:fs/promises';

const sourceSha = 'a'.repeat(40);
function document(kind) {
  const signed = Object.hasOwn(CANDIDATES, kind);
  const candidate = { ...(signed ? CANDIDATES : LINUX_CANDIDATES)[kind],
    producerRun: 12345, workflowPath: signed ? '.github/workflows/alhangeul-desktop.yml' : '.github/workflows/ci.yml',
    path: `${kind}/Alhangeul-0.1.1.${kind === 'arm64' ? 'deb' : kind}` };
  return { schemaVersion: 1, sourceSha, version: '0.1.1', tag: 'v0.1.1', candidates: { [kind]: candidate } };
}

for (const kind of ['nsis', 'msi', 'appimage', 'rpm', 'arm64']) {
  test(`${kind}: selected new release keeps source, producer and exact file binding`, () => {
    const selected = validateCandidate(document(kind), kind);
    const candidate = selected.candidate;
    const handoff = { buildRef: sourceSha, nativeRunId: 12345, artifactId: candidate.id,
      artifactName: candidate.name, artifactDigest: candidate.digest };
    assert.doesNotThrow(() => assertCandidateIdentity(candidate, handoff, selected.producerRun, selected.productSha));
    assert.throws(() => assertCandidateIdentity(candidate, handoff), 'new input cannot silently become baseline');
    const file = { path: candidate.path, sha256: candidate.sha256, kind: candidate.kind };
    const select = file => candidate.target
      ? assertCandidateFile(candidate, { targets: { [candidate.target]: file } })
      : selectLinuxInstaller(candidate, { sourceSha, platform: candidate.platform, files: [file] }, sourceSha);
    assert.equal(select(file), file);
    assert.throws(() => select({ ...file, path: 'replacement' }));
    assert.throws(() => select({ ...file, sha256: '0'.repeat(64) }));
  });
  test(`${kind}: invalid and missing new release identity fails closed`, () => {
    for (const [field, values] of Object.entries({ schemaVersion: [0, null], sourceSha: ['branch', 'A'.repeat(40)],
      version: ['0.1.1-rc.1', '01.1.1', '0.1.1\ninjected'], tag: ['v0.1.0', null] })) {
      for (const value of values) assert.throws(() => validateCandidate({ ...document(kind), [field]: value }, kind), field);
    }
    for (const [field, values] of Object.entries({ producerRun: [0, '12345', 1.5], id: [0, '1'],
      digest: ['a'.repeat(64), 'sha256:' + 'g'.repeat(64)], sha256: ['g'.repeat(64), undefined],
      name: ['other'], workflowPath: ['.github/workflows/failed.yml'],
      path: ['../outside', '/absolute', 'C:/package', 'dir\\package', 'file\ninjected', 'a/../b', ''] })) {
      for (const value of values) {
        const input = document(kind); input.candidates[kind][field] = value;
        assert.throws(() => validateCandidate(input, kind), field);
      }
    }
    const input = document(kind);
    if (input.candidates[kind].target) input.candidates[kind].targets = [];
    else input.candidates[kind].platform = 'windows-x64';
    assert.throws(() => validateCandidate(input, kind));
    assert.throws(() => validateCandidate({ ...document(kind), candidates: {} }, kind));
  });
}

test('empty input preserves immutable v0.1.0 performance baseline', async () => {
  const fallback = { productSha: PRODUCT_SHA, producerRun: PRODUCER_RUN, candidate: CANDIDATES.msi };
  assert.equal(await loadCandidate('msi', fallback, ''), fallback);
  assert.equal(PRODUCT_SHA, 'fc3cad15682f35723ab6558d1301e9096f7eec67');
  assert.equal(PRODUCER_RUN, 36320371932);
  await assert.rejects(loadCandidate('msi', fallback, '../outside.json'));
  await assert.rejects(loadCandidate('msi', fallback, '/tmp/candidate.json'));
  await assert.rejects(loadCandidate('msi', fallback, 'C:outside.json'), /safe package path/);
  await assert.rejects(loadCandidate('msi', fallback, 'file\\ninjected.json'), /safe package path/);
});

test('VM identity parser rejects shell/newline values and requires a package hash', () => {
  const identity = { sourceSha, version: '0.1.1', producerRun: 12345, sha256: 'b'.repeat(64) };
  assert.equal(validateIdentity(identity), identity);
  for (const field of Object.keys(identity)) assert.throws(() => validateIdentity({ ...identity, [field]: '$(command)\ninjected' }));
  assert.throws(() => validateIdentity({ ...identity, sha256: undefined }));
});

test('new exact candidates reach every acceptance workflow without production activation', async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const dispatcher = await read('.github/workflows/alhangeul-desktop.yml');
  assert.equal((dispatcher.match(/candidate_path: \$\{\{ inputs\.release_candidate_path \}\}/g) ?? []).length, 3);
  const files = await read('.github/workflows/alhangeul-release-files.yml');
  assert.match(files, /inputs\.candidate_path != '' && inputs\.windows_only && '\[\{"kind":"nsis".*"kind":"msi"/);
  assert.match(files, /fromJSON\(!inputs\.production_check && inputs\.candidate_path/);
  assert.match(files, /ALHANGEUL_GUI_PRODUCTION_CHECK: \$\{\{ inputs\.production_check \}\}/);
  assert.match(files, /-ExpectedVersion \$env:ALHANGEUL_GUI_APP_VERSION/);
  const linux = await read('.github/workflows/alhangeul-release-linux-files.yml');
  assert.match(linux, /inputs\.arm64_only && '\[\{"kind":"arm64","os":"ubuntu-24\.04-arm"\}\]'/);
  const host = await read('scripts/ci/release-fedora-vm.sh');
  assert.match(host, /cp candidate-evidence\/identity.json/);
  assert.match(host, /sha256sum --check candidate.sha256/);
  for (const path of ['scripts/ci/release-fedora-vm-guest.sh', 'scripts/ci/release-fedora-vm-session.sh']) {
    const script = await read(path);
    assert.match(script, /read -r ALHANGEUL_GUI_BUILD_REF ALHANGEUL_GUI_NATIVE_RUN_ID ALHANGEUL_GUI_APP_VERSION candidate_sha/);
    assert.match(script, /release-candidate-input.mjs identity.json/);
    assert.doesNotMatch(script, /eval |source identity/);
  }
});
