Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'disposable-hosted-only' }
. (Join-Path $PSScriptRoot '../scripts/ci/hosted-ui-view.ps1')
$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced')
$before = @{ exists = $key.GetValueNames() -contains 'IconsOnly'; value = $key.GetValue('IconsOnly') }
$key.Dispose()
$state = $null
try {
  $state = Set-HostedThumbnailView
  if (-not $state.applied -or $state.exists -ne $before.exists -or $state.value -ne $before.value) { throw 'display-preference-snapshot-invalid' }
} finally {
  if ($state) { Restore-HostedThumbnailView $state }
}
if (-not $state.restored) { throw 'display-preference-roundtrip-failed' }
Write-Output 'Explorer IconsOnly apply/restore roundtrip passed without changing policies.'
