# CI-only read-only cleanup evidence. Never serialize paths, arbitrary names or exception text.
function Get-ContextCleanupIds {
  $ids = @('local-install', 'machine-install', 'app-process', 'worker-process')
  foreach ($hive in @('CurrentUser', 'LocalMachine')) {
    foreach ($view in @('Registry32', 'Registry64')) {
      foreach ($role in @('class', 'hwp', 'hwpx', 'product', 'uninstall')) { $ids += "$hive-$view-$role" }
    }
  }
  return $ids
}

function ConvertTo-ContextCleanupRow($Id, $Data) {
  $safeId = if ($Id -cin @((Get-ContextCleanupIds) + @('protected-copy', 'request-root', 'shell-host'))) { $Id } else { 'unknown' }
  $row = [ordered]@{ id = $safeId; status = 'unreadable'; errorCode = $null }
  if ($Data.status -cin @('absent', 'present', 'unreadable', 'not-run')) { $row.status = $Data.status }
  foreach ($field in @('errorCode', 'count', 'valueCount', 'subkeyCount', 'knownFiles', 'otherEntries', 'loadedHosts', 'sameUserCount', 'sameSessionCount')) {
    if ($Data.Contains($field) -and ($Data[$field] -is [int] -or $Data[$field] -is [long])) {
      $row[$field] = [long]$Data[$field]
    }
  }
  foreach ($field in @('truncated', 'reparsePoint', 'emptyKey')) {
    if ($Data.Contains($field) -and $Data[$field] -is [bool]) { $row[$field] = $Data[$field] }
  }
  return $row
}

function Get-ContextCleanupFinding($Items) {
  $required = @(Get-ContextCleanupIds)
  if (@($Items | Where-Object { $_.id -cnotin @($required + @('protected-copy', 'request-root', 'shell-host')) }).Count) { return 'cleanup-observation-unreadable' }
  foreach ($id in $required) {
    $matches = @($Items | Where-Object { $_.id -ceq $id })
    if ($matches.Count -ne 1 -or $matches[0].status -cnotin @('present', 'absent')) { return 'cleanup-observation-unreadable' }
  }
  foreach ($row in $Items) {
    if ($row.id -cnotin $required -or $row.status -ceq 'absent') { continue }
    if ($row.id -in @('local-install', 'machine-install')) { return 'existing-install-path' }
    if ($row.id -in @('app-process', 'worker-process')) { return 'existing-product-process' }
    if ($row.id.EndsWith('-uninstall')) { return 'existing-uninstall-entry' }
    return 'existing-product-registry'
  }
  return 'clean'
}

function New-ContextCleanupFailure($Operation, $ErrorRecord) {
  $operations = @('preflight', 'restore-registry', 'uninstall', 'verify-uninstall', 'verify-associations', 'remove-protected-copy', 'remove-requests')
  $codes = @('existing-install-path', 'existing-product-process', 'existing-product-registry', 'existing-uninstall-entry',
    'cleanup-observation-unreadable', 'registry-restore-conflict', 'machine-class-residual', 'partial-install-ownership-unknown',
    'user-class-restore-mismatch', 'association-mutation', 'association-restore-mismatch', 'uninstall-failed', 'owned-process-timeout')
  return [ordered]@{ schemaVersion = 1; operation = $(if ($Operation -cin $operations) { $Operation } else { 'unknown' });
    code = $(if ($ErrorRecord.Exception.Message -cin $codes) { $ErrorRecord.Exception.Message } else { 'unknown' });
    errorCode = $ErrorRecord.Exception.HResult }
}

function Read-ContextCleanupPath($Path) {
  # Only a missing initial lookup is absent; disappearance during enumeration is unreadable.
  try { $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop }
  catch [Management.Automation.ItemNotFoundException] { return @{ status = 'absent' } }
  $reparse = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
  $result = @{ status = 'present'; reparsePoint = $reparse; knownFiles = 0; otherEntries = 0; truncated = $false }
  if ($reparse -or -not $item.PSIsContainer) { return $result }
  Assert-ContextLocalPath $Path
  $known = @('Alhangeul.exe', 'AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe', 'uninstall.exe')
  $seen = 0
  foreach ($entry in [IO.Directory]::EnumerateFileSystemEntries($Path)) {
    if ($seen -ge 256) { $result.truncated = $true; break }
    $seen++
    if ([IO.Path]::GetFileName($entry) -in $known) { $result.knownFiles++ } else { $result.otherEntries++ }
  }
  return $result
}

