# Standalone smoke extension for the isolated Windows MSI reboot experiment.
function Start-GuestRebootEditor($Directory) {
  $process = Start-Process -FilePath (Join-Path $Directory 'Alhangeul.exe') -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  while ([DateTime]::UtcNow -lt $deadline) {
    $process.Refresh()
    if ($process.HasExited) { break }
    if ($process.MainWindowHandle -ne [IntPtr]::Zero -and $process.Responding) { return $process }
    Start-Sleep -Milliseconds 250
  }
  if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
  $process.Dispose()
  throw 'owned-editor-window-unavailable'
}

function Read-GuestBootMarkers {
  $path = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
  $row = Get-ItemProperty -LiteralPath $path
  $pending = $row.PSObject.Properties['PendingFileRenameOperations']
  return [ordered]@{
    boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')
    pendingFileRename = $null -ne $pending -and @($pending.Value).Count -gt 0
  }
}

function Restore-ForcedMsiCheckpoint($Path) {
  $before = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  $restart = Get-Content (Join-Path $root 'admin-results\restart.json') -Raw | ConvertFrom-Json
  $reinstall = Get-Content (Join-Path $root 'admin-results\reinstall.json') -Raw | ConvertFrom-Json
  $after = Read-GuestBootMarkers
  if ($restart.operation -cne 'restart' -or $restart.status -cne 'observed' -or -not $restart.system -or $restart.exitCode -ne 0 -or
      $restart.installerSha256 -cne $inputData.installerSha256 -or $reinstall.executedInstallerSha256 -cne $inputData.installerSha256 -or
      $reinstall.reinstallMode -cne 'amus' -or $reinstall.exitCode -notin @(0, 3010) -or
      $before.reinstallExit -ne $reinstall.exitCode -or [DateTimeOffset]$after.boot -le [DateTimeOffset]$restart.beforeBoot) {
    throw 'new-boot-and-forced-reinstall-evidence-required'
  }
  foreach ($name in @('beforeInstall', 'afterPrerequisites', 'afterOfflineInstall', 'offlineInstallExit', 'installExit', 'reinstallExit',
      'adminBoundaryReadOnly', 'preRestartMarkers', 'preRestartProbes', 'preRestartEditorSha256')) {
    if ($before.PSObject.Properties[$name]) { $report[$name] = $before.$name }
  }
  foreach ($operation in $before.adminOperations.PSObject.Properties) { $report.adminOperations[$operation.Name] = $operation.Value }
  $report.adminOperations['restart'] = $restart
  $report['postRestartMarkers'] = $after
  $report['restartVerified'] = $true
}
