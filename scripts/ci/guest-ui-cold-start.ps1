# Diagnostic-only reinstalls after the original upgrade failure is already preserved.
function Measure-GuestColdStarts($Directory) {
  $rows = @()
  foreach ($mode in @('provider', 'worker')) {
    $row = @{ mode = $mode; reinstallExit = $null; startedAt = [DateTime]::UtcNow.ToString('o'); status = 'failed' }
    try {
      $row.reinstallExit = Invoke-GuestInstall reinstall
      if ($row.reinstallExit -ne 0) { throw 'cold-diagnostic-reinstall-failed' }
      Assert-GuestBinaries $inputData.binaries $Directory
      $row['binariesMatched'] = $true
      Test-GuestSentinels
      $row['probeStartedAt'] = [DateTime]::UtcNow.ToString('o')
      $row['result'] = if ($mode -eq 'provider') { Measure-GuestProvider } else { Measure-GuestWorker $Directory }
      $row.status = 'observed'
    } catch { $row['failure'] = $_.Exception.Message }
    finally { $row['finishedAt'] = [DateTime]::UtcNow.ToString('o') }
    $rows += $row
    if ($row.reinstallExit -ne 0 -or -not $row.ContainsKey('binariesMatched')) { break }
  }
  return $rows
}
