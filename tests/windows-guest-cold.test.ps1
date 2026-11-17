Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-cold-start.ps1')
$inputData = @{ binaries = @() }
$report = @{ failure = 'upgrade-immediate-thumbnail-failed' }
$script:installExit = 0; $script:hashValid = $true; $script:probeCalls = 0
function Invoke-GuestInstall { param($Operation); if ($Operation -ne 'reinstall') { throw 'unexpected-operation' }; return $script:installExit }
function Assert-GuestBinaries { param($Binaries, $Directory); if (-not $script:hashValid) { throw 'installed-binary-mismatch' } }
function Test-GuestSentinels { }
function Measure-GuestProvider { $script:probeCalls++; return @{ status = 'failed'; hresult = '0x80004005' } }
function Measure-GuestWorker { param($Directory); $script:probeCalls++; return @{ status = 'observed'; elapsedMs = 2100 } }
$rows = @(Measure-GuestColdStarts 'synthetic-directory')
if ($rows.Count -ne 2 -or $rows[0].result.status -ne 'failed' -or $rows[1].result.elapsedMs -ne 2100 -or $report.failure -ne 'upgrade-immediate-thumbnail-failed') { throw 'original-or-cold-failure-lost' }
$script:installExit = 3010; $script:probeCalls = 0
$rows = @(Measure-GuestColdStarts 'synthetic-directory')
if ($rows.Count -ne 1 -or $rows[0].status -ne 'failed' -or $rows[0].reinstallExit -ne 3010 -or $script:probeCalls -ne 0) { throw 'reboot-required-reinstall-accepted' }
$script:installExit = 0; $script:hashValid = $false
$rows = @(Measure-GuestColdStarts 'synthetic-directory')
if ($rows.Count -ne 1 -or $rows[0].failure -ne 'installed-binary-mismatch' -or $script:probeCalls -ne 0) { throw 'wrong-product-probed' }
Write-Output 'Cold diagnostics preserve original/probe failures and reject reboot-required installs or wrong bytes.'
