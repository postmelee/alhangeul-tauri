import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readSite = (path, encoding) => readFile(join(repositoryRoot, 'site', path), encoding);
const otherPlatform = ['mac', 'OS'].join('');
const approvedFamilySiteLink = `<a class="header-link" href="https://postmelee.github.io/alhangeul-${otherPlatform.toLowerCase()}/" aria-label="알한글 ${otherPlatform} 홈페이지로 이동">알한글 for ${otherPlatform}</a>`;
const screenshots = Object.freeze({
  'assets/windows-app.png': {
    width: 1030,
    height: 801,
    sha256: '9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411',
  },
  'assets/windows-editor.png': { width: 1282, height: 924, sha256: '3034cef5c00e16eda0d1a51804ab60f12d4e3594d8a9b1220061f0ef43e76c86' },
  'assets/windows-explorer.png': { width: 1180, height: 780, sha256: '460f225615e9876aea9e3aeeca382a25e2ebaf41b71105af92a8c30878c0e35d' },
  'assets/linux-explorer.png': { width: 1180, height: 780, sha256: '2182a6476a972533e726d5ee64875c92557aac26894aeaf30df4be3fcfce61f8' },
  'assets/linux-editor.png': {
    width: 1282,
    height: 924,
    sha256: 'a3d4460b8fc432f00a2ce97cd68552582b2f5dfdc88faec9f749e58be132618b',
  },
});

