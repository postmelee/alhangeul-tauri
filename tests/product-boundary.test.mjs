import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyProductBoundary } from '../scripts/check-product-boundary.mjs';

test('document preview 공유 core의 bytes-only 경계를 승인한다', async () => {
  const fixture = await createFixture();
  try {
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.deepEqual(result.violations, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('독립 Cargo crate의 target 산출물은 제품 소스로 검사하지 않는다', async () => {
  const fixture = await createFixture();
  try {
    const cargoTarget = join(fixture.root, 'apps/thumbnail-worker/target/debug');
    await mkdir(cargoTarget, { recursive: true });
    const unsupportedHost = ['x86_64', ['app', 'le'].join(''), ['dar', 'win'].join('')].join('-');
    await writeFile(join(cargoTarget, '.rustc_info.json'), `{"host":"${unsupportedHost}"}\n`);
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.deepEqual(result.violations, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

for (const [name, path, source, expected] of [
  [
    'filesystem API',
    'src/lib.rs',
    'pub fn load() { let _ = std::fs::read("document.hwp"); }\n',
    /filesystem, path, process, or network API/,
  ],
  [
    'Tauri dependency',
    'Cargo.toml',
    '[package]\nname = "preview"\nversion = "0.1.0"\n\n[dependencies]\ntauri = "2"\n',
    /Tauri boundary/,
  ],
  [
    'Windows integration type',
    'src/lib.rs',
    'pub struct Provider(IThumbnailProvider);\n',
    /Windows integration boundary/,
  ],
]) {
  test(`document preview 공유 core의 ${name}를 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      await writeFile(join(fixture.crateRoot, path), source);
      const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
      assert.equal(result.violations.length, 1);
      assert.match(result.violations[0], expected);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

for (const [name, cratePath, sourcePath, source, expected] of [
  [
    'worker filesystem',
    'apps/thumbnail-worker',
    'src/main.rs',
    'fn main() { let _ = std::fs::read("input.hwp"); }\n',
    /worker filesystem or network API/,
  ],
  [
    'worker child process',
    'apps/thumbnail-worker',
    'src/main.rs',
    'fn main() { let _ = std::process::Command::new("app"); }\n',
    /worker process launch API/,
  ],
  [
    'handler render dependency',
    'apps/thumbnail-handler',
    'Cargo.toml',
    '[package]\nname="handler"\nversion="0.1.0"\n[dependencies]\nrhwp="1"\n',
    /handler render or app dependency/,
  ],
]) {
  test(`${name} 경계 위반을 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      const root = join(fixture.root, cratePath);
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'Cargo.toml'), '[package]\nname="native"\nversion="0.1.0"\n');
      await writeFile(join(root, 'src/main.rs'), 'fn main() {}\n');
      await writeFile(join(root, sourcePath), source);
      const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
      assert.equal(result.violations.length, 1);
      assert.match(result.violations[0], expected);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-product-boundary-'));
  const crateRoot = join(root, 'crates/document-preview');
  await mkdir(join(crateRoot, 'src'), { recursive: true });
  const generatedSchemaRoot = join(root, 'apps/desktop/src-tauri/gen/schemas');
  await mkdir(generatedSchemaRoot, { recursive: true });
  const unsupportedGeneratedName = ['ma', 'cOS-schema.json'].join('');
  await writeFile(
    join(generatedSchemaRoot, unsupportedGeneratedName),
    '{"generated":true}\n',
  );
  await writeFile(
    join(crateRoot, 'Cargo.toml'),
    '[package]\nname = "preview"\nversion = "0.1.0"\n',
  );
  await writeFile(
    join(crateRoot, 'src/lib.rs'),
    'pub fn render(bytes: &[u8]) -> usize { bytes.len() }\n',
  );
  return { root, crateRoot };
}
