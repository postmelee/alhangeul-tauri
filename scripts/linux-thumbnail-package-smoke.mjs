#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import {
  buildDebFixture,
  buildRpmFixture,
  findExactlyOne,
  run,
} from './linux-thumbnail-package-fixtures.mjs';
import {
  HELPER_PATH,
  REGISTRATION_PATH,
  SENTINEL_PATH,
  assertArchivePaths,
  assertCommandFailed,
  assertEqual,
  assertPackageIdentity,
  assertProductFilesAbsent,
  debMetadata,
  exists,
  mode,
  packageEvidence,
  productHashes,
  queryMimeDefaults,
  rpmMetadata,
  sha256File,
} from './linux-thumbnail-package-contract.mjs';

async function main() {
  requireEphemeralCi();
  const context = await createContext(process.argv.slice(2));
  try {
    await prepareSentinels(context);
    await runPackageLifecycles(context);
  } finally {
    cleanupOwnedState(context);
  }
}

async function createContext(args) {
  const options = parseArguments(args);
  const platform = options.get('--platform');
  if (!['linux-x64', 'linux-arm64'].includes(platform)) {
    throw new Error(`unsupported platform: ${platform}`);
  }
  const bundleRoot = resolve(required(options, '--bundle-root'));
  const helperSource = resolve(required(options, '--helper'));
  const evidencePath = resolve(required(options, '--evidence'));
  const repositorySha = required(options, '--repository-sha');
  if (!/^[0-9a-f]{40}$/.test(repositorySha)) throw new Error('repository SHA must be exact');
  const expectedRegistration = await readFile(
    resolve('apps/desktop/src-tauri/linux/alhangeul.thumbnailer'),
    'utf8',
  );
  const helperSha256 = await sha256File(helperSource);
  const smokeRoot = await mkdtemp(joinRunnerTemp('alhangeul-package-smoke-'));
  return {
    bundleRoot,
    cacheSentinel: resolve(smokeRoot, 'cache/unrelated.sentinel'),
    evidencePath,
    expectedRegistration,
    helperSha256,
    owned: { deb: '', rpm: '' },
    platform,
    repositorySha,
    sentinelCreated: false,
    smokeRoot,
  };
}

async function prepareSentinels(context) {
  await assertProductFilesAbsent();
  assertNoExistingPackages(context.platform);
  if (await exists(SENTINEL_PATH)) throw new Error(`sentinel already exists: ${SENTINEL_PATH}`);
  const sentinelSource = resolve(context.smokeRoot, 'third-party.thumbnailer');
  await writeFile(sentinelSource, '[Thumbnailer Entry]\nExec=/usr/bin/true %i %o %s\n');
  run('sudo', ['install', '-D', '-m', '0644', sentinelSource, SENTINEL_PATH]);
  context.sentinelCreated = true;
  await mkdir(dirname(context.cacheSentinel), { recursive: true });
  await writeFile(context.cacheSentinel, 'cache-sentinel\n');
  context.defaultsBefore = queryMimeDefaults();
}

function assertNoExistingPackages(platform) {
  assertCommandFailed(
    run('dpkg-query', ['-W', 'alhangeul'], { allowFailure: true }),
    'preinstalled DEB preflight',
  );
  if (platform === 'linux-x64') {
    assertCommandFailed(
      run('sudo', ['rpm', '-q', 'alhangeul'], { allowFailure: true }),
      'preinstalled RPM preflight',
    );
  }
}

async function runPackageLifecycles(context) {
  const deb = await findExactlyOne(resolve(context.bundleRoot, 'deb'), '.deb');
  const packages = [await runDebLifecycle({ ...context, archive: deb })];
  if (context.platform === 'linux-x64') {
    const rpm = await findExactlyOne(resolve(context.bundleRoot, 'rpm'), '.rpm');
    packages.push(await runRpmLifecycle({ ...context, archive: rpm }));
  }
  const defaultsAfter = queryMimeDefaults();
  const invariants = await collectInvariants(context, defaultsAfter);
  await mkdir(dirname(context.evidencePath), { recursive: true });
  await writeFile(context.evidencePath, `${JSON.stringify({
    schemaVersion: 1,
    platform: context.platform,
    repositorySha: context.repositorySha,
    helperSha256: context.helperSha256,
    packages,
    invariants,
    mimeDefaults: { before: context.defaultsBefore, after: defaultsAfter },
  }, null, 2)}\n`);
  console.log(`Linux thumbnail package lifecycle verified: ${context.platform}`);
}

