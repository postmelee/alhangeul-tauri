# Internal child entry; the parent sends data via the child's environment, never executable input.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$timer = [Diagnostics.Stopwatch]::StartNew()
$result = [ordered]@{ schemaVersion = 1; mode = $null; phase = 'request'; status = 'failed'; hresult = $null; bitmapPresent = $null; width = $null; height = $null; cacheFlags = $null; elapsedMs = 0; detailCode = $null }
try {
  $request = $env:ALHANGEUL_THUMBNAIL_PROBE_REQUEST | ConvertFrom-Json
  Remove-Item Env:\ALHANGEUL_THUMBNAIL_PROBE_REQUEST
  if ($request.mode -notin @('state', 'association', 'activate', 'shell', 'cache-only', 'force-extract')) { throw 'invalid-mode' }
  $result.mode = $request.mode
  if (-not [Environment]::Is64BitProcess -or [Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'requires-windows-x64' }
  if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') { throw 'requires-sta' }
  $result.phase = 'compile-interop'
  Add-Type -Path @((Join-Path $PSScriptRoot 'windows-thumbnail-native.cs'), (Join-Path $PSScriptRoot 'windows-thumbnail-interop.cs'), (Join-Path $PSScriptRoot 'windows-thumbnail-token.cs'))
  if ($request.mode -eq 'state') {
    . (Join-Path $PSScriptRoot 'windows-thumbnail-state.ps1')
    $result.phase = 'state'
    $result.environment = Get-ThumbnailEnvironmentState
    # Collection succeeded; each field still has its own missing/unreadable/invalid status.
    $result.status = 'collected'
  } else {
    $inputValue = [string]$request.inputPath
    if ($request.mode -eq 'association') {
      if ($inputValue -notin @('.hwp', '.hwpx', '.jpg', '.jpeg')) { throw 'invalid-extension' }
      $inputValue = $inputValue.ToLowerInvariant()
    } elseif ($request.mode -ne 'activate') {
      $result.phase = 'input'
      if (-not (Test-Path -LiteralPath $inputValue -PathType Leaf)) { throw 'missing-input-file' }
      if ([IO.Path]::GetExtension($inputValue).ToLowerInvariant() -notin @('.hwp', '.hwpx', '.jpg', '.jpeg')) { throw 'invalid-extension' }
    }
    $result = [Alhangeul.ThumbnailDiagnostics.Probe]::Run($request.mode, $inputValue, [int]$request.size)
  }
} catch {
  $result.status = 'failed'
  $result.hresult = '0x{0:X8}' -f ($_.Exception.HResult -band 0xffffffffL)
  $result.detailCode = 'probe-exception' # Do not print compiler diagnostics, exception text or paths.
} finally {
  $result.elapsedMs = $timer.ElapsedMilliseconds
  [Console]::Out.WriteLine(($result | ConvertTo-Json -Depth 16 -Compress))
}
if ($result.status -notin @('ok', 'collected')) { exit 1 }
