[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ArtifactRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$registryLocations = @(
  [ordered]@{ Hive = [Microsoft.Win32.RegistryHive]::LocalMachine; HiveName = 'HKLM'; View = [Microsoft.Win32.RegistryView]::Registry64; ViewName = 'Registry64' },
  [ordered]@{ Hive = [Microsoft.Win32.RegistryHive]::LocalMachine; HiveName = 'HKLM'; View = [Microsoft.Win32.RegistryView]::Registry32; ViewName = 'Registry32' },
  [ordered]@{ Hive = [Microsoft.Win32.RegistryHive]::CurrentUser; HiveName = 'HKCU'; View = [Microsoft.Win32.RegistryView]::Registry64; ViewName = 'Registry64' },
  [ordered]@{ Hive = [Microsoft.Win32.RegistryHive]::CurrentUser; HiveName = 'HKCU'; View = [Microsoft.Win32.RegistryView]::Registry32; ViewName = 'Registry32' }
)
$extensions = @('.hwp', '.hwpx')
$canonicalProgIds = @('Alhangeul.hwp', 'Alhangeul.hwpx')
$legacyProgIds = @('HWP Document', 'HWPX Document')
$msiInstallDirectory = Join-Path $env:ProgramFiles 'Alhangeul'
$nsisInstallDirectory = Join-Path $env:LOCALAPPDATA 'Alhangeul'
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Assert-InventoryRecord($Kind, $File, $Inventory, $Root) {
  $records = @($Inventory.files | Where-Object { $_.kind -eq $Kind })
  Assert-Condition ($records.Count -eq 1) "inventory에 $Kind record가 정확히 하나여야 합니다."
  $recordPath = Join-Path $Root ($records[0].path -replace '/', [IO.Path]::DirectorySeparatorChar)
  Assert-Condition ([IO.Path]::GetFullPath($recordPath) -eq $File.FullName) "$Kind inventory 경로가 bundle과 다릅니다."
  $actualHash = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  Assert-Condition ($actualHash -eq $records[0].sha256) "$Kind SHA-256이 inventory와 다릅니다."
}
function Resolve-BundleArtifacts($Root) {
  $rootItem = Get-Item -LiteralPath $Root
  Assert-Condition $rootItem.PSIsContainer 'ArtifactRoot는 디렉터리여야 합니다.'
  $files = @(Get-ChildItem -LiteralPath $rootItem.FullName -Recurse -File)
  $inventories = @($files | Where-Object { $_.Name -ceq 'alhangeul-artifact-inventory.json' })
  $msiFiles = @($files | Where-Object { $_.Extension -ieq '.msi' })
  $nsisFiles = @($files | Where-Object { $_.Extension -ieq '.exe' -and $_.Directory.Name -ieq 'nsis' })
  Assert-Condition ($inventories.Count -eq 1) 'artifact inventory가 정확히 하나여야 합니다.'
  Assert-Condition ($msiFiles.Count -eq 1) 'MSI bundle이 정확히 하나여야 합니다.'
  Assert-Condition ($nsisFiles.Count -eq 1) 'NSIS bundle이 정확히 하나여야 합니다.'
  Assert-Condition ($msiFiles[0].Directory.Name -ieq 'msi') 'MSI는 msi 디렉터리에 있어야 합니다.'
  Assert-Condition ($files.Count -eq 3) 'inventory, MSI, NSIS 외 파일을 허용하지 않습니다.'
  $inventory = Get-Content -LiteralPath $inventories[0].FullName -Raw | ConvertFrom-Json
  Assert-Condition ($inventory.platform -eq 'windows-x64') 'windows-x64 inventory가 필요합니다.'
  Assert-InventoryRecord 'msi' $msiFiles[0] $inventory $rootItem.FullName
  Assert-InventoryRecord 'nsis' $nsisFiles[0] $inventory $rootItem.FullName
  return [ordered]@{ Msi = $msiFiles[0].FullName; Nsis = $nsisFiles[0].FullName }
}
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
function Set-AssociationSentinels {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64); $records = @()
  try {
    $classes = $base.CreateSubKey('Software\Classes')
    foreach ($extension in $extensions) {
      $key = $classes.OpenSubKey($extension, $true)
      $keyExisted = $null -ne $key
      if (-not $keyExisted) { $key = $classes.CreateSubKey($extension) }
      $valueExisted = $key.GetValueNames() -contains ''
      $records += [ordered]@{ Extension = $extension; KeyExisted = $keyExisted; ValueExisted = $valueExisted; Value = $key.GetValue('') }
      $key.SetValue('', "AlhangeulSmoke.Existing$extension", [Microsoft.Win32.RegistryValueKind]::String)
      $key.Close()
    }
    $classes.Close()
  } finally { $base.Close() }
  return $records
}
function Restore-AssociationSentinels($Records) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64); try {
    $classes = $base.OpenSubKey('Software\Classes', $true)
    foreach ($record in $Records) {
      $key = $classes.OpenSubKey($record.Extension, $true)
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
        $key = $root.OpenSubKey($name)
        $displayName = $key.GetValue('DisplayName')
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
  $validCommand = @($commands | Where-Object {
    $_.Exists -and $_.Value -is [string] -and
    $_.Value.IndexOf($Executable, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.Value.Contains('"%1"')
  }).Count -gt 0
  return [ordered]@{ Extension = $Extension; ProgId = $ProgId; Classes = $classes; Commands = $commands; OpenWith = $openWith; Valid = @($classes | Where-Object { $_.Exists }).Count -gt 0 -and $validCommand -and @($openWith | Where-Object { $_.Exists }).Count -gt 0 }
}
function Get-ShortcutState($Kind, $Executable) {
  $desktopFolder = if ($Kind -eq 'msi') { [Environment]::GetFolderPath('CommonDesktopDirectory') } else { [Environment]::GetFolderPath('DesktopDirectory') }; $programsFolder = if ($Kind -eq 'msi') { [Environment]::GetFolderPath('CommonPrograms') } else { [Environment]::GetFolderPath('Programs') }
  $paths = @((Join-Path $desktopFolder 'Alhangeul.lnk'), (Join-Path $programsFolder 'Alhangeul\Alhangeul.lnk'))
  $items = @()
  $shell = New-Object -ComObject WScript.Shell
  foreach ($path in $paths) {
    $exists = Test-Path -LiteralPath $path -PathType Leaf
    $target = if ($exists) { $shell.CreateShortcut($path).TargetPath } else { $null }
    $items += [ordered]@{ Path = $path; Exists = $exists; Target = $target }
  }
  $valid = @($items | Where-Object { $_.Exists -and (Test-SamePath $_.Target $Executable) }).Count -eq 2
  return [ordered]@{ Items = $items; Valid = $valid }
}
function ConvertTo-NormalizedPath($Value) { if ([string]::IsNullOrWhiteSpace($Value)) { return $null }; return [IO.Path]::GetFullPath(([string]$Value).Trim().Trim('"')).TrimEnd('\') }
function Test-SamePath($Left, $Right) { $leftPath = ConvertTo-NormalizedPath $Left; $rightPath = ConvertTo-NormalizedPath $Right; return $null -ne $leftPath -and $null -ne $rightPath -and $leftPath -ieq $rightPath }
function Get-VersionState($Executable) { $version = (Get-Item -LiteralPath $Executable).VersionInfo; return [ordered]@{ ProductVersion = $version.ProductVersion; FileVersion = $version.FileVersion } }
function Normalize-Version($Value) {
  $match = [regex]::Match($Value, '^\s*(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?\s*$')
  Assert-Condition $match.Success "version 형식이 올바르지 않습니다: $Value"
  Assert-Condition (-not $match.Groups[4].Success -or $match.Groups[4].Value -eq '0') "version 네 번째 성분은 0이어야 합니다: $Value"; return "$($match.Groups[1].Value).$($match.Groups[2].Value).$($match.Groups[3].Value)"
}
function Get-ProductState($Kind, $InstallDirectory) {
  $executable = Join-Path $InstallDirectory 'Alhangeul.exe'
  $entries = @(Get-UninstallEntries)
  $entry = @($entries | Where-Object { ($Kind -eq 'msi' -and $_.Hive -eq 'HKLM' -and $_.View -eq 'Registry64') -or ($Kind -eq 'nsis' -and $_.Hive -eq 'HKCU') }) | Select-Object -First 1
  $handlers = @()
  for ($index = 0; $index -lt $extensions.Count; $index += 1) { $handlers += Get-HandlerState $extensions[$index] $canonicalProgIds[$index] $executable }
  return [ordered]@{ InstallDirectory = $InstallDirectory; Executable = $executable; Entry = $entry; Version = if (Test-Path -LiteralPath $executable -PathType Leaf) { Get-VersionState $executable } else { $null }; Handlers = $handlers; Shortcuts = Get-ShortcutState $Kind $executable }
}
function Get-CleanState {
  $ownedKeys = @()
  foreach ($progId in @($canonicalProgIds + $legacyProgIds)) { $ownedKeys += Get-RegistryValues "Software\Classes\$ProgId" '' }
  $ownedOpenWith = @()
  for ($index = 0; $index -lt $extensions.Count; $index += 1) { $ownedOpenWith += Get-RegistryValues "Software\Classes\$($extensions[$index])\OpenWithProgids" $canonicalProgIds[$index] }
  $shortcutPaths = @((Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('CommonPrograms')) 'Alhangeul\Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'Alhangeul\Alhangeul.lnk'))
  $processes = @(Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue)
  $candidatePaths = @($msiInstallDirectory, $nsisInstallDirectory) + $shortcutPaths
  $residualPaths = @($candidatePaths | Where-Object { Test-Path -LiteralPath $_ })
  $entries = @(Get-UninstallEntries)
  $registryCount = @($ownedKeys + $ownedOpenWith | Where-Object { $_.Exists }).Count
  return [ordered]@{ Clean = $processes.Count -eq 0 -and $residualPaths.Count -eq 0 -and $entries.Count -eq 0 -and $registryCount -eq 0; Processes = @($processes | ForEach-Object { $_.Id }); Paths = @($residualPaths); Entries = $entries; OwnedRegistryCount = $registryCount }
}
function Assert-InstalledRegistry($State, $Kind) {
  Assert-Condition (Test-Path -LiteralPath $State.Executable -PathType Leaf) 'Alhangeul.exe가 없습니다.'
  Assert-Condition ($null -ne $State.Entry) 'uninstall entry가 없습니다.'
  Assert-Condition ($State.Entry.DisplayName -eq 'Alhangeul') 'DisplayName이 다릅니다.'
  Assert-Condition ($State.Entry.Publisher -eq 'postmelee') 'Publisher가 다릅니다.'
  Assert-Condition ($State.Entry.DisplayVersion -eq $ExpectedVersion) 'DisplayVersion이 다릅니다.'
  Assert-Condition (Test-SamePath $State.Entry.InstallLocation $State.InstallDirectory) 'InstallLocation이 다릅니다.'
  if ($Kind -eq 'nsis') { Assert-Condition ($State.Entry.MainBinaryName -eq 'Alhangeul.exe') 'MainBinaryName이 다릅니다.' }; return $true
}
function Assert-InstalledVersion($State) {
  Assert-Condition ($null -ne $State.Version) 'version resource를 읽을 수 없습니다.'; Assert-Condition ((Normalize-Version $State.Version.ProductVersion) -eq $ExpectedVersion) 'ProductVersion이 다릅니다.'; Assert-Condition ((Normalize-Version $State.Version.FileVersion) -eq $ExpectedVersion) 'FileVersion이 다릅니다.'; return $true
}
function Assert-InstalledHandlers($State) { Assert-Condition (@($State.Handlers | Where-Object { -not $_.Valid }).Count -eq 0) 'canonical ProgID 또는 OpenWithProgids가 없습니다.'; return $true }
function Invoke-Installer($Kind, $Path, $LogPath) {
  $arguments = if ($Kind -eq 'msi') { @('/i', "`"$Path`"", '/qn', '/norestart', '/L*v', "`"$LogPath`"") } else { @('/S') }
  $filePath = if ($Kind -eq 'msi') { 'msiexec.exe' } else { $Path }
  return (Start-Process -FilePath $filePath -ArgumentList $arguments -Wait -PassThru).ExitCode
}
function Invoke-Uninstaller($Kind, $State, $LogPath) {
  if ($Kind -eq 'msi') {
    Assert-Condition ($null -ne $State.Entry) 'MSI ProductCode를 찾을 수 없습니다.'
    $arguments = @('/x', $State.Entry.KeyName, '/qn', '/norestart', '/L*v', "`"$LogPath`"")
    return (Start-Process -FilePath 'msiexec.exe' -ArgumentList $arguments -Wait -PassThru).ExitCode
  }
  $path = if ($null -ne $State.Entry -and $State.Entry.UninstallString) { $State.Entry.UninstallString.Trim().Trim('"') } else { Join-Path $State.InstallDirectory 'uninstall.exe' }
  Assert-Condition (Test-Path -LiteralPath $path -PathType Leaf) 'NSIS uninstaller를 찾을 수 없습니다.'
  return (Start-Process -FilePath $path -ArgumentList @('/S') -Wait -PassThru).ExitCode
}
function Invoke-Launch($Executable) {
  $process = Start-Process -FilePath $Executable -PassThru
  try {
    Start-Sleep -Seconds 5
    $process.Refresh()
    Assert-Condition (-not $process.HasExited) 'Alhangeul process가 5초 전에 종료되었습니다.'
    return [ordered]@{ Pid = $process.Id; SurvivedSeconds = 5 }
  } finally {
    $process.Refresh()
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force; Wait-Process -Id $process.Id -ErrorAction SilentlyContinue }
  }
}
function Write-MsiFailureContext($LogPath) {
  if (-not (Test-Path -LiteralPath $LogPath -PathType Leaf)) { return $null }
  $lines = @(Get-Content -LiteralPath $LogPath)
  $indexes = @(0..($lines.Count - 1) | Where-Object { $lines[$_] -match 'Return value 3' })
  $context = @()
  foreach ($index in $indexes) {
    $start = [Math]::Max(0, $index - 8); $end = [Math]::Min($lines.Count - 1, $index + 8)
    $context += $lines[$start..$end]
  }
  $path = "$LogPath.return-value-3.txt"
  Set-Content -LiteralPath $path -Value $context -Encoding UTF8
  return $path
}
function Add-Failure($Result, $Category, $Message) { $Result.Failures += [ordered]@{ Category = $Category; Message = $Message } }
function Invoke-Check($Result, $Category, $Name, $Action) { try { $Result[$Name] = & $Action } catch { Add-Failure $Result $Category $_.Exception.Message; $Result[$Name] = [ordered]@{ Passed = $false; Message = $_.Exception.Message } } }
function Invoke-BundleSmoke($Kind, $Path, $InstallDirectory, $BaselineDefaults) {
  $result = [ordered]@{ Kind = $Kind; Path = $Path; Status = 'failed'; Failures = @() }
  $before = Get-CleanState
  $result.Before = $before
  if (-not $before.Clean) { Add-Failure $result 'clean-state' '설치 전 Alhangeul 소유 상태가 남아 있습니다.'; return $result }
  $installLog = Join-Path $OutputDirectory "$Kind-install.log"
  $uninstallLog = Join-Path $OutputDirectory "$Kind-uninstall.log"
  $state = $null
  try {
    $result.InstallExitCode = Invoke-Installer $Kind $Path $installLog
    if ($result.InstallExitCode -ne 0) {
      $category = if ($result.InstallExitCode -eq 3010) { 'reboot-required' } else { 'install' }
      $message = if ($result.InstallExitCode -eq 1602) { 'installer가 user-exit 1602를 반환했습니다.' } else { "installer exit code: $($result.InstallExitCode)" }
      Add-Failure $result $category $message
      if ($Kind -eq 'msi') { $result.InstallFailureContext = Write-MsiFailureContext $installLog }
    }
    $state = Get-ProductState $Kind $InstallDirectory
    $result.InstalledState = $state
    if ($result.InstallExitCode -eq 0) {
      Invoke-Check $result 'registry-handler' 'RegistryPathCheck' { Assert-InstalledRegistry $state $Kind }
      Invoke-Check $result 'version' 'VersionCheck' { Assert-InstalledVersion $state }
      Invoke-Check $result 'registry-handler' 'HandlerCheck' { Assert-InstalledHandlers $state }
      Invoke-Check $result 'shortcut' 'ShortcutCheck' { Assert-Condition $state.Shortcuts.Valid 'shortcut target이 다릅니다.'; return $true }
      $result.DefaultsAfterInstall = Get-DefaultState
      Invoke-Check $result 'default-mutation' 'DefaultCheck' { Assert-Condition ((ConvertTo-Json $BaselineDefaults -Depth 12 -Compress) -eq (ConvertTo-Json $result.DefaultsAfterInstall -Depth 12 -Compress)) '기본 연결 또는 UserChoice가 변경되었습니다.'; return $true }
      Invoke-Check $result 'launch' 'Launch' { Invoke-Launch $state.Executable }
    }
  } catch { Add-Failure $result 'install' $_.Exception.Message } finally {
    if ($null -eq $state) { $state = Get-ProductState $Kind $InstallDirectory }
    if ($null -ne $state.Entry -or (Test-Path -LiteralPath $InstallDirectory)) {
      try {
        $result.UninstallExitCode = Invoke-Uninstaller $Kind $state $uninstallLog
        if ($result.UninstallExitCode -ne 0) { Add-Failure $result 'uninstall' "uninstaller exit code: $($result.UninstallExitCode)" }
        if ($Kind -eq 'msi' -and $result.UninstallExitCode -ne 0) { $result.UninstallFailureContext = Write-MsiFailureContext $uninstallLog }
      } catch { Add-Failure $result 'uninstall' $_.Exception.Message }
    }
    $result.DefaultsAfterUninstall = Get-DefaultState
    $result.After = Get-CleanState
    if (-not $result.After.Clean) { Add-Failure $result 'cleanup' '제거 뒤 Alhangeul 소유 상태가 남아 있습니다.' }
    if ((ConvertTo-Json $BaselineDefaults -Depth 12 -Compress) -ne (ConvertTo-Json $result.DefaultsAfterUninstall -Depth 12 -Compress)) { Add-Failure $result 'default-mutation' '제거 뒤 기본 연결 또는 UserChoice가 복원되지 않았습니다.' }
  }
  if ($result.Failures.Count -eq 0) { $result.Status = 'passed' }
  return $result
}
# Main
Assert-Condition ($ExpectedVersion -match '^\d+\.\d+\.\d+$') 'ExpectedVersion은 3성분 version이어야 합니다.'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null; $summaryPath = Join-Path $OutputDirectory 'windows-installer-smoke-summary.json'
$summary = [ordered]@{ SchemaVersion = 1; ExpectedVersion = $ExpectedVersion; StartedAt = [DateTime]::UtcNow.ToString('o'); Status = 'failed'; Failures = @(); Installers = @() }
$sentinels = $null
try {
  $artifacts = Resolve-BundleArtifacts $ArtifactRoot
  $summary.Artifacts = $artifacts
  $fixturePath = Join-Path $OutputDirectory 'outside-installation-fixture.txt'
  [IO.File]::WriteAllText($fixturePath, 'Alhangeul installer smoke fixture')
  $fixtureHash = (Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash
  $originalDefaults = Get-DefaultState; $summary.OriginalDefaults = $originalDefaults
  $sentinels = Set-AssociationSentinels
  $baselineDefaults = Get-DefaultState
  $summary.BaselineDefaults = $baselineDefaults
  $summary.Installers = @(Invoke-BundleSmoke 'msi' $artifacts.Msi $msiInstallDirectory $baselineDefaults; Invoke-BundleSmoke 'nsis' $artifacts.Nsis $nsisInstallDirectory $baselineDefaults)
  $summary.Fixture = [ordered]@{ Path = $fixturePath; BeforeSha256 = $fixtureHash; AfterSha256 = (Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash }
  if ($summary.Fixture.BeforeSha256 -ne $summary.Fixture.AfterSha256) { $summary.Fixture.Status = 'failed'; $summary.Failures += [ordered]@{ Category = 'fixture'; Message = '외부 fixture hash가 변경되었습니다.' } } else { $summary.Fixture.Status = 'passed' }
  if (@($summary.Installers | Where-Object { $_.Status -ne 'passed' }).Count -eq 0 -and $summary.Fixture.Status -eq 'passed') { $summary.Status = 'passed' }
} catch { $summary.FatalError = $_.Exception.Message
} finally {
  if ($null -ne $sentinels) { Restore-AssociationSentinels $sentinels }
  $summary.RestoredDefaults = Get-DefaultState
  if ($null -ne $sentinels -and (ConvertTo-Json $originalDefaults -Depth 12 -Compress) -ne (ConvertTo-Json $summary.RestoredDefaults -Depth 12 -Compress)) { $summary.Status = 'failed'; $summary.Failures += [ordered]@{ Category = 'default-mutation'; Message = 'smoke 종료 뒤 원래 기본 연결이 복원되지 않았습니다.' } }
  $summary.FinishedAt = [DateTime]::UtcNow.ToString('o')
  $summary | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
}
if ($summary.Status -ne 'passed') { Write-Error "Windows installer smoke가 실패했습니다. summary: $summaryPath"; exit 1 }
Write-Output "Windows installer smoke passed: $summaryPath"
