import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowRoot = join(repoRoot, '.github/workflows');
const ciPath = join(workflowRoot, 'ci.yml');
const desktopPath = join(
  workflowRoot,
  'alhangeul-desktop.yml',
);
const linuxGuiPath = join(workflowRoot, 'alhangeul-linux-gui.yml');
const [ciWorkflow, desktopWorkflow, linuxGuiWorkflow] = await Promise.all([
  readFile(ciPath, 'utf8'),
  readFile(desktopPath, 'utf8'),
  readFile(linuxGuiPath, 'utf8'),
]);

test('모든 workflow가 공통 또는 전용 contract test inventory에 등록된다', async () => {
  const actual = (await readdir(workflowRoot))
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();
  assert.deepEqual(actual, [
    'alhangeul-desktop.yml',
    'alhangeul-linux-gui.yml',
    'ci.yml',
    'pages.yml',
    'rhwp-upstream-sync.yml',
  ]);
});

test('대상 workflow는 수동 trigger와 최소 권한만 사용한다', () => {
  for (const [name, source] of [
    ['ci.yml', ciWorkflow],
    ['alhangeul-desktop.yml', desktopWorkflow],
  ]) {
    const triggerKeys = getSectionChildKeys(source, 'on');
    assert.deepEqual(
      triggerKeys,
      ['workflow_dispatch'],
      `${name} trigger는 workflow_dispatch만 허용한다`,
    );

    const permissions = getSectionAssignments(source, 'permissions');
    assert.deepEqual(
      permissions,
      new Map([['contents', 'read']]),
      `${name} permissions는 contents: read만 허용한다`,
    );
    assert.doesNotMatch(source, /secrets\./i, `${name}은 secret을 참조하지 않는다`);
  }

  assert.deepEqual(
    getSectionChildKeys(linuxGuiWorkflow, 'on'),
    ['workflow_dispatch'],
  );
  assert.deepEqual(
    getSectionAssignments(linuxGuiWorkflow, 'permissions'),
    new Map([['actions', 'read'], ['contents', 'read']]),
  );
  assert.doesNotMatch(linuxGuiWorkflow, /secrets\./i);
});

test('CI workflow는 제품 version·pin과 automation 계약을 native 검사 전에 실행한다', () => {
  assert.match(ciWorkflow, /^    runs-on: ubuntu-24\.04$/m);
  assertOrdered(ciWorkflow, [
    'pnpm run check:product-boundary',
    'pnpm run check:product-version',
    'pnpm run check:release-metadata',
    'pnpm run check:rhwp-pin',
    'pnpm run test:automation',
    'pnpm run typecheck:gui',
    'pnpm run test:upstream',
    'pnpm run test:studio',
    'pnpm run build:studio',
    'pnpm run test:document-preview',
    'pnpm run clippy:document-preview',
    'pnpm run clippy:document-preview:protocol',
    'pnpm run test:desktop',
    'pnpm run clippy:desktop',
  ]);
});

test('desktop workflow의 Windows/Linux matrix가 exact target을 유지한다', () => {
  const expectedEntries = [
    [
      '          - name: windows-x64',
      '            os: windows-2025',
      '            target: x86_64-pc-windows-msvc',
      '            bundle_args: ""',
    ].join('\n'),
    [
      '          - name: linux-x64',
      '            os: ubuntu-22.04',
      '            target: x86_64-unknown-linux-gnu',
      '            bundle_args: ""',
    ].join('\n'),
    [
      '          - name: linux-arm64',
      '            os: ubuntu-22.04-arm',
      '            target: aarch64-unknown-linux-gnu',
      '            bundle_args: "--bundles deb"',
    ].join('\n'),
  ];

  const matrixNames = [
    ...desktopWorkflow.matchAll(/^          - name: ([a-z0-9-]+)$/gm),
  ].map((match) => match[1]);
  assert.deepEqual(matrixNames, ['windows-x64', 'linux-x64', 'linux-arm64']);
  for (const entry of expectedEntries) {
    assert.ok(desktopWorkflow.includes(entry), `matrix entry가 필요합니다:\n${entry}`);
  }

  const unsupportedRunner = ['ma', 'cos'].join('');
  assert.doesNotMatch(
    desktopWorkflow,
    new RegExp(`runs-on:\\s+${unsupportedRunner}`, 'i'),
  );
});

