# Runs only during specialize on the newly created disposable guest disk.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$bootSerial = $null
try {
  $bootSerial = [IO.Ports.SerialPort]::new('COM1', 115200, [IO.Ports.Parity]::None, 8, [IO.Ports.StopBits]::One)
  $bootSerial.WriteTimeout = 5000
  $bootSerial.Open()
} catch { if ($bootSerial) { try { $bootSerial.Dispose() } catch { } }; $bootSerial = $null }
function Write-BootPhase([string]$Stage, [int]$ErrorCode = 0) {
  # Fixed stage names and numeric error only; never serialize setup credentials or exception text.
  if ($bootSerial) {
    try { $bootSerial.WriteLine('ALH ' + (@{ kind = 'phase'; phase = ('bootstrap-' + $Stage); errorCode = $ErrorCode } | ConvertTo-Json -Compress)) }
    catch { } # Diagnostic output must not make Windows setup fail.
  }
}
$bootStage = 'locate-media'
try {
  Write-BootPhase $bootStage
  $media = @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'ALHPAYLOAD' -and $_.DriveLetter })
  if ($media.Count -ne 1 -or (Test-Path 'C:\AlhProbe')) { throw 'fresh-guest-media-required' }
  $source = $media[0].DriveLetter + ':\payload'
  $bootStage = 'protect-payload'; Write-BootPhase $bootStage
  New-Item -ItemType Directory -Path 'C:\AlhProbe' | Out-Null
  & icacls.exe 'C:\AlhProbe' /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'protected-payload-acl-failed' }
  $bootStage = 'copy-payload'; Write-BootPhase $bootStage
  Copy-Item -Path ($source + '\*') -Destination 'C:\AlhProbe' -Recurse
  New-Item -ItemType Directory -Path 'C:\AlhProbe\evidence' | Out-Null
  & icacls.exe 'C:\AlhProbe\evidence' /grant '*S-1-5-32-545:(OI)(CI)M' /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'evidence-acl-failed' }
  $bootStage = 'startup'; Write-BootPhase $bootStage
  $startup = [Environment]::GetFolderPath('CommonStartup')
  '@powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -File C:\AlhProbe\scripts\ci\guest-ui-probe.ps1' |
    Set-Content -LiteralPath (Join-Path $startup 'alh-probe.cmd') -Encoding ASCII

  $inputData = Get-Content 'C:\AlhProbe\input.json' -Raw | ConvertFrom-Json
  if ($inputData.scenario -in @('msi', 'msi-upgrade') -or $inputData.prerequisites.Count -gt 0) {
    New-Item -ItemType Directory -Path 'C:\AlhProbe\requests', 'C:\AlhProbe\admin-results' | Out-Null
    & icacls.exe 'C:\AlhProbe\requests' /grant '*S-1-5-32-545:(OI)(CI)M' /Q | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'request-acl-failed' }
    & icacls.exe 'C:\AlhProbe\admin-results' /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'admin-result-acl-failed' }
    Set-Content -LiteralPath 'C:\AlhProbe\admin-results\boundary.txt' -Value 'protected' -Encoding ASCII
    $bootStage = 'register-admin-task'; Write-BootPhase $bootStage
    $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $action = New-ScheduledTaskAction -Execute $engine -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\AlhProbe\scripts\ci\guest-ui-admin.ps1'
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 35)
    Register-ScheduledTask -TaskName 'AlhGuestInstaller' -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest | Out-Null
  }

  Write-BootPhase 'complete'
} catch {
  Write-BootPhase ($bootStage + '-failed') $_.Exception.HResult
  throw
} finally {
  if ($bootSerial) { try { $bootSerial.Close(); $bootSerial.Dispose() } catch { } }
}
