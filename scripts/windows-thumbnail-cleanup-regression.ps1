param([string]$OutputDirectory = 'diagnostics/thumbnail-cleanup')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'disposable-windows-ci-required' }
$compiler = Join-Path $env:LOCALAPPDATA 'tauri\NSIS\makensis.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'tauri-nsis-compiler-missing' }
[void][IO.Directory]::CreateDirectory($OutputDirectory)
$root = (Resolve-Path -LiteralPath $OutputDirectory).Path
$executable = Join-Path $root 'cleanup-regression.exe'
$helper = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\apps\desktop\src-tauri\windows\thumbnail-cleanup.nsh')).Path
$fixture = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\tests\fixtures\thumbnail-cleanup.nsi')).Path
& $compiler '/V2' ('/DOUTPUT_EXE=' + $executable) ('/DHELPER_PATH=' + $helper) $fixture
if ($LASTEXITCODE -ne 0) { throw 'cleanup-fixture-compile-failed' }
$report = [ordered]@{ schemaVersion = 1; status = 'failed'; sourceSha = $env:GITHUB_SHA; helperSha256 = (Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash; cases = @() }
function Invoke-LockCase($Mode, $Timeout) {
  $directory = Join-Path $root ($Mode + '-' + $Timeout)
  [void][IO.Directory]::CreateDirectory($directory)
  $dll = Join-Path $directory 'AlhangeulThumbnailHandler.dll'
  $sentinel = Join-Path $directory 'unrelated.txt'
  [IO.File]::WriteAllText($dll, 'owned dummy file; not a PE image')
  [IO.File]::WriteAllText($sentinel, 'user-added file')
  $hash = (Get-FileHash -LiteralPath $dll -Algorithm SHA256).Hash
  $env:ALHANGEUL_CLEANUP_FIXTURE = $directory; $env:ALHANGEUL_CLEANUP_MODE = $Mode
  $lock = [IO.File]::Open($dll, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $p = $null; $timer = [Diagnostics.Stopwatch]::StartNew()
  try {
    $p = Start-Process -FilePath $executable -PassThru
    [void]$p.Handle
    if (-not $Timeout) { Start-Sleep -Seconds 2; $lock.Dispose(); $lock = $null }
    if (-not $p.WaitForExit(80000)) { $p.Kill(); throw 'cleanup-test-exceeded-bound' }
    $p.Refresh(); $code = $p.ExitCode
  } finally { if ($lock) { $lock.Dispose() }; if ($p) { $p.Dispose() } }
  $elapsed = $timer.ElapsedMilliseconds
  $expected = $(if ($Timeout) { 1603 } else { 0 })
  if ($code -ne $expected -or $elapsed -lt $(if ($Timeout) { 59000 } else { 1500 })) { throw 'cleanup-test-exit-or-wait-mismatch' }
  if ((Get-Content -LiteralPath $sentinel -Raw) -cne 'user-added file') { throw 'cleanup-deleted-unrelated-file' }
  $shouldRemain = $Mode -eq 'wait' -or $Timeout
  if ((Test-Path -LiteralPath $dll) -ne $shouldRemain) { throw 'cleanup-file-state-mismatch' }
  if ($shouldRemain -and (Get-FileHash -LiteralPath $dll -Algorithm SHA256).Hash -cne $hash) { throw 'cleanup-changed-file-contents' }
  return [ordered]@{ mode = $Mode; timeout = $Timeout; exitCode = $code; elapsedMs = $elapsed; unrelatedFilePreserved = $true; contentsPreserved = $shouldRemain; status = 'passed' }
}
try {
  foreach ($mode in @('wait', 'remove')) { foreach ($timeout in @($false, $true)) { $report.cases += Invoke-LockCase $mode $timeout } }
  $report.status = 'passed'
} finally {
  Remove-Item Env:\ALHANGEUL_CLEANUP_FIXTURE -ErrorAction SilentlyContinue
  Remove-Item Env:\ALHANGEUL_CLEANUP_MODE -ErrorAction SilentlyContinue
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'result.json') -Encoding UTF8
}
