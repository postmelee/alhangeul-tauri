#requires -version 5.1
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Install', 'Uninstall')]
  [string]$Action,
  [Parameter(Mandatory = $true)]
  [ValidateSet('msi', 'nsis')]
  [string]$InstallerKind,
  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [Parameter(Mandatory = $true)]
  [string]$StatePath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Condition($Condition, $Message) {
  if (-not $Condition) { throw $Message }
}

function Get-InstallDirectory($Kind) {
  if ($Kind -eq 'msi') { return (Join-Path $env:ProgramFiles 'Alhangeul') }
  return (Join-Path $env:LOCALAPPDATA 'Alhangeul')
}

function Resolve-Installer($Root, $Kind) {
  $rootItem = Get-Item -LiteralPath $Root -ErrorAction Stop
  Assert-Condition $rootItem.PSIsContainer 'artifact root는 directory여야 합니다.'
  $extension = if ($Kind -eq 'msi') { '.msi' } else { '.exe' }
  $files = @(Get-ChildItem -LiteralPath $rootItem.FullName -Recurse -File |
      Where-Object { $_.Extension -ieq $extension })
  Assert-Condition ($files.Count -eq 1) "$Kind installer는 정확히 1개여야 합니다: $($files.Count)개"
  return $files[0].FullName
}

function Get-MsiProductCode {
  $roots = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
  )
  $matches = @()
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($key in Get-ChildItem -LiteralPath $root) {
      $entry = Get-ItemProperty -LiteralPath $key.PSPath
      $displayName = $entry.PSObject.Properties['DisplayName']
      if ($null -ne $displayName -and $displayName.Value -eq 'Alhangeul') {
        $matches += $key.PSChildName
      }
    }
  }
  $matches = @($matches | Select-Object -Unique)
  Assert-Condition ($matches.Count -le 1) "Alhangeul MSI product code가 여러 개입니다: $($matches.Count)개"
  if ($matches.Count -eq 0) { return $null }
  return [string]$matches[0]
}

function Get-OwnedProcesses($Executable) {
  $expected = [IO.Path]::GetFullPath($Executable)
  $owned = @()
  foreach ($process in @(Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue)) {
    try {
      if ([IO.Path]::GetFullPath($process.Path) -ieq $expected) { $owned += $process }
    } catch { continue }
  }
  return $owned
}

function Stop-OwnedProcesses($Executable) {
  $stopped = @()
  foreach ($process in @(Get-OwnedProcesses $Executable)) {
    Stop-Process -Id $process.Id -Force
    Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
    $stopped += $process.Id
  }
  return $stopped
}

function Invoke-Process($FilePath, $Arguments) {
  $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru
  Assert-Condition ($process.ExitCode -eq 0) "$FilePath exit code가 0이 아닙니다: $($process.ExitCode)"
  return $process.ExitCode
}

function Write-Json($Path, $Value) {
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Wait-ForPathGone($Path) {
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Start-Sleep -Seconds 1
  }
  throw "제거 뒤 install directory가 남아 있습니다: $Path"
}

