# Synthetic evidence only; never executes an installer or changes machine state.
function Copy-AcceptanceTestValue($Value) {
  return (ConvertTo-Json -InputObject $Value -Depth 40 -Compress | ConvertFrom-Json)
}

function New-AcceptanceTestDefaults {
  $rows = @()
  foreach ($extension in @('.hwp', '.hwpx')) {
    $defaults = @(); $choices = @()
    foreach ($view in @('Registry64', 'Registry32')) {
      foreach ($hive in @('HKCU', 'HKLM')) { $defaults += @{ Hive = $hive; View = $view; Exists = $false; Value = $null } }
      $choices += @{ Hive = 'HKCU'; View = $view; ProgId = @{ Exists = $false; Value = $null }; Hash = @{ Exists = $false; Value = $null } }
    }
    $rows += @{ Extension = $extension; Defaults = $defaults; UserChoice = $choices }
  }
  return ,$rows
}

function New-AcceptanceTestEnvironment($Kind) {
  $rows = @(); $clsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'
  foreach ($hive in @('CurrentUser', 'LocalMachine')) {
    $active = ($Kind -ceq 'nsis' -and $hive -ceq 'CurrentUser') -or ($Kind -ceq 'msi' -and $hive -ceq 'LocalMachine')
    $inproc = @{ status = 'missing' }
    if ($active) { $inproc = @{ status = 'ok'; handler = @{ status = 'ok'; bytes = 512; sha256 = ('a' * 64) }; worker = @{ status = 'ok'; bytes = 1024; sha256 = ('b' * 64) } } }
    $rows += @{ hive = $hive; view = 'Registry64'; inproc = $inproc; threadingModel = @{ status = 'ok'; value = 'Apartment' }
      extensions = @('.hwp', '.hwpx') | ForEach-Object { @{ extension = $_; handler = @{ status = 'ok'; value = $clsid } } } }
  }
  return @{ status = 'collected'; environment = @{ is64BitProcess = $true; apartment = 'STA'; token = @{ status = 'ok' }; registrations = $rows } }
}

function New-AcceptanceTestReboot($Kind, $Code, $Pending = $false) {
  $markers = @(); $log = @{ status = 'not-applicable' }
  if ($Kind -ceq 'msi') {
    foreach ($id in @('pending-file-renames', 'servicing-reboot', 'update-reboot')) {
      $present = $Pending -and $id -ceq 'pending-file-renames'
      $markers += @{ id = $id; status = 'ok'; baselinePresent = $false; present = $present; changed = $present }
    }
    $log = @{ status = 'ok'; deferredOperation = $Pending; restartRequired = $Code -eq 3010; msiSystemRebootPending = $false }
  }
  return Get-InstallerRebootAssessment $Kind $Code $markers $log
}

function Add-AcceptanceTestPhase($Result, $Phase, $Manifest, $Limited) {
  foreach ($label in (Get-ThumbnailExpectedLabels $Phase)) {
    $mode = if ($label -match '-association-') { 'association' } elseif ($label.EndsWith('-activate')) { 'activate' }
      elseif ($label.EndsWith('-cache-only')) { 'cache-only' } elseif ($label.EndsWith('-force-extract')) { 'force-extract' } else { 'shell' }
    $api = switch ($mode) { 'association' { 'AssocQueryStringW' } 'activate' { 'CoCreateInstance.handler' } 'shell' { 'IShellItemImageFactory.GetImage' } default { 'ISharedBitmap.GetSharedBitmap' } }
    $flag = switch ($mode) { 'shell' { 8 } 'cache-only' { 1 } 'force-extract' { 4 } default { $null } }
    $probe = [ordered]@{ schemaVersion = 1; mode = $mode; phase = $api; status = 'ok'; hresult = '0x00000000'; bitmapPresent = $true; width = 181; height = 256; cacheFlags = 2; elapsedMs = 10; apartment = 'STA'; requestFlags = $flag; resolvedHandler = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}' }
    $record = [ordered]@{ Label = $label; Result = $probe }
    if ($mode -in @('shell', 'cache-only', 'force-extract')) {
      $spec = @($Manifest.fixtures | Where-Object { $label -clike "*-$($_.id)-$mode" })[0]
      $record.FixtureId = $spec.id
      $Result["$label-integrity"] = @{ id = $spec.id; bytes = $spec.bytes; sha256 = $spec.sha256.ToUpperInvariant(); unchanged = $true }
      $failed = $Limited -and $spec.id -ne 'control-jpg' -and $mode -in @('shell', 'force-extract')
      # Cold-cache misses are observations, not product extraction failures.
      if ($mode -eq 'cache-only' -or $failed) {
        $probe.status = 'failed'; $probe.bitmapPresent = $false; $probe.width = $null; $probe.height = $null; $probe.cacheFlags = $null
        # Cache() returns before bitmap inspection on a failed HRESULT.
        if ($mode -ne 'shell') { $probe.bitmapPresent = $null }
        $probe.hresult = if ($failed) { '0x80040154' } else { '0x80030002' }
        if ($mode -ne 'shell') { $probe.phase = 'IThumbnailCache.GetThumbnail' }
      }
      if ($failed) { $Result.Failures += [ordered]@{ Category = 'thumbnail-render'; Message = "$label failed: $($probe.phase), $($probe.hresult)" } }
    }
    $Result.Probes += $record
  }
}

