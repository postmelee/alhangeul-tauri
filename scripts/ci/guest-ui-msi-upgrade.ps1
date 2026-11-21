# MSI identity is read from hash-verified packages on the host; verify actual installed registration.
function Test-GuestMsiRegistration($Expected, [string]$RemovedProductCode = '') {
  $uninstall = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
  $entries = @(Get-ChildItem -LiteralPath $uninstall | ForEach-Object {
    $value = Get-ItemProperty -LiteralPath $_.PSPath
    if ($value.PSObject.Properties['DisplayName'] -and $value.DisplayName -ceq 'Alhangeul') {
      @{ productCode = $_.PSChildName; version = $value.DisplayVersion }
    }
  })
  if ($entries.Count -ne 1 -or $entries[0].productCode -ine $Expected.ProductCode -or
      $entries[0].version -cne $Expected.ProductVersion) { throw 'msi-registration-identity-mismatch' }
  if ($RemovedProductCode -and (Test-Path -LiteralPath (Join-Path $uninstall $RemovedProductCode))) { throw 'old-msi-registration-remains' }
  return @{ entries = $entries; previousProductRemoved = [bool]$RemovedProductCode }
}
