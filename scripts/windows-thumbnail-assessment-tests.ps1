[CmdletBinding()]
param([string]$SummaryPath = '')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-installer-reboot.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.ps1')
function Assert-Assessment($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Assert-Condition($Condition, $Message) { Assert-Assessment $Condition $Message }

function New-AssessmentCase($Kind = 'nsis') {
  $clsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'
  $files = @([ordered]@{ kind = 'thumbnail-handler'; sha256 = ('a' * 64); size = 512 }, [ordered]@{ kind = 'thumbnail-worker'; sha256 = ('b' * 64); size = 1024 })
  $registered = [ordered]@{
    status = 'ok'; handler = [ordered]@{ status = 'ok'; bytes = 512; sha256 = ('a' * 64) }
    worker = [ordered]@{ status = 'ok'; bytes = 1024; sha256 = ('b' * 64) }
  }
  $rows = @()
  foreach ($hive in @('CurrentUser', 'LocalMachine')) {
    $active = ($Kind -eq 'nsis' -and $hive -eq 'CurrentUser') -or ($Kind -eq 'msi' -and $hive -eq 'LocalMachine')
    $rows += [ordered]@{ hive = $hive; view = 'Registry64'; inproc = if ($active) { $registered } else { [ordered]@{ status = 'missing' } }; threadingModel = [ordered]@{ status = 'ok'; value = 'Apartment' }; extensions = @('.hwp', '.hwpx') | ForEach-Object { [ordered]@{ extension = $_; handler = [ordered]@{ status = 'ok'; value = $clsid } } } }
  }
  $environment = [ordered]@{ status = 'collected'; environment = [ordered]@{ is64BitProcess = $true; apartment = 'STA'; token = [ordered]@{ status = 'ok' }; enableLUA = [ordered]@{ status = 'ok'; value = 1 }; registrations = $rows } }
  $probes = @()
  foreach ($label in (Get-ThumbnailExpectedLabels 'initial')) {
    $mode = if ($label -match '-association-') { 'association' } elseif ($label.EndsWith('-activate')) { 'activate' } elseif ($label.EndsWith('-cache-only')) { 'cache-only' } elseif ($label.EndsWith('-force-extract')) { 'force-extract' } else { 'shell' }
    $phase = switch ($mode) { association { 'AssocQueryStringW' } activate { 'CoCreateInstance.handler' } shell { 'IShellItemImageFactory.GetImage' } default { 'ISharedBitmap.GetSharedBitmap' } }
    $flag = switch ($mode) { shell { 8 } 'cache-only' { 1 } 'force-extract' { 4 } default { $null } }
    $probes += [ordered]@{ Label = $label; Result = [ordered]@{ schemaVersion = 1; mode = $mode; phase = $phase; status = 'ok'; hresult = '0x00000000'; bitmapPresent = $true; width = 181; height = 256; cacheFlags = 2; elapsedMs = 10; apartment = 'STA'; requestFlags = $flag; resolvedHandler = $clsid } }
  }
  return [ordered]@{ probes = $probes; context = [ordered]@{ kind = $Kind; inventory = [ordered]@{ files = $files }; environment = $environment; evidenceValid = $true; lifecycleStatus = 'passed' } }
}

function Set-AssessmentFailure($Case, $Suffix, $Hresult = '0x80040154') {
  foreach ($record in @($Case.probes | Where-Object { $_.Label.EndsWith($Suffix) })) {
    $record.Result.status = 'failed'; $record.Result.hresult = $Hresult
    $record.Result.bitmapPresent = $false; $record.Result.width = $null; $record.Result.height = $null
    if ($record.Result.mode -in @('force-extract', 'cache-only')) { $record.Result.phase = 'IThumbnailCache.GetThumbnail' }
  }
}

function Set-AssessmentDocumentFailures($Case) {
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) {
    foreach ($mode in @('shell', 'force-extract')) { Set-AssessmentFailure $Case "$id-$mode" }
  }
}

