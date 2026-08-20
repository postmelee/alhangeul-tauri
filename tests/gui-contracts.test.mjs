import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createSharedWdioConfig,
  readGuiHarnessInputs,
} from './gui/wdio.shared.conf.ts';
import {
  resolveDocumentFixtures,
} from './gui/support/document-fixture.ts';
import {
  createScenarioEvidence,
  describeEvidenceFile,
  sanitizeEvidenceText,
  writeScenarioEvidence,
} from './gui/support/evidence.ts';
import {
  centeredDelta,
  parsePageIndicator,
  runNativeDocumentCommand,
} from './gui/support/document-ux.ts';
import { runScenarioWithEvidence } from './gui/support/scenario-runner.ts';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test('공통 config는 exact-SHA 입력과 bounded retry 없는 runner 계약을 만든다', () => {
  const inputs = readGuiHarnessInputs(validEnv());
  const config = createSharedWdioConfig(inputs);
  assert.equal(inputs.timeoutMs, 90000);
  assert.equal(config.maxInstances, 1);
  assert.equal(config.connectionRetryCount, 0);
  assert.equal(config.specFileRetries, 0);
  assert.equal(config.injectGlobals, false);
  assert.match(config.specs[0], /document-ux\.e2e\.ts$/);
});

for (const [name, override, error] of [
  ['상대 app path', { ALHANGEUL_GUI_APP_PATH: 'Alhangeul' }, /절대 경로/],
  ['짧은 SHA', { ALHANGEUL_GUI_BUILD_REF: 'a'.repeat(39) }, /40자리/],
  ['지수 run ID', { ALHANGEUL_GUI_NATIVE_RUN_ID: '1e3' }, /양의 정수/],
  ['과도한 timeout', { ALHANGEUL_GUI_TIMEOUT_MS: '300001' }, /5000~300000/],
  ['줄바꿈 version', { ALHANGEUL_GUI_DRIVER_VERSION: '1.0\nsecret' }, /단일행/],
]) {
  test(`잘못된 ${name} 입력을 거부한다`, () => {
    assert.throws(() => readGuiHarnessInputs(validEnv(override)), error);
  });
}

test('공개 HWP/HWPX fixture의 path와 SHA-256을 고정한다', async () => {
  const fixtures = await resolveDocumentFixtures(repoRoot);
  assert.deepEqual(fixtures.map(({ id, format, expectedPageCount }) => ({
    id, format, expectedPageCount,
  })), [
    { id: 'biz-plan-hwp', format: 'hwp', expectedPageCount: 6 },
    { id: 'form-hwpx', format: 'hwpx', expectedPageCount: null },
  ]);
  assert.equal(fixtures.every((fixture) => fixture.sha256 === fixture.expectedSha256), true);
});

test('evidence는 상대 경로·hash를 기록하고 경로와 token을 정규화한다', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'alhangeul-gui-'));
  const screenshot = join(outputDir, 'scenarios', 'biz-plan-hwp', 'initial.png');
  await mkdir(join(outputDir, 'scenarios', 'biz-plan-hwp'), { recursive: true });
  await writeFile(screenshot, 'png-fixture');
  const inputs = readGuiHarnessInputs(validEnv({ ALHANGEUL_GUI_OUTPUT_DIR: outputDir }));
  const file = await describeEvidenceFile(outputDir, screenshot, 'screenshot');
  assert.equal(file.path, 'scenarios/biz-plan-hwp/initial.png');
  assert.match(file.sha256, /^[0-9a-f]{64}$/);
  const sanitized = sanitizeEvidenceText(
    `${inputs.appPath} ${inputs.outputDir} Bearer secret ghp_example token=private`,
    inputs,
  );
  assert.doesNotMatch(sanitized, /\/opt\/alhangeul|secret|ghp_example|private/);

  const manifest = createScenarioEvidence({
    inputs,
    scenario: 'biz-plan-hwp',
    status: 'failure',
    startedAt: new Date('2026-08-14T00:00:00.000Z'),
    completedAt: new Date('2026-08-14T00:00:01.000Z'),
    fixtures: [],
    files: [file],
    error: `failed at ${inputs.fixtureRoot}`,
  });
  const manifestPath = await writeScenarioEvidence(outputDir, manifest);
  const written = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(written.error, 'failed at $FIXTURE_ROOT');
  assert.equal(written.identity.buildRef, 'a'.repeat(40));
});

test('scenario runner는 screenshot 실패에도 원래 error와 manifest를 보존한다', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'alhangeul-gui-failure-'));
  const inputs = readGuiHarnessInputs(validEnv({ ALHANGEUL_GUI_OUTPUT_DIR: outputDir }));
  await assert.rejects(runScenarioWithEvidence({
    inputs,
    scenario: 'failure-preservation',
    fixtures: [],
    screenshotName: 'final.png',
    captureScreenshot: async () => { throw new Error('session lost'); },
  }, async () => {
    throw new Error('original scenario failure');
  }), /original scenario failure/);
  const manifest = JSON.parse(await readFile(
    join(outputDir, 'scenarios', 'failure-preservation', 'evidence.json'),
    'utf8',
  ));
  assert.equal(manifest.status, 'failure');
  assert.equal(manifest.error, 'original scenario failure');
  assert.deepEqual(manifest.files, []);
});

test('쪽 수와 중앙 정렬 판정을 순수 helper로 고정한다', () => {
  assert.deepEqual(parsePageIndicator('1 / 6 쪽'), { current: 1, total: 6 });
  assert.throws(() => parsePageIndicator('0 / 6 쪽'), /유효하지/);
  assert.equal(centeredDelta(
    { x: 20, y: 0, width: 1000, height: 700 },
    { x: 270, y: 10, width: 500, height: 680 },
  ), 0);
});

