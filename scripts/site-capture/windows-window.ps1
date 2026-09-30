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
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h,int attribute,out Rect r,int size);
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int cmd);
 [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int ht,bool repaint);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
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
$targetWidth = $(if ($Kind -eq 'App') {1282} else {1180})
$targetHeight = $(if ($Kind -eq 'App') {924} else {780})
if ($screen.Width -lt 1400 -or $screen.Height -lt 1000) { throw 'Screen too small for matched composition' }
$width = $targetWidth
$height = $targetHeight
if (-not [CaptureWindow]::MoveWindow($handle,8,8,$width,$height,$true)) { throw 'MoveWindow failed' }
# Compensate invisible resize margins so the captured visible frame matches Linux dimensions.
Start-Sleep -Milliseconds 500
$outer = New-Object CaptureWindow+Rect
$visible = New-Object CaptureWindow+Rect
if (-not [CaptureWindow]::GetWindowRect($handle,[ref]$outer) -or
    [CaptureWindow]::DwmGetWindowAttribute($handle,9,[ref]$visible,16) -ne 0) { throw 'Visible frame bounds unavailable' }
$width += ($outer.Right-$outer.Left)-($visible.Right-$visible.Left)
$height += ($outer.Bottom-$outer.Top)-($visible.Bottom-$visible.Top)
if (-not [CaptureWindow]::MoveWindow($handle,20,20,$width,$height,$true)) { throw 'Frame size adjustment failed' }
if ($Kind -eq 'Explorer') {
  $window.Document.CurrentViewMode = 5
  # IShellFolderViewDual3: set and read back the actual native icon size.
  $window.Document.IconSize = 192
  Start-Sleep -Milliseconds 500
  $actualIconSize = [int]$window.Document.IconSize
  if ($actualIconSize -ne 192) { throw "Explorer did not apply requested icon size: $actualIconSize" }
  Start-Sleep -Seconds 40
} else { Start-Sleep -Seconds 12 }
[System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(($screen.Width-2),($screen.Height-2))
$rect = New-Object CaptureWindow+Rect
if (-not [CaptureWindow]::GetWindowRect($handle,[ref]$rect)) { throw 'GetWindowRect failed' }
# Windows owns the capture bounds. No screen-coordinate copy or image cropping.
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Clipboard capture requires -STA' }
$attempts = [System.Collections.Generic.List[object]]::new()
function Read-WindowClipboard {
  for ($i=0; $i -lt 20; $i++) {
    if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
      $img = [System.Windows.Forms.Clipboard]::GetImage()
      # Reject stale, full-desktop or Snipping Tool window captures by expected size.
      if ([Math]::Abs($img.Width-($rect.Right-$rect.Left)) -le 32 -and
          [Math]::Abs($img.Height-($rect.Bottom-$rect.Top)) -le 32) { return $img }
      $attempts.Add(@{result='unexpected-image-size';width=$img.Width;height=$img.Height})
      $img.Dispose()
      return $null
    }
    Start-Sleep -Milliseconds 250
  }
  return $null
}
function Focus-Target {
  [CaptureWindow]::SetForegroundWindow($handle) | Out-Null
  Start-Sleep -Milliseconds 500
  if ([CaptureWindow]::GetForegroundWindow() -ne $handle) { throw 'Target window is not foreground' }
}
$bitmap = $null
$method = $null
$snipper = $null
$snipCommand = Get-Command SnippingTool.exe -ErrorAction SilentlyContinue
try {
  if ($snipCommand) {
    try {
      [System.Windows.Forms.Clipboard]::Clear()
      $snipper = Start-Process -FilePath $snipCommand.Source -PassThru
      Start-Sleep -Seconds 3
      # Documented desktop Snipping Tool shortcuts: mode -> Window, then New.
      $keys = New-Object -ComObject WScript.Shell
      if (-not $keys.AppActivate($snipper.Id)) { throw 'Snipping Tool window could not be activated' }
      $keys.SendKeys('%m')
      Start-Sleep -Milliseconds 500
      $keys.SendKeys('w')
      Start-Sleep -Milliseconds 500
      $keys.SendKeys('%n')
      Start-Sleep -Seconds 2
      [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(($rect.Left+100),($rect.Top+15))
      [CaptureWindow]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
      [CaptureWindow]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
      $bitmap = Read-WindowClipboard
      if ($bitmap) { $method = 'snipping-tool-window' }
      else { throw 'Snipping Tool did not supply an expected window image' }
    } catch {
      $attempts.Add(@{method='snipping-tool-window';result='unavailable';reason=$_.Exception.Message})
    } finally {
      (New-Object -ComObject WScript.Shell).SendKeys('{ESC}')
      if ($snipper -and -not $snipper.HasExited) { $snipper.CloseMainWindow() | Out-Null }
    }
  } else { $attempts.Add(@{method='snipping-tool-window';result='command-unavailable'}) }
  if (-not $bitmap) {
    Focus-Target
    [System.Windows.Forms.Clipboard]::Clear()
    # Alt+PrintScreen: the OS captures the active window directly to the clipboard.
    [CaptureWindow]::keybd_event(0x12,0,0,[UIntPtr]::Zero)
    [CaptureWindow]::keybd_event(0x2C,0,0,[UIntPtr]::Zero)
    [CaptureWindow]::keybd_event(0x2C,0,2,[UIntPtr]::Zero)
    [CaptureWindow]::keybd_event(0x12,0,2,[UIntPtr]::Zero)
    $bitmap = Read-WindowClipboard
    if (-not $bitmap) { throw 'Windows active-window capture did not supply an expected image' }
    $method = 'windows-alt-printscreen'
  }
  $bitmap.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  @{kind=$Kind;method=$method;attempts=@($attempts.ToArray());
    iconSize=$(if ($Kind -eq 'Explorer') { $actualIconSize } else { $null });
    targetWidth=$targetWidth;targetHeight=$targetHeight;
    width=$(if ($bitmap) { $bitmap.Width } else { 0 });
    height=$(if ($bitmap) { $bitmap.Height } else { 0 });
    snippingToolPath=$(if ($snipCommand) { $snipCommand.Source } else { $null });
    requiresVisualReview=$true} | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath "$OutputPath.json" -Encoding UTF8
  if ($bitmap) { $bitmap.Dispose() }
}
