import assert from 'node:assert/strict';
import { TARGETS, MANIFEST_HASH } from './production-contract.mjs';

export function validateApply(evidence, kind) {
  assert.equal(evidence.kind, kind);
  assert.equal(evidence.phase, 'apply');
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.startup.trigger, 'startup');
  assert.equal(evidence.startup.currentVersion, '0.1.0');
  assert.equal(evidence.startup.availableVersion, '0.1.1');
  assert.equal(evidence.manual.trigger, 'manual');
  assert.equal(evidence.manual.status, 'available');
  assert.equal(evidence.manual.currentVersion, '0.1.0');
  assert.equal(evidence.manual.availableVersion, '0.1.1');
  assert.equal(evidence.manual.target.target, TARGETS[kind]);
  assert.equal(evidence.manual.target.artifactKind, kind);
  assert.equal(evidence.manual.failure, null);
  assert.equal(evidence.dirty.blocker, 'dirtyDocuments');
  assert.equal(evidence.dirty.status, 'available');
  assert.equal(evidence.consent, 'download-and-install-ui');
  assert.equal(evidence.manifestVerified, true);
  assert.equal(evidence.manifestSha256, MANIFEST_HASH);
  if (kind === 'appimage') {
    assert.equal(evidence.installed.status, 'restartRequired');
    assert.equal(evidence.restartRequested, true);
    assert.equal(evidence.restart.observed, true);
    assert.ok(Number.isSafeInteger(evidence.restart.previous.pid) && evidence.restart.previous.pid > 0);
    assert.ok(Number.isSafeInteger(evidence.restart.current.pid) && evidence.restart.current.pid > 0);
    assert.notEqual(evidence.restart.previous.pid, evidence.restart.current.pid);
    assert.notEqual(evidence.restart.previous.executable, evidence.restart.current.executable);
  } else assert.equal(evidence.installObserved, true);
}

export function validateVerify(evidence, kind) {
  assert.equal(evidence.kind, kind);
  assert.equal(evidence.phase, 'verify');
  assert.equal(evidence.manifestVerified, true);
  assert.equal(evidence.manifestSha256, MANIFEST_HASH);
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.noUpdate.status, 'idle');
  assert.equal(evidence.noUpdate.currentVersion, '0.1.1');
  assert.equal(evidence.noUpdate.availableVersion, null);
  assert.equal(evidence.noUpdate.failure, null);
  assert.equal(evidence.noUpdate.blocker, null);
  assert.equal(evidence.productVersion, 'Alhangeul 0.1.1');
  assert.equal(evidence.settingsPreserved, true);
  assert.equal(evidence.documents.length, 2);
  assert.deepEqual(evidence.documents.map(d => d.format).sort(), ['hwp', 'hwpx']);
  assert.ok(evidence.documents.every(d => d.unchanged && d.pageCount > 0 && d.canvasReady));
}

export function validateWindowsInstallation(evidence, kind) {
  assert.equal(evidence.Status, 'passed');
  assert.equal(evidence.Kind, kind);
  assert.equal(evidence.DefaultsPreserved, true);
  assert.equal(evidence.Product.Entry.DisplayVersion, '0.1.1');
  // Validate both installer metadata and the real executable's version resource.
  const version = evidence.Product.Version;
  assert.ok(version, 'executable version evidence');
  for (const field of ['ProductVersion', 'FileVersion']) assert.match(version[field], /^0\.1\.1(?:\.0)?$/, 'executable version resource');
  assert.equal(evidence.Product.Handlers.length, 2, 'both document handlers');
  assert.deepEqual(evidence.Product.Handlers.map(h => h.Extension).sort(), ['.hwp', '.hwpx']);
  assert.ok(evidence.Product.Handlers.every(h => h.Valid));
  assert.notEqual(evidence.ExitCode, 3010, 'post-reboot remains unverified');
}
