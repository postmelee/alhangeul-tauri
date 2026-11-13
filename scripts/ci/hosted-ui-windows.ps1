param([ValidateSet('preflight', 'product', 'definitions')][string]$Phase)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'disposable-hosted-only' }
$scripts = Split-Path -Parent $PSScriptRoot
function Save-Report($Name, $Report) {
  $Report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $env:HOSTED_UI_ROOT ('evidence\' + $Name + '.json')) -Encoding UTF8
}
function Invoke-Owned($File, $Arguments, [int]$Seconds = 120) {
  $p = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
  try {
    [void]$p.Handle
    if (-not $p.WaitForExit($Seconds * 1000)) {
      $p.Kill(); [void]$p.WaitForExit(5000); throw 'owned-child-timeout'
    }
    $p.Refresh()
    return [int]$p.ExitCode
  } finally { $p.Dispose() }
}
function Initialize-Probe {
  $env:HOSTED_UI_ROOT = Join-Path $env:RUNNER_TEMP ('alhangeul-ui-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory((Join-Path $env:HOSTED_UI_ROOT 'evidence'))
  Add-Content -LiteralPath $env:GITHUB_ENV -Value ('HOSTED_UI_ROOT=' + $env:HOSTED_UI_ROOT)
  Add-Type -Path (Join-Path $scripts 'windows-thumbnail-token.cs')
  Add-Type -Path (Join-Path $scripts 'windows-thumbnail-user-visual.cs')
  $os = Get-CimInstance Win32_OperatingSystem
  $session = (Get-Process -Id $PID).SessionId
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $report = [ordered]@{ schemaVersion = 1; status = 'unavailable'; os = $os.Caption; build = $os.BuildNumber; architecture = $os.OSArchitecture; imageVersion = $env:ImageVersion; harnessSha = $env:GITHUB_SHA; interactive = [Environment]::UserInteractive; session = $session; token = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read(); shellFound = $false; ownerMatches = $false; sessionMatches = $false; explorerVisual = 'unverified'; windows10Visual = 'unverified'; windows11Visual = 'unverified' }
  $handle = [Alhangeul.ThumbnailUserVisual.Window]::GetShellWindow()
  if ($handle -ne [IntPtr]::Zero) {
    [uint32]$shellPid = 0
    [void][Alhangeul.ThumbnailUserVisual.Window]::GetWindowThreadProcessId($handle, [ref]$shellPid)
    $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $shellPid)
    $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
    $report.shellFound = $true
    $report.ownerMatches = $owner.ReturnValue -eq 0 -and $owner.Sid -eq $sid
    $report.sessionMatches = $process.SessionId -eq $session
    $report['shellSession'] = $process.SessionId
    if ($report.interactive -and $session -ne 0 -and $report.ownerMatches -and $report.sessionMatches) { $report.status = 'ready' }
  }
  Save-Report 'preflight' $report
  Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value ('ready=' + ($report.status -eq 'ready').ToString().ToLowerInvariant())
  $report | ConvertTo-Json -Depth 6
}
function Prepare-Fixtures {
  $manifest = Get-Content -LiteralPath (Join-Path $scripts 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json
  foreach ($fixture in $manifest.fixtures) {
    $path = Join-Path $env:HOSTED_UI_ROOT $fixture.path
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $path))
    $relative = $fixture.path.Substring('third_party/rhwp/'.Length)
    Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/edwardkim/rhwp/' + $manifest.rhwpSha + '/' + $relative) -OutFile $path
    if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'fixture-hash-mismatch' }
  }
}
function Observe-Product {
  $report = [ordered]@{ schemaVersion = 1; status = 'incomplete'; phase = 'verify'; installExit = $null; uninstallExit = $null; visual = 'unverified'; releaseAcceptance = 'unverified'; fixtureProbes = @() }
  $root = $env:HOSTED_UI_ROOT; $bundle = Join-Path $root 'bundle'
  $msi = $null; $installed = $false
  try {
    $preflight = Get-Content -LiteralPath (Join-Path $root 'evidence\preflight.json') -Raw | ConvertFrom-Json
    if ($preflight.status -ne 'ready') { throw 'desktop-not-ready' }
    Expand-Archive -LiteralPath (Join-Path $root 'candidate.zip') -DestinationPath $bundle
    & node (Join-Path $scripts 'verify-desktop-artifacts.mjs') --platform windows-x64 --root $bundle --verify-inventory (Join-Path $bundle 'alhangeul-artifact-inventory.json') --source-sha ece8bb5e46a1a81e4d74ad2f1dbf84bde7fd59d4
    if ($LASTEXITCODE -ne 0) { throw 'candidate-inventory-invalid' }
    $inventory = Get-Content -LiteralPath (Join-Path $bundle 'alhangeul-artifact-inventory.json') -Raw | ConvertFrom-Json
    $rows = @($inventory.files | Where-Object { $_.kind -eq 'msi' })
    if ($rows.Count -ne 1) { throw 'msi-not-unique' }
    $msi = Join-Path $bundle $rows[0].path
    $report['installerSha256'] = $rows[0].sha256
    Copy-Item -LiteralPath (Join-Path $bundle 'alhangeul-artifact-inventory.json') -Destination (Join-Path $root 'evidence\inventory.json')
    Prepare-Fixtures
    $report.phase = 'install'; Save-Report 'product' $report
    $report.installExit = Invoke-Owned 'msiexec.exe' ('/i "' + $msi + '" /qn /norestart /l*v "' + $root + '\evidence\install.log"') 180
    $installed = $report.installExit -in @(0, 3010)
    if ($report.installExit -ne 0) { throw 'msi-install-not-zero' }
    $report.phase = 'capture'; Save-Report 'product' $report
    $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $capture = Join-Path $PSScriptRoot 'hosted-ui-capture.ps1'
    $code = Invoke-Owned $engine ('-NoLogo -NoProfile -NonInteractive -STA -File "' + $capture + '" -Root "' + $root + '"') 90
    if ($code -ne 0) { throw 'capture-child-failed' }
    $visual = Get-Content -LiteralPath (Join-Path $root 'evidence\explorer-visual.json') -Raw | ConvertFrom-Json
    $report.visual = $visual.status
    if ($visual.PSObject.Properties.Name -contains 'displayPreference' -and -not $visual.displayPreference.restored) { throw 'explorer-preference-not-restored' }
    $report.phase = 'api-probes'; Save-Report 'product' $report
    $manifest = Get-Content -LiteralPath (Join-Path $scripts 'windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json
    foreach ($fixture in $manifest.fixtures) {
      $output = Join-Path $root ('evidence\probe-' + $fixture.id + '.json')
      & (Join-Path $scripts 'windows-thumbnail-diagnostics.ps1') -Mode force-extract -InputPath (Join-Path $root $fixture.path) -OutputPath $output
      $report.fixtureProbes += [ordered]@{ id = $fixture.id; exitCode = $LASTEXITCODE }
    }
    $report.status = 'observed'
  } catch {
    $report['failure'] = $_.Exception.Message
  } finally {
    if ($installed) {
      try { $report.uninstallExit = Invoke-Owned 'msiexec.exe' ('/x "' + $msi + '" /qn /norestart /l*v "' + $root + '\evidence\uninstall.log"') 180 }
      catch { $report['cleanupFailure'] = $_.Exception.Message }
    }
    Save-Report 'product' $report
  }
  if ($report.status -ne 'observed' -or $report.uninstallExit -ne 0) { throw 'product-observation-incomplete' }
}
if ($Phase -eq 'preflight') { Initialize-Probe } elseif ($Phase -eq 'product') { Observe-Product }
