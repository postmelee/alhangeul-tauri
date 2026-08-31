import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { LIFECYCLE } from './linux-thumbnail-package-contract.mjs';
import { MIME_PATH, MIME_SENTINEL, ALIASES, assertMimeInstalled, assertMimeRestored } from './linux-thumbnail-mime-contract.mjs';

const HELPER_PATH = '/usr/lib/alhangeul/alhangeul-thumbnailer';
const REGISTRATION_PATH = '/usr/share/thumbnailers/alhangeul.thumbnailer';

export async function assertLinuxPackageEvidence(platform, files, rootPath) {
  const evidenceFile = files.find((file) => file.kind === 'linux-thumbnail-packages');
  const evidence = JSON.parse(await readFile(resolve(rootPath, evidenceFile.path), 'utf8'));
  const expected = platform === 'linux-x64'
    ? [['deb', 'amd64'], ['rpm', 'x86_64']]
    : [['deb', 'arm64']];
  assertEqual(evidence.schemaVersion, 2, 'schemaVersion');
  assertEqual(evidence.success, true, 'success');
  assertEqual(evidence.platform, platform, 'platform');
  assertPattern(evidence.repositorySha, /^[0-9a-f]{40}$/, 'repositorySha');
  assertPattern(evidence.helperSha256, /^[0-9a-f]{64}$/, 'helperSha256');
  assertPattern(evidence.mimeSha256, /^[0-9a-f]{64}$/, 'mimeSha256');
  assertEqual(evidence.packages?.length, expected.length, 'packages.length');
  for (const [format, architecture] of expected) {
    const value = evidence.packages.find((entry) => entry.format === format);
    if (!value) throw new Error(`Linux thumbnail package evidence에 ${format}이 없습니다.`);
    assertEqual(value.architecture, architecture, `${format}.architecture`);
    assertEqual(value.name, 'alhangeul', `${format}.name`);
    assertPattern(value.archiveSha256, /^[0-9a-f]{64}$/, `${format}.archiveSha256`);
    const archive = files.find((file) => file.kind === format);
    assertEqual(value.path, archive.path, `${format}.path`);
    assertEqual(value.archiveSha256, archive.sha256, `${format}.archiveSha256`);
    assertEqual(value.helper?.path, HELPER_PATH, `${format}.helper.path`);
    assertEqual(value.helper?.mode, '0755', `${format}.helper.mode`);
    assertEqual(value.helper?.sha256, evidence.helperSha256, `${format}.helper.sha256`);
    assertEqual(value.registration?.path, REGISTRATION_PATH, `${format}.registration.path`);
    assertEqual(value.registration?.mode, '0644', `${format}.registration.mode`);
    assertEqual(value.registration?.exec, `${HELPER_PATH} %i %o %s`, `${format}.registration.exec`);
    assertEqual(
      value.registration?.mime,
      'application/x-hwp;application/x-hwpx;',
      `${format}.registration.mime`,
    );
    assertEqual(value.singleOwner, true, `${format}.singleOwner`);
    assertEqual(value.elfArchitecture, platform === 'linux-x64' ? 'x86-64' : 'aarch64', `${format}.elfArchitecture`);
    assertMimeEvidence(value, evidence.mimeSha256);
  }
  for (const invariant of [
    'mimeDefaultsPreserved',
    'thirdPartyThumbnailerPreserved',
    'cacheSentinelPreserved',
    'productFilesRemovedAfterUninstall',
  ]) assertEqual(evidence.invariants?.[invariant], true, `invariants.${invariant}`);
}