function Assert-Finding($Case, $Expected) {
  $before = ConvertTo-Json $Case -Depth 20 -Compress
  $result = Get-ThumbnailPhaseAssessment $Case.probes $Case.context 'initial'
  Assert-Assessment ($result.finding -eq $Expected) "finding mismatch: $Expected / $($result.finding)"
  Assert-Assessment ($before -ceq (ConvertTo-Json $Case -Depth 20 -Compress)) 'classification mutated raw evidence'
  $roundTrip = $before | ConvertFrom-Json
  $recomputed = Get-ThumbnailPhaseAssessment $roundTrip.probes $roundTrip.context 'initial'
  Assert-Assessment ((ConvertTo-Json $result -Depth 16 -Compress) -ceq (ConvertTo-Json $recomputed -Depth 16 -Compress)) 'JSON round-trip changed assessment'
  if ($Expected -ne 'thumbnail-api-ok') { Assert-Assessment ($result.thumbnailStatus -ne 'passed') 'failure became product success' }
  if ($Expected -eq 'per-user-shell-activation-failed') { Assert-Assessment ($result.recommendedAction -eq 'consider-msi') 'MSI alternative missing' }
}

function Test-ThumbnailClassification {
  foreach ($uac in @(0, 1)) {
    $case = New-AssessmentCase; Set-AssessmentDocumentFailures $case
    $case.context.environment.environment.enableLUA.value = $uac
    Assert-Finding $case 'per-user-shell-activation-failed'
  }
  $case = New-AssessmentCase; Assert-Finding $case 'thumbnail-api-ok'
  $case = New-AssessmentCase 'msi'; Assert-Finding $case 'thumbnail-api-ok'
  Set-AssessmentDocumentFailures $case; Assert-Finding $case 'unclassified-failure'
  $case = New-AssessmentCase; Set-AssessmentFailure $case 'control-jpg-shell'; Assert-Finding $case 'shell-control-failed'
  $case = New-AssessmentCase; Set-AssessmentFailure $case 'small-hwp-shell'; Assert-Finding $case 'unclassified-failure'
  $case = New-AssessmentCase; Set-AssessmentDocumentFailures $case; Set-AssessmentFailure $case 'activate'; Assert-Finding $case 'unclassified-failure'
  $case = New-AssessmentCase; Set-AssessmentDocumentFailures $case
  $case.context.environment.environment.enableLUA = [ordered]@{ status = 'unreadable'; value = $null }
  Assert-Finding $case 'per-user-shell-activation-failed' # Cache hits do not replace failed Shell/force.
  $case.probes = @($case.probes | Where-Object { $_.Label -ne 'initial-control-jpg-shell' }); Assert-Finding $case 'diagnostic-invalid'
  $case = New-AssessmentCase; $case.probes[0].Result.hresult = 'bad'; Assert-Finding $case 'diagnostic-invalid'
  $case = New-AssessmentCase; $case.context.evidenceValid = $false; Assert-Finding $case 'diagnostic-invalid'
  $case = New-AssessmentCase; $case.context.environment.environment.registrations[0].inproc.worker.sha256 = ('c' * 64); Assert-Finding $case 'registration-mismatch'
  $case = New-AssessmentCase; $case.context.environment.environment.registrations[0].inproc.status = 'unreadable'; Assert-Finding $case 'registration-mismatch'
  $case = New-AssessmentCase; $case.probes[0].Result.resolvedHandler = '{00000000-0000-0000-0000-000000000000}'; Assert-Finding $case 'registration-mismatch'
  $case = New-AssessmentCase; $case.probes[0].Result.phase = 'child-timeout'; Assert-Finding $case 'diagnostic-invalid'
  $case = New-AssessmentCase; ($case.probes | Where-Object { $_.Label -eq 'initial-small-hwp-shell' }).Result.bitmapPresent = $false; Assert-Finding $case 'diagnostic-invalid'
  $case = New-AssessmentCase; $case.probes += $case.probes[0]; Assert-Finding $case 'diagnostic-invalid'
}

