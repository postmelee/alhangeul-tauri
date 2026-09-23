import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { run } from './linux-thumbnail-package-fixtures.mjs';
import { MIME_PATH } from './linux-thumbnail-mime-contract.mjs';

export const HELPER_PATH = '/usr/lib/alhangeul/alhangeul-thumbnailer';
export const REGISTRATION_PATH = '/usr/share/thumbnailers/alhangeul.thumbnailer';
export const SENTINEL_PATH = '/usr/share/thumbnailers/alhangeul-stage4-third-party.thumbnailer';
export const LIFECYCLE = [
  'baseline',
  'clean-install',
  'same-version-reinstall',
  'interim-uninstall',
  'refresh-failure-observed',
  'explicit-recovery',
  'old-install',
  'update',
  'injected-failure-rollback',
  'uninstall',
];
export const DEB_LIFECYCLE = [...LIFECYCLE, 'purge-without-update-mime-database'];
export const lifecycleFor = (format) => (format === 'deb' ? DEB_LIFECYCLE : LIFECYCLE);

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
      mime: 'application/x-hwp;application/x-hwpx;',
      sha256: installed.registrationSha256,
    },
    mime: { path: MIME_PATH, mode: '0644', sha256: context.mimeSha256 },
    archiveContract: context.archiveContract,
    owners: installed.owners,
    elfArchitecture: installed.elfArchitecture,
    singleOwner: installed.singleOwner,
    lifecycle: context.transitions,
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

export function assertArchivePaths(listing) {
  const paths = listing.split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).at(-1) ?? '')
    .map((path) => `/${path.replace(/^\.\//, '').replace(/^\//, '')}`);
  const allowedMimePaths = new Set([
    '/usr/share/mime', '/usr/share/mime/', '/usr/share/mime/packages',
    '/usr/share/mime/packages/', MIME_PATH,
  ]);
  if (paths.some((path) => path.startsWith('/usr/share/mime/') && !allowedMimePaths.has(path))) {
    throw new Error('archive must not own generated MIME cache');
  }
  for (const path of [HELPER_PATH, REGISTRATION_PATH, MIME_PATH]) {
    const count = paths.filter((candidate) => candidate === path).length;
    if (count !== 1) {
      const relevant = paths.filter((candidate) => /alhangeul|thumbnailer/i.test(candidate));
      throw new Error(`archive path ${path} mismatch: ${count} != 1; found=${relevant.join(',')}`);
    }
  }
}

export function assertPackageIdentity(name, architecture, expectedArchitecture) {
  assertEqual(name, 'alhangeul', 'package name');
  assertEqual(architecture, expectedArchitecture, 'package architecture');
}

export async function assertProductFilesAbsent() {
  assertEqual(await exists(HELPER_PATH), false, `${HELPER_PATH} absence`);
  assertEqual(await exists(REGISTRATION_PATH), false, `${REGISTRATION_PATH} absence`);
  assertEqual(await exists(MIME_PATH), false, `${MIME_PATH} absence`);
}

export function queryMimeDefaults() {
  return Object.fromEntries([
    'application/x-hwp',
    'application/x-hwpx',
    'application/hwp+zip',
    'application/x-hwp+zip',
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
  return `${await sha256File(HELPER_PATH)} ${await sha256File(REGISTRATION_PATH)} ${await sha256File(MIME_PATH)}`;
}

export async function verifyArchiveContract(format, context) {
  let dependencies;
  let hooks;
  if (format === 'deb') {
    dependencies = commandText('dpkg-deb', ['--field', context.archive, 'Depends']);
    const control = join(context.smokeRoot, 'candidate-control');
    run('dpkg-deb', ['--control', context.archive, control]);
    hooks = await Promise.all(['postinst', 'postrm'].map((name) => readFile(join(control, name), 'utf8')));
  } else {
    dependencies = commandText('rpm', ['-qp', '--requires', context.archive]);
    hooks = ['%{POSTIN}', '%{POSTUN}'].map((field) => commandText('rpm', ['-qp', '--qf', field, context.archive]));
  }
  const required = format === 'deb'
    ? ['shared-mime-info', 'libwebkit2gtk-4.1-0', 'libgtk-3-0']
    : ['shared-mime-info', 'libwebkit2gtk-4.1.so.0()(64bit)', 'libgtk-3.so.0()(64bit)'];
  for (const name of required) {
    if (!dependencies.includes(name)) throw new Error(`missing ${format} dependency: ${name}`);
  }
  const expectedHooks = await Promise.all([
    'apps/desktop/src-tauri/linux/update-mime-database.sh',
    'apps/desktop/src-tauri/linux/update-mime-database-remove.sh',
  ].map(async (path) => (await readFile(path, 'utf8')).trim()));
  for (let index = 0; index < hooks.length; index += 1) {
    if (!hooks[index].includes(expectedHooks[index])) throw new Error(`missing ${format} MIME refresh hook`);
  }
  return { dependencies: required, refreshHooks: ['post-install', 'post-remove'] };
}

export async function verifyInstalled(format, metadata, context) {
  const expected = [[HELPER_PATH, '0755', context.helperSha256],
    [REGISTRATION_PATH, '0644', createHash('sha256').update(context.expectedRegistration).digest('hex')],
    [MIME_PATH, '0644', context.mimeSha256]];
  const owners = {};
  const rpmInventory = format === 'rpm' ? installedRpmInventory() : [];
  for (const [path, expectedMode, hash] of expected) {
    const stat = await lstat(path);
    assertEqual(stat.isFile() && !stat.isSymbolicLink(), true, `${format} ${path} regular file`);
    assertEqual(mode(stat.mode), expectedMode, `${format} ${path} mode`);
    assertEqual(await sha256File(path), hash, `${format} ${path} hash`);
    const output = format === 'deb'
      ? run('dpkg-query', ['--search', path]).stdout.trim().split(/\r?\n/).map((line) => line.split(': ')[0])
      : ownersFromInventory(rpmInventory, path);
    assertEqual(output.length, 1, `${format} ${path} owner count`);
    assertEqual(output[0], metadata.name, `${format} ${path} owner`);
    owners[path] = output[0];
  }
  const elfArchitecture = context.platform === 'linux-arm64' ? 'aarch64' : 'x86-64';
  const description = run('file', ['--brief', HELPER_PATH]).stdout.toLowerCase();
  if (!description.includes(elfArchitecture)) throw new Error(`${format} ELF mismatch: ${description}`);
  return { elfArchitecture, owners, singleOwner: true, registrationSha256: expected[1][2] };
}

function installedRpmInventory() {
  // Ubuntu RPM reverse-file lookup is unreliable; enumerate the actual RPM DB.
  const names = run('sudo', ['rpm', '-qa', '--qf', '%{NAME}\n']).stdout.trim().split(/\r?\n/).filter(Boolean);
  return names.map((name) => ({ name,
    paths: run('sudo', ['rpm', '-ql', name]).stdout.trim().split(/\r?\n/),
  }));
}

export function ownersFromInventory(inventory, path) {
  return inventory.flatMap((entry) => entry.paths.filter((value) => value === path).map(() => entry.name));
}

export function packageState(format, name) {
  const result = format === 'deb'
    ? run('dpkg-query', ['-W', '-f', '${Status} ${Version}', name], { allowFailure: true })
    : run('sudo', ['rpm', '-q', '--qf', '%{NAME} %{VERSION}-%{RELEASE}\n', name], { allowFailure: true });
  return { exitCode: result.status, description: result.stdout.trim() };
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