test('desktop workflow는 checkout 전에 Git LF byte를 command scope로 고정한다', () => {
  const environment = getSectionAssignments(desktopWorkflow, 'env');

  assert.equal(environment.get('GIT_CONFIG_COUNT'), '"1"');
  assert.equal(environment.get('GIT_CONFIG_KEY_0'), 'core.autocrlf');
  assert.equal(environment.get('GIT_CONFIG_VALUE_0'), '"false"');
  assert.ok(
    desktopWorkflow.indexOf('GIT_CONFIG_COUNT:') <
      desktopWorkflow.indexOf('- name: Checkout'),
  );
});

test('Windows thumbnail core probe는 exact checkout에서 진단을 항상 보존한다', () => {
  assertOrdered(desktopWorkflow, [
    '- name: Prepare Windows thumbnail core diagnostics',
    '- name: Build Windows thumbnail core probe',
    '- name: Run Windows thumbnail core probe',
    '- name: Record Windows thumbnail core probe outcome',
    '- name: Upload Windows thumbnail core diagnostics',
    '- name: Require Windows thumbnail core probe success',
    '- name: Install dependencies',
  ]);

  const buildStep = getStepContaining(
    desktopWorkflow,
    'cargo build --manifest-path third_party/rhwp/Cargo.toml',
  );
  const probeStep = getStepContaining(
    desktopWorkflow,
    'benchmark-thumbnail-core.ps1',
  );
  const contextStep = getStepContaining(desktopWorkflow, 'workflow-context.json');
  const outcomeStep = getStepContaining(desktopWorkflow, 'step-outcomes.json');
  const uploadStep = getStepContaining(
    desktopWorkflow,
    'alhangeul-windows-x64-thumbnail-core',
  );
  const gateStep = getStepContaining(
    desktopWorkflow,
    'Windows thumbnail core probe gate failed',
  );

  assert.match(buildStep, /^\s{8}id: build-thumbnail-core-probe$/m);
  assert.match(buildStep, /^\s{8}if: matrix\.name == 'windows-x64'$/m);
  assert.match(buildStep, /^\s{8}continue-on-error: true$/m);
  assert.match(buildStep, /--bin rhwp --release/);
  assert.match(
    probeStep,
    /^\s{8}if: matrix\.name == 'windows-x64' && steps\.build-thumbnail-core-probe\.outcome == 'success'$/m,
  );
  assert.match(probeStep, /^\s{8}continue-on-error: true$/m);
  assert.match(probeStep, /-FixtureRoot 'third_party\\rhwp\\saved'/);
  assert.match(probeStep, /-OutputDirectory 'diagnostics\\thumbnail-core'/);
  for (const step of [contextStep, outcomeStep]) {
    assert.match(step, /repositorySha = \(git rev-parse HEAD\)\.Trim\(\)/);
  }
  for (const step of [outcomeStep, uploadStep, gateStep]) {
    assert.match(
      step,
      /^\s{8}if: \$\{\{ always\(\) && matrix\.name == 'windows-x64' \}\}$/m,
    );
  }
  assert.match(uploadStep, /uses: actions\/upload-artifact@v7/);
  assert.match(uploadStep, /path: diagnostics\/thumbnail-core\/\*\*/);
  assert.match(uploadStep, /^\s{10}if-no-files-found: error$/m);
  assert.match(uploadStep, /^\s{10}retention-days: 14$/m);
  for (const outcome of [
    'steps.build-thumbnail-core-probe.outcome',
    'steps.run-thumbnail-core-probe.outcome',
    'steps.upload-thumbnail-core-diagnostics.outcome',
  ]) {
    assert.ok(gateStep.includes(outcome), `probe gate outcome이 필요합니다: ${outcome}`);
  }
});

