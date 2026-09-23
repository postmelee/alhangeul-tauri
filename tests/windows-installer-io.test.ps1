param([string]$EvidencePath, [ValidateSet('normal', 'failure-evidence')][string]$TestMode = 'normal')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $root 'scripts\windows-installer-acceptance.ps1')
. (Join-Path $root 'scripts\windows-installer-acceptance-test-fixtures.ps1')
. (Join-Path $root 'scripts\ci\installer-process.ps1')
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-installer-io-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
$oldSummary = $env:GITHUB_STEP_SUMMARY; $oldOutput = $env:GITHUB_OUTPUT
$env:GITHUB_STEP_SUMMARY = Join-Path $temporary 'summary.md'
$env:GITHUB_OUTPUT = Join-Path $temporary 'outputs.txt'
$entry = Join-Path $root 'scripts\ci\installer-acceptance.ps1'
$inputPath = Join-Path $temporary 'prepared input.json'
$resultDirectory = Join-Path $temporary 'result with spaces'
$completed = @()
$testStatus = 'failed'
$script:lastCase = [ordered]@{ ordinal = 0; expectedExit = $null; actualExit = $null }

function Invoke-EvaluationCase($Case, $ExpectedExit) {
  $script:lastCase.ordinal++; $script:lastCase.expectedExit = $ExpectedExit; $script:lastCase.actualExit = $null
  $Case | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $inputPath -Encoding UTF8
  $before = (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash
  $actual = Invoke-CiInstallerProcess @{
    ScriptPath = $entry; Parameters = [ordered]@{ InputPath = $inputPath; OutputDirectory = $resultDirectory }
  }
  $script:lastCase.actualExit = $actual
  if ($actual -ne $ExpectedExit) { throw 'evaluation-child-exit-mismatch' }
  if ((Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash -cne $before) { throw 'evaluation-mutated-input' }
  $result = Get-Content -LiteralPath (Join-Path $resultDirectory 'installer-evaluation.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($result.provenanceStatus -cne 'requires-io-verification') { throw 'evaluation-overclaimed-provenance' }
  if ($ExpectedExit -eq 0 -and ($result.status -cne 'passed' -or $result.inputSha256 -cne $before.ToLowerInvariant())) { throw 'evaluation-result-mismatch' }
  if ($ExpectedExit -ne 0 -and $result.status -cne 'failed') { throw 'stale-success-not-invalidated' }
  return $result
}

try {
  if ($TestMode -ceq 'failure-evidence') {
    $null = Invoke-EvaluationCase (New-AcceptanceTestCase) 0
    throw 'synthetic-preservation-check'
  }
  foreach ($spec in @(
    @{ Kind = 'msi'; Contract = 'strict-product'; Limited = $false; Reboot = $false },
    @{ Kind = 'nsis'; Contract = 'hosted-nsis-diagnostic'; Limited = $true; Reboot = $false },
    @{ Kind = 'msi'; Contract = 'msi-forced-reinstall-reboot'; Limited = $false; Reboot = $true }
  )) {
    $case = New-AcceptanceTestCase $spec.Kind $spec.Contract $spec.Limited $spec.Reboot
    $result = Invoke-EvaluationCase $case 0
    if ($result.verdict.rawSmoke.exitCode -ne $case.smokeExitCode -or $result.verdict.reuseEligible) { throw 'raw-failure-or-reuse-changed' }
    $completed += $spec.Contract
  }
  foreach ($code in @(23, '0')) {
    $case = New-AcceptanceTestCase; $case.smokeExitCode = $code
    $null = Invoke-EvaluationCase $case 1
  }
  $case = New-AcceptanceTestCase; $case.summary.Installers[0].Failures += @{ Category = 'private'; Message = 'PRIVATE-SENTINEL' }
  $null = Invoke-EvaluationCase $case 1
  $case = New-AcceptanceTestCase; $case.context.contract = 'hosted-nsis-diagnostic'
  $null = Invoke-EvaluationCase $case 1
  foreach ($invalid in @('{', '{"Status":1,"status":2}')) {
    Set-Content -LiteralPath $inputPath -Value $invalid -Encoding UTF8
    $actual = Invoke-CiInstallerProcess @{ ScriptPath = $entry; Parameters = [ordered]@{ InputPath = $inputPath; OutputDirectory = $resultDirectory } }
    if ($actual -ne 1) { throw 'invalid-json-accepted' }
    $result = Get-Content -LiteralPath (Join-Path $resultDirectory 'installer-evaluation.json') -Raw | ConvertFrom-Json
    if ($result.status -cne 'failed') { throw 'invalid-json-left-stale-success' }
  }
  $childPath = Join-Path $temporary 'synthetic child.ps1'
  $exitPath = Join-Path $temporary 'smoke-process.json'
  Set-Content -LiteralPath $childPath -Encoding UTF8 -Value 'param([int]$Code, [string]$Value) if ($Value -cne "value with spaces") { exit 91 }; exit $Code'
  foreach ($code in @(0, 1, 23, 3010)) {
    $actual = Invoke-CiRecordedInstallerProcess @{ ScriptPath = $childPath; Parameters = [ordered]@{ Code = $code; Value = 'value with spaces' } } $exitPath
    if ($actual -ne $code) { throw 'child-exit-was-normalized' }
    $record = Get-Content -LiteralPath $exitPath -Raw | ConvertFrom-Json
    if ($record.status -cne 'completed' -or $record.exitCode -ne $code) { throw 'recorded-process-exit-mismatch' }
  }
  $rejected = $false
  try { Invoke-CiRecordedInstallerProcess @{ ScriptPath = $childPath; Parameters = @{ 'bad-name' = 'value' } } $exitPath }
  catch { $rejected = $true }
  $record = Get-Content -LiteralPath $exitPath -Raw | ConvertFrom-Json
  if (-not $rejected -or $record.status -cne 'not-started' -or $null -ne $record.exitCode) { throw 'startup-failure-left-stale-exit' }
  $outputs = Get-Content -LiteralPath $env:GITHUB_OUTPUT -Raw
  $summary = Get-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Raw -Encoding UTF8
  foreach ($marker in @('contract_status=passed', 'contract_status=failed', 'product_observation=limited')) {
    if (-not $outputs.Contains($marker)) { throw 'missing-github-output' }
  }
  if (-not $summary.Contains('0x80040154') -or -not $summary.Contains('3010')) { throw 'missing-limitation-summary' }
  if ($summary.Contains('PRIVATE-SENTINEL') -or $summary.Contains($temporary)) { throw 'summary-leaked-private-input' }
  $failureEvidence = Join-Path $temporary 'expected-failure.json'
  Write-Output 'Expected negative: child exits 1 after evaluation to verify failure evidence preservation.'
  $actual = Invoke-CiInstallerProcess @{ ScriptPath = $PSCommandPath; Parameters = [ordered]@{ EvidencePath = $failureEvidence; TestMode = 'failure-evidence' } }
  if ($actual -ne 1) { throw 'failure-evidence-probe-did-not-fail' }
  $preserved = Get-Content -LiteralPath $failureEvidence -Raw | ConvertFrom-Json
  if ($preserved.status -cne 'failed' -or $preserved.lastCase.actualExit -ne 0) { throw 'failure-evidence-was-lost' }
  foreach ($name in @('installer-evaluation.json', 'installer-evaluation-io.json', 'installer-evaluation-driver.json')) {
    if (-not (Test-Path -LiteralPath "$failureEvidence.$name" -PathType Leaf)) { throw 'failure-detail-was-lost' }
  }
  $testStatus = 'passed'
  Write-Output 'Installer evaluation IO regressions passed; no installed product or artifact provenance acceptance.'
} finally {
  try {
    if ($EvidencePath) {
      [ordered]@{ schemaVersion = 1; status = $testStatus; contracts = $completed; lastCase = $script:lastCase; installedProductAcceptance = 'unverified' } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
      # Only controlled evaluator records; no raw input, private paths or exception text.
      foreach ($name in @('installer-evaluation.json', 'installer-evaluation-io.json', 'installer-evaluation-driver.json')) {
        $source = Join-Path $resultDirectory $name
        if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination "$EvidencePath.$name" }
      }
    }
  } finally {
    $env:GITHUB_STEP_SUMMARY = $oldSummary; $env:GITHUB_OUTPUT = $oldOutput
    Remove-Item -LiteralPath $temporary -Recurse -Force
  }
}
exit 0
