# CI-only, never packaged in the user support bundle. Raw values stay in memory.
$script:contextClassPath = 'Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'

function Open-ContextHive($Hive) {
  if ($Hive -notin @('CurrentUser', 'LocalMachine')) { throw 'hive-not-allowed' }
  return [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::$Hive, [Microsoft.Win32.RegistryView]::Registry64)
}

function Read-ContextTree($Key) {
  if ($null -eq $Key) { return $null }
  $values = @(); $children = @()
  foreach ($name in @($Key.GetValueNames() | Sort-Object)) {
    $values += [ordered]@{ name = $name; kind = $Key.GetValueKind($name).ToString(); value = $Key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) }
  }
  foreach ($name in @($Key.GetSubKeyNames() | Sort-Object)) {
    $child = $Key.OpenSubKey($name)
    try { $children += [ordered]@{ name = $name; tree = Read-ContextTree $child } } finally { $child.Dispose() }
  }
  return [ordered]@{ values = $values; children = $children }
}

function Get-ContextClass($Hive) {
  $base = Open-ContextHive $Hive; $key = $null
  try { $key = $base.OpenSubKey($script:contextClassPath); return Read-ContextTree $key }
  finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
}

function Test-ContextEqual($Left, $Right) {
  return (ConvertTo-Json -InputObject $Left -Depth 32 -Compress) -ceq (ConvertTo-Json -InputObject $Right -Depth 32 -Compress)
}

function New-ContextJournal { return [ordered]@{ entries = [Collections.ArrayList]::new(); keys = [Collections.ArrayList]::new(); restored = $false } }

function Set-ContextValue($Journal, $Hive, $Child, $Name, $Value) {
  if ($Child -notin @('', 'InprocServer32') -or $Name -notin @('', 'ThreadingModel') -or ($Name -eq 'ThreadingModel' -and $Child -ne 'InprocServer32')) { throw 'value-not-allowed' }
  $base = Open-ContextHive $Hive; $key = $null
  $path = $script:contextClassPath + $(if ($Child) { "\$Child" } else { '' })
  try {
    $key = $base.OpenSubKey($path, $true)
    if ($null -eq $key) {
      # Caller creates the class before its child; no implicit intermediate owned keys.
      if ($Child) { $parent = $base.OpenSubKey($script:contextClassPath); if ($null -eq $parent) { throw 'missing-parent' }; $parent.Dispose() }
      $key = $base.CreateSubKey($path)
      [void]$Journal.keys.Add([ordered]@{ hive = $Hive; path = $path })
    }
    $exists = $key.GetValueNames() -contains $Name
    $entry = [ordered]@{ hive = $Hive; path = $path; name = $Name; exists = $exists; kind = $null; value = $null; written = $Value }
    if ($exists) { $entry.kind = $key.GetValueKind($Name); $entry.value = $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) }
    # Record BEFORE writing: a thrown write may have partially taken effect.
    [void]$Journal.entries.Add($entry)
    $key.SetValue($Name, $Value, [Microsoft.Win32.RegistryValueKind]::String)
  } finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
}

function Restore-ContextJournal($Journal) {
  $conflict = $false
  for ($i = $Journal.entries.Count - 1; $i -ge 0; $i--) {
    $entry = $Journal.entries[$i]; $base = Open-ContextHive $entry.hive; $key = $null
    try {
      $key = $base.OpenSubKey($entry.path, $true)
      $exists = $null -ne $key -and $key.GetValueNames() -contains $entry.name
      $kind = if ($exists) { $key.GetValueKind($entry.name) } else { $null }
      $value = if ($exists) { $key.GetValue($entry.name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) } else { $null }
      $original = $exists -eq $entry.exists -and (-not $exists -or ($kind -eq $entry.kind -and (Test-ContextEqual $value $entry.value)))
      if ($original) { continue }
      if (-not $exists -or $kind -ne [Microsoft.Win32.RegistryValueKind]::String -or $value -cne $entry.written) { $conflict = $true; continue }
      if ($entry.exists) { $key.SetValue($entry.name, $entry.value, $entry.kind) } else { $key.DeleteValue($entry.name, $false) }
    } catch { $conflict = $true }
    finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
  }
  for ($i = $Journal.keys.Count - 1; $i -ge 0; $i--) {
    $record = $Journal.keys[$i]; $base = Open-ContextHive $record.hive; $key = $null
    try {
      $key = $base.OpenSubKey($record.path)
      if ($null -eq $key) { continue }
      $empty = $key.ValueCount -eq 0 -and $key.SubKeyCount -eq 0
      $key.Dispose(); $key = $null
      if ($empty) { $base.DeleteSubKey($record.path, $false) } else { $conflict = $true }
    } catch { $conflict = $true }
    finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
  }
  $Journal.restored = -not $conflict
  if ($conflict) { throw 'registry-restore-conflict' }
}

function Set-ContextUserPath($Journal, $Expected, $Replacement) {
  $base = Open-ContextHive 'CurrentUser'; $key = $null
  try {
    $key = $base.OpenSubKey("$script:contextClassPath\InprocServer32")
    if ($null -eq $key -or $key.GetValueKind('') -ne [Microsoft.Win32.RegistryValueKind]::String -or $key.GetValue('') -cne $Expected -or $key.GetValue('ThreadingModel') -cne 'Apartment') { throw 'user-registration-mismatch' }
  } finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
  Set-ContextValue $Journal 'CurrentUser' 'InprocServer32' '' $Replacement
}

function Add-ContextMachineClass($Journal, $ProtectedDll) {
  if ($null -ne (Get-ContextClass 'LocalMachine')) { throw 'machine-class-contaminated' }
  Assert-ContextProtectedDirectory ([IO.Path]::GetDirectoryName($ProtectedDll))
  Assert-ContextProtectedFile $ProtectedDll
  Assert-ContextProtectedFile (Join-Path ([IO.Path]::GetDirectoryName($ProtectedDll)) 'AlhangeulThumbnailWorker.exe')
  # Match the product's COM registration: empty class parent, exactly two Inproc values.
  $base = Open-ContextHive 'LocalMachine'; $key = $null
  try {
    $key = $base.CreateSubKey($script:contextClassPath)
    [void]$Journal.keys.Add([ordered]@{ hive = 'LocalMachine'; path = $script:contextClassPath })
  } finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
  Set-ContextValue $Journal 'LocalMachine' 'InprocServer32' '' $ProtectedDll
  Set-ContextValue $Journal 'LocalMachine' 'InprocServer32' 'ThreadingModel' 'Apartment'
}

function Get-ContextAssociations {
  $result = @()
  foreach ($hive in @('CurrentUser', 'LocalMachine')) {
    $base = Open-ContextHive $hive
    try {
      foreach ($path in @('Software\Classes\.hwp', 'Software\Classes\.hwpx', 'Software\Classes\Alhangeul.hwp', 'Software\Classes\Alhangeul.hwpx', 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.hwp', 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.hwpx')) {
        $key = $base.OpenSubKey($path)
        try { $result += [ordered]@{ hive = $hive; path = $path; tree = Read-ContextTree $key } }
        finally { if ($null -ne $key) { $key.Dispose() } }
      }
    } finally { $base.Dispose() }
  }
  return ,$result
}
