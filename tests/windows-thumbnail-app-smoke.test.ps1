$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $repo 'scripts/windows-thumbnail-assessment.ps1')
. (Join-Path $repo 'scripts/windows-thumbnail-app-assessment.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
. (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-app-suite.ps1')
foreach ($kind in @('nsis', 'msi')) {
  $case = New-AppSuiteCase $kind
  Assert-Condition (@(Assert-AppDiagnostic $case.suite $inventory $kind '0.1.0' $case.legacy).Count -eq 2) 'Positive app case failed.'
}
$case = New-AppSuiteCase 'nsis' $true
[void](Assert-AppDiagnostic $case.suite $inventory 'nsis' '0.1.0' $case.legacy)
$mutations = @(
  { param($s) $s.status = 'failed' },
  { param($s) $s.cleanup = $false },
  { param($s) $s.inspection.buildReference.sourceSha = ('d' * 40) },
  { param($s) $s.inspection.buildReference.files[0].sha256 = ('d' * 64) },
  { param($s) $s.formats[1].input.probes = @() },
  { param($s) $s.formats[0].input.registrationStable = $false },
  { param($s) $s.formats[0].assessment.thumbnailPassed = $true },
  { param($s) $s.formats[0].input.probes[3].Result.phase = 'SHCreateItemFromParsingName.shellItem'; $s.formats[0].input.probes[3].Result.hresult = '0x80070057' }
)
foreach ($mutation in $mutations) {
  $changed = Copy-Case $case.suite; & $mutation $changed
  $rejected = $false
  try { [void](Assert-AppDiagnostic $changed $inventory 'nsis' '0.1.0' $case.legacy) } catch { $rejected = $true }
  Assert-Condition $rejected 'Invalid app evidence was accepted.'
}
$poisoned = Copy-Case $case.suite
$poisoned | Add-Member stateToken 'private-token'
$poisoned.formats[0].input.probes[0].Result.phase = 'private-path'
$evidence = @(Get-AppDiagnosticEvidence $poisoned) | ConvertTo-Json -Depth 12
Assert-Condition ($evidence -notmatch 'private|stateToken' -and $evidence -match '0x80040154') 'App evidence projection leaked private data.'
Write-Output 'Installed app assessment: 3 positive, 8 negative, 1 privacy cases passed (no Windows API execution).'
$privateError = [InvalidOperationException]::new('private-exception')
$privateError.Data['AlhangeulAssessmentCode'] = 'private-code'
$privateError.Data['AlhangeulAssessmentExtension'] = 'private-extension'
try { throw $privateError } catch { $safe = Get-AppAssessmentFailure $_ }
Assert-Condition ($safe.code -ceq 'unclassified' -and $null -eq $safe.extension) 'Unknown code was exposed.'
$privateError.Data['AlhangeulAssessmentCode'] = 'format-integrity'
try { throw [InvalidOperationException]::new('private-wrapper', $privateError) } catch { $safe = Get-AppAssessmentFailure $_ }
Assert-Condition ($safe.code -ceq 'format-integrity' -and $null -eq $safe.extension) 'Wrapped code or extension sanitization failed.'
Write-Output 'Assessment failure projection: unknown/wrapped exceptions sanitized.'
$missing = Get-AppInstallationEvidence ([pscustomobject]@{}) 'private-kind'
Assert-Condition ($null -eq $missing.expectedKind -and $null -eq $missing.observedKind -and $null -eq $missing.recordsReadable) 'Missing identity claimed as known.'
$malformed = Get-AppInstallationEvidence ([pscustomobject]@{ inspection = [pscustomobject]@{ installKind = 'private-kind'; installRecordsReadable = 'true' } }) 'msi'
Assert-Condition ($malformed.expectedKind -ceq 'msi' -and $null -eq $malformed.observedKind -and $null -eq $malformed.recordsReadable) 'Malformed identity was coerced or leaked.'
Assert-Condition ($missing.readFailures.Count -eq 0) 'Absent failures were invented.'
$readFailure = [pscustomobject]@{
  area = 'uninstall-product'; hive = 'machine'; field = 'publisher'; reason = 'wrong-type'
  valueType = 2; byteLength = 20; win32Error = $null; path = 'private-path'; rawValue = 'private-value'
}
$readInspection = [pscustomobject]@{
  installKind = 'unknown'; installRecordsReadable = $false; installReadFailures = @($readFailure)
}
$readEvidence = Get-AppInstallationEvidence ([pscustomobject]@{ inspection = $readInspection }) 'msi'
Assert-Condition ($readEvidence.readFailures.Count -eq 1 -and $readEvidence.readFailures[0].field -ceq 'publisher' -and $readEvidence.readFailures[0].valueType -eq 2) 'Read failure lost typed evidence.'
Assert-Condition (($readEvidence | ConvertTo-Json -Depth 8) -notmatch 'private|rawValue') 'Registry contents leaked.'
$readFailure.area = 'private-area'; $readFailure.field = 'private-field'; $readFailure.reason = 'private-reason'
$readFailure.valueType = '2'; $readFailure.byteLength = -1; $readFailure.win32Error = 'private-error'
$readInspection.installReadFailures = @($readFailure) * 12
$sanitized = Get-AppInstallationEvidence ([pscustomobject]@{ inspection = $readInspection }) 'msi'
Assert-Condition ($sanitized.readFailures.Count -eq 8 -and $null -eq $sanitized.readFailures[0].valueType -and $null -eq $sanitized.readFailures[0].byteLength) 'Read failure bounds or strict numeric types changed.'
Assert-Condition (($sanitized | ConvertTo-Json -Depth 8) -notmatch 'private') 'Unknown read failure code leaked.'
Write-Output 'Install read failures: typed evidence, absence, privacy, malformed input and bound passed.'
