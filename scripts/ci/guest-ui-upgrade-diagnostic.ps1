# Diagnostic only: never replaces the original-path upgrade acceptance result.
function Measure-GuestUpgradeFailure {
  $failed = @($report.upgradeProbes | Where-Object { $_.status -ne 'ok' -or -not $_.bitmapPresent })[0]
  $fixtures = (Get-Content (Join-Path $root 'scripts\windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  $fixture = @($fixtures | Where-Object id -eq $failed.id)[0]
  $source = Join-Path $root $fixture.path
  $copyRoot = Join-Path $output 'upgrade-diagnostic-copy'
  New-Item -ItemType Directory -Path $copyRoot | Out-Null
  $copy = Join-Path $copyRoot ($fixture.id + [IO.Path]::GetExtension($source))
  Copy-Item -LiteralPath $source -Destination $copy
  if ((Get-FileHash $copy -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'diagnostic-copy-hash-mismatch' }
  $fresh = Join-Path $output 'upgrade-fresh-path.json'
  & (Join-Path $root 'scripts\windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath $copy -OutputPath $fresh
  $report['upgradeDiagnostic'] = @{
    id = $fixture.id; fixtureSha256 = $fixture.sha256
    sourceAttributes = [string](Get-Item $source).Attributes; copyAttributes = [string](Get-Item $copy).Attributes
    freshPath = (Get-Content $fresh -Raw | ConvertFrom-Json); originalResultPreserved = $true
  }
  $timer = [Diagnostics.Stopwatch]::StartNew()
  Start-Sleep -Seconds 60
  $later = Join-Path $output 'upgrade-same-path-later.json'
  & (Join-Path $root 'scripts\windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath $source -OutputPath $later
  $report.upgradeDiagnostic['samePathAfterWait'] = Get-Content $later -Raw | ConvertFrom-Json
  $report.upgradeDiagnostic['waitAndProbeMs'] = $timer.ElapsedMilliseconds
  $timer.Stop()
}