function Test-InstallerRebootClassification {
  $before = @('pending-file-renames', 'servicing-reboot', 'update-reboot') | ForEach-Object { [ordered]@{ id = $_; status = 'ok'; present = $false; payload = $null } }
  $markers = @(Compare-InstallerRebootSnapshot $before $before)
  $log = [ordered]@{ status = 'ok'; deferredOperation = $false; restartRequired = $false; msiSystemRebootPending = $false }
  $codes = @{ 0 = 'no-reboot-observed'; 3010 = 'reboot-required'; 1641 = 'reboot-initiated'; 1602 = 'cancelled'; 1603 = 'failed' }
  foreach ($code in $codes.Keys) {
    $r = Get-InstallerRebootAssessment 'msi' $code $markers $log
    Assert-Assessment ($r.status -eq $codes[$code]) 'MSI exit mapping mismatch'
    Assert-Assessment ($r.rollbackEligible -eq ($code -eq 0)) 'unsafe rollback eligibility'
  }
  $r = Get-InstallerRebootAssessment 'nsis' 3010 @() ([ordered]@{ status = 'not-applicable' })
  Assert-Assessment ($r.status -eq 'failed' -and -not $r.rollbackEligible) 'MSI code leaked into NSIS'
  $after = $before | ConvertTo-Json -Depth 8 | ConvertFrom-Json
  $after[0].present = $true; $after[0].payload = @('private-source', 'private-destination')
  $changed = @(Compare-InstallerRebootSnapshot $before $after)
  Assert-Assessment ($changed[0].changed -and -not $changed[0].baselinePresent) 'new marker lost'
  Assert-Assessment ((ConvertTo-Json $changed) -notmatch 'private-|payload') 'registry payload leaked'
  $r = Get-InstallerRebootAssessment 'msi' 0 $changed $log
  Assert-Assessment ($r.status -eq 'reboot-pending' -and -not $r.rollbackEligible) 'pending marker ignored'
  $r = Get-InstallerRebootAssessment 'msi' 0 (Compare-InstallerRebootSnapshot $after $after) $log
  Assert-Assessment ($r.status -eq 'reboot-pending') 'baseline reboot state ignored'
  $after[0].status = 'unreadable'
  $r = Get-InstallerRebootAssessment 'msi' 0 (Compare-InstallerRebootSnapshot $before $after) $log
  Assert-Assessment ($r.status -eq 'unknown' -and -not $r.rollbackEligible) 'unreadable marker accepted'
  $r = Get-InstallerRebootAssessment 'msi' 0 $markers ([ordered]@{ status = 'unreadable' })
  Assert-Assessment ($r.status -eq 'unknown') 'missing MSI log accepted'
  $log.deferredOperation = $true
  $r = Get-InstallerRebootAssessment 'msi' 0 $markers $log
  Assert-Assessment ($r.status -eq 'reboot-pending') 'deferred log operation ignored'
}

