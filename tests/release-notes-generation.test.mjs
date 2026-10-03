import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { generateReleaseNotes, parseNotesArguments } from '../scripts/releases/notes-cli.mjs';
import { renderGithubNotes } from '../scripts/releases/notes-render.mjs';
import { renderWebsiteNotes } from '../scripts/releases/website-render.mjs';
import { validateTemplates } from '../scripts/releases/notes-check.mjs';
import { releaseNotesFixture, pullRequestFixture } from './fixtures/release-note-fixtures.mjs';
import { createReleaseNotesFiles, templates } from './fixtures/release-note-files.mjs';

const execute = promisify(execFile);
const cli = new URL('../scripts/releases/notes-cli.mjs', import.meta.url);

function render(notes = releaseNotesFixture()) {
  return { github: renderGithubNotes(notes, templates.github), website: renderWebsiteNotes(notes, templates.website) };
}

test('two runs produce byte-identical files and preserve source bytes', async (t) => {
  const fixture = await createReleaseNotesFiles();
  t.after(fixture.cleanup);
  const before = await readFile(fixture.notesFile);
  const options = { repositoryRoot: fixture.root, version: fixture.notes.metadata.version };
  const first = await generateReleaseNotes({ ...options, outputDirectory: join(fixture.tmp, 'first') });
  const second = await generateReleaseNotes({ ...options, outputDirectory: join(fixture.tmp, 'second') });
  for (const name of first.files) {
    assert.deepEqual(await readFile(join(first.outputDirectory, name)), await readFile(join(second.outputDirectory, name)));
    assert.equal((await readFile(join(first.outputDirectory, name), 'utf8')).includes('\r'), false);
  }
  assert.deepEqual(await readFile(fixture.notesFile), before);
  assert.equal(await readFile(join(first.outputDirectory, 'updater-notes.txt'), 'utf8'), `${fixture.notes.content.updaterSummary}\n`);
  assert.notEqual(await readFile(join(first.outputDirectory, 'release-body.md'), 'utf8'), fixture.notes.content.updaterSummary);
});

test('all six download links use the exact release tag, and metadata retains source and pin', () => {
  const notes = releaseNotesFixture();
  const output = render(notes);
  for (const asset of Object.values(notes.metadata.assets)) {
    assert.ok(output.github.includes(`](${asset.url})`));
    assert.ok(output.website.includes(`href="${asset.url}"`));
    assert.ok(output.github.includes(asset.sha256));
  }
  assert.ok(output.github.includes(notes.metadata.sourceSha));
  assert.ok(output.github.includes(notes.metadata.rhwp.commit));
  assert.ok(output.website.includes('data-release-version="0.2.0"'));
  assert.ok(output.website.includes('/releases/tag/v0.2.0'));
  assert.doesNotMatch(output.github, /Homebrew|Sparkle/);
});

test('untrusted inline Markdown and HTML attribute characters remain literal text', () => {
  const notes = releaseNotesFixture();
  notes.content.summary = ['A & "quote" [link](javascript:alert(1)) ![image](https://invalid.example)'];
  const output = render(notes);
  assert.ok(output.github.includes('\\[link\\]\\(javascript:alert\\(1\\)\\)'));
  assert.ok(output.github.includes('\\!\\[image\\]'));
  assert.ok(output.website.includes('A &amp; &quot;quote&quot;'));
  assert.doesNotMatch(output.website, /href="javascript:|src="https:\/\/invalid/);
});

test('only summary-included app PRs appear in the main PR section; open Issue stays related', () => {
  const notes = releaseNotesFixture();
  notes.content.references.pullRequests.push(pullRequestFixture({
    number: 9, url: 'https://github.com/postmelee/alhangeul-tauri/pull/9', category: 'operations', summaryIncluded: false,
  }));
  const output = render(notes).github;
  assert.ok(output.includes('[#8 '));
  assert.doesNotMatch(output, /\[#9 /);
  assert.match(output, /### 해결된 Issue\n\n- 없음/);
  assert.match(output, /### 참고\/연관 Issue\n\n- \[#7 /);
});

test('publication date uses actual UTC instant converted to KST without host timezone', () => {
  const notes = releaseNotesFixture();
  notes.metadata.publishedAt = '2026-08-27T17:30:00Z';
  const output = render(notes).website;
  assert.ok(output.includes('<time datetime="2026-08-27T17:30:00Z">2026-08-28 KST</time>'));
});

test('draft does not invent a publication date', () => {
  const notes = releaseNotesFixture();
  notes.metadata.status = 'draft';
  notes.metadata.publishedAt = null;
  const output = render(notes);
  assert.match(output.website, /공개 전 검토용/);
  assert.doesNotMatch(output.website, /<time /);
  assert.match(output.github, /미게시/);
});

test('CRLF templates produce identical LF output', () => {
  const notes = releaseNotesFixture();
  assert.equal(renderGithubNotes(notes, templates.github.replaceAll('\n', '\r\n')), render(notes).github);
  assert.equal(renderWebsiteNotes(notes, templates.website.replaceAll('\n', '\r\n')), render(notes).website);
});

for (const [label, key, transform] of [
  ['unknown token', 'github', (value) => value.replace('{{summary}}', '{{unknown}}')],
  ['missing token', 'website', (value) => value.replace('{{downloadLinks}}', '')],
  ['malformed token', 'github', (value) => value.replace('{{summary}}', '{{ summary }}')],
  ['GitHub heading', 'github', (value) => value.replace('### 알한글 앱 변화', '### 다른 제목')],
  ['web heading', 'website', (value) => value.replace('>변경 요약</h2>', '>다른 제목</h2>')],
  ['duplicate marker', 'github', (value) => `${value}\n<!-- release-body-template:start -->`],
]) test(`template contract rejects ${label} even before any version document exists`, () => {
  assert.throws(() => validateTemplates({ ...templates, [key]: transform(templates[key]) }), /token|heading|marker/);
});

for (const args of [
  ['generate', '--version', '../0.2.0', '--output-dir', 'out'],
  ['generate', '--version', '0.2.0\\evil', '--output-dir', 'out'],
  ['generate', '--version', '0.2.0', '--version', '0.2.0', '--output-dir', 'out'],
  ['check', '--output-dir', 'out'], ['generate', '--version', '0.2.0'], ['check', '--bad'],
]) test(`CLI rejects ambiguous or unsafe arguments ${args.join(' ')}`, () => {
  assert.throws(() => parseNotesArguments(args));
});

test('CLI accepts Windows path arguments as single values without shell reinterpretation', () => {
  const parsed = parseNotesArguments(['generate', '--', '--version', '0.2.0', '--output-dir', 'C:\\release notes\\review']);
  assert.equal(parsed.outputDirectory, 'C:\\release notes\\review');
});

test('CLI can read explicit input and output paths containing spaces', async (t) => {
  const fixture = await createReleaseNotesFiles();
  t.after(fixture.cleanup);
  const input = join(fixture.tmp, 'approved input.json');
  await writeFile(input, await readFile(fixture.notesFile));
  const output = join(fixture.tmp, 'review output');
  const result = await execute(process.execPath, [fileURLToPath(cli), 'generate', '--root', fixture.root,
    '--version', '0.2.0', '--input', input, '--output-dir', output]);
  assert.match(result.stdout, /Release notes generated/);
  assert.ok((await lstat(join(output, 'release-body.md'))).isFile());
  await assert.rejects(execute(process.execPath, [fileURLToPath(cli), 'generate', '--root', fixture.root,
    '--version', '0.1.0', '--input', input, '--output-dir', join(fixture.tmp, 'wrong')]), /version/);
});
