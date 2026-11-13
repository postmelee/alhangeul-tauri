$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
Move-Item (Join-Path $out 'identity.json') (Join-Path $out 'identity-nsis.json')
node scripts/privacy/prepare.mjs windows-msi
if ($LASTEXITCODE -ne 0) { throw 'MSI identity verification failed' }
Move-Item (Join-Path $out 'identity.json') (Join-Path $out 'identity-msi.json')
$rows = @()
foreach ($kind in @('nsis','msi')) {
  if ($kind -eq 'nsis') {
    $root = Join-Path $env:LOCALAPPDATA 'Alhangeul'
    $installer = Join-Path $out 'Alhangeul_0.1.3_x64-setup.exe'
    $install = Start-Process $installer -ArgumentList '/S' -Wait -PassThru
  } else {
    $root = Join-Path $env:ProgramFiles 'Alhangeul'
    $installer = Join-Path $out 'Alhangeul_0.1.3_x64_en-US.msi'
    $install = Start-Process msiexec.exe -ArgumentList @('/i',"`"$installer`"",'/qn','/norestart') -Wait -PassThru
  }
  if ($install.ExitCode -notin @(0,3010)) { throw "Install $kind failed: $($install.ExitCode)" }
  $files = @(Get-ChildItem $root -Recurse -File)
  if (-not ($files.Name -contains 'Alhangeul.exe')) { throw 'Installed app absent' }
  $binaries = @($files | Where-Object {$_.Extension -in @('.exe','.dll')} | ForEach-Object {
    $signature=Get-AuthenticodeSignature $_.FullName
    @{path=$_.FullName.Substring($root.Length); sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(); productName=$_.VersionInfo.ProductName; productVersion=$_.VersionInfo.ProductVersion; fileVersion=$_.VersionInfo.FileVersion; signatureStatus=[string]$signature.Status; signer=if ($signature.SignerCertificate) {$signature.SignerCertificate.Subject} else {$null}}
  })
  $notices = @($files | Where-Object {$_.FullName -match '(?i)licenses?|copyright|notice|copying'} | ForEach-Object {
    @{path=$_.FullName.Substring($root.Length);sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower();bytes=$_.Length}
  })
  $rows += @{kind=$kind; binaries=$binaries; noticeFiles=$notices}
  if ($kind -eq 'nsis') {
    $remove=Start-Process (Join-Path $root 'uninstall.exe') -ArgumentList '/S' -Wait -PassThru
  } else {
    $remove=Start-Process msiexec.exe -ArgumentList @('/x',"`"$installer`"",'/qn','/norestart') -Wait -PassThru
  }
  Start-Sleep 3
  if ($remove.ExitCode -notin @(0,3010) -or (Test-Path (Join-Path $root 'Alhangeul.exe'))) { throw "Uninstall $kind incomplete" }
}
$rows | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $out 'windows-package-audit.json')
