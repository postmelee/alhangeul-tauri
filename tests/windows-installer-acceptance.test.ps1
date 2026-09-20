$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $root 'scripts\ci\windows-test-process.ps1')
Invoke-CiPowerShellTest -Path (Join-Path $root 'scripts\windows-installer-acceptance-tests.ps1')
Write-Output 'Installer acceptance synthetic tests completed in an isolated PowerShell process.'
exit 0
