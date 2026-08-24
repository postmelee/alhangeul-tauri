[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$RhwpBinary,
  [Parameter(Mandatory = $true)][string]$FixtureRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$thumbnailCategory = '{E357FCCD-A995-4576-B01F-234630154E96}'
$commandTimeoutMs = 120000

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class ThumbnailContractProbe {
  const uint SIIGBF_THUMBNAILONLY = 0x8;
  [StructLayout(LayoutKind.Sequential)] struct SIZE { public int cx; public int cy; }
  [ComImport, Guid("BCC18B79-BA16-442F-80C4-8A59C30C463B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItemImageFactory { [PreserveSig] int GetImage(SIZE size, uint flags, out IntPtr bitmap); }
  [DllImport("shlwapi.dll", CharSet=CharSet.Unicode)] static extern int AssocQueryStringW(uint flags, uint str, string assoc, string extra, StringBuilder output, ref uint length);
  [DllImport("shell32.dll", CharSet=CharSet.Unicode, PreserveSig=false)] static extern void SHCreateItemFromParsingName(string path, IntPtr bind, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object item);
  [DllImport("shell32.dll")] static extern void SHChangeNotify(int eventId, uint flags, IntPtr item1, IntPtr item2);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr handle);
  public static string Query(string association, string category) {
    uint length = 0; AssocQueryStringW(0, 15, association, category, null, ref length);
    var output = new StringBuilder(length > 0 ? (int)length : 1);
    int result = AssocQueryStringW(0, 15, association, category, output, ref length);
    return result == 0 ? output.ToString() : String.Format("HRESULT:0x{0:X8}", result);
  }
  public static string GetImage(string path) {
    object item = null; IntPtr bitmap = IntPtr.Zero;
    try {
      var iid = new Guid("BCC18B79-BA16-442F-80C4-8A59C30C463B");
      SHCreateItemFromParsingName(path, IntPtr.Zero, ref iid, out item);
      int result = ((IShellItemImageFactory)item).GetImage(new SIZE { cx=64, cy=64 }, SIIGBF_THUMBNAILONLY, out bitmap);
      return String.Format("HRESULT:0x{0:X8}", result);
    } catch (COMException error) { return String.Format("HRESULT:0x{0:X8}", error.ErrorCode); }
    finally { if (bitmap != IntPtr.Zero) DeleteObject(bitmap); if (item != null) Marshal.ReleaseComObject(item); }
  }
  public static void NotifyAssociationChanged() { SHChangeNotify(0x08000000, 0, IntPtr.Zero, IntPtr.Zero); }
}
'@

function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Get-LowerSha256($Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function ConvertTo-ProcessArguments($Arguments) {
  return (($Arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join ' ')
}
function Invoke-MeasuredProcess($Name, $Arguments, $WorkDirectory, $ScratchDirectory) {
  $stdout = Join-Path $ScratchDirectory "$Name.stdout"; $stderr = Join-Path $ScratchDirectory "$Name.stderr"
  $startInfo = New-Object Diagnostics.ProcessStartInfo
  $startInfo.FileName = $script:binaryPath; $startInfo.Arguments = ConvertTo-ProcessArguments $Arguments
  $startInfo.WorkingDirectory = $WorkDirectory; $startInfo.UseShellExecute = $false; $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true; $startInfo.RedirectStandardError = $true
  $process = New-Object Diagnostics.Process; $process.StartInfo = $startInfo
  $timer = [Diagnostics.Stopwatch]::StartNew(); [void]$process.Start()
  $outTask = $process.StandardOutput.ReadToEndAsync(); $errTask = $process.StandardError.ReadToEndAsync()
  $finished = $false; [int64]$peak = 0
  while (-not $finished -and $timer.ElapsedMilliseconds -lt $commandTimeoutMs) {
    $finished = $process.WaitForExit(25)
    try { $process.Refresh(); $working = [int64]$process.WorkingSet64; if ($working -gt $peak) { $peak = $working }; $nativePeak = [int64]$process.PeakWorkingSet64; if ($nativePeak -gt $peak) { $peak = $nativePeak } } catch {}
  }
  if (-not $finished) { $process.Kill(); $process.WaitForExit() }
  $outText = $outTask.Result; $errText = $errTask.Result; $timer.Stop(); $process.Refresh()
  $exitCode = if ($finished) { $process.ExitCode } else { -1 }
  [IO.File]::WriteAllText($stdout, $outText); [IO.File]::WriteAllText($stderr, $errText)
  $metric = [ordered]@{ Name = $Name; ExitCode = $exitCode; TimedOut = -not $finished; WallMs = $timer.ElapsedMilliseconds; PeakWorkingSetBytes = $peak; StdoutBytes = (Get-Item -LiteralPath $stdout).Length; StderrBytes = (Get-Item -LiteralPath $stderr).Length }
  return [ordered]@{ Metric = $metric; Stdout = $outText; Stderr = $errText }
}
function Get-SvgMetadata($Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  $text = [IO.File]::ReadAllText($Path); $viewBox = [regex]::Match($text, '<svg[^>]*\bviewBox="([^"]+)"', 'IgnoreCase')
  $dimensions = if ($viewBox.Success) { @($viewBox.Groups[1].Value -split '[ ,]+' | Where-Object { $_ -ne '' }) } else { @() }
  return [ordered]@{ Bytes = (Get-Item -LiteralPath $Path).Length; ViewBoxWidth = if ($dimensions.Count -eq 4) { [double]$dimensions[2] } else { $null }; ViewBoxHeight = if ($dimensions.Count -eq 4) { [double]$dimensions[3] } else { $null } }
}
function Get-PreviewMetadata($Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  $bytes = [IO.File]::ReadAllBytes($Path); $format = 'unknown'; $width = 0; $height = 0
  if ($bytes.Length -ge 24 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) {
    $format = 'png'; $width = [BitConverter]::ToUInt32(@($bytes[19],$bytes[18],$bytes[17],$bytes[16]), 0); $height = [BitConverter]::ToUInt32(@($bytes[23],$bytes[22],$bytes[21],$bytes[20]), 0)
  } elseif ($bytes.Length -ge 26 -and $bytes[0] -eq 0x42 -and $bytes[1] -eq 0x4d) {
    $format = 'bmp'; $width = [Math]::Abs([BitConverter]::ToInt32($bytes, 18)); $height = [Math]::Abs([BitConverter]::ToInt32($bytes, 22))
  } elseif ($bytes.Length -ge 10 -and $bytes[0] -eq 0x47 -and $bytes[1] -eq 0x49 -and $bytes[2] -eq 0x46) {
    $format = 'gif'; $width = [BitConverter]::ToUInt16($bytes, 6); $height = [BitConverter]::ToUInt16($bytes, 8)
  }
  return [ordered]@{ Bytes = $bytes.Length; Format = $format; Width = $width; Height = $height; Pixels = [int64]$width * [int64]$height }
}
function Invoke-FixtureProbe($File, $FixtureClass, $ScratchRoot) {
  $before = [ordered]@{ Sha256 = Get-LowerSha256 $File.FullName; Bytes = $File.Length; ModifiedUtc = $File.LastWriteTimeUtc.ToString('o') }
  $fixtureId = "fixture-$($before.Sha256)"; $scratch = Join-Path $ScratchRoot $fixtureId
  New-Item -ItemType Directory -Path $scratch -Force | Out-Null
  $benchTsv = Join-Path $scratch 'bench.tsv'; $directDirectory = Join-Path $scratch 'direct'; $previewPath = Join-Path $scratch 'preview.bin'
  $bench = Invoke-MeasuredProcess 'bench' @('bench', $File.FullName, '-n', '1', '--tsv', $benchTsv) $scratch $scratch
  $direct = Invoke-MeasuredProcess 'direct' @('export-svg', $File.FullName, '--page', '0', '--json', '--output', $directDirectory) $scratch $scratch
  $preview = Invoke-MeasuredProcess 'preview' @('thumbnail', $File.FullName, '--output', $previewPath) $scratch $scratch
  $svg = Get-ChildItem -LiteralPath $directDirectory -Filter '*.svg' -File -ErrorAction SilentlyContinue | Select-Object -First 1
  $afterItem = Get-Item -LiteralPath $File.FullName
  $after = [ordered]@{ Sha256 = Get-LowerSha256 $File.FullName; Bytes = $afterItem.Length; ModifiedUtc = $afterItem.LastWriteTimeUtc.ToString('o') }
  Assert-Condition ((ConvertTo-Json $before -Compress) -eq (ConvertTo-Json $after -Compress)) 'fixture 원본이 probe 중 변경되었습니다.'
  return [ordered]@{ FixtureId = $fixtureId; FixtureClass = $FixtureClass; Format = $File.Extension.TrimStart('.').ToLowerInvariant(); Original = $before; Bench = $bench.Metric; Direct = $direct.Metric; Svg = if ($null -ne $svg) { Get-SvgMetadata $svg.FullName } else { $null }; PreviewCommand = $preview.Metric; Preview = Get-PreviewMetadata $previewPath }
}
function New-HwpxVariant($Source, $Destination, $Mode) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $input = [IO.Compression.ZipFile]::OpenRead($Source); $output = [IO.Compression.ZipFile]::Open($Destination, [IO.Compression.ZipArchiveMode]::Create)
  $pixel = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+wsSFygAAAABJRU5ErkJggg==')
  try {
    foreach ($entry in $input.Entries) {
      $isPreview = $entry.FullName.StartsWith('Preview/PrvImage', [StringComparison]::OrdinalIgnoreCase)
      if ($Mode -eq 'without-preview' -and $isPreview) { continue }
      $target = $output.CreateEntry($entry.FullName, [IO.Compression.CompressionLevel]::Optimal); $targetStream = $target.Open()
      try {
        if ($Mode -eq 'stale-preview' -and $isPreview) { $targetStream.Write($pixel, 0, $pixel.Length) } else { $sourceStream = $entry.Open(); try { $sourceStream.CopyTo($targetStream) } finally { $sourceStream.Dispose() } }
      } finally { $targetStream.Dispose() }
    }
  } finally { $output.Dispose(); $input.Dispose() }
}
function New-DerivedFixtures($SourceFiles, $ScratchRoot) {
  $records = @(); $hwpx = @($SourceFiles | Where-Object { $_.Extension -eq '.hwpx' }) | Select-Object -First 1
  Assert-Condition ($null -ne $hwpx) 'HWPX source fixture가 필요합니다.'
  $withoutPreview = Join-Path $ScratchRoot 'derived-without-preview.hwpx'; New-HwpxVariant $hwpx.FullName $withoutPreview 'without-preview'
  $stalePreview = Join-Path $ScratchRoot 'derived-stale-preview.hwpx'; New-HwpxVariant $hwpx.FullName $stalePreview 'stale-preview'
  $corrupt = Join-Path $ScratchRoot 'derived-corrupt.hwpx'; $sourceBytes = [IO.File]::ReadAllBytes($hwpx.FullName); [IO.File]::WriteAllBytes($corrupt, $sourceBytes[0..([Math]::Min(127, $sourceBytes.Length - 1))])
  $oversize = Join-Path $ScratchRoot 'derived-oversize.hwp'; $stream = [IO.File]::Open($oversize, [IO.FileMode]::CreateNew); try { $stream.SetLength(64MB + 1) } finally { $stream.Dispose() }
  $records += [ordered]@{ File = Get-Item $withoutPreview; Class = 'preview-absent' }
  $records += [ordered]@{ File = Get-Item $stalePreview; Class = 'preview-stale' }
  $records += [ordered]@{ File = Get-Item $corrupt; Class = 'corrupt-truncated' }
  $records += [ordered]@{ File = Get-Item $oversize; Class = 'size-boundary-64mib-plus-one' }
  return $records
}
function Set-RegistryValue($Root, $Path, $Value) {
  $key = $Root.CreateSubKey($Path); try { $key.SetValue('', $Value, [Microsoft.Win32.RegistryValueKind]::String) } finally { $key.Close() }
}
function Remove-RegistryValue($Root, $Path) {
  $key = $Root.OpenSubKey($Path, $true); if ($null -ne $key) { try { $key.DeleteValue('', $false) } finally { $key.Close() } }
  [ThumbnailContractProbe]::NotifyAssociationChanged(); Start-Sleep -Milliseconds 100
}
function Get-RegistryObservation($Name, $Extension, $FilePath) {
  return [ordered]@{ Name = $Name; ResolvedClsid = [ThumbnailContractProbe]::Query($Extension, $thumbnailCategory); ImageFactoryResult = [ThumbnailContractProbe]::GetImage($FilePath) }
}
function Invoke-RegistryPrecedenceProbe($ScratchRoot) {
  $token = [Guid]::NewGuid().ToString('N'); $extension = ".alhangeulthumb$token"; $progId = "Alhangeul.ThumbnailProbe.$token"
  $clsids = @(1..3 | ForEach-Object { '{' + [Guid]::NewGuid().ToString().ToUpperInvariant() + '}' })
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64)
  $classes = $base.CreateSubKey('Software\Classes'); $filePath = Join-Path $ScratchRoot "item$extension"; [IO.File]::WriteAllBytes($filePath, [byte[]](0x00))
  $paths = @($extension, $progId, "SystemFileAssociations\$extension") + @($clsids | ForEach-Object { "CLSID\$_" })
  try {
    foreach ($clsid in $clsids) { Set-RegistryValue $classes "CLSID\$clsid\InprocServer32" $filePath }
    Set-RegistryValue $classes $extension $progId
    Set-RegistryValue $classes "$extension\ShellEx\$thumbnailCategory" $clsids[2]
    Set-RegistryValue $classes "$progId\ShellEx\$thumbnailCategory" $clsids[0]
    Set-RegistryValue $classes "SystemFileAssociations\$extension\ShellEx\$thumbnailCategory" $clsids[1]
    [ThumbnailContractProbe]::NotifyAssociationChanged(); Start-Sleep -Milliseconds 100
    $observations = @(Get-RegistryObservation 'all-candidates' $extension $filePath)
    Remove-RegistryValue $classes "$progId\ShellEx\$thumbnailCategory"
    $observations += Get-RegistryObservation 'without-progid' $extension $filePath
    Remove-RegistryValue $classes "$extension\ShellEx\$thumbnailCategory"
    $observations += Get-RegistryObservation 'system-file-association-only' $extension $filePath
    Assert-Condition ([String]::Equals($observations[0].ResolvedClsid, $clsids[0], [StringComparison]::OrdinalIgnoreCase)) 'active ProgID thumbnail handler가 우선되지 않았습니다.'
    Assert-Condition ([String]::Equals($observations[2].ResolvedClsid, $clsids[1], [StringComparison]::OrdinalIgnoreCase)) 'SystemFileAssociations fallback을 찾지 못했습니다.'
    return [ordered]@{ Scope = 'HKCU-Registry64-disposable'; Candidates = [ordered]@{ ProgId = $clsids[0]; SystemFileAssociation = $clsids[1]; Extension = $clsids[2] }; Observations = $observations }
  } finally {
    foreach ($path in $paths) { $classes.DeleteSubKeyTree($path, $false) }
    $classes.Close(); $base.Close(); Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue; [ThumbnailContractProbe]::NotifyAssociationChanged()
  }
}
function Get-ObservedMaxima($Fixtures) {
  $svg = @($Fixtures | ForEach-Object { if ($null -ne $_.Svg) { $_.Svg.Bytes } }); $previewBytes = @($Fixtures | ForEach-Object { if ($null -ne $_.Preview) { $_.Preview.Bytes } }); $previewPixels = @($Fixtures | ForEach-Object { if ($null -ne $_.Preview) { $_.Preview.Pixels } })
  return [ordered]@{ InputBytes = ($Fixtures.Original.Bytes | Measure-Object -Maximum).Maximum; DirectWallMs = ($Fixtures.Direct.WallMs | Measure-Object -Maximum).Maximum; DirectPeakWorkingSetBytes = ($Fixtures.Direct.PeakWorkingSetBytes | Measure-Object -Maximum).Maximum; SvgBytes = if ($svg.Count) { ($svg | Measure-Object -Maximum).Maximum } else { 0 }; PreviewBytes = if ($previewBytes.Count) { ($previewBytes | Measure-Object -Maximum).Maximum } else { 0 }; PreviewPixels = if ($previewPixels.Count) { ($previewPixels | Measure-Object -Maximum).Maximum } else { 0 } }
}

Assert-Condition ($env:OS -eq 'Windows_NT') '이 probe는 Windows x64에서만 실행할 수 있습니다.'
$script:binaryPath = [IO.Path]::GetFullPath($RhwpBinary); $fixturePath = [IO.Path]::GetFullPath($FixtureRoot); $outputPath = [IO.Path]::GetFullPath($OutputDirectory)
Assert-Condition ([Environment]::Is64BitOperatingSystem) 'Windows x64 runner가 필요합니다.'
Assert-Condition (Test-Path -LiteralPath $script:binaryPath -PathType Leaf) 'pinned rhwp binary가 없습니다.'
Assert-Condition (Test-Path -LiteralPath $fixturePath -PathType Container) 'fixture root가 없습니다.'
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$scratchRoot = Join-Path ([IO.Path]::GetTempPath()) ("alhangeul-thumbnail-probe-" + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $scratchRoot | Out-Null
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')); $summaryPath = Join-Path $outputPath 'thumbnail-core-summary.json'
$summary = [ordered]@{ SchemaVersion = 1; Kind = 'alhangeul-thumbnail-core-probe'; Status = 'failed'; RepositorySha = $null; RhwpSha = $null; Runner = [ordered]@{ OsVersion = [Environment]::OSVersion.VersionString; ProcessArchitecture = $env:PROCESSOR_ARCHITECTURE }; Fixtures = @(); RegistryProbe = $null }
try {
  $summary.RepositorySha = (& git -C $repoRoot rev-parse HEAD).Trim(); $expectedRhwpSha = (& git -C $repoRoot rev-parse 'HEAD:third_party/rhwp').Trim(); $summary.RhwpSha = (& git -C (Join-Path $repoRoot 'third_party\rhwp') rev-parse HEAD).Trim()
  Assert-Condition ($LASTEXITCODE -eq 0 -and $summary.RhwpSha -eq $expectedRhwpSha) 'rhwp checkout이 repository gitlink와 다릅니다.'
  $files = @(Get-ChildItem -LiteralPath $fixturePath -Recurse -File | Where-Object { $_.Extension -in @('.hwp','.hwpx') } | Sort-Object FullName)
  Assert-Condition ($files.Count -gt 0 -and $files.Count -le 28) 'source fixture 수는 1..28 범위여야 합니다.'
  $fixtureRecords = @($files | ForEach-Object { [ordered]@{ File = $_; Class = "normal-$($_.Extension.TrimStart('.').ToLowerInvariant())" } }) + @(New-DerivedFixtures $files $scratchRoot)
  $summary.Fixtures = @($fixtureRecords | ForEach-Object { Invoke-FixtureProbe $_.File $_.Class $scratchRoot })
  $summary.RegistryProbe = Invoke-RegistryPrecedenceProbe $scratchRoot; $summary.ObservedMaxima = Get-ObservedMaxima $summary.Fixtures; $summary.Status = 'passed'
} catch { $summary.FatalErrorType = $_.Exception.GetType().FullName
} finally {
  Remove-Item -LiteralPath $scratchRoot -Recurse -Force -ErrorAction SilentlyContinue
  $summary | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
}
if ($summary.Status -ne 'passed') { Write-Error "Windows thumbnail core probe가 실패했습니다. summary: $summaryPath" -ErrorAction Continue; exit 1 }
Write-Output "Windows thumbnail core probe passed: $summaryPath"
