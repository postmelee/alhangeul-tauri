import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RELEASE_TARGETS,
  UPDATER_ENDPOINT,
} from '../../scripts/pages/release-data.mjs';
import { ROOT_ASSETS, listSiteFiles } from '../../scripts/pages/site-files.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function unreleasedFixture() {
  return {
    status: 'unreleased',
    channel: 'stable',
    version: null,
    tag: null,
    publishedAt: null,
    notes: null,
    downloads: Object.fromEntries(
      Object.keys(RELEASE_TARGETS).map((target) => [target, null]),
    ),
    updater: { endpoint: UPDATER_ENDPOINT, manifestPublished: false, inventory: null },
  };
}

export function publishedFixture() {
  const version = '0.2.0';
  const tag = `v${version}`;
  return {
    status: 'published',
    channel: 'stable',
    version,
    tag,
    publishedAt: '2026-08-27T00:00:00.000Z',
    notes: 'Alhangeul 0.2.0 release notes',
    downloads: {
      'windows-x86_64-nsis':
        `https://github.com/postmelee/alhangeul-tauri/releases/download/${tag}/Alhangeul_${version}_x64-setup.exe`,
      'windows-x86_64-msi':
        `https://github.com/postmelee/alhangeul-tauri/releases/download/${tag}/Alhangeul_${version}_x64_en-US.msi`,
      'linux-x86_64-appimage':
        `https://github.com/postmelee/alhangeul-tauri/releases/download/${tag}/Alhangeul_${version}_amd64.AppImage`,
    },
    updater: { endpoint: UPDATER_ENDPOINT, manifestPublished: false, inventory: null },
  };
}

export function publishedManifestFixture() {
  const release = publishedFixture();
  const signature = fixtureSignature();
  const contracts = {
    'windows-x86_64-nsis': ['nsis', `nsis/Alhangeul_${release.version}_x64-setup.exe`],
    'windows-x86_64-msi': ['msi', `msi/Alhangeul_${release.version}_x64_en-US.msi`],
    'linux-x86_64-appimage': ['appimage', `appimage/Alhangeul_${release.version}_amd64.AppImage`],
  };
  const targets = Object.fromEntries(
    Object.entries(contracts).map(([target, [kind, path]], index) => [target, {
      kind,
      path,
      url: release.downloads[target],
      size: index + 1,
      sha256: String(index + 1).repeat(64),
      signature,
    }]),
  );
  release.updater = {
    endpoint: UPDATER_ENDPOINT,
    manifestPublished: true,
    inventory: {
      schemaVersion: 1,
      repository: 'postmelee/alhangeul-tauri',
      sourceSha: 'a'.repeat(40),
      version: release.version,
      tag: release.tag,
      keyFingerprint: 'f'.repeat(64),
      targets,
    },
  };
  return release;
}

// Validator 구조 검사용 인코딩이다. 실제 private key나 서명 성공의 근거가 아니다.
function fixtureSignature() {
  const packet = Buffer.alloc(74);
  packet.write('ED');
  const source = [
    'untrusted comment: fixture signature',
    packet.toString('base64'),
    'trusted comment: timestamp:1788048000 file:fixture prehashed',
    Buffer.alloc(64).toString('base64'),
  ].join('\n');
  return Buffer.from(source).toString('base64');
}

export async function createPagesFixture(release) {
  if (!release) throw new Error('고정 release fixture가 필요합니다.');
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-pages-'));
  const root = join(tmp, 'repository');
  await mkdir(root);
  await cp(join(repositoryRoot, 'site'), join(root, 'site'), { recursive: true });
  await writeFile(join(root, 'site/release.json'), `${JSON.stringify(release, null, 2)}\n`);
  for (const asset of ROOT_ASSETS) {
    const output = join(root, asset);
    await mkdir(dirname(output), { recursive: true });
    await cp(join(repositoryRoot, asset), output);
  }
  return { tmp, root, cleanup: () => rm(tmp, { recursive: true, force: true }) };
}

export async function siteInventory(root) {
  const entries = [];
  for (const path of await listSiteFiles(root)) {
    const content = await readFile(join(root, path));
    entries.push([path, createHash('sha256').update(content).digest('hex')]);
  }
  return entries;
}
