$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
New-Item -ItemType Directory -Path $out -Force | Out-Null
foreach ($kind in @('nsis', 'msi')) {
  $pattern = if ($kind -eq 'nsis') { '*-setup.exe' } else { '*.msi' }
  $files = @(Get-ChildItem artifacts/windows-x64 -Recurse -File -Filter $pattern)
  if ($files.Count -ne 1) { throw "Expected one $kind package" }
  $file = $files[0].FullName
  & "$PSScriptRoot/installer-privacy-ui.ps1" -Installer $file -Kind $kind -Output $out
  if ($kind -eq 'nsis') {
    $install = Start-Process $file -ArgumentList '/S' -PassThru -Wait
  } else {
    $install = Start-Process msiexec.exe -ArgumentList @('/i', "`"$file`"", '/qn', '/norestart') -PassThru -Wait
  }
  if ($install.ExitCode -notin @(0,3010)) { throw "Install $kind failed: $($install.ExitCode)" }
  try {
    $roots = @(@((Join-Path $env:LOCALAPPDATA 'Alhangeul'), (Join-Path $env:ProgramFiles 'Alhangeul')) |
      Where-Object { Test-Path -LiteralPath (Join-Path $_ 'Alhangeul.exe') })
    if (@($roots).Count -ne 1) { throw 'Expected exactly one installed product root' }
    node scripts/privacy/verify-installed-notices.mjs product-source $roots[0] (Join-Path $out "$kind-installed-notices.json")
    if ($LASTEXITCODE -ne 0) { throw 'Installed resource hash verification failed' }
  } finally {
    if ($kind -eq 'nsis') {
      $root = Join-Path $env:LOCALAPPDATA 'Alhangeul'
      $remove = Start-Process (Join-Path $root 'uninstall.exe') -ArgumentList '/S' -Wait -PassThru
    } else {
      $remove = Start-Process msiexec.exe -ArgumentList @('/x', "`"$file`"", '/qn', '/norestart') -Wait -PassThru
    }
    if ($remove.ExitCode -notin @(0,3010)) { throw "Uninstall $kind failed" }
  }
}
