Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-process-trace.ps1')
$folder = Join-Path $env:TEMP ('alh-trace-contract-' + [guid]::NewGuid().ToString())
$trace = $null; $child = $null
try {
  New-Item -ItemType Directory -Path $folder | Out-Null
  $file = Join-Path $folder 'AlhangeulThumbnailWorker.exe'
  Add-Type -OutputAssembly $file -OutputType ConsoleApplication -TypeDefinition 'public static class TraceFixture { public static void Main() { System.Threading.Thread.Sleep(750); } }'
  $trace = Start-GuestProcessTrace $folder
  $child = Start-Process -FilePath $file -PassThru
  [void]$child.Handle
  if (-not $child.WaitForExit(5000)) { throw 'trace-fixture-timeout' }
  $actualMs = ($child.ExitTime - $child.StartTime).TotalMilliseconds
  $all = @(Read-GuestProcessTrace $trace)
  $rows = @($all | Where-Object { $_.processId -eq $child.Id })
  $starts = @($rows | Where-Object kind -eq 'Start'); $stops = @($rows | Where-Object kind -eq 'Stop')
  Write-Output (@{ expectedProcessId = $child.Id; actualMs = $actualMs; events = $rows } | ConvertTo-Json -Depth 5 -Compress)
  if ($starts.Count -ne 1 -or $stops.Count -ne 1 -or $stops[0].exitStatus -ne 0) { throw 'kernel-process-events-missing' }
  $eventMs = ([DateTime]$stops[0].timeUtc - [DateTime]$starts[0].timeUtc).TotalMilliseconds
  if ($eventMs -lt 700 -or $eventMs -gt 5000 -or [Math]::Abs($eventMs - $actualMs) -gt 100) { throw 'process-event-clock-inaccurate' }
  if ($starts[0].clock -ne 'ETW-perf' -or $starts[0].name -ne 'AlhangeulThumbnailWorker.exe') { throw 'process-event-provenance-lost' }
  Clear-GuestProcessTrace $trace
  if ($trace.active -or (Test-Path $trace.file)) { throw 'private-trace-not-removed' }
  & "$env:SystemRoot\System32\logman.exe" query $trace.name -ets *> $null
  if ($LASTEXITCODE -eq 0) { throw 'trace-session-still-active' }
} finally {
  Clear-GuestProcessTrace $trace
  if ($child) { if (-not $child.HasExited) { $child.Kill(); [void]$child.WaitForExit(3000) }; $child.Dispose() }
  Remove-Item -LiteralPath $folder -Recurse -Force
}
Write-Output 'ETW worker start/stop timing agrees with Process lifetime; owned session and raw ETL cleaned.'
exit 0
