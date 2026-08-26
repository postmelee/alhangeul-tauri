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
. (Join-Path $PSScriptRoot 'windows-installer-smoke-support.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-smoke.ps1')
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
  $handlerFiles = @($files | Where-Object { $_.Name -ceq 'AlhangeulThumbnailHandler.dll' -and $_.Directory.Name -ceq 'verification' })
  $workerFiles = @($files | Where-Object { $_.Name -ceq 'AlhangeulThumbnailWorker.exe' -and $_.Directory.Name -ceq 'verification' })
  Assert-Condition ($inventories.Count -eq 1) 'artifact inventory가 정확히 하나여야 합니다.'
  Assert-Condition ($msiFiles.Count -eq 1) 'MSI bundle이 정확히 하나여야 합니다.'
  Assert-Condition ($nsisFiles.Count -eq 1) 'NSIS bundle이 정확히 하나여야 합니다.'
  Assert-Condition ($handlerFiles.Count -eq 1) 'verification handler DLL이 정확히 하나여야 합니다.'
  Assert-Condition ($workerFiles.Count -eq 1) 'verification worker EXE가 정확히 하나여야 합니다.'
  Assert-Condition ($msiFiles[0].Directory.Name -ieq 'msi') 'MSI는 msi 디렉터리에 있어야 합니다.'
  Assert-Condition ($files.Count -eq 5) 'inventory, MSI, NSIS, thumbnail verification copy 두 개만 허용합니다.'
  $inventory = Get-Content -LiteralPath $inventories[0].FullName -Raw | ConvertFrom-Json
  Assert-Condition ($inventory.platform -eq 'windows-x64') 'windows-x64 inventory가 필요합니다.'
  Assert-InventoryRecord 'msi' $msiFiles[0] $inventory $rootItem.FullName
  Assert-InventoryRecord 'nsis' $nsisFiles[0] $inventory $rootItem.FullName
  Assert-InventoryRecord 'thumbnail-handler' $handlerFiles[0] $inventory $rootItem.FullName
  Assert-InventoryRecord 'thumbnail-worker' $workerFiles[0] $inventory $rootItem.FullName
  Assert-PortableExecutable $handlerFiles[0] $true
  Assert-PortableExecutable $workerFiles[0] $false
  return [ordered]@{ Msi = $msiFiles[0].FullName; Nsis = $nsisFiles[0].FullName; Handler = $handlerFiles[0].FullName; Worker = $workerFiles[0].FullName }
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
  foreach ($extension in $extensions) { $ownedKeys += Get-RegistryValues "Software\Alhangeul\FileAssocBackup\$extension" 'State' }
  $ownedOpenWith = @()
  for ($index = 0; $index -lt $extensions.Count; $index += 1) { $ownedOpenWith += Get-RegistryValues "Software\Classes\$($extensions[$index])\OpenWithProgids" $canonicalProgIds[$index] }
  $shortcutPaths = @((Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('CommonPrograms')) 'Alhangeul\Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Alhangeul.lnk'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'Alhangeul\Alhangeul.lnk'))
  $processes = @(Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue)
  $candidatePaths = @($msiInstallDirectory, $nsisInstallDirectory) + $shortcutPaths
  $residualPaths = @($candidatePaths | Where-Object { Test-Path -LiteralPath $_ })
  $entries = @(Get-UninstallEntries)
  $registryCount = @($ownedKeys + $ownedOpenWith | Where-Object { $_.Exists }).Count + (Get-ThumbnailOwnedRegistryCount)
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
  Assert-Condition ($null -ne $State.Version) 'version resource를 읽을 수 없습니다.'; Assert-Condition ((ConvertTo-NormalizedVersion $State.Version.ProductVersion) -eq $ExpectedVersion) 'ProductVersion이 다릅니다.'; Assert-Condition ((ConvertTo-NormalizedVersion $State.Version.FileVersion) -eq $ExpectedVersion) 'FileVersion이 다릅니다.'; return $true
}
function Assert-InstalledHandlers($State) { Assert-Condition (@($State.Handlers | Where-Object { -not $_.Valid }).Count -eq 0) 'canonical ProgID 또는 OpenWithProgids가 없습니다.'; return $true }
function Invoke-Installer($Kind, $Path, $LogPath, $Update = $false) {
  $arguments = if ($Kind -eq 'msi') { @('/i', "`"$Path`"", '/qn', '/norestart', '/L*v', "`"$LogPath`"") } elseif ($Update) { @('/S', '/UPDATE') } else { @('/S') }
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
function Invoke-InstalledChecks($Result, $Kind, $InstallDirectory, $BaselineDefaults, $ThumbnailSentinels) {
  $state = $Result.InstalledState
  Invoke-Check $Result 'registry-handler' 'RegistryPathCheck' { Assert-InstalledRegistry $state $Kind }
  Invoke-Check $Result 'version' 'VersionCheck' { Assert-InstalledVersion $state }
  Invoke-Check $Result 'registry-handler' 'HandlerCheck' { Assert-InstalledHandlers $state }
  $Result.ThumbnailRegistrationState = Get-ThumbnailRegistrationState $InstallDirectory $ThumbnailSentinels
  Invoke-Check $Result 'thumbnail-registration' 'ThumbnailRegistration' { Assert-InstalledThumbnail $Kind $InstallDirectory $ThumbnailSentinels }
  if ($Kind -eq 'nsis') {
    Invoke-Check $Result 'installer-rollback' 'Reinstall' { $code = Invoke-Installer $Kind $Result.Path (Join-Path $OutputDirectory 'nsis-reinstall.log') $true; Assert-Condition ($code -eq 0) "NSIS reinstall exit code: $code"; Assert-InstalledThumbnail $Kind $InstallDirectory $ThumbnailSentinels }
  }
  Invoke-Check $Result 'thumbnail-render' 'ThumbnailFixtures' { Invoke-ThumbnailFixtureProbe }
  Invoke-Check $Result 'shortcut' 'ShortcutCheck' { Assert-Condition $state.Shortcuts.Valid 'shortcut target이 다릅니다.'; return $true }
  $Result.DefaultsAfterInstall = Get-DefaultState
  Invoke-Check $Result 'default-mutation' 'DefaultCheck' { Assert-Condition ((ConvertTo-Json $BaselineDefaults -Depth 12 -Compress) -eq (ConvertTo-Json $Result.DefaultsAfterInstall -Depth 12 -Compress)) '기본 연결 또는 UserChoice가 변경되었습니다.'; return $true }
  Invoke-Check $Result 'launch' 'Launch' { Invoke-Launch $state.Executable }
  Set-ThirdPartyThumbnail $ThumbnailSentinels
  $Result.ThirdPartySet = $true
}
function Complete-BundleSmoke($Result, $Kind, $State, $ThumbnailSentinels, $BaselineDefaults) {
  if ($null -eq $State) {
    $installDirectory = if ($Kind -eq 'msi') { $msiInstallDirectory } else { $nsisInstallDirectory }
    $State = Get-ProductState $Kind $installDirectory
  }
  if ($null -ne $State.Entry -or (Test-Path -LiteralPath $State.InstallDirectory)) {
    try {
      $Result.UninstallExitCode = Invoke-Uninstaller $Kind $State (Join-Path $OutputDirectory "$Kind-uninstall.log")
      if ($Result.UninstallExitCode -ne 0) { Add-Failure $Result 'uninstall' "uninstaller exit code: $($Result.UninstallExitCode)" }
      if ($Kind -eq 'msi' -and $Result.UninstallExitCode -ne 0) { $Result.UninstallFailureContext = Write-MsiFailureContext (Join-Path $OutputDirectory "$Kind-uninstall.log") }
    } catch { Add-Failure $Result 'uninstall' $_.Exception.Message }
  }
  if ($Result.ThirdPartySet -and $null -ne $ThumbnailSentinels) { Invoke-Check $Result 'coexistence' 'ThumbnailUninstall' { Assert-UninstalledThumbnail $Kind $ThumbnailSentinels } }
  if ($null -ne $ThumbnailSentinels) { try { Restore-ThumbnailSentinels $ThumbnailSentinels } catch { Add-Failure $Result 'sentinel-restore' $_.Exception.Message } }
  $Result.DefaultsAfterUninstall = Get-DefaultState; $Result.After = Get-CleanState
  if (-not $Result.After.Clean) { Add-Failure $Result 'cleanup' '제거 뒤 Alhangeul 소유 상태가 남아 있습니다.' }
  if ((ConvertTo-Json $BaselineDefaults -Depth 12 -Compress) -ne (ConvertTo-Json $Result.DefaultsAfterUninstall -Depth 12 -Compress)) { Add-Failure $Result 'default-mutation' '제거 뒤 기본 연결 또는 UserChoice가 복원되지 않았습니다.' }
}
function Invoke-BundleSmoke($Kind, $Path, $InstallDirectory, $BaselineDefaults) {
  $result = [ordered]@{ Kind = $Kind; Path = $Path; Status = 'failed'; Failures = @(); ThirdPartySet = $false }
  $before = Get-CleanState
  $result.Before = $before
  if (-not $before.Clean) { Add-Failure $result 'clean-state' '설치 전 Alhangeul 소유 상태가 남아 있습니다.'; return $result }
  $installLog = Join-Path $OutputDirectory "$Kind-install.log"
  $state = $null; $thumbnailSentinels = $null
  try {
    $thumbnailSentinels = Set-ThumbnailSentinels $Kind
    if ($Kind -eq 'msi') { Invoke-Check $result 'installer-rollback' 'RollbackProbe' { Invoke-MsiThumbnailRollbackProbe $Path $InstallDirectory $thumbnailSentinels } }
    $result.InstallExitCode = Invoke-Installer $Kind $Path $installLog
    if ($result.InstallExitCode -ne 0) {
      $category = if ($result.InstallExitCode -eq 3010) { 'reboot-required' } else { 'install' }
      $message = if ($result.InstallExitCode -eq 1602) { 'installer가 user-exit 1602를 반환했습니다.' } else { "installer exit code: $($result.InstallExitCode)" }
      Add-Failure $result $category $message
      if ($Kind -eq 'msi') { $result.InstallFailureContext = Write-MsiFailureContext $installLog }
    }
    $state = Get-ProductState $Kind $InstallDirectory
    $result.InstalledState = $state
    if ($result.InstallExitCode -eq 0) { Invoke-InstalledChecks $result $Kind $InstallDirectory $BaselineDefaults $thumbnailSentinels }
  } catch { Add-Failure $result 'install' $_.Exception.Message } finally {
    Complete-BundleSmoke $result $Kind $state $thumbnailSentinels $BaselineDefaults
  }
  if ($result.Failures.Count -eq 0) { $result.Status = 'passed' }
  return $result
}
# Main
Assert-Condition ($ExpectedVersion -match '^\d+\.\d+\.\d+$') 'ExpectedVersion은 MSI ProductVersion 제약상 prerelease suffix 없는 3성분 version이어야 합니다.'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null; $summaryPath = Join-Path $OutputDirectory 'windows-installer-smoke-summary.json'
$summary = [ordered]@{ SchemaVersion = 1; ExpectedVersion = $ExpectedVersion; StartedAt = [DateTime]::UtcNow.ToString('o'); Status = 'failed'; Failures = @(); Installers = @() }
$sentinels = @()
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
  try {
    if ($sentinels.Count -gt 0) { Restore-AssociationSentinels $sentinels }
    $summary.RestoredDefaults = Get-DefaultState
    if ($sentinels.Count -gt 0 -and (ConvertTo-Json $originalDefaults -Depth 12 -Compress) -ne (ConvertTo-Json $summary.RestoredDefaults -Depth 12 -Compress)) { $summary.Status = 'failed'; $summary.Failures += [ordered]@{ Category = 'default-mutation'; Message = 'smoke 종료 뒤 원래 기본 연결이 복원되지 않았습니다.' } }
  } catch { $summary.Status = 'failed'; $summary.Failures += [ordered]@{ Category = 'sentinel-restore'; Message = $_.Exception.Message } } finally { $summary.FinishedAt = [DateTime]::UtcNow.ToString('o'); $summary | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $summaryPath -Encoding UTF8 }
}
if ($summary.Status -ne 'passed') { Write-Error "Windows installer smoke가 실패했습니다. summary: $summaryPath" -ErrorAction Continue; exit 1 }
Write-Output "Windows installer smoke passed: $summaryPath"
