[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'windows-installer-acceptance.ps1')
. (Join-Path $PSScriptRoot 'windows-installer-acceptance-test-fixtures.ps1')

function Assert-AcceptanceTest($Condition, $Message) {
  if (-not $Condition) { throw $Message }
}

function Get-AcceptanceTestFailureSite($Case) {
  # Synthetic inputs only. Do not print exception text, values or absolute paths.
  try {
    Assert-AcceptanceIdentity $Case
    Assert-AcceptanceCommon $Case
    $lifecycle = Get-AcceptanceLifecycle $Case
    Assert-AcceptanceLaunchRollback $Case.summary.Installers[0]
    $phases = @('initial', $(if ($lifecycle -ceq 'reboot-required') { 'pre-reboot-observation' } else { 'reinstalled' }))
    $findings = @(Get-AcceptanceFindings $Case $phases $lifecycle)
    $policy = Get-AcceptancePolicy $Case $findings $lifecycle
    Assert-AcceptanceSteps $Case $policy.failureCount
  } catch {
    $sites = @()
    foreach ($line in ($_.ScriptStackTrace -split '\r?\n')) {
      if ($line -match '^at ([A-Za-z0-9-]+), .*windows-installer-acceptance[^:]*\.ps1: line ([0-9]+)$') {
        $sites += "$($Matches[1]):$($Matches[2])"
      }
    }
    return $sites -join ' > '
  }
  return 'no-validation-exception'
}

function Assert-AcceptanceCase($Case, $Expected, $Name) {
  $before = ConvertTo-Json -InputObject $Case -Depth 40 -Compress
  $result = Get-InstallerAcceptance $Case
  Assert-AcceptanceTest ($result.reasonCodes -is [array]) "$Name : reasonCodes must remain an array"
  $serializedResult = ConvertTo-Json -InputObject $result -Depth 8 -Compress | ConvertFrom-Json
  Assert-AcceptanceTest ($serializedResult.reasonCodes -is [array]) "$Name : JSON reasonCodes became scalar"
  if ($Expected -ceq 'passed' -and $result.contractStatus -cne $Expected) {
    $site = Get-AcceptanceTestFailureSite $Case
    throw "$Name : expected passed, got $($result.contractStatus) / $($result.reasonCodes -join ','); site=$site"
  }
  Assert-AcceptanceTest ($result.contractStatus -ceq $Expected) "$Name : expected $Expected, got $($result.contractStatus) / $($result.reasonCodes -join ',')"
  Assert-AcceptanceTest ($before -ceq (ConvertTo-Json -InputObject $Case -Depth 40 -Compress)) "$Name : acceptance mutated raw evidence"
  $roundTrip = $before | ConvertFrom-Json
  $again = Get-InstallerAcceptance $roundTrip
  Assert-AcceptanceTest (Test-AcceptanceEqual $result $again) "$Name : JSON round-trip changed acceptance"
  Assert-AcceptanceTest (-not $result.reuseEligible -and $result.releaseAcceptance -ceq 'unverified') "$Name : pure evaluation granted release/reuse"
  if ($Expected -ceq 'passed') {
    Assert-AcceptanceTest ($result.rawSmoke.status -ceq $Case.summary.Status -and $result.rawSmoke.exitCode -eq $Case.smokeExitCode) "$Name : raw outcome was rewritten"
    Assert-AcceptanceTest ($result.rawSmoke.failureCount -eq $Case.summary.Installers[0].Failures.Count) "$Name : raw failures lost"
  }
  return $result
}

