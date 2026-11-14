# Definition-only, reversible Explorer display preference for disposable hosted probes.
function Send-HostedViewChange {
  if (-not ('Alhangeul.HostedView' -as [type])) {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
namespace Alhangeul {
  public static class HostedView {
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern IntPtr SendMessageTimeout(IntPtr window, uint message,
      IntPtr word, string text, uint flags, uint timeout, out IntPtr result);
  }
}
'@
  }
  [IntPtr]$result = [IntPtr]::Zero
  [void][Alhangeul.HostedView]::SendMessageTimeout([IntPtr]0xffff, 0x1a, [IntPtr]::Zero, 'ShellState', 2, 1000, [ref]$result)
}
function Set-HostedThumbnailView {
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced', $true)
  if (-not $key) { throw 'explorer-preferences-unavailable' }
  try {
    $exists = $key.GetValueNames() -contains 'IconsOnly'
    $state = [ordered]@{ exists = $exists; value = $key.GetValue('IconsOnly'); kind = $null; applied = $false; restored = $false; policies = @() }
    if ($exists) { $state.kind = [string]$key.GetValueKind('IconsOnly') }
    foreach ($hive in @('HKCU', 'HKLM')) {
      $path = $hive + ':\Software\Policies\Microsoft\Windows\Explorer'
      $value = Get-ItemProperty -LiteralPath $path -Name DisableThumbnails -ErrorAction SilentlyContinue
      $state.policies += @{ hive = $hive; disableThumbnails = $(if ($value) { $value.DisableThumbnails } else { $null }) }
    }
    $key.SetValue('IconsOnly', 0, [Microsoft.Win32.RegistryValueKind]::DWord)
    $state.applied = $key.GetValue('IconsOnly') -eq 0
    Send-HostedViewChange
    return $state
  } finally { $key.Dispose() }
}
function Restore-HostedThumbnailView($State) {
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced', $true)
  try {
    if ($State.exists) { $key.SetValue('IconsOnly', $State.value, [Microsoft.Win32.RegistryValueKind]$State.kind) }
    else { $key.DeleteValue('IconsOnly', $false) }
    $State.restored = $(if ($State.exists) { $key.GetValue('IconsOnly') -eq $State.value } else { $key.GetValueNames() -notcontains 'IconsOnly' })
    Send-HostedViewChange
  } finally { $key.Dispose() }
}
