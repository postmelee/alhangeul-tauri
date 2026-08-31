import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './linux-thumbnail-package-fixtures.mjs';

export const MIME_PATH = '/usr/share/mime/packages/alhangeul-hwpx.xml';
export const MIME_SENTINEL = '/usr/share/mime/packages/alhangeul-task50-third-party.xml';
export const CANONICAL = 'application/x-hwpx';
export const ALIASES = ['application/hwp+zip', 'application/vnd.hancom.hwpx', 'application/x-hwp+zip'];
const wrapXml = (body) => `<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">${body}</mime-info>\n`;
const sentinelXml = wrapXml('<mime-type type="application/x-alhangeul-task50-sentinel"><glob pattern="*.task50-sentinel"/></mime-type>');
export const DEFAULT_APP = 'alhangeul-task50-third-party.desktop';

export async function createMimeFixtures(root) {
  await mkdir(root, { recursive: true });
  const zip = Buffer.alloc(64);
  zip.write('PK\x03\x04', 0, 'binary');
  const magic = Buffer.from(zip);
  magic.writeUInt16LE(8, 26);
  magic.write('mimetypeapplication/hwp+zip', 30);
  const contents = { 'glob.hwpx': zip, 'magic': magic, 'generic.zip': zip };
  for (const [name, bytes] of Object.entries(contents)) await writeFile(join(root, name), bytes);
  return Object.fromEntries(Object.keys(contents).map((name) => [name.split('.')[0], join(root, name)]));
}

export async function mimeSnapshot(options) {
  const { mimeRoot, fixtures, env = process.env } = options;
  const aliases = await readFile(join(mimeRoot, 'aliases'), 'utf8');
  const types = Object.fromEntries(Object.entries(fixtures).map(([name, path]) => {
    const result = run('gio', ['info', '-a', 'standard::content-type', path], { env });
    const type = result.stdout.match(/standard::content-type:\s*(\S+)/)?.[1];
    if (!type) throw new Error(`missing GIO content type: ${name}`);
    return [name, type];
  }));
  const defaults = Object.fromEntries(['application/x-hwp', CANONICAL, ...ALIASES].map((type) => [
    type, run('xdg-mime', ['query', 'default', type], { env }).stdout.trim(),
  ]));
  return {
    types, defaults,
    defaultSettingsSha256: await optionalHash(join(env.XDG_CONFIG_HOME ?? join(env.HOME, '.config'), 'mimeapps.list')),
    aliases: Object.fromEntries(ALIASES.map((alias) => [alias,
      aliases.split('\n').find((line) => line.startsWith(`${alias} `))?.split(' ')[1] ?? null])),
    xmlSha256: await optionalHash(join(mimeRoot, 'packages/alhangeul-hwpx.xml')),
    otherDefinitions: await definitionHashes(join(mimeRoot, 'packages')),
  };
}

export function assertMimeInstalled(snapshot, baseline, expectedHash) {
  assert.equal(snapshot.xmlSha256, expectedHash, 'product MIME hash');
  assert.deepEqual(snapshot.types, { glob: CANONICAL, magic: CANONICAL, generic: 'application/zip' });
  assert.deepEqual(snapshot.aliases, Object.fromEntries(ALIASES.map((alias) => [alias, CANONICAL])));
  assert.deepEqual(snapshot.defaults, baseline.defaults, 'MIME defaults preserved');
  assert.equal(snapshot.defaultSettingsSha256, baseline.defaultSettingsSha256, 'default settings bytes preserved');
  assert.deepEqual(snapshot.otherDefinitions, baseline.otherDefinitions, 'third-party MIME definitions preserved');
}

export function assertMimeRestored(snapshot, baseline) {
  assert.equal(snapshot.xmlSha256, null, 'product MIME XML removed');
  assert.deepEqual(snapshot, baseline, 'MIME semantic baseline restored');
}

export async function prepareSystemMime(context) {
  if (await optionalHash(MIME_SENTINEL)) throw new Error('MIME sentinel already exists');
  await prepareDefaultFixture(context.smokeRoot);
  context.mimeFixtures = await createMimeFixtures(join(context.smokeRoot, 'mime-fixtures'));
  const source = join(context.smokeRoot, 'third-party.xml');
  await writeFile(source, sentinelXml);
  run('sudo', ['install', '-m', '0644', source, MIME_SENTINEL]);
  context.owned.mimeSentinel = true;
  run('sudo', ['update-mime-database', '/usr/share/mime']);
  context.mimeSha256 = await optionalHash('apps/desktop/src-tauri/linux/alhangeul-hwpx.xml');
  context.mimeBaseline = await systemMimeSnapshot(context);
  assert.deepEqual(Object.values(context.mimeBaseline.defaults), Array(5).fill(DEFAULT_APP), 'existing default fixture must be effective');
}

