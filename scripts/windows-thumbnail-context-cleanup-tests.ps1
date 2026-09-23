# Function definitions only. Native tests are called exclusively by the CIConsent entry.
function New-ContextCleanupTestItems {
  return @((Get-ContextCleanupIds) | ForEach-Object { ConvertTo-ContextCleanupRow $_ @{ status = 'absent' } })
}

function Test-ContextCleanupContracts {
  $items = @(New-ContextCleanupTestItems)
  Assert-Context ($items.Count -eq 24 -and (Get-ContextCleanupFinding $items) -ceq 'clean') 'cleanup-all-absent'
  foreach ($id in (Get-ContextCleanupIds)) {
    $items = @(New-ContextCleanupTestItems)
    $row = @($items | Where-Object { $_.id -ceq $id })[0]
    $row.status = 'present'
    Assert-Context ((Get-ContextCleanupFinding $items) -cne 'clean') 'cleanup-residual-must-fail'
    $row.status = 'unreadable'
    Assert-Context ((Get-ContextCleanupFinding $items) -ceq 'cleanup-observation-unreadable') 'cleanup-unreadable-must-fail'
    $row.status = 'not-run'
    Assert-Context ((Get-ContextCleanupFinding $items) -ceq 'cleanup-observation-unreadable') 'cleanup-not-run-must-fail'
  }
  $items = @(New-ContextCleanupTestItems)
  $items[4] = ConvertTo-ContextCleanupRow $items[4].id @{ status = 'present'; emptyKey = $true; valueCount = 0; subkeyCount = 0 }
  Assert-Context ((Get-ContextCleanupFinding $items) -ceq 'existing-product-registry') 'empty-key-is-still-present'
  $items[0].status = 'present'
  Assert-Context ((Get-ContextCleanupFinding $items) -ceq 'existing-install-path') 'multiple-residuals-preserved'
  $roundTrip = $items | ConvertTo-Json -Depth 10 | ConvertFrom-Json
  Assert-Context ((Get-ContextCleanupFinding $roundTrip) -ceq 'existing-install-path') 'cleanup-json-roundtrip'
  Assert-Context ((Get-ContextCleanupFinding @()) -ceq 'cleanup-observation-unreadable') 'missing-cleanup-evidence'
  $items = @(New-ContextCleanupTestItems)
  Assert-Context ((Get-ContextCleanupFinding @($items + $items[0])) -ceq 'cleanup-observation-unreadable') 'duplicate-cleanup-evidence'
  $safe = ConvertTo-ContextCleanupRow 'private-path-sentinel' @{ status = 'present'; path = 'private-path-sentinel'; message = 'private-path-sentinel'; count = 'private-path-sentinel' }
  Assert-Context (($safe | ConvertTo-Json -Compress) -notmatch 'private-path-sentinel') 'cleanup-privacy'
  Assert-Context ((Get-ContextCleanupFinding @($items + $safe)) -ceq 'cleanup-observation-unreadable') 'unknown-target-rejected'
}

function Test-ContextCleanupFailures {
  foreach ($message in @('existing-product-registry', 'private-exception-sentinel')) {
    try { throw $message } catch { $failure = New-ContextCleanupFailure 'verify-uninstall' $_ }
    $expected = if ($message -eq 'existing-product-registry') { $message } else { 'unknown' }
    Assert-Context ($failure.schemaVersion -eq 1 -and $failure.code -ceq $expected -and $failure.operation -ceq 'verify-uninstall') 'cleanup-error-allowlist'
    Assert-Context (($failure | ConvertTo-Json) -notmatch 'private-exception-sentinel') 'cleanup-exception-privacy'
  }
  $row = Invoke-ContextCleanupRead @{ id = 'local-install' } { param($entry) throw [UnauthorizedAccessException]::new('private-error') }
  Assert-Context ($row.status -ceq 'unreadable' -and $null -ne $row.errorCode) 'denied-is-not-absent'
  $vanished = Invoke-ContextCleanupRead @{ id = 'local-install' } { param($entry) throw [IO.DirectoryNotFoundException]::new('vanished-after-lookup') }
  Assert-Context ($vanished.status -ceq 'unreadable') 'disappeared-is-not-absent'
  # Locally scoped injection: no registry/native reader can execute in this fast test.
  function Get-ContextCleanupSnapshot { throw 'private-snapshot-sentinel' }
  $diagnostics = @{ snapshots = @() }
  $original = $failure | ConvertTo-Json -Compress
  Add-ContextCleanupSnapshot $diagnostics 'cleanup-failed' @{}
  Assert-Context (($failure | ConvertTo-Json -Compress) -ceq $original) 'snapshot-preserves-first-failure'
  Assert-Context ($diagnostics.snapshots[0].observation.status -ceq 'unreadable') 'snapshot-failure-recorded'
  Assert-Context (($diagnostics | ConvertTo-Json -Depth 10) -notmatch 'private-snapshot-sentinel') 'snapshot-privacy'
}

