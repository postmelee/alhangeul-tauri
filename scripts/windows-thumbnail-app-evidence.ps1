# Bounded typed projection only. Missing/malformed fields stay null, never guessed.
function Get-AppEvidenceProperty($Object, $Name) {
  if ($null -eq $Object) { return $null }
  try { return $Object.$Name } catch { return $null }
}
function Test-AppEvidenceTrue($Value) { return $Value -is [bool] -and $Value }
function Get-AppEvidenceBool($Value) { if ($Value -is [bool]) { return $Value }; return $null }
function Get-AppEvidenceEnum($Value, $Allowed) { if ($Value -is [string] -and $Value -cin $Allowed) { return $Value }; return $null }
function Get-AppEvidenceNumber($Value, $Minimum, $Maximum) {
  if (($Value -is [int] -or $Value -is [long] -or $Value -is [uint32]) -and $Value -ge $Minimum -and $Value -le $Maximum) { return $Value }
  return $null
}

function Get-AppInstallationEvidence($Suite, $ExpectedKind) {
  $inspection = Get-AppEvidenceProperty $Suite 'inspection'
  return [ordered]@{
    expectedKind = Get-AppEvidenceEnum $ExpectedKind @('nsis', 'msi')
    observedKind = Get-AppEvidenceEnum (Get-AppEvidenceProperty $inspection 'installKind') @('nsis', 'msi', 'unknown')
    recordsReadable = Get-AppEvidenceBool (Get-AppEvidenceProperty $inspection 'installRecordsReadable')
    readFailures = @(Get-AppInstallReadFailures (Get-AppEvidenceProperty $inspection 'installReadFailures'))
  }
}

function Get-AppInstallReadFailures($Failures) {
  foreach ($failure in @($Failures) | Select-Object -First 8) {
    if ($null -eq $failure) { continue }
    [ordered]@{
      area = Get-AppEvidenceEnum (Get-AppEvidenceProperty $failure 'area') @('marker', 'uninstall-enumeration', 'uninstall-discovery', 'uninstall-product')
      hive = Get-AppEvidenceEnum (Get-AppEvidenceProperty $failure 'hive') @('user', 'machine')
      field = Get-AppEvidenceEnum (Get-AppEvidenceProperty $failure 'field') @('default-value', 'install-dir', 'keys', 'display-name', 'publisher', 'install-location', 'uninstall-string', 'main-binary-name', 'windows-installer', 'unknown')
      reason = Get-AppEvidenceEnum (Get-AppEvidenceProperty $failure 'reason') @('read-failed', 'enumeration-failed', 'too-large', 'wrong-type', 'invalid-string', 'invalid-dword')
      valueType = Get-AppEvidenceNumber (Get-AppEvidenceProperty $failure 'valueType') 0 ([uint32]::MaxValue)
      byteLength = Get-AppEvidenceNumber (Get-AppEvidenceProperty $failure 'byteLength') 0 ([uint32]::MaxValue)
      win32Error = Get-AppEvidenceNumber (Get-AppEvidenceProperty $failure 'win32Error') ([int]::MinValue) ([int]::MaxValue)
    }
  }
}

function Get-AppRegistrationEvidence($Registration) {
  return [ordered]@{
    ready = Get-AppEvidenceBool (Get-AppEvidenceProperty $Registration 'ready')
    referenceMatched = Get-AppEvidenceBool (Get-AppEvidenceProperty $Registration 'referenceMatched')
    scope = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Registration 'scope') @('user-only', 'machine-only', 'ambiguous', 'unknown')
  }
}

function Get-AppReportedEvidence($Assessment) {
  return [ordered]@{
    evidenceValid = Get-AppEvidenceBool (Get-AppEvidenceProperty $Assessment 'evidenceValid')
    thumbnailPassed = Get-AppEvidenceBool (Get-AppEvidenceProperty $Assessment 'thumbnailPassed')
    finding = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Assessment 'finding') @('ready', 'diagnostic-invalid', 'other-handler-selected', 'registration-ambiguous', 'registration-mismatch', 'reference-mismatch', 'display-policy-restricted', 'shell-control-failed', 'unclassified-failure', 'per-user-shell-activation-failed', 'thumbnail-api-ok')
    recommendedAction = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Assessment 'recommendedAction') @('none', 'check-diagnostics', 'check-shell-environment', 'investigate', 'consider-msi', 'check-install-history')
  }
}

