# Pure validation of installed native suite replies; never accepts diagnostic-invalid.
. (Join-Path $PSScriptRoot 'windows-thumbnail-check-assessment.ps1')
function Assert-AppDiagnostic($Suite, $Inventory, $Kind, $Version, $LegacyProbes) {
  $check = 'suite-completion'; $extension = $null
  try {
    Assert-Condition ($Suite.status -ceq 'completed' -and $Suite.cleanup -eq $true) 'App suite incomplete or cleanup unverified.'
    $check = 'reference-identity'
    $inspection = $Suite.inspection
    $reference = $inspection.buildReference
    Assert-Condition ($reference.schemaVersion -eq 1 -and $Inventory.sourceSha -cmatch '^[a-f0-9]{40}$' -and $reference.sourceSha -ceq $Inventory.sourceSha -and $reference.productVersion -ceq $Version) 'App reference does not match product source/version.'
    $check = 'installation-identity'
    Assert-Condition ($inspection.installKind -ceq $Kind -and $inspection.installRecordsReadable -eq $true) 'App installation identity mismatch.'
    $check = 'reference-registration-shape'
    Assert-Condition ($reference.files.Count -eq 2 -and $inspection.registration.Count -eq 2) 'App reference or registration incomplete.'
    $check = 'binary-reference'
    foreach ($pair in @(@('AlhangeulThumbnailHandler.dll', 'thumbnail-handler'), @('AlhangeulThumbnailWorker.exe', 'thumbnail-worker'))) {
      $actual = @($reference.files | Where-Object { $_.name -ceq $pair[0] })
      $expected = @($Inventory.files | Where-Object { $_.kind -ceq $pair[1] })
      Assert-Condition ($actual.Count -eq 1 -and $expected.Count -eq 1 -and $actual[0].sha256 -ceq $expected[0].sha256 -and $actual[0].bytes -eq $expected[0].size) 'App embedded binary reference mismatch.'
    }
    $check = 'registration-preflight'
    $scope = if ($Kind -eq 'nsis') { 'user-only' } else { 'machine-only' }
    foreach ($registration in $inspection.registration) {
      Assert-Condition ($registration.ready -eq $true -and $registration.referenceMatched -eq $true -and $registration.scope -ceq $scope) 'App registration preflight failed.'
    }
    $check = 'format-count'
    Assert-Condition ($Suite.formats.Count -eq 2) 'App suite formats missing.'
    $findings = @()
    foreach ($extension in @('.hwp', '.hwpx')) {
      $check = 'format-identity'
      $rows = @($Suite.formats | Where-Object { $_.input.extension -ceq $extension })
      Assert-Condition ($rows.Count -eq 1) 'App format missing or duplicated.'
      $check = 'format-integrity'
      $format = $rows[0]; $inputValue = $format.input
      Assert-Condition ($inputValue.integrity -eq $true -and $inputValue.cleanup -eq $true -and $inputValue.registrationStable -eq $true) 'App format evidence incomplete.'
      $check = 'format-registration'
      Assert-Condition ($inputValue.registration.ready -eq $true -and $inputValue.registration.referenceMatched -eq $true -and $inputValue.registration.scope -ceq $scope) 'App format registration mismatch.'
      $check = 'independent-assessment'
      $registration = [pscustomobject]@{ ready = $true; registrationScope = $scope }
      $assessment = Get-CheckAssessment $inputValue.probes $registration $extension $true
      Assert-Condition ($assessment.evidenceStatus -ceq 'valid' -and $assessment.finding -cin @('thumbnail-api-ok', 'per-user-shell-activation-failed')) 'App probes failed independent assessment.'
      $check = 'reported-assessment'
      $passed = $assessment.finding -ceq 'thumbnail-api-ok'
      Assert-Condition ($format.assessment.evidenceValid -eq $true -and $format.assessment.finding -ceq $assessment.finding -and $format.assessment.recommendedAction -ceq $assessment.recommendedAction -and $format.assessment.thumbnailPassed -eq $passed) 'App reported assessment differs from raw probes.'
      $check = 'initial-observation'
      $fixture = if ($extension -eq '.hwp') { 'small-hwp' } else { 'form-hwpx' }
      $pair = @($LegacyProbes | Where-Object { $_.Label -cin @("initial-$fixture-shell", "initial-$fixture-force-extract") } | ForEach-Object { $_.Result })
      Assert-Condition ($pair.Count -eq 2) 'Initial Shell observation missing.'
      $check = 'fixture-parity'
      $expected = Get-ThumbnailDocumentFinding $pair ($Kind -eq 'nsis') $true
      Assert-Condition ($assessment.finding -ceq $expected) 'App generated fixture and initial public fixture disagree; investigate, do not waive.'
      $findings += [ordered]@{ extension = $extension; finding = $assessment.finding; thumbnailPassed = $passed }
    }
    return $findings
  } catch {
    # Replace rather than retain the original exception, which may contain paths.
    $failure = [InvalidOperationException]::new('App diagnostic assessment rejected.')
    $failure.Data['AlhangeulAssessmentCode'] = $check
    $failure.Data['AlhangeulAssessmentExtension'] = $extension
    throw $failure
  }
}

function Get-AppAssessmentFailure($ErrorRecord) {
  $allowed = @('suite-completion', 'reference-identity', 'installation-identity', 'reference-registration-shape',
    'binary-reference', 'registration-preflight', 'format-count', 'format-identity', 'format-integrity',
    'format-registration', 'independent-assessment', 'reported-assessment', 'initial-observation', 'fixture-parity')
  $result = [ordered]@{ code = 'unclassified'; extension = $null }
  $exception = $ErrorRecord.Exception
  for ($depth = 0; $null -ne $exception -and $depth -lt 8; $depth++) {
    $code = $exception.Data['AlhangeulAssessmentCode']
    if ($code -is [string] -and $code -cin $allowed) {
      $result.code = $code
      $extension = $exception.Data['AlhangeulAssessmentExtension']
      if ($extension -is [string] -and $extension -cin @('.hwp', '.hwpx')) { $result.extension = $extension }
      break
    }
    $exception = $exception.InnerException
  }
  return $result
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
