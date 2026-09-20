. (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')

function Get-ContextExpectedLabels {
  $labels = @('environment')
  $ids = @('small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg')
  foreach ($id in $ids) { $labels += "$id-shell" }
  $labels += @('association-hwp', 'association-hwpx')
  foreach ($mode in @('cache-only', 'force-extract')) { foreach ($id in $ids) { $labels += "$id-$mode" } }
  return @($labels + 'activation')
}

function Assert-ContextPhaseEvidence($Phase, $Directory) {
  $labels = @(Get-ContextExpectedLabels)
  Assert-Context ($Phase.schemaVersion -eq 1 -and $Phase.status -eq 'observed' -and $Phase.cleanup -eq $true -and $Phase.integrityChecks -eq 12) 'incomplete-phase'
  Assert-Context ($Phase.probes.Count -eq $labels.Count -and @($Phase.probes.label | Select-Object -Unique).Count -eq $labels.Count) 'missing-or-duplicate-probe'
  Assert-Context ($Phase.context.status -eq 'ok' -and $Phase.context.sameUser) 'missing-context'
  for ($i = 0; $i -lt $labels.Count; $i++) {
    $record = $Phase.probes[$i]
    Assert-Context ($record.label -ceq $labels[$i]) 'probe-order-mismatch'
    if ($record.label -eq 'environment') {
      Assert-Context ($record.result.mode -eq 'state' -and $record.result.status -eq 'collected') 'invalid-environment-probe'
    } else {
      $contractLabel = if ($record.label -eq 'activation') { 'context-activate' } else { "context-$($record.label)" }
      Assert-Context (Test-ThumbnailProbeContract $record.result $contractLabel) 'invalid-probe-contract'
    }
    $stored = Get-Content -LiteralPath (Join-Path $Directory "$($record.label).json") -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Context (Test-ContextEqual $stored $record.result) 'raw-probe-mismatch'
    if ($stored.status -in @('ok', 'collected')) { Assert-Context ($record.exitCode -eq 0) 'probe-exit-mismatch' }
    else { Assert-Context ($stored.status -eq 'failed' -and $record.exitCode -eq 1 -and $stored.hresult -match '^0x[89A-F][0-9A-F]{7}$') 'invalid-probe-failure' }
  }
  $environment = $Phase.probes[0].result.environment
  Assert-Context ($environment.token.status -eq 'ok' -and $environment.is64BitProcess -and $environment.apartment -eq 'STA' -and $environment.sessionId -eq $Phase.context.session -and $environment.token.elevated -eq $Phase.context.elevated -and $environment.token.integrityRid -eq $Phase.context.integrityRid) 'probe-context-mismatch'
}

function Test-ContextBitmap($Probe) {
  return Test-ThumbnailBitmap $Probe
}

function Get-ContextFinding($Phase) {
  $probes = $Phase.probes
  $activation = @($probes | Where-Object { $_.label -eq 'activation' })
  $association = @($probes | Where-Object { $_.label -like 'association-*' })
  $control = @($probes | Where-Object { $_.label -in @('control-jpg-shell', 'control-jpg-force-extract') })
  $documents = @($probes | Where-Object { $_.label -match '^(small-hwp|large-hwp|form-hwpx)-(shell|force-extract)$' })
  if ($activation.Count -ne 1 -or $association.Count -ne 2 -or $control.Count -ne 2 -or $documents.Count -ne 6) { return 'invalid' }
  if (@($control | Where-Object { -not (Test-ContextBitmap $_.result) }).Count) { return 'control-failed' }
  if (@($association | Where-Object { $_.result.status -ne 'ok' -or $_.result.resolvedHandler -ine '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}' }).Count -or $activation[0].result.status -ne 'ok') { return 'registration-or-activation-failed' }
  if (@($documents | Where-Object { -not (Test-ContextBitmap $_.result) }).Count -eq 0) { return 'thumbnail-api-ok' }
  if (@($documents | Where-Object { $_.result.status -ne 'failed' -or $_.result.hresult -cne '0x80040154' -or $_.result.phase -notin @('IShellItemImageFactory.GetImage', 'IThumbnailCache.GetThumbnail') }).Count -eq 0) { return 'shell-class-not-registered' }
  return 'mixed-or-unclassified'
}
