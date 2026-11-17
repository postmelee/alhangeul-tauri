# Owned ETW session; raw ETL stays in protected guest storage and is never published.
function Start-GuestProcessTrace([string]$Directory) {
  $provider = Get-WinEvent -ListProvider 'Microsoft-Windows-Kernel-Process'
  if ($provider.Id -ne [guid]'22fb2cd6-0e7b-422b-a0c7-2fad1fd0e716') { throw 'unexpected-kernel-provider' }
  $name = 'AlhGuestProcess-' + [guid]::NewGuid().ToString()
  $trace = @{ name = $name; file = (Join-Path $Directory ($name + '.etl')); active = $false }
  if (-not (Test-Path -LiteralPath $Directory -PathType Container) -or (Test-Path $trace.file)) { throw 'fresh-trace-directory-required' }
  try {
    & "$env:SystemRoot\System32\logman.exe" start $name -p 'Microsoft-Windows-Kernel-Process' 0x10 5 -o $trace.file -f bincirc -max 16 -bs 64 -nb 2 8 -ct perf -ets *> $null
    if ($LASTEXITCODE -ne 0) { throw 'kernel-trace-start-failed' }
    $trace.active = $true
    return $trace
  } catch { Clear-GuestProcessTrace $trace; throw }
}
function Stop-GuestProcessTrace($Trace) {
  if ($Trace -and $Trace.active) {
    & "$env:SystemRoot\System32\logman.exe" stop $Trace.name -ets *> $null
    if ($LASTEXITCODE -ne 0) { throw 'kernel-trace-stop-failed' }
    $Trace.active = $false
  }
}
function Convert-GuestTraceNumber([string]$Value) {
  if ($Value.StartsWith('0x')) { return [Convert]::ToUInt32($Value.Substring(2), 16) }
  return [uint32]$Value
}
function Convert-GuestProcessEvent($Event) {
  if ($Event.ProviderName -ne 'Microsoft-Windows-Kernel-Process' -or $Event.Id -notin @(1, 2)) { return }
  [xml]$xml = $Event.ToXml()
  $fields = @{}
  foreach ($entry in $xml.Event.EventData.Data) { $fields[[string]$entry.Name] = [string]$entry.InnerText }
  if (-not $fields.ContainsKey('ImageName') -or -not $fields.ContainsKey('ProcessID')) { throw 'kernel-process-schema-mismatch' }
  $name = [IO.Path]::GetFileName($fields.ImageName)
  $names = @('AlhangeulThumbnailWorker.exe', 'dllhost.exe')
  if ($Event.Id -eq 2) { $names += 'AlhangeulThumb' } # Observed kernel Stop image name.
  if ($name -notin $names) { return }
  $row = @{
    kind = $(if ($Event.Id -eq 1) { 'Start' } else { 'Stop' }); name = $name
    processId = (Convert-GuestTraceNumber $fields.ProcessID)
    timeUtc = $Event.TimeCreated.ToUniversalTime().ToString('o'); clock = 'ETW-perf'
  }
  if ($fields.ContainsKey('ParentProcessID')) { $row['parentProcessId'] = Convert-GuestTraceNumber $fields.ParentProcessID }
  if ($fields.ContainsKey('SessionID')) { $row['sessionId'] = Convert-GuestTraceNumber $fields.SessionID }
  if ($fields.ContainsKey('ProcessSequenceNumber')) { $row['processSequenceNumber'] = [uint64]$fields.ProcessSequenceNumber }
  if ($fields.ContainsKey('CreateTime')) { $row['processCreatedAt'] = $fields.CreateTime }
  if ($fields.ContainsKey('ExitTime')) { $row['processExitedAt'] = $fields.ExitTime }
  if ($Event.Id -eq 2) {
    if (-not $fields.ContainsKey('ExitCode')) { throw 'kernel-process-exit-schema-mismatch' }
    $row['exitStatus'] = Convert-GuestTraceNumber $fields.ExitCode
  }
  return $row
}
function Read-GuestProcessTrace($Trace) {
  Stop-GuestProcessTrace $Trace
  if ((Get-Item -LiteralPath $Trace.file).Length -gt 17MB) { throw 'kernel-trace-file-size-limit' }
  $rows = [Collections.Generic.List[object]]::new(); $count = 0
  Get-WinEvent -Path $Trace.file -Oldest | ForEach-Object {
    $count++
    if ($count -gt 20000) { throw 'kernel-trace-event-limit' }
    $row = Convert-GuestProcessEvent $_
    if ($row) { $rows.Add($row) }
    if ($rows.Count -gt 500) { throw 'process-trace-size-limit' }
  }
  return @($rows.ToArray() | Sort-Object { [DateTime]$_.timeUtc })
}
function Clear-GuestProcessTrace($Trace) {
  if (-not $Trace) { return }
  Stop-GuestProcessTrace $Trace
  if (Test-Path -LiteralPath $Trace.file) { Remove-Item -LiteralPath $Trace.file -Force }
}
