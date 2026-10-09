import assert from 'node:assert/strict';
import { TARGETS, MANIFEST_HASH, validateInputs } from './production-contract.mjs';

export function validateApply(evidence, kind, spec = null) {
  const { from, to, hash } = versions(spec, kind);
  assert.equal(evidence.kind, kind);
  assert.equal(evidence.phase, 'apply');
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.startup.trigger, 'startup');
  assert.equal(evidence.startup.currentVersion, from);
  assert.equal(evidence.startup.availableVersion, to);
  assert.equal(evidence.manual.trigger, 'manual');
  assert.equal(evidence.manual.status, 'available');
  assert.equal(evidence.manual.currentVersion, from);
  assert.equal(evidence.manual.availableVersion, to);
  assert.equal(evidence.manual.target.target, TARGETS[kind]);
  assert.equal(evidence.manual.target.artifactKind, kind);
  assert.equal(evidence.manual.failure, null);
  assert.equal(evidence.dirty.blocker, 'dirtyDocuments');
  assert.equal(evidence.dirty.status, 'available');
  assert.equal(evidence.consent, 'download-and-install-ui');
  assert.equal(evidence.manifestVerified, true);
  assert.equal(evidence.manifestSha256, hash);
  if (kind === 'appimage') {
    assert.equal(evidence.installed.status, 'restartRequired');
    assert.equal(evidence.restartRequested, true);
    assert.equal(evidence.restart.observed, true);
    assert.ok(Number.isSafeInteger(evidence.restart.previous.pid) && evidence.restart.previous.pid > 0);
    assert.ok(Number.isSafeInteger(evidence.restart.current.pid) && evidence.restart.current.pid > 0);
    assert.notEqual(evidence.restart.previous.pid, evidence.restart.current.pid);
    assert.notEqual(evidence.restart.previous.executable, evidence.restart.current.executable);
  } else validateWindowsHandoff(evidence);
}

function validateWindowsHandoff(evidence) {
  assert.equal(evidence.installObserved, true);
  assert.equal(evidence.requiresInstalledVersionVerification, true);
  assert.ok(typeof evidence.transportClosed === 'string' && evidence.transportClosed.trim(), 'driver closure evidence');
  const handoff = evidence.windowsHandoff;
  assert.ok(handoff, 'Windows handoff receipt');
  assert.equal(handoff.status, 'transportClosed', 'installing alone is not installer handoff');
  assert.ok(['install-click', 'state-poll'].includes(handoff.closureSource));
  for (const field of ['startedAt', 'closedAt']) {
    assert.ok(typeof handoff[field] === 'string' && Number.isFinite(Date.parse(handoff[field])), `${field} timestamp`);
  }
  assert.ok(Date.parse(handoff.closedAt) >= Date.parse(handoff.startedAt), 'closure follows observation start');
  assert.ok(Array.isArray(handoff.transitions));
  if (handoff.lastSnapshot) {
    assert.ok(['available', 'downloading', 'installing'].includes(handoff.lastSnapshot.status));
    assert.deepEqual(handoff.lastSnapshot, evidence.installed, 'last observed updater snapshot');
  }
}

export function validateVerify(evidence, kind, spec = null) {
  const { to, hash } = versions(spec, kind);
  assert.equal(evidence.kind, kind);
  assert.equal(evidence.phase, 'verify');
  assert.equal(evidence.manifestVerified, true);
  assert.equal(evidence.manifestSha256, hash);
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.noUpdate.status, 'idle');
  assert.equal(evidence.noUpdate.currentVersion, to);
  assert.equal(evidence.noUpdate.availableVersion, null);
  assert.equal(evidence.noUpdate.failure, null);
  assert.equal(evidence.noUpdate.blocker, null);
  assert.equal(evidence.productVersion, `Alhangeul ${to}`);
  assert.equal(evidence.settingsPreserved, true);
  assert.equal(evidence.documents.length, 2);
  assert.deepEqual(evidence.documents.map(d => d.format).sort(), ['hwp', 'hwpx']);
  assert.ok(evidence.documents.every(d => d.unchanged && d.pageCount > 0 && d.canvasReady));
}

export function validateWindowsInstallation(evidence, kind, spec = null) {
  const { to } = versions(spec, kind);
  assert.equal(evidence.Status, 'passed');
  assert.equal(evidence.Kind, kind);
  assert.equal(evidence.DefaultsPreserved, true);
  assert.equal(evidence.Product.Entry.DisplayVersion, to);
  // Validate both installer metadata and the real executable's version resource.
  const version = evidence.Product.Version;
  assert.ok(version, 'executable version evidence');
  for (const field of ['ProductVersion', 'FileVersion']) assert.ok([to, `${to}.0`].includes(version[field]), 'executable version resource');
  assert.equal(evidence.Product.Handlers.length, 2, 'both document handlers');
  assert.deepEqual(evidence.Product.Handlers.map(h => h.Extension).sort(), ['.hwp', '.hwpx']);
  assert.ok(evidence.Product.Handlers.every(h => h.Valid));
  assert.notEqual(evidence.ExitCode, 3010, 'post-reboot remains unverified');
}

function versions(spec, kind) {
  if (spec === null) return { from: '0.1.0', to: '0.1.1', hash: MANIFEST_HASH };
  validateInputs(spec, kind);
  return { from: spec.releases.n.version, to: spec.releases.next.version, hash: spec.manifestSha256 };
}
