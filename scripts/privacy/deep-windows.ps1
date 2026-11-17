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
    @{path=$_.FullName.Substring($profile.Length); bytes=$_.Length; diagnostic=($_.DirectoryName -eq (Join-Path $profile 'logs') -or $_.Name -match '^(favorites|settings)_diagnostic\.log$')}
  })
  @{phase=$phase; logs=$logs; appExists=(Test-Path $appPath)} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $out "lifecycle-$phase.json")
}
Write-Host 'Starting isolated TLS proxy'
$proxy = Start-Process mitmdump -ArgumentList @('-q','--listen-host','127.0.0.1','--listen-port','8080','--set',"confdir=$conf",'-s','scripts/privacy/tls-observer.py') -PassThru
try {
  for ($n=0; $n -lt 30 -and -not (Test-Path "$conf/mitmproxy-ca-cert.cer"); $n++) { Start-Sleep 1 }
  Write-Host 'Installing test CA in disposable runner machine store'
  $cert = Import-Certificate -FilePath "$conf/mitmproxy-ca-cert.cer" -CertStoreLocation Cert:\LocalMachine\Root
  Write-Host 'Test CA installed'
  $env:HTTPS_PROXY='http://127.0.0.1:8080'
  $env:HTTP_PROXY=$env:HTTPS_PROXY
  $env:NO_PROXY='localhost,127.0.0.1'
  New-Item $policy -Force | Out-Null
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) {
    New-ItemProperty $policy -Name $name -PropertyType String -Value '--remote-debugging-port=9222 --proxy-server=http://127.0.0.1:8080 --disable-quic' -Force | Out-Null
  }
  Write-Host 'Installing public NSIS'
  $install=Start-Process (Join-Path $out 'Alhangeul_0.1.3_x64-setup.exe') -ArgumentList '/S' -Wait -PassThru
  if ($install.ExitCode -ne 0) { throw 'installation failed' }
  'startup' | Set-Content (Join-Path $out 'phase')
  $app=Start-Process $appPath -PassThru
  Start-Sleep 45
  if ($app.HasExited) { throw 'app died' }
  Write-Host 'Startup finished'
  Inventory 'running'
  $doc = Start-Process node -ArgumentList 'scripts/privacy/document-cdp.mjs' -PassThru -RedirectStandardOutput (Join-Path $env:RUNNER_TEMP 'privacy-doc-out.txt') -RedirectStandardError (Join-Path $env:RUNNER_TEMP 'privacy-doc-error.txt')
  $finished = $doc.WaitForExit(300000)
  $documentFailed = -not $finished -or $doc.ExitCode -ne 0
  if (-not $finished) { Stop-Process -Id $doc.Id -Force }
  if ($documentFailed) { Get-Content (Join-Path $env:RUNNER_TEMP 'privacy-doc-error.txt') -Tail 15 | Set-Content (Join-Path $out 'document-error.txt') }
  Write-Host 'Document phase finished; collecting lifecycle'
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
  Write-Host 'Uninstall begins'
  $remove=Start-Process (Join-Path $env:LOCALAPPDATA 'Alhangeul\uninstall.exe') -ArgumentList '/S' -Wait -PassThru
  Start-Sleep 5
  if ($remove.ExitCode -ne 0 -or (Test-Path $appPath)) { throw 'uninstall incomplete' }
  Inventory 'uninstall'
  # LevelDB *.log files are database journals, not diagnostic logs: preserve them.
  Get-ChildItem (Join-Path $profile 'logs') -File -Filter 'Alhangeul.log*' -ErrorAction SilentlyContinue | Remove-Item -Force
  Inventory 'manual-log-delete'
  if (@(Get-ChildItem (Join-Path $profile 'logs') -File -Filter 'Alhangeul.log*' -ErrorAction SilentlyContinue).Count -ne 0) { throw 'app diagnostic log deletion incomplete' }
  if ($documentFailed) { throw 'document observation failed; lifecycle still collected' }
} finally {
  Get-Process Alhangeul -ErrorAction SilentlyContinue | Stop-Process -Force
  Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  if ($cert) { Remove-Item "Cert:\LocalMachine\Root\$($cert.Thumbprint)" }
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) { Remove-ItemProperty $policy -Name $name -ErrorAction SilentlyContinue }
  Remove-Item $conf -Recurse -Force -ErrorAction SilentlyContinue
}