test('홈은 OS 선택과 데이터 기반 다운로드, 실제 화면 쌍을 제공한다', async () => {
  const html = await readSite('index.html', 'utf8');
  for (const platform of ['windows', 'linux']) {
    assert.ok(html.includes(`data-package-platform="${platform}"`));
    assert.ok(html.includes(`data-product-platform="${platform}"`));
    assert.ok(html.includes(`assets/${platform}-editor.png`));
    assert.ok(html.includes(`assets/${platform}-explorer.png`));
  }
  assert.equal([...html.matchAll(/class="download-platform-radio"/g)].length, 2);
  assert.match(html, /<h2 id="install-title">다운로드<\/h2>/);
  assert.doesNotMatch(html, /data-release-formats/);
  assert.match(html, /<noscript>[\s\S]*updates\/#latest-download/);
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
    assert.match(html, /styles\.css\?v=90-4/);
    assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(expected.canonical)}" \\/>`));
    assert.match(html, /href="https:\/\/github\.com\/postmelee\/alhangeul-tauri"/);
    for (const link of expected.links) {
      assert.match(html, new RegExp(`href="${escapeRegExp(link)}"`));
    }
    const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    assert.equal(header.split('\n').filter((line) => line.trim() === approvedFamilySiteLink).length, 1);
    assert.doesNotMatch(header, />다운로드<\/a>/);
    assert.match(footer, /class="site-footer-inner"/);
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
  assert.match(html, /<details class="download-picker" id="latest-download">/);
  assert.match(html, /<summary class="page-action-button">[\s\S]*최신 버전 다운로드[\s\S]*<svg class="download-chevron"/);
  assert.match(html, /<path d="m4 6 4 4 4-4"><\/path>/);
  assert.doesNotMatch(html, /⌄/);
  assert.match(html, /class="release-note-list"/);
  assert.match(html, /data-release-note/);
  assert.match(html, /앱에서 업데이트 확인/);
  assert.match(html, /릴리즈 노트/);
  assert.match(html, /DEB·RPM과 Linux arm64는 GitHub Releases/);
  assert.doesNotMatch(html, /설치 형식|업데이트 manifest 주소|updater\/stable\.json/);
  assert.doesNotMatch(html, /Updates &amp; installation/i);
  assert.doesNotMatch(html, /platform-card|download-action/);
  assert.doesNotMatch(html, /releases\/download\//);
});

for (const manifestPublished of [false, true]) {
  test(`published release hydration은 manifestPublished=${manifestPublished}에서 exact artifact로 전환한다`, async () => {
  const source = await readSite('script.js', 'utf8');
  const homeAction = fakeElement('A', { textContent: 'NSIS Windows x64 · 일반 설치 권장 다운로드' });
  const homeState = { dataset: { downloadState: 'home' }, textContent: '다운로드' };
  homeAction.querySelector = () => homeState;
  homeAction.dataset.downloadTarget = 'windows-x86_64-nsis';
  homeAction.href = 'updates/#latest-download';
  const msiAction = fakeElement('A', { textContent: 'MSI Windows x64 · 조직·관리 배포 다운로드' });
  const msiState = { dataset: { downloadState: 'home' }, textContent: '다운로드' };
  msiAction.querySelector = () => msiState;
  msiAction.dataset.downloadTarget = 'windows-x86_64-msi';
  const menuAction = fakeElement('SPAN', { textContent: 'Linux x64 AppImage · 준비 중' });
  menuAction.dataset.downloadTarget = 'linux-x86_64-appimage';
  const menuState = { dataset: {}, textContent: 'AppImage · 준비 중' };
  const message = { textContent: '' };
  const note = fakeElement('DIV');
  const document = {
    body: { dataset: { siteRoot: './' } },
    createElement: (tag) => {
      const element = fakeElement(tag.toUpperCase());
      if (tag.toUpperCase() === 'A') element.querySelector = () => menuState;
      return element;
    },
    querySelector: (selector) => selector === '[data-release-note]' ? note : null,
    querySelectorAll: (selector) => ({
      '[data-release-message]': [message],
      '[data-download-target]': [homeAction, msiAction, menuAction],
      '[data-copy-value]': [],
    })[selector] ?? [],
  };
  const release = {
    status: 'published',
    version: '0.2.0',
    tag: 'v0.2.0',
    downloads: {
      'windows-x86_64-nsis': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64-setup.exe',
      'windows-x86_64-msi': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64_en-US.msi',
      'linux-x86_64-appimage': 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_amd64.AppImage',
    },
    updater: { manifestPublished },
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
  assert.equal(homeState.textContent, '다운로드');
  assert.equal(msiState.textContent, '다운로드');
  assert.equal(homeAction['aria-label'], 'Windows x64 NSIS · 알한글 0.2.0 다운로드');
  assert.equal(msiAction['aria-label'], 'Windows x64 MSI · 알한글 0.2.0 다운로드');
  assert.equal(menuAction.replacement.href, release.downloads['linux-x86_64-appimage']);
  assert.equal(menuAction.replacement.dataset.downloadReady, 'true');
  assert.equal(menuState.textContent, 'AppImage · 0.2.0 다운로드');
  assert.equal(
    menuAction.replacement['aria-label'],
    'Linux x64 AppImage · 알한글 0.2.0 다운로드',
  );
  assert.doesNotMatch(menuAction.replacement['aria-label'], /준비 중/);
  assert.equal(note.replacement.href, 'https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.2.0');
  assert.match(message.textContent, /최신 버전 v0\.2\.0/);
  });
}

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

test('검증된 실제 제품 화면 자산은 고정한 크기와 SHA-256을 유지한다', async () => {
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
    '8e478814d1bcebc233adc82cbdaed0d796c8214c3c6e3fcc1fd78587702ed54d',
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

  assert.match(pages[0], /data-product-platform="linux"[^>]* hidden/);
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
  assert.match(css, /\.home-copy h1 \{[^}]*font-size: clamp\(1\.75rem, 3\.2vw, 2\.625rem\)/);
  assert.match(css, /\.headline-line \{ display: block; white-space: nowrap; \}/);
  assert.match(css, /\.product-window \{[^}]*border: 0; border-radius: 2px;/);
  for (const pattern of [/\.download-chevron \{[^}]*width: 16px; height: 16px/, /\.download-chevron path \{[^}]*stroke: currentcolor/]) assert.match(css, pattern);
  for (const pattern of [/\.updates-actions \{[^}]*flex-wrap: wrap; align-items: center; justify-content: center/, /@media \(max-width: 820px\)[\s\S]*\.updates-actions \{ justify-content: center; \}/, /@media \(max-width: 340px\)[\s\S]*\.updates-actions \{ flex-direction: column; align-items: center; \}/, /\.download-picker \.page-action-button \{ width: max-content; margin-inline: auto; \}/, /\.download-options \{ position: static; width: 100%; margin-top: 8px; transform: none; \}/]) assert.match(css, pattern);
  for (const pattern of [/\.updates-hero h1 \{[^}]*font-size: clamp\(40px, 7vw, 72px\)/, /\.updates-hero > p \{[^}]*font-size: 21px/, /\.updates-section h2 \{[^}]*font-size: 26px/, /\.feedback-contact-card h2 \{[^}]*font-size: 26px/]) assert.match(css, pattern);
  assert.match(css, /\.install-heading h2 \{[^}]*color: var\(--ink\); font-size: 17px; font-weight: 600/);
  assert.match(css, /\.download-platform-switch \{[^}]*grid-template-columns: repeat\(2, minmax\(92px, 1fr\)\)/);
  assert.match(css, /#download-platform-windows:checked ~ \.download-platform-panels \.windows-panel/);
  assert.match(css, /\.download-platform-panels \{ margin-top: 10px/);
  assert.match(css, /\.download-package-option \{[^}]*min-height: 44px;[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.download-package-copy \{[^}]*grid-template-columns: 76px minmax\(0, 1fr\)/);
  assert.match(css, /\.download-package-copy strong \{[^}]*font-size: 14px; font-weight: 650/);
  assert.match(css, /\.download-package-action \{[^}]*min-width: 76px; min-height: 32px;[^}]*background: var\(--blue\); color: white; font-size: 12px/);
  assert.match(css, /\.download-package-action:hover \{[^}]*background: var\(--blue-dark\)/);
  assert.doesNotMatch(css, /\.download-package-option:hover/);
  for (const pattern of [/\.page-action-button \{[^}]*min-height: 46px;[^}]*font-size: 16px/, /\.page-secondary-link \{[^}]*min-height: 42px;[^}]*font-size: 14px/, /\.site-footer \{[^}]*padding: 18px 0[^}]*font-size: 13px/, /\.site-footer-inner \{[^}]*width: min\(980px, calc\(100% - 40px\)\)[^}]*grid-template-columns: minmax\(140px, 1fr\)/, /\.footer-brand img \{[^}]*width: 24px; height: 24px/, /\.updates-page \+ \.site-footer \{ margin-top: 48px; \}/]) assert.match(css, pattern);
  assert.match(script, /fetch\(`\$\{siteRoot\}release\.json`/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /isExactDownload\(url, release\.tag\)/);
  assert.match(script, /state\?\.dataset\.downloadState === 'home'/);
  assert.match(script, /\['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'\]/);
});

test('Pages source는 승인된 외부 홈페이지 안내 외 지원 범위 밖 제품 표현이 없다', async () => {
  const source = [
    await readSite('index.html', 'utf8'),
    await readSite('updates/index.html', 'utf8'),
    await readSite('feedback/index.html', 'utf8'),
    await readSite('styles.css', 'utf8'),
    await readSite('script.js', 'utf8'),
  ].map((content) => content.replace(/<header[\s\S]*?<\/header>/,
    (header) => header.replace(approvedFamilySiteLink, ''))).join('\n').toLowerCase();
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
