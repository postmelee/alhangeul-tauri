Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-process-trace.ps1')
$folder = Join-Path $env:TEMP ('alh-trace-contract-' + [guid]::NewGuid().ToString())
$trace = $null; $child = $null
try {
  New-Item -ItemType Directory -Path $folder | Out-Null
  $file = Join-Path $folder 'AlhangeulThumbnailWorker.exe'
  Add-Type -OutputAssembly $file -OutputType ConsoleApplication -TypeDefinition 'public static class TraceFixture { public static void Main() { System.Threading.Thread.Sleep(500); } }'
  $trace = Start-GuestProcessTrace
  $child = Start-Process -FilePath $file -PassThru
  [void]$child.Handle
  if (-not $child.WaitForExit(5000)) { throw 'trace-fixture-timeout' }
  Start-Sleep -Seconds 2
  $rows = @(Read-GuestProcessTrace $trace | Where-Object processId -eq $child.Id)
  $starts = @($rows | Where-Object kind -eq 'Start'); $stops = @($rows | Where-Object kind -eq 'Stop')
  if ($starts.Count -ne 1 -or $stops.Count -ne 1 -or $stops[0].exitStatus -ne 0) { throw 'kernel-process-events-missing' }
  if ([DateTime]$stops[0].timeUtc -le [DateTime]$starts[0].timeUtc) { throw 'process-event-order-invalid' }
  Clear-GuestProcessTrace $trace
  foreach ($source in $trace.sources.Values) {
    if (Get-EventSubscriber -SourceIdentifier $source -ErrorAction SilentlyContinue) { throw 'trace-subscription-not-removed' }
  }
} finally {
  Clear-GuestProcessTrace $trace
  if ($child) { if (-not $child.HasExited) { $child.Kill(); [void]$child.WaitForExit(3000) }; $child.Dispose() }
  Remove-Item -LiteralPath $folder -Recurse -Force
}
Write-Output 'Kernel worker start/stop, exit status, event order and owned subscriptions passed.'