async function collectInvariants(context, defaultsAfter) {
  const invariants = {
    mimeDefaultsPreserved: JSON.stringify(context.defaultsBefore) === JSON.stringify(defaultsAfter),
    thirdPartyThumbnailerPreserved: (await readFile(SENTINEL_PATH, 'utf8')).includes('/usr/bin/true'),
    cacheSentinelPreserved: await readFile(context.cacheSentinel, 'utf8') === 'cache-sentinel\n',
    productFilesRemovedAfterUninstall: !(await exists(HELPER_PATH))
      && !(await exists(REGISTRATION_PATH)),
  };
  for (const [name, value] of Object.entries(invariants)) {
    if (!value) throw new Error(`package lifecycle invariant failed: ${name}`);
  }
  return invariants;
}

function cleanupOwnedState(context) {
  if (context.owned.deb) run('sudo', ['dpkg', '--remove', context.owned.deb], { allowFailure: true });
  if (context.owned.rpm) run('sudo', ['rpm', '--nodeps', '-e', context.owned.rpm], { allowFailure: true });
  if (context.sentinelCreated) run('sudo', ['unlink', SENTINEL_PATH], { allowFailure: true });
}

async function runDebLifecycle(context) {
  const metadata = debMetadata(context.archive);
  const expectedArch = context.platform === 'linux-x64' ? 'amd64' : 'arm64';
  assertPackageIdentity(metadata.name, metadata.architecture, expectedArch);
  assertArchivePaths(run('dpkg-deb', ['--contents', context.archive]).stdout);
  assertCommandFailed(run('dpkg-query', ['-W', metadata.name], { allowFailure: true }), 'preinstalled DEB');
  context.owned.deb = metadata.name;
  console.log(`DEB clean install: ${metadata.name} ${metadata.version}`);
  sudoDpkg('-i', context.archive);
  let installed = await verifyInstalled('deb', metadata, context);
  sudoDpkg('-i', context.archive);
  installed = await verifyInstalled('deb', metadata, context);
  sudoDpkg('--remove', metadata.name);
  await assertProductFilesAbsent();
  const old = await buildDebFixture({
    root: context.smokeRoot,
    name: metadata.name,
    architecture: metadata.architecture,
    version: '0.0.0~stage4',
    fail: false,
  });
  sudoDpkg('-i', old);
  await assertMarker('stage4-old-deb\n');
  sudoDpkg('-i', context.archive);
  installed = await verifyInstalled('deb', metadata, context);
  const beforeFailure = await productHashes();
  const failure = await buildDebFixture({
    root: context.smokeRoot,
    name: metadata.name,
    architecture: metadata.architecture,
    version: '9999.0.0~stage4',
    fail: true,
  });
  assertCommandFailed(run('sudo', ['dpkg', '-i', failure], { allowFailure: true }), 'DEB injected failure');
  await verifyInstalled('deb', metadata, context);
  assertEqual(await productHashes(), beforeFailure, 'DEB rollback hashes');
  sudoDpkg('--remove', metadata.name);
  context.owned.deb = '';
  await assertProductFilesAbsent();
  return packageEvidence('deb', metadata, context, installed);
}

