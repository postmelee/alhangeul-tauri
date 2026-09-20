import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [assessment, reboot, nativeTests, smoke, fixtures, workflow, packageText] = await Promise.all([
  'scripts/windows-thumbnail-assessment.ps1', 'scripts/windows-installer-reboot.ps1',
  'scripts/windows-thumbnail-assessment-tests.ps1', 'scripts/windows-installer-smoke.ps1',
  'scripts/windows-thumbnail-fixtures.ps1', '.github/workflows/alhangeul-windows-smoke.yml', 'package.json',
].map(read));

test('새 helper는 BOM·파일 300줄·함수 50줄·입력 5개 경계를 지킨다', () => {
  for (const source of [assessment, reboot, nativeTests]) {
    assert.equal(source.charCodeAt(0), 0xfeff);
    assert.ok(source.split('\n').length <= 300);
    const functions = source.split(/^function /m).slice(1);
    for (const fn of functions) {
      const body = fn.slice(0, fn.indexOf('\n}\n') + 2);
      assert.ok(body.split('\n').length <= 50, fn.split('\n')[0]);
      const parameters = fn.match(/^[^(]+\(([^)]*)\)/)?.[1] ?? '';
      assert.ok(parameters.split(',').length <= 5);
    }
  }
});

test('분류기는 환경이나 원시 결과를 변경하지 않는 순수 함수다', () => {
  assert.doesNotMatch(assessment, /Get-Content|Set-Content|Start-Process|Get-Item|RegistryKey|Add-Type|Remove-Item/);
  assert.doesNotMatch(assessment, /\$(?:Probe|record|Context)\.[\w.]+\s*=(?!=)/);
  for (const field of ['evidenceStatus', 'thumbnailStatus', 'lifecycleStatus', 'finding', 'recommendedAction', 'evidenceLabels', 'cacheObservations', 'documents']) assert.ok(assessment.includes(field));
  assert.match(nativeTests, /classification mutated raw evidence/);
});

test('UAC 값 대신 등록·연결·COM·JPG·실제 Shell/force 결과로 분류한다', () => {
  assert.doesNotMatch(assessment, /enableLUA|IconsOnly/i);
  for (const finding of ['diagnostic-invalid', 'registration-mismatch', 'shell-control-failed', 'per-user-shell-activation-failed', 'thumbnail-api-ok', 'unclassified-failure']) assert.ok(assessment.includes(finding));
  assert.match(assessment, /\$Context.kind -ne 'nsis'/);
  assert.match(assessment, /\$machine\[0\].inproc.status -eq 'missing'/);
  assert.match(assessment, /\$Pair\[0\].phase -eq 'IShellItemImageFactory.GetImage'/);
  assert.match(assessment, /\$Pair\[1\].phase -eq 'IThumbnailCache.GetThumbnail'/);
  assert.match(assessment, /\$findings.Count -eq 1/);
});

test('bitmap 및 진단 증거 누락은 성공으로 완화하지 않는다', () => {
  assert.match(assessment, /\$Probe.bitmapPresent -is \[bool\]/);
  assert.match(assessment, /\$Probe.width -is \[int\]/);
  assert.match(assessment, /\$records.Count -ne 19/);
  assert.match(assessment, /Test-ThumbnailProbeContract \$record.Result \$record.Label/);
  assert.match(fixtures, /종료 상태별 phase 계약이 다릅니다/);
  assert.match(fixtures, /probe JSON과 summary가 다릅니다/);
  assert.match(fixtures, /환경 JSON과 summary가 다릅니다/);
});

test('재부팅 표식은 읽기 전용이며 payload를 보고하지 않는다', () => {
  assert.match(reboot, /OpenSubKey\(\$Path, \$false\)/);
  assert.match(reboot, /PendingFileRenameOperations/);
  assert.match(reboot, /baselinePresent = \$baseline; present = \$present; changed = \$changed/);
  assert.match(reboot, /MsiSystemRebootPending/);
  assert.doesNotMatch(reboot, /SetValue|DeleteValue|CreateSubKey|Remove-Item|Restart-Computer|Stop-Process/);
  const returned = reboot.slice(reboot.indexOf('function Compare-InstallerRebootSnapshot'), reboot.indexOf('function Read-InstallerRebootLog'));
  assert.doesNotMatch(returned, /\$records \+= .*payload\s*=/);
});

