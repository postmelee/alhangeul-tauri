# Sourced only by the disposable installer smoke, after initial Shell observations.
. (Join-Path $PSScriptRoot 'windows-thumbnail-app-assessment.ps1')
function Invoke-InstalledAppDiagnostic($Result, $Inventory, $Version) {
  $process = [Diagnostics.Process]::new()
  $suite = $null
  $report = [ordered]@{ schemaVersion = 1; sourceSha = $Inventory.sourceSha; status = 'failed'; cleanup = $false; formats = @(); probes = @() }
  $started = $false
  try {
    $requestId = [Guid]::NewGuid().ToString()
    $request = [ordered]@{ schemaVersion = 1; requestId = $requestId; operation = 'suite'; fixtureId = $null; consent = $true }
    $process.StartInfo = [Diagnostics.ProcessStartInfo]@{
      FileName = $Result.InstalledState.Executable
      Arguments = '--alhangeul-thumbnail-diagnostic-child'
      UseShellExecute = $false; CreateNoWindow = $true
      RedirectStandardInput = $true; RedirectStandardOutput = $true; RedirectStandardError = $true
    }
    $started = $process.Start()
    Assert-Condition $started 'App diagnostic process did not start.'
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write(($request | ConvertTo-Json -Compress))
    $process.StandardInput.Close()
    # Native suite has its own 180s deadline, 5s cleanup and owned child jobs.
    Assert-Condition ($process.WaitForExit(210000)) 'App diagnostic process timed out.'
    Assert-Condition ($output.Wait(5000) -and $errors.Wait(5000)) 'App diagnostic pipe did not close.'
    Assert-Condition ($process.ExitCode -eq 0 -and $output.Result.Length -gt 0 -and $output.Result.Length -le 262144 -and $errors.Result.Length -eq 0) 'App diagnostic transport failed.'
    $reply = $output.Result | ConvertFrom-Json
    Assert-Condition ($reply.schemaVersion -eq 1 -and $reply.requestId -ceq $requestId -and $reply.operation -ceq 'suite' -and $reply.result.kind -ceq 'suite') 'App diagnostic reply identity mismatch.'
    $suite = $reply.result.value
    $report.cleanup = $suite.cleanup -eq $true
    $report.probes = @(Get-AppDiagnosticEvidence $suite)
    $report.formats = @(Assert-AppDiagnostic $suite $Inventory $Result.Kind $Version $Result.Probes)
    $report.status = 'passed'
  } catch {
    # Preserve only sanitized API evidence. Never expose raw stderr/exception.
    $report.status = 'failed'
  } finally {
    if ($started -and -not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
    $process.Dispose()
    $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'app-diagnostic.json') -Encoding UTF8
  }
  Assert-Condition ($report.status -ceq 'passed') 'Installed app diagnostic failed; see app-diagnostic.json.'
  return $true
}