test('desktop workflow는 checkout commit을 검증하고 pretest를 순서대로 실행한다', () => {
  assert.match(
    desktopWorkflow,
    /ref: \$\{\{ inputs\.build_ref \|\| github\.sha \}\}/,
  );
  assert.match(
    desktopWorkflow,
    /EXPECTED_BUILD_REF: \$\{\{ inputs\.build_ref \|\| github\.sha \}\}/,
  );
  assert.match(
    desktopWorkflow,
    /expected_sha="\$\(git rev-parse "\$\{EXPECTED_BUILD_REF\}\^\{commit\}"\)"/,
  );
  assert.match(desktopWorkflow, /actual_sha="\$\(git rev-parse HEAD\)"/);

  assertOrdered(desktopWorkflow, [
    'pnpm run check:product-boundary',
    'pnpm run check:product-version',
    'pnpm run check:release-metadata',
    'pnpm run check:rhwp-pin',
    'pnpm run test:automation',
    'pnpm run test:upstream',
    'pnpm run test:studio',
    'pnpm run test:document-preview',
    'pnpm run clippy:document-preview',
    'pnpm run clippy:document-preview:protocol',
    'pnpm run test:desktop',
    'pnpm run clippy:desktop',
    'pnpm run build:thumbnail-binaries',
    'pnpm run test:thumbnail-worker:windows',
    'pnpm run test:thumbnail-handler:windows',
    'pnpm run clippy:thumbnail-worker:windows',
    'pnpm run clippy:thumbnail-handler:windows',
    'pnpm tauri build',
  ]);

  for (const command of [
    'pnpm run check:product-boundary',
    'pnpm run check:product-version',
    'pnpm run check:release-metadata',
    'pnpm run check:rhwp-pin',
    'pnpm run test:automation',
    'pnpm run test:upstream',
    'pnpm run test:studio',
    'pnpm run test:document-preview',
    'pnpm run clippy:document-preview',
    'pnpm run clippy:document-preview:protocol',
    'pnpm run test:desktop',
    'pnpm run clippy:desktop',
  ]) {
    const step = getStepContaining(desktopWorkflow, command);
    assert.match(step, /^\s{8}if: inputs\.run_tests$/m);
  }

  const thumbnailBuild = getStepContaining(
    desktopWorkflow,
    'pnpm run build:thumbnail-binaries',
  );
  assert.match(thumbnailBuild, /^\s{8}if: matrix\.name == 'windows-x64'$/m);
  assert.match(thumbnailBuild, /--target x86_64-pc-windows-msvc/);
  for (const command of [
    'pnpm run test:thumbnail-worker:windows',
    'pnpm run test:thumbnail-handler:windows',
    'pnpm run clippy:thumbnail-worker:windows',
    'pnpm run clippy:thumbnail-handler:windows',
  ]) {
    const step = getStepContaining(desktopWorkflow, command);
    assert.match(
      step,
      /^\s{8}if: inputs\.run_tests && matrix\.name == 'windows-x64'$/m,
    );
  }
});

test('desktop workflow는 build 뒤 bundle을 검증하고 inventory와 함께 올린다', () => {
  assertOrdered(desktopWorkflow, [
    '- name: Build Tauri bundles',
    '- name: Verify bundle artifact',
    '- name: Upload bundle artifact',
  ]);
  assert.match(
    desktopWorkflow,
    /run: pnpm tauri build --verbose --target "\$\{\{ matrix\.target \}\}" \$\{\{ matrix\.bundle_args \}\}/,
  );
  assert.match(
    desktopWorkflow,
    /BUNDLE_ROOT: apps\/desktop\/src-tauri\/target\/\$\{\{ matrix\.target \}\}\/release\/bundle/,
  );
  assert.match(
    desktopWorkflow,
    /--platform "\$\{\{ matrix\.name \}\}"/,
  );
  assert.match(desktopWorkflow, /--root "\$BUNDLE_ROOT"/);
  assert.match(
    desktopWorkflow,
    /--write-inventory "\$BUNDLE_ROOT\/alhangeul-artifact-inventory\.json"/,
  );
  assert.match(
    desktopWorkflow,
    /path: apps\/desktop\/src-tauri\/target\/\$\{\{ matrix\.target \}\}\/release\/bundle\/\*\*/,
  );
  assert.match(desktopWorkflow, /^\s{10}if-no-files-found: error$/m);
  assert.match(desktopWorkflow, /^\s{10}retention-days: 14$/m);
});

