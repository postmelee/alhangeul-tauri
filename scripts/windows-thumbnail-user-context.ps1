[CmdletBinding()]
param([ValidateSet('runner', 'standard')][string]$Context, [switch]$CIConsent, [string]$ArtifactRoot, [string]$ExpectedSourceSha)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $CIConsent -or $env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'requires-disposable-hosted-ci' }
$root = Join-Path $env:SystemDrive ('alhangeul-observation-' + [Guid]::NewGuid().ToString('N'))
$destination = Join-Path $env:GITHUB_WORKSPACE 'diagnostics\thumbnail-user-context'
[void][IO.Directory]::CreateDirectory($destination)
$account = $null; $accountSid = $null; $created = $false
$summary = [ordered]@{ schemaVersion = 1; context = $Context; status = 'invalid'; phase = 'prepare'; childExit = $null; accountRemoved = $false; profileRemoved = $false; scratchRemoved = $false; harnessSha = $env:GITHUB_SHA; imageVersion = $env:ImageVersion; productSha = $null; installerSha256 = $null }
try {
  [void][IO.Directory]::CreateDirectory((Join-Path $root 'scripts'))
  [void][IO.Directory]::CreateDirectory((Join-Path $root 'evidence'))
  foreach ($name in @('user-probe.ps1', 'diagnostics.ps1', 'probe.ps1', 'state.ps1', 'native.cs', 'interop.cs', 'token.cs', 'fixtures.json')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot ('windows-thumbnail-' + $name)) -Destination (Join-Path $root 'scripts')
  }
  $fixtures = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  foreach ($fixture in $fixtures) {
    $target = Join-Path $root $fixture.path
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $target))
    $upstream = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).rhwpSha
    $relative = $fixture.path.Substring('third_party/rhwp/'.Length)
    if ($upstream -cnotmatch '^[a-f0-9]{40}$' -or -not $fixture.path.StartsWith('third_party/rhwp/') -or $relative.Contains('..')) { throw 'invalid-fixture-source' }
    Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/edwardkim/rhwp/' + $upstream + '/' + $relative) -OutFile $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'downloaded-fixture-mismatch' }
  }
  $inputArgs = @((Join-Path $PSScriptRoot 'windows-thumbnail-user-input.mjs'), $root)
  if ($ArtifactRoot -or $ExpectedSourceSha) {
    if ($Context -ne 'standard' -or -not $ArtifactRoot -or -not $ExpectedSourceSha) { throw 'invalid-acceptance-request' }
    $inputArgs += @($ArtifactRoot, $ExpectedSourceSha)
  }
  & node @inputArgs
  if ($LASTEXITCODE -ne 0) { throw 'input-verification-failed' }
  $productInput = Get-Content -LiteralPath (Join-Path $root 'input.json') -Raw | ConvertFrom-Json
  $summary.productSha = $productInput.productSha
  $summary.installerSha256 = $productInput.installerSha256
  if ($productInput.mode -eq 'public-observation') {
    Invoke-WebRequest -UseBasicParsing -Uri $productInput.installerUrl -OutFile (Join-Path $root 'installer.exe')
  }
  if ((Get-FileHash -LiteralPath (Join-Path $root 'installer.exe') -Algorithm SHA256).Hash.ToLowerInvariant() -cne $summary.installerSha256) { throw 'installer-changed' }
  Copy-Item -LiteralPath (Join-Path $root 'input.json') -Destination $destination
  $summary.phase = 'launch'
  $executable = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $arguments = '-NoLogo -NoProfile -NonInteractive -STA -File "' + (Join-Path $root 'scripts\windows-thumbnail-user-probe.ps1') + '" -Root "' + $root + '" -Context ' + $Context + ' -CIConsent'
  $options = @{ FilePath = $executable; ArgumentList = $arguments; WorkingDirectory = $root; PassThru = $true }
  if ($Context -eq 'standard') {
    $account = 'alh' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
    $secret = ConvertTo-SecureString ('Aa1!' + [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')) -AsPlainText -Force
    $user = New-LocalUser -Name $account -Password $secret -AccountNeverExpires
    $created = $true; $accountSid = $user.SID.Value
    Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $user
    # Access is scoped to this disposable fixture root. No product HKLM/UAC changes.
    & icacls.exe $root /grant ('*' + $accountSid + ':(OI)(CI)RX') /T /Q | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'fixture-acl-failed' }
    & icacls.exe (Join-Path $root 'evidence') /grant ('*' + $accountSid + ':(OI)(CI)M') /T /Q | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'evidence-acl-failed' }
    $options.Credential = [Management.Automation.PSCredential]::new($env:COMPUTERNAME + '\' + $account, $secret)
    $options.LoadUserProfile = $true
  }
  $token = $env:GITHUB_TOKEN
  try {
    Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
    $p = Start-Process @options
  } finally { $env:GITHUB_TOKEN = $token; $token = $null }
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit(900000)) { $p.Kill(); throw 'child-timeout' }
    $p.Refresh(); $summary.childExit = $p.ExitCode
  } finally { $p.Dispose() }
  if ($summary.childExit -ne 0) { throw 'child-observation-invalid' }
  $summary.status = 'observed'
} catch {
  $summary['errorCode'] = $_.Exception.HResult
  $summary['failure'] = $_.Exception.Message
} finally {
  try {
    if (Test-Path -LiteralPath (Join-Path $root 'evidence')) { Copy-Item -Path (Join-Path $root 'evidence\*.json') -Destination $destination }
    if ($created) {
      $profile = Get-CimInstance Win32_UserProfile | Where-Object { $_.SID -eq $accountSid }
      if ($profile) { $profile | Remove-CimInstance }
      $summary.profileRemoved = @(Get-CimInstance Win32_UserProfile | Where-Object { $_.SID -eq $accountSid }).Count -eq 0
      Remove-LocalUser -SID $accountSid
      $summary.accountRemoved = $null -eq (Get-LocalUser -SID $accountSid -ErrorAction SilentlyContinue)
    } else { $summary.accountRemoved = $true; $summary.profileRemoved = $true }
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
    $summary.scratchRemoved = -not (Test-Path -LiteralPath $root)
  } catch { $summary['cleanupError'] = $_.Exception.HResult; $summary.status = 'invalid' }
  $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'driver.json') -Encoding UTF8
}
if ($summary.status -ne 'observed' -or -not $summary.accountRemoved -or -not $summary.profileRemoved -or -not $summary.scratchRemoved) { exit 2 }
exit 0
