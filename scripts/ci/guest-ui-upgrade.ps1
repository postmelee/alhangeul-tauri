function Assert-GuestBinaries($Binaries, $Directory) {
  foreach ($binary in $Binaries) {
    $name = if ($binary.PSObject.Properties['name']) { $binary.name } else { [IO.Path]::GetFileName($binary.path) }
    $size = if ($binary.PSObject.Properties['bytes']) { $binary.bytes } else { $binary.size }
    $path = Join-Path $Directory $name
    if ((Get-Item $path).Length -ne $size -or (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $binary.sha256) { throw 'installed-binary-mismatch' }
  }
}
function Get-GuestProbes([ValidateSet('baseline', 'upgrade', 'reinstall')][string]$Phase, [switch]$ObserveFailures, [scriptblock]$OnFirstFailure) {
  $observed = @(); $diagnosed = $false
  $fixtures = (Get-Content (Join-Path $root 'scripts\windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in $fixtures) {
    $path = Join-Path $root $fixture.path
    if ((Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'fixture-hash-mismatch' }
    # Keep independent raw evidence for all three phases (within the 20-file bound).
    $probePath = Join-Path $output ('probe-' + $Phase + '-' + $fixture.id + '.json')
    $startedAt = [DateTime]::UtcNow.ToString('o')
    & (Join-Path $root 'scripts\windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath $path -OutputPath $probePath
    $finishedAt = [DateTime]::UtcNow.ToString('o')
    $raw = Get-Content $probePath -Raw | ConvertFrom-Json
    $observed += @{ id = $fixture.id; phase = $Phase; status = $raw.status; bitmapPresent = $raw.bitmapPresent; hresult = $raw.hresult; startedAt = $startedAt; finishedAt = $finishedAt }
    if ($raw.status -notin @('ok', 'failed')) { throw 'invalid-probe-status' }
    if ($ObserveFailures -and $OnFirstFailure -and -not $diagnosed -and ($raw.status -ne 'ok' -or -not $raw.bitmapPresent)) {
      $diagnosed = $true; & $OnFirstFailure $fixture.id | Out-Null
    }
    if (-not $ObserveFailures -and $Phase -ne 'baseline' -and ($raw.status -ne 'ok' -or -not $raw.bitmapPresent)) { throw 'thumbnail-probe-failed' }
  }
  return $observed
}
function Install-GuestBaseline {
  $isMsi = $inputData.scenario -eq 'msi-upgrade'
  $baseline = Join-Path $root $(if ($isMsi) { 'baseline.msi' } else { 'baseline.exe' })
  if ((Get-FileHash $baseline -Algorithm SHA256).Hash.ToLowerInvariant() -cne $inputData.baseline.installerSha256) { throw 'baseline-installer-mismatch' }
  $report['baselineExit'] = if ($isMsi) { Request-GuestAdmin baseline } else { Run-Owned $baseline '/S' }
  if ($report.baselineExit -ne 0) { throw 'baseline-install-failed' }
  $script:directory = Split-Path -Parent (Get-Item -LiteralPath $key).GetValue('')
  Assert-GuestBinaries $inputData.baseline.binaries $directory
  $report['baselineBinariesMatched'] = $true
  if ($isMsi) { $report['baselineRegistration'] = Test-GuestMsiRegistration $inputData.baseline.msiIdentity }
  $report['sentinels'] = @()
  foreach ($folder in @('LocalApplicationData', 'ApplicationData')) {
    $parent = Join-Path ([Environment]::GetFolderPath($folder)) 'io.github.postmelee.alhangeul'
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $path = Join-Path $parent ('task132-' + [guid]::NewGuid().ToString() + '.txt')
    Set-Content $path 'Synthetic Task 132 upgrade preservation check' -Encoding UTF8
    $report.sentinels += @{ folder = $folder; path = $path; sha256 = (Get-FileHash $path -Algorithm SHA256).Hash; preserved = $false }
  }
  $report['baselineProbes'] = @(Get-GuestProbes baseline)
}
function Test-GuestSentinels {
  foreach ($sentinel in $report.sentinels) {
    $sentinel.preserved = (Test-Path $sentinel.path) -and (Get-FileHash $sentinel.path -Algorithm SHA256).Hash -ceq $sentinel.sha256
    if (-not $sentinel.preserved) { throw 'user-data-not-preserved' }
  }
}
