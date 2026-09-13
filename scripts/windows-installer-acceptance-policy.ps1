# Contract policy only. Collected product failures remain unchanged.
function Assert-AcceptanceReboot($Event, $Kind, $Code) {
  Assert-Acceptance ($Event.installerKind -ceq $Kind -and (Test-AcceptanceInteger $Event.exitCode) -and $Event.exitCode -eq $Code)
  Assert-Acceptance ($Event.observationComplete -is [bool] -and $Event.rollbackEligible -is [bool])
  if ($Kind -ceq 'msi') {
    Assert-AcceptanceArray $Event.markers 3
    foreach ($id in @('pending-file-renames', 'servicing-reboot', 'update-reboot')) {
      $marker = @($Event.markers | Where-Object { $_.id -ceq $id }); Assert-AcceptanceArray $marker 1
      Assert-Acceptance ($marker[0].status -ceq 'ok')
      foreach ($flag in @('baselinePresent', 'present', 'changed')) { Assert-Acceptance ($marker[0].$flag -is [bool]) }
    }
    Assert-Acceptance ($Event.log.status -ceq 'ok')
    foreach ($flag in @('deferredOperation', 'restartRequired', 'msiSystemRebootPending')) { Assert-Acceptance ($Event.log.$flag -is [bool]) }
  } else {
    Assert-AcceptanceArray $Event.markers 0
    Assert-Acceptance (Test-AcceptanceEqual $Event.log ([ordered]@{ status = 'not-applicable' }))
  }
  $recomputed = Get-InstallerRebootAssessment $Kind $Code $Event.markers $Event.log
  Assert-Acceptance (Test-AcceptanceEqual $recomputed $Event)
}

function Get-AcceptanceLifecycle($InputEvidence) {
  $r = $InputEvidence.summary.Installers[0]; $contract = $InputEvidence.context.contract
  foreach ($code in @($r.InstallExitCode, $r.ReinstallExitCode, $r.UninstallExitCode)) { Assert-Acceptance (Test-AcceptanceInteger $code) }
  Assert-Acceptance ($r.InstallExitCode -eq 0 -and $r.UninstallExitCode -eq 0)
  $reboot = $contract -ceq 'msi-forced-reinstall-reboot' -and $r.ReinstallExitCode -eq 3010
  Assert-Acceptance ($r.ReinstallExitCode -eq 0 -or $reboot)
  Assert-Acceptance ($r.Reinstall -is [bool] -and $r.Reinstall -eq (-not $reboot))
  Assert-AcceptanceArray $r.RebootEvents 3
  $codes = @($r.InstallExitCode, $r.ReinstallExitCode, $r.UninstallExitCode)
  for ($i = 0; $i -lt 3; $i++) { Assert-AcceptanceReboot $r.RebootEvents[$i] $r.Kind $codes[$i] }
  $normal = if ($r.Kind -ceq 'msi') { 'no-reboot-observed' } else { 'not-applicable' }
  Assert-Acceptance ($r.RebootEvents[0].status -ceq $normal)
  if ($reboot) {
    Assert-Acceptance ($r.RebootEvents[1].status -ceq 'reboot-required')
    Assert-Acceptance ($r.RebootEvents[2].status -cin @('no-reboot-observed', 'reboot-pending'))
    return 'reboot-required'
  }
  Assert-Acceptance ($r.RebootEvents[1].status -ceq $normal -and $r.RebootEvents[2].status -ceq $normal)
  return 'passed'
}

