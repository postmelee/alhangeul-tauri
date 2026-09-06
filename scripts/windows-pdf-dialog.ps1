param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][ValidateSet('Open', 'Save')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$EvidencePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot 'windows-pdf-win32.ps1')
$scope = [System.Windows.Automation.TreeScope]::Descendants
$deadline = [DateTime]::UtcNow.AddSeconds(90)
$submitted = $false
$overwriteConfirmed = $false
$allowOverwrite = $Mode -eq 'Save' -and (Test-Path -LiteralPath $TargetPath -PathType Leaf)
$startedAt = [DateTime]::UtcNow
$stage = 'waiting-dialog'
$observedTree = @()
$observedProcessId = $null
$dialogCount = 0
$fileNameId = if ($Mode -eq 'Open') { '1148' } else { '1001' }
$nativeFallbackUsed = $false
$filenameMethod = 'not-used'
$buttonMethod = 'not-used'
$additionalDialog = 'none'
$filenameFocused = $false

function Write-Evidence($Status, $ErrorText) {
  @{ mode = $Mode; status = $Status; error = $ErrorText; stage = $stage;
     startedAt = $startedAt.ToString('o'); finishedAt = [DateTime]::UtcNow.ToString('o');
     processId = $observedProcessId; dialogCount = $dialogCount; submitted = $submitted;
     overwriteConfirmed = $overwriteConfirmed; nativeFallbackUsed = $nativeFallbackUsed;
     filenameMethod = $filenameMethod; buttonMethod = $buttonMethod; additionalDialog = $additionalDialog;
     filenameFocused = $filenameFocused;
     tree = $observedTree } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

function Read-AppTree($AppCondition) {
  $nodes = [System.Windows.Automation.AutomationElement]::RootElement.FindAll($scope, $AppCondition)
  $result = @()
  foreach ($node in $nodes) {
    if ($result.Count -ge 100) { break }
    $info = $node.Current
    # No Name or Value: keep diagnostics free of document text or file names.
    $result += @{ id = $info.AutomationId; class = $info.ClassName;
      type = $info.ControlType.ProgrammaticName; enabled = $info.IsEnabled }
  }
  return $result
}

function Find-Id($Root, $Id) {
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $Id)
  return $Root.FindFirst($scope, $condition)
}

function Invoke-Button($Dialog, $Button, $Id) {
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
    if ($dialogCount -ne $dialogs.Count -or $observedTree.Count -eq 0) {
      $dialogCount = $dialogs.Count
      $observedTree = @(Read-AppTree $appCondition)
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
        $button = Find-Id $dialog '1'
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
        Invoke-Button $dialog $button '1'
        $submitted = $true
        $stage = 'waiting-dialog-close'
      } elseif ($allowOverwrite -and -not $overwriteConfirmed) {
        # IDYES only, restricted to the app-owned dialog and an existing test target.
        $yes = Find-Id $dialog '6'
        if ($null -ne $yes) {
          Invoke-Button $dialog $yes '6'
          $overwriteConfirmed = $true
        }
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
        throw 'Unsupported overwrite confirmation controls; refusing blind confirmation.'
      }
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $submitted -or [DateTime]::UtcNow -ge $deadline) { throw 'Native file dialog timed out.' }
  if ($allowOverwrite -and -not $overwriteConfirmed) { throw 'Native overwrite confirmation was not observed.' }
  Write-Evidence 'passed' $null
} catch {
  Write-Evidence 'failed' $_.Exception.Message
  throw
}
