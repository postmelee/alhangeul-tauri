import assert from 'node:assert/strict';
import { mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { buildPages } from '../scripts/build-pages.mjs';
import { checkPages } from '../scripts/check-pages.mjs';
import { checkReleaseNotes } from '../scripts/releases/notes-check.mjs';
import { generateReleaseNotes } from '../scripts/releases/notes-cli.mjs';
import { renderWebsiteNotes } from '../scripts/releases/website-render.mjs';
import { releaseNotesFixture } from './fixtures/release-note-fixtures.mjs';
import { installPublishedNotes } from './fixtures/pages-package-fixtures.mjs';
import { createReleaseNotesFiles, templates } from './fixtures/release-note-files.mjs';
import { createPagesFixture, publishedFixture, publishedManifestFixture, unreleasedFixture } from './fixtures/pages-release-fixtures.mjs';

async function fixtureFor(t, options) {
  const fixture = await createReleaseNotesFiles(options);
  t.after(fixture.cleanup);
  return fixture;
}

async function saveNotes(fixture) {
  await writeFile(fixture.notesFile, `${JSON.stringify(fixture.notes)}\n`);
}

for (const release of [unreleasedFixture(), publishedFixture(), publishedManifestFixture()]) {
  test(`Pages state with matching published notes ${release.status}, manifest=${release.updater.manifestPublished} remains valid`, async (t) => {
    const fixture = await createPagesFixture(release);
    t.after(fixture.cleanup);
    assert.equal((await checkReleaseNotes({ repositoryRoot: fixture.root })).documents, release.status === 'published' ? 1 : 0);
    await buildPages({ repositoryRoot: fixture.root });
    assert.equal((await checkPages({ repositoryRoot: fixture.root })).length, 2);
  });
}

test('published notes are verified in source and in output with normalized root assets', async (t) => {
  const fixture = await fixtureFor(t);
  assert.equal((await checkReleaseNotes({ repositoryRoot: fixture.root })).documents, 1);
  await buildPages({ repositoryRoot: fixture.root });
  await checkPages({ repositoryRoot: fixture.root });
  const output = await readFile(join(fixture.root, '_site/updates/v0.2.0.html'), 'utf8');
  assert.ok(output.includes('href="../assets/logo/favicon.ico"'));
  assert.doesNotMatch(output, /\.\.\/\.\.\/assets/);
});

for (const label of ['source page', 'notes', 'template']) {
  test(`Pages build rejects ${label} drift before deleting existing output`, async (t) => {
    const fixture = await fixtureFor(t);
    await mkdir(join(fixture.root, '_site'));
    const marker = join(fixture.root, '_site/preserved.txt');
    await writeFile(marker, 'keep');
    if (label === 'source page') await writeFile(fixture.pageFile, 'changed');
    if (label === 'notes') {
      fixture.notes.content.summary = ['승인 원문을 변경했습니다.'];
      await saveNotes(fixture);
    }
    if (label === 'template') await writeFile(join(fixture.root, 'mydocs/_templates/website_release_note.html'),
      templates.website.replace('릴리즈 주요 링크', '다운로드 링크'));
    await assert.rejects(buildPages({ repositoryRoot: fixture.root }), /drift/);
    assert.equal(await readFile(marker, 'utf8'), 'keep');
  });
}

test('check:pages rejects tampered output independently of source', async (t) => {
  const fixture = await fixtureFor(t);
  await buildPages({ repositoryRoot: fixture.root });
  await writeFile(join(fixture.root, '_site/updates/v0.2.0.html'), 'tampered');
  await assert.rejects(checkPages({ repositoryRoot: fixture.root, mode: 'output' }), /drift/);
});

test('published document requires a web page, and page requires matching source', async (t) => {
  const fixture = await fixtureFor(t);
  await rm(fixture.pageFile);
  await assert.rejects(checkReleaseNotes({ repositoryRoot: fixture.root }), /drift/);
  await writeFile(fixture.pageFile, renderWebsiteNotes(fixture.notes, templates.website));
  await rm(fixture.notesFile);
  await assert.rejects(checkReleaseNotes({ repositoryRoot: fixture.root }), /대응하는 원문/);
});

test('source filename cannot misrepresent metadata version', async (t) => {
  const fixture = await fixtureFor(t);
  await rename(fixture.notesFile, join(fixture.root, 'docs/releases/v0.3.0.notes.json'));
  await assert.rejects(checkReleaseNotes({ repositoryRoot: fixture.root }), /파일명/);
});

test('a draft source may be reviewed but cannot appear in the public Pages tree', async (t) => {
  const notes = releaseNotesFixture();
  notes.metadata.status = 'draft'; notes.metadata.publishedAt = null;
  const fixture = await fixtureFor(t, { notes, release: publishedFixture() });
  // The live release fixture must represent a different version from the draft.
  fixture.release.version = '0.1.0'; fixture.release.tag = 'v0.1.0';
  for (const target of Object.keys(fixture.release.downloads)) {
    fixture.release.downloads[target] = fixture.release.downloads[target].replaceAll('0.2.0', '0.1.0');
  }
  await writeFile(join(fixture.root, 'site/release.json'), JSON.stringify(fixture.release));
  await checkReleaseNotes({ repositoryRoot: fixture.root });
  await writeFile(fixture.pageFile, renderWebsiteNotes(notes, templates.website));
  await assert.rejects(checkReleaseNotes({ repositoryRoot: fixture.root }), /draft/);
});

for (const [label, transform] of [
  ['short notes', (release) => { release.notes = '다른 요약'; }],
  ['date', (release) => { release.publishedAt = '2026-08-28T00:00:00Z'; }],
  ['source', (release) => { release.updater.inventory.sourceSha = 'c'.repeat(40); }],
  ['signature', (release) => { release.updater.inventory.keyFingerprint = 'e'.repeat(64); }],
]) test(`current site data must match approved ${label}`, async (t) => {
  const fixture = await fixtureFor(t);
  transform(fixture.release);
  await writeFile(join(fixture.root, 'site/release.json'), JSON.stringify(fixture.release));
  await assert.rejects(checkReleaseNotes({ repositoryRoot: fixture.root }), /다릅니다/);
});

test('a newer release note does not silently change older live release data', async (t) => {
  const release = publishedFixture();
  release.version = '0.1.0'; release.tag = 'v0.1.0';
  for (const target of Object.keys(release.downloads)) release.downloads[target] = release.downloads[target].replaceAll('0.2.0', '0.1.0');
  const fixture = await fixtureFor(t, { release });
  await installPublishedNotes(fixture.root, release);
  const before = await readFile(join(fixture.root, 'site/release.json'));
  await buildPages({ repositoryRoot: fixture.root });
  await checkPages({ repositoryRoot: fixture.root });
  assert.deepEqual(await readFile(join(fixture.root, 'site/release.json')), before);
});

test('manifestPublished=false permits notes without activating a manifest', async (t) => {
  const notes = releaseNotesFixture();
  const release = publishedFixture(); release.notes = notes.content.updaterSummary;
  const fixture = await fixtureFor(t, { notes, release });
  await buildPages({ repositoryRoot: fixture.root });
  await checkPages({ repositoryRoot: fixture.root });
  await assert.rejects(readFile(join(fixture.root, '_site/updater/stable.json')), { code: 'ENOENT' });
});

test('generation refuses existing output and preserves its files', async (t) => {
  const fixture = await fixtureFor(t);
  const output = join(fixture.tmp, 'existing');
  await mkdir(output); await writeFile(join(output, 'keep.txt'), 'keep');
  await assert.rejects(generateReleaseNotes({ repositoryRoot: fixture.root, version: '0.2.0', outputDirectory: output }), /덮어쓸/);
  assert.equal(await readFile(join(output, 'keep.txt'), 'utf8'), 'keep');
});

async function makeSymlink(t, target, path, type) {
  try { await symlink(target, path, type); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') { t.skip('Windows file symlink privilege unavailable'); return false; }
    throw error;
  }
  return true;
}

for (const location of ['source', 'template parent', 'output', 'output parent', 'explicit input']) {
  test(`symlink cannot redirect ${location}`, async (t) => {
    const fixture = await fixtureFor(t);
    let action;
    if (location === 'source') {
      const saved = join(fixture.tmp, 'input.json'); await rename(fixture.notesFile, saved);
      if (!await makeSymlink(t, saved, fixture.notesFile, 'file')) return;
      action = () => checkReleaseNotes({ repositoryRoot: fixture.root });
    } else if (location === 'template parent') {
      const saved = join(fixture.tmp, 'templates'); await rename(join(fixture.root, 'mydocs/_templates'), saved);
      if (!await makeSymlink(t, saved, join(fixture.root, 'mydocs/_templates'), 'junction')) return;
      action = () => checkReleaseNotes({ repositoryRoot: fixture.root });
    } else {
      const output = join(fixture.tmp, 'review');
      let input;
      let destination = output;
      if (location === 'explicit input') {
        input = join(fixture.tmp, 'linked.json');
        if (!await makeSymlink(t, fixture.notesFile, input, 'file')) return;
      } else if (location === 'output parent') {
        const parent = join(fixture.root, 'redirected');
        if (!await makeSymlink(t, fixture.tmp, parent, 'junction')) return;
        destination = join(parent, 'review');
      } else if (!await makeSymlink(t, fixture.tmp, output, 'junction')) return;
      action = () => generateReleaseNotes({ repositoryRoot: fixture.root, version: '0.2.0', outputDirectory: destination, input });
    }
    await assert.rejects(action(), /symlink|덮어쓸/);
  });
}
