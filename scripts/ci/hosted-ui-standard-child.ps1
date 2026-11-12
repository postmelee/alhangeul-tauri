param([Parameter(Mandatory=$true)][string]$Root)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$scripts = Split-Path -Parent $PSScriptRoot
Add-Type -Path (Join-Path $scripts 'windows-thumbnail-token.cs')
$token = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read()
if ($token.status -ne 'ok' -or $token.elevated -or $token.integrityRid -ne 8192) { throw 'standard-token-required' }
$output = Join-Path $Root 'evidence'
$productInput = Get-Content -LiteralPath (Join-Path $Root 'input.json') -Raw | ConvertFrom-Json
$report = [ordered]@{ schemaVersion = 1; status = 'incomplete'; token = $token; installExit = $null; reinstallExit = $null; uninstallExit = $null; visual = 'unverified'; productUninstallPassed = $false; releaseAcceptance = 'unverified'; probes = @() }
$directory = $null
function Save-State { $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $output 'standard-product.json') -Encoding UTF8 }
function Run-Owned($File, $Arguments, [int]$Seconds = 180, [switch]$CaptureLogs) {
  $options = @{ FilePath = $File; ArgumentList = $Arguments; PassThru = $true }
  if ($CaptureLogs) { $options.RedirectStandardOutput = Join-Path $output 'capture-stdout.txt'; $options.RedirectStandardError = Join-Path $output 'capture-stderr.txt' }
  $p = Start-Process @options
  try { [void]$p.Handle; if (-not $p.WaitForExit($Seconds * 1000)) { $p.Kill(); [void]$p.WaitForExit(5000); throw 'owned-child-timeout' }; $p.Refresh(); return [int]$p.ExitCode }
  finally { $p.Dispose() }
}
try {
  if ($productInput.githubActions -cne 'true' -or $productInput.runnerEnvironment -cne 'github-hosted') { throw 'disposable-hosted-only' }
  # Start-Process -Credential constructs a new user environment; forward only the validated hosted markers.
  $env:GITHUB_ACTIONS = $productInput.githubActions
  $env:RUNNER_ENVIRONMENT = $productInput.runnerEnvironment
  $local = [Environment]::GetFolderPath('LocalApplicationData')
  $temp = Join-Path $local 'Temp'; [void][IO.Directory]::CreateDirectory($temp)
  foreach ($pair in @{ USERPROFILE = [Environment]::GetFolderPath('UserProfile'); LOCALAPPDATA = $local; APPDATA = [Environment]::GetFolderPath('ApplicationData'); TEMP = $temp; TMP = $temp }.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($pair.Key, $pair.Value, 'Process')
  }
  $handlerKey = 'HKCU:\Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32'
  if (Test-Path -LiteralPath $handlerKey) { throw 'preexisting-handler' }
  $installer = Join-Path $Root 'installer.exe'
  if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -cne $productInput.installerSha256) { throw 'installer-hash-mismatch' }
  Save-State
  $report.installExit = Run-Owned $installer '/S'
  if ($report.installExit -ne 0) { throw 'install-failed' }
  $directory = Split-Path -Parent (Get-Item -LiteralPath $handlerKey).GetValue('')
  $report.reinstallExit = Run-Owned $installer '/S /UPDATE'
  if ($report.reinstallExit -ne 0) { throw 'reinstall-failed' }
  foreach ($file in $productInput.binaries) {
    $path = Join-Path $directory ([IO.Path]::GetFileName($file.path))
    if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $file.sha256) { throw 'installed-binary-mismatch' }
  }
  [void](New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Force)
  Save-State
  $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  try {
    $code = Run-Owned $engine ('-NoLogo -NoProfile -NonInteractive -STA -File "' + $PSScriptRoot + '\hosted-ui-capture.ps1" -Root "' + $Root + '" -StandardWindowOnly') 90 -CaptureLogs
    if ($code -ne 0) { throw 'capture-child-failed' }
    $visual = Get-Content -LiteralPath (Join-Path $output 'explorer-visual.json') -Raw | ConvertFrom-Json
    $report.visual = $visual.status
  } catch { $report['visualFailure'] = $_.Exception.Message }
  $fixtures = (Get-Content -LiteralPath (Join-Path $scripts 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in $fixtures) {
    $probe = Join-Path $output ('probe-' + $fixture.id + '.json')
    & (Join-Path $scripts 'windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath (Join-Path $Root $fixture.path) -OutputPath $probe
    $raw = Get-Content -LiteralPath $probe -Raw | ConvertFrom-Json
    $report.probes += @{ id = $fixture.id; status = $raw.status; bitmapPresent = $raw.bitmapPresent }
    if ($raw.status -ne 'ok' -or -not $raw.bitmapPresent) { throw 'thumbnail-probe-failed' }
  }
  $report.status = 'observed'
} catch { $report['failure'] = $_.Exception.Message }
finally {
  if ($directory) {
    try {
      $report.uninstallExit = Run-Owned (Join-Path $directory 'uninstall.exe') '/S'
      for ($i=0; $i -lt 90 -and (Test-Path -LiteralPath $directory); $i++) { Start-Sleep -Seconds 1 }
      $report.productUninstallPassed = $report.uninstallExit -eq 0 -and -not (Test-Path -LiteralPath $directory) -and -not (Test-Path -LiteralPath $handlerKey)
    } catch { $report['cleanupFailure'] = $_.Exception.Message }
  }
  Save-State
}
if ($report.status -ne 'observed' -or -not $report.productUninstallPassed) { exit 2 }
