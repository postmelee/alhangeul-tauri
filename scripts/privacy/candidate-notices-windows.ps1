$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$settings = Join-Path $env:APPDATA 'io.github.postmelee.alhangeul\updater-preferences.json'
function Install-Silently($File, $Kind, $Reinstall = $false) {
  if ($Kind -eq 'nsis') {
    $result = Start-Process $File -ArgumentList '/S' -PassThru -Wait
  } else {
    $arguments = @('/i', "`"$File`"", '/qn', '/norestart')
    if ($Reinstall) { $arguments += @('REINSTALL=ALL', 'REINSTALLMODE=amus') }
    $result = Start-Process msiexec.exe -ArgumentList $arguments -PassThru -Wait
  }
  if ($result.ExitCode -notin @(0,3010)) { throw "Install $Kind failed: $($result.ExitCode)" }
  return $result.ExitCode
}
foreach ($kind in @('nsis', 'msi')) {
  if (Test-Path -LiteralPath $settings) { throw 'Disposable settings profile is not fresh' }
  $pattern = if ($kind -eq 'nsis') { '*-setup.exe' } else { '*.msi' }
  $files = @(Get-ChildItem artifacts/windows-x64 -Recurse -File -Filter $pattern)
  if ($files.Count -ne 1) { throw "Expected one $kind package" }
  $file = $files[0].FullName
  & "$PSScriptRoot/installer-privacy-ui.ps1" -Installer $file -Kind $kind -Output $out
  $initialInstallCode = Install-Silently $file $kind
  $preservation = @()
  try {
    if (Test-Path -LiteralPath $settings) { throw 'Silent install unexpectedly created an updater choice' }
    $roots = @(@((Join-Path $env:LOCALAPPDATA 'Alhangeul'), (Join-Path $env:ProgramFiles 'Alhangeul')) |
      Where-Object { Test-Path -LiteralPath (Join-Path $_ 'Alhangeul.exe') })
    if (@($roots).Count -ne 1) { throw 'Expected exactly one installed product root' }
    node scripts/privacy/verify-installed-notices.mjs product-source $roots[0] (Join-Path $out "$kind-installed-notices.json")
    if ($LASTEXITCODE -ne 0) { throw 'Installed resource hash verification failed' }
    $policy = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
    New-Item $policy -Force | Out-Null
    New-ItemProperty $policy -Name 'Alhangeul.exe' -PropertyType String -Value '--remote-debugging-port=9222' -Force | Out-Null
    $app = $null
    try {
      $app = Start-Process (Join-Path $roots[0] 'Alhangeul.exe') -PassThru
      Start-Sleep 10
      node scripts/privacy/capture-bundled-fonts.mjs $kind
      if ($LASTEXITCODE -ne 0) { throw 'Actual bundled font rendering failed' }
    } finally {
      if ($app) { Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue }
      Remove-ItemProperty $policy -Name 'Alhangeul.exe' -ErrorAction SilentlyContinue
      Start-Sleep 2
    }
    if (Test-Path -LiteralPath $settings) { throw 'Opening and closing disclosure unexpectedly created an updater choice' }
    New-Item -ItemType Directory -Path (Split-Path $settings) -Force | Out-Null
    foreach ($choice in @($true, $false)) {
      $fixture = @{version=1; automaticChecks=$choice} | ConvertTo-Json -Compress
      [IO.File]::WriteAllText($settings, $fixture)
      $expectedHash = (Get-FileHash -LiteralPath $settings -Algorithm SHA256).Hash
      $reinstallCode = Install-Silently $file $kind $true
      if ((Get-FileHash -LiteralPath $settings -Algorithm SHA256).Hash -ne $expectedHash) {
        throw 'Reinstall changed the existing updater choice'
      }
      $preservation += @{automaticChecks=$choice; sha256=$expectedHash.ToLowerInvariant(); reinstallPreserved=$true; exitCode=$reinstallCode; rebootRequired=($reinstallCode -eq 3010)}
    }
  } finally {
    if ($kind -eq 'nsis') {
      $root = Join-Path $env:LOCALAPPDATA 'Alhangeul'
      $remove = Start-Process (Join-Path $root 'uninstall.exe') -ArgumentList '/S' -Wait -PassThru
    } else {
      $remove = Start-Process msiexec.exe -ArgumentList @('/x', "`"$file`"", '/qn', '/norestart') -Wait -PassThru
    }
    if ($remove.ExitCode -notin @(0,3010)) { throw "Uninstall $kind failed" }
  }
  if ((Get-FileHash -LiteralPath $settings -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Uninstall changed the retained updater choice'
  }
  @{
    scope='Synthetic choice-file preservation by the installer; actual UI/TLS is verified separately.'
    reinstallMode=$(if ($kind -eq 'msi') { 'REINSTALL=ALL REINSTALLMODE=amus' } else { 'NSIS /S with existing installation' })
    initialInstallExitCode=$initialInstallCode
    uninstallExitCode=$remove.ExitCode
    rebootRequired=($initialInstallCode -eq 3010 -or $remove.ExitCode -eq 3010 -or @($preservation | Where-Object {$_.rebootRequired}).Count -gt 0)
    postRebootValidated=$false
    freshSilentInstallChoiceAbsent=$true
    disclosureCloseChoiceAbsent=$true
    reinstall=$preservation
    uninstallRetainedLastChoice=$true
  } | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $out "$kind-settings-lifecycle.json")
  Remove-Item -LiteralPath $settings
}
