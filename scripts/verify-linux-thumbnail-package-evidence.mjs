import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const HELPER_PATH = '/usr/lib/alhangeul/alhangeul-thumbnailer';
const REGISTRATION_PATH = '/usr/share/thumbnailers/alhangeul.thumbnailer';
const LIFECYCLE = [
  'clean-install',
  'same-version-reinstall',
  'update',
  'injected-failure-rollback',
  'uninstall',
];

export async function assertLinuxPackageEvidence(platform, files, rootPath) {
  const evidenceFile = files.find((file) => file.kind === 'linux-thumbnail-packages');
  const evidence = JSON.parse(await readFile(resolve(rootPath, evidenceFile.path), 'utf8'));
  const expected = platform === 'linux-x64'
    ? [['deb', 'amd64'], ['rpm', 'x86_64']]
    : [['deb', 'arm64']];
  assertEqual(evidence.schemaVersion, 1, 'schemaVersion');
  assertEqual(evidence.platform, platform, 'platform');
  assertPattern(evidence.repositorySha, /^[0-9a-f]{40}$/, 'repositorySha');
  assertPattern(evidence.helperSha256, /^[0-9a-f]{64}$/, 'helperSha256');
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
      'application/x-hwp;application/vnd.hancom.hwpx;',
      `${format}.registration.mime`,
    );
    assertEqual(value.singleOwner, true, `${format}.singleOwner`);
    assertEqual(value.elfArchitecture, platform === 'linux-x64' ? 'x86-64' : 'aarch64', `${format}.elfArchitecture`);
    if (JSON.stringify(value.lifecycle) !== JSON.stringify(LIFECYCLE)) {
      throw new Error(`${format}.lifecycle가 완전하지 않습니다.`);
    }
  }
  for (const invariant of [
    'mimeDefaultsPreserved',
    'thirdPartyThumbnailerPreserved',
    'cacheSentinelPreserved',
    'productFilesRemovedAfterUninstall',
  ]) assertEqual(evidence.invariants?.[invariant], true, `invariants.${invariant}`);
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
