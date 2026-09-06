[CmdletBinding()]
param(
  [string]$InputPath = '',
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [ValidateSet('state', 'association', 'activate', 'shell', 'cache-only', 'force-extract')][string]$Mode = 'state',
  [ValidateRange(1, 1024)][int]$Size = 256,
  [ValidateRange(1, 60)][int]$TimeoutSeconds = 15
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-ThumbnailFailure($Phase, $Code) {
  return [ordered]@{ schemaVersion = 1; mode = $Mode; status = 'failed'; phase = $Phase; hresult = $null; bitmapPresent = $null; width = $null; height = $null; cacheFlags = $null; elapsedMs = 0; detailCode = $Code }
}

function ConvertTo-ThumbnailArgument($Value) {
  # Windows command-line quoting: escape backslashes before quotes and before the closing quote.
  return '"' + ([regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1')) + '"'
}

function Read-ThumbnailChildResult($Process, $Stdout, $Stderr) {
  if (-not $Process.WaitForExit($TimeoutSeconds * 1000)) {
    $Process.Kill() # Only the process started by this invocation, never Explorer/dllhost by name.
    [void]$Process.WaitForExit(3000)
    return New-ThumbnailFailure 'child-timeout' 'timeout'
  }
  if (-not $Stdout.Wait(1000) -or -not $Stderr.Wait(1000)) { return New-ThumbnailFailure 'child-output' 'incomplete-output' }
  $raw = $Stdout.Result
  if ($raw.Length -gt 262144 -or -not [string]::IsNullOrWhiteSpace($Stderr.Result)) { return New-ThumbnailFailure 'child-output' 'unexpected-output' }
  try {
    $parsed = $raw | ConvertFrom-Json
    foreach ($field in @('schemaVersion', 'mode', 'status', 'phase', 'hresult', 'bitmapPresent', 'width', 'height', 'cacheFlags', 'elapsedMs', 'detailCode')) {
      if ($parsed.PSObject.Properties.Name -notcontains $field) { throw 'missing-field' }
    }
    if ($parsed.schemaVersion -ne 1 -or $parsed.mode -ne $Mode) { throw 'wrong-contract' }
    if ($parsed.status -notin @('ok', 'collected', 'failed')) { throw 'wrong-status' }
    if ($parsed.status -in @('ok', 'collected') -and $Process.ExitCode -ne 0) { throw 'unexpected-exit' }
    if ($parsed.status -eq 'collected' -and $Mode -ne 'state') { throw 'wrong-collection' }
    if ($parsed.status -eq 'ok' -and $Mode -in @('shell', 'cache-only', 'force-extract')) {
      if ($parsed.hresult -ne '0x00000000' -or $parsed.bitmapPresent -isnot [bool] -or $parsed.bitmapPresent -ne $true) { throw 'invalid-bitmap' }
      if ($parsed.width -isnot [int] -or $parsed.height -isnot [int] -or $parsed.width -le 0 -or $parsed.height -le 0 -or $parsed.width -gt 1024 -or $parsed.height -gt 1024) { throw 'invalid-dimensions' }
    }
    return $parsed
  } catch { return New-ThumbnailFailure 'child-output' 'invalid-json-contract' }
}

function Invoke-ThumbnailChild {
  $info = New-Object Diagnostics.ProcessStartInfo
  $info.FileName = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $child = Join-Path $PSScriptRoot 'windows-thumbnail-probe.ps1'
  $info.Arguments = '-NoLogo -NoProfile -NonInteractive -STA -File ' + (ConvertTo-ThumbnailArgument $child)
  $info.UseShellExecute = $false; $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
  $info.EnvironmentVariables['ALHANGEUL_THUMBNAIL_PROBE_REQUEST'] = (@{ mode = $Mode; inputPath = $InputPath; size = $Size } | ConvertTo-Json -Compress)
  $process = New-Object Diagnostics.Process
  $process.StartInfo = $info
  try {
    if (-not $process.Start()) { return New-ThumbnailFailure 'child-start' 'start-failed' }
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    return Read-ThumbnailChildResult $process $stdout $stderr
  } catch { return New-ThumbnailFailure 'child-execution' 'execution-failed' }
  finally {
    try { if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(3000) } } catch { }
    $process.Dispose()
  }
}

# Output is create-new JSON: never overwrite an existing report or the input document.
$output = [IO.Path]::GetFullPath($OutputPath)
if ([IO.Path]::GetExtension($output) -ine '.json') { throw 'OutputPath must be a new JSON file.' }
if ($Mode -in @('shell', 'cache-only', 'force-extract')) {
  $InputPath = [IO.Path]::GetFullPath($InputPath)
  if ($InputPath -ieq $output) { throw 'OutputPath must differ from InputPath.' }
}
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($output))
$stream = [IO.File]::Open($output, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$timer = [Diagnostics.Stopwatch]::StartNew()
try {
  if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or -not [Environment]::Is64BitProcess) {
    $result = New-ThumbnailFailure 'environment' 'requires-windows-x64'
  } else { $result = Invoke-ThumbnailChild }
  $result.elapsedMs = $timer.ElapsedMilliseconds
  $json = $result | ConvertTo-Json -Depth 16
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $stream.Write($bytes, 0, $bytes.Length)
} finally { $stream.Dispose() }
[Console]::Out.WriteLine(($result | ConvertTo-Json -Depth 16 -Compress))
if ($result.status -notin @('ok', 'collected')) { exit 1 }
exit 0
