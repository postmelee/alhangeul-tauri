Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-upgrade.ps1')
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-prerequisites.ps1')
$root = Join-Path $env:TEMP ('alh-guest-contract-' + [guid]::NewGuid().ToString())
$output = Join-Path $root 'evidence'
function Assert-Throws($Action) {
  $thrown = $false
  try { & $Action | Out-Null } catch { $thrown = $true }
  if (-not $thrown) { throw 'expected-rejection' }
}
try {
  New-Item -ItemType Directory -Path $output, (Join-Path $root 'scripts') | Out-Null
  $file = Join-Path $root 'fixture.txt'
  Set-Content $file 'Synthetic fixture' -Encoding ASCII
  $hash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()
  $fixtures = @('small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg') | ForEach-Object { @{ id = $_; path = 'fixture.txt'; sha256 = $hash } }
  @{ fixtures = $fixtures } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $root 'scripts/windows-thumbnail-fixtures.json')
  @'
param($Mode, $InputPath, $OutputPath)
if (Test-Path $OutputPath) { throw 'create-new-required' }
'{"status":"ok","bitmapPresent":true,"hresult":"0x00000000"}' | Set-Content $OutputPath
'@ | Set-Content (Join-Path $root 'scripts/windows-thumbnail-diagnostics.ps1')
  foreach ($phase in @('baseline', 'upgrade', 'reinstall')) {
    $actual = @(Get-GuestProbes $phase)
    if ($actual.Count -ne 4 -or @($actual | Where-Object phase -ne $phase).Count -gt 0) { throw 'phase-probes-missing' }
  }
  if (@(Get-ChildItem $output -File).Count -ne 12) { throw 'raw-phases-overwritten' }
  Assert-Throws { Get-GuestProbes baseline }
  Get-ChildItem $output -File | Remove-Item
  @'
param($Mode, $InputPath, $OutputPath)
'{"status":"failed","bitmapPresent":null,"hresult":"0x8004B200"}' | Set-Content $OutputPath
'@ | Set-Content (Join-Path $root 'scripts/windows-thumbnail-diagnostics.ps1')
  $failedBaseline = @(Get-GuestProbes baseline)
  if ($failedBaseline.Count -ne 4 -or @($failedBaseline | Where-Object hresult -ne '0x8004B200').Count -gt 0) { throw 'baseline-failure-not-preserved' }
  Assert-Throws { Get-GuestProbes upgrade }
  $binary = [pscustomobject]@{ name = 'fixture.txt'; bytes = (Get-Item $file).Length; sha256 = $hash }
  Assert-GuestBinaries @($binary) $root
  $binary.sha256 = '0' * 64
  Assert-Throws { Assert-GuestBinaries @($binary) $root }
  $report = @{ sentinels = @(@{ path = $file; sha256 = $hash.ToUpperInvariant(); preserved = $false }) }
  Test-GuestSentinels
  Set-Content $file 'Changed'
  Assert-Throws { Test-GuestSentinels }
  $inputData = @{ prerequisites = @([pscustomobject]@{ name = 'vc'; file = 'vc-redist.exe'; bytes = (Get-Item $file).Length; sha256 = (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant() }) }
  Copy-Item $file (Join-Path $root 'vc-redist.exe')
  function Get-AuthenticodeSignature { param($LiteralPath); return [pscustomobject]@{ Status = $script:signatureStatus; SignerCertificate = [pscustomobject]@{ Subject = 'CN=Microsoft Corporation, O=Microsoft Corporation, C=US' } } }
  function Run-Owned { param($File, $Arguments, $Seconds); return $script:installerExit }
  $script:signatureStatus = 'Valid'; $script:installerExit = 0
  if (@(Install-GuestPrerequisites).Count -ne 1) { throw 'prerequisite-evidence-missing' }
  $script:signatureStatus = 'UnknownError'
  Assert-Throws { Install-GuestPrerequisites }
  $script:signatureStatus = 'Valid'; $script:installerExit = 3010
  Assert-Throws { Install-GuestPrerequisites }
  $inputData.prerequisites[0].file = 'arbitrary.exe'
  Assert-Throws { Install-GuestPrerequisites }
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force
}
Write-Output 'Guest upgrade phases, preservation and signed prerequisite contracts passed.'
