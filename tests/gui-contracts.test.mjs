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

test('production session은 현재 handle을 명시 선택해 plugin 없는 focus 조회를 억제한다', async () => {
  const config = createSharedWdioConfig(readGuiHarnessInputs(validEnv()));
  const calls = [];
  await config.before({}, [], {
    getWindowHandle: async () => { calls.push('get'); return 'main-handle'; },
    switchToWindow: async (handle) => { calls.push(`switch:${handle}`); },
  });
  assert.deepEqual(calls, ['get', 'switch:main-handle']);
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

test('숨김 file input은 test 중에만 표시하고 원래 inline style을 복원한다', async () => {
  const source = await readFile(join(repoRoot, 'tests/gui/specs/document-ux.e2e.ts'), 'utf8');
  assert.match(source, /setProperty\('display', 'block', 'important'\)/);
  assert.match(source, /finally \{/);
  assert.match(source, /input\.style\.removeProperty\(property\)/);
  assert.match(source, /input\.removeAttribute\('style'\)/);
  assert.match(source, /if \(style !== null\) input\.setAttribute\('style', style\)/);
});

test('document와 native open은 로컬 font 조회 없이 대체 글꼴 consent를 완료한다', async () => {
  const helper = await readFile(join(repoRoot, 'tests/gui/support/webdriver-dom.ts'), 'utf8');
  assert.match(helper, /'대체 글꼴로 보기'/);
  assert.doesNotMatch(helper, /'로컬 글꼴 감지 \(권장\)'/);
  assert.match(helper, /textContent\?\.trim\(\)/);
  for (const path of [
    'tests/gui/specs/document-ux.e2e.ts',
    'tests/gui/specs/linux-native.e2e.ts',
  ]) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    assert.match(source, /dismissLocalFontPrompt\(\)/, path);
    assert.match(source, /from '\.\.\/support\/webdriver-dom\.ts'/, path);
    assert.match(source, /readDomText\(GUI_SELECTORS\.(?:statusMessage|pageIndicator)\)/, path);
  }
});

test('native menu command는 WebKit 표시 오판 없이 실제 DOM geometry를 확인해 클릭한다', async () => {
  const helper = await readFile(join(repoRoot, 'tests/gui/support/webdriver-dom.ts'), 'utf8');
  const native = await readFile(join(repoRoot, 'tests/gui/specs/linux-native.e2e.ts'), 'utf8');
  const command = await readFile(join(repoRoot, 'tests/gui/support/native-command.ts'), 'utf8');
  assert.match(helper, /window\.getComputedStyle\(element\)/);
  assert.match(helper, /element\.getBoundingClientRect\(\)/);
  assert.match(helper, /element\.click\(\)/);
  assert.match(helper, /new MouseEvent\('mousedown'/);
  assert.match(helper, /classList\.contains\('open'\)/);
  assert.match(helper, /browser\.waitUntil/);
  assert.match(command, /openDomMenu\('#menu-bar \.menu-title', boundedTimeout\)/);
  assert.match(command, /clickVisibleDomElement\(selector\)/);
  assert.match(native, /createNativeCommandDriver\(inputs\.timeoutMs\)/);
  assert.doesNotMatch(native, /waitForDisplayed/);
});

test('system print는 Tauri direct-print shadow를 trusted Ctrl+P로 실행한다', async () => {
  const native = await readFile(join(repoRoot, 'tests/gui/specs/linux-native.e2e.ts'), 'utf8');
  const output = await readFile(join(repoRoot, 'tests/gui/linux/native-output.ts'), 'utf8');
  const command = await readFile(join(repoRoot, 'tests/gui/support/native-command.ts'), 'utf8');
  assert.match(command, /sendTrustedPrintShortcut/);
  assert.match(command, /'search', '--onlyvisible', '--name', '\^Alhangeul\$'/);
  assert.match(command, /'getactivewindow'/);
  assert.match(command, /windowIds\.includes\(activeWindowId\)/);
  assert.match(command, /'getwindowgeometry', '--shell', selectedWindowId/);
  assert.match(command, /'mousemove', '--window', selectedWindowId/);
  assert.match(command, /'click', '1'/);
  assert.match(command, /getAttribute\('aria-label'\) === '문서 편집 입력'/);
  assert.match(command, /'key', '--clearmodifiers', 'ctrl\+p'/);
  assert.match(command, /return action\(sendTrustedPrintShortcut\)/);
  assert.doesNotMatch(command, /print-preview|getWindowHandles|window\.open/);
  assert.match(native, /runSystemPrint\(\(trigger\) => adapter\.printToFile/);
  assert.match(native, /assertPreparedPrintSurface\(6\)/);
  assert.match(native, /resetCupsOutput\(cups\.outputPath\)/);
  assert.match(native, /normalizeCupsPdf\(cups\.outputPath, inputs\.timeoutMs\)/);
  assert.match(output, /pdfs\.length !== 1/);
  assert.match(output, /rename\(pdfs\[0\], expectedPath\)/);
});

test('Linux 복합 GUI scenario timeout은 operation timeout의 bounded 배수다', async () => {
  const config = await readFile(join(repoRoot, 'tests/gui/wdio.linux.conf.ts'), 'utf8');
  assert.match(config, /timeout: Math\.min\(inputs\.timeoutMs \* 4, 600000\)/);
});

test('native open readiness는 실제 artifact의 완료 status와 fixture page를 결속한다', async () => {
  const native = await readFile(join(repoRoot, 'tests/gui/specs/linux-native.e2e.ts'), 'utf8');
  assert.match(native, /status === '파일 열기 완료'/);
  assert.match(native, /status\.startsWith\(`\$\{basename\(path\)\} — `\)/);
  assert.match(native, /pageCount === null \|\| page\.total === pageCount/);
  assert.doesNotMatch(native, /status\.includes\(basename\(path\)\)/);
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
