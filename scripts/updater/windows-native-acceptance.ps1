[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidateSet('Install', 'Validate', 'Cleanup')][string]$Phase,
  [Parameter(Mandatory = $true)][ValidateSet('msi', 'nsis')][string]$Kind,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$ArtifactRoot,
  [string]$ExpectedVersion
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
$installDirectory = if ($Kind -eq 'msi') { Join-Path $env:ProgramFiles 'Alhangeul' } else { Join-Path $env:LOCALAPPDATA 'Alhangeul' }
$executable = Join-Path $installDirectory 'Alhangeul.exe'
$baselinePath = Join-Path $OutputDirectory 'defaults-before.json'
$summaryPath = Join-Path $OutputDirectory "$($Phase.ToLowerInvariant()).json"

function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
. (Join-Path $PSScriptRoot '..\windows-installer-smoke-support.ps1')

function Get-ProductState {
  $entries = @(Get-UninstallEntries)
  $entry = @($entries | Where-Object {
    ($Kind -eq 'msi' -and $_.Hive -eq 'HKLM' -and $_.View -eq 'Registry64') -or
    ($Kind -eq 'nsis' -and $_.Hive -eq 'HKCU')
  }) | Select-Object -First 1
  $handlers = @()
  for ($index = 0; $index -lt $extensions.Count; $index += 1) {
    $handlers += Get-HandlerState $extensions[$index] $canonicalProgIds[$index] $executable
  }
  return [ordered]@{
    Kind = $Kind
    InstallDirectory = $installDirectory
    Executable = $executable
    Entry = $entry
    Version = if (Test-Path -LiteralPath $executable -PathType Leaf) { Get-VersionState $executable } else { $null }
    Handlers = $handlers
  }
}

function Assert-ProductState($State, $Version) {
  Assert-Condition ($Version -match '^\d+\.\d+\.\d+$') 'ExpectedVersion은 3성분 version이어야 합니다.'
  Assert-Condition (Test-Path -LiteralPath $State.Executable -PathType Leaf) '설치된 Alhangeul.exe가 없습니다.'
  Assert-Condition ($null -ne $State.Entry) 'Alhangeul uninstall entry가 없습니다.'
  Assert-Condition ($State.Entry.DisplayName -eq 'Alhangeul') 'DisplayName이 다릅니다.'
  Assert-Condition ($State.Entry.Publisher -eq 'postmelee') 'Publisher가 다릅니다.'
  Assert-Condition ($State.Entry.DisplayVersion -eq $Version) 'DisplayVersion이 다릅니다.'
  Assert-Condition (Test-SamePath $State.Entry.InstallLocation $installDirectory) 'InstallLocation이 다릅니다.'
  Assert-Condition ((ConvertTo-NormalizedVersion $State.Version.ProductVersion) -eq $Version) 'ProductVersion이 다릅니다.'
  Assert-Condition ((ConvertTo-NormalizedVersion $State.Version.FileVersion) -eq $Version) 'FileVersion이 다릅니다.'
  Assert-Condition (@($State.Handlers | Where-Object { -not $_.Valid }).Count -eq 0) 'HWP/HWPX handler가 보존되지 않았습니다.'
}

function Resolve-Installer {
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($ArtifactRoot)) 'Install phase에는 ArtifactRoot가 필요합니다.'
  $files = @(Get-ChildItem -LiteralPath $ArtifactRoot -Recurse -File)
  $installers = @(if ($Kind -eq 'msi') {
    $files | Where-Object { $_.Extension -ieq '.msi' }
  } else {
    $files | Where-Object { $_.Name -like '*-setup.exe' }
  })
  Assert-Condition ($installers.Count -eq 1) "$Kind N installer가 정확히 하나가 아닙니다."
  return $installers[0].FullName
}

