# Pure validation of installed native suite replies; never accepts diagnostic-invalid.
. (Join-Path $PSScriptRoot 'windows-thumbnail-check-assessment.ps1')
function Assert-AppDiagnostic($Suite, $Inventory, $Kind, $Version, $LegacyProbes) {
  Assert-Condition ($Suite.status -ceq 'completed' -and $Suite.cleanup -eq $true) 'App suite incomplete or cleanup unverified.'
  $inspection = $Suite.inspection
  $reference = $inspection.buildReference
  Assert-Condition ($reference.schemaVersion -eq 1 -and $Inventory.sourceSha -cmatch '^[a-f0-9]{40}$' -and $reference.sourceSha -ceq $Inventory.sourceSha -and $reference.productVersion -ceq $Version) 'App reference does not match product source/version.'
  Assert-Condition ($inspection.installKind -ceq $Kind -and $inspection.installRecordsReadable -eq $true) 'App installation identity mismatch.'
  Assert-Condition ($reference.files.Count -eq 2 -and $inspection.registration.Count -eq 2) 'App reference or registration incomplete.'
  foreach ($pair in @(@('AlhangeulThumbnailHandler.dll', 'thumbnail-handler'), @('AlhangeulThumbnailWorker.exe', 'thumbnail-worker'))) {
    $actual = @($reference.files | Where-Object { $_.name -ceq $pair[0] })
    $expected = @($Inventory.files | Where-Object { $_.kind -ceq $pair[1] })
    Assert-Condition ($actual.Count -eq 1 -and $expected.Count -eq 1 -and $actual[0].sha256 -ceq $expected[0].sha256 -and $actual[0].bytes -eq $expected[0].size) 'App embedded binary reference mismatch.'
  }
  $scope = if ($Kind -eq 'nsis') { 'user-only' } else { 'machine-only' }
  foreach ($registration in $inspection.registration) {
    Assert-Condition ($registration.ready -eq $true -and $registration.referenceMatched -eq $true -and $registration.scope -ceq $scope) 'App registration preflight failed.'
  }
  Assert-Condition ($Suite.formats.Count -eq 2) 'App suite formats missing.'
  $findings = @()
  foreach ($extension in @('.hwp', '.hwpx')) {
    $rows = @($Suite.formats | Where-Object { $_.input.extension -ceq $extension })
    Assert-Condition ($rows.Count -eq 1) 'App format missing or duplicated.'
    $format = $rows[0]; $inputValue = $format.input
    Assert-Condition ($inputValue.integrity -eq $true -and $inputValue.cleanup -eq $true -and $inputValue.registrationStable -eq $true) 'App format evidence incomplete.'
    Assert-Condition ($inputValue.registration.ready -eq $true -and $inputValue.registration.referenceMatched -eq $true -and $inputValue.registration.scope -ceq $scope) 'App format registration mismatch.'
    $registration = [pscustomobject]@{ ready = $true; registrationScope = $scope }
    $assessment = Get-CheckAssessment $inputValue.probes $registration $extension $true
    Assert-Condition ($assessment.evidenceStatus -ceq 'valid' -and $assessment.finding -cin @('thumbnail-api-ok', 'per-user-shell-activation-failed')) 'App probes failed independent assessment.'
    $passed = $assessment.finding -ceq 'thumbnail-api-ok'
    Assert-Condition ($format.assessment.evidenceValid -eq $true -and $format.assessment.finding -ceq $assessment.finding -and $format.assessment.recommendedAction -ceq $assessment.recommendedAction -and $format.assessment.thumbnailPassed -eq $passed) 'App reported assessment differs from raw probes.'
    $fixture = if ($extension -eq '.hwp') { 'small-hwp' } else { 'form-hwpx' }
    $pair = @($LegacyProbes | Where-Object { $_.Label -cin @("initial-$fixture-shell", "initial-$fixture-force-extract") } | ForEach-Object { $_.Result })
    Assert-Condition ($pair.Count -eq 2) 'Initial Shell observation missing.'
    $expected = Get-ThumbnailDocumentFinding $pair ($Kind -eq 'nsis') $true
    Assert-Condition ($assessment.finding -ceq $expected) 'App generated fixture and initial public fixture disagree; investigate, do not waive.'
    $findings += [ordered]@{ extension = $extension; finding = $assessment.finding; thumbnailPassed = $passed }
  }
  return $findings
}

function Get-AppDiagnosticEvidence($Suite) {
  # Deliberate projection: no native stateToken, paths, exception or bitmap bytes.
  $output = @()
  if ($null -eq $Suite) { return $output }
  foreach ($format in $Suite.formats) {
    if ($format.input.extension -cnotin @('.hwp', '.hwpx')) { continue }
    $probes = @()
    foreach ($record in $format.input.probes) {
      if ($record.Label -cnotin @(Get-CheckLabels $format.input.extension)) { continue }
      $probe = $record.Result
      $phase = if ($probe.phase -cin @('input.shellPath', 'AssocQueryStringW', 'CoCreateInstance.handler', 'SHCreateItemFromParsingName.imageFactory', 'SHCreateItemFromParsingName.shellItem', 'IShellItemImageFactory.GetImage', 'CoCreateInstance.thumbnailCache', 'IThumbnailCache.GetThumbnail', 'ISharedBitmap.GetSharedBitmap')) { $probe.phase } else { 'unknown' }
      $code = if ($probe.hresult -cmatch '^0x[0-9A-F]{8}$') { $probe.hresult } else { $null }
      $bitmap = if ($probe.bitmapPresent -is [bool]) { $probe.bitmapPresent } else { $null }
      $probes += [ordered]@{ label = $record.Label; phase = $phase; hresult = $code; bitmapPresent = $bitmap }
    }
    $output += [ordered]@{ extension = $format.input.extension; probes = $probes }
  }
  return $output
}
