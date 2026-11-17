Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-msi-upgrade.ps1')
$expected = [pscustomobject]@{ ProductCode = '{33333333-3333-3333-3333-333333333333}'; ProductVersion = '0.1.3' }
$script:entryCount = 1; $script:version = '0.1.3'; $script:oldPresent = $false
function Get-ChildItem { param($LiteralPath); for ($i=0; $i -lt $script:entryCount; $i++) { [pscustomobject]@{ PSPath = 'synthetic'; PSChildName = $expected.ProductCode } } }
function Get-ItemProperty { param($LiteralPath); [pscustomobject]@{ DisplayName = 'Alhangeul'; DisplayVersion = $script:version } }
function Test-Path { param($LiteralPath); return $script:oldPresent }
function Assert-Rejected($Action) {
  $rejected = $false
  try { & $Action | Out-Null } catch { $rejected = $true }
  if (-not $rejected) { throw 'invalid-msi-registration-accepted' }
}
$result = Test-GuestMsiRegistration $expected '{11111111-1111-1111-1111-111111111111}'
if (-not $result.previousProductRemoved -or $result.entries.Count -ne 1) { throw 'missing-msi-upgrade-proof' }
$script:entryCount = 2; Assert-Rejected { Test-GuestMsiRegistration $expected }
$script:entryCount = 0; Assert-Rejected { Test-GuestMsiRegistration $expected }
$script:entryCount = 1; $script:version = '0.1.2'; Assert-Rejected { Test-GuestMsiRegistration $expected }
$script:version = '0.1.3'; $script:oldPresent = $true
Assert-Rejected { Test-GuestMsiRegistration $expected '{11111111-1111-1111-1111-111111111111}' }
Write-Output 'MSI replacement rejects missing, duplicate, stale version and old product registration.'
