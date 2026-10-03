import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const run = promisify(execFile);
const evidence = resolve('font-performance-evidence');
const context = JSON.parse(await readFile(join(evidence, 'products.json'), 'utf8'));
const outcomes = [];

async function command(file, args, directory, env = process.env) {
  try {
    const result = await run(file, args, { env, timeout: 900000, maxBuffer: 20 * 1024 * 1024 });
    await writeFile(join(directory, `${file.replace(/[^a-z0-9]/gi, '-')}.log`), result.stdout + result.stderr);
    return result;
  } catch (error) {
    await writeFile(join(directory, `${file.replace(/[^a-z0-9]/gi, '-')}-failure.log`), `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`);
    throw error;
  }
}

async function installer(phase, product, directory) {
  const args = ['-NoProfile', '-File', resolve('scripts/updater/windows-native-acceptance.ps1'),
    '-Phase', phase, '-Kind', 'msi', '-OutputDirectory', join(directory, 'installer')];
  if (phase === 'Install') args.push('-ArtifactRoot', product.root, '-ExpectedVersion', product.version);
  await command('powershell.exe', args, directory);
}

async function inspectProduct(label, product) {
  const directory = join(evidence, label);
  await mkdir(directory, { recursive: true });
  const state = { label, sourceSha: product.buildRef, installed: false, gui: false, cleaned: false };
  outcomes.push(state);
  try {
    if (process.platform === 'win32') await installer('Install', product, directory);
    else await chmod(product.installer, 0o755);
    state.installed = true;
    const app = process.platform === 'win32' ? join(process.env.ProgramFiles, 'Alhangeul', 'Alhangeul.exe') : product.installer;
    const env = { ...process.env, ALHANGEUL_GUI_APP_PATH: app, ALHANGEUL_GUI_BUILD_REF: product.buildRef,
      ALHANGEUL_GUI_NATIVE_RUN_ID: String(product.nativeRunId), ALHANGEUL_GUI_APP_VERSION: product.version,
      ALHANGEUL_GUI_DRIVER_PATH: join(homedir(), '.cargo/bin', process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver'),
      ALHANGEUL_GUI_FIXTURE_ROOT: process.cwd(), ALHANGEUL_GUI_OUTPUT_DIR: directory,
      ALHANGEUL_GUI_TIMEOUT_MS: '120000', ALHANGEUL_GUI_DRIVER_VERSION: 'tauri-driver 2.0.6' };
    // Launch through Node, avoiding .cmd shell interpolation on Windows.
    await command(process.execPath, [resolve('node_modules/@wdio/cli/bin/wdio.js'), 'run',
      'tests/gui/wdio.release-files.conf.ts', '--spec', 'tests/gui/specs/local-font-performance.e2e.ts'], directory, env);
    const result = JSON.parse(await readFile(join(directory, 'local-fonts/performance.json'), 'utf8'));
    assert.equal(result.sourceSha, product.buildRef);
    assert.equal(result.complete, true);
    state.gui = true;
  } finally {
    if (process.platform === 'win32') await installer('Cleanup', product, directory);
    state.cleaned = true;
    await writeFile(join(evidence, 'outcomes.json'), JSON.stringify(outcomes, null, 2));
  }
}

assert.ok(['win32', 'linux'].includes(process.platform));
for (const label of ['baseline', 'improved']) await inspectProduct(label, context.products[label]);
assert.ok(outcomes.every(state => state.installed && state.gui && state.cleaned));
