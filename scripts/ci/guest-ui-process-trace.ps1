# Read-only kernel process observations, restricted to the two relevant executable names.
function Start-GuestProcessTrace {
  $trace = @{ sources = @{} }
  try {
    foreach ($kind in @('Start', 'Stop')) {
      $source = 'AlhGuestProcess-' + $kind + '-' + [guid]::NewGuid().ToString()
      $query = "SELECT * FROM Win32_Process" + $kind + "Trace WHERE ProcessName='AlhangeulThumbnailWorker.exe' OR ProcessName='dllhost.exe'"
      # Kernel StopTrace truncates this executable's name on observed Windows versions.
      if ($kind -eq 'Stop') { $query += " OR ProcessName='AlhangeulThumb'" }
      Register-WmiEvent -Namespace 'root\cimv2' -Query $query -SourceIdentifier $source | Out-Null
      $trace.sources[$kind] = $source
    }
    return $trace
  } catch { Clear-GuestProcessTrace $trace; throw }
}
function Read-GuestProcessTrace($Trace) {
  $rows = @()
  foreach ($kind in @('Start', 'Stop')) {
    foreach ($event in @(Get-Event -SourceIdentifier $Trace.sources[$kind] -ErrorAction SilentlyContinue)) {
      $value = $event.SourceEventArgs.NewEvent
      $names = @('AlhangeulThumbnailWorker.exe', 'dllhost.exe')
      if ($kind -eq 'Stop') { $names += 'AlhangeulThumb' }
      if ($value.ProcessName -notin $names) { throw 'unexpected-process-trace-name' }
      $row = @{
        kind = $kind; name = [string]$value.ProcessName
        processId = [uint32]$value.ProcessID; parentProcessId = [uint32]$value.ParentProcessID
        sessionId = [uint32]$value.SessionID; timeUtc = [DateTime]::FromFileTimeUtc([long]$value.TIME_CREATED).ToString('o')
      }
      if ($kind -eq 'Stop') { $row['exitStatus'] = [uint32]$value.ExitStatus }
      $rows += $row
      if ($rows.Count -gt 500) { throw 'process-trace-size-limit' }
    }
  }
  return @($rows | Sort-Object timeUtc)
}
function Clear-GuestProcessTrace($Trace) {
  if (-not $Trace) { return }
  foreach ($source in @($Trace.sources.Values)) {
    Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue
    Get-Event -SourceIdentifier $source -ErrorAction SilentlyContinue | Remove-Event -ErrorAction SilentlyContinue
  }
}
