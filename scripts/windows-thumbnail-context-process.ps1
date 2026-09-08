function ConvertTo-ContextArgument($Value) {
  return '"' + ([regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1')) + '"'
}

function Invoke-ContextProcess($Executable, $Arguments, $TimeoutSeconds = 600) {
  $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -PassThru
  try {
    [void]$process.Handle # Retain the handle so Windows PowerShell 5.1 can read a fast child's exit code.
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
      $process.Kill(); [void]$process.WaitForExit(3000)
      throw 'owned-process-timeout'
    }
    $process.Refresh()
    return $process.ExitCode
  } finally { $process.Dispose() }
}

function Get-ContextLimitedAvailability {
  $context = [Alhangeul.ContextExperiment.Native]::LimitedContext()
  $self = [Alhangeul.ContextExperiment.Native]::Inspect($PID)
  $normal = $false
  foreach ($process in @(Get-Process -Name 'explorer' -ErrorAction SilentlyContinue)) {
    try {
      $candidate = [Alhangeul.ContextExperiment.Native]::Inspect($process.Id)
      if ($candidate.status -eq 'ok' -and $candidate.sameUser -and $candidate.session -eq $self.session -and -not $candidate.elevated -and $candidate.integrityRid -eq 8192) { $normal = $true }
    } finally { $process.Dispose() }
  }
  return [ordered]@{ status = $(if ($normal -and $context.status -eq 'ok') { 'available' } else { 'context-unavailable' }); linked = $context; normalExplorerObserved = $normal }
}

function Invoke-ContextPhase($Name, $Dll, $Limited = $false) {
  $summary.operation = $Name
  $directory = Join-Path $OutputDirectory $Name
  Assert-Context (-not (Test-Path -LiteralPath $directory)) 'phase-output-exists'
  [void][IO.Directory]::CreateDirectory($directory)
  $requestPath = Join-Path $requestRoot "$Name.json"
  $request = [ordered]@{ phase = $Name; outputDirectory = $directory; parentId = $PID; limited = $Limited; expectedDll = $Dll; handler = $bundle.records['thumbnail-handler']; worker = $bundle.records['thumbnail-worker'] }
  Write-ContextJson $requestPath $request
  $phaseScript = Join-Path $PSScriptRoot 'windows-thumbnail-context-phase.ps1'
  $arguments = '-NoLogo -NoProfile -NonInteractive -STA -File ' + (ConvertTo-ContextArgument $phaseScript) + ' -RequestPath ' + (ConvertTo-ContextArgument $requestPath)
  $executable = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  try {
    if ($Limited) {
      $launch = [Alhangeul.ContextExperiment.Native]::RunLimited($executable, $arguments, $PSScriptRoot)
      if (-not $launch.started) {
        $summary.limited.status = 'context-unavailable'
        $summary.limited['launchError'] = $launch.error
        return $null
      }
      $code = $launch.exitCode
    } else { $code = Invoke-ContextProcess $executable $arguments }
    Assert-Context ($code -eq 0) 'phase-process-failed'
    $phase = Get-Content -LiteralPath (Join-Path $directory 'phase.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Context ($phase.phase -ceq $Name -and $phase.limited -eq $Limited) 'phase-identity-mismatch'
    Assert-ContextPhaseEvidence $phase $directory
    Assert-Context (Test-ContextEqual $installedAssociations (Get-ContextAssociations)) 'association-mutation'
    $summary.phases += [ordered]@{ name = $Name; finding = Get-ContextFinding $phase; evidence = "$Name/phase.json" }
    return $phase
  } finally { [IO.File]::Delete($requestPath) }
}
