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
$temporary = Join-Path ([System.IO.Path]::GetTempPath()) ('ci evidence ' + [guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $temporary -Force | Out-Null
    $parameterFixture = Join-Path $temporary 'requires evidence.ps1'
    Set-Content -LiteralPath $parameterFixture -Value 'param([Parameter(Mandatory = $true)][string]$EvidencePath); Set-Content -LiteralPath $EvidencePath -Value "passed"; exit 0'
    Invoke-CiPowerShellRegression -Path $parameterFixture -EvidenceDirectory $temporary
    if ((Get-Content -LiteralPath ($parameterFixture + '.json') -Raw).Trim() -ne 'passed') {
        throw 'Required evidence argument was not preserved through the isolated child'
    }
} finally { Remove-Item -LiteralPath $temporary -Recurse -Force }
Write-Output 'Isolated native exit, evidence argument and installer failure collection passed.'
exit 0
