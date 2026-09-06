param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][ValidateSet('Open', 'Save')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$EvidencePath,
  [switch]$ConfirmationProbe,
  [ValidateSet('Confirm', 'Decline', 'WrongTarget')][string]$ConfirmationCase
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot 'windows-pdf-win32.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-dialog-observation.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-confirmation.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-confirmation-probe.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-confirmation-verify.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-tree-diagnostics.ps1')
$scope = [System.Windows.Automation.TreeScope]::Descendants
$deadline = [DateTime]::UtcNow.AddSeconds(90)
$submitted = $false
$overwriteConfirmed = $false
$allowOverwrite = $Mode -eq 'Save' -and (Test-Path -LiteralPath $TargetPath -PathType Leaf)
if ($ConfirmationProbe -and -not $allowOverwrite) { throw 'Probe requires Save with an existing test target.' }
if ($ConfirmationCase -and ($ConfirmationProbe -or -not $allowOverwrite)) {
  throw 'Confirmation case requires existing Save target and cannot run with observation mode.'
}
$startedAt = [DateTime]::UtcNow
$stage = 'waiting-dialog'
$observedTree = @()
$treeDiagnostic = @{ status = 'not-collected'; reason = $null; nodes = @() }
$observedProcessId = $null
$dialogCount = 0
$fileNameId = if ($Mode -eq 'Open') { '1148' } else { '1001' }
$nativeFallbackUsed = $false
$filenameMethod = 'not-used'
$buttonMethod = 'not-used'
$additionalDialog = 'none'
$filenameFocused = $false
$submittedPath = $null
$overwriteDecision = 'not-observed'
$saveHandle = 0
$nativeFailure = $null
$confirmationObservation = $null
$confirmationVerification = $null

function Write-Evidence($Status, $ErrorText) {
  @{ mode = $Mode; status = $Status; error = $ErrorText; stage = $stage;
     startedAt = $startedAt.ToString('o'); finishedAt = [DateTime]::UtcNow.ToString('o');
     processId = $observedProcessId; dialogCount = $dialogCount; submitted = $submitted;
     overwriteConfirmed = $overwriteConfirmed; nativeFallbackUsed = $nativeFallbackUsed;
     filenameMethod = $filenameMethod; buttonMethod = $buttonMethod; additionalDialog = $additionalDialog;
     filenameFocused = $filenameFocused;
     overwriteDecision = $overwriteDecision; nativeFailure = $nativeFailure;
     confirmationObservation = $confirmationObservation;
     confirmationVerification = $confirmationVerification;
     treeDiagnostic = @{ status = $treeDiagnostic.status; reason = $treeDiagnostic.reason };
     tree = $observedTree } |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

function Find-Id($Root, $Id) {
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $Id)
  return $Root.FindFirst($scope, $condition)
}

function Invoke-Button($Dialog, $Button, $Id) {
  Assert-PdfButtonCurrent $Dialog $Button $observedProcessId $Id
  # Keep Open submission identical regardless of UIA pattern availability.
  if ($Mode -eq 'Open' -and $Id -eq '1') {
    $script:buttonMethod = 'Win32-BM_CLICK'
    $script:nativeFallbackUsed = $true
    Invoke-NativeDialogButton $Dialog $Button $observedProcessId $Id
    return
  }
  $pattern = $null
  if ($Button.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
    $script:buttonMethod = 'UIA-InvokePattern'
    $pattern.Invoke()
  } else {
    $script:buttonMethod = 'Win32-BM_CLICK'
    $script:nativeFallbackUsed = $true
    Invoke-NativeDialogButton $Dialog $Button $observedProcessId $Id
  }
}

