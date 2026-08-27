import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readSite = (path, encoding) => readFile(join(repositoryRoot, 'site', path), encoding);
const screenshots = Object.freeze({
  'assets/windows-app.png': {
    width: 1030,
    height: 801,
    sha256: '9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411',
  },
  'assets/linux-editor.png': {
    width: 1280,
    height: 900,
    sha256: 'a9e9c9889d28e3fc465938fd3b311210bcf92a37346f10952903fa0574c3b14c',
  },
});

test('홈은 한 화면 설치 안내와 개별 페이지 탐색 계약을 지킨다', async () => {
  const html = await readSite('index.html', 'utf8');
  for (const marker of [
    'class="home-main"',
    'class="home-shell"',
    'class="install-grid"',
    'href="updates/"',
    'href="feedback/"',
    'href="https://github.com/postmelee/alhangeul-tauri"',
  ]) assert.match(html, new RegExp(escapeRegExp(marker)));

  assert.equal([...html.matchAll(/class="install-link(?: [^"]+)?"/g)].length, 5);
  for (const target of [
    'updates/#windows-nsis',
    'updates/#windows-msi',
    'updates/#linux-appimage',
    'updates/#linux-packages',
    'updates/#linux-arm64',
  ]) assert.match(html, new RegExp(`href="${escapeRegExp(target)}"`));

  assert.doesNotMatch(html, /Windows &amp; Linux · Open source/);
  assert.match(html, /HWP\/HWPX/);
  assert.match(html, /<h2 id="install-title">다운로드<\/h2>/);
  assert.match(html, /Windows x64 · NSIS/);
  assert.match(html, /Linux x64 · AppImage/);
  assert.match(html, /<footer class="site-footer">/);
  assert.equal([...html.matchAll(/class="headline-line"/g)].length, 3);
  assert.match(html, /<span class="headline-line">더 이상 <em>낯선 문서<\/em>가<\/span>/);
  assert.doesNotMatch(html, /<nav[^>]*>[\s\S]*?>다운로드<\/a>/);
  assert.equal([...html.matchAll(/<a[^>]+data-download-target=/g)].length, 3);
  assert.doesNotMatch(html, /releases\/download\//);
});

test('홈·업데이트·문의 페이지는 승인된 메뉴와 공유 메타데이터를 제공한다', async () => {
  const pages = {
    'index.html': {
      canonical: 'https://postmelee.github.io/alhangeul-tauri/',
      links: ['updates/', 'feedback/'],
    },
    'updates/index.html': {
      canonical: 'https://postmelee.github.io/alhangeul-tauri/updates/',
      links: ['../', '../feedback/'],
    },
    'feedback/index.html': {
      canonical: 'https://postmelee.github.io/alhangeul-tauri/feedback/',
      links: ['../', '../updates/'],
    },
  };

  for (const [path, expected] of Object.entries(pages)) {
    const html = await readSite(path, 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+" \/>/);
    assert.match(html, /<meta property="og:image" content="https:\/\/postmelee\.github\.io\/alhangeul-tauri\/assets\/og-main\.png" \/>/);
    assert.match(html, /styles\.css\?v=45-3-5-1/);
    assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(expected.canonical)}" \\/>`));
    assert.match(html, /href="https:\/\/github\.com\/postmelee\/alhangeul-tauri"/);
    for (const link of expected.links) {
      assert.match(html, new RegExp(`href="${escapeRegExp(link)}"`));
    }
    const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    assert.doesNotMatch(header, />다운로드<\/a>/);
    assert.match(footer, /class="site-footer"/);
    assert.match(footer, />MIT License<\/a>/);
    assert.doesNotMatch(footer, />rhwp<\/a>/);
  }
});

test('업데이트 페이지는 MSI·NSIS·AppImage와 수동 설치 범위를 fail-closed로 안내한다', async () => {
  const html = await readSite('updates/index.html', 'utf8');
  assert.equal([...html.matchAll(/data-download-target=/g)].length, 3);
  for (const target of [
    'windows-x86_64-nsis',
    'windows-x86_64-msi',
    'linux-x86_64-appimage',
  ]) {
    assert.match(html, new RegExp(`<span[^>]+data-download-target="${target}"`));
  }
  assert.match(html, /<details class="download-picker">/);
  assert.match(html, /<summary class="page-action-button">[\s\S]*최신 버전 다운로드[\s\S]*<svg class="download-chevron"/);
  assert.match(html, /<path d="m4 6 4 4 4-4"><\/path>/);
  assert.doesNotMatch(html, /⌄/);
  assert.match(html, /class="release-note-list"/);
  assert.match(html, /data-release-note/);
  assert.match(html, /앱에서 업데이트 확인/);
  assert.match(html, /설치 형식/);
  assert.match(html, /릴리즈 노트/);
  assert.doesNotMatch(html, /Updates &amp; installation/i);
  assert.doesNotMatch(html, /platform-card|download-action/);
  for (const id of [
    'windows-nsis',
    'windows-msi',
    'linux-appimage',
    'linux-packages',
    'linux-arm64',
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /Linux x64 DEB · RPM/);
  assert.match(html, /Linux arm64 DEB/);
  assert.match(html, /Linux x64 AppImage/);
  assert.match(html, /지금은 manifest가 존재하지 않습니다/);
  assert.match(html, /https:\/\/postmelee\.github\.io\/alhangeul-tauri\/updater\/stable\.json/);
  assert.doesNotMatch(html, /releases\/download\//);
});

test('published release hydration은 홈과 dropdown을 exact artifact로 직접 전환한다', async () => {
  const source = await readSite('script.js', 'utf8');
  const homeAction = fakeElement('A', { textContent: 'Windows x64 NSIS · 일반 설치' });
  homeAction.dataset.downloadTarget = 'windows-x86_64-nsis';
  homeAction.href = 'updates/#windows-nsis';
  const menuAction = fakeElement('SPAN', { textContent: 'Linux x64 AppImage · 준비 중' });
  menuAction.dataset.downloadTarget = 'linux-x86_64-appimage';
  const message = { textContent: '' };
  const note = fakeElement('DIV');
  const document = {
    body: { dataset: { siteRoot: './' } },
    createElement: (tag) => fakeElement(tag.toUpperCase()),
    querySelector: (selector) => selector === '[data-release-note]' ? note : null,
    querySelectorAll: (selector) => ({
      '[data-release-message]': [message],
      '[data-download-target]': [homeAction, menuAction],
      '[data-copy-value]': [],
    })[selector] ?? [],
  };
  const release = {
    status: 'published',
    version: '0.2.0',
    tag: 'v0.2.0',
    downloads: {
      'windows-x86_64-nsis': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64-setup.exe',
      'windows-x86_64-msi': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64.msi',
      'linux-x86_64-appimage': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_amd64.AppImage',
    },
    updater: { manifestPublished: false },
  };

  runInNewContext(source, {
    document,
    fetch: async () => ({ ok: true, json: async () => release }),
    URL,
    window: { setTimeout },
    navigator: {},
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(homeAction.href, release.downloads['windows-x86_64-nsis']);
  assert.equal(homeAction.dataset.downloadReady, 'true');
  assert.equal(menuAction.replacement.href, release.downloads['linux-x86_64-appimage']);
  assert.equal(menuAction.replacement.dataset.downloadReady, 'true');
  assert.equal(note.replacement.href, 'https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.2.0');
  assert.match(message.textContent, /0\.2\.0 안정 릴리스/);
});

test('문의 페이지는 개인정보 안내와 이메일·Issue 경로를 제공한다', async () => {
  const html = await readSite('feedback/index.html', 'utf8');
  assert.match(html, /class="updates-page feedback-page"/);
  assert.match(html, /class="updates-hero feedback-hero"/);
  assert.match(html, /class="feedback-privacy-note"/);
  assert.match(html, /class="feedback-card-grid"/);
  assert.equal([...html.matchAll(/class="feedback-contact-card"/g)].length, 2);
  assert.match(html, /class="feedback-github-mark"/);
  assert.match(html, /민감한 정보 안내/);
  assert.match(html, /alhangeul\.feedback@gmail\.com/);
  assert.match(html, /data-copy-value="alhangeul\.feedback@gmail\.com"/);
  assert.match(html, /href="mailto:alhangeul\.feedback@gmail\.com/);
  assert.match(html, /href="https:\/\/github\.com\/postmelee\/alhangeul-tauri\/issues"/);
  assert.match(html, /rhwp upstream으로 분류/);
});

test('홈에 쓰는 실제 제품 화면은 고정한 크기와 SHA-256을 유지한다', async () => {
  for (const [path, expected] of Object.entries(screenshots)) {
    const png = await readSite(path);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), expected.width, `${path} width`);
    assert.equal(png.readUInt32BE(20), expected.height, `${path} height`);
    assert.equal(createHash('sha256').update(png).digest('hex'), expected.sha256, path);
  }
});

test('소셜 공유 이미지는 홈을 담는 16:9 PNG로 고정한다', async () => {
  const png = await readSite('assets/og-main.png');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1920);
  assert.equal(png.readUInt32BE(20), 1080);
  assert.equal(
    createHash('sha256').update(png).digest('hex'),
    '1feb86c3419bf146daacf9cda79b0be262c162cbf168d0ddac41e35978319ac0',
  );
});

test('홈은 일반 화면에서 스크롤을 막고 작은 화면 fallback과 모션 감소를 지원한다', async () => {
  const pages = [
    await readSite('index.html', 'utf8'),
    await readSite('updates/index.html', 'utf8'),
    await readSite('feedback/index.html', 'utf8'),
  ];
  const css = await readSite('styles.css', 'utf8');
  const script = await readSite('script.js', 'utf8');

  for (const html of pages) assert.doesNotMatch(html, /\shidden(?:\s|=|>)/);
  assert.match(css, /body > main \{ flex: 1 0 auto; \}/);
  assert.match(css, /\.home-page \{ height: 100dvh; overflow: hidden; \}/);
  assert.match(css, /\.home-main \{ min-height: 0;[^}]*overflow: hidden; \}/);
  assert.match(css, /\.home-product \{ display: none; \}/);
  assert.match(css, /@media \(max-height: 699px\).*\.home-page \{[^}]*overflow: auto; \}/s);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(css, /--quick: 90ms/);
  assert.match(css, /--standard: 280ms/);
  assert.match(css, /translateY\(12px\)/);
  assert.match(css, /font-family: system-ui, sans-serif/);
  assert.match(css, /\.home-copy h1 \{[^}]*font-size: clamp\(3rem, 4\.45vw, 3\.75rem\)/);
  assert.match(css, /\.headline-line \{ display: block; white-space: nowrap; \}/);
  assert.match(css, /\.download-chevron \{[^}]*width: 16px; height: 16px/);
  assert.match(css, /\.download-chevron path \{[^}]*stroke: currentcolor/);
  assert.match(css, /\.updates-actions \{[^}]*flex-wrap: wrap; align-items: center; justify-content: center/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.updates-actions \{ justify-content: center; \}/);
  assert.match(css, /@media \(max-width: 340px\)[\s\S]*\.updates-actions \{ flex-direction: column; align-items: center; \}/);
  assert.match(css, /\.download-picker \.page-action-button \{ width: max-content; margin-inline: auto; \}/);
  assert.match(css, /\.download-options \{ position: static; width: 100%; margin-top: 8px; transform: none; \}/);
  assert.match(css, /\.updates-hero h1 \{[^}]*font-size: clamp\(40px, 7vw, 72px\)/);
  assert.match(css, /\.updates-hero > p \{[^}]*font-size: 21px/);
  assert.match(css, /\.updates-section h2 \{[^}]*font-size: 26px/);
  assert.match(css, /\.feedback-contact-card h2 \{[^}]*font-size: 26px/);
  assert.match(css, /\.install-heading h2 \{[^}]*font-size: 17px/);
  assert.match(css, /\.install-link strong \{[^}]*font-size: 15px/);
  assert.match(css, /\.install-link span \{[^}]*font-size: 13px/);
  assert.match(css, /\.page-action-button \{[^}]*min-height: 46px;[^}]*font-size: 16px/);
  assert.match(css, /\.page-secondary-link \{[^}]*min-height: 42px;[^}]*font-size: 14px/);
  assert.match(css, /\.site-footer \{[^}]*grid-template-columns: minmax\(140px, 1fr\)[^}]*padding: 18px[^}]*font-size: 13px/);
  assert.match(css, /\.footer-brand img \{[^}]*width: 24px; height: 24px/);
  assert.match(css, /\.updates-page \+ \.site-footer \{ margin-top: 48px; \}/);
  assert.match(script, /fetch\(`\$\{siteRoot\}release\.json`/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /isExactDownload\(url, release\.tag\)/);
});

test('Pages source에는 지원 범위 밖 제품 표현이 없다', async () => {
  const source = [
    await readSite('index.html', 'utf8'),
    await readSite('updates/index.html', 'utf8'),
    await readSite('feedback/index.html', 'utf8'),
    await readSite('styles.css', 'utf8'),
    await readSite('script.js', 'utf8'),
  ].join('\n').toLowerCase();
  const forbidden = [
    ['thumb', 'nail'],
    ['quick', ' look'],
    ['find', 'er'],
    ['mac', 'book'],
    ['d', 'mg'],
    ['mac', 'os'],
  ].map((parts) => parts.join(''));
  for (const word of forbidden) assert.equal(source.includes(word), false, word);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fakeElement(tagName, options = {}) {
  return {
    tagName,
    className: '',
    dataset: {},
    innerHTML: '',
    textContent: options.textContent ?? '',
    children: [],
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    querySelector() { return null; },
    replaceWith(value) { this.replacement = value; },
    append(...values) { this.children.push(...values); },
  };
}
