# This branch captures observations only. The 30-second close criterion still applies.
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class CloseWindowTrace {
    private delegate bool EnumProc(IntPtr handle, IntPtr param);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc callback, IntPtr param);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr handle, out uint pid);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr handle);
    [DllImport("user32.dll")] private static extern bool IsHungAppWindow(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr handle, uint flag);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr handle, StringBuilder text, int max);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetClassName(IntPtr handle, StringBuilder text, int max);
    public sealed class Sample {
        public long Handle, Owner;
        public bool Visible, Hung;
        public string Class, Title;
    }
    public static Sample[] Capture(uint pid) {
        var result = new List<Sample>();
        EnumWindows((handle, param) => {
            uint ownerPid;
            GetWindowThreadProcessId(handle, out ownerPid);
            if (ownerPid != pid) return true;
            var title = new StringBuilder(160);
            var type = new StringBuilder(120);
            GetWindowText(handle, title, title.Capacity);
            GetClassName(handle, type, type.Capacity);
            result.Add(new Sample {
                Handle = handle.ToInt64(), Owner = GetWindow(handle, 4).ToInt64(),
                Visible = IsWindowVisible(handle), Hung = IsHungAppWindow(handle),
                Class = type.ToString(), Title = title.ToString()
            });
            return true;
        }, IntPtr.Zero);
        return result.ToArray();
    }
}
'@

function Write-CloseSample($Process, $Iteration, $Phase, $Elapsed) {
  $Process.Refresh()
  $exited = $Process.HasExited
  $row = [ordered]@{
    cycle = $Iteration
    phase = $Phase
    elapsedMs = $Elapsed
    pid = $Process.Id
    exited = $exited
    windows = if ($exited) { @() } else { @([CloseWindowTrace]::Capture($Process.Id)) }
    handle = if ($exited) { $null } else { $Process.MainWindowHandle.ToInt64() }
  }
  $row | ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath (Join-Path $OutputDirectory 'close-window-trace.jsonl') -Encoding UTF8
}

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
      Write-CloseSample $process $iteration 'before-close' 0
      $timer = [Diagnostics.Stopwatch]::StartNew()
      Assert-Condition ($process.CloseMainWindow()) "Alhangeul cycle $iteration close request failed."
      while (!$process.HasExited -and $timer.ElapsedMilliseconds -lt 30000) {
        $remaining = 30000 - [int]$timer.ElapsedMilliseconds
        if ($remaining -le 0) { break }
        [void]$process.WaitForExit([Math]::Min(1000, $remaining))
        Write-CloseSample $process $iteration 'after-close' $timer.ElapsedMilliseconds
      }
      if (-not $process.HasExited) {
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