function Read-ContextCleanupProcess($Name) {
  try { $processes = @(Get-Process -Name $Name -ErrorAction Stop) }
  catch {
    if ($_.FullyQualifiedErrorId -like 'NoProcessFoundForGivenName,*') { return @{ status = 'absent'; count = 0 } }
    throw
  }
  try { return @{ status = $(if ($processes.Count) { 'present' } else { 'absent' }); count = $processes.Count } }
  finally { foreach ($process in $processes) { $process.Dispose() } }
}

function Read-ContextCleanupKey($Target) {
  $base = $null; $key = $null
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]($Target.hive), [Microsoft.Win32.RegistryView]($Target.view))
    $key = $base.OpenSubKey($Target.path)
    if ($null -eq $key) { return @{ status = 'absent' } }
    if ($Target.kind -eq 'uninstall') { return Read-ContextCleanupUninstall $key }
    $values = $key.ValueCount; $children = $key.SubKeyCount
    return @{ status = 'present'; valueCount = $values; subkeyCount = $children; emptyKey = ($values -eq 0 -and $children -eq 0) }
  } finally { if ($null -ne $key) { $key.Dispose() }; if ($null -ne $base) { $base.Dispose() } }
}

function Read-ContextCleanupUninstall($Key) {
  $count = 0
  foreach ($name in $Key.GetSubKeyNames()) {
    $child = $Key.OpenSubKey($name)
    if ($null -eq $child) { throw 'cleanup-observation-unreadable' }
    try { if ($name -ieq 'Alhangeul' -or $child.GetValue('DisplayName') -ieq 'Alhangeul') { $count++ } }
    finally { $child.Dispose() }
  }
  return @{ status = $(if ($count) { 'present' } else { 'absent' }); count = $count }
}

function Get-ContextCleanupTargets {
  $targets = @(
    @{ id = 'local-install'; kind = 'path'; path = (Join-Path $env:LOCALAPPDATA 'Alhangeul') },
    @{ id = 'machine-install'; kind = 'path'; path = (Join-Path $env:ProgramFiles 'Alhangeul') },
    @{ id = 'app-process'; kind = 'process'; path = 'Alhangeul' },
    @{ id = 'worker-process'; kind = 'process'; path = 'AlhangeulThumbnailWorker' }
  )
  $paths = [ordered]@{ class = $script:contextClassPath; hwp = 'Software\Classes\Alhangeul.hwp'; hwpx = 'Software\Classes\Alhangeul.hwpx';
    product = 'Software\Alhangeul'; uninstall = 'Software\Microsoft\Windows\CurrentVersion\Uninstall' }
  foreach ($hive in @('CurrentUser', 'LocalMachine')) {
    foreach ($view in @('Registry32', 'Registry64')) {
      foreach ($role in $paths.Keys) {
        $targets += @{ id = "$hive-$view-$role"; kind = $(if ($role -eq 'uninstall') { 'uninstall' } else { 'key' }); hive = $hive; view = $view; path = $paths[$role] }
      }
    }
  }
  return $targets
}

function Invoke-ContextCleanupRead($Target, $Reader) {
  try { $data = & $Reader $Target; return ConvertTo-ContextCleanupRow $Target.id $data }
  catch { return ConvertTo-ContextCleanupRow $Target.id @{ status = 'unreadable'; errorCode = $_.Exception.HResult } }
}

function Get-ContextCleanupSnapshot {
  $items = @()
  foreach ($target in (Get-ContextCleanupTargets)) {
    $items += Invoke-ContextCleanupRead $target {
      param($entry)
      switch ($entry.kind) {
        'path' { Read-ContextCleanupPath $entry.path }
        'process' { Read-ContextCleanupProcess $entry.path }
        default { Read-ContextCleanupKey $entry }
      }
    }
  }
  return [ordered]@{ schemaVersion = 1; status = 'collected'; finding = (Get-ContextCleanupFinding $items); items = $items }
}

