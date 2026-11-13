function Request-GuestAdmin([ValidateSet('install', 'reinstall', 'uninstall')][string]$Operation) {
  $request = Join-Path $root ('requests\' + $Operation + '.request')
  $response = Join-Path $root ('admin-results\' + $Operation + '.json')
  if ((Test-Path $request) -or (Test-Path $response)) { throw 'fresh-admin-operation-required' }
  Set-Content -LiteralPath $request -Value 'request' -Encoding ASCII
  $deadline = [DateTime]::UtcNow.AddSeconds(330)
  while (-not (Test-Path -LiteralPath $response)) {
    if ([DateTime]::UtcNow -gt $deadline) { throw 'admin-operation-timeout' }
    Start-Sleep -Seconds 1
  }
  $result = Get-Content $response -Raw | ConvertFrom-Json
  Copy-Item -LiteralPath $response -Destination (Join-Path $output ('admin-' + $Operation + '.json'))
  if ($result.operation -cne $Operation -or $result.status -cne 'observed' -or -not $result.system -or
      $result.installerSha256 -cne $inputData.installerSha256 -or $null -eq $result.exitCode) { throw 'admin-result-invalid' }
  $report.adminOperations[$Operation] = $result
  return [int]$result.exitCode
}
function Invoke-GuestInstall([ValidateSet('install', 'reinstall', 'uninstall')][string]$Operation) {
  if ($inputData.scenario -eq 'msi') { return Request-GuestAdmin $Operation }
  if ($inputData.scenario -ne 'nsis') { throw 'unknown-guest-scenario' }
  if ($Operation -eq 'uninstall') { return Run-Owned (Join-Path $directory 'uninstall.exe') '/S' }
  return Run-Owned $installer $(if ($Operation -eq 'reinstall') { '/S /UPDATE' } else { '/S' })
}

function Assert-GuestAdminBoundary {
  foreach ($relative in @('input.json', 'scripts\ci\guest-ui-admin.ps1', 'admin-results\boundary.txt')) {
    $handle = $null; $denied = $false
    try { $handle = [IO.File]::Open((Join-Path $root $relative), [IO.FileMode]::Open, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite) }
    catch [UnauthorizedAccessException] { $denied = $true }
    finally { if ($handle) { $handle.Dispose() } }
    if (-not $denied) { throw 'admin-boundary-writable-by-standard-user' }
  }
}
