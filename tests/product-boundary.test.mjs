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
