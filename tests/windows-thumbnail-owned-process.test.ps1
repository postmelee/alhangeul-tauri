param([string]$EvidencePath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\scripts\windows-thumbnail-user-probe.ps1'
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw 'probe-parse-failed' }
$functions = @($ast.EndBlock.Statements | Where-Object { $_ -is [Management.Automation.Language.FunctionDefinitionAst] -and $_.Name -eq 'Invoke-OwnedProcess' })
if ($functions.Count -ne 1) { throw 'owned-process-function-missing' }
# Load only the process helper; never execute the installer/profile entry point.
. ([scriptblock]::Create($functions[0].Extent.Text))
Add-Type -Path (Join-Path $PSScriptRoot '..\scripts\windows-thumbnail-user-visual.cs')
$engine = Join-Path $PSHOME 'powershell.exe'
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-owned-process-' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($temporary)
$result = [ordered]@{ status = 'failed'; exitCases = @(); timeoutMs = $null; childExited = $false }
try {
  foreach ($code in @(0, 7)) {
    $actual = Invoke-OwnedProcess $engine ('-NoLogo -NoProfile -NonInteractive -Command "exit ' + $code + '"') 10
    if ($actual -ne $code) { throw 'owned-exit-code-lost' }
    $result.exitCases += $actual
  }
  $fixture = Join-Path $temporary 'sleep child.ps1'
  $pidFile = Join-Path $temporary 'child.pid'
  [IO.File]::WriteAllText($fixture, 'param([string]$PidFile) [IO.File]::WriteAllText($PidFile, [string]$PID); Start-Sleep -Seconds 30')
  $arguments = '-NoLogo -NoProfile -NonInteractive -File "' + $fixture + '" -PidFile "' + $pidFile + '"'
  $timer = [Diagnostics.Stopwatch]::StartNew(); $failure = $null
  try { $null = Invoke-OwnedProcess $engine $arguments 3 } catch { $failure = $_.Exception.Message }
  $result.timeoutMs = $timer.ElapsedMilliseconds
  if ($failure -cne 'owned-process-timeout' -or $result.timeoutMs -lt 2900 -or $result.timeoutMs -gt 10000) { throw 'owned-timeout-not-bounded' }
  $childId = [int](Get-Content -LiteralPath $pidFile -Raw)
  $remaining = Get-Process -Id $childId -ErrorAction SilentlyContinue
  if ($remaining) { $remaining.Dispose(); throw 'owned-child-still-running' }
  $result.childExited = $true
  $result.status = 'passed'
} finally {
  Remove-Item -LiteralPath $temporary -Recurse -Force
  if ($EvidencePath) { $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
}
Write-Output 'Owned process exit and bounded timeout regression passed; no installer or Explorer launched.'
exit 0
