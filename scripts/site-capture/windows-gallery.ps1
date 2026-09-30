param(
  [Parameter(Mandatory=$true)][string]$Folder,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
$shared = Split-Path $PSScriptRoot -Parent
. (Join-Path $shared 'windows-thumbnail-state.ps1')
. (Join-Path $shared 'windows-thumbnail-app-display.ps1')
Add-Type -Path (Join-Path $shared 'windows-thumbnail-token.cs')
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class GallerySettings {
 [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,UIntPtr w,string l,uint flags,uint timeout,out UIntPtr result);
}
'@
function Assert-Condition($Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}
function Notify-GallerySettings {
  $result = [UIntPtr]::Zero
  $sent = [GallerySettings]::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,
    'Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced',2,2000,[ref]$result)
  return ($sent -ne [IntPtr]::Zero)
}
$report = [ordered]@{
  stage='initial';failureStage=$null;display=[ordered]@{};before=$null;prepared=$null;after=$null
  notificationPrepared=$false;notificationRestored=$false;captureExitCode=$null
  requiresVisualReview=$true
}
try {
  $report.before = Get-ThumbnailEnvironmentState
  Invoke-AppDiagnosticDisplay $report {
    $report.prepared = Get-ThumbnailEnvironmentState
    $report.notificationPrepared = Notify-GallerySettings
    # Open a fresh folder view after the setting change. Never prepopulate thumbnail cache.
    $shell = New-Object -ComObject Shell.Application
    foreach ($existing in @($shell.Windows())) {
      try { if ($existing.Document.Folder.Self.Path -eq $Folder) { $existing.Quit() } } catch { }
    }
    & powershell.exe -NoProfile -STA -File (Join-Path $PSScriptRoot 'windows-window.ps1') `
      -Kind Explorer -Folder $Folder -OutputPath $OutputPath
    $report.captureExitCode = $LASTEXITCODE
    if ($LASTEXITCODE -ne 0) { throw 'Explorer capture failed; inspect window capture metadata' }
  }
} finally {
  $report.notificationRestored = Notify-GallerySettings
  $report.after = Get-ThumbnailEnvironmentState
  $report | ConvertTo-Json -Depth 15 |
    Set-Content -LiteralPath "$OutputPath.settings.json" -Encoding UTF8
}
