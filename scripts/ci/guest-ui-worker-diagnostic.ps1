# Unrestricted timing diagnostic for the exact installed worker, never an acceptance substitute.
. (Join-Path $PSScriptRoot '../windows-thumbnail-app-process.ps1')
function Read-GuestWorkerBytes($Stream, [int]$Count, $Timer) {
  if ($Count -lt 0 -or $Count -gt 4MB) { throw 'worker-frame-size' }
  $bytes = New-Object byte[] $Count
  $offset = 0
  while ($offset -lt $Count) {
    $remaining = 10000 - $Timer.ElapsedMilliseconds
    if ($remaining -le 0) { throw 'worker-diagnostic-timeout' }
    $task = $Stream.ReadAsync($bytes, $offset, $Count - $offset)
    if (-not $task.Wait([int]$remaining)) { throw 'worker-diagnostic-timeout' }
    if ($task.Result -le 0) { throw 'worker-unexpected-eof' }
    $offset += $task.Result
  }
  return ,$bytes
}
function Read-GuestWorkerFrames($Stream, $Timer) {
  $frames = @()
  for ($index = 0; $index -lt 8; $index++) {
    $header = Read-GuestWorkerBytes $Stream 64 $Timer
    $headerMs = $Timer.ElapsedMilliseconds
    if ([Text.Encoding]::ASCII.GetString($header, 0, 8) -cne ("ALHGTHM" + [char]0) -or
        [BitConverter]::ToUInt16($header, 8) -ne 1) { throw 'worker-frame-header' }
    $kind = [BitConverter]::ToUInt16($header, 10)
    $length = [BitConverter]::ToUInt32($header, 12)
    $width = [BitConverter]::ToUInt32($header, 16); $height = [BitConverter]::ToUInt32($header, 20)
    $stride = [BitConverter]::ToUInt32($header, 24)
    if ($kind -notin @(1, 2, 3, 4) -or $length -gt 4MB) { throw 'worker-frame-kind-or-size' }
    if ($kind -in @(1, 2) -and ($width -lt 1 -or $height -lt 1 -or $width -gt 1024 -or
        $height -gt 1024 -or $stride -ne $width * 4 -or $length -ne $stride * $height)) { throw 'worker-frame-dimensions' }
    if ($kind -in @(3, 4) -and ($length -ne 0 -or $width -ne 0 -or $height -ne 0 -or $stride -ne 0)) { throw 'worker-control-frame' }
    $bytes = Read-GuestWorkerBytes $Stream ([int]$length) $Timer
    $frames += @{ kind = $kind; headerMs = $headerMs; completeMs = $Timer.ElapsedMilliseconds; bytes = $length; width = $width; height = $height }
    if ($kind -eq 4) { return $frames }
  }
  throw 'worker-frame-count'
}
function Measure-GuestWorker($Directory) {
  $request = Join-Path $root 'verification\small-hwp.request'
  if ((Get-FileHash $request -Algorithm SHA256).Hash.ToLowerInvariant() -cne $inputData.workerDiagnostic.requestSha256) { throw 'worker-request-hash-mismatch' }
  $worker = Join-Path $Directory 'AlhangeulThumbnailWorker.exe'
  Assert-GuestBinaries $inputData.binaries $Directory
  $result = @{ status = 'failed'; handlerDeadlineMs = 1500; request = $inputData.workerDiagnostic; frames = @(); processReaped = $false }
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = [Diagnostics.ProcessStartInfo]@{
    FileName = $worker; UseShellExecute = $false; CreateNoWindow = $true
    RedirectStandardInput = $true; RedirectStandardOutput = $true; RedirectStandardError = $true
  }
  $started = $false; $timer = [Diagnostics.Stopwatch]::StartNew()
  try {
    $state = @{ processStarted = $false }
    Start-AppDiagnosticProcess $process $state
    $started = $state.processStarted
    if (-not $started) { throw 'worker-start-failed' }
    $result['processStartMs'] = $timer.ElapsedMilliseconds
    $errors = $process.StandardError.ReadToEndAsync()
    $bytes = [IO.File]::ReadAllBytes($request)
    $write = $process.StandardInput.BaseStream.WriteAsync($bytes, 0, $bytes.Length)
    if (-not $write.Wait(5000)) { throw 'worker-write-timeout' }
    $process.StandardInput.BaseStream.Close()
    $result.frames = @(Read-GuestWorkerFrames $process.StandardOutput.BaseStream $timer)
    if (-not $process.WaitForExit(1000) -or -not $errors.Wait(1000)) { throw 'worker-exit-timeout' }
    $result['exitCode'] = $process.ExitCode; $result['stderrChars'] = $errors.Result.Length
    $result.status = 'observed'
  } catch { $result['failure'] = $_.Exception.Message }
  finally {
    if ($started) {
      if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
      $result.processReaped = $process.HasExited
    }
    $result['elapsedMs'] = $timer.ElapsedMilliseconds
    $process.Dispose()
  }
  return $result
}
