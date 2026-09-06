param(
  [Parameter(Mandatory = $true)][string]$EvidencePath,
  [Parameter(Mandatory = $true)][string]$CleanupStatePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot '../../../scripts/windows-pdf-win32.ps1')
. (Join-Path $PSScriptRoot '../../../scripts/windows-pdf-confirmation.ps1')
. (Join-Path $PSScriptRoot 'observation.ps1')
. (Join-Path $PSScriptRoot 'integration-support.ps1')
$root = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-dialog-' + [guid]::NewGuid().ToString('N'))
$child = $null
$record = $null
$stage = 'setup'
$evidence = @{ schemaVersion = 1; kind = 'controlled-dialog-integration'; passed = $false;
  productTested = $false; powerShell = $PSVersionTable.PSVersion.ToString(); cases = @(); cleanupPassed = $false }
try {
  New-Item -ItemType Directory -Path $root | Out-Null
  $cleanup = @{ kind = 'alhangeul-dialog-fixture'; root = $root; processId = 0; startTicks = 0 }
  $cleanup | ConvertTo-Json | Set-Content -LiteralPath $CleanupStatePath -Encoding UTF8
  foreach ($scenario in @('Open', 'Fresh', 'Overwrite', 'Decline', 'WrongTarget')) {
    $stage = 'setup-case'
    $record = @{ scenario = $scenario; passed = $false; action = 'none'; method = 'not-used';
      wrongTargetRejected = $false; returnedToSave = $false; confirmation = @() }
    $evidence.cases += $record
    $caseRoot = Join-Path $root $scenario
    New-Item -ItemType Directory -Path $caseRoot | Out-Null
    [IO.File]::WriteAllText((Join-Path $caseRoot 'source-control.txt'), 'Source sentinel')
    [IO.File]::WriteAllText((Join-Path $caseRoot 'other.pdf'), 'Other sentinel')
    $name = if ($scenario -eq 'Fresh') { 'dialog-probe-new.pdf' } else { 'dialog-probe-existing.pdf' }
    $target = Join-Path $caseRoot $name
    if ($scenario -ne 'Fresh') { [IO.File]::WriteAllText($target, 'Existing sentinel') }
    $exists = Test-Path -LiteralPath $target -PathType Leaf
    $hostScript = Join-Path $PSScriptRoot 'integration-host.ps1'
    $child = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -PassThru -ArgumentList @(
      '-NoProfile', '-NonInteractive', '-STA', '-File', "`"$hostScript`"", '-CaseRoot', "`"$caseRoot`"", '-Scenario', $scenario)
    $cleanup.processId = $child.Id
    $cleanup.startTicks = $child.StartTime.ToUniversalTime().Ticks.ToString()
    $cleanup | ConvertTo-Json | Set-Content -LiteralPath $CleanupStatePath -Encoding UTF8
    $stage = 'waiting-file-dialog'
    $dialogs = @(Wait-IntegrationDialogs $child.Id 1)
    $save = $dialogs[0]
    $record.initialDialog = @(Read-ProbeDialogs $dialogs $save.Current.NativeWindowHandle $child.Id)
    $mode = if ($scenario -eq 'Open') { 'Open' } else { 'Save' }
    $intent = @{ ProcessId = $child.Id; SaveHandle = $save.Current.NativeWindowHandle; Mode = $mode;
      TargetPath = $target; SubmittedPath = $target; TargetExists = $exists; Cancelled = $false }
    $stage = 'submitting'
    Submit-IntegrationDialog $save $child.Id $target $mode
    if ($scenario -in @('Overwrite', 'Decline', 'WrongTarget')) {
      $stage = 'confirmation'
      Test-IntegrationConfirmation $save $intent $scenario $record
    }
    $stage = 'postconditions'
    $null = Wait-IntegrationDialogs $child.Id 0
    if (-not $child.WaitForExit(5000) -or $child.ExitCode -ne 0) { throw 'Fixture host exit failed.' }
    Assert-IntegrationResult $caseRoot $scenario $record
    $record.passed = $true
    $child.Dispose(); $child = $null
    Write-Output "PASS: controlled dialog $scenario"
  }
  $evidence.passed = $true
} catch {
  $evidence.errorStage = $stage
  $evidence.errorType = $_.Exception.GetType().Name
  $evidence.errorLine = $_.InvocationInfo.ScriptLineNumber
  $evidence.errorScript = [IO.Path]::GetFileName($_.InvocationInfo.ScriptName)
  $evidence.nativeFailure = Get-PdfNativeFailure $_
  # Do not retain arbitrary exception text, document content or local paths.
} finally {
  if ($null -ne $child) { $child.Dispose() }
  $cleanupEvidence = Join-Path ([IO.Path]::GetDirectoryName($EvidencePath)) 'integration-cleanup.json'
  try {
    & (Join-Path $PSScriptRoot 'cleanup.ps1') -CleanupStatePath $CleanupStatePath -EvidencePath $cleanupEvidence
    $evidence.cleanupPassed = $true
  } catch { $evidence.passed = $false }
  $evidence | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
}
if (-not $evidence.passed) { throw "Controlled integration failed at $stage; see sanitized evidence." }