function Test-AcceptancePositive {
  foreach ($kind in @('msi', 'nsis')) {
    $case = New-AcceptanceTestCase $kind
    $result = Assert-AcceptanceCase $case 'passed' "strict-$kind"
    Assert-AcceptanceTest ($result.thumbnailStatus -ceq 'passed' -and $result.lifecycleStatus -ceq 'passed') 'normal observation lost'
  }
  $normal = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic'
  $result = Assert-AcceptanceCase $normal 'passed' 'hosted-normal'
  Assert-AcceptanceTest ($result.reasonCodes -ccontains 'known-limitation-not-reproduced') 'host improvement not reported'
  $limited = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true
  $result = Assert-AcceptanceCase $limited 'passed' 'hosted-known-negative'
  Assert-AcceptanceTest ($result.thumbnailStatus -ceq 'not-accepted' -and $result.rawSmoke.failureCount -eq 12 -and $result.rawSmoke.outcome -ceq 'failure') 'known negative masked product failure'
  foreach ($reboot in @($false, $true)) {
    $case = New-AcceptanceTestCase 'msi' 'msi-forced-reinstall-reboot' $false $reboot
    $result = Assert-AcceptanceCase $case 'passed' "forced-$reboot"
    if ($reboot) { Assert-AcceptanceTest ($result.reasonCodes -ccontains 'post-reboot-unverified' -and $result.productAcceptance -ceq 'limited-observation') '3010 became post-reboot acceptance' }
  }
}

function Test-AcceptanceIdentityCases {
  foreach ($field in @('repository', 'runId', 'runAttempt', 'workflowSha', 'harnessSha', 'productSha', 'artifactId', 'artifactDigest', 'installerKind', 'scenario', 'expectedVersion', 'sourceMode')) {
    $case = New-AcceptanceTestCase; $case.identity.$field = 'mismatch'
    $null = Assert-AcceptanceCase $case 'failed' "identity-$field"
  }
  foreach ($contract in @('unknown', 'STRICT-PRODUCT', '', $null)) {
    $case = New-AcceptanceTestCase; $case.context.contract = $contract
    $null = Assert-AcceptanceCase $case 'failed' 'unknown-contract'
  }
  foreach ($version in @(0, 2, '1', $true, $null)) {
    $case = New-AcceptanceTestCase; $case.context.policyVersion = $version
    $null = Assert-AcceptanceCase $case 'failed' 'policy-version'
  }
  $case = New-AcceptanceTestCase; $case.summary.Artifacts.Inventory.sourceSha = ('d' * 40)
  $null = Assert-AcceptanceCase $case 'failed' 'inventory-source'
  $case = New-AcceptanceTestCase; $case.context.productSha = ('d' * 40); $case.identity.productSha = ('d' * 40)
  $case.inventory.sourceSha = ('d' * 40); $case.summary.Artifacts.Inventory.sourceSha = ('d' * 40)
  $null = Assert-AcceptanceCase $case 'failed' 'ordinary-workflow-source-mismatch'
  $case.context.sourceMode = 'reuse'; $case.identity.sourceMode = 'reuse'
  $result = Assert-AcceptanceCase $case 'passed' 'reuse-source-separated-but-not-eligible'
  Assert-AcceptanceTest (-not $result.reuseEligible) 'reuse needs independent producer verification'
  foreach ($pair in @(@('nsis', 'msi-forced-reinstall-reboot'), @('msi', 'hosted-nsis-diagnostic'))) {
    $case = New-AcceptanceTestCase $pair[0] $pair[1]
    $null = Assert-AcceptanceCase $case 'failed' 'scenario-contract-mismatch'
  }
}

