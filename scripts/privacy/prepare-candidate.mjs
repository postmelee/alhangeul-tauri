import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const platform = process.argv[2];
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const target = platform === 'windows' ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu';
if (!['windows', 'linux'].includes(platform)) throw new Error('unsupported platform');
const name = platform === 'windows' ? `Alhangeul_${version}_x64-setup.exe` : `Alhangeul_${version}_amd64.AppImage`;
const source = join('apps/desktop/src-tauri/target', target, 'release/bundle', platform === 'windows' ? 'nsis' : 'appimage', name);
const bytes = await readFile(source);
await mkdir('privacy-evidence', { recursive: true });
await copyFile(source, join('privacy-evidence', name));
const config = await readFile(join(process.env.RUNNER_TEMP, 'privacy-updater.json'));
await writeFile('privacy-evidence/identity.json', JSON.stringify({
  sourceSha: process.env.GITHUB_SHA, harnessSha: process.env.GITHUB_SHA, version, asset: name,
  size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  configSha256: createHash('sha256').update(config).digest('hex'),
  configuration: 'Nonpublishing test build: existing public updater settings, createUpdaterArtifacts=false; no signing credentials.',
}, null, 2));
