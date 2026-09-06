[CmdletBinding()]
param([string]$DocumentPath = '', [string]$JpgPath = '', [string]$OutputDirectory = '', [switch]$Consent)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $Consent) {
  Write-Output '명시한 문서와 JPG의 임시 복사본을 처리합니다. 처리기 실행과 Windows 캐시 생성이 발생할 수 있습니다. 자동 업로드·설치·승격은 하지 않습니다.'
  Write-Output '.\windows-thumbnail-check.ps1 -DocumentPath <HWP/HWPX> -JpgPath <JPG> -OutputDirectory <새 폴더> -Consent'
  exit 2
}

function Assert-CheckLocalPath($Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -notmatch '^[A-Za-z]:\\' -or $Path.Substring(2) -match '[:*?"<>|]' -or $Path -match '[\x00-\x1f]') { throw 'input-invalid' }
  $full = [IO.Path]::GetFullPath($Path)
  $drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($full))
  if ($drive.DriveType -ne [IO.DriveType]::Fixed) { throw 'input-nonlocal' }
  $current = $full
  while ($current) {
    if (Test-Path -LiteralPath $current) {
      if (((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'input-reparse' }
    }
    $current = [IO.Path]::GetDirectoryName($current)
  }
  return $full
}

function Read-CheckPackage($Root) {
  $rootPath = Assert-CheckLocalPath $Root
  $names = @('windows-thumbnail-check.ps1', 'windows-thumbnail-check-support.ps1', 'windows-thumbnail-check-assessment.ps1', 'windows-thumbnail-diagnostics.ps1', 'windows-thumbnail-probe.ps1', 'windows-thumbnail-state.ps1', 'windows-thumbnail-assessment.ps1', 'windows-thumbnail-native.cs', 'windows-thumbnail-interop.cs', 'windows-thumbnail-token.cs', 'alhangeul-artifact-inventory.json', 'WINDOWS_THUMBNAILS.md')
  $manifestPath = Assert-CheckLocalPath (Join-Path $rootPath 'support-manifest.json')
  if ((Get-Item -LiteralPath $manifestPath).Length -gt 1MB) { throw 'package-invalid' }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($manifest.schemaVersion -ne 1 -or $manifest.platform -ne 'windows-x64' -or $manifest.sourceSha -cnotmatch '^[0-9a-f]{40}$' -or $manifest.productVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'package-invalid' }
  if ($manifest.files.Count -ne 12 -or @($manifest.files.path | Select-Object -Unique).Count -ne 12) { throw 'package-invalid' }
  $items = @(Get-ChildItem -LiteralPath $rootPath -Force)
  if ($items.Count -ne 13 -or @($items | Where-Object { $_.PSIsContainer -or ($_.Name -cnotin $names -and $_.Name -cne 'support-manifest.json') }).Count -gt 0) { throw 'package-invalid' }
  foreach ($file in $manifest.files) {
    if ($file.path -cnotin $names -or ($file.bytes -isnot [int] -and $file.bytes -isnot [long]) -or $file.bytes -le 0 -or $file.bytes -gt 2MB -or $file.sha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'package-invalid' }
    $path = Assert-CheckLocalPath (Join-Path $rootPath $file.path)
    if ((Get-Item -LiteralPath $path).Length -ne $file.bytes -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ine $file.sha256) { throw 'package-invalid' }
  }
  $inventory = Get-Content -LiteralPath (Join-Path $rootPath 'alhangeul-artifact-inventory.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($inventory.schemaVersion -ne 1 -or $inventory.platform -ne 'windows-x64' -or $inventory.files.Count -ne 4) { throw 'package-invalid' }
  if (@($inventory.files.kind | Select-Object -Unique).Count -ne 4) { throw 'package-invalid' }
  foreach ($file in $inventory.files) {
    if ($file.kind -cnotin @('msi', 'nsis', 'thumbnail-handler', 'thumbnail-worker') -or ($file.size -isnot [int] -and $file.size -isnot [long]) -or $file.size -le 0 -or $file.size -gt 9007199254740991 -or $file.sha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'package-invalid' }
    if ($file.path -isnot [string] -or $file.path -cnotmatch '^[A-Za-z0-9_./-]+$' -or $file.path.StartsWith('/') -or @($file.path.Split('/') | Where-Object { $_ -in @('', '.', '..') }).Count -gt 0) { throw 'package-invalid' }
  }
  return [ordered]@{ Manifest = $manifest; Inventory = $inventory }
}

function Write-CheckJson($Path, $Value) {
  [void](Assert-CheckLocalPath $Path)
  $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try { $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $Value -Depth 20)); $stream.Write($bytes, 0, $bytes.Length) }
  finally { $stream.Dispose() }
}

function Set-CheckIncomplete($Summary, $Detail) {
  $Summary.finding = 'diagnostic-invalid'; $Summary.exitCode = 2; $Summary.detailCode = $Detail
  $Summary.evidenceStatus = 'invalid'; $Summary.thumbnailStatus = 'not-accepted'; $Summary.integrity = $false
  $Summary.recommendedAction = 'check-diagnostics'; $Summary.phase = 'incomplete'
}

$summary = $null; $output = $null; $context = $null; $code = 2; $helpersLoaded = $false
try {
  if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or -not [Environment]::Is64BitProcess -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'requires-windows-x64-ps51' }
  # Validate every dependency before dot-sourcing or compiling it; hashes are not a signature.
  $package = Read-CheckPackage $PSScriptRoot
  . (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')
  . (Join-Path $PSScriptRoot 'windows-thumbnail-check-assessment.ps1')
  . (Join-Path $PSScriptRoot 'windows-thumbnail-check-support.ps1')
  $helpersLoaded = $true
  $context = New-CheckContext $DocumentPath $JpgPath $OutputDirectory
  $output = $context.Output
  $summary = Invoke-ManualThumbnailCheck $context $package
} catch {
  # Never print exception messages, source lines, filenames or caller-provided data.
  if ($null -eq $summary) { $summary = [ordered]@{ schemaVersion = 1; finding = 'diagnostic-invalid'; exitCode = 2; lifecycleStatus = 'not-tested' } }
  Set-CheckIncomplete $summary 'check-incomplete'
} finally {
  if ($null -ne $context) {
    try { Complete-CheckContext $context; $summary.cleanup = $true }
    catch { $summary.cleanup = $false; Set-CheckIncomplete $summary 'cleanup-or-integrity-failed' }
  }
}
if ($null -ne $output) {
  try { Write-CheckJson (Join-Path $output 'thumbnail-check-summary.json') $summary }
  catch { Set-CheckIncomplete $summary 'output-incomplete' }
}
$code = $summary.exitCode
if ($helpersLoaded) { Write-Output (Get-CheckMessage $summary.finding) }
else { Write-Output '진단을 시작하지 못했습니다. Windows x64 PowerShell 5.1·입력·진단 묶음·조직 보안 정책을 확인하세요.' }
Write-Output "Result=$($summary.finding); ExitCode=$code"
exit $code