function Assert-AcceptanceLaunchRollback($Result) {
  if ($Result.Scenario -ceq 'forced-reinstall') {
    Assert-Acceptance ($Result.Launch -ceq 'not-run-scenario-or-incomplete-reinstall')
  } else {
    Assert-Acceptance ((Test-AcceptanceInteger $Result.Launch.CycleCount) -and $Result.Launch.CycleCount -eq 2)
    Assert-AcceptanceArray $Result.Launch.Cycles 2
    for ($i = 0; $i -lt 2; $i++) {
      $cycle = $Result.Launch.Cycles[$i]
      Assert-Acceptance ((Test-AcceptanceInteger $cycle.Iteration) -and $cycle.Iteration -eq ($i + 1))
      Assert-Acceptance ((Test-AcceptanceInteger $cycle.Pid) -and $cycle.Pid -gt 0)
      Assert-AcceptanceTrue $cycle.GracefulExit
      Assert-Acceptance ((Test-AcceptanceInteger $cycle.Ready.Handle) -and $cycle.Ready.Handle -gt 0)
      Assert-Acceptance ((Test-AcceptanceInteger $cycle.Ready.StableSamples) -and $cycle.Ready.StableSamples -ge 11)
    }
  }
  if ($Result.Kind -ceq 'msi' -and $Result.Scenario -ceq 'lifecycle') {
    $rollback = $Result.RollbackProbe
    Assert-Acceptance ((Test-AcceptanceInteger $rollback.ExitCode) -and $rollback.ExitCode -eq 1603)
    Assert-AcceptanceReboot $rollback.RebootObservation 'msi' 1603
    foreach ($field in @('Log', 'FailureContext')) { Assert-Acceptance ($rollback.$field -is [string] -and $rollback.$field.Length -gt 0) }
    # A failed rollback exit is expected only with readable, non-pending reboot evidence.
    $normal = Get-InstallerRebootAssessment 'msi' 0 $rollback.RebootObservation.markers $rollback.RebootObservation.log
    Assert-Acceptance ($normal.status -ceq 'no-reboot-observed')
  } else { Assert-Acceptance ($Result.RollbackProbe -ceq 'not-run-scenario-reboot-or-prerequisite') }
}

function Get-AcceptancePolicy($InputEvidence, $Findings, $Lifecycle) {
  $contract = $InputEvidence.context.contract; $r = $InputEvidence.summary.Installers[0]
  Assert-Acceptance ($Findings.Count -eq 2 -and $Findings[0] -ceq $Findings[1])
  $normal = $Findings[0] -ceq 'thumbnail-api-ok'
  $limited = $contract -ceq 'hosted-nsis-diagnostic' -and $Findings[0] -ceq 'per-user-shell-activation-failed'
  Assert-Acceptance ($normal -or $limited)
  $expectedFailures = @()
  if ($limited) {
    foreach ($phase in @('initial', 'reinstalled')) {
      $ctx = @{ kind = $r.Kind; environment = $r.PhaseEnvironments.$phase }
      Assert-Acceptance (Test-ThumbnailPerUserOnly $ctx)
      foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) {
        foreach ($mode in @('shell', 'force-extract')) {
          $label = "$phase-$id-$mode"
          $api = if ($mode -ceq 'shell') { 'IShellItemImageFactory.GetImage' } else { 'IThumbnailCache.GetThumbnail' }
          $expectedFailures += [ordered]@{ Category = 'thumbnail-render'; Message = "$label failed: $api, 0x80040154" }
        }
      }
    }
  }
  if ($Lifecycle -ceq 'reboot-required') {
    Assert-Acceptance ($contract -ceq 'msi-forced-reinstall-reboot' -and $normal)
    $expectedFailures += [ordered]@{ Category = 'reboot-required'; Message = 'reinstall exit code: 3010; reboot state: reboot-required' }
  }
  Assert-AcceptanceArray $r.Failures $expectedFailures.Count
  # Exact one-to-one set membership, including API/label/HRESULT; duplicates never qualify.
  foreach ($failure in $expectedFailures) {
    $matches = @($r.Failures | Where-Object { Test-AcceptanceEqual $_ $failure })
    Assert-AcceptanceArray $matches 1
  }
  return [ordered]@{ limited = $limited; reboot = $Lifecycle -ceq 'reboot-required'; failureCount = $expectedFailures.Count }
}

function Assert-AcceptanceSteps($InputEvidence, $FailureCount) {
  $s = $InputEvidence.summary; $steps = $InputEvidence.steps
  foreach ($name in @('checkout', 'verifyCommit', 'download', 'assessmentTests', 'diagnosticContract', 'supportDownload', 'manualTests', 'manualEvidence')) {
    Assert-Acceptance ($steps.$name -ceq 'success')
  }
  $failed = $FailureCount -gt 0
  $status = if ($failed) { 'failed' } else { 'passed' }
  $outcome = if ($failed) { 'failure' } else { 'success' }
  $exitCode = if ($failed) { 1 } else { 0 }
  Assert-Acceptance ($s.Status -ceq $status -and $s.Installers[0].Status -ceq $status -and $steps.smoke -ceq $outcome)
  Assert-Acceptance ((Test-AcceptanceInteger $InputEvidence.smokeExitCode) -and $InputEvidence.smokeExitCode -eq $exitCode)
}
