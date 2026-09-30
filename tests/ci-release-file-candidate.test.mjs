import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CANDIDATES, PRODUCT_SHA, PRODUCER_RUN, assertCandidateIdentity,
  assertCandidateFile } from '../scripts/ci/release-file-candidate.mjs';

for (const [kind, candidate] of Object.entries(CANDIDATES)) {
  const handoff = { buildRef: PRODUCT_SHA, nativeRunId: PRODUCER_RUN,
    artifactId: candidate.id, artifactDigest: candidate.digest, artifactName: candidate.name };
  test(`${kind}: requires approved source/run/archive identity`, () => {
    assert.doesNotThrow(() => assertCandidateIdentity(candidate, handoff));
    for (const key of Object.keys(handoff)) {
      assert.throws(() => assertCandidateIdentity(candidate, { ...handoff, [key]: 'different' }), key);
    }
  });
  test(`${kind}: rejects re-signed or missing replacement installer`, () => {
    const target = { sha256: candidate.sha256 };
    assert.equal(assertCandidateFile(candidate, { targets: { [candidate.target]: target } }), target);
    assert.throws(() => assertCandidateFile(candidate, { targets: {} }));
    assert.throws(() => assertCandidateFile(candidate, { targets: { [candidate.target]: { sha256: '0'.repeat(64) } } }));
  });
}

test('final file acceptance cannot rebuild, publish or mask failed GUI/install steps', async () => {
  const workflow = await readFile(new URL('../.github/workflows/alhangeul-release-files.yml', import.meta.url), 'utf8');
  assert.match(workflow, /on:\n  workflow_call:/);
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  assert.doesNotMatch(workflow, /secrets\.|: write|continue-on-error|build:desktop|build:studio|tauri build|cargo build|gh release/);
  assert.match(workflow, /test -c \/dev\/fuse/);
  assert.doesNotMatch(workflow, /appimage-extract|APPIMAGE_EXTRACT_AND_RUN/);
  assert.match(workflow, /\['CANDIDATE','INSTALL','PREPARE_APP','WINDOWS_GUI','CLEANUP','WEBVIEW_POLICY_SETUP','WEBVIEW_POLICY_RESTORE'\]/);
  assert.match(workflow, /\['CANDIDATE','PREPARE_APP','LINUX_GUI'\]/);
  assert.match(workflow, /process\.env\.UPLOAD!=='success'\|\|required\.some\(k=>state\[k\]!=='success'\)/);
  const dispatcher = await readFile(new URL('../.github/workflows/alhangeul-desktop.yml', import.meta.url), 'utf8');
  assert.match(dispatcher, /inputs\.mode == 'release-file-acceptance' \|\| inputs\.mode == 'production-updater-check'/);
  assert.match(dispatcher, /windows_only: \$\{\{ inputs\.artifact_platform == 'windows-x64' \}\}/);
  assert.match(workflow, /inputs\.windows_only && '\[\{"kind":"msi","os":"windows-2025"\}\]'/);
  assert.match(workflow, /id: webview-policy[\s\S]*?-Phase Setup -OutputDirectory \$env:ALHANGEUL_GUI_OUTPUT_DIR/);
  assert.match(workflow, /id: restore-webview-policy\n        if: always\(\) && runner\.os == 'Windows'[\s\S]*?-Phase Cleanup -OutputDirectory \$env:ALHANGEUL_GUI_OUTPUT_DIR/);
});
