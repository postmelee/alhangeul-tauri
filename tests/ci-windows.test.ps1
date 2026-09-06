$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $root 'scripts\ci\windows-test-process.ps1')
. (Join-Path $root 'scripts\windows-installer-smoke-support.ps1')
$fixture = Join-Path $root 'scripts\ci\fixtures\native-exit.ps1'
Invoke-CiPowerShellTest -Path $fixture -Arguments @('-Code', '0')
$rejected = $false
try { Invoke-CiPowerShellTest -Path $fixture -Arguments @('-Code', '23') }
catch { if ($_.Exception.Message -notmatch 'exit 23') { throw }; $rejected = $true }
if (-not $rejected) { throw 'Nonzero native exit was accepted' }
# Expected negative child must not poison the next successful child.
Invoke-CiPowerShellTest -Path $fixture -Arguments @('-Code', '0')
$result = [ordered]@{ Failures = @() }
Invoke-Check $result 'fixture' 'NegativeCheck' { throw 'expected fixture error' }
if ($result.Failures.Count -ne 1 -or $result.NegativeCheck.Passed) { throw 'Installer check lost a failure' }
Write-Output 'Isolated native exit and installer failure collection passed.'
exit 0
