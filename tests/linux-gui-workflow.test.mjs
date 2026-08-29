import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowPath = join(
  repoRoot,
  '.github/workflows/alhangeul-linux-gui.yml',
);
const workflow = await readFile(workflowPath, 'utf8');

test('Linux GUI workflow는 exact dispatch input과 최소 read 권한만 받는다', () => {
  assert.deepEqual(topLevelKeys(workflow, 'on'), ['workflow_dispatch']);
  for (const input of ['build_ref', 'native_run_id']) {
    const block = childBlock(workflow, 'inputs', input, 6);
    assert.match(block, /^        required: true$/m);
    assert.match(block, /^        type: string$/m);
  }
  assert.match(workflow, /\[\[ "\$ACCEPTANCE_REF" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(workflow, /\[\[ "\$BUILD_REF" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(workflow, /\[\[ "\$NATIVE_RUN_ID" =~ \^\[1-9\]\[0-9\]\*\$ \]\]/);
  assert.deepEqual(assignments(workflow, 'permissions'), new Map([
    ['actions', 'read'],
    ['contents', 'read'],
  ]));
  assert.doesNotMatch(workflow, /secrets\./i);
});

test('Linux GUI workflow는 표준 Ubuntu x64와 exact candidate concurrency만 사용한다', () => {
  assert.match(workflow, /^    runs-on: ubuntu-22\.04$/m);
  assert.doesNotMatch(workflow, /ubuntu-latest|codespaces|self-hosted/i);
  assert.doesNotMatch(workflow, /ubuntu-(?:[0-9]+\.)?[0-9]+-[0-9]+-core/i);
  assert.match(
    workflow,
    /^  group: alhangeul-linux-gui-\$\{\{ inputs\.build_ref \}\}-\$\{\{ inputs\.native_run_id \}\}$/m,
  );
  assert.match(workflow, /^  cancel-in-progress: true$/m);
});

test('checkout, run metadata, artifact ID와 inventory를 앱 설치 전에 검증한다', () => {
  assertOrdered(workflow, [
    '- name: Validate dispatch inputs',
    '- name: Checkout exact acceptance source',
    '- name: Verify checked out exact SHA',
    '- name: Verify native run and exact artifact handoff',
    '- name: Download verified Linux x64 artifact',
    '- name: Verify artifact inventory and select one DEB',
    '- name: Install Linux GUI dependencies',
    '- name: Install verified DEB',
    '- name: Run Linux GUI acceptance',
  ]);
  assert.match(workflow, /^          ref: \$\{\{ github\.workflow_sha \}\}$/m);
  assert.match(workflow, /actual_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /\[\[ "\$actual_sha" == "\$ACCEPTANCE_REF" \]\]/);
  assert.doesNotMatch(stepContaining(workflow, 'Verify checked out exact SHA'), /BUILD_REF/);
  const context = stepContaining(workflow, 'workflow-context.json');
  assert.match(context, /"acceptanceRef":"%s"/);
  assert.match(context, /"workflowRef":"%s"/);
  assert.match(context, /"buildRef":"%s"/);
  assert.match(context, /ACCEPTANCE_REF: \$\{\{ github\.workflow_sha \}\}/);
  assert.match(context, /WORKFLOW_REF: \$\{\{ github\.workflow_ref \}\}/);
  const handoff = stepContaining(workflow, 'verify-workflow-artifact.mjs');
  assert.match(handoff, /--workflow-path \.github\/workflows\/alhangeul-desktop\.yml/);
  assert.match(handoff, /--artifact-name alhangeul-desktop-linux-x64/);
  assert.match(handoff, /--github-output "\$GITHUB_OUTPUT"/);
});

test('artifact download는 검증된 ID, repository와 run ID에 직접 결속된다', () => {
  const step = stepContaining(workflow, 'artifact-ids:');
  assert.match(step, /artifact-ids: \$\{\{ steps\.handoff\.outputs\.artifact_id \}\}/);
  assert.match(step, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(step, /repository: \$\{\{ github\.repository \}\}/);
  assert.match(step, /run-id: \$\{\{ inputs\.native_run_id \}\}/);
  assert.match(step, /digest-mismatch: error/);
  assert.doesNotMatch(step, /^          name:/m);
  assert.doesNotMatch(workflow, /latest[_ -]?run|gh run download|workflow_run:/i);
});

test('inventory는 첫 glob 선택 없이 단일 DEB와 동봉 hash를 재검산한다', () => {
  const step = stepContaining(workflow, 'check:desktop-artifacts');
  assert.match(step, /--platform linux-x64/);
  assert.match(step, /--verify-inventory "\$ARTIFACT_ROOT\/alhangeul-artifact-inventory\.json"/);
  assert.match(step, /find "\$ARTIFACT_ROOT\/deb" -maxdepth 1 -type f -name '\*\.deb' -print0/);
  assert.match(step, /\[\[ "\$\{#packages\[@\]\}" -eq 1 \]\]/);
  assert.doesNotMatch(step, /(?:head|tail) -n 1/);
  assert.match(step, /sha256sum "\$\{packages\[0\]\}"/);
});

test('native Linux dependency와 driver version이 명시되고 환경 증거를 남긴다', () => {
  for (const dependency of [
    'at-spi2-core',
    'cups',
    'gir1.2-gtk-3.0',
    'libwebkit2gtk-4.1-0',
    'nautilus',
    'poppler-utils',
    'printer-driver-cups-pdf',
    'python3-pyatspi',
    'shared-mime-info',
    'thunar',
    'tumbler',
    'webkit2gtk-driver',
    'xdotool',
    'xvfb',
  ]) {
    assert.match(workflow, new RegExp(`^            ${escapeRegex(dependency)}(?: \\\\)?$`, 'm'));
  }
  assert.match(workflow, /^  TAURI_DRIVER_VERSION: "2\.0\.6"$/m);
  assert.match(workflow, /cargo install tauri-driver --version "\$TAURI_DRIVER_VERSION" --locked/);
  assert.match(
    workflow,
    /ALHANGEUL_GUI_DRIVER_VERSION: "tauri-driver \$\{\{ env\.TAURI_DRIVER_VERSION \}\}"/,
  );
  assert.equal((workflow.match(/2\.0\.6/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /cargo install tauri-driver(?:\s|$)(?![^\n]*--version)/);
  const evidence = stepContaining(workflow, 'native-environment.txt');
  for (const command of [
    'node --version',
    'pnpm --version',
    'rustc --version',
    'command -v WebKitWebDriver',
    'dpkg-query -W cups',
    'pdfinfo -v',
  ]) assert.ok(evidence.includes(command), `환경 증거 명령이 필요합니다: ${command}`);
  assert.ok(evidence.includes("printf 'tauri-driver %s\\n' \"$TAURI_DRIVER_VERSION\""));
  assert.ok(evidence.includes("printf 'WebKitWebDriver %s\\n' \"$webkit_webdriver_path\""));
  assert.doesNotMatch(evidence, /tauri-driver --version/);
  assert.doesNotMatch(evidence, /WebKitWebDriver --version/);
  assert.doesNotMatch(evidence, /cupsd -v/);
});

test('Nautilus와 Thunar thumbnailer discovery는 disposable XDG 경로만 사용한다', () => {
  const probe = stepContaining(workflow, 'Run Linux thumbnail manager contract probe');
  assert.match(probe, /^        id: thumbnail-manager-probe$/m);
  assert.match(probe, /^        continue-on-error: true$/m);
  assert.match(probe, /^        timeout-minutes: 8$/m);
  for (const marker of [
    'mktemp -d "$RUNNER_TEMP/alhangeul-thumbnail-manager.XXXXXX"',
    "trap 'rm -rf \"$probe_root\"' EXIT",
    'XDG_DATA_HOME="$probe_root/data" update-mime-database',
    'TryExec=%s',
    'Exec=%s %%i %%o %%s',
    'MimeType=application/x-hwp;application/vnd.hancom.hwpx;',
    'glob pattern="*.hwp" weight="100"',
    'glob pattern="*.hwpx" weight="100"',
    '[[ "$hwp_type" == application/x-hwp ]]',
    '[[ "$hwpx_type" == application/vnd.hancom.hwpx ]]',
    'gsettings set org.gnome.nautilus.preferences show-image-thumbnails always',
    'gsettings set org.gnome.desktop.thumbnailers disable-all false',
    'export SNAP_NAME=alhangeul-thumbnail-probe',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'result=partial-exit-42',
    '[[ "$result" == success ]] || exit 42',
    'run_manager nautilus',
    'run_manager thunar',
    'launch first 3 20',
    'launch cached 0 5',
    'launch changed 2 20',
    '[[ "$first_success" -eq 2 ]]',
    '[[ "$first_failure" -ge 1 ]]',
    '[[ "$cached_success" -eq "$first_success" ]]',
    '[[ "$changed_success" -ge $((cached_success + 2)) ]]',
    'nautilus_status=0',
    'thunar_status=0',
    'source_hashes_before',
    'source_hashes_after',
  ]) assert.ok(probe.includes(marker), `thumbnail probe marker가 필요합니다: ${marker}`);
  assert.match(probe, /"\$manager" --quit/);
  assert.doesNotMatch(probe, /sudo|\/usr\/share\/thumbnailers|pkill|killall/);
  assert.doesNotMatch(probe, /\.cache\/thumbnails|rm -rf "\$HOME|rm -rf ~\//);

  const record = stepContaining(workflow, 'step-outcomes.json');
  const gate = stepContaining(workflow, 'Require Linux GUI acceptance success');
  assert.match(record, /THUMBNAIL_MANAGER: \$\{\{ steps\.thumbnail-manager-probe\.outcome \}\}/);
  assert.match(record, /"thumbnailManager":"%s"/);
  assert.match(gate, /THUMBNAIL_MANAGER: \$\{\{ steps\.thumbnail-manager-probe\.outcome \}\}/);
  assert.match(gate, /"\$THUMBNAIL_MANAGER"/);
});

test('Xvfb, DBus, AT-SPI와 CUPS-PDF는 repository fixture만 사용한다', () => {
  const cups = stepContaining(workflow, 'Configure CUPS-PDF');
  assert.match(workflow, /CUPS_PDF_OUTPUT: \/home\/runner\/PDF\/cups-output\/biz_plan\.pdf/);
  assert.match(cups, /install -d -m 0777 "\$output_dir"/);
  assert.doesNotMatch(cups, /chmod 0777 "\$output_dir"/);
  assert.match(cups, /printf 'a4\\n' \| sudo tee \/etc\/papersize/);
  assert.match(cups, /config=\/etc\/cups\/cups-pdf\.conf/);
  assert.ok(cups.includes("sudo sed -Ei '/^[[:space:]]*(Out|Label)[[:space:]]/d' \"$config\""));
  assert.ok(cups.includes("printf 'Out %s\\nLabel 0\\n' \"$output_dir\" | sudo tee -a \"$config\" >/dev/null"));
  assert.match(cups, /CUPS-PDF directives before normalization:/);
  assert.match(cups, /CUPS-PDF directives after normalization:/);
  assert.equal(cups.split('grep -En "$directive_pattern" "$config" || true').length - 1, 2);
  assert.doesNotMatch(cups, /sudo sed[^\n]*#\?/);
  assert.match(cups, /grep -Fqx "Out \$output_dir" "\$config"/);
  assert.match(cups, /grep -Fqx 'Label 0' "\$config"/);
  assert.match(cups, /lpadmin -p PDF -o PageSize=A4/);
  assert.doesNotMatch(cups, /lpadmin -p PDF[^\n]*-o media=/);
  assert.ok(cups.includes('queue_options="$(lpoptions -p PDF)"'));
  assert.ok(cups.includes('page_size_options="$(lpoptions -p PDF -l | grep -E \'^PageSize/\')"'));
  assert.ok(cups.includes("printf 'CUPS-PDF queue options: %s\\n' \"$queue_options\""));
  assert.ok(cups.includes("printf 'CUPS-PDF PageSize options: %s\\n' \"$page_size_options\""));
  assert.ok(cups.includes("grep -Eq '(^|[[:space:]])\\*(A4|iso_a4_210x297mm)([[:space:]]|$)'"));
  assert.doesNotMatch(cups, /lpoptions -p PDF \| grep -Eq/);
  const gui = stepContaining(workflow, 'pnpm run test:gui:linux');
  assert.match(gui, /^        timeout-minutes: 25$/m);
  assert.match(gui, /xvfb-run --auto-servernum/);
  assert.match(gui, /dbus-run-session/);
  assert.match(gui, /openbox/);
  assert.match(gui, /ALHANGEUL_GUI_FIXTURE_ROOT: \$\{\{ github\.workspace \}\}/);
  assert.match(gui, /ALHANGEUL_GUI_CUPS_PDF_OUTPUT: \$\{\{ env\.CUPS_PDF_OUTPUT \}\}/);
  assert.match(gui, /NO_AT_BRIDGE: "0"/);
  assert.match(gui, /GTK_MODULES: gail:atk-bridge/);
  assert.match(gui, /run_isolated_phase\(\)/);
  assert.equal((gui.match(/xvfb-run --auto-servernum/g) ?? []).length, 1);
  assert.match(gui, /openbox >"\$ALHANGEUL_GUI_OUTPUT_DIR\/openbox-\$phase\.log"/);
  assert.match(
    gui,
    /run_isolated_phase native-print pnpm run test:gui:linux:native-print[\s\\]+\|\| native_print_status=\$\?/,
  );
  assert.match(
    gui,
    /run_isolated_phase webdriver pnpm run test:gui:linux[\s\\]+\|\| webdriver_status=\$\?/,
  );
  assert.ok(
    gui.indexOf('run_isolated_phase native-print')
      < gui.indexOf('run_isolated_phase webdriver'),
  );
  assert.match(gui, /gui-phase-outcomes\.json/);
  assert.match(gui, /\[\[ "\$native_print_status" -eq 0 && "\$webdriver_status" -eq 0 \]\]/);
  assert.match(workflow, /^            scrot \\$/m);
  assert.doesNotMatch(workflow, /\/Users\/|[A-Z]:\\Users\\/);
});

test('GUI 실패와 evidence 업로드 실패를 always gate가 모두 전달한다', () => {
  const gui = stepContaining(workflow, 'pnpm run test:gui:linux');
  assert.match(gui, /^        continue-on-error: true$/m);
  const record = stepContaining(workflow, 'step-outcomes.json');
  const upload = stepContaining(workflow, 'Upload Linux GUI evidence');
  const gate = stepContaining(workflow, 'Require Linux GUI acceptance success');
  assert.match(record, /^        if: \$\{\{ always\(\) \}\}$/m);
  assert.match(upload, /^        if: \$\{\{ always\(\) \}\}$/m);
  assert.match(upload, /^          if-no-files-found: error$/m);
  assert.match(upload, /^          retention-days: 7$/m);
  assert.match(gate, /^        if: \$\{\{ always\(\) \}\}$/m);
  assert.match(gate, /PREPARE: \$\{\{ steps\.prepare-evidence\.outcome \}\}/);
  assert.match(gate, /GUI: \$\{\{ steps\.run-gui\.outcome \}\}/);
  assert.match(gate, /UPLOAD: \$\{\{ steps\.upload-evidence\.outcome \}\}/);
  assert.match(gate, /\[\[ "\$outcome" == success \]\]/);
  assert.doesNotMatch(workflow, /retry|specFileRetries/i);
});

test('이번 workflow의 외부 Action은 full immutable SHA와 version 주석으로 고정된다', () => {
  const expected = new Map([
    ['actions/checkout', ['3d3c42e5aac5ba805825da76410c181273ba90b1', 'v7.0.1']],
    ['actions/setup-node', ['820762786026740c76f36085b0efc47a31fe5020', 'v7.0.0']],
    ['actions/download-artifact', ['3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c', 'v8.0.1']],
    ['actions/upload-artifact', ['043fb46d1a93c77aae656e7c1c64a875d1fc6a0a', 'v7.0.1']],
  ]);
  const uses = [...workflow.matchAll(/^\s*uses: ([^@\s]+)@([0-9a-f]{40}) # (v\S+)$/gm)];
  assert.equal(uses.length, expected.size);
  for (const [, action, sha, version] of uses) {
    assert.deepEqual([sha, version], expected.get(action), `${action} pin이 다릅니다`);
    expected.delete(action);
  }
  assert.equal(expected.size, 0);
  assert.equal((workflow.match(/^\s*uses:/gm) ?? []).length, uses.length);
});

function topLevelKeys(source, name) {
  return topLevelSection(source, name)
    .map((line) => line.match(/^  ([A-Za-z0-9_-]+):/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function assignments(source, name) {
  const result = new Map();
  for (const line of topLevelSection(source, name)) {
    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(\S+)\s*$/);
    if (match) result.set(match[1], match[2]);
  }
  return result;
}

function topLevelSection(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.indexOf(`${name}:`);
  assert.notEqual(start, -1, `${name} section이 필요합니다`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:/.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start + 1, end);
}

function childBlock(source, parent, child, indent) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${' '.repeat(indent)}${child}:`);
  assert.notEqual(start, -1, `${parent}.${child} block이 필요합니다`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (new RegExp(`^ {${indent}}[A-Za-z0-9_-]+:`).test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}

function stepContaining(source, marker) {
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.includes(marker));
  assert.notEqual(markerLine, -1, `step marker가 필요합니다: ${marker}`);
  let start = markerLine;
  while (start >= 0 && !/^      - name: /.test(lines[start])) start -= 1;
  let end = lines.length;
  for (let index = markerLine + 1; index < lines.length; index += 1) {
    if (/^      - name: /.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}

function assertOrdered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
