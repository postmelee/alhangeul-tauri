import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyProductBoundary } from '../scripts/check-product-boundary.mjs';

const legacyProduct = ['H', 'OP'].join('');
const unsupportedPlatform = ['ma', 'cOS'].join('');
const unsupportedRepository = ['alhangeul-ma', 'cos'].join('');
const approvedHandoffReference =
  `- 초기 ${legacyProduct} version과 Alhangeul의 독립 계보는 [출처 문서](../architecture/PROVENANCE.md)를`;
const approvedSyncReference =
  `3. [${unsupportedPlatform} sync PR #491](https://github.com/postmelee/${unsupportedRepository}/pull/491)은 참고만 한다.`;

test('승인된 참조 문장은 실제 해당 문서에 존재한다', async () => {
  for (const [path, line] of [
    ['docs/operations/DESKTOP_RELEASE.md', approvedHandoffReference],
    ['docs/releases/v0.1.0.md', approvedSyncReference],
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.ok(source.split(/\r?\n/).includes(line), `${path}의 승인 참조가 변경되거나 사라졌습니다.`);
  }
});

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

test('승인된 릴리즈 문서의 정확한 외부 계보 참조만 허용한다', async () => {
  const fixture = await createFixture();
  try {
    await writeRepositoryFile(
      fixture.root,
      'docs/operations/DESKTOP_RELEASE.md',
      `${approvedHandoffReference}\n`,
    );
    await writeRepositoryFile(
      fixture.root,
      'docs/releases/v0.1.0.md',
      `${approvedSyncReference}\n`,
    );
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.deepEqual(result.violations, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('승인 문서에서도 다른 줄의 legacy·unsupported 표현은 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await writeRepositoryFile(
      fixture.root,
      'docs/operations/DESKTOP_RELEASE.md',
      `${approvedHandoffReference}\n${legacyProduct} 제품을 다시 사용한다.\n`,
    );
    await writeRepositoryFile(
      fixture.root,
      'docs/releases/v0.1.0.md',
      `${approvedSyncReference}\n${unsupportedPlatform} 배포도 지원한다.\n`,
    );
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.equal(result.violations.length, 2);
    assert.match(result.violations.join('\n'), /legacy product name/);
    assert.match(result.violations.join('\n'), /unsupported platform identifier/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('일반 제품 source의 legacy·unsupported 표현은 계속 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await writeRepositoryFile(
      fixture.root,
      'src/product.ts',
      `export const names = ["${legacyProduct}", "${unsupportedPlatform}"];\n`,
    );
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.equal(result.violations.length, 2);
    assert.match(result.violations.join('\n'), /legacy product name/);
    assert.match(result.violations.join('\n'), /unsupported platform identifier/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('Git metadata가 상호 확인된 등록 중첩 worktree만 검사에서 제외한다', async () => {
  const fixture = await createFixture();
  try {
    const nestedRoot = join(fixture.root, '.claude/worktrees/review');
    const nestedGitFile = join(nestedRoot, '.git');
    const adminDirectory = join(fixture.root, '.git/worktrees/review');
    await mkdir(adminDirectory, { recursive: true });
    await mkdir(nestedRoot, { recursive: true });
    await writeFile(join(adminDirectory, 'gitdir'), `${nestedGitFile}\n`);
    await writeFile(nestedGitFile, `gitdir: ${adminDirectory}\n`);
    await writeFile(
      join(nestedRoot, 'legacy.txt'),
      `${legacyProduct} for ${unsupportedPlatform}\n`,
    );
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.deepEqual(result.violations, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('등록되지 않은 가짜 중첩 worktree marker는 검사 제외 근거가 아니다', async () => {
  const fixture = await createFixture();
  try {
    const fakeRoot = join(fixture.root, '.claude/worktrees/fake');
    await mkdir(fakeRoot, { recursive: true });
    await writeFile(
      join(fakeRoot, '.git'),
      `gitdir: ${join(fixture.root, '.git/worktrees/fake')}\n`,
    );
    await writeFile(join(fakeRoot, 'legacy.txt'), `${legacyProduct} product\n`);
    const result = await verifyProductBoundary({ repositoryRoot: fixture.root });
    assert.equal(result.violations.length, 1);
    assert.match(result.violations[0], /legacy product name/);
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
  [
    'Linux thumbnailer network API',
    'apps/linux-thumbnailer',
    'src/main.rs',
    'fn main() { let _ = std::net::TcpStream::connect("example.invalid:80"); }\n',
    /Linux thumbnailer network API/,
  ],
  [
    'Linux thumbnailer Tauri dependency',
    'apps/linux-thumbnailer',
    'Cargo.toml',
    '[package]\nname="thumbnailer"\nversion="0.1.0"\n[dependencies]\ntauri="2"\n',
    /Linux thumbnailer app or Windows dependency/,
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

async function writeRepositoryFile(root, path, content) {
  const destination = join(root, path);
  await mkdir(join(destination, '..'), { recursive: true });
  await writeFile(destination, content);
}
