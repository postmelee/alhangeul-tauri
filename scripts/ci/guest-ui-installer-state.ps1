Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AlhGuestLoad {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr LoadLibraryExW(string path, IntPtr file, uint flags);
  [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool SetThreadErrorMode(uint mode, out uint oldMode);
  public static int Read(string path) {
    uint oldMode;
    if (!SetThreadErrorMode(1, out oldMode)) return Marshal.GetLastWin32Error();
    try {
      IntPtr module = LoadLibraryExW(path, IntPtr.Zero, 0x100 | 0x1000);
      if (module == IntPtr.Zero) return Marshal.GetLastWin32Error();
      FreeLibrary(module); return 0;
    } finally { uint ignored; SetThreadErrorMode(oldMode, out ignored); }
  }
}
'@

# Read only prerequisite and partial-install state from this disposable guest.
function Get-GuestInstallerState([ValidateSet('nsis', 'msi')][string]$Installer = 'nsis') {
  $versions = @()
  foreach ($hive in @([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryHive]::CurrentUser)) {
    foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
      $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
      $runtime = $null
      try {
        $runtime = $base.OpenSubKey('SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}')
        $versions += @{ hive = [string]$hive; view = [string]$view; version = $(if ($runtime) { $runtime.GetValue('pv', $null) } else { $null }) }
      } finally { if ($runtime) { $runtime.Dispose() }; $base.Dispose() }
    }
  }
  $directory = Join-Path $env:LOCALAPPDATA 'Alhangeul'
  $handlerKey = 'HKCU:\Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32'
  if ($Installer -eq 'msi') {
    $directory = Join-Path $env:ProgramFiles 'Alhangeul'
    $handlerKey = $handlerKey.Replace('HKCU:', 'HKLM:')
  }
  $registered = Test-Path $handlerKey
  if ($registered) { $directory = Split-Path -Parent (Get-Item $handlerKey).GetValue('') }
  $files = @()
  if (Test-Path $directory) {
    $files = @(Get-ChildItem -LiteralPath $directory -File | ForEach-Object {
      @{ name = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
  }
  $crt = Join-Path $env:SystemRoot 'System32\VCRUNTIME140.dll'
  $reference = 'C:\AlhProbe\verification\AlhangeulThumbnailHandler.dll'
  return @{ vcRuntimePresent = (Test-Path $crt); vcRuntimeLoadError = [AlhGuestLoad]::Read($crt);
    referenceHandlerLoadError = [AlhGuestLoad]::Read($reference); webview2 = $versions; handlerRegistered = $registered; directory = $directory; files = $files;
    bootstrapperPresent = (Test-Path (Join-Path $env:TEMP 'MicrosoftEdgeWebview2Setup.exe')) }
}

function Wait-GuestNetwork {
  for ($i = 0; $i -lt 45; $i++) {
    if (@(Get-NetAdapter | Where-Object Status -eq 'Up').Count -gt 0 -and
        @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue).Count -gt 0) {
      Start-Sleep -Seconds 5
      return
    }
    Start-Sleep -Seconds 2
  }
  throw 'guest-network-not-ready'
}