function assertMimeEvidence(value, hash) {
  assertEqual(value.mime?.path, MIME_PATH, 'mime.path');
  assertEqual(value.mime?.mode, '0644', 'mime.mode');
  assertEqual(value.mime?.sha256, hash, 'mime.sha256');
  assertPattern(value.registration?.sha256, /^[0-9a-f]{64}$/, 'registration.sha256');
  assert.deepEqual(value.owners, Object.fromEntries([HELPER_PATH, REGISTRATION_PATH, MIME_PATH].map((path) => [path, 'alhangeul'])));
  const dependencies = value.format === 'deb'
    ? ['shared-mime-info', 'libwebkit2gtk-4.1-0', 'libgtk-3-0']
    : ['shared-mime-info', 'libwebkit2gtk-4.1.so.0()(64bit)', 'libgtk-3.so.0()(64bit)'];
  assert.deepEqual(value.archiveContract?.dependencies, dependencies);
  assert.deepEqual(value.archiveContract?.refreshHooks, ['post-install', 'post-remove']);
  assert.deepEqual(value.lifecycle?.map((record) => record.name), LIFECYCLE, 'complete observed lifecycle');
  const baseline = value.lifecycle[0].mime;
  assertSnapshotShape(baseline);
  assertEqual(baseline.xmlSha256, null, 'baseline.xmlSha256');
  for (const record of value.lifecycle) assertTransition(record, baseline, value, hash);
}

function assertSnapshotShape(snapshot) {
  assert.deepEqual(Object.keys(snapshot?.types ?? {}).sort(), ['generic', 'glob', 'magic']);
  for (const type of Object.values(snapshot.types)) assertPattern(type, /^application\/[\w.+-]+$/, 'GIO type');
  assertEqual(snapshot.types.generic, 'application/zip', 'generic ZIP');
  assert.deepEqual(Object.keys(snapshot.aliases).sort(), [...ALIASES].sort());
  assert.deepEqual(Object.keys(snapshot.defaults).sort(), ['application/x-hwp', 'application/x-hwpx', ...ALIASES].sort());
  for (const value of Object.values(snapshot.defaults)) assert.equal(typeof value, 'string');
  assertPattern(snapshot.otherDefinitions?.[MIME_SENTINEL.split('/').at(-1)], /^[0-9a-f]{64}$/, 'third-party MIME sentinel');
}

function assertTransition(record, baseline, value, hash) {
  assert.ok(Number.isInteger(record.exitCode) && record.exitCode >= 0, 'observed command exit');
  assert.ok(Number.isInteger(record.packageState?.exitCode), 'observed package state exit');
  assert.equal(typeof record.packageState?.description, 'string');
  assertSnapshotShape(record.mime);
  const installed = ['clean-install', 'same-version-reinstall', 'update', 'injected-failure-rollback', 'explicit-recovery'].includes(record.name);
  if (installed) {
    assertMimeInstalled(record.mime, baseline, hash);
    assert.deepEqual(record.owners, value.owners, 'observed file owners');
    assertEqual(record.packageState.exitCode, 0, 'installed package query');
    assert.ok(record.packageState.description.includes(value.version), 'installed package version');
  } else if (record.name !== 'refresh-failure-observed') assertMimeRestored(record.mime, baseline);
  for (const path of [HELPER_PATH, REGISTRATION_PATH, MIME_PATH]) {
    const present = installed || record.name === 'refresh-failure-observed' || (record.name === 'old-install' && path !== MIME_PATH);
    assertEqual(record.filesPresent?.[path], present, `${record.name} ${path}`);
  }
  if (record.name === 'injected-failure-rollback') assert.notEqual(record.exitCode, 0);
  else if (record.name === 'refresh-failure-observed') {
    assertEqual(record.hookExitCode, 42, 'refresh hook exit');
    assertEqual(record.recovery, 'explicit-candidate-reinstall', 'refresh failure recovery');
    if (value.format === 'deb') assert.notEqual(record.exitCode, 0);
    assert.deepEqual(record.mime.defaults, baseline.defaults);
    assert.deepEqual(record.mime.otherDefinitions, baseline.otherDefinitions);
  } else assertEqual(record.exitCode, 0, `${record.name} exit`);
}

function assertEqual(actual, expected, field) {
  if (actual !== expected) {
    throw new Error(`Linux thumbnail package evidence ${field} 불일치: ${actual} != ${expected}`);
  }
}

function assertPattern(value, pattern, field) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`Linux thumbnail package evidence ${field} 형식이 잘못되었습니다.`);
  }
}
