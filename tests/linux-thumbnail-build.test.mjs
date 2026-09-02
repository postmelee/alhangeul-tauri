import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createBuildPlan,
  inspectElfImage,
  LINUX_TARGETS,
  LINUX_THUMBNAILER_FILENAME,
  parseArguments,
  stageLinuxThumbnailer,
} from '../scripts/build-linux-thumbnailer.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const exactSha = 'a'.repeat(40);

test('x64와 arm64 target만 locked release build로 허용한다', () => {
  for (const target of Object.keys(LINUX_TARGETS)) {
    const plan = createBuildPlan(repoRoot, target, '/tmp/evidence', exactSha);
    assert.deepEqual(plan.command.slice(0, 5), [
      'build',
      '--manifest-path',
      'apps/linux-thumbnailer/Cargo.toml',
      '--locked',
      '--release',
    ]);
    assert.equal(
      plan.source,
      join(
        repoRoot,
        'apps/desktop/src-tauri/target',
        target,
        'release',
        LINUX_THUMBNAILER_FILENAME,
      ),
    );
    assert.ok(plan.command.includes(plan.target));
  }
  assert.throws(
    () => createBuildPlan(repoRoot, 'armv7-unknown-linux-gnueabihf', '/tmp/out', exactSha),
    /지원하지 않는 Linux thumbnail target/,
  );
  assert.throws(
    () => createBuildPlan(repoRoot, Object.keys(LINUX_TARGETS)[0], '/tmp/out', 'ABC'),
    /repository SHA/,
  );
});

test('build CLI는 pnpm argument separator와 exact 세 option만 허용한다', () => {
  const args = [
    '--target',
    'x86_64-unknown-linux-gnu',
    '--output',
    'evidence',
    '--repository-sha',
    exactSha,
  ];
  assert.deepEqual(parseArguments(args), parseArguments(['--', ...args]));
  assert.throws(() => parseArguments([...args, '--extra', 'value']), /Usage|인자/);
});

test('ELF64 little-endian target machine을 fail-closed 검증한다', () => {
  for (const contract of Object.values(LINUX_TARGETS)) {
    assert.deepEqual(inspectElfImage(elfFixture(contract.machine), contract.machine), {
      type: 3,
      machine: contract.machine,
    });
  }
  assert.throws(() => inspectElfImage(Buffer.alloc(64), 62), /ELF magic/);
  const wrongClass = elfFixture(62);
  wrongClass[4] = 1;
  assert.throws(() => inspectElfImage(wrongClass, 62), /ELF64 little-endian/);
  assert.throws(() => inspectElfImage(elfFixture(183), 62), /machine 불일치/);
});

test('staging은 실행 가능한 ELF와 exact SHA summary를 atomic하게 기록한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-linux-thumbnail-build-'));
  try {
    const target = 'x86_64-unknown-linux-gnu';
    const output = join(root, 'evidence');
    const plan = createBuildPlan(root, target, output, exactSha);
    await mkdir(dirname(plan.source), { recursive: true });
    await writeFile(plan.source, elfFixture(LINUX_TARGETS[target].machine));
    await chmod(plan.source, 0o755);
    const summary = await stageLinuxThumbnailer(plan);
    assert.equal(summary.repositorySha, exactSha);
    assert.equal(summary.target, target);
    assert.equal(summary.elfMachine, 62);
    assert.match(summary.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(JSON.parse(await readFile(plan.summary, 'utf8')), summary);
    assert.deepEqual(await readFile(plan.destination), elfFixture(62));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Linux crate와 package script는 tracked lockfile과 locked 검증을 소유한다', async () => {
  const [manifest, lockfile, gitignore, packageJson] = await Promise.all([
    readFile(join(repoRoot, 'apps/linux-thumbnailer/Cargo.toml'), 'utf8'),
    readFile(join(repoRoot, 'apps/linux-thumbnailer/Cargo.lock'), 'utf8'),
    readFile(join(repoRoot, '.gitignore'), 'utf8'),
    readFile(join(repoRoot, 'package.json'), 'utf8').then(JSON.parse),
  ]);
  assert.match(manifest, /name = "alhangeul-linux-thumbnailer"/);
  assert.match(manifest, /target_os = "linux"/);
  assert.match(lockfile, /^version = 4$/m);
  assert.match(gitignore, /^!\/apps\/linux-thumbnailer\/Cargo\.lock$/m);
  for (const script of ['test:linux-thumbnailer', 'clippy:linux-thumbnailer']) {
    assert.match(packageJson.scripts[script], /--manifest-path apps\/linux-thumbnailer\/Cargo\.toml/);
    assert.match(packageJson.scripts[script], /(?:^|\s)--locked(?:\s|$)/);
  }
  assert.equal(packageJson.scripts['build:linux-thumbnailer'], 'node scripts/build-linux-thumbnailer.mjs');
});

