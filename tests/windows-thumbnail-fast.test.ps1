$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $root 'scripts\ci\windows-test-process.ps1')
Invoke-CiPowerShellTest -Path (Join-Path $root 'scripts\windows-thumbnail-assessment-tests.ps1')
# Load only pure context test functions. Never execute the CI registry/token entry point.
. (Join-Path $root 'scripts\windows-thumbnail-context-files.ps1')
. (Join-Path $root 'scripts\windows-thumbnail-context-evidence.ps1')
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'scripts\windows-thumbnail-context-tests.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw 'Context test source parse failed' }
$allowed = @('Assert-ContextThrows', 'New-ContextTestPhase', 'Test-ContextFindingContracts', 'Test-ContextRawEvidence')
$loaded = @()
foreach ($node in $ast.EndBlock.Statements) {
    if ($node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in $allowed) {
        . ([scriptblock]::Create($node.Extent.Text))
        $loaded += $node.Name
    }
}
if ($loaded.Count -ne $allowed.Count) { throw 'Missing pure context test function' }
Test-ContextFindingContracts
Test-ContextRawEvidence
Write-Output 'Pure thumbnail assessment/context regressions passed; no native or installer acceptance.'
exit 0
