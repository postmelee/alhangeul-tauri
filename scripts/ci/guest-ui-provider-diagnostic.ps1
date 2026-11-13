function Measure-GuestProvider([ValidateSet('provider', 'cache-default', 'cache-inproc', 'cache-surrogate')][string]$Mode = 'provider') {
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = [Diagnostics.ProcessStartInfo]@{
    FileName = (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')
    Arguments = ('-NoProfile -NonInteractive -STA -File "' + $root + '\scripts\ci\guest-ui-provider-probe.ps1" -Mode ' + $Mode)
    UseShellExecute = $false; CreateNoWindow = $true
    RedirectStandardOutput = $true; RedirectStandardError = $true
  }
  $started = $false; $result = $null; $childId = $null
  try {
    $started = $process.Start()
    if (-not $started) { throw 'provider-child-start' }
    $childId = $process.Id
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(15000)) { throw 'provider-child-timeout' }
    if (-not $stdout.Wait(1000) -or -not $stderr.Wait(1000) -or $stderr.Result.Length -ne 0 -or
        $stdout.Result.Length -gt 16384 -or $process.ExitCode -ne 0) { throw 'provider-child-output' }
    $result = $stdout.Result | ConvertFrom-Json
  } finally {
    if ($started -and -not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
    if ($started -and $Mode -eq 'provider') { $report['providerChildReaped'] = $process.HasExited; $report['providerChildProcessId'] = $childId }
    if ($result) { $result | Add-Member -NotePropertyName childProcessId -NotePropertyValue $childId; $result | Add-Member -NotePropertyName childReaped -NotePropertyValue $process.HasExited }
    $process.Dispose()
  }
  return $result
}
