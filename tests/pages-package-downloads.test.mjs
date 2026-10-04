import assert from 'node:assert/strict';
import { mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { buildPages } from '../scripts/build-pages.mjs';
import { checkPages } from '../scripts/check-pages.mjs';
import {
  buildPackageDownloads, readPackageDownloads, serializePackageDownloads,
} from '../scripts/pages/package-downloads.mjs';
import { INSTALLERS, releaseAssetUrl } from '../scripts/releases/notes-metadata.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from '../scripts/updater/manifest.mjs';
import {
  createPagesFixture, publishedFixture, publishedManifestFixture, unreleasedFixture,
} from './fixtures/pages-release-fixtures.mjs';
import { releaseNotesFixture } from './fixtures/release-note-fixtures.mjs';

function pairedData(version = '0.2.0', active = true) {
  let release = publishedFixture();
  release.version = version;
  release.tag = `v${version}`;
  for (const target of Object.keys(release.downloads)) {
    release.downloads[target] = releaseAssetUrl(release.tag, INSTALLERS[target].file(version));
  }
  if (active) release = publishedManifestFixture(release);
  const notes = releaseNotesFixture(release);
  notes.content.updaterSummary = release.notes;
  return { release, notes };
}

async function fixtureFor(t, release, options) {
  const fixture = await createPagesFixture(release, options);
  t.after(fixture.cleanup);
  return fixture;
}

for (const version of ['0.2.0', '0.3.1']) {
  for (const active of [false, true]) {
    test(`6종 목록은 ${version}, manifest=${active} 원문을 따르고 입력을 보존한다`, () => {
      const { release, notes } = pairedData(version, active);
      const before = JSON.stringify({ release, notes });
      const catalog = buildPackageDownloads(release, notes);
      assert.deepEqual(Object.keys(catalog), ['schemaVersion', 'status', 'version', 'tag', 'sourceSha', 'packages']);
      assert.equal(catalog.schemaVersion, 1);
      assert.equal(catalog.status, 'published');
      assert.equal(catalog.version, version);
      assert.equal(catalog.tag, `v${version}`);
      assert.equal(catalog.sourceSha, notes.metadata.sourceSha);
      assert.deepEqual(catalog.packages.map(({ target }) => target), Object.keys(INSTALLERS));
      assert.deepEqual(catalog.packages.map(({ platform }) => platform), ['windows', 'windows', 'linux', 'linux', 'linux', 'linux']);
      assert.deepEqual(catalog.packages.map(({ format }) => format), ['NSIS', 'MSI', 'AppImage', 'DEB', 'RPM', 'DEB']);
      assert.deepEqual(catalog.packages.map(({ updateMode }) => updateMode), ['app', 'app', 'app', 'manual', 'manual', 'manual']);
      assert.deepEqual(catalog.packages.map(({ architecture }) => architecture), ['x64', 'x64', 'x64', 'x64', 'x64', 'arm64']);
      for (const entry of catalog.packages) {
        const { name, size, sha256, url } = entry;
        assert.deepEqual({ name, size, sha256, url }, notes.metadata.assets[entry.target]);
        assert.equal(name, INSTALLERS[entry.target].file(version));
      }
      assert.equal(new Set(catalog.packages.map(({ url }) => url)).size, 6);
      assert.equal(JSON.stringify({ release, notes }), before);
      assert.equal(serializePackageDownloads(catalog), `${JSON.stringify(catalog, null, 2)}\n`);
    });
  }
}

test('미공개 목록은 직접 URL과 릴리즈 식별자를 포함하지 않는다', () => {
  const catalog = buildPackageDownloads(unreleasedFixture());
  assert.deepEqual(catalog, {
    schemaVersion: 1, status: 'unreleased', version: null, tag: null, sourceSha: null, packages: [],
  });
  assert.doesNotMatch(serializePackageDownloads(catalog), /releases\/download/);
});

for (const [name, mutate] of [
  ['manual package 누락', (notes) => { delete notes.metadata.assets['linux-x86_64-rpm']; }],
  ['manual URL redirect', (notes) => { notes.metadata.assets['linux-x86_64-deb'].url += '?download=1'; }],
  ['잘못된 architecture 이름', (notes) => { notes.metadata.assets['linux-aarch64-deb'].name = 'wrong.deb'; }],
  ['잘못된 manual 크기', (notes) => { notes.metadata.assets['linux-x86_64-rpm'].size = 0; }],
  ['잘못된 manual hash', (notes) => { notes.metadata.assets['linux-aarch64-deb'].sha256 = 'invalid'; }],
  ['draft 원문', (notes) => { notes.metadata.status = 'draft'; notes.metadata.publishedAt = null; }],
  ['다른 게시 날짜', (notes) => { notes.metadata.publishedAt = '2026-08-28T00:00:00Z'; }],
  ['다른 짧은 요약', (notes) => { notes.content.updaterSummary = '다른 요약'; }],
]) {
  test(`유효 release라도 ${name}이면 목록을 생성하지 않는다`, () => {
    const { release, notes } = pairedData();
    mutate(notes);
    assert.throws(() => buildPackageDownloads(release, notes));
  });
}

test('다음 버전의 유효 원문을 현재 release와 섞지 않는다', () => {
  const { release } = pairedData();
  const { notes } = pairedData('0.3.0');
  assert.throws(() => buildPackageDownloads(release, notes), /version.*다릅니다/);
});

test('release의 확장자/버전이 유효해도 원문과 다른 직접 URL을 거부한다', () => {
  const { release, notes } = pairedData('0.2.0', false);
  release.downloads['windows-x86_64-nsis'] = release.downloads['windows-x86_64-nsis'].replace('_x64-setup', '_other_x64-setup');
  assert.throws(() => buildPackageDownloads(release, notes), /URL.*다릅니다/);
});

for (const [field, value] of [['sourceSha', 'c'.repeat(40)], ['keyFingerprint', 'e'.repeat(64)]]) {
  test(`활성 updater의 ${field}를 원문과 대조한다`, () => {
    const { release, notes } = pairedData();
    release.updater.inventory[field] = value;
    assert.throws(() => buildPackageDownloads(release, notes), /inventory.*다릅니다/);
  });
}

for (const [field, value] of [['size', 987], ['sha256', 'e'.repeat(64)]]) {
  test(`활성 updater target의 ${field} drift를 거부한다`, () => {
    const { release, notes } = pairedData();
    release.updater.inventory.targets['windows-x86_64-nsis'][field] = value;
    assert.throws(() => buildPackageDownloads(release, notes), /inventory.*다릅니다/);
  });
}

test('활성 updater 서명 bytes가 원문과 다르면 목록을 만들지 않는다', () => {
  const { release, notes } = pairedData();
  const target = release.updater.inventory.targets['windows-x86_64-nsis'];
  const signature = Buffer.from(target.signature, 'base64').toString('utf8');
  target.signature = Buffer.from(signature.replace('timestamp:1788048000', 'timestamp:1788048001')).toString('base64');
  assert.throws(() => buildPackageDownloads(release, notes), /inventory.*다릅니다/);
});

test('빌드는 6종 목록을 추가해도 release·원문·기존 3종 updater bytes를 보존한다', async (t) => {
  const { release } = pairedData();
  const fixture = await fixtureFor(t, release);
  const releasePath = join(fixture.root, 'site/release.json');
  const notesPath = join(fixture.root, `docs/releases/${release.tag}.notes.json`);
  const releaseBefore = await readFile(releasePath);
  const notesBefore = await readFile(notesPath);
  const feedBefore = serializeUpdaterManifest(buildUpdaterManifest(release), release);
  const expected = serializePackageDownloads(await readPackageDownloads(fixture.root, release));
  await buildPages({ repositoryRoot: fixture.root });
  assert.equal(await readFile(join(fixture.root, '_site/downloads.json'), 'utf8'), expected);
  assert.equal(await readFile(join(fixture.root, '_site/updater/stable.json'), 'utf8'), feedBefore);
  assert.deepEqual(await readFile(releasePath), releaseBefore);
  assert.deepEqual(await readFile(notesPath), notesBefore);
  await buildPages({ repositoryRoot: fixture.root });
  assert.equal(await readFile(join(fixture.root, '_site/downloads.json'), 'utf8'), expected);
  await checkPages({ repositoryRoot: fixture.root });
});

for (const active of [false, true]) {
  test(`published manifest=${active}의 현재 원문 누락은 출력 삭제 전에 거부한다`, async (t) => {
    const { release } = pairedData('0.2.0', active);
    const fixture = await fixtureFor(t, release, { includeNotes: false });
    await mkdir(join(fixture.root, '_site'));
    const marker = join(fixture.root, '_site/keep.txt');
    await writeFile(marker, 'keep');
    await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'source' }), { code: 'ENOENT' });
    await assert.rejects(buildPages({ repositoryRoot: fixture.root }), { code: 'ENOENT' });
    assert.equal(await readFile(marker, 'utf8'), 'keep');
  });
}

