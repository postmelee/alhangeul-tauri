$thumbnailClsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'
$thumbnailCategory = '{E357FCCD-A995-4576-B01F-234630154E96}'
$thumbnailBackupRoot = 'Software\Alhangeul\ThumbnailHandlerBackup'
$thumbnailThirdParty = '{4A64F47A-2B10-4E74-AFA0-6B7D59B76155}'
$thumbnailInterop = @'
using System;
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential)] public struct NativeSize { public int cx; public int cy; }
[ComImport, Guid("BCC18B79-BA16-442F-80C4-8A59C30C463B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellItemImageFactory {
  [PreserveSig] int GetImage(NativeSize size, uint flags, out IntPtr bitmap);
}
public static class ThumbnailSmokeInterop {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
  static extern int SHCreateItemFromParsingName(string path, IntPtr bind, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory factory);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr handle);
  public static int Request(string path, int size) {
    Guid iid = new Guid("BCC18B79-BA16-442F-80C4-8A59C30C463B");
    IShellItemImageFactory factory;
    int result = SHCreateItemFromParsingName(path, IntPtr.Zero, ref iid, out factory);
    if (result != 0) return result;
    IntPtr bitmap = IntPtr.Zero;
    try {
      result = factory.GetImage(new NativeSize { cx = size, cy = size }, 0x8, out bitmap);
      return result;
    } finally {
      if (bitmap != IntPtr.Zero) DeleteObject(bitmap);
      Marshal.ReleaseComObject(factory);
    }
  }
}
'@
if ($null -eq ('ThumbnailSmokeInterop' -as [type])) { Add-Type -TypeDefinition $thumbnailInterop }

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
    $state += @(Get-RegistryValues (Get-ThumbnailAssociationPath $extension) '' | Where-Object { $_.Hive -ne $target.HiveName -or $_.View -ne $target.ViewName })
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
function Assert-InstalledThumbnail($Kind, $InstallDirectory, $Sentinels) {
  $target = $Sentinels.Target; $handler = Join-Path $InstallDirectory 'AlhangeulThumbnailHandler.dll'; $worker = Join-Path $InstallDirectory 'AlhangeulThumbnailWorker.exe'
  Assert-Condition (Test-Path -LiteralPath $handler -PathType Leaf) '설치된 thumbnail handler가 없습니다.'
  Assert-Condition (Test-Path -LiteralPath $worker -PathType Leaf) '설치된 thumbnail worker가 없습니다.'
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
  Assert-Condition ($exitCode -ne 0) 'MSI rollback probe가 예상과 달리 성공했습니다.'
  Assert-Condition (-not (Test-Path -LiteralPath $InstallDirectory)) 'MSI rollback 뒤 설치 디렉터리가 남았습니다.'
  foreach ($index in 0..($extensions.Count - 1)) {
    $value = Read-RegistryValue $Sentinels.Target (Get-ThumbnailAssociationPath $extensions[$index]) ''
    Assert-Condition ($value.Exists -and $value.Value -eq $Sentinels.Records[$index].Sentinel) 'MSI rollback이 원래 thumbnail sentinel을 복원하지 않았습니다.'
  }
  Assert-Condition ((Get-ThumbnailOwnedRegistryCount) -eq 0) 'MSI rollback 뒤 제품 등록이 남았습니다.'
  return [ordered]@{ ExitCode = $exitCode; Log = $log; FailureContext = Write-MsiFailureContext $log }
}
function Get-ThumbnailFixtureState($Path) {
  $item = Get-Item -LiteralPath $Path
  return [ordered]@{ Name = $item.Name; Size = $item.Length; Mtime = $item.LastWriteTimeUtc.Ticks; Sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash }
}
function Invoke-ThumbnailFixtureProbe {
  $root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\third_party\rhwp\saved')); $results = @()
  $beforeProcesses = @(Get-Process -Name 'Alhangeul', 'msedgewebview2' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  foreach ($extension in $extensions) {
    $fixture = Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object { $_.Extension -ieq $extension } | Select-Object -First 1
    Assert-Condition ($null -ne $fixture) "$extension thumbnail fixture가 없습니다."
    $before = Get-ThumbnailFixtureState $fixture.FullName; $hresult = [ThumbnailSmokeInterop]::Request($fixture.FullName, 256); $after = Get-ThumbnailFixtureState $fixture.FullName
    Assert-Condition ($hresult -eq 0) "$extension IShellItemImageFactory 실패: 0x$('{0:x8}' -f $hresult)"
    Assert-Condition ((ConvertTo-Json $before -Compress) -eq (ConvertTo-Json $after -Compress)) "$extension 원본 fixture가 변경되었습니다."
    $results += [ordered]@{ Fixture = $before; HResult = $hresult; Size = 256 }
  }
  $afterProcesses = @(Get-Process -Name 'Alhangeul', 'msedgewebview2' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  Assert-Condition (@($afterProcesses | Where-Object { $beforeProcesses -notcontains $_ }).Count -eq 0) 'thumbnail 요청이 Alhangeul 또는 WebView process를 시작했습니다.'
  return $results
}
