import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createBuildPlan,
  inspectPeImage,
  PE_DLL_FLAG,
  PE_MACHINE_X64,
  resolveBuildMode,
  STAGING_FILES,
  WINDOWS_X64_TARGET,
} from '../scripts/build-thumbnail-binaries.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('Windows x64만 두 thumbnail PE build를 허용하고 Linux는 no-op이다', () => {
  assert.deepEqual(resolveBuildMode('linux'), { kind: 'skip' });
  assert.deepEqual(resolveBuildMode('win32'), {
    kind: 'build',
    target: WINDOWS_X64_TARGET,
  });
  assert.throws(
    () => resolveBuildMode('win32', 'aarch64-pc-windows-msvc'),
    /지원하지 않는 thumbnail target/,
  );
  assert.throws(() => resolveBuildMode('freebsd'), /지원하지 않는 thumbnail build host/);
});

test('build plan은 독립 manifest와 desktop target/staging 경로만 사용한다', () => {
  const plan = createBuildPlan(repoRoot);
  assert.deepEqual(
    plan.commands.map((args) => args[args.indexOf('--manifest-path') + 1]),
    [
      'apps/thumbnail-worker/Cargo.toml',
      'apps/thumbnail-handler/Cargo.toml',
    ],
  );
  assert.ok(plan.commands.every((args) => args.includes('--release')));
  assert.ok(plan.commands.every((args) => args.includes(WINDOWS_X64_TARGET)));
  assert.ok(plan.commands.every((args) => args.includes(plan.targetDirectory)));
  assert.deepEqual(
    plan.outputs.map((output) => basename(output.destination)),
    [STAGING_FILES.worker, STAGING_FILES.handler],
  );
});

test('PE parser는 x64 worker EXE와 handler DLL 구분을 fail-closed한다', () => {
  assert.deepEqual(inspectPeImage(peFixture(false), { dll: false }), {
    machine: PE_MACHINE_X64,
    dll: false,
  });
  assert.deepEqual(inspectPeImage(peFixture(true), { dll: true }), {
    machine: PE_MACHINE_X64,
    dll: true,
  });
  const arm = peFixture(false);
  arm.writeUInt16LE(0xaa64, 0x84);
  assert.throws(() => inspectPeImage(arm, { dll: false }), /machine이 x64가 아닙니다/);
  assert.throws(() => inspectPeImage(peFixture(false), { dll: true }), /DLL 구분/);
});

test('handler는 protocol-only이고 worker만 render dependency를 사용한다', async () => {
  const [handler, worker] = await Promise.all([
    readFile(join(repoRoot, 'apps/thumbnail-handler/Cargo.toml'), 'utf8'),
    readFile(join(repoRoot, 'apps/thumbnail-worker/Cargo.toml'), 'utf8'),
  ]);
  assert.match(handler, /default-features = false/);
  assert.doesNotMatch(handler, /features\s*=\s*\["render"\]/);
  assert.doesNotMatch(handler, /\b(?:rhwp|resvg|image|tauri)\s*=/);
  assert.match(worker, /features\s*=\s*\["render"\]/);
  assert.doesNotMatch(worker, /\bwindows-sys\s*=/);
});

test('document preview raster는 text, system font와 licensed 한글 fallback을 직접 소유한다', async () => {
  const [manifest, renderer, fontManifest, desktopConfig] = await Promise.all([
    readFile(join(repoRoot, 'crates/document-preview/Cargo.toml'), 'utf8'),
    readFile(join(repoRoot, 'crates/document-preview/src/render.rs'), 'utf8'),
    readFile(join(repoRoot, 'assets/fonts/FONTS.md'), 'utf8'),
    readFile(join(repoRoot, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'),
  ]);
  assert.match(
    manifest,
    /features\s*=\s*\["raster-images",\s*"system-fonts",\s*"text"\]/,
  );
  assert.match(renderer, /fontdb\.load_system_fonts\(\)/);
  assert.match(renderer, /NotoSansKR-Regular\.ttf/);
  assert.match(renderer, /NotoSansKR-ExtraLight\.ttf/);
  assert.match(renderer, /options\.fontdb\s*=\s*fontdb/);
  assert.doesNotMatch(
    renderer,
    /Tree::from_str\([^;]*Options::default\(\)/s,
  );
  assert.match(
    fontManifest,
    /6e06a7fe5d696ca719894a23f36bb2b1be8c816a5937cd4ad0f23ca67780dd74/,
  );
  assert.match(
    fontManifest,
    /67b4003e2be99ea44a7c957e4b35acde1b5e6e82a54fe195c5598c3c617bc2e3/,
  );
  assert.match(desktopConfig, /NotoSansKR-OFL-1\.1\.txt/);
});

test('Windows 전용 Tauri config만 두 고정 resource 이름을 선언한다', async () => {
  const config = JSON.parse(
    await readFile(join(repoRoot, 'apps/desktop/src-tauri/tauri.windows.conf.json'), 'utf8'),
  );
  assert.deepEqual(config.bundle.resources, {
    'windows/thumbnail-resources/AlhangeulThumbnailHandler.dll': STAGING_FILES.handler,
    'windows/thumbnail-resources/AlhangeulThumbnailWorker.exe': STAGING_FILES.worker,
  });
});

function peFixture(dll) {
  const buffer = Buffer.alloc(256);
  buffer.write('MZ', 0, 'ascii');
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.write('PE\0\0', 0x80, 'ascii');
  buffer.writeUInt16LE(PE_MACHINE_X64, 0x84);
  buffer.writeUInt16LE(dll ? PE_DLL_FLAG : 0x0002, 0x96);
  return buffer;
}
