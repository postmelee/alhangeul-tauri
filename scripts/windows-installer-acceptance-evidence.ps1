# Pure validation of supplied evidence. No filesystem or installer operations.
function Assert-Acceptance($Condition) {
  if ($Condition -isnot [bool] -or -not $Condition) { throw 'acceptance-evidence-invalid' }
}

function Test-AcceptanceInteger($Value) {
  return $Value -is [int] -or $Value -is [long]
}

function Assert-AcceptanceTrue($Value) {
  Assert-Acceptance ($Value -is [bool] -and $Value)
}

function Get-AcceptanceKeys($Value) {
  if ($Value -is [Collections.IDictionary]) { return @($Value.Keys) }
  Assert-Acceptance ($Value -is [System.Management.Automation.PSCustomObject])
  return @($Value.PSObject.Properties.Name)
}

function Test-AcceptanceEqual($Left, $Right) {
  if ($null -eq $Left -or $null -eq $Right) { return $null -eq $Left -and $null -eq $Right }
  if ($Left -is [array] -or $Right -is [array]) {
    if ($Left -isnot [array] -or $Right -isnot [array] -or $Left.Count -ne $Right.Count) { return $false }
    for ($i = 0; $i -lt $Left.Count; $i++) { if (-not (Test-AcceptanceEqual $Left[$i] $Right[$i])) { return $false } }
    return $true
  }
  # [pscustomobject] is a PSObject accelerator: pipeline-wrapped scalars can match it.
  $leftObject = $Left -is [Collections.IDictionary] -or $Left -is [System.Management.Automation.PSCustomObject]
  $rightObject = $Right -is [Collections.IDictionary] -or $Right -is [System.Management.Automation.PSCustomObject]
  if ($leftObject -or $rightObject) {
    if (-not $leftObject -or -not $rightObject) { return $false }
    $keys = @(Get-AcceptanceKeys $Left); $other = @(Get-AcceptanceKeys $Right)
    if ($keys.Count -ne $other.Count) { return $false }
    foreach ($key in $keys) {
      if ($key -cnotin $other -or -not (Test-AcceptanceEqual $Left.$key $Right.$key)) { return $false }
    }
    return $true
  }
  return (ConvertTo-Json -InputObject $Left -Compress) -ceq (ConvertTo-Json -InputObject $Right -Compress)
}

function Assert-AcceptanceArray($Value, $Count) {
  Assert-Acceptance ($Value -is [array] -and $Value.Count -eq $Count)
}

function Assert-AcceptanceIdentity($InputEvidence) {
  $c = $InputEvidence.context; $actual = $InputEvidence.identity
  Assert-Acceptance ((Test-AcceptanceInteger $c.policyVersion) -and $c.policyVersion -eq 1)
  foreach ($field in @('repository', 'runId', 'runAttempt', 'workflowSha', 'harnessSha', 'productSha', 'artifactId', 'artifactDigest', 'installerKind', 'scenario', 'expectedVersion', 'sourceMode')) {
    Assert-Acceptance ($c.$field -is [string] -and $actual.$field -is [string] -and $c.$field.Length -gt 0 -and $c.$field -ceq $actual.$field)
  }
  Assert-Acceptance ($c.repository -ceq 'postmelee/alhangeul-tauri')
  foreach ($field in @('runId', 'runAttempt', 'artifactId')) { Assert-Acceptance ($c.$field -cmatch '^[1-9][0-9]*$') }
  foreach ($field in @('workflowSha', 'harnessSha', 'productSha')) { Assert-Acceptance ($c.$field -cmatch '^[0-9a-f]{40}$') }
  Assert-Acceptance ($c.artifactDigest -cmatch '^sha256:[0-9a-f]{64}$')
  Assert-Acceptance ($c.sourceMode -cin @('ordinary', 'reuse') -and $c.workflowSha -ceq $c.harnessSha)
  if ($c.sourceMode -ceq 'ordinary') { Assert-Acceptance ($c.productSha -ceq $c.workflowSha) }
  $inventory = $InputEvidence.summary.Artifacts.Inventory
  Assert-Acceptance ((Test-AcceptanceInteger $inventory.schemaVersion) -and $inventory.schemaVersion -eq 1)
  Assert-Acceptance ($inventory.sourceSha -ceq $c.productSha -and $inventory.platform -ceq 'windows-x64')
  Assert-AcceptanceArray $inventory.files 4
  $kinds = @('msi', 'nsis', 'thumbnail-handler', 'thumbnail-worker')
  Assert-AcceptanceArray $inventory.requiredKinds 4
  Assert-Acceptance (Test-AcceptanceEqual @($inventory.requiredKinds | Sort-Object) @($kinds | Sort-Object))
  foreach ($kind in $kinds) {
    $files = @($inventory.files | Where-Object { $_.kind -ceq $kind }); Assert-AcceptanceArray $files 1
    Assert-Acceptance ((Test-AcceptanceInteger $files[0].size) -and $files[0].size -gt 0 -and $files[0].sha256 -cmatch '^[0-9a-f]{64}$')
  }
  Assert-Acceptance (Test-AcceptanceEqual $inventory $InputEvidence.inventory)
}

