$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$workflow = Get-Content -LiteralPath (Join-Path $root '.github/workflows/alhangeul-production-upgrade-windows.yml') -Raw
$count = 0
foreach ($step in ($workflow -split '(?m)^      - name:')) {
    if ($step -notmatch '(?m)^        shell: pwsh\s*$') { continue }
    $run = [regex]::Match($step, '(?ms)^        run: ([|>]-?)\r?\n((?:          [^\r\n]*\r?\n)+)')
    if ($run.Success) {
        $code = [regex]::Replace($run.Groups[2].Value, '(?m)^          ', '')
        if ($run.Groups[1].Value.StartsWith('>')) { $code = ($code -split '\r?\n' | Where-Object { $_ }) -join ' ' }
    } else {
        $single = [regex]::Match($step, '(?m)^        run: ([^\r\n]+)')
        if (-not $single.Success) { throw 'Missing embedded PowerShell script.' }
        $code = $single.Groups[1].Value
    }
    $tokens = $null; $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseInput($code, [ref]$tokens, [ref]$errors)
    if ($errors.Count -ne 0) { throw "Embedded PowerShell syntax failure: $($errors | Out-String)" }
    $count++
}
if ($count -ne 11) { throw "Expected 11 embedded scripts, found $count" }
Write-Output "Production Windows workflow: $count PowerShell blocks parsed; no install executed."
