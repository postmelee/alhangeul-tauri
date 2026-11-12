# Read only prerequisite and partial-install state from this disposable guest.
function Get-GuestInstallerState {
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
  $registered = Test-Path $handlerKey
  if ($registered) { $directory = Split-Path -Parent (Get-Item $handlerKey).GetValue('') }
  $files = @()
  if (Test-Path $directory) {
    $files = @(Get-ChildItem -LiteralPath $directory -File | ForEach-Object {
      @{ name = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
  }
  return @{ webview2 = $versions; handlerRegistered = $registered; directory = $directory; files = $files;
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
