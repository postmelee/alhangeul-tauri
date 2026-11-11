[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Root,
  [ValidateSet('runner', 'standard')][string]$Context,
  [switch]$CIConsent
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $CIConsent -or -not [Environment]::Is64BitProcess -or [Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'requires-consented-windows-x64' }
Add-Type -Path (Join-Path $PSScriptRoot 'windows-thumbnail-token.cs')
$output = Join-Path $Root 'evidence'
$report = [ordered]@{ schemaVersion = 1; context = $Context; status = 'invalid'; operation = 'preflight'; errorCode = $null; token = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read(); installExit = $null; uninstallExit = $null; binaries = @(); probes = @(); cleanup = $false }
$handlerKey = 'HKCU:\Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32'
$installDirectory = $null
$productInput = Get-Content -LiteralPath (Join-Path $Root 'input.json') -Raw | ConvertFrom-Json
$acceptance = $productInput.mode -ceq 'fresh-standard-acceptance'
if ($productInput.mode -cnotin @('public-observation', 'fresh-standard-acceptance') -or ($acceptance -and $Context -ne 'standard')) { throw 'invalid-product-input' }
$report['inputMode'] = $productInput.mode
$report['installerSha256'] = $productInput.installerSha256
$report['reinstallExit'] = $null
$upgrade = $acceptance -and $productInput.scenario -ceq 'public-upgrade'
$report['scenario'] = $(if ($acceptance) { $productInput.scenario } else { 'observation' })
$report['baselineInstallExit'] = $null
$report['baselineVerified'] = $false
$dataSentinels = @()
$report['userDataPreserved'] = $null

function Invoke-OwnedProcess($Path, $Arguments) {
  $p = Start-Process -FilePath $Path -ArgumentList $Arguments -PassThru
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit(180000)) { $p.Kill(); throw 'owned-process-timeout' }
    $p.Refresh(); return $p.ExitCode
  } finally { $p.Dispose() }
}
function Invoke-Observation($Name, $Mode, $InputValue) {
  $path = Join-Path $output ($Name + '.json')
  & (Join-Path $PSScriptRoot 'windows-thumbnail-diagnostics.ps1') -Mode $Mode -InputPath $InputValue -OutputPath $path -TimeoutSeconds 45 | Out-Null
  $code = $LASTEXITCODE
  $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $report.probes += [ordered]@{ name = $Name; exitCode = $code; result = $raw }
}
function Assert-InstalledBinaries {
  foreach ($expected in $productInput.binaries) {
    if ($expected.name -cnotin @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) { throw 'invalid-binary-name' }
    $file = Get-Item -LiteralPath (Join-Path $installDirectory $expected.name)
    if ($file.Length -ne $expected.bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected.sha256) { throw 'installed-binary-mismatch' }
  }
}
function Invoke-ProbeSet($Phase) {
  Invoke-Observation ($Phase + '-environment') 'state' ''
  $fixtures = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($mode in @('shell', 'force-extract')) {
    foreach ($fixture in $fixtures) {
      $source = Join-Path $Root $fixture.path
      if ((Get-Item -LiteralPath $source).Length -ne $fixture.bytes -or (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'fixture-hash-mismatch' }
      $copy = Join-Path $output ($fixture.id + '-' + $mode + '-' + [Guid]::NewGuid().ToString('N') + [IO.Path]::GetExtension($source))
      Copy-Item -LiteralPath $source -Destination $copy
      try { Invoke-Observation ($Phase + '-' + $fixture.id + '-' + $mode) $mode $copy }
      finally { Remove-Item -LiteralPath $copy }
    }
  }
  Invoke-Observation ($Phase + '-association-hwp') 'association' '.hwp'
  Invoke-Observation ($Phase + '-association-hwpx') 'association' '.hwpx'
  Invoke-Observation ($Phase + '-activation') 'activate' ''
}
try {
  if ($report.token.status -ne 'ok') { throw 'token-unreadable' }
  if ($Context -eq 'standard' -and ($report.token.elevated -or $report.token.integrityRid -ne 8192)) { throw 'not-standard-user' }
  if ($Context -eq 'runner' -and (-not $report.token.elevated -or $report.token.integrityRid -ne 12288)) { throw 'not-elevated-runner' }
  if (Test-Path -LiteralPath $handlerKey) { throw 'preexisting-handler' }
  # Alternate credentials load HKCU, but the launcher can inherit the runner's TEMP/profile variables.
  # Use this token's known folders only in this owned process; no machine/user policy is modified.
  $profile = [Environment]::GetFolderPath('UserProfile')
  $local = [Environment]::GetFolderPath('LocalApplicationData')
  $roaming = [Environment]::GetFolderPath('ApplicationData')
  if ([string]::IsNullOrWhiteSpace($profile) -or [string]::IsNullOrWhiteSpace($local)) { throw 'profile-unavailable' }
  $report['inheritedProfileMatches'] = $env:USERPROFILE -ieq $profile
  $report['inheritedLocalAppDataMatches'] = $env:LOCALAPPDATA -ieq $local
  $temp = Join-Path $local 'Temp'
  [void][IO.Directory]::CreateDirectory($temp)
  foreach ($entry in @{ USERPROFILE = $profile; LOCALAPPDATA = $local; APPDATA = $roaming; TEMP = $temp; TMP = $temp }.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
  }
  $report.operation = 'install'
  $installer = Join-Path $Root 'installer.exe'
  if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -cne $productInput.installerSha256) { throw 'installer-hash-mismatch' }
  if ($upgrade) {
    $baseline = Join-Path $Root 'baseline.exe'
    if ((Get-FileHash -LiteralPath $baseline -Algorithm SHA256).Hash.ToLowerInvariant() -cne $productInput.baseline.installerSha256) { throw 'baseline-hash-mismatch' }
    $report.baselineInstallExit = Invoke-OwnedProcess $baseline '/S'
    if ($report.baselineInstallExit -ne 0) { throw 'baseline-install-failed' }
    $installDirectory = Split-Path -Parent (Get-Item -LiteralPath $handlerKey).GetValue('')
    foreach ($expected in $productInput.baseline.binaries) {
      $file = Get-Item -LiteralPath (Join-Path $installDirectory $expected.name)
      if ($file.Length -ne $expected.bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected.sha256) { throw 'baseline-binary-mismatch' }
    }
    $report.baselineVerified = $true
    $report.operation = 'probe-public-baseline'
    Invoke-ProbeSet 'baseline'
    foreach ($dataRoot in @($local, $roaming)) {
      $directory = Join-Path $dataRoot 'io.github.postmelee.alhangeul'
      [void][IO.Directory]::CreateDirectory($directory)
      $sentinel = Join-Path $directory ('task132-' + [Guid]::NewGuid().ToString('N') + '.txt')
      [IO.File]::WriteAllText($sentinel, 'synthetic user data preservation probe')
      $dataSentinels += [ordered]@{ path = $sentinel; hash = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash }
    }
  }
  $report.installExit = Invoke-OwnedProcess $installer $(if ($upgrade) { '/S /UPDATE' } else { '/S' })
  if ($report.installExit -ne 0) { throw 'install-failed' }
  $handler = (Get-Item -LiteralPath $handlerKey).GetValue('')
  $installDirectory = Split-Path -Parent $handler
  if ([IO.Path]::GetFileName($handler) -cne 'AlhangeulThumbnailHandler.dll' -or -not [IO.Path]::IsPathRooted($handler)) { throw 'invalid-handler-path' }
  foreach ($name in @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) {
    $file = Get-Item -LiteralPath (Join-Path $installDirectory $name)
    $report.binaries += [ordered]@{ name = $name; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  Assert-InstalledBinaries
  $report.operation = 'probe-installed'
  Invoke-ProbeSet 'installed'
  if ($acceptance) {
    $report.operation = 'reinstall'
    $report.reinstallExit = Invoke-OwnedProcess $installer '/S /UPDATE'
    if ($report.reinstallExit -ne 0) { throw 'reinstall-failed' }
    Assert-InstalledBinaries
    $report.operation = 'probe-reinstalled'
    Invoke-ProbeSet 'reinstalled'
  }
  if ($upgrade) {
    $report.operation = 'explorer-observation'
    & (Join-Path $PSScriptRoot 'windows-thumbnail-user-visual.ps1') -Root $Root
  }
  $report.status = 'observed'
} catch {
  $report.errorCode = $_.Exception.HResult
  $report['failure'] = $_.Exception.Message
} finally {
  try {
    if ($installDirectory) {
      $report.uninstallExit = Invoke-OwnedProcess (Join-Path $installDirectory 'uninstall.exe') '/S'
      for ($i = 0; $i -lt 90 -and (Test-Path -LiteralPath $installDirectory); $i++) { Start-Sleep -Seconds 1 }
      $remaining = @()
      if (Test-Path -LiteralPath $installDirectory) {
        $remaining = @(Get-ChildItem -LiteralPath $installDirectory -Force | ForEach-Object { [ordered]@{ name = $_.Name; directory = $_.PSIsContainer } })
      }
      $report['uninstallState'] = [ordered]@{ directoryExists = Test-Path -LiteralPath $installDirectory; handlerRegistered = Test-Path -LiteralPath $handlerKey; remaining = $remaining }
      # Preserve product uninstall failure before any test-owned cleanup. This is not product acceptance.
      $report['productUninstallPassed'] = $report.uninstallExit -eq 0 -and -not $report.uninstallState.directoryExists -and -not $report.uninstallState.handlerRegistered
      if (-not $report.productUninstallPassed) {
        if ($acceptance) { throw 'product-uninstall-failed' }
        $loaders = @()
        foreach ($process in @(Get-Process dllhost -ErrorAction SilentlyContinue)) {
          try {
            $loaded = @($process.Modules | Where-Object { $_.FileName -ieq $handler }).Count -gt 0
            $loaders += [ordered]@{ pid = $process.Id; loaded = $loaded; readable = $true }
          } catch { $loaders += [ordered]@{ pid = $process.Id; loaded = $null; readable = $false } }
          finally { $process.Dispose() }
        }
        $report['handlerLoaders'] = $loaders
        $report['ownedResidualRemoval'] = [ordered]@{ attempted = $false; removed = $false; errorCode = $null }
        # One exact, hashed, non-reparse file in this disposable installation; never remove a shared host.
        if (-not $report.uninstallState.handlerRegistered -and $remaining.Count -eq 1 -and $remaining[0].name -ceq 'AlhangeulThumbnailHandler.dll') {
          $entry = Get-Item -LiteralPath $handler
          $expected = @($report.binaries | Where-Object { $_.name -ceq $entry.Name })
          if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $expected.Count -ne 1 -or
              (Get-FileHash -LiteralPath $handler -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected[0].sha256) { throw 'unexpected-residual' }
          $report.ownedResidualRemoval.attempted = $true
          try {
            [IO.File]::Delete($handler)
            [IO.Directory]::Delete($installDirectory, $false)
            $report.ownedResidualRemoval.removed = -not (Test-Path -LiteralPath $installDirectory)
          } catch { $report.ownedResidualRemoval.errorCode = $_.Exception.HResult }
        }
        if (Test-Path -LiteralPath $installDirectory) { throw 'uninstall-residual-locked' }
      }
    }
    if ($upgrade) {
      $report.userDataPreserved = $dataSentinels.Count -eq 2
      foreach ($sentinel in $dataSentinels) {
        if (-not (Test-Path -LiteralPath $sentinel.path) -or (Get-FileHash -LiteralPath $sentinel.path -Algorithm SHA256).Hash -cne $sentinel.hash) { $report.userDataPreserved = $false }
      }
      if (-not $report.userDataPreserved) { throw 'user-data-preservation-failed' }
    }
    $report.cleanup = $true
  } catch { $report['cleanupError'] = $_.Exception.HResult; $report.status = 'invalid' }
  $report | ConvertTo-Json -Depth 24 | Set-Content -LiteralPath (Join-Path $output 'observation.json') -Encoding UTF8
}
if ($report.status -ne 'observed' -or -not $report.cleanup) { exit 2 }
# Observation only; raw Shell failures are preserved, never converted into product acceptance.
exit 0
