param(
  [Parameter(Mandatory = $true)][string]$Root, [switch]$StandardWindowOnly,
  [ValidateSet('ShellOpen', 'Navigate', 'Process', 'SeparateProcess')][string]$OpenMethod = 'ShellOpen',
  [ValidatePattern('^$|^[a-z0-9-]{1,50}$')][string]$ProbeName = '',
  [switch]$EmptyFolder
)
Set-StrictMode -Version Latest
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'disposable-hosted-only' }
$scripts = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'hosted-ui-view.ps1')
$viewState = $null
$ErrorActionPreference = 'Stop'
$output = Join-Path $Root 'evidence'
if ($ProbeName) { $output = Join-Path $output $ProbeName }
[void][IO.Directory]::CreateDirectory($output)
$folder = Join-Path $output $(if ($ProbeName) { 'alh-ui-' + $ProbeName } else { 'explorer-fixtures' })
$timer = [Diagnostics.Stopwatch]::StartNew()
if ($ProbeName) { Add-Type -Path (Join-Path $PSScriptRoot 'hosted-ui-window.cs') }
$report = [ordered]@{ schemaVersion = 1; status = 'unavailable'; phase = 'preflight'; interactive = [Environment]::UserInteractive; sessionId = (Get-Process -Id $PID).SessionId; desktopOwnerMatches = $false; ownerMatches = $false; sessionMatches = $false; visible = $false; iconSize = $null; screenshotSha256 = $null; requiresVisualReview = $true; windowClosed = $false }
$shell = $null; $window = $null; $owned = $false
$nativeMode = $OpenMethod -in @('Process', 'SeparateProcess')
if ($nativeMode) {
  if (-not $StandardWindowOnly -or -not $ProbeName) { throw 'native-probe-context-required' }
  . (Join-Path $PSScriptRoot 'hosted-ui-process.ps1')
}
$report['openMethod'] = $OpenMethod; $report['emptyFolder'] = [bool]$EmptyFolder; $report['capturePid'] = $PID
function Save-VisualEvidence { if ($ProbeName) { $report['nativeThreadId'] = [Alhangeul.HostedExplorer.Native]::GetCurrentThreadId() }; $report['elapsedMs'] = $timer.ElapsedMilliseconds; $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'explorer-visual.json') -Encoding UTF8 }
Save-VisualEvidence
try {
  Add-Type -Path (Join-Path $scripts 'windows-thumbnail-token.cs')
  $report['token'] = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read()
  $report['scope'] = $(if ($StandardWindowOnly) { 'hosted-server-nsis-window-observation' } else { 'hosted-server-msi-observation' })
  if ($StandardWindowOnly -and ($report.token.elevated -or $report.token.integrityRid -ne 8192)) { throw 'standard-token-required' }
  Add-Type -AssemblyName System.Drawing
  Add-Type -Path (Join-Path $scripts 'windows-thumbnail-user-visual.cs')
  if (-not $report.interactive -or $report.sessionId -eq 0) { throw 'interactive-desktop-unavailable' }
  $desktop = [Alhangeul.ThumbnailUserVisual.Window]::GetShellWindow()
  if ($desktop -eq [IntPtr]::Zero) { throw 'interactive-shell-unavailable' }
  [uint32]$desktopPid = 0
  [void][Alhangeul.ThumbnailUserVisual.Window]::GetWindowThreadProcessId($desktop, [ref]$desktopPid)
  $desktopProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $desktopPid)
  $desktopOwner = Invoke-CimMethod -InputObject $desktopProcess -MethodName GetOwnerSid
  $report.desktopOwnerMatches = $desktopOwner.ReturnValue -eq 0 -and $desktopOwner.Sid -eq [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if (-not $StandardWindowOnly -and (-not $report.desktopOwnerMatches -or $desktopProcess.SessionId -ne $report.sessionId)) { throw 'interactive-shell-owner-mismatch' }
  [void][Alhangeul.ThumbnailUserVisual.Window]::SetProcessDPIAware()
  [void][IO.Directory]::CreateDirectory($folder)
  $fixtures = (Get-Content -LiteralPath (Join-Path $scripts 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in @($fixtures | Where-Object { -not $EmptyFolder })) { Copy-Item -LiteralPath (Join-Path $Root $fixture.path) -Destination (Join-Path $folder ($fixture.id + [IO.Path]::GetExtension($fixture.path))) }
  $viewState = Set-HostedThumbnailView
  $report['displayPreference'] = $viewState
  if ($nativeMode) {
    $handle = Open-HostedExplorerProcess $folder $report -Separate:($OpenMethod -eq 'SeparateProcess')
  } elseif ($OpenMethod -eq 'Navigate') {
    $report.phase = 'create-browser-window'; Save-VisualEvidence
    # CLSID_ShellBrowserWindow, documented by Microsoft Developing with Windows Explorer.
    $window = [Activator]::CreateInstance([type]::GetTypeFromCLSID([guid]'C08AFD90-F2A1-11D1-8455-00A0C91F3880'))
    $report.phase = 'navigate-folder'; Save-VisualEvidence
    $window.Navigate2($folder)
    $window.Visible = $true
  } else {
    $report.phase = 'create-shell'; Save-VisualEvidence
    $shell = New-Object -ComObject Shell.Application
    if ($OpenMethod -eq 'ShellOpen') { $report.phase = 'open-folder'; Save-VisualEvidence; $shell.Open($folder) }
    $report.phase = 'find-window'; Save-VisualEvidence
    for ($i = 0; $i -lt 30; $i++) {
      $window = @($shell.Windows() | Where-Object { try { $_.Document.Folder.Self.Path -eq $folder } catch { $false } }) | Select-Object -First 1
      if ($window) { break }; Start-Sleep -Milliseconds 500
    }
  }
  if (-not $nativeMode) {
    if (-not $window) { throw 'explorer-window-unavailable' }
    $handle = [IntPtr]$window.HWND
  }
  [uint32]$windowPid = 0
  [void][Alhangeul.ThumbnailUserVisual.Window]::GetWindowThreadProcessId($handle, [ref]$windowPid)
  $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $windowPid)
  $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
  $report.ownerMatches = $owner.ReturnValue -eq 0 -and $owner.Sid -eq [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $report.sessionMatches = $process.SessionId -eq (Get-Process -Id $PID).SessionId
  if (-not $report.ownerMatches -or -not $report.sessionMatches -or $process.Name -ine 'explorer.exe') { throw 'explorer-owner-mismatch' }
  $owned = $true
  $report.phase = 'set-view'; Save-VisualEvidence
  if ($nativeMode) {
    Set-HostedNativeView $handle
    $report['viewControl'] = 'keyboard-extra-large'
  } else {
    $window.Document.CurrentViewMode = 5
    $window.Document.IconSize = 192
    $report.iconSize = [int]$window.Document.IconSize
    if ($report.iconSize -ne 192) { throw 'explorer-view-not-applied' }
  }
  [void][Alhangeul.ThumbnailUserVisual.Window]::MoveWindow($handle, 8, 8, 1000, 650, $true)
  Start-Sleep -Seconds 10
  $report.visible = [Alhangeul.ThumbnailUserVisual.Window]::IsWindowVisible($handle)
  $rect = New-Object Alhangeul.ThumbnailUserVisual.Window+Rect
  if (-not $report.visible -or -not [Alhangeul.ThumbnailUserVisual.Window]::GetWindowRect($handle, [ref]$rect)) { throw 'explorer-not-visible' }
  $report.phase = 'capture'; Save-VisualEvidence
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
  if ($owned -and $nativeMode) { $report.windowClosed = Close-HostedNativeWindow $handle }
  if ($owned -and $window) { $report.phase = 'close-window'; Save-VisualEvidence; try { $window.Quit(); $report.windowClosed = $true } catch { $report.windowClosed = $false } }
  if ($window) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($window) }
  if ($shell) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) }
  if ($viewState) {
    try { Restore-HostedThumbnailView $viewState } catch { $report['restoreFailure'] = $_.Exception.Message }
    $report['displayPreference'] = $viewState
  }
  Save-VisualEvidence
}
# Capture is evidence for human review, never automatic Explorer acceptance.
