import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createReference, verifyReference, validateReference, readVerifiedReference,
  stageDiagnosticReference, REFERENCE_NAME, REFERENCE_FILES, MAX_REFERENCE_BYTES,
} from '../scripts/windows-thumbnail-diagnostic-reference.mjs';

const identity = { sourceSha: 'a'.repeat(40), productVersion: '0.1.0' };
const binaries = [Buffer.from('synthetic handler'), Buffer.from('synthetic worker')];
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'alhangeul-reference-test-'));
  // Only this freshly-created test directory is owned by this test.
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [index, name] of REFERENCE_FILES.entries()) await writeFile(join(directory, name), binaries[index]);
  return directory;
}

test('reference binds exact source/version and each binary hash/size', () => {
  const reference = createReference(identity, binaries);
  assert.equal(verifyReference(reference, identity, binaries), reference);
  assert.equal(reference.files.length, 2);
  assert.throws(() => verifyReference(reference, { ...identity, sourceSha: 'b'.repeat(40) }, binaries), /source-mismatch/);
  assert.throws(() => verifyReference(reference, { ...identity, productVersion: '0.2.0' }, binaries), /version-mismatch/);
  assert.throws(() => verifyReference(reference, identity, [binaries[0], Buffer.from('changed worker')]), /binary-mismatch/);
  assert.throws(() => createReference(identity, [binaries[0]]), /binaries/);
});

test('reference schema fails closed for unknown, duplicate, unsafe and malformed entries', () => {
  for (const mutate of [
    (r) => { r.sourceSha = 'main'; }, (r) => { r.schemaVersion = 2; },
    (r) => { r.productVersion = 'latest'; }, (r) => { r.extra = 'private'; },
    (r) => { r.files[0].name = '../handler.dll'; },
    (r) => { r.files[1].name = r.files[0].name; },
    (r) => { r.files[0].bytes = 0; }, (r) => { r.files[0].bytes = 128 * 1024 * 1024 + 1; },
    (r) => { r.files[0].sha256 = 'A'.repeat(64); }, (r) => { r.files.push(r.files[0]); },
    (r) => { r.files[0].path = 'private'; },
  ]) {
    const reference = createReference(identity, binaries);
    mutate(reference);
    assert.throws(() => validateReference(reference));
  }
});

test('staged reference verifies disk bytes and detects a subsequent mutation', async (t) => {
  const directory = await temporary(t);
  const reference = await stageDiagnosticReference(directory, identity);
  assert.deepEqual(await readVerifiedReference(directory, identity), reference);
  await writeFile(join(directory, REFERENCE_FILES[1]), 'tampered worker');
  await assert.rejects(readVerifiedReference(directory, identity), /binary-mismatch/);
});

test('missing, malformed and oversized reference files are never accepted', async (t) => {
  const directory = await temporary(t);
  await assert.rejects(readVerifiedReference(directory, identity));
  await writeFile(join(directory, REFERENCE_NAME), '{invalid');
  await assert.rejects(readVerifiedReference(directory, identity), /reference-json/);
  await writeFile(join(directory, REFERENCE_NAME), Buffer.alloc(MAX_REFERENCE_BYTES + 1));
  await assert.rejects(readVerifiedReference(directory, identity), /regular-file/);
});

test('reference file symlinks cannot redirect the generated identity', async (t) => {
  const directory = await temporary(t);
  const target = join(directory, 'target.json');
  await writeFile(target, JSON.stringify(createReference(identity, binaries)));
  try { await symlink(target, join(directory, REFERENCE_NAME)); }
  catch (error) {
    if (error.code !== 'EPERM') throw error;
    t.skip('Host denies creation of test symlinks; Windows junction checks remain native coverage.');
    return;
  }
  await assert.rejects(readVerifiedReference(directory, identity), /regular-file/);
});

test('shared assessment mutations address real fields and cover failure boundaries', async () => {
  const fixture = JSON.parse(await read('tests/fixtures/windows-thumbnail-app-assessments.json'));
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(new Set(fixture.cases.map((c) => c.id)).size, fixture.cases.length);
  assert.ok(fixture.cases.length >= 40);
  for (const scenario of fixture.cases) {
    const input = structuredClone(fixture.base);
    for (const { pointer, value } of scenario.mutations) {
      const parts = pointer.slice(1).split('/');
      let cursor = input;
      for (const part of parts.slice(0, -1)) { assert.ok(Object.hasOwn(cursor, part), scenario.id); cursor = cursor[part]; }
      assert.ok(Object.hasOwn(cursor, parts.at(-1)), scenario.id);
      cursor[parts.at(-1)] = value;
    }
    assert.ok(['.hwp', '.hwpx'].includes(input.extension));
    assert.equal(scenario.expected.thumbnailPassed, scenario.expected.finding === 'thumbnail-api-ok');
  }
  for (const id of ['known-per-user-failure', 'known-unknown-install', 'jpg-force-failed', 'cleanup',
    'registration-changed', 'icon-fallback', 'cache-miss-is-observation', 'machine-class-not-registered']) {
    assert.ok(fixture.cases.some((c) => c.id === id), id);
  }
});

