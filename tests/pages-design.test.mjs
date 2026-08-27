import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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

  assert.match(html, /Windows &amp; Linux/);
  assert.match(html, /HWP\/HWPX/);
  assert.doesNotMatch(html, /<nav[^>]*>[\s\S]*?>다운로드<\/a>/);
  assert.doesNotMatch(html, /<a[^>]+data-download-target=/);
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
    assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(expected.canonical)}" \\/>`));
    assert.match(html, /href="https:\/\/github\.com\/postmelee\/alhangeul-tauri"/);
    for (const link of expected.links) {
      assert.match(html, new RegExp(`href="${escapeRegExp(link)}"`));
    }
    const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    assert.doesNotMatch(header, />다운로드<\/a>/);
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
  for (const id of [
    'windows-nsis',
    'windows-msi',
    'linux-appimage',
    'linux-packages',
    'linux-arm64',
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /x64 DEB · RPM/);
  assert.match(html, /arm64 DEB/);
  assert.match(html, /AppImage만 stable updater 대상/);
  assert.match(html, /지금은 manifest가 존재하지 않습니다/);
  assert.match(html, /https:\/\/postmelee\.github\.io\/alhangeul-tauri\/updater\/stable\.json/);
  assert.doesNotMatch(html, /releases\/download\//);
});

test('문의 페이지는 개인정보 안내와 이메일·Issue 경로를 제공한다', async () => {
  const html = await readSite('feedback/index.html', 'utf8');
  assert.match(html, /class="privacy-notice"/);
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
    'f2f382f15c5ce58e7516b9eedee362741828ca220e43e8260791828f77d5c2b3',
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
  assert.match(css, /\.home-page \{ overflow: hidden; \}/);
  assert.match(css, /\.home-main \{ height: calc\(100dvh - 53px\)/);
  assert.match(css, /\.home-product \{ display: none; \}/);
  assert.match(css, /@media \(max-height: 699px\).*\.home-page \{ overflow: auto; \}/s);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(css, /--quick: 90ms/);
  assert.match(css, /--standard: 280ms/);
  assert.match(css, /translateY\(12px\)/);
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