test('fresh Windows installer smoke job은 build 결과와 무관하게 artifact를 소비한다', () => {
  const job = getJob(desktopWorkflow, 'windows-installer-smoke');

  assert.match(job, /^    needs: build$/m);
  assert.match(job, /^    if: \$\{\{ !cancelled\(\) \}\}$/m);
  assert.doesNotMatch(
    job,
    /^    if: \$\{\{ always\(\) \}\}$/m,
    'job 조건은 취소된 workflow까지 계속 실행하지 않아야 합니다.',
  );
  assert.match(job, /^    runs-on: windows-2025$/m);
  assert.doesNotMatch(job, /^\s+strategy:/m);
  assertOrdered(job, [
    '- name: Checkout installer smoke source',
    '- name: Prepare installer smoke diagnostics',
    '- name: Verify installer smoke commit',
    '- name: Download Windows x64 bundle',
    '- name: Run Windows installer smoke',
    '- name: Record installer smoke outcome',
    '- name: Upload installer smoke diagnostics',
    '- name: Require Windows installer smoke success',
  ]);
});

test('installer smoke job은 exact ref와 Windows x64 artifact를 고정한다', () => {
  const job = getJob(desktopWorkflow, 'windows-installer-smoke');

  assert.match(
    job,
    /ref: \$\{\{ inputs\.build_ref \|\| github\.sha \}\}/,
  );
  assert.match(
    job,
    /EXPECTED_BUILD_REF: \$\{\{ inputs\.build_ref \|\| github\.sha \}\}/,
  );
  assert.match(job, /git rev-parse "\$env:EXPECTED_BUILD_REF\^\{commit\}"/);
  assert.match(job, /git rev-parse HEAD/);
  assert.doesNotMatch(
    job,
    /\(git rev-parse [^\n]*\)\.Trim\(\)/,
    'git 실패는 null 참조가 아니라 exit code 검사로 보고돼야 합니다.',
  );
  assert.match(job, /\[string\]::IsNullOrWhiteSpace\(\$expectedSha\)/);
  assert.match(job, /\[string\]::IsNullOrWhiteSpace\(\$actualSha\)/);
  assert.match(job, /uses: actions\/download-artifact@v8/);
  assert.match(job, /name: alhangeul-desktop-windows-x64$/m);
  assert.match(job, /path: artifacts\/windows-x64$/m);
});

test('installer smoke는 root version과 세 입력을 PowerShell script에 전달한다', () => {
  const job = getJob(desktopWorkflow, 'windows-installer-smoke');
  const step = getStepContaining(job, 'windows-installer-smoke.ps1');

  assert.match(step, /^\s{8}id: run-installer-smoke$/m);
  assert.match(step, /^\s{8}continue-on-error: true$/m);
  assert.match(step, /^\s{8}shell: powershell$/m);
  assert.match(step, /Get-Content -LiteralPath 'package\.json' -Raw/);
  assert.match(step, /-ArtifactRoot 'artifacts\\windows-x64'/);
  assert.match(
    step,
    /-OutputDirectory 'diagnostics\\windows-installer-smoke'/,
  );
  assert.match(step, /-ExpectedVersion \$expectedVersion/);
});

