Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-process-trace.ps1')
$folder = Join-Path $env:TEMP ('alh-trace-contract-' + [guid]::NewGuid().ToString())
$trace = $null; $child = $null
$controls = @()
try {
  New-Item -ItemType Directory -Path $folder | Out-Null
  $file = Join-Path $folder 'AlhangeulThumbnailWorker.exe'
  Add-Type -OutputAssembly $file -OutputType ConsoleApplication -TypeDefinition 'public static class TraceFixture { public static void Main() { System.Threading.Thread.Sleep(500); } }'
  $trace = Start-GuestProcessTrace
  foreach ($kind in @('Start', 'Stop')) {
    $source = 'AlhTraceControl-' + $kind + '-' + [guid]::NewGuid().ToString()
    Register-WmiEvent -Class ('Win32_Process' + $kind + 'Trace') -SourceIdentifier $source | Out-Null
    $controls += $source
  }
  $child = Start-Process -FilePath $file -PassThru
  [void]$child.Handle
  if (-not $child.WaitForExit(5000)) { throw 'trace-fixture-timeout' }
  $until = [DateTime]::UtcNow.AddSeconds(10)
  do {
    Start-Sleep -Milliseconds 200
    $all = @(Read-GuestProcessTrace $trace)
    $rows = @($all | Where-Object { $_.processId -eq $child.Id })
  } while ($rows.Count -lt 2 -and [DateTime]::UtcNow -lt $until)
  $observedControl = @()
  foreach ($source in $controls) {
    foreach ($event in @(Get-Event -SourceIdentifier $source -ErrorAction SilentlyContinue)) {
      $value = $event.SourceEventArgs.NewEvent
      if ($value.ProcessID -eq $child.Id) { $observedControl += @{ name = [string]$value.ProcessName; processId = [uint32]$value.ProcessID; class = [string]$value.__CLASS } }
    }
  }
  Write-Output (@{ expectedProcessId = $child.Id; filtered = $all; control = $observedControl } | ConvertTo-Json -Depth 5 -Compress)
  $starts = @($rows | Where-Object kind -eq 'Start'); $stops = @($rows | Where-Object kind -eq 'Stop')
  if ($starts.Count -ne 1 -or $stops.Count -ne 1 -or $stops[0].exitStatus -ne 0) { throw 'kernel-process-events-missing' }
  if ([DateTime]$stops[0].timeUtc -le [DateTime]$starts[0].timeUtc) { throw 'process-event-order-invalid' }
  if ($starts[0].name -ne 'AlhangeulThumbnailWorker.exe' -or $stops[0].name -notin @('AlhangeulThumbnailWorker.exe', 'AlhangeulThumb')) { throw 'process-name-provenance-lost' }
  Clear-GuestProcessTrace $trace
  foreach ($source in $trace.sources.Values) {
    if (Get-EventSubscriber -SourceIdentifier $source -ErrorAction SilentlyContinue) { throw 'trace-subscription-not-removed' }
  }
} finally {
  Clear-GuestProcessTrace $trace
  foreach ($source in $controls) {
    Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue
    Get-Event -SourceIdentifier $source -ErrorAction SilentlyContinue | Remove-Event -ErrorAction SilentlyContinue
  }
  if ($child) { if (-not $child.HasExited) { $child.Kill(); [void]$child.WaitForExit(3000) }; $child.Dispose() }
  Remove-Item -LiteralPath $folder -Recurse -Force
}
Write-Output 'Kernel worker start/stop, exit status, event order and owned subscriptions passed.'
