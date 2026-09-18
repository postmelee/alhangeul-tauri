# Sourced only by the disposable installer smoke, after initial Shell observations.
. (Join-Path $PSScriptRoot 'windows-thumbnail-app-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-app-display.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-app-process.ps1')
function New-AppDiagnosticProcess { return [Diagnostics.Process]::new() }

function Invoke-AppDiagnosticTransport($Executable, $Report) {
  $process = $null; $output = $null; $errors = $null
  try {
    $Report.stage = 'process-configure'
    $process = New-AppDiagnosticProcess
    $requestId = [Guid]::NewGuid().ToString()
    $request = [ordered]@{ schemaVersion = 1; requestId = $requestId; operation = 'suite'; fixtureId = $null; consent = $true }
    $process.StartInfo = [Diagnostics.ProcessStartInfo]@{
      FileName = $Executable
      Arguments = '--alhangeul-thumbnail-diagnostic-child'
      UseShellExecute = $false; CreateNoWindow = $true
      RedirectStandardInput = $true; RedirectStandardOutput = $true; RedirectStandardError = $true
      StandardOutputEncoding = [Text.UTF8Encoding]::new($false, $true)
      StandardErrorEncoding = [Text.UTF8Encoding]::new($false, $true)
    }
    $Report.stage = 'process-start'
    Start-AppDiagnosticProcess $process $Report
    Assert-Condition $Report.processStarted 'App diagnostic process did not start.'
    $Report.stage = 'pipe-open'
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    $Report.stage = 'request-write'
    $process.StandardInput.Write(($request | ConvertTo-Json -Compress))
    $process.StandardInput.Close()
    $Report.stage = 'process-wait'
    # Native suite has its own 180s deadline, 5s cleanup and owned child jobs.
    Assert-Condition ($process.WaitForExit(210000)) 'App diagnostic process timed out.'
    $Report.stage = 'pipe-drain'
    Assert-Condition ($output.Wait(5000) -and $errors.Wait(5000)) 'App diagnostic pipe did not close.'
    $Report.stage = 'transport-check'
    Assert-Condition ($process.ExitCode -eq 0 -and $output.Result.Length -gt 0 -and $output.Result.Length -le 262144 -and $errors.Result.Length -eq 0) 'App diagnostic transport failed.'
    $Report.stage = 'reply-parse'
    $reply = $output.Result | ConvertFrom-Json
    $Report.stage = 'reply-identity'
    Assert-Condition ($reply.schemaVersion -eq 1 -and $reply.requestId -ceq $requestId -and $reply.operation -ceq 'suite' -and $reply.result.kind -ceq 'suite') 'App diagnostic reply identity mismatch.'
    return $reply.result.value
  } catch {
    $Report.failureStage = $Report.stage
    $Report.errorHresult = '0x{0:X8}' -f $_.Exception.HResult
    throw
  } finally {
    try {
      if ($Report.processStarted) {
        $Report.processReaped = $false
        if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
        $Report.processReaped = $process.HasExited
        if ($process.HasExited) { $Report.exitCode = $process.ExitCode }
        foreach ($pair in @(@('stdoutChars', $output), @('stderrChars', $errors))) {
          if ($null -ne $pair[1] -and $pair[1].Status -eq 'RanToCompletion') { $Report[$pair[0]] = $pair[1].Result.Length }
        }
        Assert-Condition $Report.processReaped 'App diagnostic process cleanup unverified.'
      }
    } catch {
      if ($null -eq $Report.failureStage) { $Report.failureStage = 'process-cleanup' }
      throw
    } finally { if ($null -ne $process) { $process.Dispose() } }
  }
}

function Invoke-InstalledAppDiagnostic($Result, $Inventory, $Version) {
  $report = [ordered]@{
    schemaVersion = 1; sourceSha = $Inventory.sourceSha; status = 'failed'; cleanup = $null
    stage = 'created'; failureStage = $null; errorHresult = $null; assessmentFailure = $null
    processStarted = $false; processReaped = $null; exitCode = $null; stdoutChars = $null; stderrChars = $null
    display = [ordered]@{ originalExists = $null; originalValue = $null; prepared = $false; restored = $null }
    installation = $null; formats = @(); probes = @()
  }
  try {
    Invoke-AppDiagnosticDisplay $report {
      $suite = Invoke-AppDiagnosticTransport $Result.InstalledState.Executable $report
      $report.stage = 'suite-evidence'
      $report.installation = Get-AppInstallationEvidence $suite $Result.Kind
      $report.cleanup = $suite.cleanup -eq $true
      $report.probes = @(Get-AppDiagnosticEvidence $suite)
      $report.stage = 'suite-assessment'
      $report.formats = @(Assert-AppDiagnostic $suite $Inventory $Result.Kind $Version $Result.Probes)
    }
    Assert-Condition ($report.display.restored -eq $true -and $report.processReaped -eq $true) 'App diagnostic cleanup unverified.'
    $report.stage = 'completed'; $report.status = 'passed'
  } catch {
    if ($null -eq $report.failureStage) { $report.failureStage = $report.stage }
    if ($report.failureStage -ceq 'suite-assessment') { $report.assessmentFailure = Get-AppAssessmentFailure $_ }
    $report.status = 'failed'
  } finally {
    $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'app-diagnostic.json') -Encoding UTF8
  }
  Assert-Condition ($report.status -ceq 'passed') 'Installed app diagnostic failed; see app-diagnostic.json.'
  return $true
}