function Invoke-GuiInstall($Kind, $Installer, $Output, $StateFile) {
  $installDirectory = Get-InstallDirectory $Kind
  $executable = Join-Path $installDirectory 'Alhangeul.exe'
  Assert-Condition (-not (Test-Path -LiteralPath $installDirectory)) '설치 전 install directory가 남아 있습니다.'
  Assert-Condition (@(Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue).Count -eq 0) '설치 전 Alhangeul process가 남아 있습니다.'
  $logPath = Join-Path $Output "$Kind-install.log"
  if ($Kind -eq 'msi') {
    [void](Invoke-Process 'msiexec.exe' @('/i', "`"$Installer`"", '/qn', '/norestart', '/L*v', "`"$logPath`""))
  } else {
    [void](Invoke-Process $Installer @('/S'))
  }
  Assert-Condition (Test-Path -LiteralPath $executable -PathType Leaf) '설치된 Alhangeul.exe가 없습니다.'
  $productCode = if ($Kind -eq 'msi') { Get-MsiProductCode } else { $null }
  if ($Kind -eq 'msi') { Assert-Condition (-not [string]::IsNullOrWhiteSpace($productCode)) 'MSI product code를 찾지 못했습니다.' }
  $state = [ordered]@{
    SchemaVersion = 1; Kind = $Kind; Installer = $Installer
    InstallDirectory = $installDirectory; Executable = $executable
    ProductCode = $productCode; InstalledAt = [DateTime]::UtcNow.ToString('o')
  }
  Write-Json $StateFile $state
  return $state
}

function Read-GuiState($Kind, $StateFile) {
  if (Test-Path -LiteralPath $StateFile -PathType Leaf) {
    $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    Assert-Condition ($state.SchemaVersion -eq 1) 'GUI installer state schema가 다릅니다.'
    Assert-Condition ($state.Kind -eq $Kind) 'GUI installer state kind가 다릅니다.'
    return $state
  }
  $installDirectory = Get-InstallDirectory $Kind
  return [pscustomobject]@{
    SchemaVersion = 1; Kind = $Kind; InstallDirectory = $installDirectory
    Executable = (Join-Path $installDirectory 'Alhangeul.exe'); ProductCode = $null
  }
}

function Invoke-GuiUninstall($Kind, $Output, $StateFile) {
  $state = Read-GuiState $Kind $StateFile
  $stopped = @(Stop-OwnedProcesses $state.Executable)
  $logPath = Join-Path $Output "$Kind-uninstall.log"
  if ($Kind -eq 'msi') {
    $productCode = if ($state.ProductCode) { [string]$state.ProductCode } else { Get-MsiProductCode }
    if (-not [string]::IsNullOrWhiteSpace($productCode)) {
      [void](Invoke-Process 'msiexec.exe' @('/x', $productCode, '/qn', '/norestart', '/L*v', "`"$logPath`""))
    }
  } else {
    $uninstaller = Join-Path $state.InstallDirectory 'uninstall.exe'
    if (Test-Path -LiteralPath $uninstaller -PathType Leaf) {
      [void](Invoke-Process $uninstaller @('/S'))
    }
  }
  Wait-ForPathGone $state.InstallDirectory
  Assert-Condition (@(Get-OwnedProcesses $state.Executable).Count -eq 0) '제거 뒤 owned Alhangeul process가 남아 있습니다.'
  return [ordered]@{
    SchemaVersion = 1; Kind = $Kind; StoppedProcessIds = $stopped
    ResidueFree = $true; UninstalledAt = [DateTime]::UtcNow.ToString('o')
  }
}

# Main
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$summaryPath = Join-Path $OutputDirectory "$InstallerKind-$($Action.ToLowerInvariant())-summary.json"
$summary = [ordered]@{
  SchemaVersion = 1; Action = $Action; Kind = $InstallerKind
  StartedAt = [DateTime]::UtcNow.ToString('o'); Status = 'failed'
}
try {
  if ($Action -eq 'Install') {
    $installer = Resolve-Installer $ArtifactRoot $InstallerKind
    $summary.Result = Invoke-GuiInstall $InstallerKind $installer $OutputDirectory $StatePath
  } else {
    $summary.Result = Invoke-GuiUninstall $InstallerKind $OutputDirectory $StatePath
  }
  $summary.Status = 'passed'
} catch {
  $summary.Error = $_.Exception.Message
} finally {
  $summary.FinishedAt = [DateTime]::UtcNow.ToString('o')
  Write-Json $summaryPath $summary
}
if ($summary.Status -ne 'passed') {
  Write-Error "Windows GUI installer $Action 실패: $summaryPath" -ErrorAction Continue
  exit 1
}
Write-Output "Windows GUI installer $Action passed: $summaryPath"
