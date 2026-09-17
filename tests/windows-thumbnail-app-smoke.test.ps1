$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $repo 'scripts/windows-thumbnail-assessment.ps1')
. (Join-Path $repo 'scripts/windows-thumbnail-app-assessment.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Copy-Case($Value) { return ($Value | ConvertTo-Json -Depth 32 | ConvertFrom-Json) }
$base = (Get-Content (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-app-assessments.json') -Raw -Encoding UTF8 | ConvertFrom-Json).base
$inventory = [pscustomobject]@{ sourceSha = ('a' * 40); files = @(
  [pscustomobject]@{ kind = 'thumbnail-handler'; size = 20; sha256 = ('b' * 64) },
  [pscustomobject]@{ kind = 'thumbnail-worker'; size = 30; sha256 = ('c' * 64) }
) }
function New-AppSuiteCase($Kind, $Limited = $false) {
  $scope = if ($Kind -eq 'nsis') { 'user-only' } else { 'machine-only' }
  $formats = @(); $legacy = @()
  foreach ($extension in @('.hwp', '.hwpx')) {
    $inputValue = Copy-Case $base
    $inputValue.extension = $extension; $inputValue.registration.scope = $scope
    $inputValue.probes[0].Label = "manual-association-$($extension.TrimStart('.'))"
    if ($Limited) {
      foreach ($record in $inputValue.probes) {
        if ($record.Label -cin @('manual-document-shell', 'manual-document-force-extract')) {
          $record.Result.status = 'failed'; $record.Result.hresult = '0x80040154'
          $record.Result.bitmapPresent = $false; $record.Result.width = $null; $record.Result.height = $null
          if ($record.Result.mode -eq 'force-extract') { $record.Result.phase = 'IThumbnailCache.GetThumbnail' }
        }
      }
    }
    $fixture = if ($extension -eq '.hwp') { 'small-hwp' } else { 'form-hwpx' }
    foreach ($mode in @('shell', 'force-extract')) {
      $probe = ($inputValue.probes | Where-Object { $_.Label -ceq "manual-document-$mode" }).Result
      $legacy += [pscustomobject]@{ Label = "initial-$fixture-$mode"; Result = $probe }
    }
    $assessment = [pscustomobject]@{ evidenceValid = $true; thumbnailPassed = -not $Limited; finding = $(if ($Limited) { 'per-user-shell-activation-failed' } else { 'thumbnail-api-ok' }); recommendedAction = $(if ($Limited) { 'consider-msi' } else { 'none' }) }
    $formats += [pscustomobject]@{ input = $inputValue; assessment = $assessment }
  }
  $reference = [pscustomobject]@{ schemaVersion = 1; sourceSha = $inventory.sourceSha; productVersion = '0.1.0'; files = @(
    [pscustomobject]@{ name = 'AlhangeulThumbnailHandler.dll'; bytes = 20; sha256 = ('b' * 64) },
    [pscustomobject]@{ name = 'AlhangeulThumbnailWorker.exe'; bytes = 30; sha256 = ('c' * 64) }
  ) }
  return [pscustomobject]@{ legacy = $legacy; suite = [pscustomobject]@{ status = 'completed'; cleanup = $true; formats = $formats; inspection = [pscustomobject]@{
    buildReference = $reference; installKind = $Kind; installRecordsReadable = $true; registration = @($formats | ForEach-Object { $_.input.registration })
  } } }
}
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
