$thumbnailClsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'
$thumbnailCategory = '{E357FCCD-A995-4576-B01F-234630154E96}'
$thumbnailBackupRoot = 'Software\Alhangeul\ThumbnailHandlerBackup'
$thumbnailThirdParty = '{4A64F47A-2B10-4E74-AFA0-6B7D59B76155}'

function Get-ThumbnailTarget($Kind) {
  if ($Kind -eq 'msi') {
    return $registryLocations | Where-Object { $_.HiveName -eq 'HKLM' -and $_.ViewName -eq 'Registry64' }
  }
  return $registryLocations | Where-Object { $_.HiveName -eq 'HKCU' -and $_.ViewName -eq 'Registry64' }
}
function Get-ThumbnailAssociationPath($Extension) { return "Software\Classes\$Extension\ShellEx\$thumbnailCategory" }
function Get-ThumbnailClassPath { return "Software\Classes\CLSID\$thumbnailClsid\InprocServer32" }
function Get-ThumbnailUntouchedState($Kind) {
  $target = Get-ThumbnailTarget $Kind; $state = @()
  foreach ($extension in $extensions) {
    $state += @(Get-RegistryValues (Get-ThumbnailAssociationPath $extension) '' | Where-Object { $_.Hive -ne $target.HiveName })
  }
  $state += @(Get-RegistryValues (Get-ThumbnailClassPath) '' | Where-Object { $_.Hive -ne $target.HiveName -or $_.View -ne $target.ViewName })
  return $state
}
function Set-ThumbnailSentinels($Kind) {
  $target = Get-ThumbnailTarget $Kind
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($target.Hive, $target.View); $records = @()
  try {
    foreach ($extension in $extensions) {
      $path = Get-ThumbnailAssociationPath $extension; $key = $base.OpenSubKey($path, $true); $keyExisted = $null -ne $key
      if (-not $keyExisted) { $key = $base.CreateSubKey($path) }
      $valueExisted = $key.GetValueNames() -contains ''
      $kindBefore = if ($valueExisted) { $key.GetValueKind('') } else { $null }
      $sentinel = "{8D4DA210-1C6D-44B7-A760-A8C78F4C$($records.Count.ToString('000'))}"
      $records += [ordered]@{ Path = $path; KeyExisted = $keyExisted; ValueExisted = $valueExisted; Value = $key.GetValue(''); Kind = $kindBefore; Sentinel = $sentinel }
      $key.SetValue('', $sentinel, [Microsoft.Win32.RegistryValueKind]::String); $key.Close()
    }
  } finally { $base.Close() }
  return [ordered]@{ Target = $target; Records = $records; Untouched = @(Get-ThumbnailUntouchedState $Kind) }
}
function Restore-ThumbnailSentinels($Sentinels) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Sentinels.Target.Hive, $Sentinels.Target.View)
  try {
    foreach ($record in $Sentinels.Records) {
      $key = $base.OpenSubKey($record.Path, $true)
      if ($null -eq $key -and $record.KeyExisted) { $key = $base.CreateSubKey($record.Path) }
      if ($null -eq $key) { continue }
      if ($record.ValueExisted) { $key.SetValue('', $record.Value, $record.Kind) } else { $key.DeleteValue('', $false) }
      $empty = $key.SubKeyCount -eq 0 -and $key.ValueCount -eq 0; $key.Close()
      if (-not $record.KeyExisted -and $empty) { $base.DeleteSubKey($record.Path, $false) }
    }
  } finally { $base.Close() }
}
function Assert-PortableExecutable($File, $Dll) {
  $bytes = [IO.File]::ReadAllBytes($File.FullName)
  Assert-Condition ($bytes.Length -ge 152 -and $bytes[0] -eq 0x4d -and $bytes[1] -eq 0x5a) "$($File.Name)에 DOS header가 없습니다."
  $offset = [BitConverter]::ToInt32($bytes, 0x3c)
  Assert-Condition ($offset -ge 0 -and $offset + 24 -le $bytes.Length -and [BitConverter]::ToUInt32($bytes, $offset) -eq 0x4550) "$($File.Name)에 PE header가 없습니다."
  Assert-Condition ([BitConverter]::ToUInt16($bytes, $offset + 4) -eq 0x8664) "$($File.Name)이 x64 PE가 아닙니다."
  $isDll = ([BitConverter]::ToUInt16($bytes, $offset + 22) -band 0x2000) -ne 0
  Assert-Condition ($isDll -eq $Dll) "$($File.Name)의 DLL 구분이 다릅니다."
}
function Get-ThumbnailOwnedRegistryCount {
  $owned = @(Get-RegistryValues (Get-ThumbnailClassPath) '')
  foreach ($extension in $extensions) {
    $owned += Get-RegistryValues "$thumbnailBackupRoot\$extension" 'State'
    $owned += @(Get-RegistryValues (Get-ThumbnailAssociationPath $extension) '' | Where-Object { $_.Value -eq $thumbnailClsid })
  }
  return @($owned | Where-Object { $_.Exists }).Count
}
function Get-ThumbnailRegistrationState($InstallDirectory, $Sentinels) {
  $target = $Sentinels.Target
  $handler = Join-Path $InstallDirectory 'AlhangeulThumbnailHandler.dll'
  $worker = Join-Path $InstallDirectory 'AlhangeulThumbnailWorker.exe'
  $associations = @()
  foreach ($extension in $extensions) {
    $associations += [ordered]@{ Extension = $extension; Owner = Read-RegistryValue $target (Get-ThumbnailAssociationPath $extension) ''; Backup = Read-RegistryValue $target "$thumbnailBackupRoot\$extension" 'State' }
  }
  return [ordered]@{ ExpectedHandler = $handler; HandlerExists = Test-Path -LiteralPath $handler -PathType Leaf; ExpectedWorker = $worker; WorkerExists = Test-Path -LiteralPath $worker -PathType Leaf; Inproc = Read-RegistryValue $target (Get-ThumbnailClassPath) ''; Threading = Read-RegistryValue $target (Get-ThumbnailClassPath) 'ThreadingModel'; Associations = $associations }
}
function Assert-InstalledThumbnail($Kind, $InstallDirectory, $Sentinels) {
  $target = $Sentinels.Target; $handler = Join-Path $InstallDirectory 'AlhangeulThumbnailHandler.dll'; $worker = Join-Path $InstallDirectory 'AlhangeulThumbnailWorker.exe'
  Assert-Condition (Test-Path -LiteralPath $handler -PathType Leaf) '설치된 thumbnail handler가 없습니다.'
  Assert-Condition (Test-Path -LiteralPath $worker -PathType Leaf) '설치된 thumbnail worker가 없습니다.'
  Assert-Condition ((Get-FileHash -LiteralPath $handler -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $artifacts.Handler -Algorithm SHA256).Hash) '설치된 handler hash가 bundle과 다릅니다.'
  Assert-Condition ((Get-FileHash -LiteralPath $worker -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $artifacts.Worker -Algorithm SHA256).Hash) '설치된 worker hash가 bundle과 다릅니다.'
  $inproc = Read-RegistryValue $target (Get-ThumbnailClassPath) ''
  $threading = Read-RegistryValue $target (Get-ThumbnailClassPath) 'ThreadingModel'
  Assert-Condition ($inproc.Exists -and (Test-SamePath $inproc.Value $handler)) 'InprocServer32 절대경로가 다릅니다.'
  Assert-Condition ($threading.Exists -and $threading.Value -eq 'Apartment') 'ThreadingModel이 Apartment가 아닙니다.'
  foreach ($extension in $extensions) {
    $owner = Read-RegistryValue $target (Get-ThumbnailAssociationPath $extension) ''
    $backup = Read-RegistryValue $target "$thumbnailBackupRoot\$extension" 'State'
    Assert-Condition ($owner.Exists -and $owner.Value -eq $thumbnailClsid) "$extension thumbnail owner가 다릅니다."
    Assert-Condition ($backup.Exists -and $backup.Value -eq 1) "$extension snapshot이 committed 상태가 아닙니다."
  }
  Assert-Condition ((ConvertTo-Json @(Get-ThumbnailUntouchedState $Kind) -Depth 10 -Compress) -eq (ConvertTo-Json $Sentinels.Untouched -Depth 10 -Compress)) '비소유 hive/view가 변경되었습니다.'
  return $true
}
function Set-ThirdPartyThumbnail($Sentinels) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Sentinels.Target.Hive, $Sentinels.Target.View)
  try { $key = $base.CreateSubKey((Get-ThumbnailAssociationPath '.hwpx')); $key.SetValue('', $thumbnailThirdParty, [Microsoft.Win32.RegistryValueKind]::String); $key.Close() } finally { $base.Close() }
}
function Assert-UninstalledThumbnail($Kind, $Sentinels) {
  $target = $Sentinels.Target
  $hwp = Read-RegistryValue $target (Get-ThumbnailAssociationPath '.hwp') ''
  $hwpx = Read-RegistryValue $target (Get-ThumbnailAssociationPath '.hwpx') ''
  Assert-Condition ($hwp.Exists -and $hwp.Value -eq $Sentinels.Records[0].Sentinel) 'Alhangeul 소유 .hwp 값이 원래 sentinel로 복원되지 않았습니다.'
  Assert-Condition ($hwpx.Exists -and $hwpx.Value -eq $thumbnailThirdParty) '제3자 .hwpx sentinel이 제거 중 보존되지 않았습니다.'
  Assert-Condition (-not (Read-RegistryValue $target (Get-ThumbnailClassPath) '').Exists) '제품 CLSID가 제거되지 않았습니다.'
  foreach ($extension in $extensions) { Assert-Condition (-not (Read-RegistryValue $target "$thumbnailBackupRoot\$extension" 'State').Exists) "$extension snapshot이 제거되지 않았습니다." }
  Assert-Condition ((ConvertTo-Json @(Get-ThumbnailUntouchedState $Kind) -Depth 10 -Compress) -eq (ConvertTo-Json $Sentinels.Untouched -Depth 10 -Compress)) '제거가 비소유 hive/view를 변경했습니다.'
  return $true
}
function Invoke-MsiThumbnailRollbackProbe($MsiPath, $InstallDirectory, $Sentinels) {
  $log = Join-Path $OutputDirectory 'msi-thumbnail-rollback.log'
  $arguments = @('/i', "`"$MsiPath`"", 'ALHANGEUL_FAIL_THUMBNAIL_INSTALL=1', '/qn', '/norestart', '/L*v', "`"$log`"")
  $exitCode = (Start-Process -FilePath 'msiexec.exe' -ArgumentList $arguments -Wait -PassThru).ExitCode
  $reboot = Measure-InstallerReboot 'msi' $exitCode $script:installerRebootBaseline $log
  Assert-Condition ($exitCode -eq 1603) 'MSI rollback probe가 예상한 실패 주입 코드 1603과 다릅니다.'
  Assert-Condition ($reboot.observationComplete -and -not $reboot.log.deferredOperation -and -not $reboot.log.restartRequired -and -not $reboot.log.msiSystemRebootPending -and @($reboot.markers | Where-Object { $_.present -or $_.baselinePresent -or $_.changed }).Count -eq 0) 'MSI rollback 뒤 재부팅 상태가 없음을 확인하지 못했습니다.'
  Assert-Condition (-not (Test-Path -LiteralPath $InstallDirectory)) 'MSI rollback 뒤 설치 디렉터리가 남았습니다.'
  foreach ($index in 0..($extensions.Count - 1)) {
    $value = Read-RegistryValue $Sentinels.Target (Get-ThumbnailAssociationPath $extensions[$index]) ''
    Assert-Condition ($value.Exists -and $value.Value -eq $Sentinels.Records[$index].Sentinel) 'MSI rollback이 원래 thumbnail sentinel을 복원하지 않았습니다.'
  }
  Assert-Condition ((Get-ThumbnailOwnedRegistryCount) -eq 0) 'MSI rollback 뒤 제품 등록이 남았습니다.'
  return [ordered]@{ ExitCode = $exitCode; RebootObservation = $reboot; Log = $log; FailureContext = Write-MsiFailureContext $log }
}
function Get-ThumbnailFixtureState($Path) {
  $item = Get-Item -LiteralPath $Path
  return [ordered]@{ Name = $item.Name; Size = $item.Length; Mtime = $item.LastWriteTimeUtc.Ticks; Sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash }
}
function Invoke-PostUninstallRollback($Path, $InstallDirectory) {
  $sentinels = $null
  try {
    Assert-Condition (Get-CleanState).Clean 'rollback 전 제품 소유 상태가 남았습니다.'
    $defaults = Get-DefaultState
    $sentinels = Set-ThumbnailSentinels 'msi'
    $result = Invoke-MsiThumbnailRollbackProbe $Path $InstallDirectory $sentinels
    Assert-Condition ((ConvertTo-Json $defaults -Depth 12 -Compress) -eq (ConvertTo-Json (Get-DefaultState) -Depth 12 -Compress)) 'MSI rollback이 기본 연결을 변경했습니다.'
    return $result
  } finally { if ($null -ne $sentinels) { Restore-ThumbnailSentinels $sentinels } }
}