function Test-ContextCleanupNative {
  $root = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-cleanup-test-' + [Guid]::NewGuid().ToString('N'))
  $keyPath = 'Software\AlhangeulContextCleanupTest-' + [Guid]::NewGuid().ToString('N')
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64)
  $key = $null; $createdDirectory = $false
  try {
    Assert-Context ((Read-ContextCleanupPath $root).status -ceq 'absent') 'cleanup-path-absent'
    [void][IO.Directory]::CreateDirectory($root)
    $createdDirectory = $true
    [IO.File]::WriteAllBytes((Join-Path $root 'Alhangeul.exe'), [byte[]]@(0))
    [IO.File]::WriteAllBytes((Join-Path $root 'private-file-sentinel'), [byte[]]@(0))
    $row = Read-ContextCleanupPath $root
    Assert-Context ($row.status -ceq 'present' -and $row.knownFiles -eq 1 -and $row.otherEntries -eq 1) 'cleanup-path-counts'
    Assert-Context (($row | ConvertTo-Json) -notmatch 'private-file-sentinel') 'cleanup-path-privacy'
    $target = @{ hive = 'CurrentUser'; view = 'Registry64'; path = $keyPath; kind = 'key' }
    Assert-Context ((Read-ContextCleanupKey $target).status -ceq 'absent') 'cleanup-key-absent'
    $key = $base.CreateSubKey($keyPath)
    $row = Read-ContextCleanupKey $target
    Assert-Context ($row.status -ceq 'present' -and $row.emptyKey) 'cleanup-empty-key'
    $key.SetValue('private-value-sentinel', 'private-data-sentinel')
    $row = Read-ContextCleanupKey $target
    Assert-Context ($row.valueCount -eq 1 -and -not $row.emptyKey) 'cleanup-key-count'
    Assert-Context (($row | ConvertTo-Json) -notmatch 'private-') 'cleanup-key-privacy'
    Test-ContextCleanupFailures
  } finally {
    if ($null -ne $key) { $key.DeleteValue('private-value-sentinel', $false); $key.Dispose(); $base.DeleteSubKey($keyPath, $false) }
    $base.Dispose()
    if ($createdDirectory) {
      foreach ($name in @('Alhangeul.exe', 'private-file-sentinel')) { [IO.File]::Delete((Join-Path $root $name)) }
      [IO.Directory]::Delete($root, $false)
    }
  }
}

function Test-ContextCleanupDiagnosticContract {
  $report = @{ status = 'invalid'; cleanup = $false; cleanupFailure = $null; cleanupDiagnostics = @{
    schemaVersion = 1; steps = @{}; snapshots = @(@{ point = 'preflight'; observation = @{
      schemaVersion = 1; status = 'collected'; finding = 'clean'; items = @(New-ContextCleanupTestItems)
    } })
  } }
  foreach ($step in @('restore-registry', 'uninstall', 'verify-uninstall', 'verify-associations', 'remove-protected-copy', 'remove-requests')) {
    $report.cleanupDiagnostics.steps[$step] = 'not-run'
  }
  Assert-Context (Test-ContextCleanupDiagnostics $report) 'cleanup-not-run-contract'
  $report.status = 'observed'
  Assert-Context (-not (Test-ContextCleanupDiagnostics $report)) 'not-run-cannot-be-observed'
  $report.status = 'invalid'
  try { throw 'existing-product-registry' } catch { $report.cleanupFailure = New-ContextCleanupFailure 'verify-uninstall' $_ }
  $report.cleanupDiagnostics.steps['verify-uninstall'] = 'failed'
  $roundTrip = $report | ConvertTo-Json -Depth 16 | ConvertFrom-Json
  Assert-Context (Test-ContextCleanupDiagnostics $roundTrip) 'cleanup-failed-contract-roundtrip'
  $roundTrip.cleanupDiagnostics.steps.'verify-uninstall' = 'passed'
  Assert-Context (-not (Test-ContextCleanupDiagnostics $roundTrip)) 'cleanup-failure-cannot-be-passed'
  $report.cleanupDiagnostics.snapshots[0].observation.items[0].status = 'present'
  Assert-Context (-not (Test-ContextCleanupDiagnostics $report)) 'cleanup-finding-must-match-raw'
}
