function Read-RegistryValue($Location, $Path, $Name) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Location.Hive, $Location.View); $key = $null
  try {
    $key = $base.OpenSubKey($Path)
    $exists = $null -ne $key -and $key.GetValueNames() -contains $Name
    $value = if ($exists) { $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) } else { $null }
    return [ordered]@{ Hive = $Location.HiveName; View = $Location.ViewName; Path = $Path; Name = $Name; Exists = $exists; Value = $value }
  } finally { if ($null -ne $key) { $key.Close() }; $base.Close() }
}
function Get-RegistryValues($Path, $Name) { $values = @(); foreach ($location in $registryLocations) { $values += Read-RegistryValue $location $Path $Name }; return $values }
function Get-DefaultState {
  $state = @()
  foreach ($extension in $extensions) {
    $choices = @()
    foreach ($location in @($registryLocations | Where-Object { $_.HiveName -eq 'HKCU' })) {
      $path = "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\$extension\UserChoice"
      $choices += [ordered]@{ Hive = $location.HiveName; View = $location.ViewName; ProgId = Read-RegistryValue $location $path 'ProgId'; Hash = Read-RegistryValue $location $path 'Hash' }
    }
    $state += [ordered]@{ Extension = $extension; Defaults = @(Get-RegistryValues "Software\Classes\$extension" ''); UserChoice = $choices }
  }
  return $state
}
function Set-AssociationDefaultValues($ProgIds) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64)
  try {
    $classes = $base.CreateSubKey('Software\Classes')
    for ($index = 0; $index -lt $extensions.Count; $index += 1) {
      $key = $classes.CreateSubKey($extensions[$index]); $key.SetValue('', $ProgIds[$index], [Microsoft.Win32.RegistryValueKind]::String); $key.Close()
    }
    $classes.Close()
  } finally { $base.Close() }
}
function Assert-NoCanonicalDefaults($State) {
  for ($index = 0; $index -lt $extensions.Count; $index += 1) {
    $dangling = @($State[$index].Defaults | Where-Object { $_.Exists -and $_.Value -eq $canonicalProgIds[$index] })
    Assert-Condition ($dangling.Count -eq 0) "$($extensions[$index]) 기본값에 제거된 Alhangeul ProgID가 남았습니다."
  }
  return $true
}
function Set-AssociationSentinels {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64); $script:sentinels = @()
  try {
    $classes = $base.CreateSubKey('Software\Classes')
    foreach ($extension in $extensions) {
      $key = $classes.OpenSubKey($extension, $true)
      $keyExisted = $null -ne $key
      if (-not $keyExisted) { $key = $classes.CreateSubKey($extension) }
      $valueExisted = $key.GetValueNames() -contains ''
      $script:sentinels += [ordered]@{ Extension = $extension; KeyExisted = $keyExisted; ValueExisted = $valueExisted; Value = $key.GetValue('') }
      $key.Close()
    }
    $classes.Close()
  } finally { $base.Close() }
  Set-AssociationDefaultValues $associationSentinelProgIds
  return $script:sentinels
}
function Restore-AssociationSentinels($Records) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64); try {
    $classes = $base.OpenSubKey('Software\Classes', $true)
    foreach ($record in $Records) {
      $key = $classes.OpenSubKey($record.Extension, $true)
      if ($null -eq $key -and $record.KeyExisted) { $key = $classes.CreateSubKey($record.Extension) }
      if ($null -eq $key) { continue }
      if ($record.ValueExisted) { $key.SetValue('', $record.Value) } else { $key.DeleteValue('', $false) }
      $empty = $key.SubKeyCount -eq 0 -and $key.ValueCount -eq 0
      $key.Close()
      if (-not $record.KeyExisted -and $empty) { $classes.DeleteSubKey($record.Extension, $false) }
    }
    $classes.Close()
  } finally { $base.Close() }
}
function Get-UninstallEntries {
  $entries = @()
  foreach ($location in $registryLocations) {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($location.Hive, $location.View)
    $root = $base.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall')
    if ($null -ne $root) {
      foreach ($name in $root.GetSubKeyNames()) {
        $key = $root.OpenSubKey($name); $displayName = $key.GetValue('DisplayName')
        if ($displayName -eq 'Alhangeul' -or $name -eq 'Alhangeul') {
          $entries += [ordered]@{ Hive = $location.HiveName; View = $location.ViewName; KeyName = $name; DisplayName = $displayName; DisplayVersion = $key.GetValue('DisplayVersion'); Publisher = $key.GetValue('Publisher'); InstallLocation = $key.GetValue('InstallLocation'); UninstallString = $key.GetValue('UninstallString'); MainBinaryName = $key.GetValue('MainBinaryName') }
        }
        $key.Close()
      }
      $root.Close()
    }
    $base.Close()
  }
  return $entries
}
function Get-HandlerState($Extension, $ProgId, $Executable) {
  $classes = @(Get-RegistryValues "Software\Classes\$ProgId" ''); $commands = @(Get-RegistryValues "Software\Classes\$ProgId\shell\open\command" ''); $openWith = @(Get-RegistryValues "Software\Classes\$Extension\OpenWithProgids" $ProgId)
  $validCommand = @($commands | Where-Object { $_.Exists -and $_.Value -is [string] -and $_.Value.IndexOf($Executable, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.Value.Contains('"%1"') }).Count -gt 0
  return [ordered]@{ Extension = $Extension; ProgId = $ProgId; Classes = $classes; Commands = $commands; OpenWith = $openWith; Valid = @($classes | Where-Object { $_.Exists }).Count -gt 0 -and $validCommand -and @($openWith | Where-Object { $_.Exists }).Count -gt 0 }
}
function Get-ShortcutState($Kind, $Executable) {
  $desktopFolder = if ($Kind -eq 'msi') { [Environment]::GetFolderPath('CommonDesktopDirectory') } else { [Environment]::GetFolderPath('DesktopDirectory') }; $programsFolder = if ($Kind -eq 'msi') { [Environment]::GetFolderPath('CommonPrograms') } else { [Environment]::GetFolderPath('Programs') }
  $paths = @((Join-Path $desktopFolder 'Alhangeul.lnk'), (Join-Path $programsFolder 'Alhangeul\Alhangeul.lnk')); $items = @(); $shell = New-Object -ComObject WScript.Shell
  foreach ($path in $paths) { $exists = Test-Path -LiteralPath $path -PathType Leaf; $target = if ($exists) { $shell.CreateShortcut($path).TargetPath } else { $null }; $items += [ordered]@{ Path = $path; Exists = $exists; Target = $target } }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell); $valid = @($items | Where-Object { $_.Exists -and (Test-SamePath $_.Target $Executable) }).Count -eq 2
  return [ordered]@{ Items = $items; Valid = $valid }
}
function ConvertTo-NormalizedPath($Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  $path = [IO.Path]::GetFullPath(([string]$Value).Trim().Trim('"'))
  if (Test-Path -LiteralPath $path) { $path = (Get-Item -LiteralPath $path -Force).FullName }
  return $path.TrimEnd('\')
}
function Test-SamePath($Left, $Right) { $leftPath = ConvertTo-NormalizedPath $Left; $rightPath = ConvertTo-NormalizedPath $Right; return $null -ne $leftPath -and $null -ne $rightPath -and $leftPath -ieq $rightPath }
function Get-VersionState($Executable) { $version = (Get-Item -LiteralPath $Executable).VersionInfo; return [ordered]@{ ProductVersion = $version.ProductVersion; FileVersion = $version.FileVersion } }
function ConvertTo-NormalizedVersion($Value) {
  $match = [regex]::Match($Value, '^\s*(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?\s*$')
  Assert-Condition $match.Success "version 형식이 올바르지 않습니다: $Value"
  Assert-Condition (-not $match.Groups[4].Success -or $match.Groups[4].Value -eq '0') "version 네 번째 성분은 0이어야 합니다: $Value"; return "$($match.Groups[1].Value).$($match.Groups[2].Value).$($match.Groups[3].Value)"
}
function Write-MsiFailureContext($LogPath) {
  if (-not (Test-Path -LiteralPath $LogPath -PathType Leaf)) { return $null }
  $lines = @(Get-Content -LiteralPath $LogPath); if ($lines.Count -eq 0) { return $null }
  $indexes = @(0..($lines.Count - 1) | Where-Object { $lines[$_] -match 'Return value 3' }); $context = @()
  foreach ($index in $indexes) { $start = [Math]::Max(0, $index - 8); $end = [Math]::Min($lines.Count - 1, $index + 8); $context += $lines[$start..$end] }
  $path = "$LogPath.return-value-3.txt"; Set-Content -LiteralPath $path -Value $context -Encoding UTF8; return $path
}
function Add-Failure($Result, $Category, $Message) { $Result.Failures += [ordered]@{ Category = $Category; Message = $Message } }
function Invoke-Check($Result, $Category, $Name, $Action) { try { $Result[$Name] = & $Action } catch { Add-Failure $Result $Category $_.Exception.Message; $Result[$Name] = [ordered]@{ Passed = $false; Message = $_.Exception.Message } } }