test('MSI 코드와 NSIS 코드는 섞지 않으며 재부팅은 rollback을 막는다', () => {
  for (const code of ['3010', '1641', '1602']) assert.ok(reboot.includes('$ExitCode -eq ' + code));
  assert.match(reboot, /\$Kind -eq 'msi'/);
  assert.match(reboot, /rollbackEligible = \$Kind -eq 'msi' -and \$state -eq 'no-reboot-observed'/);
  assert.match(smoke, /\$Scenario -eq 'lifecycle'.*\$result.ReinstallExitCode -eq 0.*\$result.RebootEvents.Count -eq 3/);
  assert.match(smoke, /\$result.InitialShellSucceeded -and \$rollbackSafe/);
  assert.match(smoke, /not-run-scenario-reboot-or-prerequisite/);
});

test('일반 재설치와 강제 교체는 명시적인 scenario와 별도 VM이다', () => {
  assert.match(smoke, /ValidateSet\('lifecycle', 'forced-reinstall'\)/);
  assert.match(smoke, /\$Scenario -ne 'forced-reinstall' -or \$InstallerKind -eq 'msi'/);
  assert.match(smoke, /'REINSTALLMODE=amus'.*'REINSTALLMODE=omus'/);
  assert.match(smoke, /pre-reboot-observation/);
  const job = workflow.slice(workflow.indexOf('  windows-installer-smoke:'), workflow.length);
  for (const artifact of ['nsis-installer-smoke', 'msi-installer-smoke', 'msi-forced-reinstall']) assert.ok(job.includes('artifact: ' + artifact));
  assert.equal((job.match(/            scenario:/g) ?? []).length, 3);
  assert.match(job, /-Scenario \$env:INSTALLER_SCENARIO/);
});

test('진단 gate 성공으로 제품 실패 gate를 무시하지 않는다', () => {
  const job = workflow.slice(workflow.indexOf('  windows-installer-smoke:'), workflow.length);
  assert.equal((job.match(/continue-on-error: true/g) ?? []).length, 1);
  assert.match(job, /id: diagnostic-contract/);
  assert.match(job, /smoke = \$env:SMOKE_OUTCOME/);
  assert.match(job, /diagnosticContract = \$env:DIAGNOSTIC_OUTCOME/);
  assert.match(job, /throw "Windows installer smoke gate failed/);
  assert.match(nativeTests, /diagnostic success masked product failure/);
  for (const marker of ['Assert-ThumbnailProbeEvidence $result', 'assessment read-back mismatch', 'workflow/source identity mismatch', 'boundary state read-back mismatch', 'reboot exit code mismatch', 'lifecycle assessment mismatch']) assert.ok(nativeTests.includes(marker));
});

test('Windows native 회귀는 정상·실패·반례·재부팅 경계를 실행한다', () => {
  for (const marker of ['foreach ($uac in @(0, 1))', "New-AssessmentCase 'msi'", 'control-jpg-shell', "'activate'", 'unreadable', 'child-timeout', 'bitmapPresent = $false', '3010', '1641', '1602', '1603', 'baseline reboot state ignored', 'private-source', 'missing MSI log accepted']) assert.ok(nativeTests.includes(marker), marker);
  assert.match(workflow, /name: Test Windows thumbnail assessment contracts/);
  assert.match(workflow, /run: .\\scripts\\windows-thumbnail-assessment-tests.ps1/);
});

test('automation suite에 신규 계약 검사가 포함된다', () => {
  assert.ok(JSON.parse(packageText).scripts['test:automation'].includes('tests/windows-thumbnail-assessment.test.mjs'));
});
