import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { run } from './linux-thumbnail-package-fixtures.mjs';

export const HELPER_PATH = '/usr/lib/alhangeul/alhangeul-thumbnailer';
export const REGISTRATION_PATH = '/usr/share/thumbnailers/alhangeul.thumbnailer';
export const SENTINEL_PATH = '/usr/share/thumbnailers/alhangeul-stage4-third-party.thumbnailer';
const LIFECYCLE = [
  'clean-install',
  'same-version-reinstall',
  'update',
  'injected-failure-rollback',
  'uninstall',
];

export function packageEvidence(format, metadata, context, installed) {
  return {
    format,
    path: relative(context.bundleRoot, context.archive).split(sep).join('/'),
    archiveSha256: metadata.archiveSha256,
    name: metadata.name,
    version: metadata.version,
    architecture: metadata.architecture,
    helper: { path: HELPER_PATH, mode: '0755', sha256: context.helperSha256 },
    registration: {
      path: REGISTRATION_PATH,
      mode: '0644',
      exec: `${HELPER_PATH} %i %o %s`,
      mime: 'application/x-hwp;application/vnd.hancom.hwpx;',
    },
    elfArchitecture: installed.elfArchitecture,
    singleOwner: installed.singleOwner,
    lifecycle: [...LIFECYCLE],
  };
}

export function debMetadata(path) {
  return {
    name: commandText('dpkg-deb', ['--field', path, 'Package']),
    version: commandText('dpkg-deb', ['--field', path, 'Version']),
    architecture: commandText('dpkg-deb', ['--field', path, 'Architecture']),
    archiveSha256: sha256Sync(path),
  };
}

export function rpmMetadata(path) {
  const [name, version, architecture] = commandText(
    'rpm', ['-qp', '--qf', '%{NAME}\n%{VERSION}-%{RELEASE}\n%{ARCH}\n', path],
  ).split(/\r?\n/);
  return { name, version, architecture, archiveSha256: sha256Sync(path) };
}

export function assertArchivePaths(listing, prefix) {
  for (const path of [HELPER_PATH, REGISTRATION_PATH]) {
    const expected = `${prefix}${path.replace(/^\//, '')}`;
    const count = listing.split(/\r?\n/).filter((line) => line.trim().endsWith(expected)).length;
    assertEqual(count, 1, `archive path ${path}`);
  }
}

export function assertPackageIdentity(name, architecture, expectedArchitecture) {
  assertEqual(name, 'alhangeul', 'package name');
  assertEqual(architecture, expectedArchitecture, 'package architecture');
}

export async function assertProductFilesAbsent() {
  assertEqual(await exists(HELPER_PATH), false, `${HELPER_PATH} absence`);
  assertEqual(await exists(REGISTRATION_PATH), false, `${REGISTRATION_PATH} absence`);
}

export function queryMimeDefaults() {
  return Object.fromEntries([
    'application/x-hwp',
    'application/vnd.hancom.hwpx',
  ].map((mime) => [mime, run('xdg-mime', ['query', 'default', mime], { allowFailure: true }).stdout.trim()]));
}

export function assertCommandFailed(result, label) {
  if (result.status === 0) throw new Error(`${label} unexpectedly succeeded`);
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mismatch: ${actual} != ${expected}`);
}

export function mode(value) {
  return (value & 0o7777).toString(8).padStart(4, '0');
}

export async function productHashes() {
  return `${await sha256File(HELPER_PATH)} ${await sha256File(REGISTRATION_PATH)}`;
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function exists(path) {
  try { await lstat(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function commandText(command, args) {
  return run(command, args).stdout.trim();
}

function sha256Sync(path) {
  return commandText('sha256sum', [path]).split(/\s+/)[0];
}
