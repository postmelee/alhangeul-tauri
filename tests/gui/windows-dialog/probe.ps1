param(
  [Parameter(Mandatory = $true)][string]$EvidencePath,
  [Parameter(Mandatory = $true)][string]$CleanupStatePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot '../../../scripts/windows-pdf-win32.ps1')
. (Join-Path $PSScriptRoot '../../../scripts/windows-pdf-dialog-observation.ps1')
. (Join-Path $PSScriptRoot 'observation.ps1')

function Get-SaveParts($Dialog, $AppProcessId) {
  $condition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Edit'),
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1001'))
  $fields = $Dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if ($fields.Count -ne 1) { throw 'Expected unique Save filename field.' }
  $button = Find-PdfNativeButton $Dialog '1' $AppProcessId
  if ($null -eq $button) { throw 'Missing Save submit button.' }
  return @{ Field = $fields[0]; Button = $button }
}

$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-dialog-' + [guid]::NewGuid().ToString('N'))
$target = Join-Path $fixtureRoot 'dialog-probe-existing.pdf'
$child = $null
$createdRoot = $false
$hash = $null
$stage = 'setup'
$evidence = @{ schemaVersion = 1; kind = 'controlled-dialog-observation'; passed = $false;
  productTested = $false; overwriteInvoked = $false; nativeLoaded = $true;
  powerShell = $PSVersionTable.PSVersion.ToString(); os = [Environment]::OSVersion.Version.ToString();
  uiCulture = [Globalization.CultureInfo]::CurrentUICulture.Name;
  before = @(); after = @(); fixtureUnchanged = $false; processStopped = $false; fixtureRemoved = $false }
try {
  if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) {
    throw 'Windows PowerShell 5.1 required.'
  }
  New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
  $createdRoot = $true
  $cleanup = @{ kind = 'alhangeul-dialog-fixture'; root = $fixtureRoot; processId = 0; startTicks = 0 }
  $cleanup | ConvertTo-Json | Set-Content -LiteralPath $CleanupStatePath -Encoding UTF8
  [IO.File]::WriteAllText($target, 'Public non-PDF sentinel: dialog observation only.')
  $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
  $hostScript = Join-Path $PSScriptRoot 'fixture-host.ps1'
  $child = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -PassThru -ArgumentList @(
    '-NoProfile', '-NonInteractive', '-STA', '-File', "`"$hostScript`"", '-FixtureRoot', "`"$fixtureRoot`"")
  $cleanup.processId = $child.Id
  $cleanup.startTicks = $child.StartTime.ToUniversalTime().Ticks.ToString()
  $cleanup | ConvertTo-Json | Set-Content -LiteralPath $CleanupStatePath -Encoding UTF8
  $stage = 'waiting-save'
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do {
    if ($child.HasExited) { throw 'Fixture host exited early.' }
    $dialogs = @(Find-ProbeDialogs $child.Id)
    if ($dialogs.Count -eq 1) { break }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  if ($dialogs.Count -ne 1) { throw 'Expected one controlled save dialog.' }
  $save = $dialogs[0]
  $saveHandle = $save.Current.NativeWindowHandle
  $evidence.before = @(Read-ProbeDialogs $dialogs $saveHandle $child.Id)
  $stage = 'submitting-existing-fixture'
  $parts = Get-SaveParts $save $child.Id
  Set-NativeFileNameFocus $save $parts.Field $child.Id 'Save'
  Set-NativeFileName $save $parts.Field $child.Id $target 'Save'
  Assert-PdfButtonCurrent $save $parts.Button $child.Id '1'
  Invoke-NativeDialogButton $save $parts.Button $child.Id '1'
  $stage = 'waiting-confirmation'
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    if ($child.HasExited) { throw 'Fixture host exited without confirmation.' }
    $dialogs = @(Find-ProbeDialogs $child.Id)
    if ($dialogs.Count -eq 2) { break }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  $evidence.after = @(Read-ProbeDialogs $dialogs $saveHandle $child.Id)
  if ($dialogs.Count -ne 2) { throw 'Expected save and confirmation dialogs.' }
  $confirmation = @($dialogs | Where-Object { $_.Current.NativeWindowHandle -ne $saveHandle })
  if ($confirmation.Count -ne 1 -or -not $confirmation[0].Current.IsEnabled) {
    throw 'Ambiguous confirmation.'
  }
  # Observe only. Ownership/prompt/capabilities are evidence, not permission to press Yes.
  $evidence.passed = $true
  $stage = 'observed-without-confirming'
} catch {
  $evidence.errorStage = $stage
  $evidence.errorType = $_.Exception.GetType().Name
} finally {
  try {
    if ($null -ne $child) {
      if (-not $child.HasExited) { $child.Kill() }
      if (-not $child.WaitForExit(5000)) { throw 'Fixture host did not stop.' }
      $evidence.processStopped = $true
      $child.Dispose()
    }
    if ($createdRoot) {
      $evidence.fixtureUnchanged = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ceq $hash
      # Delete only the unique directory created above, never an inherited/general root.
      Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
      $evidence.fixtureRemoved = -not (Test-Path -LiteralPath $fixtureRoot)
    }
  } catch {
    $evidence.cleanupError = $_.Exception.GetType().Name
    $evidence.passed = $false
  }
  $evidence.passed = $evidence.passed -and $evidence.fixtureUnchanged -and
    $evidence.processStopped -and $evidence.fixtureRemoved
  $evidence.stage = $stage
  $evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
}
if (-not $evidence.passed) { throw "Controlled dialog probe failed at $stage; see sanitized evidence." }
Write-Output 'PASS: observed controlled confirmation; no overwrite; fixture and process cleaned.'
