# Started by the standard user's real Explorer logon on an isolated evaluation guest.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = 'C:\AlhProbe'; $output = Join-Path $root 'evidence'
if (Test-Path (Join-Path $output 'done')) { exit 0 }
$serial = [IO.Ports.SerialPort]::new('COM1', 115200, [IO.Ports.Parity]::None, 8, [IO.Ports.StopBits]::One)
$serial.WriteTimeout = 30000
$serial.Open()
function Send-Event($Value) { $serial.WriteLine('ALH ' + ($Value | ConvertTo-Json -Depth 12 -Compress)) }
function Save-State {
  $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $output 'guest.json') -Encoding UTF8
  Send-Event @{ kind = 'phase'; phase = $report.phase }
}
function Run-Owned($File, $Arguments, [int]$Seconds = 180) {
  $p = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit($Seconds * 1000)) { $p.Kill(); [void]$p.WaitForExit(5000); throw 'owned-child-timeout' }
    $p.Refresh(); return [int]$p.ExitCode
  } finally { $p.Dispose() }
}
function Send-Evidence {
  foreach ($file in @(Get-ChildItem -LiteralPath $output -File | Where-Object { $_.Extension -in @('.json', '.png') })) {
    if ($file.Length -gt 5MB -or $file.Name -notmatch '^[a-z0-9-]+\.(json|png)$') { throw 'invalid-evidence-file' }
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    Send-Event @{ kind = 'begin'; name = $file.Name; bytes = $bytes.Length; sha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    for ($offset = 0; $offset -lt $bytes.Length; $offset += 3072) {
      Send-Event @{ kind = 'chunk'; data = [Convert]::ToBase64String($bytes, $offset, [Math]::Min(3072, $bytes.Length - $offset)) }
    }
    Send-Event @{ kind = 'end'; name = $file.Name }
  }
}
$report = [ordered]@{ schemaVersion = 1; status = 'incomplete'; phase = 'logon'; releaseAcceptance = 'unverified'; visual = 'unverified'; installExit = $null; reinstallExit = $null; uninstallExit = $null; productUninstallPassed = $false; probes = @() }
$directory = $null; $view = $null
try {
  $inputData = Get-Content (Join-Path $root 'input.json') -Raw | ConvertFrom-Json
  $report['input'] = $inputData
  $os = Get-CimInstance Win32_OperatingSystem
  $report['os'] = @{ caption = $os.Caption; build = $os.BuildNumber; productType = $os.ProductType; architecture = $os.OSArchitecture }
  if ($os.Caption -notmatch 'Windows 11 Enterprise' -or $os.ProductType -ne 1 -or [int]$os.BuildNumber -lt 22000 -or $env:COMPUTERNAME -ne 'ALH-GUEST') { throw 'windows11-test-guest-required' }
  Add-Type -Path (Join-Path $root 'scripts\windows-thumbnail-token.cs')
  Add-Type -Path (Join-Path $root 'scripts\windows-thumbnail-user-visual.cs')
  $report['token'] = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read()
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $report['adminGroupPresent'] = @($identity.Groups | Where-Object Value -eq 'S-1-5-32-544').Count -gt 0
  if ($report.token.status -ne 'ok' -or $report.token.elevated -or $report.token.integrityRid -ne 8192 -or $report.adminGroupPresent) { throw 'non-admin-standard-user-required' }
  for ($i=0; $i -lt 60 -and [Alhangeul.ThumbnailUserVisual.Window]::GetShellWindow() -eq [IntPtr]::Zero; $i++) { Start-Sleep -Seconds 1 }
  [uint32]$shellPid = 0
  [void][Alhangeul.ThumbnailUserVisual.Window]::GetWindowThreadProcessId([Alhangeul.ThumbnailUserVisual.Window]::GetShellWindow(), [ref]$shellPid)
  $shellProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $shellPid)
  $owner = Invoke-CimMethod -InputObject $shellProcess -MethodName GetOwnerSid
  $report['desktopOwnerMatches'] = $owner.ReturnValue -eq 0 -and $owner.Sid -eq $identity.User.Value
  $report['sessionMatches'] = $shellProcess.SessionId -eq (Get-Process -Id $PID).SessionId
  if (-not $report.desktopOwnerMatches -or -not $report.sessionMatches -or -not [Environment]::UserInteractive) { throw 'interactive-shell-owner-mismatch' }
  Save-State
  $key = 'HKCU:\Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32'
  if (Test-Path $key) { throw 'preexisting-handler' }
  $installer = Join-Path $root 'installer.exe'
  if ((Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant() -cne $inputData.installerSha256) { throw 'installer-hash-mismatch' }
  . (Join-Path $PSScriptRoot 'guest-ui-installer-state.ps1')
  $report['beforeInstall'] = Get-GuestInstallerState
  $report.phase = 'install'; Save-State
  $report['offlineInstallExit'] = Run-Owned $installer '/S'
  $report['afterOfflineInstall'] = Get-GuestInstallerState
  $report.installExit = $report.offlineInstallExit
  if ($report.installExit -ne 0) {
    $report.phase = 'network-retry'; Save-State
    Wait-GuestNetwork
    $report.installExit = Run-Owned $installer '/S' 300
    $report['afterOnlineInstall'] = Get-GuestInstallerState
  }
  if ($report.installExit -ne 0) { throw 'install-failed' }
  $directory = Split-Path -Parent (Get-Item -LiteralPath $key).GetValue('')
  $report.reinstallExit = Run-Owned $installer '/S /UPDATE'
  if ($report.reinstallExit -ne 0) { throw 'reinstall-failed' }
  foreach ($binary in $inputData.binaries) {
    if ((Get-FileHash (Join-Path $directory ([IO.Path]::GetFileName($binary.path))) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $binary.sha256) { throw 'installed-binary-mismatch' }
  }
  $report.phase = 'capture'; Save-State
  . (Join-Path $PSScriptRoot 'hosted-ui-view.ps1')
  $view = Set-HostedThumbnailView
  $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $code = Run-Owned $engine ('-NoProfile -ExecutionPolicy Bypass -STA -File "' + $root + '\scripts\windows-thumbnail-user-visual.ps1" -Root "' + $root + '"') 120
  if ($code -ne 0) { throw 'capture-child-failed' }
  $visual = Get-Content (Join-Path $output 'explorer-visual.json') -Raw | ConvertFrom-Json
  $report.visual = $visual.status
  if ($visual.status -ne 'captured-awaiting-review' -or -not $visual.desktopOwnerMatches -or -not $visual.windowClosed) { throw 'strict-visual-capture-unavailable' }
  $report.phase = 'api'; Save-State
  $fixtures = (Get-Content (Join-Path $root 'scripts\windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in $fixtures) {
    $path = Join-Path $root $fixture.path
    if ((Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'fixture-hash-mismatch' }
    $probePath = Join-Path $output ('probe-' + $fixture.id + '.json')
    & (Join-Path $root 'scripts\windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath $path -OutputPath $probePath
    $raw = Get-Content $probePath -Raw | ConvertFrom-Json
    $report.probes += @{ id = $fixture.id; status = $raw.status; bitmapPresent = $raw.bitmapPresent }
    if ($raw.status -ne 'ok' -or -not $raw.bitmapPresent) { throw 'thumbnail-probe-failed' }
  }
  $report.status = 'observed'
} catch { $report['failure'] = $_.Exception.Message }
finally {
  if ($view) {
    try { Restore-HostedThumbnailView $view; $report['displayPreference'] = $view }
    catch { $report['preferenceFailure'] = $_.Exception.Message }
  }
  if ($directory) {
    try {
      $report.phase = 'uninstall'; Save-State
      $report.uninstallExit = Run-Owned (Join-Path $directory 'uninstall.exe') '/S'
      for ($i=0; $i -lt 90 -and (Test-Path $directory); $i++) { Start-Sleep -Seconds 1 }
      $report.productUninstallPassed = $report.uninstallExit -eq 0 -and -not (Test-Path $directory) -and -not (Test-Path $key)
    } catch { $report['cleanupFailure'] = $_.Exception.Message }
  }
  $report.phase = 'done'; Save-State
  try { Send-Evidence; Send-Event @{ kind = 'done' }; Set-Content (Join-Path $output 'done') 'complete' }
  finally { $serial.Close(); $serial.Dispose() }
}
