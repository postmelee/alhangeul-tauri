param([Parameter(Mandatory = $true)][string]$Root)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$output = Join-Path $Root 'evidence'
$folder = Join-Path $output 'explorer-fixtures'
$report = [ordered]@{ schemaVersion = 1; status = 'unavailable'; ownerMatches = $false; sessionMatches = $false; visible = $false; iconSize = $null; screenshotSha256 = $null; requiresVisualReview = $true; windowClosed = $false }
$shell = $null; $window = $null; $owned = $false
try {
  if ([Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read().integrityRid -ne 8192) { throw 'standard-token-required' }
  Add-Type -AssemblyName System.Drawing
  Add-Type -Path (Join-Path $PSScriptRoot 'windows-thumbnail-user-visual.cs')
  [void][Alhangeul.ThumbnailUserVisual.Window]::SetProcessDPIAware()
  [void][IO.Directory]::CreateDirectory($folder)
  $fixtures = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in $fixtures) { Copy-Item -LiteralPath (Join-Path $Root $fixture.path) -Destination (Join-Path $folder ($fixture.id + [IO.Path]::GetExtension($fixture.path))) }
  $shell = New-Object -ComObject Shell.Application
  $shell.Open($folder)
  for ($i = 0; $i -lt 30; $i++) {
    $window = @($shell.Windows() | Where-Object { try { $_.Document.Folder.Self.Path -eq $folder } catch { $false } }) | Select-Object -First 1
    if ($window) { break }; Start-Sleep -Milliseconds 500
  }
  if (-not $window) { throw 'explorer-window-unavailable' }
  $handle = [IntPtr]$window.HWND
  [uint32]$windowPid = 0
  [void][Alhangeul.ThumbnailUserVisual.Window]::GetWindowThreadProcessId($handle, [ref]$windowPid)
  $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $windowPid)
  $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
  $report.ownerMatches = $owner.ReturnValue -eq 0 -and $owner.Sid -eq [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $report.sessionMatches = $process.SessionId -eq (Get-Process -Id $PID).SessionId
  if (-not $report.ownerMatches -or -not $report.sessionMatches -or $process.Name -ine 'explorer.exe') { throw 'explorer-owner-mismatch' }
  $owned = $true
  $window.Document.CurrentViewMode = 5
  $window.Document.IconSize = 192
  $report.iconSize = [int]$window.Document.IconSize
  if ($report.iconSize -ne 192) { throw 'explorer-view-not-applied' }
  [void][Alhangeul.ThumbnailUserVisual.Window]::MoveWindow($handle, 8, 8, 1100, 720, $true)
  Start-Sleep -Seconds 10
  $report.visible = [Alhangeul.ThumbnailUserVisual.Window]::IsWindowVisible($handle)
  $rect = New-Object Alhangeul.ThumbnailUserVisual.Window+Rect
  if (-not $report.visible -or -not [Alhangeul.ThumbnailUserVisual.Window]::GetWindowRect($handle, [ref]$rect)) { throw 'explorer-not-visible' }
  $bitmap = [Drawing.Bitmap]::new($rect.Right - $rect.Left, $rect.Bottom - $rect.Top)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $dc = $graphics.GetHdc()
  try { if (-not [Alhangeul.ThumbnailUserVisual.Window]::PrintWindow($handle, $dc, 2)) { throw 'explorer-capture-failed' } }
  finally { $graphics.ReleaseHdc($dc); $graphics.Dispose() }
  $path = Join-Path $output 'explorer.png'
  try { $bitmap.Save($path, [Drawing.Imaging.ImageFormat]::Png) } finally { $bitmap.Dispose() }
  $report.screenshotSha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.status = 'captured-awaiting-review'
} catch { $report['errorCode'] = $_.Exception.HResult; $report['failure'] = $_.Exception.Message }
finally {
  if ($owned -and $window) { try { $window.Quit(); $report.windowClosed = $true } catch { $report.windowClosed = $false } }
  if ($window) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($window) }
  if ($shell) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'explorer-visual.json') -Encoding UTF8
}
# Capture is evidence for human review, never automatic Explorer acceptance.