function Read-ContextCleanupHosts {
  $result = @{ status = 'absent'; count = 0; loadedHosts = 0; sameUserCount = 0; sameSessionCount = 0 }
  $self = [Alhangeul.ContextExperiment.Native]::Inspect($PID)
  if ($self.status -ne 'ok') { throw 'cleanup-observation-unreadable' }
  foreach ($name in @('dllhost', 'explorer')) {
    try { $processes = @(Get-Process -Name $name -ErrorAction Stop) }
    catch { if ($_.FullyQualifiedErrorId -like 'NoProcessFoundForGivenName,*') { continue }; throw }
    try {
      foreach ($process in $processes) {
        $result.status = 'present'; $result.count++
        $context = [Alhangeul.ContextExperiment.Native]::Inspect($process.Id)
        if ($context.status -ne 'ok') { throw 'cleanup-observation-unreadable' }
        if ($context.sameUser) { $result.sameUserCount++ }
        if ($context.session -eq $self.session) { $result.sameSessionCount++ }
        $modules = $process.Modules
        if ($null -eq $modules) { throw 'cleanup-observation-unreadable' }
        if (@($modules | Where-Object { $_.ModuleName -ieq 'AlhangeulThumbnailHandler.dll' }).Count) { $result.loadedHosts++ }
      }
    } finally { foreach ($process in $processes) { $process.Dispose() } }
  }
  return $result
}

function Add-ContextCleanupSnapshot($Diagnostics, $Point, $ExtraPaths) {
  # Never overwrite the original exception when collecting supplemental evidence fails.
  try {
    $snapshot = Get-ContextCleanupSnapshot
    foreach ($role in @('protected-copy', 'request-root')) {
      $path = $ExtraPaths[$role]
      $row = if ($path) { Invoke-ContextCleanupRead @{ id = $role; path = $path } { param($entry) Read-ContextCleanupPath $entry.path } }
        else { ConvertTo-ContextCleanupRow $role @{ status = 'not-run' } }
      $snapshot.items += $row
    }
    $snapshot.items += Invoke-ContextCleanupRead @{ id = 'shell-host' } { param($entry) Read-ContextCleanupHosts }
  } catch { $snapshot = [ordered]@{ schemaVersion = 1; status = 'unreadable'; finding = 'cleanup-observation-unreadable'; items = @(); errorCode = $_.Exception.HResult } }
  $Diagnostics.snapshots += [ordered]@{ point = $Point; observation = $snapshot }
}

function Assert-ContextEmptyInstall($Diagnostics = $null, $Point = 'preflight') {
  try { $snapshot = Get-ContextCleanupSnapshot }
  catch { $snapshot = [ordered]@{ schemaVersion = 1; status = 'unreadable'; finding = 'cleanup-observation-unreadable'; items = @(); errorCode = $_.Exception.HResult } }
  if ($null -ne $Diagnostics) { $Diagnostics.snapshots += [ordered]@{ point = $Point; observation = $snapshot } }
  Assert-Context ($snapshot.finding -ceq 'clean') $snapshot.finding
}

function Test-ContextCleanupDiagnostics($Report) {
  try {
    $diagnostics = $Report.cleanupDiagnostics
    if ($diagnostics.schemaVersion -ne 1 -or @($diagnostics.snapshots).Count -eq 0) { return $false }
    $steps = @('restore-registry', 'uninstall', 'verify-uninstall', 'verify-associations', 'remove-protected-copy', 'remove-requests')
    foreach ($step in $steps) {
      $state = $diagnostics.steps.$step
      if ($state -cnotin @('not-run', 'passed', 'failed')) { return $false }
      if ($Report.status -ceq 'observed' -and $state -cne 'passed') { return $false }
    }
    foreach ($snapshot in $diagnostics.snapshots) {
      if ($snapshot.point -cnotin @('preflight', 'before-cleanup', 'after-uninstall-wait', 'cleanup-failed')) { return $false }
      $observation = $snapshot.observation
      if ($observation.schemaVersion -ne 1) { return $false }
      if ($observation.status -ceq 'unreadable') {
        if ($observation.finding -cne 'cleanup-observation-unreadable' -or @($observation.items).Count -ne 0) { return $false }
      } elseif ($observation.status -ceq 'collected') {
        if ((Get-ContextCleanupFinding $observation.items) -cne $observation.finding) { return $false }
      } else { return $false }
    }
    if ($null -ne $Report.cleanupFailure) {
      if ($Report.cleanupFailure.schemaVersion -ne 1 -or $Report.status -cne 'invalid' -or $Report.cleanup -ne $false) { return $false }
      if ($diagnostics.steps.($Report.cleanupFailure.operation) -cne 'failed') { return $false }
    }
    return $true
  } catch { return $false }
}