try {
  while ([DateTime]::UtcNow -lt $deadline) {
    $apps = @(Get-Process -Name Alhangeul -ErrorAction SilentlyContinue)
    if ($apps.Count -ne 1) { throw 'Exactly one acceptance app process is required.' }
    $observedProcessId = $apps[0].Id
    $appCondition = [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $apps[0].Id)
    $condition = [System.Windows.Automation.AndCondition]::new(
      $appCondition,
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770'))
    $dialogs = [System.Windows.Automation.AutomationElement]::RootElement.FindAll($scope, $condition)
    if ($dialogCount -ne $dialogs.Count -or $treeDiagnostic.status -eq 'not-collected') {
      $dialogCount = $dialogs.Count
      $treeDiagnostic = Read-PdfDialogTree $dialogs
      $observedTree = @($treeDiagnostic.nodes)
      Write-Evidence 'running' $null
    }
    if ($submitted -and $dialogs.Count -eq 0) { break }
    foreach ($dialog in $dialogs) {
      if (-not $submitted) {
        $stage = 'finding-filename-field'
        $editCondition = [System.Windows.Automation.AndCondition]::new(
          [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Edit'),
          [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $fileNameId))
        $field = $dialog.FindFirst($scope, $editCondition)
        if ($null -eq $field) { continue }
        $button = Find-PdfNativeButton $dialog '1' $observedProcessId
        if ($null -eq $button) { continue }
        $stage = 'focusing-filename'
        Write-Evidence 'running' $null
        Set-NativeFileNameFocus $dialog $field $observedProcessId $Mode
        $filenameFocused = $true
        $stage = 'setting-filename'
        Write-Evidence 'running' $null
        $filenameMethod = 'Win32-EditReplaceSelection'
        $nativeFallbackUsed = $true
        Set-NativeFileName $dialog $field $observedProcessId $TargetPath $Mode
        $stage = 'invoking-submit'
        Write-Evidence 'running' $null
        $saveHandle = $dialog.Current.NativeWindowHandle
        Invoke-Button $dialog $button '1'
        $submitted = $true
        $submittedPath = $TargetPath
        $stage = 'waiting-dialog-close'
      }
    }
    if ($submitted -and $dialogs.Count -gt 1) {
      $additionalDialog = 'unclassified-modal'
      foreach ($extra in $dialogs) {
        if ((Find-Id $extra 'CommandButton_6') -and (Find-Id $extra 'CommandButton_7')) {
          # Button shape identifies Yes/No, not the meaning or target of the prompt.
          $additionalDialog = 'yes-no-command-buttons'
        }
      }
      Write-Evidence 'running' $null
      if (-not $allowOverwrite) {
        throw 'Unexpected additional dialog for a new PDF target; refusing confirmation.'
      }
      if (-not $overwriteConfirmed) {
        $extraDialogs = @($dialogs | Where-Object { $_.Current.NativeWindowHandle -ne $saveHandle })
        if ($dialogs.Count -ne 2 -or $extraDialogs.Count -ne 1) { throw 'Ambiguous overwrite dialog.' }
        $intent = @{ Mode = $Mode; TargetExists = $allowOverwrite; TargetPath = $TargetPath;
          SubmittedPath = $submittedPath; Cancelled = $false; SaveHandle = $saveHandle; ProcessId = $observedProcessId }
        $stage = 'confirming-overwrite'
        Write-Evidence 'running' $null
        if ($ConfirmationProbe) {
          $confirmationObservation = Read-PdfConfirmationProbe $extraDialogs[0] $intent
          $stage = 'observed-confirmation'
          Write-Evidence 'observed' $null
          return
        }
        if ($ConfirmationCase) {
          $confirmationObservation = Read-PdfConfirmationProbe $extraDialogs[0] $intent
        }
        if ($ConfirmationCase -in @('Decline', 'WrongTarget')) {
          $confirmationVerification = Test-PdfAppDecline $extraDialogs[0] $intent $ConfirmationCase
          $stage = 'declined-confirmation'
          Write-Evidence 'cancelled' $null
          return
        }
        $buttonMethod = Invoke-PdfConfirmation $extraDialogs[0] $intent 'Confirm'
        $overwriteDecision = 'eligible'
        $overwriteConfirmed = $true
      }
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $submitted -or [DateTime]::UtcNow -ge $deadline) { throw 'Native file dialog timed out.' }
  if ($allowOverwrite -and -not $overwriteConfirmed) { throw 'Native overwrite confirmation was not observed.' }
  Write-Evidence 'passed' $null
} catch {
  $nativeFailure = Get-PdfNativeFailure $_
  Write-Evidence 'failed' $_.Exception.Message
  throw
}