async function prepareDefaultFixture(root) {
  // A disposable existing-user-preference fixture, not a MIME database override.
  const config = join(root, 'xdg-config');
  const data = join(root, 'xdg-data');
  await mkdir(config, { recursive: true });
  await mkdir(join(data, 'applications'), { recursive: true });
  const types = ['application/x-hwp', CANONICAL, ...ALIASES];
  await writeFile(join(data, 'applications', DEFAULT_APP), [
    '[Desktop Entry]', 'Type=Application', 'Name=Third-party MIME default sentinel',
    'Exec=/usr/bin/true %f', `MimeType=${types.join(';')};`, '',
  ].join('\n'));
  await writeFile(join(config, 'mimeapps.list'), [
    '[Default Applications]', ...types.map((type) => `${type}=${DEFAULT_APP};`), '',
  ].join('\n'));
  process.env.XDG_CONFIG_HOME = config;
  process.env.XDG_DATA_HOME = data;
  process.env.XDG_DATA_DIRS = '/usr/local/share:/usr/share';
}

export const systemMimeSnapshot = (context) => mimeSnapshot({
  mimeRoot: '/usr/share/mime', fixtures: context.mimeFixtures,
});

export function cleanupSystemMime(context) {
  if (!context.owned.mimeSentinel) return;
  run('sudo', ['unlink', MIME_SENTINEL], { allowFailure: true });
  run('sudo', ['update-mime-database', '/usr/share/mime'], { allowFailure: true });
}

async function optionalHash(path) {
  try { return createHash('sha256').update(await readFile(path)).digest('hex'); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function definitionHashes(root) {
  const result = {};
  for (const name of (await readdir(root)).sort()) {
    if (name.endsWith('.xml') && name !== 'alhangeul-hwpx.xml') result[name] = await optionalHash(join(root, name));
  }
  return result;
}

async function canary(repository, output) {
  if (process.platform !== 'linux') throw new Error('MIME canary requires Linux');
  const root = await mkdtemp(join(process.env.RUNNER_TEMP ?? '/tmp', 'alhangeul-mime-canary-'));
  const fixtures = await createMimeFixtures(join(root, 'fixtures'));
  const xml = await readFile(join(repository, 'apps/desktop/src-tauri/linux/alhangeul-hwpx.xml'), 'utf8');
  const hash = createHash('sha256').update(xml).digest('hex');
  const observations = [];
  for (const generation of ['old', 'new']) {
    const data = join(root, generation);
    const mimeRoot = join(data, 'mime');
    const packages = join(mimeRoot, 'packages');
    await mkdir(packages, { recursive: true });
    await writeFile(join(packages, 'baseline.xml'), wrapXml(
      '<mime-type type="application/zip"><glob pattern="*.zip"/><magic><match type="string" value="PK\\003\\004" offset="0"/></magic></mime-type>',
    ));
    await writeFile(join(packages, 'third-party.xml'), sentinelXml);
    if (generation === 'new') await writeFile(join(packages, 'upstream.xml'), xml);
    const env = { ...process.env, LC_ALL: 'C', XDG_DATA_HOME: data, XDG_DATA_DIRS: data,
      XDG_CONFIG_HOME: join(root, 'config'), XDG_CONFIG_DIRS: join(root, 'config') };
    run('update-mime-database', [mimeRoot], { env });
    const baseline = await mimeSnapshot({ mimeRoot, fixtures, env });
    assert.equal(baseline.types.glob, generation === 'old' ? 'application/zip' : CANONICAL);
    assert.equal(baseline.types.magic, generation === 'old' ? 'application/zip' : CANONICAL);
    await writeFile(join(packages, 'alhangeul-hwpx.xml'), xml);
    run('update-mime-database', [mimeRoot], { env });
    const installed = await mimeSnapshot({ mimeRoot, fixtures, env });
    assertMimeInstalled(installed, baseline, hash);
    await unlink(join(packages, 'alhangeul-hwpx.xml'));
    run('update-mime-database', [mimeRoot], { env });
    const removed = await mimeSnapshot({ mimeRoot, fixtures, env });
    assertMimeRestored(removed, baseline);
    observations.push({ generation, baseline, installed, removed });
  }
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, `${JSON.stringify({ schemaVersion: 1, observations }, null, 2)}\n`);
  console.log('MIME canary passed: old/new definitions, glob/magic/ZIP, uninstall preservation');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  canary(resolve(process.argv[2]), resolve(process.argv[3])).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
