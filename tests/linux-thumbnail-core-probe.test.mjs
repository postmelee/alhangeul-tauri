import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { crc32 } from 'node:zlib';
import { BUDGETS, FIXTURES, MANIFEST_ID, RHWP_SHA, STALE_PREVIEW_PNG, VARIANT_SOURCE, expectedRecords } from '../scripts/linux-thumbnail-core-fixtures.mjs';
import { parseProbeResult, parseRecords, summarize } from '../scripts/linux-thumbnail-core-summary.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/benchmark-linux-thumbnail-core.sh');
const summaryPath = join(repoRoot, 'scripts/linux-thumbnail-core-summary.mjs');
const [source, packageSource, summarySource, fixtureSource] = await Promise.all([
  readFile(scriptPath, 'utf8'),
  readFile(join(repoRoot, 'package.json'), 'utf8'),
  readFile(summaryPath, 'utf8'),
  readFile(join(repoRoot, 'scripts/linux-thumbnail-core-fixtures.mjs'), 'utf8'),
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
  assert.match(source, /command_timeout_seconds=5\n/);
  assert.match(source, /timeout --signal=TERM --kill-after=1s/);
  for (const field of [
    'wallMs',
    'peakRssBytes',
    'stdoutBytes',
    'stderrBytes',
    'wallMsP95',
    'peakRssBytesP95',
  ]) assert.ok((source + summarySource).includes(field), `resource field가 필요합니다: ${field}`);
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
  assert.equal(encoded, STALE_PREVIEW_PNG);
  assertPngChunkCrcs(encoded);
  assert.ok(source.includes(`hwpx_source="$fixture_root/${VARIANT_SOURCE}"`));
  assert.match(source, /TZ=UTC touch -t 198001010000/);
  assert.match(source, /chmod 0644/);
  assert.match(source, /zip -X -q/);
});

test('summary는 exact SHA와 비식별 resource만 기록한다', () => {
  assert.match(source, /git -C "\$repo_root" rev-parse HEAD/);
  assert.match(source, /rev-parse HEAD:third_party\/rhwp/);
  assert.match(summarySource, /kind: 'alhangeul-linux-thumbnail-core-probe'/);
  assert.match(source, /node "\$repo_root\/scripts\/linux-thumbnail-core-summary.mjs" "\$records_path" "\$summary_path"/);
  assert.match(source, /--parse-result "\$1"/);
  assert.match(source, /"fixtureId":"fixture-%s"/);
  assert.doesNotMatch(source, /originalPath|fixturePath|fileName|stdoutText|stderrText/);
});

