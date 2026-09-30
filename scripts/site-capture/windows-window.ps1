param(
  [ValidateSet('App','Explorer')][string]$Kind = 'App',
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$Folder
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CaptureWindow {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int cmd);
 [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int ht,bool repaint);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
}
'@
[CaptureWindow]::SetProcessDPIAware() | Out-Null
if ($Kind -eq 'App') {
  $processes = @(Get-Process | Where-Object { $_.ProcessName -eq 'Alhangeul' -and $_.MainWindowHandle -ne 0 })
  if ($processes.Count -ne 1) { throw 'Expected one Alhangeul native window' }
  $handle = $processes[0].MainWindowHandle
} else {
  $shell = New-Object -ComObject Shell.Application
  $shell.Open($Folder)
  $window = $null
  for ($i=0; $i -lt 30; $i++) {
    $window = @($shell.Windows() | Where-Object {
      try { $_.Document.Folder.Self.Path -eq $Folder } catch { $false }
    }) | Select-Object -First 1
    if ($window) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $window) { throw 'Explorer folder window unavailable' }
  $handle = [IntPtr]$window.HWND
}
[CaptureWindow]::ShowWindow($handle,9) | Out-Null
[CaptureWindow]::SetForegroundWindow($handle) | Out-Null
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$width = [Math]::Min(1282,$screen.Width-24)
$height = [Math]::Min(924,$screen.Height-48)
if (-not [CaptureWindow]::MoveWindow($handle,8,8,$width,$height,$true)) { throw 'MoveWindow failed' }
if ($Kind -eq 'Explorer') {
  $window.Document.CurrentViewMode = 5
  (New-Object -ComObject WScript.Shell).SendKeys('^+1')
  Start-Sleep -Seconds 20
} else { Start-Sleep -Seconds 2 }
[System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(($screen.Width-2),($screen.Height-2))
$rect = New-Object CaptureWindow+Rect
if (-not [CaptureWindow]::GetWindowRect($handle,[ref]$rect)) { throw 'GetWindowRect failed' }
$bitmap = [System.Drawing.Bitmap]::new(($rect.Right-$rect.Left),($rect.Bottom-$rect.Top))
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,$bitmap.Size)
  $bitmap.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png)
  @{kind=$Kind;width=$bitmap.Width;height=$bitmap.Height;method='native-screen-copy';requiresVisualReview=$true} |
    ConvertTo-Json | Set-Content -LiteralPath "$OutputPath.json" -Encoding UTF8
} finally { $graphics.Dispose(); $bitmap.Dispose() }
