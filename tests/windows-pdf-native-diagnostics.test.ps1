param([Parameter(Mandatory = $true)][string]$EvidencePath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-pdf-win32.ps1')
. (Join-Path $PSScriptRoot '../scripts/windows-pdf-native-diagnostics.ps1')
$cases = [System.Collections.Generic.List[object]]::new()
$guardKeys = @('expectedProcessValid', 'saveProcessMatches', 'confirmationProcessMatches',
  'distinctDialogs', 'saveClassMatches', 'confirmationClassMatches', 'ownerMatches',
  'saveDisabled', 'confirmationEnabled', 'buttonProcessMatches', 'buttonIsChild',
  'buttonClassMatches', 'buttonEnabled')

function Test-Case($Name, $Body) {
  try { & $Body; $cases.Add(@{ name = $Name; passed = $true }) }
  catch { $cases.Add(@{ name = $Name; passed = $false }) }
}
function Assert-Equal($Actual, $Expected) {
  if ($Actual -cne $Expected) { throw 'Assertion mismatch.' }
}
function New-Checks {
  $snapshot = [System.Collections.Generic.Dictionary[string, object]]::new()
  foreach ($key in $guardKeys) { $snapshot[$key] = $true }
  $snapshot['nativeSaveClass'] = '#32770'
  $snapshot['nativeConfirmationClass'] = '#32770'
  $snapshot['nativeButtonClass'] = 'Button'
  return ,$snapshot
}
function Get-Rejection($Snapshot) {
  try { [PdfDialogNative]::RequireCommandChecks($Snapshot) }
  catch { return $_ }
  throw 'Expected native guard rejection.'
}

Test-Case 'all synthetic guard booleans pass the actual native predicate' {
  [PdfDialogNative]::RequireCommandChecks((New-Checks))
}
foreach ($key in $guardKeys) {
  Test-Case "native guard rejection identifies $key" {
    $snapshot = New-Checks; $snapshot[$key] = $false
    $result = Get-PdfNativeFailure (Get-Rejection $snapshot)
    Assert-Equal ($result.failedChecks -join ',') $key
    Assert-Equal $result.checks[$key] $false
  }
}
Test-Case 'missing guard rejects and remains unavailable, not a true default' {
  $snapshot = New-Checks; $null = $snapshot.Remove('buttonEnabled')
  $result = Get-PdfNativeFailure (Get-Rejection $snapshot)
  Assert-Equal ($result.failedChecks -join ',') 'buttonEnabled'
  Assert-Equal $result.checks.buttonEnabled $null
}
Test-Case 'string true is not a boolean guard' {
  $snapshot = New-Checks; $snapshot['buttonEnabled'] = 'true'
  $result = Get-PdfNativeFailure (Get-Rejection $snapshot)
  Assert-Equal ($result.failedChecks -join ',') 'buttonEnabled'
  Assert-Equal $result.checks.buttonEnabled $null
}
Test-Case 'multiple failures retain an unexpected synthetic native class' {
  $snapshot = New-Checks
  $snapshot['buttonClassMatches'] = $false; $snapshot['buttonIsChild'] = $false
  $snapshot['nativeButtonClass'] = 'UnexpectedClass'
  $result = Get-PdfNativeFailure (Get-Rejection $snapshot)
  Assert-Equal ($result.failedChecks -join ',') 'buttonIsChild,buttonClassMatches'
  Assert-Equal $result.classes.nativeButtonClass 'UnexpectedClass'
}
Test-Case 'wrapped native exception retains typed diagnostics' {
  $snapshot = New-Checks; $snapshot['buttonEnabled'] = $false
  $record = Get-Rejection $snapshot
  $wrapped = @{ Exception = [Exception]::new('not persisted', $record.Exception) }
  Assert-Equal ((Get-PdfNativeFailure $wrapped).failedChecks -join ',') 'buttonEnabled'
}
Test-Case 'unknown exception does not leak its text' {
  Assert-Equal (Get-PdfNativeFailure @{ Exception = [Exception]::new('private path') }) $null
}
Test-Case 'untyped snapshot is not serialized' {
  $errorObject = [Exception]::new('private path')
  $errorObject.Data['PdfConfirmationNative'] = @{ private = 'not persisted' }
  Assert-Equal (Get-PdfNativeFailure @{ Exception = $errorObject }) $null
}
Test-Case 'class text and unknown snapshot keys are filtered' {
  $snapshot = New-Checks; $snapshot['buttonEnabled'] = $false
  $snapshot['nativeButtonClass'] = 'C:\private\fixture.pdf'
  $snapshot['documentPath'] = 'not persisted'
  $result = Get-PdfNativeFailure (Get-Rejection $snapshot)
  Assert-Equal $result.classes.nativeButtonClass 'unavailable-or-redacted'
  Assert-Equal (($result | ConvertTo-Json -Depth 6) -match 'private|documentPath|not persisted') $false
}
Test-Case 'real Win32 invalid handles reject without a UI action' {
  $record = $null
  try { [PdfDialogNative]::ValidateCommand([IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero, 0) }
  catch { $record = $_ }
  if ($null -eq $record) { throw 'Invalid handles passed.' }
  $result = Get-PdfNativeFailure $record
  Assert-Equal $result.checks.expectedProcessValid $false
  Assert-Equal $result.checks.distinctDialogs $false
  Assert-Equal $result.checks.buttonIsChild $false
  Assert-Equal $result.checks.buttonClassMatches $false
  Assert-Equal $result.classes.nativeButtonClass ''
  Assert-Equal ([PdfDialogNative]::OwnsConfirmation([IntPtr]::Zero, [IntPtr]::Zero, 0)) $false
}

Test-Case 'read-only command probe reports invalid handles without performing an action' {
  $result = [PdfDialogNative]::ReadCommandProbe([IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero, 0)
  Assert-Equal $result.nativeControlId 0
  Assert-Equal $result.dialogThreadObserved $false
  Assert-Equal $result.dialogActive $false
  Assert-Equal $result.buttonClassMatches $false
  foreach ($key in $guardKeys) {
    if ($result[$key] -isnot [bool]) { throw 'Probe guard was not a boolean.' }
  }
}

$failed = @($cases | Where-Object { -not $_.passed })
@{ schemaVersion = 1; kind = 'native-guard-diagnostics'; passed = $failed.Count -eq 0;
   cases = @($cases.ToArray()); nativeUiTested = $false; invalidHandlesTested = $true } |
  ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
$cases | ForEach-Object { Write-Output "$(if ($_.passed) { 'PASS' } else { 'FAIL' }): $($_.name)" }
if ($failed.Count -gt 0) { exit 1 }
exit 0
