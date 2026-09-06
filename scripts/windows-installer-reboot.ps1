# Read-only reboot evidence. Registry payloads stay in memory and never enter reports.
function Read-InstallerRebootMarker($Id, $Path, $Name) {
  $base = $null; $key = $null
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryView]::Registry64)
    $key = $base.OpenSubKey($Path, $false)
    $present = $null -ne $key
    $payload = $null
    if ($present -and $null -ne $Name) {
      $present = $key.GetValueNames() -contains $Name
      if ($present) { $payload = $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) }
    }
    return [ordered]@{ id = $Id; status = 'ok'; present = $present; payload = $payload }
  } catch { return [ordered]@{ id = $Id; status = 'unreadable'; present = $null; payload = $null } }
  finally { if ($null -ne $key) { $key.Dispose() }; if ($null -ne $base) { $base.Dispose() } }
}

function Get-InstallerRebootSnapshot {
  return @(
    (Read-InstallerRebootMarker 'pending-file-renames' 'SYSTEM\CurrentControlSet\Control\Session Manager' 'PendingFileRenameOperations'),
    (Read-InstallerRebootMarker 'servicing-reboot' 'SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending' $null),
    (Read-InstallerRebootMarker 'update-reboot' 'SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired' $null)
  )
}

function Compare-InstallerRebootSnapshot($Before, $After) {
  $records = @()
  foreach ($id in @('pending-file-renames', 'servicing-reboot', 'update-reboot')) {
    $old = @($Before | Where-Object { $_.id -eq $id }); $new = @($After | Where-Object { $_.id -eq $id })
    $known = $old.Count -eq 1 -and $new.Count -eq 1
    if ($known) { $known = $old[0].status -eq 'ok' -and $new[0].status -eq 'ok' }
    $changed = $null; $baseline = $null; $present = $null
    if ($known) {
      $baseline = $old[0].present; $present = $new[0].present
      $changed = $baseline -ne $present -or (ConvertTo-Json $old[0].payload -Compress) -cne (ConvertTo-Json $new[0].payload -Compress)
    }
    $records += [ordered]@{ id = $id; status = if ($known) { 'ok' } else { 'unreadable' }; baselinePresent = $baseline; present = $present; changed = $changed }
  }
  return $records
}

function Read-InstallerRebootLog($Path) {
  try {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'missing-log' }
    if ((Get-Item -LiteralPath $Path).Length -gt 16MB) { throw 'oversize-log' }
    $log = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($log) -or $log -notmatch 'MSI \(') { throw 'invalid-msi-log' }
    return [ordered]@{
      status = 'ok'
      deferredOperation = [bool]($log -match 'Scheduling reboot operation:|Must reboot to complete operation')
      restartRequired = [bool]($log -match 'Windows Installer requires a system restart|Restart required\.')
      msiSystemRebootPending = [bool]($log -match 'MsiSystemRebootPending\s*=\s*1|MsiSystemRebootPending.*value is .1.')
    }
  } catch { return [ordered]@{ status = 'unreadable'; deferredOperation = $null; restartRequired = $null; msiSystemRebootPending = $null } }
}

function Get-InstallerRebootAssessment($Kind, $ExitCode, $Markers, $Log) {
  # The Windows Installer exit-code meanings never apply to NSIS.
  $state = 'failed'; $known = $false
  if ($Kind -eq 'msi') {
    $known = $Log.status -eq 'ok' -and @($Markers).Count -eq 3 -and @($Markers | Where-Object { $_.status -ne 'ok' }).Count -eq 0
    $pending = $false
    if ($known) {
      $pending = $Log.deferredOperation -or $Log.restartRequired -or $Log.msiSystemRebootPending -or @($Markers | Where-Object { $_.present -or $_.baselinePresent -or $_.changed }).Count -gt 0
    }
    if ($ExitCode -eq 3010) { $state = 'reboot-required' }
    elseif ($ExitCode -eq 1641) { $state = 'reboot-initiated' }
    elseif ($ExitCode -eq 1602) { $state = 'cancelled' }
    elseif ($ExitCode -eq 0) {
      $state = if (-not $known) { 'unknown' } elseif ($pending) { 'reboot-pending' } else { 'no-reboot-observed' }
    }
  } elseif ($Kind -eq 'nsis' -and $ExitCode -eq 0) { $state = 'not-applicable' }
  return [ordered]@{
    installerKind = $Kind; exitCode = $ExitCode; status = $state
    observationComplete = $known; rollbackEligible = $Kind -eq 'msi' -and $state -eq 'no-reboot-observed'
    markers = @($Markers); log = $Log
  }
}

function Measure-InstallerReboot($Kind, $Code, $Before, $LogPath) {
  if ($Kind -ne 'msi') { return Get-InstallerRebootAssessment $Kind $Code @() ([ordered]@{ status = 'not-applicable' }) }
  $markers = @(Compare-InstallerRebootSnapshot $Before (Get-InstallerRebootSnapshot))
  return Get-InstallerRebootAssessment $Kind $Code $markers (Read-InstallerRebootLog $LogPath)
}