test('source가 생성 목록을 덮어쓰려 하면 build와 source 검사에서 거부한다', async (t) => {
  const fixture = await fixtureFor(t, unreleasedFixture());
  await writeFile(join(fixture.root, 'site/downloads.json'), '{}\n');
  await assert.rejects(buildPages({ repositoryRoot: fixture.root }), /downloads.json.*source/);
  await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'source' }), /downloads.json.*source/);
});

for (const release of [unreleasedFixture(), publishedFixture()]) {
  test(`${release.status} output 목록은 내용 변조·누락을 거부한다`, async (t) => {
    const fixture = await fixtureFor(t, release);
    await buildPages({ repositoryRoot: fixture.root });
    const path = join(fixture.root, '_site/downloads.json');
    const original = await readFile(path, 'utf8');
    await writeFile(path, original.trimEnd());
    await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'output' }), /downloads.json.*다릅니다/);
    await writeFile(path, '{}\n');
    await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'output' }), /downloads.json.*다릅니다/);
    await rm(path);
    await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'output' }), { code: 'ENOENT' });
  });
}

for (const location of ['notes file', 'notes parent', 'output catalog']) {
  test(`${location} symlink는 소유 경로 밖의 bytes를 사용할 수 없다`, async (t) => {
    const { release } = pairedData();
    const fixture = await fixtureFor(t, release);
    await buildPages({ repositoryRoot: fixture.root });
    const path = location === 'notes parent' ? join(fixture.root, 'docs/releases')
      : location === 'notes file' ? join(fixture.root, `docs/releases/${release.tag}.notes.json`)
        : join(fixture.root, '_site/downloads.json');
    const saved = join(fixture.tmp, 'saved');
    await rename(path, saved);
    try { await symlink(saved, path, location === 'notes parent' ? 'junction' : 'file'); }
    catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') { t.skip('Windows symlink privilege unavailable'); return; }
      throw error;
    }
    await assert.rejects(checkPages({ repositoryRoot: fixture.root }), /symlink/);
    if (location !== 'output catalog') await assert.rejects(buildPages({ repositoryRoot: fixture.root }), /symlink/);
  });
}

