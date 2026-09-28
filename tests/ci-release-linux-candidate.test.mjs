import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_SHA, assertCandidateIdentity } from '../scripts/ci/release-file-candidate.mjs';
import { LINUX_CANDIDATES, PRODUCER_RUN, selectLinuxInstaller } from '../scripts/ci/release-linux-candidate.mjs';

for (const [kind, candidate] of Object.entries(LINUX_CANDIDATES)) {
  test(`${kind}: ordinary release identity cannot be replaced by another run/archive`, () => {
    const handoff = { buildRef: PRODUCT_SHA, nativeRunId: PRODUCER_RUN,
      artifactId: candidate.id, artifactDigest: candidate.digest, artifactName: candidate.name };
    assert.doesNotThrow(() => assertCandidateIdentity(candidate, handoff, PRODUCER_RUN));
    for (const key of Object.keys(handoff)) {
      assert.throws(() => assertCandidateIdentity(candidate, { ...handoff, [key]: 'other' }, PRODUCER_RUN), key);
    }
  });
  test(`${kind}: installer selection rejects source/platform/path/hash/cardinality mismatches`, () => {
    const file = { kind: candidate.kind, path: candidate.path, sha256: candidate.sha256 };
    const inventory = { sourceSha: PRODUCT_SHA, platform: candidate.platform, files: [file] };
    assert.equal(selectLinuxInstaller(candidate, inventory), file);
    for (const key of ['sourceSha', 'platform']) {
      assert.throws(() => selectLinuxInstaller(candidate, { ...inventory, [key]: 'other' }));
    }
    for (const key of ['kind', 'path', 'sha256']) {
      assert.throws(() => selectLinuxInstaller(candidate, { ...inventory, files: [{ ...file, [key]: 'other' }] }));
    }
    assert.throws(() => selectLinuxInstaller(candidate, { ...inventory, files: [] }));
    assert.throws(() => selectLinuxInstaller(candidate, { ...inventory, files: [file, file] }));
  });
}

test('Linux release acceptance keeps package dependency resolution and strict GUI gates', async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const workflow = await read('.github/workflows/alhangeul-release-linux-files.yml');
  const rpm = await read('scripts/ci/accept-release-fedora.sh');
  const arm = await read('scripts/ci/accept-release-arm64.sh');
  const gui = await read('scripts/ci/run-release-file-gui.sh');
  assert.match(workflow, /os: ubuntu-24\.04-arm/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /FEDORA_IMAGE: quay\.io\/fedora\/fedora@sha256:[a-f0-9]{64}/);
  assert.doesNotMatch(workflow, /secrets\.|: write|continue-on-error|build:desktop|build:studio|tauri build|cargo build|gh release|--privileged|docker\.sock/);
  assert.match(workflow, /state\.candidate!=='success'\|\|state\.acceptance!=='success'/);
  assert.match(workflow, /phases\.exitCode!==0\|\|phases\.lastPhase!=='complete'/);
  assert.match(rpm, /dnf install -y "\$INSTALLER_PATH"/);
  assert.match(rpm, /runuser -u acceptance -- env "PATH=\$PATH" bash scripts\/ci\/run-release-file-gui\.sh/);
  assert.match(arm, /sudo apt-get install -y "\$INSTALLER_PATH"/);
  assert.match(arm, /test "\$\(uname -m\)" = aarch64/);
  assert.match(gui, /test "\$\(id -u\)" -ne 0/);
  assert.doesNotMatch(rpm + arm, /--nodeps|--skip-broken|--ignorearch|\|\| true/);
});
