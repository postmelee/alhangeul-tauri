$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'windows-test-process.ps1')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$files = @(git -C $root ls-files '*.ps1')
if ($LASTEXITCODE -ne 0 -or $files.Count -eq 0) { throw 'Cannot enumerate tracked PowerShell sources' }
foreach ($relative in $files) {
    $tokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile((Join-Path $root $relative), [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) { throw "PowerShell parse failure: $relative`n$($parseErrors | Out-String)" }
}
$tests = @(Get-ChildItem -LiteralPath (Join-Path $root 'tests') -Recurse -Filter '*.test.ps1' -File)
if ($tests.Count -eq 0) { throw 'No Windows regression tests found' }
foreach ($file in $tests) { Invoke-CiPowerShellTest -Path $file.FullName }
Write-Output "PowerShell contracts passed: $($files.Count) sources, $($tests.Count) isolated tests"
exit 0
