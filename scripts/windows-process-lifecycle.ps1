function Wait-ForStableMainWindow($Process, $Iteration) {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  $stableSamples = 0
  $stableHandle = [IntPtr]::Zero
  while ([DateTime]::UtcNow -lt $deadline) {
    $Process.Refresh()
    Assert-Condition (-not $Process.HasExited) "Alhangeul cycle $Iteration exited before readiness."
    $currentHandle = $Process.MainWindowHandle
    if ($currentHandle -ne [IntPtr]::Zero -and $Process.Responding) {
      if ($currentHandle -eq $stableHandle) { $stableSamples += 1 } else { $stableHandle = $currentHandle; $stableSamples = 1 }
      if ($stableSamples -ge 11) { return [ordered]@{ Handle = $currentHandle.ToInt64(); Title = $Process.MainWindowTitle; StableSamples = $stableSamples } }
    } else { $stableHandle = [IntPtr]::Zero; $stableSamples = 0 }
    Start-Sleep -Milliseconds 500
  }
  throw "Alhangeul cycle $Iteration did not remain responsive for five seconds."
}
function Invoke-Launch($Executable) {
  $cycles = @(); foreach ($iteration in 1..2) {
    $process = Start-Process -FilePath $Executable -PassThru; try {
      Assert-Condition ($process.WaitForInputIdle(30000)) "Alhangeul cycle $iteration input-idle timeout"
      $ready = Wait-ForStableMainWindow $process $iteration
      Assert-Condition ($process.CloseMainWindow()) "Alhangeul cycle $iteration close request failed."
      if (-not $process.WaitForExit(30000)) {
        $process.Refresh()
        throw "Alhangeul cycle $iteration graceful-exit timeout (handle=$($process.MainWindowHandle.ToInt64()), title=$($process.MainWindowTitle), responding=$($process.Responding))"
      }
      $cycles += [ordered]@{ Iteration = $iteration; Pid = $process.Id; Ready = $ready; GracefulExit = $true }
    } finally {
      $process.Refresh(); if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force; Wait-Process -Id $process.Id -ErrorAction SilentlyContinue }
    }
  }
  return [ordered]@{ CycleCount = $cycles.Count; Cycles = $cycles }
}