test('supervisor, worker limit, direct fallback와 atomic PNG 경계를 고정한다', async () => {
  const [main, cli, render, output, contract] = await Promise.all([
    readFile(join(repoRoot, 'apps/linux-thumbnailer/src/main.rs'), 'utf8'),
    readFile(join(repoRoot, 'apps/linux-thumbnailer/src/cli.rs'), 'utf8'),
    readFile(join(repoRoot, 'apps/linux-thumbnailer/src/render.rs'), 'utf8'),
    readFile(join(repoRoot, 'apps/linux-thumbnailer/src/output.rs'), 'utf8'),
    readFile(join(repoRoot, 'apps/linux-thumbnailer/tests/thumbnailer_contract.rs'), 'utf8'),
  ]);
  assert.match(cli, /--alhangeul-private-worker/);
  assert.match(cli, /1\.\.=MAX_REQUESTED_EDGE/);
  assert.match(cli, /symlink_metadata/);
  assert.match(main, /std::env::current_exe\(\)/);
  assert.match(main, /FRAME_SELECTION_DEADLINE_MS/);
  assert.match(main, /child\.kill\(\)/);
  assert.match(main, /child\.wait\(\)/);
  assert.match(main, /libc::sigaction/);
  assert.match(render, /libc::RLIMIT_AS/);
  assert.match(render, /WORKER_MEMORY_LIMIT_BYTES/);
  assert.ok(
    render.indexOf('if let Ok(bitmap) = rasterize_first_page')
      < render.indexOf('let preview = extract_embedded_preview'),
  );
  assert.match(render, /create_new\(true\)/);
  assert.match(render, /ExtendedColorType::Rgba8/);
  assert.match(output, /PngDecoder/);
  assert.match(output, /ColorType::Rgba8/);
  assert.match(output, /fs::rename/);
  assert.match(output, /libc::O_NOFOLLOW/);
  assert.match(output, /metadata\.dev\(\).*identity\.device/);
  assert.match(output, /metadata\.ino\(\).*identity\.inode/);
  for (const marker of ['timeout_kills_and_reaps', 'worker_memory_limit', 'partial_and_panicking', 'concurrent_requests', 'precreated_output_keeps_tumbler_reader_inode']) {
    assert.match(contract, new RegExp(marker));
  }
});