function Assert-AcceptanceClean($State) {
  Assert-AcceptanceTrue $State.Clean
  foreach ($field in @('Processes', 'Paths', 'Entries')) { Assert-AcceptanceArray $State.$field 0 }
  Assert-Acceptance ((Test-AcceptanceInteger $State.OwnedRegistryCount) -and $State.OwnedRegistryCount -eq 0)
}

function Assert-AcceptanceDefaults($Rows) {
  Assert-AcceptanceArray $Rows 2
  foreach ($extension in @('.hwp', '.hwpx')) {
    $match = @($Rows | Where-Object { $_.Extension -ceq $extension }); Assert-AcceptanceArray $match 1
    Assert-AcceptanceArray $match[0].Defaults 4; Assert-AcceptanceArray $match[0].UserChoice 2
    foreach ($view in @('Registry64', 'Registry32')) {
      foreach ($hive in @('HKCU', 'HKLM')) {
        $item = @($match[0].Defaults | Where-Object { $_.View -ceq $view -and $_.Hive -ceq $hive })
        Assert-AcceptanceArray $item 1; Assert-Acceptance ($item[0].Exists -is [bool])
      }
      $choice = @($match[0].UserChoice | Where-Object { $_.View -ceq $view -and $_.Hive -ceq 'HKCU' })
      Assert-AcceptanceArray $choice 1
      foreach ($field in @('ProgId', 'Hash')) { Assert-Acceptance ($choice[0].$field.Exists -is [bool]) }
    }
  }
}

