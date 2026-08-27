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
  'assets/linux-drag-in.png': {
    width: 1280,
    height: 900,
    sha256: 'ee021b47b66e8a6069f2eec918a27153c8a15df4a22c3a37e82d275f2131cbd7',
  },
  'assets/linux-pdf.png': {
    width: 1280,
    height: 900,
    sha256: '3b646ac975aa4b3720add31dcef78a9b42b87a8e4260d3e8825581db947df742',
  },
});

test('Pages 홈은 승인된 제품·릴리스 정보 계층을 제공한다', async () => {
  const html = await readSite('index.html', 'utf8');
  for (const marker of [
    '<main id="main">',
    'id="features"',
    'id="download"',
    'class="faq-section section"',
    'class="manifesto section"',
    'id="feedback"',
    'data-download-target="windows-x86_64-nsis"',
    'data-download-target="windows-x86_64-msi"',
    'data-download-target="linux-x86_64-appimage"',
  ]) assert.match(html, new RegExp(escapeRegExp(marker)));

  assert.match(html, /Windows와 Linux/);
  assert.match(html, /HWP와 HWPX/);
  assert.match(html, /Linux x64 자동 업데이트/);
  assert.doesNotMatch(html, /releases\/download\//);
  assert.doesNotMatch(html, /<a[^>]+data-download-target=/);
});

test('실제 제품 화면은 고정한 크기와 SHA-256을 유지한다', async () => {
  for (const [path, expected] of Object.entries(screenshots)) {
    const png = await readSite(path);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), expected.width, `${path} width`);
    assert.equal(png.readUInt32BE(20), expected.height, `${path} height`);
    assert.equal(createHash('sha256').update(png).digest('hex'), expected.sha256, path);
  }
});

test('소셜 공유 이미지는 최종 히어로를 16:9 PNG로 고정한다', async () => {
  const png = await readSite('assets/og-main.png');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1920);
  assert.equal(png.readUInt32BE(20), 1080);
  assert.equal(
    createHash('sha256').update(png).digest('hex'),
    'f6718a0927ba056acb5e54e5067964eb370b500968ebee6d0fa3b197a924024f',
  );
});

test('기능 전환은 키보드와 접근성 상태를 지원한다', async () => {
  const html = await readSite('index.html', 'utf8');
  const script = await readSite('script.js', 'utf8');
  assert.equal([...html.matchAll(/data-feature-src=/g)].length, 3);
  assert.equal([...html.matchAll(/aria-controls="feature-visual"/g)].length, 3);
  assert.match(html, /aria-live="polite"/);
  assert.match(script, /ArrowDown/);
  assert.match(script, /ArrowUp/);
  assert.match(script, /featureButtons\[targetIndex\]\.focus\(\)/);
  assert.match(script, /setAttribute\('aria-pressed'/);
});

test('기본 콘텐츠는 JavaScript 없이 보이고 모션 감소 설정을 존중한다', async () => {
  const html = await readSite('index.html', 'utf8');
  const css = await readSite('styles.css', 'utf8');
  assert.doesNotMatch(html, /\shidden(?:\s|=|>)/);
  assert.match(css, /\.motion-ready \[data-reveal\] \{ opacity: 0;/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(css, /--quick: 90ms/);
  assert.match(css, /--standard: 280ms/);
  assert.match(css, /--slow: 480ms/);
  assert.match(css, /translateY\(16px\)/);
  assert.match(css, /translateY\(8px\)/);
});

test('Pages source에는 지원 범위 밖 제품 표현이 없다', async () => {
  const source = [
    await readSite('index.html', 'utf8'),
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
