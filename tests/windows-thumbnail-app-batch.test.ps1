$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-assessment.ps1')
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-app-assessment.ps1')
. (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-app-suite.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Assert-Check($Evaluation, $Code, $Extension, $Status) {
  $rows = @($Evaluation.checks | Where-Object { $_.code -ceq $Code -and $_.extension -ceq $Extension })
  Assert-Condition ($rows.Count -eq 1 -and $rows[0].status -ceq $Status) "Unexpected condition: $Code/$Extension"
}
foreach ($kind in @('nsis', 'msi')) {
  $case = Copy-Case (New-AppSuiteCase $kind)
  Assert-Condition (@($case.suite.formats | Where-Object { $_.input.installKind -cne $kind }).Count -eq 0) 'Fixture identity differs from native invariant.'
  $evaluation = Get-AppDiagnosticAssessment $case.suite $inventory $kind '0.1.0' $case.legacy
  Assert-Condition ($evaluation.passed -and $evaluation.checks.Count -eq 23) 'Valid suite failed.'
}
$case = Copy-Case (New-AppSuiteCase 'msi')
$case.suite.inspection.installKind = 'unknown'
$case.suite.inspection.buildReference.files[0].sha256 = ('d' * 64)
$case.suite.formats[0].input.integrity = $false
$evaluation = Get-AppDiagnosticAssessment $case.suite $inventory 'msi' '0.1.0' $case.legacy
Assert-Condition (-not $evaluation.passed) 'Multi-fault suite accepted.'
Assert-Check $evaluation 'installation-identity' $null 'failed'
Assert-Check $evaluation 'binary-reference' $null 'failed'
Assert-Check $evaluation 'format-integrity' '.hwp' 'failed'
Assert-Check $evaluation 'independent-assessment' '.hwpx' 'passed'

foreach ($missing in @('inspection', 'formats')) {
  $case = Copy-Case (New-AppSuiteCase 'msi')
  $case.suite.PSObject.Properties.Remove($missing)
  $evaluation = Get-AppDiagnosticAssessment $case.suite $inventory 'msi' '0.1.0' $case.legacy
  Assert-Condition (-not $evaluation.passed -and $evaluation.checks.Count -eq 23) 'Missing dependency hid other checks or passed.'
  if ($missing -ceq 'inspection') {
    Assert-Check $evaluation 'binary-reference' $null 'not-evaluable'
    Assert-Check $evaluation 'independent-assessment' '.hwp' 'passed'
  } else {
    Assert-Check $evaluation 'reported-assessment' '.hwp' 'not-evaluable'
    Assert-Check $evaluation 'installation-identity' $null 'passed'
  }
}
$case = Copy-Case (New-AppSuiteCase 'msi')
$case.suite.formats[0].input.probes = @()
$case.legacy = @()
$evaluation = Get-AppDiagnosticAssessment $case.suite $inventory 'msi' '0.1.0' $case.legacy
Assert-Check $evaluation 'independent-assessment' '.hwp' 'failed'
Assert-Check $evaluation 'reported-assessment' '.hwp' 'not-evaluable'
Assert-Check $evaluation 'fixture-parity' '.hwpx' 'not-evaluable'
foreach ($field in @('cleanup', 'integrity', 'registrationStable')) {
  $case = Copy-Case (New-AppSuiteCase 'msi')
  $case.suite.formats[0].input.$field = 'true'
  $evaluation = Get-AppDiagnosticAssessment $case.suite $inventory 'msi' '0.1.0' $case.legacy
  Assert-Check $evaluation 'format-integrity' '.hwp' 'failed'
}

# Safe projected probes retain the fields needed for the same independent classifier.
foreach ($limited in @($false, $true)) {
  $case = Copy-Case (New-AppSuiteCase 'nsis' $limited)
  $evidence = @(Get-AppDiagnosticEvidence $case.suite) | ConvertTo-Json -Depth 16 | ConvertFrom-Json
  foreach ($format in $evidence) {
    Assert-Condition (@($format.probes | Where-Object { -not $_.originalContractValid }).Count -eq 0) 'Invalid original evidence used for replay.'
    $records = @($format.probes | ForEach-Object { [pscustomobject]@{ Label = $_.label; Result = $_ } })
    $replayed = Get-CheckAssessment $records ([pscustomobject]@{ ready = $true; registrationScope = $format.registration.scope }) $format.extension $true
    Assert-Condition ($replayed.evidenceStatus -ceq 'valid' -and $replayed.finding -ceq $format.assessment.finding) 'Safe projection cannot reproduce probe classification.'
    Assert-Condition ($format.integrity -and $format.cleanup -and $format.registrationStable) 'Lifecycle evidence lost.'
  }
}
$case = Copy-Case (New-AppSuiteCase 'msi')
$case.suite.formats[0].assessment.finding = 'private-assessment'
$case.suite.formats[0].input.integrity = 'private-integrity'
foreach ($property in $case.suite.formats[0].input.probes[0].Result.PSObject.Properties) { $property.Value = 'private-probe' }
$evidence = @(Get-AppDiagnosticEvidence $case.suite)
$text = $evidence | ConvertTo-Json -Depth 16
Assert-Condition ($text -notmatch 'private|stateToken' -and $null -eq $evidence[0].integrity -and $null -eq $evidence[0].assessment.finding -and -not $evidence[0].probes[0].originalContractValid) 'Malformed evidence leaked or coerced.'
Assert-Condition (@(Get-AppDiagnosticEvidence ([pscustomobject]@{})).Count -eq 0) 'Missing evidence fabricated.'
Write-Output 'Batch assessment: simultaneous faults, missing dependencies, strict booleans, fixture identity, safe probe replay and privacy passed (synthetic only).'