function Test-AcceptanceCommonCases {
  foreach ($field in @('RegistryPathCheck', 'VersionCheck', 'HandlerCheck', 'ThumbnailRegistration', 'InstalledEnvironmentCheck', 'ReinstalledRegistration', 'ShortcutCheck', 'DefaultCheck', 'ThirdPartySet', 'ThumbnailUninstall', 'AfterEnvironmentCheck', 'FinalCleanCheck', 'ProbeEvidenceCheck', 'DiagnosticContract')) {
    foreach ($value in @($null, $false, 'true', 1, @{ Passed = $false })) {
      $case = New-AcceptanceTestCase; $case.summary.Installers[0][$field] = $value
      $null = Assert-AcceptanceCase $case 'failed' "check-type-$field"
    }
    $case = New-AcceptanceTestCase; $case.summary.Installers[0].Remove($field)
    $null = Assert-AcceptanceCase $case 'failed' "missing-$field"
  }
  $mutations = @(
    { param($c) $c.summary.SchemaVersion = '3' },
    { param($c) $c.summary.FatalError = 'private-source' },
    { param($c) $c.summary.Failures = @(@{ Category = 'cleanup'; Message = 'private-source' }) },
    { param($c) $c.summary.Installers = $c.summary.Installers[0] },
    { param($c) $c.summary.Installers += $c.summary.Installers[0] },
    { param($c) $c.summary.Before.Clean = 'true' },
    { param($c) $c.summary.Installers[0].After.Paths = @('private-source') },
    { param($c) $c.summary.Installers[0].After.OwnedRegistryCount = 1 },
    { param($c) $c.summary.Fixture.AfterSha256 = ('b' * 64) },
    { param($c) $c.summary.Installers[0].DefaultsAfterUninstall[0].Defaults[0].Value = 'changed' },
    { param($c) $c.summary.RestoredDefaults[0].UserChoice[0].Hash.Exists = $true },
    { param($c) $c.summary.OriginalDefaults = @(); $c.summary.RestoredDefaults = @() },
    { param($c) $c.summary.ThumbnailFixtureManifest.fixtures[0].bytes = 0 },
    { param($c) $c.summary.Installers[0].Launch.Cycles[1].GracefulExit = $false },
    { param($c) $c.summary.Installers[0].RollbackProbe.ExitCode = 0 },
    { param($c) $c.summary.Installers[0].RollbackProbe.RebootObservation.log.status = 'unreadable' }
  )
  foreach ($mutation in $mutations) {
    $case = New-AcceptanceTestCase; & $mutation $case
    $result = Assert-AcceptanceCase $case 'failed' 'common-mutation'
    Assert-AcceptanceTest ((ConvertTo-Json $result -Depth 10 -Compress) -notmatch 'private-source') 'private data leaked'
  }
}

function Test-AcceptanceProbeCases {
  $mutations = @(
    { param($r) $r.Probes = @($r.Probes | Select-Object -Skip 1) },
    { param($r) $r.Probes[1].Label = $r.Probes[0].Label },
    { param($r) $r.Probes[0].Label = $r.Probes[0].Label.ToUpperInvariant() },
    { param($r) $r.Probes[0].Result.resolvedHandler = '{00000000-0000-0000-0000-000000000000}' },
    { param($r) $r.Probes[2].Result.status = 'failed'; $r.Probes[2].Result.hresult = '0x80040154' },
    { param($r) $r.Probes[3].Result.hresult = '0x80004005' },
    { param($r) $r.Probes[3].Result.requestFlags = '8' },
    { param($r) $r.Probes[3].Result.phase = 'CoCreateInstance.thumbnailCache' },
    { param($r) $r.Probes[3].FixtureId = 'control-jpg' },
    { param($r) $r.'initial-small-hwp-shell-integrity'.unchanged = $false },
    { param($r) $r.'initial-small-hwp-shell-integrity'.sha256 = ('f' * 64) },
    { param($r) $r.PhaseEnvironments.initial.environment.registrations[0].inproc.handler.sha256 = ('f' * 64) },
    { param($r) $r.PhaseEnvironments.initial.environment.registrations[1].inproc.status = 'ok' },
    { param($r) $r.PhaseEnvironments.initial.environment.registrations[0].hive = 'LocalMachine' },
    { param($r) $r.ManualChecks[0].exitCode = 0 },
    { param($r) $r.ExpectedPhases = @('initial', 'pre-reboot-observation') },
    { param($r) $r.Assessments[0].finding = 'thumbnail-api-ok' },
    { param($r) $r.Failures = @() },
    { param($r) $r.Failures[1] = $r.Failures[0] },
    { param($r) $r.Failures[0].Message = 'unrelated thumbnail-render failure' },
    { param($r) $r.Failures[0].Category = 'THUMBNAIL-RENDER' },
    { param($r) $r.NoDanglingCanonicalDefault = $false }
  )
  foreach ($mutation in $mutations) {
    $case = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true; & $mutation $case.summary.Installers[0]
    $null = Assert-AcceptanceCase $case 'failed' 'known-negative-counterexample'
  }
  foreach ($suffix in @('small-hwp-shell', 'control-jpg-shell', 'control-jpg-force-extract')) {
    $case = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true
    $p = @($case.summary.Installers[0].Probes | Where-Object { $_.Label -ceq "initial-$suffix" })[0].Result
    $p.status = 'failed'; $p.hresult = '0x80004005'; $p.bitmapPresent = $false; $p.width = $null; $p.height = $null
    $null = Assert-AcceptanceCase $case 'failed' "mixed-or-jpg-$suffix"
  }
  $case = New-AcceptanceTestCase 'nsis' 'strict-product' $true
  $null = Assert-AcceptanceCase $case 'failed' 'strict-rejects-known-negative'
}