test('native and PS tests consume the same public cases without invoking registry experiments', async () => {
  const [rust, ps, build, config] = await Promise.all([
    read('apps/desktop/src-tauri/src/thumbnail_diagnostics/assessment_tests.rs'),
    read('tests/windows-thumbnail-app-diagnostics.test.ps1'),
    read('scripts/build-thumbnail-binaries.mjs'),
    read('apps/desktop/src-tauri/tauri.windows.conf.json'),
  ]);
  assert.ok(rust.includes('windows-thumbnail-app-assessments.json'));
  assert.ok(ps.includes('windows-thumbnail-app-assessments.json'));
  assert.ok(ps.includes('Get-CheckAssessment'));
  assert.doesNotMatch(ps, /Start-Process|Set-ExecutionPolicy|regsvr32|New-ItemProperty|windows-thumbnail-context/);
  assert.ok(build.indexOf('await stageDiagnosticReference') > build.indexOf('await stageThumbnailBinaries'));
  assert.equal(Object.keys(JSON.parse(config).bundle.resources).length, 2);
});

test('pure Rust contracts have bounded files and no native side effects', async () => {
  for (const name of ['model.rs', 'assessment.rs', 'protocol.rs', 'assessment_tests.rs', 'protocol_tests.rs']) {
    const source = await read(`apps/desktop/src-tauri/src/thumbnail_diagnostics/${name}`);
    assert.ok(source.split('\n').length <= 300, name);
    assert.doesNotMatch(source, /std::(?:fs|process|net)|winreg::|windows::/);
  }
});

test('headless routing precedes application initialization and keeps native entry Windows-only', async () => {
  const [main, lib, child, dispatch] = await Promise.all([
    read('apps/desktop/src-tauri/src/main.rs'), read('apps/desktop/src-tauri/src/lib.rs'),
    read('apps/desktop/src-tauri/src/thumbnail_diagnostics/child.rs'),
    read('apps/desktop/src-tauri/src/thumbnail_diagnostics/dispatch.rs'),
  ]);
  assert.ok(main.indexOf('thumbnail_diagnostic_entry()') < main.indexOf('alhangeul_desktop::run()'));
  assert.match(main, /#\[cfg\(windows\)\]\s+if let Some\(code\)/);
  assert.match(lib, /#\[cfg\(windows\)\]\s+pub fn thumbnail_diagnostic_entry/);
  assert.doesNotMatch(child + dispatch, /tauri::|Builder::default|regsvr32|Set-ExecutionPolicy/);
  assert.match(dispatch, /include_bytes!\(concat!\(\s*env!\("OUT_DIR"\)/);
  assert.match(child, /Route::Invalid => Some\(2\)/);
});

test('headless process observations stay job-scoped and do not relax acceptance', async () => {
  const [headless, observer, spawn] = await Promise.all([
    read('apps/desktop/src-tauri/tests/thumbnail_headless.rs'),
    read('apps/desktop/src-tauri/tests/support/thumbnail_processes.rs'),
    read('apps/desktop/src-tauri/src/thumbnail_diagnostics/process_spawn.rs'),
  ]);
  assert.match(headless, /assert_eq!\(\s*output\.processes, 1,/);
  assert.match(headless, /observations\.sample\(child\)/);
  assert.match(observer, /JobObjectBasicProcessIdList/);
  assert.match(observer, /IsProcessInJob\(process\.0, Some\(job\)/);
  assert.match(observer, /MAX_PROCESSES: usize = 64/);
  assert.doesNotMatch(observer, /println!|eprintln!|Command::|CreateToolhelp32Snapshot|PROCESS_ALL_ACCESS/);
  assert.match(spawn, /#\[cfg\(test\)\]\s*#\[allow\(dead_code\)\][^\n]*\n\s*pub fn test_job_handle/);
  assert.ok(observer.split('\n').length <= 300);
});
