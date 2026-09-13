import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const names = ['windows-installer-acceptance.ps1', 'windows-installer-acceptance-evidence.ps1',
  'windows-installer-acceptance-policy.ps1', 'windows-installer-acceptance-tests.ps1',
  'windows-installer-acceptance-test-fixtures.ps1'];
const sources = await Promise.all(names.map((name) => read('scripts/' + name)));
const [entry, evidence, policy, regressions, fixtures] = sources;
const implementation = [entry, evidence, policy].join('\n');

test('순수 수용 판정은 작은 역할별 파일·함수로 분리된다', () => {
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    assert.ok(source.split('\n').length <= 300, names[i]);
    // ASCII source remains readable by Windows PowerShell 5.1 without a BOM.
    assert.doesNotMatch(source, /[^\x00-\x7f]/);
    for (const fn of source.split(/^function /m).slice(1)) {
      const end = fn.indexOf('\n}\n');
      assert.ok(end > 0, fn.split('\n')[0]);
      assert.ok(fn.slice(0, end + 2).split('\n').length <= 50, fn.split('\n')[0]);
      const parameters = fn.split('\n')[0].match(/^[^(]+\(([^)]*)\)/)?.[1] ?? '';
      assert.ok(parameters.split(',').length <= 5, fn.split('\n')[0]);
    }
  }
});

test('기존 순수 판정을 재계산하며 설치·등록·파일 IO를 하지 않는다', () => {
  for (const helper of ['windows-thumbnail-assessment.ps1', 'windows-installer-reboot.ps1']) assert.ok(entry.includes(helper));
  assert.match(evidence, /Get-ThumbnailPhaseAssessment \$r.Probes \$ctx \$phase/);
  assert.match(policy, /Get-InstallerRebootAssessment \$Kind \$Code/);
  assert.match(evidence, /Test-AcceptanceEqual \$assessment \$r.Assessments\[\$i\]/);
  assert.doesNotMatch(implementation, /Get-Content|Set-Content|Out-File|Start-Process|Add-Type|RegistryKey|Remove-Item|Restart-Computer|Measure-InstallerReboot|Get-InstallerRebootSnapshot/);
  assert.doesNotMatch(entry, /\. \([^\n]*-tests\.ps1/);
  assert.doesNotMatch(implementation, /\$(?:InputEvidence|r|s|Result|Event)\.[\w.]+\s*=(?!=)/);
});

test('계약 성공과 제품 제한·재부팅 후 미검증·재사용을 분리한다', () => {
  for (const contract of ['strict-product', 'hosted-nsis-diagnostic', 'msi-forced-reinstall-reboot']) assert.ok(entry.includes(contract));
  for (const field of ['contractStatus', 'thumbnailStatus', 'lifecycleStatus', 'reasonCodes', 'productAcceptance', 'releaseAcceptance', 'provenanceStatus', 'rawSmoke']) assert.ok(entry.includes(field));
  for (const reason of ['nsis-per-user-shell-activation-failed', 'msi-reboot-required', 'post-reboot-unverified', 'known-limitation-not-reproduced']) assert.ok(entry.includes(reason));
  assert.match(entry, /reuseEligible = \$false/);
  assert.doesNotMatch(entry, /reuseEligible\s*=\s*\$true|releaseAcceptance\s*=\s*'passed'/);
  assert.match(entry, /requires-io-verification/);
  assert.doesNotMatch(entry, /Exception\.Message|Message\s*=|Path\s*=/);
});

test('exact identity·원시 실패 집합·필수 step·정리 증거를 요구한다', () => {
  for (const field of ['runId', 'runAttempt', 'workflowSha', 'harnessSha', 'productSha', 'artifactId', 'artifactDigest', 'sourceMode']) assert.ok(evidence.includes(field));
  assert.match(evidence, /\$c.productSha -ceq \$c.workflowSha/);
  assert.match(evidence, /Assert-AcceptanceArray \$r.Probes 38/);
  assert.match(evidence, /Test-AcceptanceEqual \$r.ExpectedPhases \$Phases/);
  assert.match(evidence, /Test-AcceptanceEqual \$s.OriginalDefaults \$s.RestoredDefaults/);
  assert.match(evidence, /Assert-AcceptanceTrue \$integrity.unchanged/);
  assert.match(policy, /Test-AcceptanceEqual \$_ \$failure/);
  assert.match(policy, /Assert-AcceptanceArray \$matches 1/);
  assert.match(policy, /\$label failed: \$api, 0x80040154/);
  assert.match(policy, /\$InputEvidence.smokeExitCode -eq \$exitCode/);
  assert.match(policy, /\$steps\.\$name -ceq 'success'/);
});

test('Windows 실행 회귀는 정상·known-negative·3010과 독립 반례를 준비한다', () => {
  for (const marker of ['strict-rejects-known-negative', 'ordinary-msi-does-not-allow-3010', 'unknown-contract',
    'identity-', 'missing-step-', 'unknown-process-exit', 'known-failure-rewritten-success',
    'JSON round-trip changed acceptance', 'acceptance mutated raw evidence', 'private data leaked',
    'summary-outcome-mismatch', 'ordinary-workflow-source-mismatch']) assert.ok(regressions.includes(marker), marker);
  for (const marker of ['1641', '1602', '1603', "'3010'", 'unreadable', 'FixtureId', 'NoDanglingCanonicalDefault',
    'RebootEvents[1].markers[1].id', 'GracefulExit = $false', 'THUMBNAIL-RENDER', 'policyVersion']) assert.ok(regressions.includes(marker), marker);
  assert.match(fixtures, /Cold-cache misses are observations/);
  assert.doesNotMatch(fixtures, /Start-Process|Get-Content|Set-Content|RegistryKey|Add-Type/);
});

test('기존 Windows fast 자동 발견과 Node automation glob에 포함된다', async () => {
  const [wrapper, runner, packageText] = await Promise.all([
    read('tests/windows-installer-acceptance.test.ps1'), read('scripts/ci/windows-tests.ps1'), read('package.json'),
  ]);
  assert.match(wrapper, /Invoke-CiPowerShellTest -Path .*windows-installer-acceptance-tests.ps1/);
  assert.match(runner, /-Recurse -Filter '\*\.test\.ps1'/);
  assert.ok(JSON.parse(packageText).scripts['test:automation'].includes('tests/ci-*.test.mjs'));
});

test('PSObject로 감싼 scalar를 객체로 오인하지 않고 합성 실패 위치만 출력한다', () => {
  assert.match(evidence, /\$leftObject = .*System\.Management\.Automation\.PSCustomObject/);
  assert.match(evidence, /\$rightObject = .*System\.Management\.Automation\.PSCustomObject/);
  assert.doesNotMatch(evidence, /-is \[pscustomobject\]/i);
  for (const marker of ['pipeline-wrapped string rejected', 'pipeline fixture JSON comparison rejected',
    'scalar type/value distinction lost', 'synthetic failure site missing', 'failure site leaked values or paths']) assert.ok(regressions.includes(marker));
  assert.match(regressions, /Get-AcceptanceTestFailureSite \$Case/);
  assert.match(regressions, /\$sites \+= "\$\(\$Matches\[1\]\):\$\(\$Matches\[2\]\)"/);
  assert.doesNotMatch(regressions, /Write-Output \$_|Write-Output .*ScriptStackTrace|Exception\.Message/);
});