function Get-AppProbeEvidence($Probe, $Label) {
  $code = Get-AppEvidenceProperty $Probe 'hresult'
  $handler = Get-AppEvidenceProperty $Probe 'resolvedHandler'
  return [ordered]@{
    label = $Label
    # Sanitized nulls must never turn malformed original evidence into acceptance.
    originalContractValid = Test-ThumbnailProbeContract $Probe $Label
    schemaVersion = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'schemaVersion') 0 2147483647
    mode = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Probe 'mode') @('association', 'activate', 'shell', 'cache-only', 'force-extract')
    phase = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Probe 'phase') @('input.shellPath', 'AssocQueryStringW', 'CoCreateInstance.handler', 'SHCreateItemFromParsingName.imageFactory', 'SHCreateItemFromParsingName.shellItem', 'IShellItemImageFactory.GetImage', 'CoCreateInstance.thumbnailCache', 'IThumbnailCache.GetThumbnail', 'ISharedBitmap.GetSharedBitmap')
    status = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Probe 'status') @('ok', 'failed')
    hresult = $(if ($code -is [string] -and $code -cmatch '^0x[0-9A-F]{8}$') { $code } else { $null })
    apartment = Get-AppEvidenceEnum (Get-AppEvidenceProperty $Probe 'apartment') @('STA', 'MTA')
    elapsedMs = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'elapsedMs') 0 ([long]::MaxValue)
    bitmapPresent = Get-AppEvidenceBool (Get-AppEvidenceProperty $Probe 'bitmapPresent')
    width = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'width') ([int]::MinValue) ([int]::MaxValue)
    height = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'height') ([int]::MinValue) ([int]::MaxValue)
    requestFlags = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'requestFlags') 0 ([uint32]::MaxValue)
    cacheFlags = Get-AppEvidenceNumber (Get-AppEvidenceProperty $Probe 'cacheFlags') 0 ([uint32]::MaxValue)
    resolvedHandler = $(if ($handler -is [string] -and $handler -match '^\{[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\}$') { $handler } else { $null })
  }
}

function Get-AppDiagnosticEvidence($Suite) {
  # Deliberate projection: no stateToken, paths, exception or bitmap bytes.
  foreach ($format in @(Get-AppEvidenceProperty $Suite 'formats') | Select-Object -First 16) {
    $inputValue = Get-AppEvidenceProperty $format 'input'
    $extension = Get-AppEvidenceEnum (Get-AppEvidenceProperty $inputValue 'extension') @('.hwp', '.hwpx')
    if ($null -eq $extension) { continue }
    $probes = @()
    foreach ($record in @(Get-AppEvidenceProperty $inputValue 'probes') | Select-Object -First 32) {
      $label = Get-AppEvidenceEnum (Get-AppEvidenceProperty $record 'Label') @(Get-CheckLabels $extension)
      if ($null -eq $label) { continue }
      $probes += Get-AppProbeEvidence (Get-AppEvidenceProperty $record 'Result') $label
    }
    [ordered]@{
      extension = $extension; probes = $probes
      installKind = Get-AppEvidenceEnum (Get-AppEvidenceProperty $inputValue 'installKind') @('nsis', 'msi', 'unknown')
      integrity = Get-AppEvidenceBool (Get-AppEvidenceProperty $inputValue 'integrity')
      cleanup = Get-AppEvidenceBool (Get-AppEvidenceProperty $inputValue 'cleanup')
      registrationStable = Get-AppEvidenceBool (Get-AppEvidenceProperty $inputValue 'registrationStable')
      registration = Get-AppRegistrationEvidence (Get-AppEvidenceProperty $inputValue 'registration')
      assessment = Get-AppReportedEvidence (Get-AppEvidenceProperty $format 'assessment')
    }
  }
}