function Assert-AcceptanceCommon($InputEvidence) {
  $s = $InputEvidence.summary; $c = $InputEvidence.context
  Assert-Acceptance ((Test-AcceptanceInteger $s.SchemaVersion) -and $s.SchemaVersion -eq 3)
  Assert-Acceptance ('FatalError' -notin @(Get-AcceptanceKeys $s))
  Assert-AcceptanceArray $s.Failures 0; Assert-AcceptanceArray $s.Installers 1
  $r = $s.Installers[0]
  Assert-Acceptance ($r.Failures -is [array])
  foreach ($status in @($s.Status, $r.Status)) { Assert-Acceptance ($status -is [string] -and $status -cin @('passed', 'failed')) }
  Assert-Acceptance ($s.InstallerKind -ceq $c.installerKind -and $r.Kind -ceq $c.installerKind)
  Assert-Acceptance ($s.Scenario -ceq $c.scenario -and $r.Scenario -ceq $c.scenario -and $s.ExpectedVersion -ceq $c.expectedVersion)
  foreach ($state in @($s.Before, $r.Before, $r.After)) { Assert-AcceptanceClean $state }
  foreach ($flag in @('RegistryPathCheck', 'VersionCheck', 'HandlerCheck', 'ThumbnailRegistration', 'InstalledEnvironmentCheck', 'ReinstalledRegistration', 'ShortcutCheck', 'DefaultCheck', 'ThirdPartySet', 'ThumbnailUninstall', 'AfterEnvironmentCheck', 'FinalCleanCheck', 'ProbeEvidenceCheck', 'DiagnosticContract')) {
    Assert-AcceptanceTrue $r.$flag
  }
  foreach ($rows in @($s.OriginalDefaults, $s.BaselineDefaults, $s.RestoredDefaults, $r.DefaultsAfterInstall, $r.DefaultsAfterUninstall)) { Assert-AcceptanceDefaults $rows }
  Assert-Acceptance (Test-AcceptanceEqual $s.OriginalDefaults $s.RestoredDefaults)
  Assert-Acceptance (Test-AcceptanceEqual $s.BaselineDefaults $r.DefaultsAfterInstall)
  Assert-Acceptance (Test-AcceptanceEqual $s.BaselineDefaults $r.DefaultsAfterUninstall)
  if ($r.Kind -ceq 'nsis') { Assert-AcceptanceTrue $r.NoDanglingCanonicalDefault }
  Assert-Acceptance ($s.Fixture.Status -ceq 'passed' -and $s.Fixture.BeforeSha256 -cmatch '^[0-9A-Fa-f]{64}$')
  Assert-Acceptance ($s.Fixture.BeforeSha256 -ceq $s.Fixture.AfterSha256)
  Assert-Acceptance (Test-AcceptanceEqual $s.ThumbnailFixtureManifest $InputEvidence.fixtureManifest)
  $manifest = $s.ThumbnailFixtureManifest
  Assert-Acceptance ((Test-AcceptanceInteger $manifest.schemaVersion) -and $manifest.schemaVersion -eq 1)
  Assert-Acceptance ((Test-AcceptanceInteger $manifest.edge) -and $manifest.edge -eq 256 -and $manifest.rhwpSha -cmatch '^[0-9a-f]{40}$')
  Assert-AcceptanceArray $manifest.fixtures 4
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg')) {
    $spec = @($manifest.fixtures | Where-Object { $_.id -ceq $id }); Assert-AcceptanceArray $spec 1
    Assert-Acceptance ((Test-AcceptanceInteger $spec[0].bytes) -and $spec[0].bytes -gt 0 -and $spec[0].sha256 -cmatch '^[0-9a-f]{64}$')
  }
}

function Assert-AcceptanceProbe($Record, $Result, $Manifest) {
  $p = $Record.Result; Assert-Acceptance (Test-ThumbnailProbeContract $p $Record.Label)
  Assert-Acceptance ((Test-AcceptanceInteger $p.schemaVersion) -and $p.status -cin @('ok', 'failed') -and $p.apartment -ceq 'STA')
  Assert-Acceptance ($p.mode -cin @('association', 'activate', 'shell', 'cache-only', 'force-extract'))
  Assert-Acceptance ((Test-AcceptanceInteger $p.elapsedMs) -and $p.elapsedMs -ge 0)
  if ($p.mode -in @('shell', 'cache-only', 'force-extract')) {
    $flag = switch -CaseSensitive ($p.mode) { 'shell' { 8 } 'cache-only' { 1 } 'force-extract' { 4 } }
    Assert-Acceptance ((Test-AcceptanceInteger $p.requestFlags) -and $p.requestFlags -eq $flag)
    Assert-Acceptance ($p.bitmapPresent -is [bool])
    $specs = @($Manifest.fixtures | Where-Object { $_.id -ceq $Record.FixtureId }); Assert-AcceptanceArray $specs 1
    $integrity = $Result.("$($Record.Label)-integrity"); $spec = $specs[0]
    Assert-Acceptance ($Record.Label -clike "*-$($spec.id)-$($p.mode)" -and $integrity.id -ceq $spec.id)
    Assert-AcceptanceTrue $integrity.unchanged
    Assert-Acceptance ((Test-AcceptanceInteger $integrity.bytes) -and $integrity.bytes -eq $spec.bytes -and $integrity.sha256 -ieq $spec.sha256)
  }
}

