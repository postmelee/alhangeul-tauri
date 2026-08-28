import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { crc32 } from 'node:zlib';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/benchmark-linux-thumbnail-core.sh');
const [source, packageSource] = await Promise.all([
  readFile(scriptPath, 'utf8'),
  readFile(join(repoRoot, 'package.json'), 'utf8'),
]);

function assertPngChunkCrcs(encoded) {
  const png = Buffer.from(encoded, 'base64');
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const chunk = png.subarray(offset + 4, offset + 8 + length);
    assert.equal(crc32(chunk), png.readUInt32BE(offset + 8 + length));
    offset += 12 + length;
  }
  assert.equal(offset, png.length);
}

test('Linux probe contract가 automation inventory에 포함된다', () => {
  const packageJson = JSON.parse(packageSource);
  assert.match(
    packageJson.scripts['test:automation'],
    /tests\/linux-thumbnail-core-probe\.test\.mjs/,
  );
});

test('Linux x64와 arm64 및 세 positional input만 허용한다', () => {
  assert.match(source, /if \[\[ "\$#" -ne 3 \]\]/);
  assert.match(source, /<repo-root> <fixture-root> <output-directory>/);
  assert.match(source, /\[\[ "\$\(uname -s\)" == Linux \]\]/);
  assert.match(source, /x86_64\|aarch64/);
  assert.doesNotMatch(source, /Windows_NT|WSL/i);
});

test('임시 probe crate가 공유 preview API를 직접 계측한다', () => {
  for (const marker of [
    'alhangeul-document-preview = { path = "workspace/crates/document-preview"',
    'rasterize_first_page(&bytes, edge)',
    'extract_embedded_preview(&bytes)',
    'rasterize_embedded_preview(&preview, edge)',
    'cargo generate-lockfile',
    '--locked --release',
  ]) assert.ok(source.includes(marker), `probe marker가 필요합니다: ${marker}`);
  assert.match(source, /mktemp -d/);
  assert.match(source, /trap 'rm -rf "\$scratch_root"' EXIT/);
  assert.doesNotMatch(source, /apps\/linux-thumbnailer/);
});

test('direct와 preview를 네 edge에서 독립 process로 계측한다', () => {
  assert.match(source, /for edge in 128 256 512 1024/);
  assert.match(source, /for mode in direct preview/);
  assert.match(source, /\/usr\/bin\/time -v/);
  assert.match(source, /timeout --signal=TERM --kill-after=5s/);
  for (const field of [
    'wallMs',
    'peakRssBytes',
    'stdoutBytes',
    'stderrBytes',
    'wallMsP95',
    'peakRssBytesP95',
  ]) assert.ok(source.includes(field), `resource field가 필요합니다: ${field}`);
});

test('fixture 변형과 64 MiB 경계를 원본과 분리한다', () => {
  for (const fixtureClass of [
    'preview-absent',
    'preview-stale',
    'corrupt-truncated',
    'size-boundary-64mib-plus-one',
  ]) assert.ok(source.includes(fixtureClass), `${fixtureClass}가 필요합니다.`);
  assert.match(source, /zip -q -d "\$without_preview" 'Preview\/PrvImage\*'/);
  assert.match(source, /truncate -s 67108865/);
  assert.match(source, /\[\[ "\$\(lower_sha256 "\$file"\)" == "\$sha" \]\]/);
  assert.match(source, /stat -c '%y'/);
});

test('stale preview fixture는 chunk CRC가 유효한 PNG를 사용한다', () => {
  const encoded = source.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)?.[1];
  assert.ok(encoded, 'stale preview PNG fixture가 필요합니다.');
  assertPngChunkCrcs(encoded);
});

test('summary는 exact SHA와 비식별 resource만 기록한다', () => {
  assert.match(source, /git -C "\$repo_root" rev-parse HEAD/);
  assert.match(source, /rev-parse HEAD:third_party\/rhwp/);
  assert.match(source, /kind: 'alhangeul-linux-thumbnail-core-probe'/);
  assert.match(source, /"fixtureId":"fixture-%s"/);
  assert.doesNotMatch(source, /originalPath|fixturePath|fileName|stdoutText|stderrText/);
});

test('script와 함수가 저장소 크기 상한을 지킨다', () => {
  const lines = source.split(/\r?\n/);
  assert.ok(lines.length <= 300, `script가 300 LOC를 초과했습니다: ${lines.length}`);
  const starts = lines
    .map((line, index) => (/^[a-z_]+\(\) \{/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const mainStart = lines.findIndex((line) => line === 'assert_linux_host');
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : mainStart;
    assert.ok(end - start <= 50, `${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    const parameters = lines.slice(start, end).filter((line) => /^  local /.test(line))[0]
      ?.match(/\$?\w+=?"?\$\d/g) ?? [];
    assert.ok(parameters.length <= 5, `${lines[start]} parameter가 5개를 초과했습니다.`);
  }
});