function Update-AcceptanceTestAssessments($Case) {
  $r = $Case.summary.Installers[0]; $r.Assessments = @()
  foreach ($phase in $r.ExpectedPhases) {
    $ctx = @{ kind = $r.Kind; inventory = $Case.summary.Artifacts.Inventory; environment = $r.PhaseEnvironments.$phase; lifecycleStatus = $r.LifecycleStatus; evidenceValid = $true }
    $r.Assessments += Get-ThumbnailPhaseAssessment $r.Probes $ctx $phase
  }
}

function New-AcceptanceTestCase($Kind = 'msi', $Contract = 'strict-product', $Limited = $false, $Reboot = $false) {
  $scenario = if ($Contract -ceq 'msi-forced-reinstall-reboot') { 'forced-reinstall' } else { 'lifecycle' }
  $context = [ordered]@{ policyVersion = 1; contract = $Contract; repository = 'postmelee/alhangeul-tauri'; runId = '100'; runAttempt = '1'; workflowSha = ('c' * 40); harnessSha = ('c' * 40); productSha = ('c' * 40); artifactId = '200'; artifactDigest = ('sha256:' + ('d' * 64)); installerKind = $Kind; scenario = $scenario; expectedVersion = '0.1.0'; sourceMode = 'ordinary' }
  $files = @(@{ kind = 'msi'; size = 100; sha256 = ('e' * 64) }, @{ kind = 'nsis'; size = 100; sha256 = ('f' * 64) }, @{ kind = 'thumbnail-handler'; size = 512; sha256 = ('a' * 64) }, @{ kind = 'thumbnail-worker'; size = 1024; sha256 = ('b' * 64) })
  $inventory = @{ schemaVersion = 1; platform = 'windows-x64'; requiredKinds = @('msi', 'nsis', 'thumbnail-handler', 'thumbnail-worker'); files = $files; sourceSha = $context.productSha }
  $specs = @('small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg') | ForEach-Object { @{ id = $_; bytes = 100; sha256 = ('e' * 64) } }
  $manifest = @{ schemaVersion = 1; rhwpSha = ('f' * 40); edge = 256; fixtures = @($specs) }
  $clean = @{ Clean = $true; Processes = @(); Paths = @(); Entries = @(); OwnedRegistryCount = 0 }
  $defaults = New-AcceptanceTestDefaults
  $status = if ($Limited -or $Reboot) { 'failed' } else { 'passed' }
  $phase2 = if ($Reboot) { 'pre-reboot-observation' } else { 'reinstalled' }
  $lifecycle = if ($Reboot) { 'reboot-required' } else { 'passed' }
  $r = [ordered]@{ Kind = $Kind; Scenario = $scenario; Status = $status; Failures = @(); Probes = @(); ExpectedPhases = @('initial', $phase2); PhaseEnvironments = @{}; RebootEvents = @(); InstallExitCode = 0; ReinstallExitCode = $(if ($Reboot) { 3010 } else { 0 }); UninstallExitCode = 0; Reinstall = (-not $Reboot); InitialShellSucceeded = (-not $Limited); LifecycleStatus = $lifecycle; Assessments = @(); ManualChecks = @() }
  foreach ($flag in @('RegistryPathCheck', 'VersionCheck', 'HandlerCheck', 'ThumbnailRegistration', 'InstalledEnvironmentCheck', 'ReinstalledRegistration', 'ShortcutCheck', 'DefaultCheck', 'ThirdPartySet', 'ThumbnailUninstall', 'AfterEnvironmentCheck', 'FinalCleanCheck', 'ProbeEvidenceCheck', 'DiagnosticContract', 'NoDanglingCanonicalDefault')) { $r[$flag] = $true }
  $r.Before = Copy-AcceptanceTestValue $clean; $r.After = Copy-AcceptanceTestValue $clean
  $r.DefaultsAfterInstall = Copy-AcceptanceTestValue $defaults; $r.DefaultsAfterUninstall = Copy-AcceptanceTestValue $defaults
  $r.RebootEvents = @((New-AcceptanceTestReboot $Kind 0), (New-AcceptanceTestReboot $Kind $r.ReinstallExitCode $Reboot), (New-AcceptanceTestReboot $Kind 0 $Reboot))
  if ($Reboot) { $r.Failures += [ordered]@{ Category = 'reboot-required'; Message = 'reinstall exit code: 3010; reboot state: reboot-required' } }
  foreach ($phase in $r.ExpectedPhases) {
    Add-AcceptanceTestPhase $r $phase $manifest $Limited
    $envState = New-AcceptanceTestEnvironment $Kind; $r.PhaseEnvironments[$phase] = $envState
    $ctx = @{ kind = $Kind; inventory = $inventory; environment = $envState; lifecycleStatus = $lifecycle; evidenceValid = $true }
    $r.Assessments += Get-ThumbnailPhaseAssessment $r.Probes $ctx $phase
  }
  $r.ThumbnailFixtures = @{ Phase = 'initial'; FixtureCount = 4; RequestEdge = 256 }
  $r.ReinstalledThumbnailFixtures = @{ Phase = $phase2; FixtureCount = 4; RequestEdge = 256 }
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) { $r.ManualChecks += @{ fixtureId = $id; finding = $r.Assessments[0].finding; exitCode = $(if ($Limited) { 1 } else { 0 }) } }
  $r.Launch = if ($scenario -ceq 'forced-reinstall') { 'not-run-scenario-or-incomplete-reinstall' } else { @{ CycleCount = 2; Cycles = @(1, 2) | ForEach-Object { @{ Iteration = $_; Pid = 100; GracefulExit = $true; Ready = @{ Handle = 1; StableSamples = 11 } } } } }
  $r.RollbackProbe = if ($Kind -ceq 'msi' -and $scenario -ceq 'lifecycle') { @{ ExitCode = 1603; RebootObservation = (New-AcceptanceTestReboot 'msi' 1603); Log = 'synthetic.log'; FailureContext = 'synthetic-context.txt' } } else { 'not-run-scenario-reboot-or-prerequisite' }
  $summary = @{ SchemaVersion = 3; InstallerKind = $Kind; Scenario = $scenario; ExpectedVersion = '0.1.0'; Status = $status; Failures = @(); Installers = @($r); Artifacts = @{ Inventory = $inventory }; Before = (Copy-AcceptanceTestValue $clean); ThumbnailFixtureManifest = $manifest; OriginalDefaults = (Copy-AcceptanceTestValue $defaults); BaselineDefaults = (Copy-AcceptanceTestValue $defaults); RestoredDefaults = (Copy-AcceptanceTestValue $defaults); Fixture = @{ Status = 'passed'; BeforeSha256 = ('a' * 64); AfterSha256 = ('a' * 64) } }
  $steps = @{}; foreach ($step in @('checkout', 'verifyCommit', 'download', 'assessmentTests', 'diagnosticContract', 'supportDownload', 'manualTests', 'manualEvidence')) { $steps[$step] = 'success' }
  $steps.smoke = if ($status -ceq 'failed') { 'failure' } else { 'success' }
  return @{ context = $context; identity = (Copy-AcceptanceTestValue $context); inventory = (Copy-AcceptanceTestValue $inventory); fixtureManifest = (Copy-AcceptanceTestValue $manifest); summary = $summary; steps = $steps; smokeExitCode = $(if ($status -ceq 'failed') { 1 } else { 0 }) }
}
