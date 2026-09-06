# Extract only known guard results, never arbitrary exception messages or document paths.
function Get-PdfNativeFailure($ErrorRecord) {
  $exception = $ErrorRecord.Exception
  for ($depth = 0; $null -ne $exception -and $depth -lt 5; $depth++) {
    if ($exception.Data.Contains('PdfConfirmationNative')) {
      $snapshot = $exception.Data['PdfConfirmationNative']
      if ($snapshot -isnot [System.Collections.Generic.Dictionary[string, object]]) { return $null }
      $checks = [ordered]@{}
      foreach ($key in @('expectedProcessValid', 'saveProcessMatches', 'confirmationProcessMatches',
          'distinctDialogs', 'saveClassMatches', 'confirmationClassMatches', 'ownerMatches',
          'saveDisabled', 'confirmationEnabled', 'buttonProcessMatches', 'buttonIsChild',
          'buttonClassMatches', 'buttonEnabled')) {
        $checks[$key] = if ($snapshot.ContainsKey($key) -and $snapshot[$key] -is [bool]) {
          $snapshot[$key]
        } else { $null }
      }
      $classes = @{}
      foreach ($key in @('buttonsDistinct', 'dialogThreadObserved', 'dialogActive')) {
        if ($snapshot.ContainsKey($key)) {
          $checks[$key] = if ($snapshot[$key] -is [bool]) { $snapshot[$key] } else { $null }
        }
      }
      foreach ($key in @('nativeSaveClass', 'nativeConfirmationClass', 'nativeButtonClass')) {
        $value = if ($snapshot.ContainsKey($key)) { $snapshot[$key] } else { $null }
        $classes[$key] = if ($value -is [string] -and $value -cmatch '\A[A-Za-z0-9_#.:\-]{0,128}\z') {
          $value
        } else { 'unavailable-or-redacted' }
      }
      return @{ checks = $checks; classes = $classes;
        failedChecks = @($checks.Keys | Where-Object { $checks[$_] -isnot [bool] -or -not $checks[$_] }) }
    }
    $exception = $exception.InnerException
  }
  return $null
}
