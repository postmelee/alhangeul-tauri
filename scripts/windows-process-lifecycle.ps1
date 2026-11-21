Add-Type -Path (Join-Path $PSScriptRoot 'windows-editor-window.cs')

function Wait-ForStableMainWindow($Process, $Iteration) {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  $stableSamples = 0
  $stableHandle = [IntPtr]::Zero
  while ([DateTime]::UtcNow -lt $deadline) {
    $Process.Refresh()
    Assert-Condition (-not $Process.HasExited) "Alhangeul cycle $Iteration exited before readiness."
    $currentHandle = [Alhangeul.InstallerSmoke.EditorWindow]::FindResponsive($Process.Id)
    if ($currentHandle -ne [IntPtr]::Zero) {
      if ($currentHandle -eq $stableHandle) { $stableSamples += 1 } else { $stableHandle = $currentHandle; $stableSamples = 1 }
      if ($stableSamples -ge 11) { return [ordered]@{ Handle = $currentHandle.ToInt64(); Class = 'Tauri Window'; StableSamples = $stableSamples } }
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
      Assert-Condition ([Alhangeul.InstallerSmoke.EditorWindow]::RequestClose([IntPtr]$ready.Handle, $process.Id)) "Alhangeul cycle $iteration close request failed."
      if (-not $process.WaitForExit(30000)) {
        $responsiveEditor = [Alhangeul.InstallerSmoke.EditorWindow]::FindResponsive($process.Id)
        throw "Alhangeul cycle $iteration graceful-exit timeout (target=$($ready.Handle), responsiveEditor=$($responsiveEditor.ToInt64()))"
      }
      $cycles += [ordered]@{ Iteration = $iteration; Pid = $process.Id; Ready = $ready; GracefulExit = $true }
    } finally {
      $process.Refresh(); if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force; Wait-Process -Id $process.Id -ErrorAction SilentlyContinue }
    }
  }
  return [ordered]@{ CycleCount = $cycles.Count; Cycles = $cycles }
}