function Invoke-Install($Path) {
  $logPath = Join-Path $OutputDirectory "$Kind-install.log"
  if ($Kind -eq 'msi') {
    $arguments = @('/i', "`"$Path`"", '/qn', '/norestart', '/L*v', "`"$logPath`"")
    return (Start-Process -FilePath 'msiexec.exe' -ArgumentList $arguments -Wait -PassThru).ExitCode
  }
  return (Start-Process -FilePath $Path -ArgumentList @('/S') -Wait -PassThru).ExitCode
}

function Invoke-Cleanup {
  Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue | Stop-Process -Force
  $state = Get-ProductState
  if ($null -eq $state.Entry -and -not (Test-Path -LiteralPath $installDirectory)) { return 0 }
  if ($Kind -eq 'msi') {
    Assert-Condition ($null -ne $state.Entry) 'MSI ProductCode를 찾을 수 없습니다.'
    $logPath = Join-Path $OutputDirectory 'msi-uninstall.log'
    $arguments = @('/x', $state.Entry.KeyName, '/qn', '/norestart', '/L*v', "`"$logPath`"")
    return (Start-Process -FilePath 'msiexec.exe' -ArgumentList $arguments -Wait -PassThru).ExitCode
  }
  $uninstaller = if ($null -ne $state.Entry -and $state.Entry.UninstallString) {
    $state.Entry.UninstallString.Trim().Trim('"')
  } else { Join-Path $installDirectory 'uninstall.exe' }
  Assert-Condition (Test-Path -LiteralPath $uninstaller -PathType Leaf) 'NSIS uninstaller가 없습니다.'
  return (Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru).ExitCode
}

function Write-Summary($Value) {
  $Value | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
}

function Write-AppPathOutput {
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_OUTPUT)) {
    "app_path=$executable" | Add-Content -LiteralPath $env:GITHUB_OUTPUT -Encoding UTF8
  }
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$summary = [ordered]@{ SchemaVersion = 1; Phase = $Phase; Kind = $Kind; StartedAt = [DateTime]::UtcNow.ToString('o'); Status = 'failed' }
try {
  if ($Phase -eq 'Install') {
    Assert-Condition (-not (Test-Path -LiteralPath $executable)) 'clean install 전에 Alhangeul.exe가 존재합니다.'
    Assert-Condition (@(Get-UninstallEntries).Count -eq 0) 'clean install 전에 uninstall entry가 존재합니다.'
    Get-DefaultState | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $baselinePath -Encoding UTF8
    $installer = Resolve-Installer
    $summary.Installer = $installer
    $summary.InstallerSha256 = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
    $summary.ExitCode = Invoke-Install $installer
    Assert-Condition ($summary.ExitCode -eq 0) "$Kind installer exit code: $($summary.ExitCode)"
    $summary.Product = Get-ProductState
    Assert-ProductState $summary.Product $ExpectedVersion
    Write-AppPathOutput
  } elseif ($Phase -eq 'Validate') {
    $deadline = [DateTime]::UtcNow.AddMinutes(10)
    do {
      Start-Sleep -Seconds 2
      $summary.Product = Get-ProductState
      $ready = $null -ne $summary.Product.Version -and
        (ConvertTo-NormalizedVersion $summary.Product.Version.ProductVersion) -eq $ExpectedVersion -and
        $null -ne $summary.Product.Entry -and $summary.Product.Entry.DisplayVersion -eq $ExpectedVersion
    } while (-not $ready -and [DateTime]::UtcNow -lt $deadline)
    Assert-Condition $ready 'N+1 설치가 제한 시간 안에 확인되지 않았습니다.'
    Get-Process -Name 'Alhangeul' -ErrorAction SilentlyContinue | Stop-Process -Force
    Assert-ProductState $summary.Product $ExpectedVersion
    $before = Get-Content -LiteralPath $baselinePath -Raw | ConvertFrom-Json
    $after = Get-DefaultState
    Assert-Condition ((ConvertTo-Json $before -Depth 16 -Compress) -eq (ConvertTo-Json $after -Depth 16 -Compress)) '업데이트가 기본 연결 또는 UserChoice를 변경했습니다.'
    $summary.DefaultsPreserved = $true
    Write-AppPathOutput
  } else {
    $summary.ExitCode = Invoke-Cleanup
    Assert-Condition ($summary.ExitCode -eq 0) "$Kind uninstaller exit code: $($summary.ExitCode)"
    Start-Sleep -Seconds 3
    Assert-Condition (-not (Test-Path -LiteralPath $executable)) 'cleanup 뒤 Alhangeul.exe가 남았습니다.'
    Assert-Condition (@(Get-UninstallEntries).Count -eq 0) 'cleanup 뒤 uninstall entry가 남았습니다.'
  }
  $summary.Status = 'passed'
} catch {
  $summary.Error = $_.Exception.Message
  throw
} finally {
  $summary.FinishedAt = [DateTime]::UtcNow.ToString('o')
  Write-Summary $summary
}

Write-Output "Windows updater native $Phase passed: $summaryPath"