for (const [name, mutate] of [
  ['draft', (notes) => { notes.metadata.status = 'draft'; notes.metadata.publishedAt = null; }],
  ['date', (notes) => { notes.metadata.publishedAt = '2026-08-28T00:00:00Z'; }],
  ['manual asset', (notes) => { delete notes.metadata.assets['linux-x86_64-deb']; }],
]) {
  test(`${name} 원문은 source 검사·build에서 거부하고 기존 output을 보존한다`, async (t) => {
    const { release } = pairedData();
    const fixture = await fixtureFor(t, release);
    await buildPages({ repositoryRoot: fixture.root });
    const output = join(fixture.root, '_site/downloads.json');
    const before = await readFile(output);
    const path = join(fixture.root, `docs/releases/${release.tag}.notes.json`);
    const notes = JSON.parse(await readFile(path, 'utf8'));
    mutate(notes);
    await writeFile(path, JSON.stringify(notes));
    await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'source' }));
    await assert.rejects(buildPages({ repositoryRoot: fixture.root }));
    assert.deepEqual(await readFile(output), before);
  });
}

test('output 부모 symlink 경로는 외부 디렉터리를 삭제할 수 없다', async (t) => {
  const fixture = await fixtureFor(t, unreleasedFixture());
  const external = join(fixture.tmp, 'external');
  await mkdir(join(external, 'output'), { recursive: true });
  const marker = join(external, 'output/keep.txt');
  await writeFile(marker, 'keep');
  const parent = join(fixture.root, 'linked');
  try { await symlink(external, parent, 'junction'); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') { t.skip('Windows symlink privilege unavailable'); return; }
    throw error;
  }
  await assert.rejects(buildPages({ repositoryRoot: fixture.root, outputDirectory: join(parent, 'output') }), /symlink/);
  assert.equal(await readFile(marker, 'utf8'), 'keep');
});
