param(
  [Parameter(Mandatory = $true)][long]$AppHwnd,
  [Parameter(Mandatory = $true)][int]$AppPid,
  [Parameter(Mandatory = $true)][long]$ExplorerHwnd,
  [Parameter(Mandatory = $true)][int]$ExplorerPid
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class AlhangeulWindowLayout {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(
    IntPtr hWnd, IntPtr after, int x, int y, int width, int height, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SystemParametersInfo(
    uint action, uint param, out RECT rect, uint flags);
}
"@

function Assert-Window([long]$Handle, [int]$ExpectedPid) {
  $pointer = [IntPtr]::new($Handle)
  if (-not [AlhangeulWindowLayout]::IsWindow($pointer)) { throw "Invalid HWND: $Handle" }
  [uint32]$actualPid = 0
  [void][AlhangeulWindowLayout]::GetWindowThreadProcessId($pointer, [ref]$actualPid)
  if ($actualPid -ne $ExpectedPid) { throw "HWND $Handle PID mismatch" }
}

function Set-Layout([long]$Handle, [int]$X, [int]$Y, [int]$Width, [int]$Height) {
  $pointer = [IntPtr]::new($Handle)
  [void][AlhangeulWindowLayout]::ShowWindow($pointer, 9)
  if (-not [AlhangeulWindowLayout]::SetWindowPos(
    $pointer, [IntPtr]::Zero, $X, $Y, $Width, $Height, 0x0054)) {
    throw "SetWindowPos failed for HWND $Handle"
  }
  $rect = New-Object AlhangeulWindowLayout+RECT
  if (-not [AlhangeulWindowLayout]::GetWindowRect($pointer, [ref]$rect)) {
    throw "GetWindowRect failed for HWND $Handle"
  }
  return [ordered]@{
    x = $rect.Left; y = $rect.Top
    width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top
  }
}

Assert-Window $AppHwnd $AppPid
Assert-Window $ExplorerHwnd $ExplorerPid
$work = New-Object AlhangeulWindowLayout+RECT
if (-not [AlhangeulWindowLayout]::SystemParametersInfo(0x0030, 0, [ref]$work, 0)) {
  throw 'Cannot read Windows work area'
}
$width = $work.Right - $work.Left
$height = $work.Bottom - $work.Top
$gap = 16
$minimumPaneWidth = 400
if ($width -lt (($minimumPaneWidth * 2) + $gap) -or $height -lt 600) {
  throw 'Interactive work area is too small'
}
$leftWidth = [Math]::Floor(($width - $gap) / 2)
$rightX = $work.Left + $leftWidth + $gap
$explorer = Set-Layout $ExplorerHwnd $work.Left $work.Top $leftWidth $height
$app = Set-Layout $AppHwnd $rightX $work.Top ($work.Right - $rightX) $height
[ordered]@{
  workArea = [ordered]@{ x = $work.Left; y = $work.Top; width = $width; height = $height }
  app = $app; explorer = $explorer
} | ConvertTo-Json -Compress
