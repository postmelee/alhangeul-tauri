import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { publishedFixture } from './fixtures/pages-release-fixtures.mjs';

const script = await readFile(new URL('../site/script.js', import.meta.url), 'utf8');

function element(tag = 'DIV') {
  return {
    tagName: tag, dataset: {}, children: [], hidden: false, removed: false,
    remove() { this.removed = true; },
    append(...children) { this.children.push(...children); },
    replaceWith(replacement) { this.replacement = replacement; },
    querySelector() { return null; },
  };
}

async function hydrate(options = {}) {
  const note = element();
  const local = element('A');
  const title = element('STRONG'); title.textContent = '알한글 v0.1.1';
  local.querySelector = () => title;
  const message = element(); message.hidden = true;
  const release = options.release ?? publishedFixture();
  const document = {
    body: { dataset: { siteRoot: '../', releaseVersion: options.pageVersion ?? '0.1.1', releaseStatus: options.pageStatus ?? 'published' } },
    createElement: (tag) => element(tag.toUpperCase()),
    querySelector: (selector) => {
      if (selector === '[data-release-note]') return note;
      if (selector === '[data-version-status]') return message;
      if (selector === '[data-release-note-version="0.1.1"]') return local;
      return null;
    },
    querySelectorAll: () => [],
  };
  runInNewContext(script, { document, URL, navigator: {}, window: { setTimeout },
    fetch: async () => {
      if (options.fail) throw new Error('offline');
      return { ok: true, json: async () => release };
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { note, local, title, message };
}

function releaseAt(version) {
  const release = publishedFixture();
  release.version = version; release.tag = `v${version}`;
  return release;
}

test('a higher version page never becomes latest merely because its file exists', async () => {
  const result = await hydrate({ release: releaseAt('0.1.0') });
  assert.equal(result.title.textContent, '알한글 v0.1.1');
  assert.equal(result.note.replacement.href, 'https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.0');
  assert.match(result.message.textContent, /이 안내는 v0\.1\.1.*최신 버전은 v0\.1\.0/);
  assert.equal(result.message.hidden, false);
});

test('matching live version uses existing local note and removes duplicate latest row from view', async () => {
  const result = await hydrate({ release: releaseAt('0.1.1') });
  assert.equal(result.note.removed, true);
  assert.equal(result.note.replacement, undefined);
  assert.equal(result.title.textContent, '알한글 v0.1.1 · 최신 버전');
  assert.equal(result.message.textContent, '사이트의 최신 버전입니다.');
});

test('a newer live version without a local page links to its exact GitHub Release', async () => {
  const result = await hydrate({ release: releaseAt('0.2.0') });
  assert.equal(result.note.replacement.href, 'https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.2.0');
  assert.match(result.message.textContent, /이 안내는 v0\.1\.1.*최신 버전은 v0\.2\.0/);
  assert.equal(result.title.textContent, '알한글 v0.1.1');
});

for (const [label, options] of [
  ['unreleased', { release: { status: 'unreleased' } }],
  ['malformed version', { release: { status: 'published', version: '../0.1.1' } }],
  ['offline', { fail: true }],
]) test(`${label} cannot invent a latest version or hide the existing static note`, async () => {
  const result = await hydrate(options);
  assert.equal(result.note.removed, false);
  assert.equal(result.note.replacement, undefined);
  assert.equal(result.title.textContent, '알한글 v0.1.1');
  assert.equal(result.message.hidden, true);
});

test('draft review HTML does not announce itself as the published latest version', async () => {
  const result = await hydrate({ release: releaseAt('0.1.1'), pageStatus: 'draft' });
  assert.equal(result.message.hidden, true);
});

test('the local release entry and version page retain exact version links and sections', async () => {
  const index = await readFile(new URL('../site/updates/index.html', import.meta.url), 'utf8');
  const page = await readFile(new URL('../site/updates/v0.1.1.html', import.meta.url), 'utf8');
  assert.match(index, /href="\.\/v0\.1\.1\.html" data-release-note-version="0\.1\.1"/);
  assert.doesNotMatch(index, /첫 공개 릴리스 검증이 끝나면/);
  assert.match(page, /이 버전 다운로드/);
  assert.match(page, /href="\.\/#latest-download"/);
  assert.match(page, /releases\/tag\/v0\.1\.1/);
  assert.match(page, /datetime="2026-10-03T17:07:44Z">2026-10-04 KST/);
  assert.equal([...page.matchAll(/<h2 /g)].length, 5);
});