function Get-AcceptanceFindings($InputEvidence, $Phases, $Lifecycle) {
  $s = $InputEvidence.summary; $r = $s.Installers[0]
  Assert-Acceptance (Test-AcceptanceEqual $r.ExpectedPhases $Phases)
  Assert-AcceptanceArray $r.Probes 38; Assert-AcceptanceArray $r.Assessments 2
  Assert-Acceptance (@(Get-AcceptanceKeys $r.PhaseEnvironments).Count -eq 2)
  Assert-Acceptance ($r.LifecycleStatus -ceq $Lifecycle)
  $findings = @(); $allLabels = @($Phases | ForEach-Object { Get-ThumbnailExpectedLabels $_ })
  Assert-Acceptance (@($r.Probes.Label | Select-Object -Unique).Count -eq 38)
  foreach ($record in $r.Probes) {
    Assert-Acceptance ($record.Label -is [string] -and $record.Label -cin $allLabels)
    Assert-AcceptanceProbe $record $r $s.ThumbnailFixtureManifest
  }
  for ($i = 0; $i -lt 2; $i++) {
    $phase = $Phases[$i]; $environment = $r.PhaseEnvironments.$phase
    Assert-AcceptanceTrue $environment.environment.is64BitProcess
    Assert-AcceptanceInstalledBytes $environment $r.Kind
    $ctx = @{ kind = $r.Kind; inventory = $s.Artifacts.Inventory; environment = $environment; lifecycleStatus = $Lifecycle; evidenceValid = $true }
    $assessment = Get-ThumbnailPhaseAssessment $r.Probes $ctx $phase
    Assert-Acceptance (Test-AcceptanceEqual $assessment $r.Assessments[$i])
    Assert-Acceptance ($assessment.evidenceStatus -ceq 'valid')
    $findings += $assessment.finding
    $fixtureCheck = if ($i -eq 0) { $r.ThumbnailFixtures } else { $r.ReinstalledThumbnailFixtures }
    Assert-Acceptance (Test-AcceptanceEqual $fixtureCheck ([ordered]@{ Phase = $phase; FixtureCount = 4; RequestEdge = 256 }))
  }
  Assert-Acceptance ($r.InitialShellSucceeded -is [bool] -and $r.InitialShellSucceeded -eq ($findings[0] -ceq 'thumbnail-api-ok'))
  Assert-AcceptanceArray $r.ManualChecks 3
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) {
    $checks = @($r.ManualChecks | Where-Object { $_.fixtureId -ceq $id }); Assert-AcceptanceArray $checks 1
    $code = if ($findings[0] -ceq 'thumbnail-api-ok') { 0 } else { 1 }
    Assert-Acceptance ($checks[0].finding -ceq $findings[0] -and (Test-AcceptanceInteger $checks[0].exitCode) -and $checks[0].exitCode -eq $code)
  }
  return $findings
}

function Assert-AcceptanceInstalledBytes($Environment, $Kind) {
  $hive = if ($Kind -ceq 'nsis') { 'CurrentUser' } else { 'LocalMachine' }
  $rows = @($Environment.environment.registrations | Where-Object { $_.hive -ceq $hive -and $_.view -ceq 'Registry64' })
  Assert-AcceptanceArray $rows 1
  foreach ($role in @('handler', 'worker')) {
    $file = $rows[0].inproc.$role
    Assert-Acceptance ((Test-AcceptanceInteger $file.bytes) -and $file.bytes -gt 0)
    Assert-Acceptance ($file.sha256 -is [string] -and $file.sha256 -cmatch '^[0-9a-fA-F]{64}$')
  }
}
