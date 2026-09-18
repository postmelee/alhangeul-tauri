# Pure validation of collected replies. No additional native operations on failure.
. (Join-Path $PSScriptRoot 'windows-thumbnail-check-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-app-evidence.ps1')

function Test-AppDiagnosticCondition($Code, $Extension, $Predicate, $Available = $true) {
  $status = 'not-evaluable'
  if ($Available) {
    try {
      $value = & $Predicate
      $status = if ($value -is [bool] -and $value) { 'passed' } else { 'failed' }
    } catch { $status = 'not-evaluable' }
  }
  # Fixed call-site identifiers only; never retain an exception or native text.
  return [pscustomobject]@{ code = $Code; extension = $Extension; status = $status }
}

function Get-AppFormatAssessment($Suite, $Extension, $Kind, $LegacyProbes) {
  $checks = @(); $format = $null; $assessment = $null; $pair = @()
  $scope = if ($Kind -ceq 'nsis') { 'user-only' } else { 'machine-only' }
  $checks += Test-AppDiagnosticCondition 'format-identity' $Extension {
    $rows = @($Suite.formats | Where-Object { $_.input.extension -ceq $Extension })
    $rows.Count -eq 1
  }
  $available = $checks[-1].status -ceq 'passed'
  if ($available) { $format = @($Suite.formats | Where-Object { $_.input.extension -ceq $Extension })[0] }
  $checks += Test-AppDiagnosticCondition 'format-installation' $Extension {
    $format.input.installKind -ceq $Suite.inspection.installKind -and $format.input.installKind -ceq $Kind
  } $available
  $checks += Test-AppDiagnosticCondition 'format-integrity' $Extension {
    (Test-AppEvidenceTrue $format.input.integrity) -and (Test-AppEvidenceTrue $format.input.cleanup) -and (Test-AppEvidenceTrue $format.input.registrationStable)
  } $available
  $checks += Test-AppDiagnosticCondition 'format-registration' $Extension {
    (Test-AppEvidenceTrue $format.input.registration.ready) -and (Test-AppEvidenceTrue $format.input.registration.referenceMatched) -and $format.input.registration.scope -ceq $scope
  } $available
  # Probe-only classification does not waive the separate registration/integrity gates.
  if ($available) {
    try { $assessment = Get-CheckAssessment $format.input.probes ([pscustomobject]@{ ready = $true; registrationScope = $scope }) $Extension $true } catch {}
  }
  $checks += Test-AppDiagnosticCondition 'independent-assessment' $Extension {
    $assessment.evidenceStatus -ceq 'valid' -and $assessment.finding -cin @('thumbnail-api-ok', 'per-user-shell-activation-failed')
  } ($null -ne $assessment)
  $assessed = $checks[-1].status -ceq 'passed'
  $checks += Test-AppDiagnosticCondition 'reported-assessment' $Extension {
    (Test-AppEvidenceTrue $format.assessment.evidenceValid) -and $format.assessment.finding -ceq $assessment.finding -and $format.assessment.recommendedAction -ceq $assessment.recommendedAction -and $format.assessment.thumbnailPassed -is [bool] -and $format.assessment.thumbnailPassed -eq ($assessment.finding -ceq 'thumbnail-api-ok')
  } $assessed
  $fixture = if ($Extension -ceq '.hwp') { 'small-hwp' } else { 'form-hwpx' }
  try { $pair = @($LegacyProbes | Where-Object { $_.Label -cin @("initial-$fixture-shell", "initial-$fixture-force-extract") } | ForEach-Object { $_.Result }) } catch {}
  $checks += Test-AppDiagnosticCondition 'initial-observation' $Extension { $pair.Count -eq 2 }
  $checks += Test-AppDiagnosticCondition 'fixture-parity' $Extension {
    $assessment.finding -ceq (Get-ThumbnailDocumentFinding $pair ($Kind -ceq 'nsis') $true)
  } ($assessed -and $checks[-1].status -ceq 'passed')
  $accepted = @($checks | Where-Object { $_.status -cne 'passed' }).Count -eq 0
  $finding = $null
  if ($accepted) { $finding = [ordered]@{ extension = $Extension; finding = $assessment.finding; thumbnailPassed = $assessment.finding -ceq 'thumbnail-api-ok' } }
  return [pscustomobject]@{ checks = $checks; finding = $finding }
}