test('native dialog hook은 trigger 전후 document state를 공통 경계에서 수집한다', async () => {
  const calls = [];
  let capture = 0;
  const result = await runNativeDocumentCommand('file:save-as', {
    complete: async (command, trigger) => {
      calls.push(`adapter:${command}:before`);
      await trigger();
      calls.push(`adapter:${command}:after`);
    },
  }, {
    capture: async () => ({ title: `doc-${++capture}`, page: { current: 1, total: 6 }, status: '' }),
    trigger: async (command) => { calls.push(`trigger:${command}`); },
  });
  assert.deepEqual(calls, [
    'adapter:file:save-as:before',
    'trigger:file:save-as',
    'adapter:file:save-as:after',
  ]);
  assert.equal(result.before.title, 'doc-1');
  assert.equal(result.after.title, 'doc-2');
});

test('숨은 file input upload와 글꼴 선택은 OS 권한·style 변경 없이 결정적이다', async () => {
  const source = await readFile(
    join(repoRoot, 'tests/gui/specs/document-ux.e2e.ts'),
    'utf8',
  );
  assert.match(source, /input\.addValue\(fixture\.absolutePath\)/);
  assert.doesNotMatch(source, /input\.setValue|display:\s*'block'|setAttribute\(['"]style/);
  assert.match(source, /\.replace\(\/\\s\*×\\s\*\$\/, ''\)/);
  assert.match(source, /title !== '로컬 글꼴 감지'/);
  assert.match(source, /await button\.getText\(\) === '대체 글꼴로 보기'/);
  assert.doesNotMatch(source, /로컬 글꼴 감지 \(권장\)/);
});

test('공통 helper는 platform adapter를 import하지 않고 외부 driver만 구성한다', async () => {
  const commonPaths = [
    'tests/gui/wdio.shared.conf.ts',
    'tests/gui/support/document-fixture.ts',
    'tests/gui/support/document-ux.ts',
    'tests/gui/support/evidence.ts',
    'tests/gui/support/scenario-runner.ts',
  ];
  for (const path of commonPaths) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    assert.doesNotMatch(source, /gui\/linux|native-ui|child_process|xvfb/i, path);
  }
  const platformConfig = await readFile(join(repoRoot, 'tests/gui/wdio.linux.conf.ts'), 'utf8');
  assert.match(platformConfig, /driverProvider:\s*'external'/);
  assert.match(platformConfig, /autoInstallTauriDriver:\s*false/);
  assert.match(platformConfig, /strictFileInteractability:\s*false/);
  assert.doesNotMatch(platformConfig, /driverProvider:\s*'(embedded|crabnebula)'/);
  const cargo = await readFile(join(repoRoot, 'apps/desktop/src-tauri/Cargo.toml'), 'utf8');
  assert.doesNotMatch(cargo, /wdio|webdriver/i);
});

test('Linux runtime helper는 POSIX path API를 명시하고 분리된 path 조각 주입을 금지한다', async () => {
  const linuxHelpers = [
    'tests/gui/linux/probe.mjs',
    'tests/gui/linux/pdf-analysis.mjs',
    'tests/gui/linux/native-ui/atspi.mjs',
    'tests/gui/linux/native-ui/drag-drop.mjs',
  ];
  for (const path of linuxHelpers) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    assert.match(source, /\bposix\b/, path);
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*(?:basename|dirname|isAbsolute|join|delimiter)[^}]*\}\s*from\s*['"]node:path['"]/s,
      path,
    );
  }
  const processHelper = await readFile(join(repoRoot, 'tests/gui/support/process.mjs'), 'utf8');
  assert.match(processHelper, /options\.pathApi \?\? hostPath/);
  assert.doesNotMatch(processHelper, /pathDelimiter|joinPath/);
  for (const path of ['tests/gui/linux/probe.mjs', 'tests/gui/linux/native-ui/drag-drop.mjs']) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    assert.match(source, /pathApi:\s*posix/, path);
  }
});

test('Linux native 저장·PDF acceptance는 디스크 갱신과 경로별 실측 floor를 사용한다', async () => {
  const source = await readFile(join(repoRoot, 'tests/gui/specs/linux-native.e2e.ts'), 'utf8');
  assert.match(source, /current\.mtimeNs > beforeFile\.mtimeNs/);
  assert.match(source, /waitForStatus\(\/\^저장 완료\$\//);
  assert.doesNotMatch(source, /digest\('hex'\)\)\.toMatch/);
  assert.match(source, /DIRECT_PDF_MIN_TEXT_COUNTS = \[20, 300, 200, 300, 200, 100\]/);
  assert.match(source, /SYSTEM_PDF_MIN_TEXT_COUNTS = \[20, 25, 200, 300, 200, 100\]/);
});

function validEnv(override = {}) {
  return {
    ALHANGEUL_GUI_APP_PATH: '/opt/alhangeul/Alhangeul',
    ALHANGEUL_GUI_BUILD_REF: 'a'.repeat(40),
    ALHANGEUL_GUI_NATIVE_RUN_ID: '123456789',
    ALHANGEUL_GUI_DRIVER_PATH: '/opt/alhangeul/tauri-driver',
    ALHANGEUL_GUI_FIXTURE_ROOT: repoRoot,
    ALHANGEUL_GUI_OUTPUT_DIR: '/opt/alhangeul/evidence',
    ALHANGEUL_GUI_TIMEOUT_MS: '90000',
    ALHANGEUL_GUI_APP_VERSION: '0.1.0',
    ALHANGEUL_GUI_DRIVER_VERSION: 'tauri-driver 2.8.3',
    ...override,
  };
}