function Assert-AssessmentArtifactIdentity($Summary, $Directory) {
  $repo = Join-Path $PSScriptRoot '..'
  $sha = git -C $repo rev-parse HEAD
  Assert-Assessment ($LASTEXITCODE -eq 0 -and $sha -match '^[0-9a-f]{40}$') 'checkout identity missing'
  $storedSha = (Get-Content -LiteralPath (Join-Path $Directory 'checked-out-sha.txt') -Raw -Encoding UTF8).Trim()
  $workflow = Get-Content -LiteralPath (Join-Path $Directory 'workflow-context.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Assessment ($sha -eq $storedSha -and $workflow.requestedBuildRef -eq $sha -and $workflow.workflowSha -eq $sha) 'workflow/source identity mismatch'
  Assert-Assessment ($workflow.installerKind -eq $Summary.InstallerKind -and $workflow.scenario -eq $Summary.Scenario) 'workflow scenario mismatch'
  $inventoryPath = Join-Path $repo 'artifacts\windows-x64\alhangeul-artifact-inventory.json'
  $inventory = Get-Content -LiteralPath $inventoryPath -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Assessment ((ConvertTo-Json $inventory -Depth 16 -Compress) -ceq (ConvertTo-Json $Summary.Artifacts.Inventory -Depth 16 -Compress)) 'artifact inventory mismatch'
}

function Assert-AssessmentReadBack($Summary, $Directory) {
  $OutputDirectory = $Directory
  $result = $Summary.Installers[0]
  [void](Assert-ThumbnailProbeEvidence $result)
  foreach ($pair in @(@('before-install-state', $Summary.EnvironmentBefore), @('after-cleanup-state', $result.EnvironmentAfter))) {
    $stored = Get-Content -LiteralPath (Join-Path $Directory "$($pair[0]).json") -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Assessment ((ConvertTo-Json $stored -Depth 16 -Compress) -ceq (ConvertTo-Json $pair[1] -Depth 16 -Compress)) 'boundary state read-back mismatch'
    [void](Assert-ThumbnailEnvironment $stored)
  }
  Assert-Assessment ($result.Assessments.Count -eq $result.ExpectedPhases.Count) 'phase assessment missing'
  foreach ($phase in $result.ExpectedPhases) {
    $context = [ordered]@{ kind = $result.Kind; inventory = $Summary.Artifacts.Inventory; environment = $result.PhaseEnvironments.PSObject.Properties[$phase].Value; lifecycleStatus = $result.LifecycleStatus; evidenceValid = $true }
    $computed = Get-ThumbnailPhaseAssessment $result.Probes $context $phase
    $recorded = @($result.Assessments | Where-Object { $_.phase -eq $phase })
    Assert-Assessment ($recorded.Count -eq 1) 'duplicate or missing phase assessment'
    Assert-Assessment ((ConvertTo-Json $computed -Depth 16 -Compress) -ceq (ConvertTo-Json $recorded[0] -Depth 16 -Compress)) 'assessment read-back mismatch'
    Assert-Assessment ($computed.evidenceStatus -eq 'valid' -and $computed.finding -in @('thumbnail-api-ok', 'per-user-shell-activation-failed')) 'unclassified evidence accepted'
  }
  $allowed = @('thumbnail-render', 'reboot-required', 'reboot-pending')
  Assert-Assessment (@($result.Failures | Where-Object { $_.Category -notin $allowed }).Count -eq 0) 'unaccepted lifecycle failure'
  Assert-Assessment ($result.RebootEvents.Count -eq 3) 'install/reinstall/uninstall reboot evidence missing'
  $codes = @($result.InstallExitCode, $result.ReinstallExitCode, $result.UninstallExitCode)
  for ($index = 0; $index -lt 3; $index++) { Assert-Assessment ($result.RebootEvents[$index].exitCode -eq $codes[$index]) 'reboot exit code mismatch' }
  $pending = @($result.RebootEvents | Where-Object { $_.status -notin @('no-reboot-observed', 'not-applicable') })
  $lifecycle = if ($pending.Count -gt 0) { $pending[0].status } else { 'passed' }
  Assert-Assessment ($result.LifecycleStatus -eq $lifecycle) 'lifecycle assessment mismatch'
  foreach ($event in $result.RebootEvents) {
    $computed = Get-InstallerRebootAssessment $result.Kind $event.exitCode $event.markers $event.log
    Assert-Assessment ((ConvertTo-Json $computed -Depth 16 -Compress) -ceq (ConvertTo-Json $event -Depth 16 -Compress)) 'reboot assessment mismatch'
    Assert-Assessment ($event.status -in @('no-reboot-observed', 'not-applicable') -or ($event.status -in @('reboot-required', 'reboot-pending') -and $event.observationComplete)) 'unaccepted reboot state'
  }
}

function Assert-ThumbnailDiagnosticSummary($Path) {
  $summary = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Assessment ($summary.SchemaVersion -eq 3 -and $summary.Installers.Count -eq 1) 'summary contract missing'
  Assert-Assessment ($summary.Failures.Count -eq 0 -and $summary.Fixture.Status -eq 'passed') 'global smoke evidence failed'
  Assert-Assessment ((ConvertTo-Json $summary.OriginalDefaults -Depth 12 -Compress) -ceq (ConvertTo-Json $summary.RestoredDefaults -Depth 12 -Compress)) 'defaults not restored'
  $result = $summary.Installers[0]
  Assert-Assessment ($result.DiagnosticContract -is [bool] -and $result.DiagnosticContract) 'diagnostic contract failed'
  Assert-Assessment ($result.Assessments.Count -gt 0 -and $result.ProbeEvidenceCheck -eq $true) 'assessment evidence missing'
  Assert-Assessment ($result.Before.Clean -and $result.After.Clean -and $result.FinalCleanCheck -eq $true) 'product cleanup not verified'
  $directory = Split-Path -Parent ([IO.Path]::GetFullPath($Path))
  Assert-AssessmentArtifactIdentity $summary $directory
  Assert-AssessmentReadBack $summary $directory
  if (@($result.Assessments | Where-Object { $_.thumbnailStatus -ne 'passed' }).Count -gt 0 -or $result.LifecycleStatus -ne 'passed') {
    Assert-Assessment ($result.Status -eq 'failed' -and $summary.Status -eq 'failed') 'diagnostic success masked product failure'
  }
  Write-Output 'Diagnostic contract passed; product outcome remains separately recorded.'
}

if ($SummaryPath) { Assert-ThumbnailDiagnosticSummary $SummaryPath }
else {
  Assert-Assessment ([Environment]::OSVersion.Platform -eq 'Win32NT' -and $PSVersionTable.PSVersion.Major -eq 5) 'Windows PowerShell 5.1 required'
  Test-ThumbnailClassification
  Test-InstallerRebootClassification
  Write-Output 'Thumbnail assessment and installer reboot synthetic regression tests passed.'
}