test('desktop workflow는 Linux x64 arm64 helper를 build·보존·test·lint한다', async () => {
  const workflow = await readFile(join(repoRoot, '.github/workflows/alhangeul-desktop.yml'), 'utf8');
  for (const marker of [
    '- name: Build Linux thumbnailer',
    '- name: Upload Linux thumbnailer evidence',
    '- name: Require Linux thumbnailer build success',
    '- name: Test Linux thumbnailer',
    '- name: Lint Linux thumbnailer',
  ]) {
    assert.match(workflow, new RegExp(marker));
  }
  assert.match(workflow, /--target "\$\{\{ matrix\.target \}\}"/);
  assert.match(workflow, /alhangeul-\$\{\{ matrix\.name \}\}-thumbnailer/);
  assert.match(workflow, /id: build-linux-thumbnailer[\s\S]*?continue-on-error: true/);
  assert.match(workflow, /id: upload-linux-thumbnailer-evidence[\s\S]*?if: \$\{\{ always\(\)/);
  assert.match(workflow, /repositorySha.*git rev-parse HEAD/);
  assert.match(workflow, /CARGO_BUILD_TARGET: \$\{\{ matrix\.target \}\}/);
  assert.match(workflow, /pnpm run test:linux-thumbnailer/);
  assert.match(workflow, /pnpm run clippy:linux-thumbnailer/);
  assert.match(workflow, /cargo fmt --manifest-path apps\/linux-thumbnailer\/Cargo.toml -- --check/);
});

test('Linux Rust 진단은 실패 상태를 유지하고 exact SHA와 로그를 보존한다', async () => {
  const workflow = await readFile(join(repoRoot, '.github/workflows/alhangeul-desktop.yml'), 'utf8');
  const step = (name) => workflow.split('      - name: ').find((item) => item.startsWith(`${name}\n`));
  for (const name of ['Test Linux thumbnailer', 'Lint Linux thumbnailer']) {
    const source = step(name);
    assert.match(source, /if: inputs.run_tests && startsWith\(matrix.name, 'linux-'\)/);
    assert.match(source, /shell: bash/);
    assert.match(source, /set -euo pipefail/);
    assert.match(source, /\| tee "\$OUTPUT_ROOT\//);
    assert.doesNotMatch(source, /continue-on-error|\|\| true/);
  }
  const outcome = step('Record Linux thumbnailer test outcome');
  const upload = step('Upload Linux thumbnailer test evidence');
  for (const source of [outcome, upload]) {
    assert.match(source, /always\(\) && inputs.run_tests && startsWith\(matrix.name, 'linux-'\)/);
  }
  assert.match(outcome, /steps.test-linux-thumbnailer.outcome/);
  assert.match(outcome, /steps.lint-linux-thumbnailer.outcome/);
  assert.match(outcome, /github.workflow_sha/);
  assert.doesNotMatch(outcome, /RUNNER_NAME:/);
  assert.match(outcome, /git rev-parse HEAD/);
  assert.match(upload, /name: alhangeul-\$\{\{ matrix.name \}\}-thumbnailer-tests/);
  assert.match(upload, /if-no-files-found: error/);
  assert.match(upload, /retention-days: 14/);
  const contract = await readFile(join(repoRoot, 'apps/linux-thumbnailer/tests/symlink_contract.rs'), 'utf8');
  assert.doesNotMatch(contract, /assert_eq!\([^;\n]+, original\)/);
});

test('신규 source와 함수가 구현계획의 크기 상한을 지킨다', async () => {
  const paths = [
    'scripts/build-linux-thumbnailer.mjs',
    'tests/linux-thumbnail-build.test.mjs',
    'apps/linux-thumbnailer/src/main.rs',
    'apps/linux-thumbnailer/src/cli.rs',
    'apps/linux-thumbnailer/src/render.rs',
    'apps/linux-thumbnailer/src/output.rs',
    'apps/linux-thumbnailer/tests/thumbnailer_contract.rs',
    'apps/linux-thumbnailer/tests/symlink_contract.rs',
    'apps/linux-thumbnailer/tests/support/mod.rs',
  ];
  for (const path of paths) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    assert.ok(source.split('\n').length <= 300, `${path}가 300줄을 초과합니다`);
  }
});

function elfFixture(machine) {
  const buffer = Buffer.alloc(64);
  buffer.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]);
  buffer.writeUInt16LE(3, 16);
  buffer.writeUInt16LE(machine, 18);
  return buffer;
}