function Test-AcceptanceRebootCases {
  foreach ($code in @(1641, 1602, 1603, '3010', $null)) {
    $case = New-AcceptanceTestCase 'msi' 'msi-forced-reinstall-reboot' $false $true
    $case.summary.Installers[0].ReinstallExitCode = $code
    $null = Assert-AcceptanceCase $case 'failed' "unexpected-reinstall-$code"
  }
  $mutations = @(
    { param($r) $r.RebootEvents = @() },
    { param($r) $r.RebootEvents = @($r.RebootEvents[1], $r.RebootEvents[0], $r.RebootEvents[2]) },
    { param($r) $r.RebootEvents[1].markers[1].id = $r.RebootEvents[1].markers[0].id },
    { param($r) $r.RebootEvents[1].markers[0].status = 'unreadable' },
    { param($r) $r.RebootEvents[1].markers[0].present = 'true' },
    { param($r) $r.RebootEvents[1].log.status = 'missing' },
    { param($r) $r.RebootEvents[1].log.Remove('deferredOperation') },
    { param($r) $r.RebootEvents[1].observationComplete = $false },
    { param($r) $r.RebootEvents[2].log.status = 'unreadable' },
    { param($r) $r.RebootEvents[0].status = 'reboot-pending' },
    { param($r) $r.InstallExitCode = 3010 },
    { param($r) $r.UninstallExitCode = 3010 },
    { param($r) $r.LifecycleStatus = 'passed' },
    { param($r) $r.Reinstall = $true },
    { param($r) $r.Launch = 'not-run' },
    { param($r) $r.RollbackProbe = 'not-run' },
    { param($r) $r.Failures = @() }
  )
  foreach ($mutation in $mutations) {
    $case = New-AcceptanceTestCase 'msi' 'msi-forced-reinstall-reboot' $false $true; & $mutation $case.summary.Installers[0]
    $null = Assert-AcceptanceCase $case 'failed' 'reboot-counterexample'
  }
  $case = New-AcceptanceTestCase 'msi' 'strict-product' $false $true
  $null = Assert-AcceptanceCase $case 'failed' 'ordinary-msi-does-not-allow-3010'
}

function Test-AcceptanceStepCases {
  foreach ($step in @('checkout', 'verifyCommit', 'download', 'assessmentTests', 'diagnosticContract', 'supportDownload', 'manualTests', 'manualEvidence', 'smoke')) {
    foreach ($state in @('failure', 'skipped', 'cancelled', 'unknown', $null)) {
      $case = New-AcceptanceTestCase; $case.steps[$step] = $state
      $null = Assert-AcceptanceCase $case 'failed' "step-$step-$state"
    }
    $case = New-AcceptanceTestCase; $case.steps.Remove($step)
    $null = Assert-AcceptanceCase $case 'failed' "missing-step-$step"
  }
  foreach ($exitCode in @(1, 2, -1, 3010, '0', $null)) {
    $case = New-AcceptanceTestCase; $case.smokeExitCode = $exitCode
    $null = Assert-AcceptanceCase $case 'failed' 'unknown-process-exit'
  }
  $case = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true; $case.steps.smoke = 'success'; $case.smokeExitCode = 0
  $null = Assert-AcceptanceCase $case 'failed' 'known-failure-rewritten-success'
  $case = New-AcceptanceTestCase; $case.summary.Installers[0].Status = 'failed'
  $null = Assert-AcceptanceCase $case 'failed' 'summary-outcome-mismatch'
}

