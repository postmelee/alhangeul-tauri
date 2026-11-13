function Run-Owned($File, $Arguments, [int]$Seconds = 180) {
  $p = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit($Seconds * 1000)) { $p.Kill(); [void]$p.WaitForExit(5000); throw 'owned-child-timeout' }
    $p.Refresh(); return [int]$p.ExitCode
  } finally { $p.Dispose() }
}
