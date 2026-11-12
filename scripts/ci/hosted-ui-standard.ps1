Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'disposable-hosted-only' }
. (Join-Path $PSScriptRoot 'hosted-ui-windows.ps1') -Phase definitions
$original = $env:HOSTED_UI_ROOT
$root = Join-Path $env:SystemDrive ('alhangeul-standard-' + [Guid]::NewGuid().ToString('N'))
$evidence = Join-Path $original 'evidence'
$summary = [ordered]@{ schemaVersion = 1; status = 'incomplete'; childExit = $null; accountRemoved = $false; profileRemoved = $false; scratchRemoved = $false }
$sid = $null
try {
  [void][IO.Directory]::CreateDirectory((Join-Path $root 'evidence'))
  [void][IO.Directory]::CreateDirectory((Join-Path $root 'scripts\ci'))
  Expand-Archive -LiteralPath (Join-Path $original 'candidate.zip') -DestinationPath (Join-Path $root 'bundle')
  & node (Join-Path $scripts 'verify-desktop-artifacts.mjs') --platform windows-x64 --root (Join-Path $root 'bundle') --verify-inventory (Join-Path $root 'bundle\alhangeul-artifact-inventory.json') --source-sha a2796fc0fd93002ccdcf1e5c313701525b1668c6
  if ($LASTEXITCODE -ne 0) { throw 'candidate-inventory-invalid' }
  $inventory = Get-Content -LiteralPath (Join-Path $root 'bundle\alhangeul-artifact-inventory.json') -Raw | ConvertFrom-Json
  $installers = @($inventory.files | Where-Object { $_.kind -eq 'nsis' })
  if ($installers.Count -ne 1) { throw 'nsis-not-unique' }
  Copy-Item -LiteralPath (Join-Path (Join-Path $root 'bundle') $installers[0].path) -Destination (Join-Path $root 'installer.exe')
  $productInput = @{ installerSha256 = $installers[0].sha256; productSha = $inventory.sourceSha; binaries = @($inventory.files | Where-Object { $_.kind -in @('thumbnail-handler', 'thumbnail-worker') }) }
  $productInput | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'input.json') -Encoding UTF8
  Copy-Item -LiteralPath (Join-Path $root 'input.json') -Destination $evidence
  foreach ($name in @('diagnostics.ps1', 'probe.ps1', 'state.ps1', 'native.cs', 'interop.cs', 'token.cs', 'fixtures.json', 'user-visual.cs')) {
    Copy-Item -LiteralPath (Join-Path $scripts ('windows-thumbnail-' + $name)) -Destination (Join-Path $root 'scripts')
  }
  foreach ($name in @('hosted-ui-standard-child.ps1', 'hosted-ui-capture.ps1', 'hosted-ui-view.ps1')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $root 'scripts\ci')
  }
  $env:HOSTED_UI_ROOT = $root; Prepare-Fixtures; $env:HOSTED_UI_ROOT = $original
  $account = 'alhv' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
  $secret = ConvertTo-SecureString ('Aa1!' + [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')) -AsPlainText -Force
  $user = New-LocalUser -Name $account -Password $secret -AccountNeverExpires
  $sid = $user.SID.Value
  Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $user
  & icacls.exe $root /grant ('*' + $sid + ':(OI)(CI)RX') /T /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'fixture-acl-failed' }
  & icacls.exe (Join-Path $root 'evidence') /grant ('*' + $sid + ':(OI)(CI)M') /T /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'evidence-acl-failed' }
  $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $arguments = '-NoLogo -NoProfile -NonInteractive -STA -File "' + $root + '\scripts\ci\hosted-ui-standard-child.ps1" -Root "' + $root + '"'
  $credential = [Management.Automation.PSCredential]::new($env:COMPUTERNAME + '\' + $account, $secret)
  $p = Start-Process -FilePath $engine -ArgumentList $arguments -Credential $credential -LoadUserProfile -WorkingDirectory $root -PassThru
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit(720000)) { $p.Kill(); [void]$p.WaitForExit(5000); throw 'owned-child-timeout' }
    $p.Refresh(); $summary.childExit = $p.ExitCode
  } finally { $p.Dispose() }
  if ($summary.childExit -ne 0) { throw 'standard-child-failed' }
  $summary.status = 'observed'
} catch { $summary['failure'] = $_.Exception.Message }
finally {
  $env:HOSTED_UI_ROOT = $original
  if (Test-Path -LiteralPath (Join-Path $root 'evidence')) { Copy-Item -Path (Join-Path $root 'evidence\*') -Destination $evidence -Recurse -Force }
  if ($sid) {
    try {
      $profile = Get-CimInstance Win32_UserProfile | Where-Object { $_.SID -eq $sid }
      if ($profile) { $profile | Remove-CimInstance }
      $summary.profileRemoved = @(Get-CimInstance Win32_UserProfile | Where-Object { $_.SID -eq $sid }).Count -eq 0
    } catch { $summary['profileCleanupFailure'] = $_.Exception.HResult }
    try { Remove-LocalUser -SID $sid; $summary.accountRemoved = $null -eq (Get-LocalUser -SID $sid -ErrorAction SilentlyContinue) }
    catch { $summary['accountCleanupFailure'] = $_.Exception.HResult }
  }
  try { if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }; $summary.scratchRemoved = -not (Test-Path -LiteralPath $root) }
  catch { $summary['scratchCleanupFailure'] = $_.Exception.HResult }
  $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidence 'standard-driver.json') -Encoding UTF8
}
if ($summary.status -ne 'observed' -or -not $summary.profileRemoved -or -not $summary.accountRemoved -or -not $summary.scratchRemoved) { throw 'standard-observation-incomplete' }
