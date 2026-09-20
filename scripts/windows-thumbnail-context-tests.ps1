[CmdletBinding()]
param([switch]$CIConsent, [string]$EvidenceDirectory = '')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-files.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-registry.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-evidence.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-cleanup.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-cleanup-tests.ps1')
Assert-Context ($CIConsent -and $env:GITHUB_ACTIONS -ceq 'true' -and $env:RUNNER_ENVIRONMENT -ceq 'github-hosted' -and $env:ALHANGEUL_CONTEXT_EXPERIMENT -ceq 'approved') 'requires-disposable-ci-consent'
Assert-Context ([Environment]::OSVersion.Platform -eq 'Win32NT' -and [Environment]::Is64BitProcess) 'requires-windows-x64'

function Assert-ContextThrows($Action) {
  $threw = $false
  try { & $Action | Out-Null } catch { $threw = $true }
  Assert-Context $threw 'expected-rejection'
}

function Test-ContextStoredEvidence($Directory) {
  $report = Get-Content -LiteralPath (Join-Path $Directory 'experiment.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Context ($report.schemaVersion -eq 1 -and $report.experimentOnly -and $report.productAcceptance -ceq 'not-established') 'invalid-experiment-contract'
  Assert-Context (Test-ContextCleanupDiagnostics $report) 'invalid-cleanup-diagnostics'
  Assert-Context ($report.status -ceq 'observed' -and $report.cleanup -and $report.registryRestored -and $report.associationsRestored -and $report.installExit -eq 0 -and $report.uninstallExit -eq 0) 'experiment-not-complete'
  Assert-Context ($report.sourceSha -ceq $env:GITHUB_SHA -and $report.runId -ceq $env:GITHUB_RUN_ID -and $report.runAttempt -ceq $env:GITHUB_RUN_ATTEMPT) 'experiment-source-mismatch'
  $names = @('c0-initial')
  if ($report.limited.status -eq 'available') { $names += @('c1-limited', 'c0-after-context') }
  elseif ($report.limited.PSObject.Properties.Name -contains 'launchError') { $names += 'c0-after-context' }
  else { Assert-Context ($report.limited.status -ceq 'context-unavailable') 'invalid-limited-status' }
  $names += @('c2-protected-path', 'c3-machine-visible', 'c2-after-machine-restore', 'c0-final')
  Assert-Context (Test-ContextEqual @($report.phases.name) $names) 'missing-phase'
  foreach ($record in $report.phases) {
    $phaseRoot = Join-Path $Directory $record.name
    Assert-Context ($record.evidence -ceq "$($record.name)/phase.json") 'invalid-evidence-path'
    $phase = Get-Content -LiteralPath (Join-Path $phaseRoot 'phase.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-ContextPhaseEvidence $phase $phaseRoot
    Assert-Context ($phase.phase -ceq $record.name -and (Get-ContextFinding $phase) -ceq $record.finding) 'finding-mismatch'
  }
  Assert-Context ($report.phases[0].finding -ceq 'shell-class-not-registered') 'wrong-baseline'
}

function New-ContextTestPhase {
  param([switch]$FailedDocuments)
  $probes = @()
  foreach ($label in (Get-ContextExpectedLabels)) {
    $mode = if ($label -eq 'environment') { 'state' } elseif ($label -eq 'activation') { 'activate' } elseif ($label -like 'association-*') { 'association' } elseif ($label.EndsWith('-cache-only')) { 'cache-only' } elseif ($label.EndsWith('-force-extract')) { 'force-extract' } else { 'shell' }
    $stage = switch ($mode) { 'shell' { 'IShellItemImageFactory.GetImage' }; 'activate' { 'CoCreateInstance.handler' }; 'association' { 'AssocQueryStringW' }; default { 'ISharedBitmap.GetSharedBitmap' } }
    $flag = switch ($mode) { 'shell' { 8 }; 'cache-only' { 1 }; 'force-extract' { 4 }; default { $null } }
    $result = [ordered]@{ schemaVersion = 1; mode = $mode; apartment = 'STA'; elapsedMs = 0; status = 'ok'; hresult = '0x00000000'; bitmapPresent = $true; width = 256; height = 256; phase = $stage; requestFlags = $flag; resolvedHandler = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}' }
    if ($mode -eq 'state') {
      $result.status = 'collected'
      $result['environment'] = @{ token = @{ status = 'ok'; elevated = $true; integrityRid = 12288 }; is64BitProcess = $true; apartment = 'STA'; sessionId = 2 }
    }
    $exitCode = 0
    if ($FailedDocuments -and $label -match '^(small-hwp|large-hwp|form-hwpx)-(shell|force-extract)$') {
      $result.status = 'failed'; $result.hresult = '0x80040154'; $exitCode = 1
      $result.bitmapPresent = $null; $result.width = $null; $result.height = $null
      $result.phase = if ($mode -eq 'shell') { 'IShellItemImageFactory.GetImage' } else { 'IThumbnailCache.GetThumbnail' }
    }
    $probes += [ordered]@{ label = $label; result = $result; exitCode = $exitCode }
  }
  return [ordered]@{ schemaVersion = 1; status = 'observed'; cleanup = $true; integrityChecks = 12; context = @{ status = 'ok'; sameUser = $true; session = 2; elevated = $true; integrityRid = 12288 }; probes = $probes }
}

function Test-ContextFindingContracts {
  $phase = New-ContextTestPhase
  Assert-Context ((Get-ContextFinding $phase) -ceq 'thumbnail-api-ok') 'positive-classification'
  $phase = New-ContextTestPhase -FailedDocuments
  $failed = @($phase.probes | Where-Object { $_.result.status -eq 'failed' })
  Assert-Context ($failed.Count -eq 6) 'failed-fixture-count'
  foreach ($record in $phase.probes) {
    if ($record.result.status -eq 'failed') {
      Assert-Context (Test-ThumbnailProbeContract $record.result "context-$($record.label)") 'invalid-negative-fixture'
      Assert-Context ($record.exitCode -eq 1) 'negative-fixture-exit'
    }
  }
  Assert-Context ((Get-ContextFinding $phase) -ceq 'shell-class-not-registered') 'negative-classification'
  $roundTrip = $phase | ConvertTo-Json -Depth 20 | ConvertFrom-Json
  Assert-Context ((Get-ContextFinding $roundTrip) -ceq 'shell-class-not-registered') 'negative-roundtrip-classification'
  $force = @($phase.probes | Where-Object { $_.label -eq 'small-hwp-force-extract' })[0]
  $force.result.phase = 'ISharedBitmap.GetSharedBitmap'
  Assert-Context ((Get-ContextFinding $phase) -ceq 'mixed-or-unclassified') 'success-phase-not-class-not-registered'
  $force.result.phase = 'IThumbnailCache.GetThumbnail'
  foreach ($dimension in @('width', 'height')) {
    $force.result[$dimension] = 256
    Assert-Context (-not (Test-ThumbnailProbeContract $force.result 'context-small-hwp-force-extract')) 'failed-dimension-rejected'
    $force.result[$dimension] = $null
  }
  Assert-Context ((Get-ContextFinding $phase) -ceq 'shell-class-not-registered') 'negative-fixture-restored'
  $phase.probes[1].result.hresult = '0x80070005'
  Assert-Context ((Get-ContextFinding $phase) -ceq 'mixed-or-unclassified') 'denied-is-not-class-not-registered'
  $phase.probes[4].result.status = 'failed'
  $phase.probes[4].result.hresult = '0x80070005'; $phase.probes[4].exitCode = 1
  $phase.probes[4].result.bitmapPresent = $null; $phase.probes[4].result.width = $null; $phase.probes[4].result.height = $null
  Assert-Context ((Get-ContextFinding $phase) -ceq 'control-failed') 'jpg-failure-preserved'
  $phase.probes = @($phase.probes | Where-Object { $_.label -ne 'activation' })
  Assert-Context ((Get-ContextFinding $phase) -ceq 'invalid') 'missing-probe-preserved'
}

function Test-ContextRawEvidence {
  $root = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-context-test-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($root)
  try {
    # End with the success baseline so every mutation below has its intended control files.
    foreach ($failedDocuments in @($true, $false)) {
      $valid = New-ContextTestPhase -FailedDocuments:$failedDocuments
      foreach ($record in $valid.probes) { Write-ContextJson (Join-Path $root "$($record.label).json") $record.result }
      Assert-ContextPhaseEvidence $valid $root
      $roundTrip = $valid | ConvertTo-Json -Depth 20 | ConvertFrom-Json
      Assert-ContextPhaseEvidence $roundTrip $root
      # The evidence writer is create-only; remove only this case's known temporary files.
      if ($failedDocuments) {
        foreach ($label in (Get-ContextExpectedLabels)) { [IO.File]::Delete((Join-Path $root "$label.json")) }
      }
    }
    foreach ($mutation in @('missing', 'duplicate', 'order', 'context', 'cleanup', 'flags', 'raw', 'exit')) {
      $invalid = New-ContextTestPhase
      switch ($mutation) {
        'missing' { $invalid.probes = @($invalid.probes | Select-Object -Skip 1) }
        'duplicate' { $invalid.probes[1].label = 'environment' }
        'order' { $invalid.probes[0].label = 'other' }
        'context' { $invalid.context.sameUser = $false }
        'cleanup' { $invalid.cleanup = $false }
        'flags' { $invalid.probes[1].result.requestFlags = 0 }
        'raw' { $invalid.probes[1].result.width = 128 }
        'exit' { $invalid.probes[1].exitCode = 1 }
      }
      Assert-ContextThrows { Assert-ContextPhaseEvidence $invalid $root }
    }
  } finally {
    foreach ($label in (Get-ContextExpectedLabels)) { [IO.File]::Delete((Join-Path $root "$label.json")) }
    [IO.Directory]::Delete($root, $false)
  }
}

function Test-ContextProtectedTransactions {
  $directory = $null; $journal = New-ContextJournal
  try {
    $directory = New-ContextProtectedDirectory
    Assert-ContextProtectedDirectory $directory
    Assert-ContextThrows { Assert-ContextProtectedDirectory ([IO.Path]::GetTempPath()) }
    $dll = Join-Path $directory 'AlhangeulThumbnailHandler.dll'
    # Inert bytes, no document association or COM activation occurs in this registry unit test.
    foreach ($name in @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) {
      $file = Join-Path $directory $name
      [IO.File]::WriteAllBytes($file, [byte[]]@(0, 1, 2, 3))
      Set-ContextProtectedFile $file
      Assert-ContextProtectedFile $file
    }
    Add-ContextMachineClass $journal $dll
    Assert-Context ($null -ne (Get-ContextClass 'LocalMachine')) 'machine-write-missing'
    Assert-ContextThrows { Add-ContextMachineClass (New-ContextJournal) $dll }
    Restore-ContextJournal $journal
    Assert-Context ($null -eq (Get-ContextClass 'LocalMachine')) 'machine-restore-missing'
  } finally {
    if (-not $journal.restored) { Restore-ContextJournal $journal }
    if ($directory) {
      foreach ($name in @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) { [IO.File]::Delete((Join-Path $directory $name)) }
      [IO.Directory]::Delete($directory, $false)
    }
  }
}

function Test-ContextRegistryTransactions {
  Assert-Context ($null -eq (Get-ContextClass 'CurrentUser') -and $null -eq (Get-ContextClass 'LocalMachine')) 'test-class-contaminated'
  $outer = New-ContextJournal; $inner = New-ContextJournal
  try {
    Set-ContextValue $outer 'CurrentUser' '' '' 'context-unit-test'
    Set-ContextValue $outer 'CurrentUser' 'InprocServer32' '' 'original-test-value'
    Set-ContextValue $outer 'CurrentUser' 'InprocServer32' 'ThreadingModel' 'Apartment'
    $before = Get-ContextClass 'CurrentUser'
    Assert-ContextThrows { Set-ContextUserPath $inner 'wrong' 'replacement-test-value' }
    Assert-Context ($inner.entries.Count -eq 0) 'precondition-mutated-registry'
    Set-ContextUserPath $inner 'original-test-value' 'replacement-test-value'
    Restore-ContextJournal $inner
    Assert-Context (Test-ContextEqual $before (Get-ContextClass 'CurrentUser')) 'restore-mismatch'
    # Partial operation: the second denied/invalid write must not prevent rollback of the first.
    $inner = New-ContextJournal
    Set-ContextUserPath $inner 'original-test-value' 'partial-test-value'
    Assert-ContextThrows { Set-ContextValue $inner 'ClassesRoot' '' '' 'not-allowed' }
    Restore-ContextJournal $inner
    Assert-Context (Test-ContextEqual $before (Get-ContextClass 'CurrentUser')) 'partial-restore-mismatch'
    # A later writer owns its value. Rollback refuses to overwrite it.
    $inner = New-ContextJournal; $later = New-ContextJournal
    Set-ContextUserPath $inner 'original-test-value' 'first-writer'
    Set-ContextUserPath $later 'first-writer' 'later-writer'
    Assert-ContextThrows { Restore-ContextJournal $inner }
    $base = Open-ContextHive 'CurrentUser'; $key = $base.OpenSubKey("$script:contextClassPath\InprocServer32")
    try { Assert-Context ($key.GetValue('') -ceq 'later-writer') 'later-value-overwritten' }
    finally { $key.Dispose(); $base.Dispose() }
    Restore-ContextJournal $later
    Restore-ContextJournal $inner
  } finally {
    if (-not $inner.restored) { Restore-ContextJournal $inner }
    Restore-ContextJournal $outer
  }
  Assert-Context ($null -eq (Get-ContextClass 'CurrentUser') -and $null -eq (Get-ContextClass 'LocalMachine')) 'test-class-residual'
}

if ($EvidenceDirectory) {
  Test-ContextStoredEvidence ([IO.Path]::GetFullPath($EvidenceDirectory))
} else {
  foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'windows-thumbnail-context-*.ps1')) {
    $tokens = $null; $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
    Assert-Context ($errors.Count -eq 0) 'powershell-parse-failed'
  }
  Add-Type -Path (Join-Path $PSScriptRoot 'windows-thumbnail-context.cs')
  $self = [Alhangeul.ContextExperiment.Native]::Inspect($PID)
  Assert-Context ($self.status -eq 'ok' -and $self.sameUser -and $self.elevated) 'self-context-unreadable'
  Assert-Context ([Alhangeul.ContextExperiment.Native]::Inspect(-1).status -eq 'unreadable') 'invalid-process-must-not-succeed'
  $limited = [Alhangeul.ContextExperiment.Native]::LimitedContext()
  if ($limited.status -eq 'ok') { Assert-Context ($limited.sameUser -and -not $limited.elevated -and $limited.session -eq $self.session -and $limited.integrityRid -eq 8192) 'limited-context-mismatch' }
  Test-ContextFindingContracts
  Test-ContextRawEvidence
  Test-ContextCleanupContracts
  Test-ContextCleanupFailures
  Test-ContextCleanupDiagnosticContract
  Test-ContextCleanupNative
  Test-ContextRegistryTransactions
  Test-ContextProtectedTransactions
}
Write-Output 'Windows thumbnail context contracts passed.'
exit 0
