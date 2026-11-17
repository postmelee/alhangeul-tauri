# Definitions only. The caller has already verified a disposable hosted standard-user token.
function Open-HostedExplorerProcess($Folder, $Report, [switch]$Separate) {
  $Report.phase = 'start-explorer-process'; Save-VisualEvidence
  $arguments = '"' + $Folder + '"'
  if ($Separate) { $arguments = '/separate,' + $arguments }
  $launcher = Start-Process -FilePath (Join-Path $env:SystemRoot 'explorer.exe') -ArgumentList $arguments -PassThru
  $Report['launcherPid'] = $launcher.Id
  $handle = [IntPtr]::Zero
  try {
    $Report.phase = 'find-native-window'; Save-VisualEvidence
    $Report['nativeCandidates'] = @()
    for ($i=0; $i -lt 30; $i++) {
      foreach ($candidate in [Alhangeul.HostedExplorer.Native]::Read([IO.Path]::GetFileName($Folder))) {
        $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $candidate.processId)
        if (-not $process) { continue }
        $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
        $sameOwner = $owner.ReturnValue -eq 0 -and $owner.Sid -eq [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        $sameSession = $process.SessionId -eq (Get-Process -Id $PID).SessionId
        $Report.nativeCandidates += @{ processId = $candidate.processId; ownerReadable = $owner.ReturnValue -eq 0; ownerMatches = $sameOwner; sessionMatches = $sameSession; className = $candidate.className }
        if ($sameOwner -and $sameSession -and $process.Name -ieq 'explorer.exe' -and $candidate.className -in @('CabinetWClass', 'ExploreWClass')) { $handle = [IntPtr]$candidate.handle; break }
      }
      if ($handle -ne [IntPtr]::Zero) { break }
      Start-Sleep -Milliseconds 500
    }
    $launcher.Refresh()
    $Report['launcherExited'] = $launcher.HasExited
    if ($launcher.HasExited) { $Report['launcherExitCode'] = $launcher.ExitCode }
  } finally { $launcher.Dispose(); Save-VisualEvidence }
  if ($handle -eq [IntPtr]::Zero) { throw 'owned-native-explorer-window-unavailable' }
  return $handle
}
function Set-HostedNativeView($Handle) {
  Add-Type -AssemblyName System.Windows.Forms
  [void][Alhangeul.HostedExplorer.Native]::ShowWindow($Handle, 9)
  [void][Alhangeul.ThumbnailUserVisual.Window]::MoveWindow($Handle, 8, 8, 1000, 650, $true)
  [void][Alhangeul.HostedExplorer.Native]::SetForegroundWindow($Handle)
  if ([Alhangeul.HostedExplorer.Native]::GetForegroundWindow() -ne $Handle) { throw 'owned-window-focus-unavailable' }
  # Try Explorer's Ctrl+Shift+1 shortcut to request extra-large icons.
  [Windows.Forms.SendKeys]::SendWait('^+1')
  if ([Alhangeul.HostedExplorer.Native]::GetForegroundWindow() -ne $Handle) { throw 'owned-window-focus-lost' }
}
function Close-HostedNativeWindow($Handle) {
  [void][Alhangeul.HostedExplorer.Native]::PostMessage($Handle, 0x10, [IntPtr]::Zero, [IntPtr]::Zero)
  for ($i=0; $i -lt 10; $i++) {
    if (-not [Alhangeul.HostedExplorer.Native]::IsWindow($Handle)) { return $true }
    Start-Sleep -Milliseconds 100
  }
  return $false
}