test('script와 함수가 저장소 크기 상한을 지킨다', () => {
  const lines = source.split(/\r?\n/);
  assert.ok(lines.length <= 300, `script가 300 LOC를 초과했습니다: ${lines.length}`);
  for (const module of [summarySource, fixtureSource]) assert.ok(module.split('\n').length <= 300);
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

const metadata = { repositorySha: 'a'.repeat(40), rhwpSha: RHWP_SHA };
function validRecords() {
  return expectedRecords().map(({ fixture, edge, mode, expectedSuccess }) => ({
    fixtureId: `fixture-${fixture.sha256}`, fixtureClass: fixture.fixtureClass, format: fixture.format,
    original: { sha256: fixture.sha256, bytes: fixture.bytes }, edge, mode,
    exitCode: 0, timedOut: false, wallMs: 10, peakRssBytes: 1024,
    result: expectedSuccess ? { success: true, width: edge, height: edge, payloadBytes: edge * edge * 4 } : { success: false },
  }));
}
function rejectsMutation(mutate, breach) {
  const records = validRecords();
  mutate(records);
  const summary = summarize(records, metadata);
  assert.equal(summary.status, 'failed');
  assert.ok([...summary.breaches, ...summary.evaluations.flatMap((item) => item.breaches)]
    .some((item) => item.startsWith(breach)), breach);
}

test('기대값은 고정 pin의 7개 원본 SHA/size와 독립 preview 계약을 따른다', async () => {
  const originals = FIXTURES.filter((fixture) => fixture.source);
  assert.equal(originals.length, 7);
  for (const fixture of originals) {
    const bytes = await readFile(join(repoRoot, 'third_party/rhwp/saved', fixture.source));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256);
    assert.equal(bytes.length, fixture.bytes);
    assert.equal(fixture.expected.direct, true);
    assert.equal(fixture.expected.preview, fixture.format === 'hwp');
  }
  const invalid = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNkYAAAAAUAAW9oZ7wAAAAASUVORK5CYII=';
  assert.throws(() => assertPngChunkCrcs(invalid));
  assert.equal(createHash('sha256').update(Buffer.from(invalid, 'base64')).digest('hex'), originals[0].previewSha256);
  assert.equal(FIXTURES.length, 11);
  assert.equal(new Set(FIXTURES.map((fixture) => fixture.sha256)).size, 11);
});

test('11 fixtures × 4 edges × 2 modes 모두 있어야 성공한다', () => {
  const summary = summarize(validRecords(), metadata);
  assert.equal(summary.status, 'passed');
  assert.equal(summary.schemaVersion, 2);
  assert.equal(summary.manifest.id, MANIFEST_ID);
  assert.equal(summary.manifest.expectedRecordCount, 88);
  assert.equal(summary.observed.recordCount, 88);
  assert.equal(summary.evaluations.filter((item) => !item.expectedSuccess).length, 36);
});

test('성공 render 예산은 1500 ms와 256 MiB의 inclusive 경계다', () => {
  const records = validRecords();
  Object.assign(records[0], { wallMs: 1500, peakRssBytes: 268435456 });
  assert.equal(summarize(records, metadata).status, 'passed');
  assert.deepEqual(BUDGETS, { wallMs: 1500, peakRssBytes: 268435456 });
  rejectsMutation((items) => { items[0].wallMs = 1501; }, 'wall-budget-exceeded');
  rejectsMutation((items) => { items[0].peakRssBytes = 268435457; }, 'rss-budget-exceeded');
  assert.equal(summarize(records, metadata).observed.wallMsP95, 10);
});

for (const [name, mutate, breach] of [
  ['nonzero exit', (r) => { r[1].exitCode = 1; }, 'process-exit'],
  ['missing exit', (r) => { delete r[0].exitCode; }, 'process-exit'],
  ['string exit', (r) => { r[0].exitCode = '0'; }, 'process-exit'],
  ['timeout', (r) => { r[1].timedOut = true; }, 'process-timeout'],
  ['missing timeout', (r) => { delete r[0].timedOut; }, 'process-timeout'],
  ['normal direct failure', (r) => { r[0].result = { success: false }; }, 'unexpected-render-result'],
  ['negative fixture success', (r) => { r.at(-1).result = r[0].result; }, 'unexpected-render-result'],
  ['unknown SHA', (r) => { r[0].original.sha256 = 'f'.repeat(64); }, 'unknown-fixture'],
  ['wrong class', (r) => { r[0].fixtureClass = 'preview-stale'; }, 'fixture-identity'],
  ['wrong size', (r) => { r[0].original.bytes++; }, 'fixture-identity'],
  ['wrong edge', (r) => { r[0].edge = 200; }, 'unknown-fixture'],
  ['string edge', (r) => { r[0].edge = '128'; }, 'fixture-identity'],
  ['wrong mode', (r) => { r[0].mode = 'fallback'; }, 'unknown-fixture'],
  ['missing combination', (r) => { r.pop(); }, 'missing-record'],
  ['duplicate combination', (r) => { r.push(structuredClone(r[0])); }, 'duplicate-record'],
  ['malformed probe JSON', (r) => { r.at(-1).result = parseProbeResult('{private'); }, 'probe-json-invalid'],
  ['null result', (r) => { r[0].result = null; }, 'invalid-probe-result'],
  ['string success', (r) => { r[0].result.success = 'true'; }, 'invalid-probe-result'],
  ['invalid bitmap', (r) => { r[0].result.payloadBytes = 0; }, 'invalid-bitmap'],
  ['null record', (r) => { r[0] = null; }, 'unknown-fixture'],
]) test(`semantic gate rejects ${name}`, () => rejectsMutation(mutate, breach));

for (const [field, invalid, breach] of [
  ['wallMs', [undefined, null, '10', NaN, Infinity, -1], 'invalid-wall-ms'],
  ['peakRssBytes', [undefined, null, '1024', NaN, Infinity, -1, 0], 'invalid-peak-rss'],
]) {
  for (const value of invalid) test(`${field} invalid metric ${String(value)}`, () => {
    rejectsMutation((records) => { records[1][field] = value; }, breach);
  });
}

test('빈 입력·잘못된 NDJSON·pin 불일치도 실패한다', () => {
  assert.equal(summarize([], metadata).status, 'failed');
  const parsed = parseRecords('null\n{private-content\n');
  assert.deepEqual(parsed.breaches, ['record-json-invalid:2']);
  assert.equal(summarize(parsed.records, metadata, parsed.breaches).status, 'failed');
  for (const wrong of [{ rhwpSha: 'b'.repeat(40) }, { repositorySha: undefined }]) {
    assert.equal(summarize(validRecords(), { ...metadata, ...wrong }).status, 'failed');
  }
  assert.deepEqual(parseProbeResult('null'), { parseError: 'invalid-result' });
});

test('실제 CLI가 실패 JSON을 보존하고 nonzero로 required outcome에 전달한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alhangeul-core-summary-test-'));
  const input = join(dir, 'records.ndjson'), output = join(dir, 'summary.json');
  const env = { ...process.env, REPOSITORY_SHA: metadata.repositorySha, RHWP_SHA };
  try {
    for (const expectedStatus of ['passed', 'failed', 'malformed', 'empty']) {
      const records = validRecords();
      if (expectedStatus === 'failed') records[0].wallMs = 1501;
      const raw = { malformed: '{private-content', empty: '' }[expectedStatus]
        ?? records.map((record) => JSON.stringify(record)).join('\n');
      await writeFile(input, raw);
      const cli = spawnSync(process.execPath, [summaryPath, input, output], { env, encoding: 'utf8' });
      assert.equal(cli.status, expectedStatus === 'passed' ? 0 : 1, cli.stderr);
      const summary = JSON.parse(await readFile(output, 'utf8'));
      assert.equal(summary.status, expectedStatus === 'passed' ? 'passed' : 'failed');
      assert.ok(!JSON.stringify(summary).includes('private-content'));
    }
    await writeFile(input, '{private-content');
    const parse = spawnSync(process.execPath, [summaryPath, '--parse-result', input], { encoding: 'utf8' });
    assert.equal(parse.status, 0);
    assert.deepEqual(JSON.parse(parse.stdout), { parseError: 'invalid-json' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