function Test-AcceptanceCoherentCounterexamples {
  # Recompute the recorded assessments too: rejection must not rely on a stale finding.
  foreach ($mode in @('mixed-phases', 'mixed-documents', 'jpg-failed', 'wrong-registration')) {
    $case = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true
    $r = $case.summary.Installers[0]
    if ($mode -ceq 'wrong-registration') { $r.PhaseEnvironments.initial.environment.registrations[0].inproc.handler.bytes = 123 }
    elseif ($mode -ceq 'jpg-failed') {
      $p = @($r.Probes | Where-Object { $_.Label -ceq 'initial-control-jpg-shell' })[0].Result
      $p.status = 'failed'; $p.hresult = '0x80040154'; $p.bitmapPresent = $false; $p.width = $null; $p.height = $null
    } else {
      $pattern = if ($mode -ceq 'mixed-phases') { 'reinstalled-*-*' } else { '*-small-hwp-*' }
      foreach ($record in @($r.Probes | Where-Object { $_.Label -clike $pattern -and $_.Result.mode -in @('shell', 'force-extract') })) {
        $p = $record.Result; $p.status = 'ok'; $p.hresult = '0x00000000'; $p.bitmapPresent = $true; $p.width = 181; $p.height = 256
        $p.phase = if ($p.mode -ceq 'shell') { 'IShellItemImageFactory.GetImage' } else { 'ISharedBitmap.GetSharedBitmap' }
      }
    }
    Update-AcceptanceTestAssessments $case
    foreach ($check in $r.ManualChecks) { $check.finding = $r.Assessments[0].finding }
    $null = Assert-AcceptanceCase $case 'failed' "coherent-$mode"
  }
  $case = New-AcceptanceTestCase; $case.summary.Installers[0].Launch.Cycles[0].Ready.StableSamples = 1
  $null = Assert-AcceptanceCase $case 'failed' 'insufficient-window-readiness'
  $case = New-AcceptanceTestCase; $case.identity.runId = 100
  $null = Assert-AcceptanceCase $case 'failed' 'identity-number-string-coercion'
}

function Test-AcceptanceWrappedScalarEquality {
  $text = 'small-hwp' | ForEach-Object { $_ }
  Assert-AcceptanceTest (Test-AcceptanceEqual $text 'small-hwp') 'pipeline-wrapped string rejected'
  Assert-AcceptanceTest (Test-AcceptanceEqual 'small-hwp' $text) 'wrapped scalar comparison is asymmetric'
  $left = @{ fixtures = @(@{ id = $text; bytes = 100; sha256 = ('e' * 64) }) }
  $right = Copy-AcceptanceTestValue $left
  Assert-AcceptanceTest (Test-AcceptanceEqual $left $right) 'pipeline fixture JSON comparison rejected'
  Assert-AcceptanceTest (Test-AcceptanceEqual $right $left) 'object comparison is asymmetric'
  foreach ($different in @('SMALL-HWP', 100, $true, @{ value = $text }, [pscustomobject]@{ value = $text }, @($text), $null)) {
    Assert-AcceptanceTest (-not (Test-AcceptanceEqual $text $different)) 'scalar type/value distinction lost'
    Assert-AcceptanceTest (-not (Test-AcceptanceEqual $different $text)) 'reverse type/value distinction lost'
  }
  Assert-AcceptanceTest (-not (Test-AcceptanceEqual @() $null)) 'empty array became null'
  $case = New-AcceptanceTestCase; $case.summary.FatalError = 'private-source'
  $site = Get-AcceptanceTestFailureSite $case
  Assert-AcceptanceTest ($site -match 'Assert-AcceptanceCommon:[0-9]+') 'synthetic failure site missing'
  Assert-AcceptanceTest ($site -notmatch 'private-source|[/\\]') 'failure site leaked values or paths'
}

Test-AcceptanceWrappedScalarEquality
Test-AcceptancePositive
Test-AcceptanceIdentityCases
Test-AcceptanceCommonCases
Test-AcceptanceProbeCases
Test-AcceptanceRebootCases
Test-AcceptanceStepCases
Test-AcceptanceCoherentCounterexamples
Write-Output 'Pure installer acceptance regressions passed; no installed product, provenance, release or reuse acceptance.'
exit 0