function Get-AppDiagnosticAssessment($Suite, $Inventory, $Kind, $Version, $LegacyProbes) {
  $checks = @(); $findings = @()
  $inspection = Get-AppEvidenceProperty $Suite 'inspection'
  $reference = Get-AppEvidenceProperty $inspection 'buildReference'
  $checks += Test-AppDiagnosticCondition 'suite-completion' $null { $Suite.status -ceq 'completed' -and (Test-AppEvidenceTrue $Suite.cleanup) }
  $checks += Test-AppDiagnosticCondition 'reference-identity' $null {
    $reference.schemaVersion -eq 1 -and $Inventory.sourceSha -cmatch '^[a-f0-9]{40}$' -and $reference.sourceSha -ceq $Inventory.sourceSha -and $reference.productVersion -ceq $Version
  }
  $checks += Test-AppDiagnosticCondition 'installation-identity' $null {
    $Kind -cin @('nsis', 'msi') -and $inspection.installKind -ceq $Kind -and (Test-AppEvidenceTrue $inspection.installRecordsReadable)
  }
  $checks += Test-AppDiagnosticCondition 'reference-registration-shape' $null { $reference.files.Count -eq 2 -and $inspection.registration.Count -eq 2 }
  $checks += Test-AppDiagnosticCondition 'binary-reference' $null {
    foreach ($pair in @(@('AlhangeulThumbnailHandler.dll', 'thumbnail-handler'), @('AlhangeulThumbnailWorker.exe', 'thumbnail-worker'))) {
      $actual = @($reference.files | Where-Object { $_.name -ceq $pair[0] })
      $expected = @($Inventory.files | Where-Object { $_.kind -ceq $pair[1] })
      if (-not ($actual.Count -eq 1 -and $expected.Count -eq 1 -and $actual[0].sha256 -ceq $expected[0].sha256 -and $actual[0].bytes -eq $expected[0].size)) { return $false }
    }
    return $true
  } ($null -ne $reference)
  $checks += Test-AppDiagnosticCondition 'registration-preflight' $null {
    $scope = if ($Kind -ceq 'nsis') { 'user-only' } else { 'machine-only' }
    if ($inspection.registration.Count -ne 2) { return $false }
    foreach ($registration in $inspection.registration) {
      if (-not ((Test-AppEvidenceTrue $registration.ready) -and (Test-AppEvidenceTrue $registration.referenceMatched) -and $registration.scope -ceq $scope)) { return $false }
    }
    return $true
  }
  $checks += Test-AppDiagnosticCondition 'format-count' $null { $Suite.formats.Count -eq 2 }
  foreach ($extension in @('.hwp', '.hwpx')) {
    $format = Get-AppFormatAssessment $Suite $extension $Kind $LegacyProbes
    $checks += $format.checks
    if ($null -ne $format.finding) { $findings += $format.finding }
  }
  return [pscustomobject]@{ passed = @($checks | Where-Object { $_.status -cne 'passed' }).Count -eq 0; checks = $checks; formats = $findings }
}

function Assert-AppDiagnosticEvaluation($Evaluation) {
  if (-not $Evaluation.passed) {
    $first = @($Evaluation.checks | Where-Object { $_.status -cne 'passed' })[0]
    $failure = [InvalidOperationException]::new('App diagnostic assessment rejected.')
    $failure.Data['AlhangeulAssessmentCode'] = $first.code
    $failure.Data['AlhangeulAssessmentExtension'] = $first.extension
    throw $failure
  }
}

function Assert-AppDiagnostic($Suite, $Inventory, $Kind, $Version, $LegacyProbes) {
  $evaluation = Get-AppDiagnosticAssessment $Suite $Inventory $Kind $Version $LegacyProbes
  Assert-AppDiagnosticEvaluation $evaluation
  return $evaluation.formats
}

function Get-AppAssessmentFailure($ErrorRecord) {
  $allowed = @('suite-completion', 'reference-identity', 'installation-identity', 'reference-registration-shape',
    'binary-reference', 'registration-preflight', 'format-count', 'format-identity', 'format-installation', 'format-integrity',
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
