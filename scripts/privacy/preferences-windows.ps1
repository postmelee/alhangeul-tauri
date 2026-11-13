$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
$env:PRIVACY_OUT = $out
$conf = Join-Path $env:RUNNER_TEMP 'privacy-preferences-ca'
$policy = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
$appPath = Join-Path $env:LOCALAPPDATA 'Alhangeul\Alhangeul.exe'
$settings = Join-Path $env:APPDATA 'io.github.postmelee.alhangeul\updater-preferences.json'
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$cert = $null
if (Test-Path $settings) { throw 'Disposable profile is not fresh' }
$proxy = Start-Process mitmdump -ArgumentList @('-q','--listen-host','127.0.0.1','--listen-port','8080','--set',"confdir=$conf",'-s','scripts/privacy/tls-observer.py') -PassThru
try {
  for ($n=0; $n -lt 30 -and -not (Test-Path "$conf/mitmproxy-ca-cert.cer"); $n++) { Start-Sleep 1 }
  $cert = Import-Certificate -FilePath "$conf/mitmproxy-ca-cert.cer" -CertStoreLocation Cert:\LocalMachine\Root
  $env:HTTPS_PROXY='http://127.0.0.1:8080'
  $env:HTTP_PROXY=$env:HTTPS_PROXY
  $env:NO_PROXY='localhost,127.0.0.1'
  New-Item $policy -Force | Out-Null
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) {
    New-ItemProperty $policy -Name $name -PropertyType String -Value '--remote-debugging-port=9222 --proxy-server=http://127.0.0.1:8080 --disable-quic' -Force | Out-Null
  }
  $install=Start-Process (Join-Path $out "Alhangeul_${version}_x64-setup.exe") -ArgumentList '/S' -Wait -PassThru
  if ($install.ExitCode -ne 0) { throw 'Candidate installation failed' }
  foreach ($phase in @('default','enabled','disabled','corrupt')) {
    if ($phase -eq 'corrupt') {
      if (-not (Test-Path $settings)) { throw 'Expected native preference file missing' }
      [IO.File]::WriteAllText($settings, '{invalid')
    }
    [IO.File]::WriteAllText((Join-Path $out 'phase'), $phase)
    $app=Start-Process $appPath -PassThru
    Start-Sleep 10
    node scripts/privacy/preferences-cdp.mjs $phase
    if ($LASTEXITCODE -ne 0) { throw "Preference phase failed: $phase" }
    Stop-Process -Id $app.Id -Force
    Start-Sleep 3
  }
} finally {
  Get-Process Alhangeul -ErrorAction SilentlyContinue | Stop-Process -Force
  Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  if ($cert) { Remove-Item "Cert:\LocalMachine\Root\$($cert.Thumbprint)" }
  foreach ($name in @('Alhangeul.exe','io.github.postmelee.alhangeul')) { Remove-ItemProperty $policy -Name $name -ErrorAction SilentlyContinue }
  Remove-Item $conf -Recurse -Force -ErrorAction SilentlyContinue
}