async function runRpmLifecycle(context) {
  const metadata = rpmMetadata(context.archive);
  assertPackageIdentity(metadata.name, metadata.architecture, 'x86_64');
  assertArchivePaths(run('rpm', ['-qpl', context.archive]).stdout);
  assertCommandFailed(
    run('sudo', ['rpm', '-q', metadata.name], { allowFailure: true }),
    'preinstalled RPM',
  );
  context.owned.rpm = metadata.name;
  console.log(`RPM clean install: ${metadata.name} ${metadata.version}`);
  sudoRpm('-i', context.archive);
  let installed = await verifyInstalled('rpm', metadata, context);
  sudoRpm('-i', '--replacepkgs', context.archive);
  installed = await verifyInstalled('rpm', metadata, context);
  sudoRpm('-e', metadata.name);
  await assertProductFilesAbsent();
  const old = await buildRpmFixture({
    root: context.smokeRoot,
    name: metadata.name,
    architecture: metadata.architecture,
    version: '0.0.0',
    fail: false,
  });
  sudoRpm('-i', old);
  await assertMarker('stage4-old-rpm\n');
  sudoRpm('-U', context.archive);
  installed = await verifyInstalled('rpm', metadata, context);
  const beforeFailure = await productHashes();
  const failure = await buildRpmFixture({
    root: context.smokeRoot,
    name: metadata.name,
    architecture: metadata.architecture,
    version: '9999.0.0',
    fail: true,
  });
  assertCommandFailed(
    run('sudo', ['rpm', '--nodeps', '--nosignature', '-U', failure], { allowFailure: true }),
    'RPM injected failure',
  );
  await verifyInstalled('rpm', metadata, context);
  assertEqual(await productHashes(), beforeFailure, 'RPM rollback hashes');
  sudoRpm('-e', metadata.name);
  context.owned.rpm = '';
  await assertProductFilesAbsent();
  return packageEvidence('rpm', metadata, context, installed);
}

async function verifyInstalled(format, metadata, context) {
  const helper = await lstat(HELPER_PATH);
  const registration = await lstat(REGISTRATION_PATH);
  assertEqual(helper.isFile() && !helper.isSymbolicLink(), true, `${format} helper type`);
  assertEqual(registration.isFile() && !registration.isSymbolicLink(), true, `${format} registration type`);
  assertEqual(mode(helper.mode), '0755', `${format} helper mode`);
  assertEqual(mode(registration.mode), '0644', `${format} registration mode`);
  assertEqual(await sha256File(HELPER_PATH), context.helperSha256, `${format} helper SHA-256`);
  assertEqual(await readFile(REGISTRATION_PATH, 'utf8'), context.expectedRegistration, `${format} registration`);
  const elfArchitecture = context.platform === 'linux-arm64' ? 'aarch64' : 'x86-64';
  const description = run('file', ['--brief', HELPER_PATH]).stdout.toLowerCase();
  if (!description.includes(elfArchitecture)) throw new Error(`${format} ELF mismatch: ${description}`);
  if (format === 'deb') {
    const owners = run('dpkg-query', ['--search', HELPER_PATH]).stdout.trim().split(/\r?\n/);
    if (owners.length !== 1 || !owners[0].startsWith(metadata.name)) {
      throw new Error(`${format} helper must have one owner: ${owners.join(', ')}`);
    }
  } else {
    const installedPaths = run('sudo', ['rpm', '-ql', metadata.name])
      .stdout.trim().split(/\r?\n/);
    assertEqual(
      installedPaths.filter((path) => path === HELPER_PATH).length,
      1,
      'rpm helper package ownership',
    );
  }
  return { elfArchitecture, singleOwner: true };
}

async function assertMarker(expected) {
  assertEqual(await readFile(HELPER_PATH, 'utf8'), expected, 'old package marker');
}

function sudoDpkg(action, value) {
  run('sudo', ['env', 'DEBIAN_FRONTEND=noninteractive', 'dpkg', action, value]);
}

function sudoRpm(action, ...values) {
  run('sudo', ['rpm', '--nodeps', '--nosignature', action, ...values]);
}

function requireEphemeralCi() {
  const temp = process.env.RUNNER_TEMP ?? '';
  if (process.env.GITHUB_ACTIONS !== 'true'
    || process.env.ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM !== '1'
    || !temp.startsWith('/')) {
    throw new Error('package lifecycle is restricted to opted-in ephemeral GitHub Actions runners');
  }
}

function joinRunnerTemp(prefix) {
  return resolve(process.env.RUNNER_TEMP ?? tmpdir(), prefix);
}


function required(options, name) {
  const value = options.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseArguments(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index]?.startsWith('--') || !args[index + 1]) throw new Error('invalid arguments');
    if (options.has(args[index])) throw new Error(`duplicate option: ${args[index]}`);
    options.set(args[index], args[index + 1]);
  }
  return options;
}

main().catch((error) => {
  console.error(`Linux thumbnail package lifecycle failed: ${error.message}`);
  process.exitCode = 1;
});
