# Definitions only; called inside the disposable standard-user profile.
. (Join-Path $PSScriptRoot 'hosted-ui-view.ps1')
Add-Type -Path (Join-Path $PSScriptRoot 'hosted-ui-window.cs')
function Get-OwnedProbeWindows($Marker) {
  $items = @()
  foreach ($w in [Alhangeul.HostedExplorer.Native]::Read($Marker)) {
    $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $w.processId)
    if (-not $process) { continue }
    $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
    $items += [ordered]@{ handle = $w.handle; processId = $w.processId; className = $w.className; visible = $w.visible; name = $process.Name; ownerReadable = $owner.ReturnValue -eq 0; ownerMatches = $owner.ReturnValue -eq 0 -and $owner.Sid -eq [Security.Principal.WindowsIdentity]::GetCurrent().User.Value; sessionMatches = $process.SessionId -eq (Get-Process -Id $PID).SessionId }
  }
  return $items
}
function Invoke-HostedCapture($Root, $Name, $Method, [switch]$EmptyFolder) {
  $output = Join-Path $Root ('evidence\' + $Name)
  [void][IO.Directory]::CreateDirectory($output)
  $marker = 'alh-ui-' + $Name
  $result = [ordered]@{ name = $Name; method = $Method; emptyFolder = [bool]$EmptyFolder; timedOut = $false; exitCode = $null; snapshots = @(); preferenceRecovered = $null; ownedWindowsClosed = $false }
  $arguments = '-NoLogo -NoProfile -NonInteractive -STA -File "' + $PSScriptRoot + '\hosted-ui-capture.ps1" -Root "' + $Root + '" -StandardWindowOnly -ProbeName ' + $Name + ' -OpenMethod ' + $Method
  if ($EmptyFolder) { $arguments += ' -EmptyFolder' }
  $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $p = Start-Process -FilePath $engine -ArgumentList $arguments -PassThru -RedirectStandardOutput (Join-Path $output 'stdout.txt') -RedirectStandardError (Join-Path $output 'stderr.txt')
  $timer = [Diagnostics.Stopwatch]::StartNew()
  try {
    [void]$p.Handle
    for ($i=0; $i -lt 12; $i++) {
      if ($p.WaitForExit(5000)) { $p.Refresh(); $result.exitCode = $p.ExitCode; break }
      $waits = @($p.Threads | Select-Object -First 24 | ForEach-Object { @{ id = $_.Id; state = [string]$_.ThreadState; waitReason = $(if ($_.ThreadState -eq 'Wait') { [string]$_.WaitReason } else { $null }) } })
      $result.snapshots += @{ threads = $waits; elapsedMs = $timer.ElapsedMilliseconds; windows = @(Get-OwnedProbeWindows $marker) }
    }
    if (-not $p.HasExited) { $result.timedOut = $true; $p.Kill(); [void]$p.WaitForExit(5000) }
  } finally {
    $p.Dispose()
    $result['elapsedMs'] = $timer.ElapsedMilliseconds
    $path = Join-Path $output 'explorer-visual.json'
    if (Test-Path -LiteralPath $path) {
      $visual = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
      $result['visualStatus'] = $visual.status; $result['lastPhase'] = $visual.phase
      if ($visual.PSObject.Properties.Name -contains 'displayPreference' -and -not $visual.displayPreference.restored) {
        try { Restore-HostedThumbnailView $visual.displayPreference; $result.preferenceRecovered = $visual.displayPreference.restored }
        catch { $result['recoveryFailure'] = $_.Exception.Message; $result.preferenceRecovered = $false }
      }
    }
    foreach ($w in @(Get-OwnedProbeWindows $marker)) {
      if ($w.ownerMatches -and $w.sessionMatches -and $w.name -ieq 'explorer.exe') {
        [void][Alhangeul.HostedExplorer.Native]::PostMessage([IntPtr]$w.handle, 0x10, [IntPtr]::Zero, [IntPtr]::Zero)
      }
    }
    for ($i=0; $i -lt 10; $i++) {
      $remaining = @(Get-OwnedProbeWindows $marker | Where-Object { $_.ownerMatches -and $_.sessionMatches -and $_.name -ieq 'explorer.exe' })
      if ($remaining.Count -eq 0) { $result.ownedWindowsClosed = $true; break }
      Start-Sleep -Milliseconds 500
    }
    $result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $output 'launch-observation.json') -Encoding UTF8
  }
  if ($result.preferenceRecovered -eq $false -or -not $result.ownedWindowsClosed) { throw 'capture-recovery-incomplete' }
  return $result
}