test('installer smoke 진단은 항상 보존되고 마지막 gate가 실패를 전달한다', () => {
  const job = getJob(desktopWorkflow, 'windows-installer-smoke');
  const prepareStep = getStepContaining(job, 'workflow-context.json');
  const recordStep = getStepContaining(job, 'step-outcomes.json');
  const uploadStep = getStepContaining(
    job,
    'alhangeul-desktop-windows-x64-installer-smoke',
  );
  const gateStep = getStepContaining(job, 'Windows installer smoke gate failed');

  assert.match(prepareStep, /^\s{8}if: \$\{\{ always\(\) \}\}$/m);
  assert.match(
    prepareStep,
    /New-Item -ItemType Directory -Path \$output -Force/,
  );
  assert.match(recordStep, /^\s{8}if: \$\{\{ always\(\) \}\}$/m);
  for (const [name, step] of [
    ['prepare', prepareStep],
    ['record', recordStep],
  ]) {
    assert.match(
      step,
      /\$output = Join-Path \$env:GITHUB_WORKSPACE 'diagnostics\\windows-installer-smoke'/,
      `${name} step은 diagnostic 경로를 workspace 기준으로 해석해야 합니다.`,
    );
  }
  assert.match(uploadStep, /^\s{8}if: \$\{\{ always\(\) \}\}$/m);
  assert.match(uploadStep, /uses: actions\/upload-artifact@v7/);
  assert.match(
    uploadStep,
    /path: diagnostics\/windows-installer-smoke\/\*\*/,
  );
  assert.match(uploadStep, /^\s{10}if-no-files-found: error$/m);
  assert.match(uploadStep, /^\s{10}retention-days: 14$/m);
  assert.match(gateStep, /^\s{8}if: \$\{\{ always\(\) \}\}$/m);
  for (const outcome of [
    'steps.smoke-checkout.outcome',
    'steps.verify-smoke-commit.outcome',
    'steps.download-windows-bundle.outcome',
    'steps.run-installer-smoke.outcome',
    'steps.upload-installer-smoke-diagnostics.outcome',
  ]) {
    assert.ok(gateStep.includes(outcome), `gate outcome이 필요합니다: ${outcome}`);
  }
});

test('대상 workflow에는 release, Pages, deploy action이 없다', () => {
  const forbiddenPatterns = [
    /actions\/upload-pages-artifact/i,
    /actions\/deploy-pages/i,
    /action-gh-release/i,
    /\bgh release\b/i,
    /\bdeploy-pages\b/i,
  ];

  for (const [name, source] of [
    ['ci.yml', ciWorkflow],
    ['alhangeul-desktop.yml', desktopWorkflow],
    ['alhangeul-linux-gui.yml', linuxGuiWorkflow],
  ]) {
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern, `${name}에 배포 action을 허용하지 않는다`);
    }
  }
});

function getTopLevelSection(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${name}:`);
  assert.notEqual(start, -1, `${name} top-level section이 필요합니다`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function getSectionChildKeys(source, name) {
  return getTopLevelSection(source, name)
    .map((line) => line.match(/^  ([A-Za-z0-9_-]+):/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function getSectionAssignments(source, name) {
  const assignments = new Map();
  for (const line of getTopLevelSection(source, name)) {
    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(\S+)\s*$/);
    if (match) assignments.set(match[1], match[2]);
  }
  return assignments;
}

function getJob(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.notEqual(start, -1, `${name} job이 필요합니다`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function assertOrdered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `workflow marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `workflow 순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}

function getStepContaining(source, marker) {
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.includes(marker));
  assert.notEqual(markerLine, -1, `workflow command가 필요합니다: ${marker}`);

  let start = markerLine;
  while (start >= 0 && !/^      - name: /.test(lines[start])) {
    start -= 1;
  }
  assert.notEqual(start, -1, `workflow step 시작을 찾을 수 없습니다: ${marker}`);

  let end = lines.length;
  for (let index = markerLine + 1; index < lines.length; index += 1) {
    if (/^      - name: /.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}
