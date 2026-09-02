#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
  packageEvidence,
  productHashes,
  queryMimeDefaults,
  rpmMetadata,
  sha256File,
  verifyArchiveContract,
  verifyInstalled,
  packageState,
} from './linux-thumbnail-package-contract.mjs';

import {
  MIME_PATH, assertMimeInstalled, assertMimeRestored, prepareSystemMime,
  systemMimeSnapshot, cleanupSystemMime,
} from './linux-thumbnail-mime-contract.mjs';

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
  const registrationSource = resolve('apps/desktop/src-tauri/linux/alhangeul.thumbnailer');
  const mimeSource = resolve('apps/desktop/src-tauri/linux/alhangeul-hwpx.xml');
  const helperSha256 = await sha256File(helperSource);
  const smokeRoot = await mkdtemp(joinRunnerTemp('alhangeul-package-smoke-'));
  return {
    bundleRoot,
    cacheSentinel: resolve(smokeRoot, 'cache/unrelated.sentinel'),
    evidencePath,
    expectedRegistration,
    helperSource,
    helperSha256,
    mimeSource,
    owned: { deb: '', rpm: '' },
    platform,
    repositorySha,
    registrationSource,
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
  await prepareSystemMime(context);
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
    schemaVersion: 2,
    success: true,
    mimeSha256: context.mimeSha256,
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
      && !(await exists(REGISTRATION_PATH)) && !(await exists(MIME_PATH)),
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
  cleanupSystemMime(context);
}

const runDebLifecycle = (context) => runLifecycle({ ...context, format: 'deb' });
const runRpmLifecycle = (context) => runLifecycle({ ...context, format: 'rpm' });

async function runLifecycle(context) {
  const { format } = context;
  const metadata = format === 'deb' ? debMetadata(context.archive) : rpmMetadata(context.archive);
  context.metadata = metadata;
  context.transitions = [];
  const arch = format === 'rpm' ? 'x86_64' : context.platform === 'linux-x64' ? 'amd64' : 'arm64';
  assertPackageIdentity(metadata.name, metadata.architecture, arch);
  assertArchivePaths(run(format === 'deb' ? 'dpkg-deb' : 'rpm',
    [format === 'deb' ? '--contents' : '-qpl', context.archive]).stdout);
  context.archiveContract = await verifyArchiveContract(format, context);
  await observe(context, 'baseline', 0, 'baseline');
  context.owned[format] = metadata.name;
  await installAndObserve(context, 'clean-install');
  await installAndObserve(context, 'same-version-reinstall');
  await removeAndObserve(context, 'interim-uninstall');
  await checkRefreshFailure(context);
  const installed = await installAndObserve(context, 'explicit-recovery');
  const old = transaction(context, 'install', await fixture(context, false));
  assertEqual(await readFile(HELPER_PATH, 'utf8'), `stage4-old-${format}\n`, 'old package marker');
  await observe(context, 'old-install', old.status, 'baseline');
  await installAndObserve(context, 'update');
  await checkPreinstallFailure(context);
  await removeAndObserve(context, 'uninstall');
  if (format === 'deb') await purgeDebWithoutRefreshCommand(context);
  context.owned[format] = '';
  return packageEvidence(format, metadata, context, installed);
}

async function installAndObserve(context, name) {
  const result = transaction(context, 'install', context.archive);
  const installed = await verifyInstalled(context.format, context.metadata, context);
  await observe(context, name, result.status, 'installed', { owners: installed.owners });
  return installed;
}

async function removeAndObserve(context, name) {
  const result = transaction(context, 'remove', context.metadata.name);
  await assertProductFilesAbsent();
  await observe(context, name, result.status, 'baseline');
}

async function purgeDebWithoutRefreshCommand(context) {
  const result = run('sudo', ['env', 'PATH=/nonexistent', '/usr/bin/dpkg', '--purge', context.metadata.name]);
  await assertProductFilesAbsent();
  await observe(context, 'purge-without-update-mime-database', result.status, 'baseline', {
    updateMimeDatabaseAvailable: false,
  });
}

async function checkPreinstallFailure(context) {
  const before = await productHashes();
  const result = transaction(context, 'install', await fixture(context, true), true);
  assertCommandFailed(result, `${context.format} injected failure`);
  const installed = await verifyInstalled(context.format, context.metadata, context);
  assertEqual(await productHashes(), before, `${context.format} rollback hashes`);
  await observe(context, 'injected-failure-rollback', result.status, 'installed', { owners: installed.owners });
}

async function checkRefreshFailure(context) {
  const result = transaction(context, 'install', await fixture(context, 'refresh'), true);
  const diagnostics = `${result.stdout}\n${result.stderr}`;
  if (!diagnostics.includes('injected MIME refresh failure (42)') || !/exit (?:status|code) 42/.test(diagnostics)) {
    throw new Error(`MIME refresh failure not observed: ${diagnostics}`);
  }
  if (context.format === 'deb') assertCommandFailed(result, 'DEB refresh failure');
  // RPM may return 0 after failed %post. Observe it; recovery below is explicit.
  await observe(context, 'refresh-failure-observed', result.status, 'observed', {
    hookExitCode: 42, recovery: 'explicit-candidate-reinstall',
  });
}

function fixture(context, fail) {
  const build = context.format === 'deb' ? buildDebFixture : buildRpmFixture;
  const version = fail === 'refresh' ? '9998.0.0' : fail ? '9999.0.0' : '0.0.0';
  return build({ root: context.smokeRoot, name: context.metadata.name,
    architecture: context.metadata.architecture,
    version: context.format === 'deb' ? `${version}~stage4` : version, fail,
    sources: { helper: context.helperSource, registration: context.registrationSource,
      mime: context.mimeSource },
  });
}

function transaction(context, action, value, allowFailure = false) {
  const args = context.format === 'deb'
    ? ['env', 'DEBIAN_FRONTEND=noninteractive', 'dpkg', action === 'remove' ? '--remove' : '-i', value]
    : ['rpm', '--nodeps', '--nosignature', ...(action === 'remove' ? ['-e'] : ['-U', '--replacepkgs', '--oldpackage']), value];
  return run('sudo', args, { allowFailure });
}

async function observe(context, name, exitCode, state, extra = {}) {
  const mime = await systemMimeSnapshot(context);
  const filesPresent = {};
  for (const path of [HELPER_PATH, REGISTRATION_PATH, MIME_PATH]) filesPresent[path] = await exists(path);
  const record = { name, exitCode, packageState: packageState(context.format, context.metadata.name),
    mime, filesPresent, ...extra };
  context.transitions.push(record);
  // Persist observations before asserting, including a post-install failure.
  await mkdir(dirname(context.evidencePath), { recursive: true });
  await writeFile(`${context.evidencePath}.${context.format}.transitions.json`,
    `${JSON.stringify(context.transitions, null, 2)}\n`);
  console.log(JSON.stringify({ format: context.format, ...record }));
  if (state === 'installed') assertMimeInstalled(mime, context.mimeBaseline, context.mimeSha256);
  if (state === 'baseline') assertMimeRestored(mime, context.mimeBaseline);
}

function requireEphemeralCi() {
  const temp = process.env.RUNNER_TEMP ?? '';
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true'
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
