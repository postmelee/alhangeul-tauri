Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -Path @((Join-Path $PSScriptRoot '../scripts/ci/guest-ui-provider.cs'), (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-native.cs'), (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-interop.cs'), (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-cache-comparison.cs'))
$missing = Join-Path $env:TEMP ([guid]::NewGuid().ToString() + '.hwp')
$result = [Alhangeul.GuestProviderDiagnostic.Probe]::Run($missing)
if ($result.status -ne 'failed' -or $result.phase -ne 'open-stream' -or $result.hresult -ne '0x80070002' -or (Test-Path $missing)) {
  throw 'provider-stream-must-be-read-only-and-fail-for-missing-input'
}
$invalid = [Alhangeul.ThumbnailDiagnostics.GuestCacheComparison]::Run($missing, 0)
if ($invalid.status -ne 'failed' -or $invalid.detailCode -ne 'invalid-comparison-context') { throw 'unapproved-cache-flags-accepted' }
foreach ($flags in @(4, 0x104, 0xC04)) {
  $result = [Alhangeul.ThumbnailDiagnostics.GuestCacheComparison]::Run($missing, $flags)
  if ($result.status -ne 'failed' -or $result.phase -ne 'SHCreateItemFromParsingName.shellItem' -or $result.requestFlags -ne $flags) { throw 'missing-comparison-input-accepted' }
}
Write-Output 'Provider/cache interop compiles; missing inputs and unapproved comparison flags are rejected.'
