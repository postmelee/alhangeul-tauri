import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
function validEnv() {
  return {
    ALHANGEUL_GUI_APP_PATH: '/opt/alhangeul/Alhangeul',
    ALHANGEUL_GUI_BUILD_REF: 'a'.repeat(40), ALHANGEUL_GUI_NATIVE_RUN_ID: '12345',
    ALHANGEUL_GUI_DRIVER_PATH: '/opt/alhangeul/tauri-driver',
    ALHANGEUL_GUI_FIXTURE_ROOT: repoRoot, ALHANGEUL_GUI_OUTPUT_DIR: '/opt/alhangeul/evidence',
    ALHANGEUL_GUI_TIMEOUT_MS: '120000', ALHANGEUL_GUI_APP_VERSION: '0.1.2',
    ALHANGEUL_GUI_DRIVER_VERSION: 'tauri-driver 2.0.6',
  };
}

let releaseConfigCase = 0;
async function releaseFileConfig(overrides) {
  const env = { ...validEnv(), ALHANGEUL_GUI_PRODUCTION_CHECK: 'false',
    RELEASE_CANDIDATE_PATH: 'mydocs/working/task_m010_113.json', CANDIDATE_KIND: 'msi', ...overrides };
  const previous = new Map(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    const url = new URL(`./gui/wdio.release-files.conf.ts?contract=${++releaseConfigCase}`, import.meta.url);
    return (await import(url.href)).config;
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('새 signed NSIS/MSI/AppImage config는 문서와 x64 글꼴 입력·scroll spec을 선택한다', async () => {
  for (const kind of ['nsis', 'msi', 'appimage']) {
    const config = await releaseFileConfig({ CANDIDATE_KIND: kind });
    assert.deepEqual(config.specs.map(path => path.split('/').at(-1)),
      ['release-files.e2e.ts', 'local-font-performance.e2e.ts']);
  }
});

test('RPM/arm64 문서 config에는 x64 전용 글꼴 성능 spec을 넣지 않는다', async () => {
  for (const kind of ['rpm', 'arm64', '']) {
    const config = await releaseFileConfig({ CANDIDATE_KIND: kind });
    assert.deepEqual(config.specs.map(path => path.split('/').at(-1)), ['release-files.e2e.ts']);
    assert.equal(config.specFileRetries, 0);
    assert.equal(config.connectionRetryCount, 0);
  }
});

test('production 확인과 기존 immutable baseline은 별도 새 글꼴 spec을 선택하지 않는다', async () => {
  const production = await releaseFileConfig({ ALHANGEUL_GUI_PRODUCTION_CHECK: 'true' });
  assert.deepEqual(production.specs.map(path => path.split('/').at(-1)), ['production-updater.e2e.ts']);
  const baseline = await releaseFileConfig({ RELEASE_CANDIDATE_PATH: '' });
  assert.deepEqual(baseline.specs.map(path => path.split('/').at(-1)), ['release-files.e2e.ts']);
});
