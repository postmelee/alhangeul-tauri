$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
$env:PRIVACY_OUT = $out
$conf = Join-Path $env:RUNNER_TEMP 'privacy-ca'
$policy = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
$appPath = Join-Path $env:LOCALAPPDATA 'Alhangeul\Alhangeul.exe'
$profile = Join-Path $env:LOCALAPPDATA 'io.github.postmelee.alhangeul'
$cert = $null
function Inventory($phase) {
  $logs = @(Get-ChildItem $profile -Recurse -File -Filter '*.log*' -ErrorAction SilentlyContinue | ForEach-Object {
    @{path=$_.FullName.Substring($profile.Length); bytes=$_.Length}
  })
  @{phase=$phase; logs=$logs; appExists=(Test-Path $appPath)} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $out "lifecycle-$phase.json")
}
$proxy = Start-Process mitmdump -ArgumentList @('-q','--listen-host','127.0.0.1','--listen-port','8080','--set',"confdir=$conf",'-s','scripts/privacy/tls-observer.py') -PassThru
try {
  for ($n=0; $n -lt 30 -and -not (Test-Path "$conf/mitmproxy-ca-cert.cer"); $n++) { Start-Sleep 1 }
  $cert = Import-Certificate -FilePath "$conf/mitmproxy-ca-cert.cer" -CertStoreLocation Cert:\CurrentUser\Root
  $env:HTTPS_PROXY='http://127.0.0.1:8080'
  $env:HTTP_PROXY=$env:HTTPS_PROXY
  $env:NO_PROXY='localhost,127.0.0.1'
  New-Item $policy -Force | Out-Null
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) {
    New-ItemProperty $policy -Name $name -PropertyType String -Value '--remote-debugging-port=9222 --proxy-server=http://127.0.0.1:8080 --disable-quic' -Force | Out-Null
  }
  $install=Start-Process (Join-Path $out 'Alhangeul_0.1.3_x64-setup.exe') -ArgumentList '/S' -Wait -PassThru
  if ($install.ExitCode -ne 0) { throw 'installation failed' }
  'startup' | Set-Content (Join-Path $out 'phase')
  $app=Start-Process $appPath -PassThru
  Start-Sleep 45
  if ($app.HasExited) { throw 'app died' }
  Inventory 'running'
  node scripts/privacy/document-cdp.mjs
  $documentFailed = $LASTEXITCODE -ne 0
  'exit' | Set-Content (Join-Path $out 'phase')
  Stop-Process -Id $app.Id -Force
  Start-Sleep 3
  Inventory 'exit'
  'restart' | Set-Content (Join-Path $out 'phase')
  $app=Start-Process $appPath -PassThru
  Start-Sleep 20
  Stop-Process -Id $app.Id -Force
  Start-Sleep 3
  Inventory 'restart'
  $remove=Start-Process (Join-Path $env:LOCALAPPDATA 'Alhangeul\uninstall.exe') -ArgumentList '/S' -Wait -PassThru
  Start-Sleep 5
  if ($remove.ExitCode -ne 0 -or (Test-Path $appPath)) { throw 'uninstall incomplete' }
  Inventory 'uninstall'
  Get-ChildItem $profile -Recurse -File -Filter '*.log*' -ErrorAction SilentlyContinue | Remove-Item -Force
  Inventory 'manual-log-delete'
  if ($documentFailed) { throw 'document observation failed; lifecycle still collected' }
} finally {
  Get-Process Alhangeul -ErrorAction SilentlyContinue | Stop-Process -Force
  Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  if ($cert) { Remove-Item "Cert:\CurrentUser\Root\$($cert.Thumbprint)" }
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) { Remove-ItemProperty $policy -Name $name -ErrorAction SilentlyContinue }
  Remove-Item $conf -Recurse -Force -ErrorAction SilentlyContinue
}
